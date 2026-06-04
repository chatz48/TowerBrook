from fastapi import APIRouter

from app.config import get_settings
from app.repositories.supabase_repo import repo
from app.services.chunker import chunk_text
from app.services.deepseek_extractor import extractor
from app.services.embeddings_bge import embeddings
from app.services.graph_builder import persist_candidate_extraction
from app.services.keiro_search import keiro

router = APIRouter(prefix="/jobs", tags=["jobs"])

THEME_QUERIES = {
    "clean-energy-advisory": [
        'site:towerbrook.com ("investment" OR "partnership") (renewable OR wind OR "energy transition")',
        '("private equity" OR "infrastructure fund") ("renewable energy services" OR "energy transition platform") (acquisition OR investment)',
        '("portfolio company" OR "sponsor-backed") (renewable OR wind OR solar) ("add-on acquisition" OR sale)',
        '("secondary buyout" OR "majority investment") ("clean energy" OR renewable) (partner OR managing director)',
        '("clean energy" OR renewable) (founder OR CEO OR chair) ("private equity" OR "portfolio company")',
        '("clean energy" OR renewable) ("financial advisor" OR "legal counsel" OR "commercial due diligence") (partner OR managing director)',
    ],
    "grid-infrastructure": [
        'site:towerbrook.com ("investment" OR "partnership") ("grid connection" OR "high voltage" OR infrastructure)',
        '("private equity" OR "infrastructure fund") ("grid services" OR "power infrastructure") (acquisition OR investment)',
        '("portfolio company" OR "sponsor-backed") ("grid infrastructure" OR electrical OR transmission) ("add-on acquisition" OR sale)',
        '("secondary buyout" OR "majority investment") ("grid services" OR "power solutions") (partner OR managing director)',
        '("grid services" OR "power infrastructure") (founder OR CEO OR chair) ("private equity" OR "portfolio company")',
        '("grid services" OR "power infrastructure") ("financial advisor" OR "legal counsel" OR "commercial due diligence") (partner OR managing director)',
    ],
    "smart-water": [
        'site:towerbrook.com ("investment" OR "partnership") (water OR "infrastructure services")',
        '("private equity" OR "infrastructure fund") ("water infrastructure" OR "water technology") (acquisition OR investment)',
        '("portfolio company" OR "sponsor-backed") (water OR wastewater) ("add-on acquisition" OR sale)',
        '("secondary buyout" OR "majority investment") (water OR wastewater) (partner OR managing director)',
        '("water infrastructure" OR "water technology") (founder OR CEO OR chair) ("private equity" OR "portfolio company")',
        '("water infrastructure" OR "water technology") ("financial advisor" OR "legal counsel" OR "commercial due diligence") (partner OR managing director)',
    ],
}


@router.post("/process-next")
async def process_next_job():
    job = repo.claim_next_job()
    if not job:
        return {"processed": False, "reason": "No queued jobs"}

    try:
        settings = get_settings()
        queries = _queries_for_job(job.theme_id, job.query, job.metadata)
        repo.update_job(job.id, {"progress_total": len(queries)})
        provider_status = {
            "keirolabs": bool(settings.keirolabs_api_key),
            "deepseek": bool(settings.deepseek_api_key),
            "supabase": repo.enabled,
        }
        if job.metadata.get("dry_run"):
            repo.update_job(
                job.id,
                {
                    "status": "completed",
                    "progress_completed": len(queries),
                    "metadata": {
                        **job.metadata,
                        "queries": queries,
                        "provider_status": provider_status,
                        "review_gated": True,
                    },
                },
            )
            return {
                "processed": True,
                "job_id": job.id,
                "dry_run": True,
                "queries": queries,
                "provider_status": provider_status,
            }
        missing_providers = [
            provider for provider, configured in provider_status.items() if not configured
        ]
        if missing_providers:
            error = f"Discovery pipeline not configured: {', '.join(missing_providers)}"
            repo.update_job(
                job.id,
                {
                    "status": "failed",
                    "error": error,
                    "metadata": {
                        **job.metadata,
                        "provider_status": provider_status,
                        "review_gated": True,
                    },
                },
            )
            return {
                "processed": True,
                "job_id": job.id,
                "error": error,
                "provider_status": provider_status,
            }

        totals = {
            "sources": 0,
            "people_candidates": 0,
            "company_candidates": 0,
            "relationship_candidates": 0,
            "entity_match_candidates": 0,
        }
        requests_used = 0
        for index, query in enumerate(queries, start=1):
            if requests_used >= settings.keirolabs_max_requests_per_job:
                break
            results = await keiro.search(query, limit=settings.keirolabs_search_results)
            requests_used += 1
            totals["sources"] += len(results)
            fallback_fetches = 0
            for result in results:
                content = result.get("content") or result.get("snippet") or ""
                can_fetch = (
                    not result.get("content")
                    and result.get("url")
                    and fallback_fetches < settings.keirolabs_fetches_per_query
                    and requests_used < settings.keirolabs_max_requests_per_job
                )
                if can_fetch:
                    fetched = await keiro.fetch_content(result["url"])
                    requests_used += 1
                    fallback_fetches += 1
                    content = fetched.get("content") or content
                    result["title"] = fetched.get("title") or result.get("title")
                source = repo.upsert_source(
                    {
                        "url": result.get("url"),
                        "title": result.get("title") or query,
                        "publisher": result.get("publisher"),
                        "source_type": "web_search",
                        "raw_text": content,
                        "metadata": {
                            "theme_id": job.theme_id,
                            "query": query,
                            "job_id": job.id,
                            "job_type": job.job_type,
                            "research_objective": job.metadata.get("objective"),
                            "review_gated": True,
                        },
                    }
                )
                chunks = chunk_text(content)
                extraction = await extractor.extract(
                    content,
                    source.title,
                    source.url,
                    job.theme_id,
                    objective=job.metadata.get("objective"),
                    target_context=job.metadata,
                )
                persisted = await persist_candidate_extraction(
                    extraction,
                    source,
                    chunks,
                    embeddings.embed_many(chunks),
                    job.theme_id,
                    job,
                )
                for key in (
                    "people_candidates",
                    "company_candidates",
                    "relationship_candidates",
                    "entity_match_candidates",
                ):
                    totals[key] += persisted[key]
            repo.update_job(job.id, {"progress_completed": index})
        repo.update_job(
            job.id,
            {
                "status": "completed",
                "sources_found": totals["sources"],
                "entities_created": totals["people_candidates"] + totals["company_candidates"],
                "relationships_created": totals["relationship_candidates"],
                "metadata": {
                    **job.metadata,
                    "keirolabs_requests_used": requests_used,
                    "provider_status": provider_status,
                    "review_gated": True,
                    "entity_match_candidates": totals["entity_match_candidates"],
                },
            },
        )
        return {"processed": True, "job_id": job.id, "keirolabs_requests_used": requests_used, **totals}
    except Exception as exc:
        repo.update_job(job.id, {"status": "failed", "error": str(exc)})
        return {"processed": True, "job_id": job.id, "error": str(exc)}


def _queries_for_job(
    theme_id: str | None,
    query: str | None,
    metadata: dict | None = None,
) -> list[str]:
    metadata_queries = (metadata or {}).get("queries")
    if isinstance(metadata_queries, list):
        queries = [item.strip() for item in metadata_queries if isinstance(item, str) and item.strip()]
        if queries:
            return queries
    if query:
        return [query]
    if theme_id and theme_id in THEME_QUERIES:
        return THEME_QUERIES[theme_id]
    return [item for queries in THEME_QUERIES.values() for item in queries]
