from __future__ import annotations

import json
import logging
from typing import Any
from urllib.parse import urlparse

from fastapi import HTTPException

from app.repositories.supabase_repo import repo
from app.services.deepseek_llm import llm
from app.services.keiro_search import keiro

logger = logging.getLogger("towerbrook.deal_enrichment")

SYSTEM = """You enrich private-equity deal facts using web search.
Use authoritative sources first: buyer, seller, target, investor, bank, law firm, regulator, reputable trade press.
Never invent undisclosed economics. Return strict JSON only. Low-confidence or uncertain facts must be review-gated."""


async def run_deal_enrichment(external_deal_id: str) -> dict[str, Any]:
    if not repo.enabled or not repo.client:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured on the backend API.",
        )
    if not llm.configured:
        raise HTTPException(
            status_code=503,
            detail="DEEPSEEK_API_KEY is not configured on the backend API.",
        )

    client = repo.client
    deal_rows = (
        client.table("deals")
        .select("*")
        .eq("external_id", external_deal_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    deal_row = deal_rows[0] if deal_rows else None
    if not deal_row:
        raise HTTPException(status_code=404, detail=f"Unknown persisted deal: {external_deal_id}")

    facts_result = (
        client.table("deal_facts").select("fact_type,fact_value").eq("deal_id", deal_row["id"]).execute()
    )
    known_facts = facts_result.data or []
    missing_facts = deal_row.get("missing_facts") or []
    follow_up_searches = deal_row.get("follow_up_searches") or []

    run_result = (
        client.table("deal_enrichment_runs")
        .insert(
            {
                "deal_id": deal_row["id"],
                "trigger": "manual",
                "status": "running",
                "queries": follow_up_searches,
                "metadata": {"dealExternalId": external_deal_id},
            }
        )
        .execute()
    )
    run = (run_result.data or [None])[0]
    if not run:
        raise HTTPException(status_code=500, detail="Failed to create enrichment run.")
    run_id = run["id"]

    try:
        search_sources = await _collect_search_evidence(deal_row["name"], follow_up_searches)
        payload = await _extract_enrichment_payload(
            deal_row=deal_row,
            known_facts=known_facts,
            missing_facts=missing_facts,
            follow_up_searches=follow_up_searches,
            search_sources=search_sources,
        )

        source_id_by_url: dict[str, str] = {}
        sources_to_persist = payload.get("sources") or search_sources
        for source in sources_to_persist:
            source_id = _upsert_web_source(client, source, external_deal_id)
            source_id_by_url[source["url"]] = source_id
            snippet = source.get("snippet")
            if snippet:
                client.table("source_chunks").insert(
                    {
                        "source_id": source_id,
                        "content": snippet,
                        "token_count": max(1, len(snippet.split())),
                        "metadata": {
                            "dealExternalId": external_deal_id,
                            "enrichmentRunId": run_id,
                        },
                    }
                ).execute()

        fact_rows = []
        for fact in payload.get("facts") or []:
            source_url = fact.get("sourceUrl")
            source_id = source_id_by_url.get(source_url) if source_url else None
            if not source_id and source_url:
                source_id = _upsert_web_source(
                    client,
                    {
                        "title": source_url,
                        "url": source_url,
                        "snippet": fact.get("evidenceText"),
                    },
                    external_deal_id,
                )
            fact_rows.append(
                {
                    "deal_id": deal_row["id"],
                    "fact_type": fact.get("factType"),
                    "fact_value": fact.get("factValue"),
                    "normalized_value": fact.get("normalizedValue"),
                    "source_id": source_id,
                    "evidence_text": fact.get("evidenceText"),
                    "confidence": max(0.0, min(1.0, float(fact.get("confidence") or 0.7))),
                    "extraction_method": "web_search",
                    "review_status": fact.get("reviewStatus") or "needs_review",
                }
            )

        if fact_rows:
            client.table("deal_facts").insert(fact_rows).execute()

        conflict_rows = [
            {
                "deal_id": deal_row["id"],
                "fact_type": conflict.get("factType"),
                "values": conflict.get("values") or [],
                "note": conflict.get("note") or "",
            }
            for conflict in payload.get("conflicts") or []
        ]
        if conflict_rows:
            client.table("deal_fact_conflicts").insert(conflict_rows).execute()

        remaining_missing = payload.get("remainingMissingFacts") or missing_facts
        client.table("deals").update(
            {"missing_facts": remaining_missing, "updated_at": "now()"}
        ).eq("external_id", external_deal_id).execute()

        client.table("deal_enrichment_runs").update(
            {
                "status": "completed",
                "sources_found": len(sources_to_persist),
                "facts_created": len(fact_rows),
                "completed_at": "now()",
            }
        ).eq("id", run_id).execute()

        return {
            "runId": run_id,
            "sourcesFound": len(sources_to_persist),
            "factsCreated": len(fact_rows),
            "conflictsCreated": len(conflict_rows),
            "remainingMissingFacts": remaining_missing,
        }
    except Exception as exc:
        logger.exception("Deal enrichment failed for %s", external_deal_id)
        client.table("deal_enrichment_runs").update(
            {
                "status": "failed",
                "error": str(exc),
                "completed_at": "now()",
            }
        ).eq("id", run_id).execute()
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(exc)) from exc


async def _collect_search_evidence(deal_name: str, queries: list[str]) -> list[dict[str, str]]:
    seen: dict[str, dict[str, str]] = {}
    selected = (queries or [f"{deal_name} transaction advisor completion"])[:4]
    for query in selected:
        for result in await keiro.search(query, limit=6):
            url = result.get("url")
            if not url or url in seen:
                continue
            seen[url] = {
                "title": result.get("title") or url,
                "url": url,
                "publisher": _safe_publisher(url),
                "snippet": result.get("content") or result.get("snippet") or "",
            }
    return list(seen.values())[:12]


async def _extract_enrichment_payload(
    *,
    deal_row: dict[str, Any],
    known_facts: list[dict[str, Any]],
    missing_facts: list[str],
    follow_up_searches: list[str],
    search_sources: list[dict[str, str]],
) -> dict[str, Any]:
    known_fact_lines = "\n".join(
        f"- {fact['fact_type']}: {fact['fact_value']}" for fact in known_facts
    )
    source_blocks = "\n\n".join(
        f"{index + 1}. {source['title']}\nURL: {source['url']}\nPublisher: {source.get('publisher', '')}\nSnippet: {source.get('snippet', '')}"
        for index, source in enumerate(search_sources)
    )
    user = f"""Deal: {deal_row['name']}
Theme: {deal_row.get('theme')}
Known facts:
{known_fact_lines or '- none'}

Missing facts:
{chr(10).join(f'- {fact}' for fact in missing_facts) or '- none'}

Run targeted searches using these query ideas:
{chr(10).join(f'- {query}' for query in follow_up_searches) or '- none'}

Source snippets from backend web search:
{source_blocks or 'No live search results returned.'}

Return strict JSON:
{{
  "sources": [{{"title": string, "url": string, "publisher": string, "snippet": string}}],
  "facts": [{{"factType": string, "factValue": string, "normalizedValue": string, "sourceUrl": string, "evidenceText": string, "confidence": number, "reviewStatus": "verified" | "needs_review" | "not_disclosed"}}],
  "conflicts": [{{"factType": string, "values": string[], "note": string}}],
  "remainingMissingFacts": string[]
}}"""
    raw = await llm.complete(SYSTEM, user, max_tokens=3000, json_mode=True)
    return _parse_json(raw) or {}


def _upsert_web_source(client: Any, source: dict[str, str], external_deal_id: str) -> str:
    record = repo.upsert_source(
        {
            "title": source.get("title") or source.get("url") or "Web source",
            "url": source.get("url"),
            "publisher": source.get("publisher"),
            "source_type": "web_enrichment",
            "raw_text": source.get("snippet"),
            "metadata": {"dealExternalId": external_deal_id},
        }
    )
    return record.id


def _parse_json(text: str) -> dict[str, Any] | None:
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end <= start:
            return None
        try:
            parsed = json.loads(text[start : end + 1])
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None


def _safe_publisher(url: str) -> str:
    try:
        hostname = urlparse(url).hostname
        return hostname.replace("www.", "") if hostname else "Web source"
    except Exception:
        return "Web source"
