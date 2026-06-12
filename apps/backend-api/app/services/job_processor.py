from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
import asyncio
import hashlib

from app.config import Settings
from app.repositories.supabase_repo import repo
from app.schemas.domain import ExtractionResult, ResearchJob
from app.services.chunker import chunk_text
from app.services.deepseek_extractor import extractor
from app.services.embeddings_bge import embeddings
from app.services.expert_profile_completion import ProfileCoverage, update_profile_coverage
from app.services.graph_builder import persist_candidate_extraction
from app.services.keiro_search import keiro


@dataclass
class JobProcessingTotals:
    sources: int = 0
    people_candidates: int = 0
    company_candidates: int = 0
    relationship_candidates: int = 0
    fact_candidates: int = 0
    entity_match_candidates: int = 0

    def absorb(self, persisted: dict[str, int]) -> None:
        for key in (
            "people_candidates",
            "company_candidates",
            "relationship_candidates",
            "fact_candidates",
            "entity_match_candidates",
        ):
            setattr(self, key, getattr(self, key) + persisted[key])


@dataclass
class QueryBatchResult:
    totals: JobProcessingTotals = field(default_factory=JobProcessingTotals)
    requests_used: int = 0
    executed_queries: list[str] = field(default_factory=list)


async def enrich_search_result(
    result: dict[str, Any],
    settings: Settings,
    requests_used: int,
    fallback_fetches: int,
) -> tuple[str, int, int]:
    content = result.get("content") or result.get("snippet") or ""
    can_fetch = (
        not result.get("content")
        and result.get("url")
        and fallback_fetches < settings.keirolabs_fetches_per_query
        and requests_used < settings.keirolabs_max_requests_per_job
    )
    if not can_fetch:
        return content, requests_used, fallback_fetches

    fetched = await keiro.fetch_content(result["url"])
    requests_used += 1
    fallback_fetches += 1
    content = fetched.get("content") or content
    result["title"] = fetched.get("title") or result.get("title")
    return content, requests_used, fallback_fetches


async def persist_search_hit(
    job: ResearchJob,
    query: str,
    result: dict[str, Any],
    content: str,
    *,
    round_index: int | None = None,
    profile_coverage: ProfileCoverage | None = None,
) -> dict[str, int]:
    input_hash = hashlib.sha256(
        f"{source_hash_basis(result, content)}:{job.theme_id}:{job.metadata.get('objective')}".encode("utf-8")
    ).hexdigest()
    metadata = {
        "theme_id": job.theme_id,
        "query": query,
        "job_id": job.id,
        "job_type": job.job_type,
        "research_objective": job.metadata.get("objective"),
        "review_gated": True,
    }
    if round_index is not None:
        metadata["profile_completion_round"] = round_index + 1

    source = repo.upsert_source(
        {
            "url": result.get("url"),
            "title": result.get("title") or query,
            "publisher": result.get("publisher"),
            "source_type": "web_search",
            "raw_text": content,
            "content_hash": hashlib.sha256(content.encode("utf-8")).hexdigest() if content else None,
            "metadata": metadata,
        }
    )
    chunks = chunk_text(content)
    target_context = dict(job.metadata)
    if profile_coverage is not None:
        target_context["profile_coverage"] = profile_coverage.fields
        target_context["missing_profile_fields"] = profile_coverage.missing_fields

    cached = repo.get_cached_extraction(source.id, input_hash)
    if cached:
        extraction = ExtractionResult.model_validate(cached)
    else:
        extraction = await extractor.extract(
            content,
            source.title,
            source.url,
            job.theme_id,
            objective=job.metadata.get("objective"),
            target_context=target_context,
        )
        repo.cache_extraction(source.id, input_hash, extraction.model_dump(mode="json"))
    if profile_coverage is not None:
        update_profile_coverage(profile_coverage, extraction, source)

    return await persist_candidate_extraction(
        extraction,
        source,
        chunks,
        embeddings.embed_many(chunks),
        job.theme_id,
        job,
    )


def source_hash_basis(result: dict[str, Any], content: str) -> str:
    return str(result.get("url") or result.get("title") or content[:1000])


async def run_discovery_queries(
    job: ResearchJob,
    queries: list[str],
    settings: Settings,
) -> QueryBatchResult:
    batch = QueryBatchResult()
    for index, query in enumerate(queries, start=1):
        if batch.requests_used >= settings.keirolabs_max_requests_per_job:
            break

        results = await keiro.search(query, limit=settings.keirolabs_search_results)
        batch.requests_used += 1
        batch.totals.sources += len(results)
        fallback_fetches = 0

        for result in results:
            content, batch.requests_used, fallback_fetches = await enrich_search_result(
                result,
                settings,
                batch.requests_used,
                fallback_fetches,
            )
            persisted = await persist_search_hit(job, query, result, content)
            batch.totals.absorb(persisted)

        repo.update_job(job.id, {"progress_completed": index})

    return batch


async def run_profile_completion_queries(
    job: ResearchJob,
    initial_queries: list[str],
    settings: Settings,
    coverage: ProfileCoverage,
    *,
    max_rounds: int,
    max_queries: int,
    results_per_query: int,
) -> QueryBatchResult:
    batch = QueryBatchResult()
    executed: set[str] = set()
    queries = list(initial_queries)
    semaphore = asyncio.Semaphore(max(1, settings.profile_completion_concurrency))
    repo.update_job(job.id, {"progress_total": max_queries})

    for round_index in range(max_rounds):
        if round_index > 0:
            from app.services.expert_profile_completion import build_follow_up_profile_queries

            queries = build_follow_up_profile_queries(coverage)
        if not queries:
            break

        for query in queries:
            if len(executed) >= max_queries:
                break
            if batch.requests_used >= settings.keirolabs_max_requests_per_job:
                break
            if query in executed:
                continue

            executed.add(query)
            batch.executed_queries.append(query)
            results = await keiro.search(
                query,
                limit=min(settings.keirolabs_search_results, results_per_query),
            )
            batch.requests_used += 1
            batch.totals.sources += len(results)
            fallback_fetches = 0

            async def persist_result(result: dict[str, Any], allow_fetch: bool) -> tuple[dict[str, int] | None, int]:
                url = result.get("url")
                if url and url in coverage.seen_urls:
                    return None, 0

                async with semaphore:
                    content, _requests_used, _fallback_fetches = await enrich_search_result(
                        result,
                        settings,
                        0,
                        0 if allow_fetch else settings.keirolabs_fetches_per_query,
                    )
                    persisted = await persist_search_hit(
                        job,
                        query,
                        result,
                        content,
                        round_index=round_index,
                        profile_coverage=coverage,
                    )
                    return persisted, _requests_used

            persisted_results = await asyncio.gather(
                *[
                    persist_result(result, index < settings.keirolabs_fetches_per_query)
                    for index, result in enumerate(results)
                ],
                return_exceptions=True,
            )
            for item in persisted_results:
                if isinstance(item, tuple):
                    persisted, fetch_requests = item
                    batch.requests_used += fetch_requests
                    fallback_fetches += fetch_requests
                    if isinstance(persisted, dict):
                        batch.totals.absorb(persisted)

            repo.update_job(job.id, {"progress_completed": len(executed)})

        if coverage.complete or len(executed) >= max_queries:
            break

    return batch
