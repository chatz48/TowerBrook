from fastapi import APIRouter

from app.repositories.supabase_repo import repo
from app.schemas.domain import SourceInput
from app.services.chunker import chunk_text
from app.services.deepseek_extractor import extractor
from app.services.embeddings_bge import embeddings
from app.services.graph_builder import persist_extraction
from app.services.keiro_search import keiro

router = APIRouter(prefix="/jobs", tags=["jobs"])

THEME_QUERIES = {
    "clean-energy-advisory": [
        "clean energy advisory development M&A founders advisors",
        "renewable energy developer transaction advisors lawyers bankers",
    ],
    "grid-infrastructure": [
        "grid connection infrastructure advisors developers operators",
        "interconnection queue transmission distribution network experts",
    ],
    "smart-water": [
        "smart water infrastructure analytics founders operators advisors",
        "water leakage analytics metering software investment advisors",
    ],
}


@router.post("/process-next")
async def process_next_job():
    job = repo.claim_next_job()
    if not job:
        return {"processed": False, "reason": "No queued jobs"}

    try:
        queries = _queries_for_job(job.theme_id, job.query)
        repo.update_job(job.id, {"progress_total": len(queries)})
        totals = {"sources": 0, "entities": 0, "relationships": 0}
        for index, query in enumerate(queries, start=1):
            results = await keiro.search(query, limit=5)
            totals["sources"] += len(results)
            for result in results:
                content = result.get("snippet") or ""
                if result.get("url"):
                    fetched = await keiro.fetch_content(result["url"])
                    content = fetched.get("content") or content
                    result["title"] = fetched.get("title") or result.get("title")
                source = repo.upsert_source(
                    {
                        "url": result.get("url"),
                        "title": result.get("title") or query,
                        "publisher": result.get("publisher"),
                        "source_type": "web_search",
                        "raw_text": content,
                        "metadata": {"theme_id": job.theme_id, "query": query},
                    }
                )
                chunks = chunk_text(content)
                extraction = await extractor.extract(content, source.title, source.url, job.theme_id)
                persisted = await persist_extraction(extraction, source, chunks, embeddings.embed_many(chunks), job.theme_id)
                totals["entities"] += persisted["people_created"] + persisted["companies_created"]
                totals["relationships"] += persisted["relationships_created"]
            repo.update_job(job.id, {"progress_completed": index})
        repo.update_job(
            job.id,
            {
                "status": "completed",
                "sources_found": totals["sources"],
                "entities_created": totals["entities"],
                "relationships_created": totals["relationships"],
            },
        )
        return {"processed": True, "job_id": job.id, **totals}
    except Exception as exc:
        repo.update_job(job.id, {"status": "failed", "error": str(exc)})
        return {"processed": True, "job_id": job.id, "error": str(exc)}


def _queries_for_job(theme_id: str | None, query: str | None) -> list[str]:
    if query:
        return [query]
    if theme_id and theme_id in THEME_QUERIES:
        return THEME_QUERIES[theme_id]
    return [item for queries in THEME_QUERIES.values() for item in queries]
