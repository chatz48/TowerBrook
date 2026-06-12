from __future__ import annotations

from collections.abc import Callable
from typing import Any, TypeVar
from uuid import uuid4
import hashlib
import difflib

from supabase import Client, create_client

from app.config import get_settings
from app.schemas.domain import ResearchJob, ResearchJobRequest, SourceRecord

T = TypeVar("T")


class SupabaseRepository:
    def __init__(self) -> None:
        settings = get_settings()
        self.enabled = bool(settings.supabase_url and settings.supabase_service_role_key)
        self.client: Client | None = (
            create_client(settings.supabase_url, settings.supabase_service_role_key)
            if self.enabled
            else None
        )
        self.memory_jobs: dict[str, dict[str, Any]] = {}
        self.memory_sources: dict[str, dict[str, Any]] = {}
        self.memory_people: dict[str, dict[str, Any]] = {}
        self.memory_companies: dict[str, dict[str, Any]] = {}
        self.memory_discovery_candidates: dict[str, dict[str, Any]] = {}
        self.memory_entity_match_candidates: dict[str, dict[str, Any]] = {}
        self.memory_source_chunks: dict[str, dict[str, Any]] = {}

    def _dispatch(self, client_fn: Callable[[Client], T], memory_fn: Callable[[], T]) -> T:
        if self.client:
            return client_fn(self.client)
        return memory_fn()

    def health(self) -> dict[str, Any]:
        return {"supabase_enabled": self.enabled}

    def create_job(self, request: ResearchJobRequest) -> ResearchJob:
        payload = {
            "job_type": request.job_type,
            "status": "queued",
            "theme_id": request.theme_id,
            "query": request.query,
            "target_type": request.target_type,
            "target_id": str(request.target_id) if request.target_id else None,
            "priority": request.priority,
            "metadata": request.metadata,
        }

        def client_create(client: Client) -> ResearchJob:
            row = client.table("research_jobs").insert(payload).execute().data[0]
            return self._job_from_row(row)

        def memory_create() -> ResearchJob:
            job_id = str(uuid4())
            row = {"id": job_id, **payload, "progress_completed": 0, "progress_total": 0}
            self.memory_jobs[job_id] = row
            return self._job_from_row(row)

        return self._dispatch(client_create, memory_create)

    def get_job(self, job_id: str) -> ResearchJob | None:
        def client_get(client: Client) -> ResearchJob | None:
            rows = client.table("research_jobs").select("*").eq("id", job_id).limit(1).execute().data
            return self._job_from_row(rows[0]) if rows else None

        def memory_get() -> ResearchJob | None:
            row = self.memory_jobs.get(job_id)
            return self._job_from_row(row) if row else None

        return self._dispatch(client_get, memory_get)

    def claim_next_job(self) -> ResearchJob | None:
        def client_claim(client: Client) -> ResearchJob | None:
            rows = (
                client.table("research_jobs")
                .select("*")
                .eq("status", "queued")
                .order("priority", desc=True)
                .order("queued_at")
                .limit(1)
                .execute()
                .data
            )
            if not rows:
                return None
            job_id = rows[0]["id"]
            updated = (
                client.table("research_jobs")
                .update({"status": "running"})
                .eq("id", job_id)
                .execute()
                .data[0]
            )
            return self._job_from_row(updated)

        def memory_claim() -> ResearchJob | None:
            for row in sorted(self.memory_jobs.values(), key=lambda x: (-x.get("priority", 0), x["id"])):
                if row["status"] == "queued":
                    row["status"] = "running"
                    return self._job_from_row(row)
            return None

        return self._dispatch(client_claim, memory_claim)

    def claim_job(self, job_id: str) -> ResearchJob | None:
        def client_claim(client: Client) -> ResearchJob | None:
            rows = (
                client.table("research_jobs")
                .select("*")
                .eq("id", job_id)
                .eq("status", "queued")
                .limit(1)
                .execute()
                .data
            )
            if not rows:
                return None
            updated = (
                client.table("research_jobs")
                .update({"status": "running"})
                .eq("id", job_id)
                .eq("status", "queued")
                .execute()
                .data
            )
            return self._job_from_row(updated[0]) if updated else None

        def memory_claim() -> ResearchJob | None:
            row = self.memory_jobs.get(job_id)
            if not row or row["status"] != "queued":
                return None
            row["status"] = "running"
            return self._job_from_row(row)

        return self._dispatch(client_claim, memory_claim)

    def update_job(self, job_id: str, values: dict[str, Any]) -> None:
        if self.client:
            self.client.table("research_jobs").update(values).eq("id", job_id).execute()
            return
        if job_id in self.memory_jobs:
            self.memory_jobs[job_id].update(values)

    def upsert_source(self, source: dict[str, Any]) -> SourceRecord:
        raw_text = source.get("raw_text") or ""
        content_hash = source.get("content_hash") or (_stable_id(raw_text) if raw_text else None)
        external_id = source.get("external_id") or _stable_id(
            source.get("url") or content_hash or source.get("title") or str(uuid4())
        )
        payload = {
            "external_id": external_id,
            "title": source.get("title") or source.get("url") or "Untitled source",
            "url": source.get("url"),
            "publisher": source.get("publisher"),
            "source_type": source.get("source_type", "submitted"),
            "raw_text": raw_text or None,
            "storage_path": source.get("storage_path"),
            "content_hash": content_hash,
            "metadata": source.get("metadata", {}),
        }

        def client_upsert(client: Client) -> SourceRecord:
            rows = client.table("sources").upsert(payload, on_conflict="external_id").execute().data
            return SourceRecord(**rows[0])

        def memory_upsert() -> SourceRecord:
            existing_id = next(
                (
                    source_id
                    for source_id, row in self.memory_sources.items()
                    if row.get("external_id") == external_id
                    or (content_hash and row.get("content_hash") == content_hash)
                ),
                None,
            )
            source_id = existing_id or str(uuid4())
            existing = self.memory_sources.get(source_id, {})
            merged_metadata = {
                **(existing.get("metadata") or {}),
                **(payload.get("metadata") or {}),
            }
            row = {"id": source_id, **existing, **payload, "metadata": merged_metadata}
            self.memory_sources[source_id] = row
            return SourceRecord(**row)

        return self._dispatch(client_upsert, memory_upsert)

    def insert_chunks(self, chunks: list[dict[str, Any]]) -> None:
        if not chunks:
            return
        if self.client:
            self.client.table("source_chunks").insert(chunks).execute()
            return
        for chunk in chunks:
            chunk_id = str(uuid4())
            self.memory_source_chunks[chunk_id] = {"id": chunk_id, **chunk}

    def get_cached_extraction(self, source_id: str, input_hash: str) -> dict[str, Any] | None:
        def client_get(client: Client) -> dict[str, Any] | None:
            rows = (
                client.table("sources")
                .select("metadata")
                .eq("id", source_id)
                .limit(1)
                .execute()
                .data
            )
            metadata = rows[0].get("metadata") if rows else None
            cache = metadata.get("extraction_cache") if isinstance(metadata, dict) else None
            if isinstance(cache, dict) and cache.get("input_hash") == input_hash:
                result = cache.get("result")
                return result if isinstance(result, dict) else None
            return None

        def memory_get() -> dict[str, Any] | None:
            metadata = self.memory_sources.get(source_id, {}).get("metadata") or {}
            cache = metadata.get("extraction_cache")
            if isinstance(cache, dict) and cache.get("input_hash") == input_hash:
                result = cache.get("result")
                return result if isinstance(result, dict) else None
            return None

        return self._dispatch(client_get, memory_get)

    def cache_extraction(self, source_id: str, input_hash: str, result: dict[str, Any]) -> None:
        def client_update(client: Client) -> None:
            rows = (
                client.table("sources")
                .select("metadata")
                .eq("id", source_id)
                .limit(1)
                .execute()
                .data
            )
            metadata = dict(rows[0].get("metadata") or {}) if rows else {}
            metadata["extraction_cache"] = {"input_hash": input_hash, "result": result}
            client.table("sources").update({"metadata": metadata}).eq("id", source_id).execute()

        def memory_update() -> None:
            row = self.memory_sources.get(source_id)
            if not row:
                return
            metadata = dict(row.get("metadata") or {})
            metadata["extraction_cache"] = {"input_hash": input_hash, "result": result}
            row["metadata"] = metadata

        self._dispatch(client_update, memory_update)

    def upsert_people(self, people: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not people:
            return []

        def client_upsert(client: Client) -> list[dict[str, Any]]:
            return client.table("people").upsert(people, on_conflict="external_id").execute().data

        def memory_upsert() -> list[dict[str, Any]]:
            rows = []
            for person in people:
                row = {"id": str(uuid4()), **person}
                self.memory_people[row["id"]] = row
                rows.append(row)
            return rows

        return self._dispatch(client_upsert, memory_upsert)

    def upsert_companies(self, companies: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not companies:
            return []

        def client_upsert(client: Client) -> list[dict[str, Any]]:
            return client.table("companies").upsert(companies, on_conflict="external_id").execute().data

        def memory_upsert() -> list[dict[str, Any]]:
            rows = []
            for company in companies:
                row = {"id": str(uuid4()), **company}
                self.memory_companies[row["id"]] = row
                rows.append(row)
            return rows

        return self._dispatch(client_upsert, memory_upsert)

    def upsert_discovery_candidates(self, candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not candidates:
            return []

        def client_upsert(client: Client) -> list[dict[str, Any]]:
            return (
                client.table("discovery_candidates")
                .upsert(candidates, on_conflict="external_id")
                .execute()
                .data
            )

        def memory_upsert() -> list[dict[str, Any]]:
            rows = []
            existing_by_external_id = {
                row["external_id"]: candidate_id
                for candidate_id, row in self.memory_discovery_candidates.items()
            }
            for candidate in candidates:
                candidate_id = existing_by_external_id.get(candidate["external_id"], str(uuid4()))
                row = {"id": candidate_id, **candidate}
                self.memory_discovery_candidates[candidate_id] = row
                rows.append(row)
            return rows

        return self._dispatch(client_upsert, memory_upsert)

    def upsert_entity_match_candidates(self, matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not matches:
            return []

        def client_upsert(client: Client) -> list[dict[str, Any]]:
            return (
                client.table("entity_match_candidates")
                .upsert(
                    matches,
                    on_conflict=(
                        "discovery_candidate_id,canonical_entity_type,"
                        "canonical_entity_id,match_method"
                    ),
                )
                .execute()
                .data
            )

        def memory_upsert() -> list[dict[str, Any]]:
            rows = []
            for match in matches:
                row = {"id": str(uuid4()), **match}
                self.memory_entity_match_candidates[row["id"]] = row
                rows.append(row)
            return rows

        return self._dispatch(client_upsert, memory_upsert)

    def find_people_by_name(self, name: str, limit: int = 10) -> list[dict[str, Any]]:
        def client_find(client: Client) -> list[dict[str, Any]]:
            return (
                client.table("people")
                .select("*")
                .ilike("name", f"%{name}%")
                .limit(limit)
                .execute()
                .data
            )

        def memory_find() -> list[dict[str, Any]]:
            lowered = name.casefold()
            scored = []
            for row in self.memory_people.values():
                row_name = str(row.get("name", "")).casefold()
                aliases = [str(alias).casefold() for alias in row.get("aliases", [])]
                ratio = max(
                    [difflib.SequenceMatcher(None, lowered, row_name).ratio()]
                    + [difflib.SequenceMatcher(None, lowered, alias).ratio() for alias in aliases]
                )
                if lowered == row_name or lowered in aliases or ratio >= 0.82:
                    scored.append((ratio, row))
            return [row for _, row in sorted(scored, key=lambda item: item[0], reverse=True)[:limit]]

        return self._dispatch(client_find, memory_find)

    def find_companies_by_name(self, name: str, limit: int = 10) -> list[dict[str, Any]]:
        def client_find(client: Client) -> list[dict[str, Any]]:
            return (
                client.table("companies")
                .select("*")
                .ilike("name", name)
                .limit(limit)
                .execute()
                .data
            )

        def memory_find() -> list[dict[str, Any]]:
            lowered = name.casefold()
            return [
                row
                for row in self.memory_companies.values()
                if str(row.get("name", "")).casefold() == lowered
            ][:limit]

        return self._dispatch(client_find, memory_find)

    def insert_relationships(self, relationships: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not relationships:
            return []
        if self.client:
            return self.client.table("relationships").insert(relationships).execute().data
        return [{"id": str(uuid4()), **item} for item in relationships]

    def insert_facts(self, facts: list[dict[str, Any]]) -> None:
        if facts and self.client:
            self.client.table("facts").insert(facts).execute()

    def insert_embeddings(self, table: str, rows: list[dict[str, Any]]) -> None:
        if rows and self.client:
            self.client.table(table).upsert(rows).execute()

    def list_source_chunks(self, offset: int = 0, limit: int = 64) -> list[dict[str, Any]]:
        if not self.client:
            return []
        return (
            self.client.table("source_chunks")
            .select("id,content")
            .order("id")
            .range(offset, offset + max(limit - 1, 0))
            .execute()
            .data
        )

    def update_chunk_embedding(self, chunk_id: str, embedding: list[float]) -> None:
        if self.client:
            self.client.table("source_chunks").update({"embedding": embedding}).eq("id", chunk_id).execute()

    def search_sources(self, query_embedding: list[float], theme_id: str | None, limit: int = 8) -> list[dict[str, Any]]:
        if not self.client:
            return []
        filters = {"theme_id": theme_id} if theme_id else {}
        return self.client.rpc(
            "match_source_chunks",
            {"query_embedding": query_embedding, "match_count": limit, "filter": filters},
        ).execute().data

    def hybrid_search_sources(
        self,
        query: str,
        query_embedding: list[float],
        theme_id: str | None,
        limit: int = 8,
    ) -> list[dict[str, Any]]:
        if not self.client:
            query_terms = [term.casefold() for term in query.split() if len(term) > 2]
            rows = []
            for chunk_id, chunk in self.memory_source_chunks.items():
                content = str(chunk.get("content") or "")
                haystack = content.casefold()
                text_rank = sum(1 for term in query_terms if term in haystack)
                if theme_id and theme_id not in (chunk.get("theme_ids") or []):
                    continue
                if text_rank <= 0:
                    continue
                source = self.memory_sources.get(str(chunk.get("source_id")), {})
                rows.append(
                    {
                        "chunk_id": chunk_id,
                        "source_id": chunk.get("source_id"),
                        "content": content,
                        "title": source.get("title") or chunk.get("metadata", {}).get("source_title"),
                        "url": source.get("url"),
                        "publisher": source.get("publisher"),
                        "metadata": chunk.get("metadata") or {},
                        "vector_similarity": 0,
                        "text_rank": text_rank,
                        "hybrid_score": text_rank,
                    }
                )
            return sorted(rows, key=lambda row: row["hybrid_score"], reverse=True)[:limit]
        filters = {"theme_id": theme_id} if theme_id else {}
        try:
            return self.client.rpc(
                "hybrid_match_source_chunks",
                {
                    "query_text": query,
                    "query_embedding": query_embedding,
                    "match_count": limit,
                    "filter": filters,
                },
            ).execute().data
        except Exception:
            return self.search_sources(query_embedding, theme_id, limit)

    def search_entities(self, query_embedding: list[float], entity_type: str | None, limit: int = 8) -> list[dict[str, Any]]:
        if not self.client:
            return []
        filters = {"entity_type": entity_type} if entity_type else {}
        return self.client.rpc(
            "match_entity_embeddings",
            {"query_embedding": query_embedding, "match_count": limit, "filter": filters},
        ).execute().data

    def search_relationships(self, query_embedding: list[float], theme_id: str | None, limit: int = 8) -> list[dict[str, Any]]:
        if not self.client:
            return []
        filters = {"theme_id": theme_id} if theme_id else {}
        return self.client.rpc(
            "match_relationship_embeddings",
            {"query_embedding": query_embedding, "match_count": limit, "filter": filters},
        ).execute().data

    def list_discovery_candidates(
        self,
        review_status: str = "needs_review",
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        if self.client:
            return (
                self.client.table("discovery_candidates")
                .select("*")
                .eq("review_status", review_status)
                .order("priority", desc=True)
                .limit(limit)
                .execute()
                .data
            )
        return sorted(
            [
                row
                for row in self.memory_discovery_candidates.values()
                if row.get("review_status") == review_status
            ],
            key=lambda row: row.get("priority", 0),
            reverse=True,
        )[:limit]

    def review_discovery_candidate(
        self,
        candidate_id: str,
        review_status: str,
        *,
        canonical_entity_type: str | None = None,
        canonical_entity_id: str | None = None,
        note: str | None = None,
    ) -> dict[str, Any] | None:
        values: dict[str, Any] = {"review_status": review_status}
        if canonical_entity_type:
            values["canonical_entity_type"] = canonical_entity_type
        if canonical_entity_id:
            values["canonical_entity_id"] = canonical_entity_id

        def client_review(client: Client) -> dict[str, Any] | None:
            rows = (
                client.table("discovery_candidates")
                .select("*")
                .eq("id", candidate_id)
                .limit(1)
                .execute()
                .data
            )
            if not rows:
                return None
            candidate = rows[0]
            payload = dict(candidate.get("payload") or {})
            payload["review_note"] = note
            payload["reviewed_manually"] = True
            values["payload"] = payload
            updated = (
                client.table("discovery_candidates")
                .update(values)
                .eq("id", candidate_id)
                .execute()
                .data
            )
            return updated[0] if updated else None

        def memory_review() -> dict[str, Any] | None:
            candidate = self.memory_discovery_candidates.get(candidate_id)
            if not candidate:
                return None
            payload = dict(candidate.get("payload") or {})
            payload["review_note"] = note
            payload["reviewed_manually"] = True
            candidate.update(values)
            candidate["payload"] = payload
            return candidate

        return self._dispatch(client_review, memory_review)

    def promote_discovery_candidate(self, candidate_id: str, merge_entity_id: str | None = None) -> dict[str, Any] | None:
        candidate = next(
            (row for row in self.list_discovery_candidates("needs_review", 500) if row.get("id") == candidate_id),
            None,
        )
        if not candidate:
            candidate = next(
                (row for row in self.list_discovery_candidates("approved", 500) if row.get("id") == candidate_id),
                None,
            )
        if not candidate:
            return None

        candidate_type = candidate.get("candidate_type")
        payload = dict(candidate.get("payload") or {})
        canonical_type = "person" if candidate_type == "person" else "company" if candidate_type == "company" else None
        canonical_id = merge_entity_id

        if not merge_entity_id and candidate_type == "person":
            rows = self.upsert_people([payload])
            canonical_id = str(rows[0].get("id")) if rows else None
        elif not merge_entity_id and candidate_type == "company":
            rows = self.upsert_companies([payload])
            canonical_id = str(rows[0].get("id")) if rows else None

        status = "merged" if merge_entity_id else "approved"
        return self.review_discovery_candidate(
            candidate_id,
            status,
            canonical_entity_type=canonical_type,
            canonical_entity_id=canonical_id,
            note="Promoted through review workflow.",
        )

    def _job_from_row(self, row: dict[str, Any]) -> ResearchJob:
        return ResearchJob(
            id=str(row["id"]),
            job_type=row["job_type"],
            status=row["status"],
            theme_id=row.get("theme_id"),
            query=row.get("query"),
            progress_completed=row.get("progress_completed", 0),
            progress_total=row.get("progress_total", 0),
            sources_found=row.get("sources_found", 0),
            entities_created=row.get("entities_created", 0),
            relationships_created=row.get("relationships_created", 0),
            error=row.get("error"),
            metadata=row.get("metadata") or {},
        )


repo = SupabaseRepository()


def _stable_id(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
