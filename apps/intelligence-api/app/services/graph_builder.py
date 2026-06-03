from __future__ import annotations

from uuid import uuid4

from app.repositories.supabase_repo import repo
from app.schemas.domain import ExtractionResult, SourceRecord
from app.services.embeddings_bge import embeddings
from app.services.reconciler import company_payload, person_payload, stable_external_id
from app.services.scorer import score_company, score_expert


async def persist_extraction(
    extraction: ExtractionResult,
    source: SourceRecord,
    chunks: list[str],
    chunk_embeddings: list[list[float]],
    theme_id: str | None,
) -> dict:
    chunk_rows = [
        {
            "source_id": source.id,
            "content": chunk,
            "token_count": max(1, len(chunk.split())),
            "embedding": vector,
            "theme_ids": [theme_id] if theme_id else [],
            "metadata": {"source_title": source.title},
        }
        for chunk, vector in zip(chunks, chunk_embeddings)
    ]
    repo.insert_chunks(chunk_rows)

    people_payloads = []
    for person in extraction.people:
        payload = person_payload(person)
        relevance, momentum = score_expert(payload)
        payload["relevance_score"] = relevance
        payload["momentum_score"] = momentum
        people_payloads.append(payload)

    company_payloads = []
    for company in extraction.companies:
        payload = company_payload(company)
        relevance, momentum = score_company(payload)
        payload["relevance_score"] = relevance
        payload["momentum_score"] = momentum
        company_payloads.append(payload)

    people = repo.upsert_people(people_payloads)
    companies = repo.upsert_companies(company_payloads)
    entity_lookup = {
        ("person", item["name"].lower()): item["id"] for item in people
    } | {
        ("company", item["name"].lower()): item["id"] for item in companies
    }

    relationships = []
    for rel in extraction.relationships:
        from_id = entity_lookup.get((rel.from_type, rel.from_name.lower()))
        to_id = entity_lookup.get((rel.to_type, rel.to_name.lower()))
        relationships.append(
            {
                "from_entity_type": rel.from_type,
                "from_entity_id": from_id,
                "to_entity_type": rel.to_type,
                "to_entity_id": to_id,
                "theme_id": rel.theme_id or theme_id,
                "relationship_type": rel.relationship_type,
                "source_id": source.id,
                "evidence_text": rel.evidence_text,
                "confidence": rel.confidence,
                "metadata": {
                    "from_name": rel.from_name,
                    "to_name": rel.to_name,
                    "citation_required": True,
                },
            }
        )
    inserted_relationships = repo.insert_relationships(relationships)

    facts = [
        {
            "subject_type": fact.subject_type,
            "subject_id": entity_lookup.get((fact.subject_type, fact.subject_name.lower())),
            "fact_type": fact.fact_type,
            "fact_value": fact.fact_value,
            "theme_id": fact.theme_id or theme_id,
            "source_id": source.id,
            "evidence_text": fact.evidence_text,
            "confidence": fact.confidence,
            "extraction_method": "llm",
        }
        for fact in extraction.facts
    ]
    repo.insert_facts(facts)

    entity_embedding_rows = []
    for entity_type, rows in (("person", people), ("company", companies)):
        for row in rows:
            profile = _entity_profile(entity_type, row)
            entity_embedding_rows.append(
                {
                    "entity_type": entity_type,
                    "entity_id": row["id"],
                    "profile_text": profile,
                    "embedding": embeddings.embed(profile),
                    "embedding_model": embeddings.model_name,
                    "profile_hash": embeddings.profile_hash(profile),
                    "metadata": {"theme_ids": row.get("theme_ids", [])},
                }
            )
    repo.insert_embeddings("entity_embeddings", entity_embedding_rows)

    relationship_embedding_rows = []
    for row in inserted_relationships:
        profile = f"{row.get('metadata', {}).get('from_name')} {row.get('relationship_type')} {row.get('metadata', {}).get('to_name')}: {row.get('evidence_text')}"
        relationship_embedding_rows.append(
            {
                "relationship_id": row.get("id", str(uuid4())),
                "profile_text": profile,
                "embedding": embeddings.embed(profile),
                "embedding_model": embeddings.model_name,
                "profile_hash": embeddings.profile_hash(profile),
                "metadata": {"theme_id": row.get("theme_id")},
            }
        )
    repo.insert_embeddings("relationship_embeddings", relationship_embedding_rows)

    return {
        "people_created": len(people),
        "companies_created": len(companies),
        "relationships_created": len(inserted_relationships),
        "facts_created": len(facts),
        "chunks_created": len(chunk_rows),
    }


def _entity_profile(entity_type: str, row: dict) -> str:
    if entity_type == "person":
        return " ".join(
            str(part)
            for part in [
                row.get("name"),
                row.get("headline"),
                row.get("current_organization"),
                row.get("expert_type"),
                row.get("summary"),
                row.get("why_relevant"),
                ",".join(row.get("theme_ids") or []),
            ]
            if part
        )
    return " ".join(
        str(part)
        for part in [
            row.get("name"),
            row.get("category"),
            row.get("description"),
            row.get("why_interesting"),
            row.get("website"),
            ",".join(row.get("theme_ids") or []),
        ]
        if part
    )
