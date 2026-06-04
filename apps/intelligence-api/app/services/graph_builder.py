from __future__ import annotations

from uuid import uuid4

from app.repositories.supabase_repo import repo
from app.schemas.domain import ExtractionResult, ResearchJob, SourceRecord
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

    relationship_counts: dict[tuple[str, str], int] = {}
    for relationship in extraction.relationships:
        for entity_type, name in (
            (relationship.from_type, relationship.from_name),
            (relationship.to_type, relationship.to_name),
        ):
            key = (entity_type, name.lower())
            relationship_counts[key] = relationship_counts.get(key, 0) + 1

    people_payloads = []
    for person in extraction.people:
        payload = person_payload(person)
        relevance, momentum = score_expert(
            payload,
            relationship_count=relationship_counts.get(("person", person.name.lower()), 0),
        )
        payload["relevance_score"] = relevance
        payload["momentum_score"] = momentum
        people_payloads.append(payload)

    company_payloads = []
    for company in extraction.companies:
        payload = company_payload(company)
        relevance, momentum = score_company(
            payload,
            expert_density=relationship_counts.get(("company", company.name.lower()), 0),
        )
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


async def persist_candidate_extraction(
    extraction: ExtractionResult,
    source: SourceRecord,
    chunks: list[str],
    chunk_embeddings: list[list[float]],
    theme_id: str | None,
    job: ResearchJob,
) -> dict:
    chunk_rows = [
        {
            "source_id": source.id,
            "content": chunk,
            "token_count": max(1, len(chunk.split())),
            "embedding": vector,
            "theme_ids": [theme_id] if theme_id else [],
            "metadata": {
                "source_title": source.title,
                "job_id": job.id,
                "job_type": job.job_type,
                "review_gated": True,
            },
        }
        for chunk, vector in zip(chunks, chunk_embeddings)
    ]
    repo.insert_chunks(chunk_rows)

    relationship_counts: dict[tuple[str, str], int] = {}
    for relationship in extraction.relationships:
        for entity_type, name in (
            (relationship.from_type, relationship.from_name),
            (relationship.to_type, relationship.to_name),
        ):
            key = (entity_type, name.casefold())
            relationship_counts[key] = relationship_counts.get(key, 0) + 1

    candidates: list[dict] = []
    for person in extraction.people:
        payload = person_payload(person)
        relevance, momentum = score_expert(
            payload,
            relationship_count=relationship_counts.get(("person", person.name.casefold()), 0),
        )
        payload.update(
            {
                "relevance_score": relevance,
                "momentum_score": momentum,
                "job_type": job.job_type,
                "job_metadata": job.metadata,
                "source": {
                    "id": source.id,
                    "title": source.title,
                    "url": source.url,
                    "publisher": source.publisher,
                },
            }
        )
        candidates.append(
            {
                "external_id": stable_external_id(
                    "candidate-person",
                    f"{person.name}:{source.url or source.id}",
                ),
                "candidate_type": "person",
                "name": person.name,
                "theme_ids": person.theme_ids or ([theme_id] if theme_id else []),
                "priority": relevance,
                "review_status": "needs_review",
                "source_ids": [source.id],
                "job_id": job.id,
                "payload": payload,
            }
        )

    for company in extraction.companies:
        payload = company_payload(company)
        relevance, momentum = score_company(
            payload,
            expert_density=relationship_counts.get(("company", company.name.casefold()), 0),
        )
        payload.update(
            {
                "relevance_score": relevance,
                "momentum_score": momentum,
                "job_type": job.job_type,
                "job_metadata": job.metadata,
                "source": {
                    "id": source.id,
                    "title": source.title,
                    "url": source.url,
                    "publisher": source.publisher,
                },
            }
        )
        candidates.append(
            {
                "external_id": stable_external_id(
                    "candidate-company",
                    f"{company.name}:{source.url or source.id}",
                ),
                "candidate_type": "company",
                "name": company.name,
                "theme_ids": company.theme_ids or ([theme_id] if theme_id else []),
                "priority": relevance,
                "review_status": "needs_review",
                "source_ids": [source.id],
                "job_id": job.id,
                "payload": payload,
            }
        )

    for relationship in extraction.relationships:
        candidates.append(
            {
                "external_id": stable_external_id(
                    "candidate-relationship",
                    (
                        f"{relationship.from_type}:{relationship.from_name}:"
                        f"{relationship.relationship_type}:"
                        f"{relationship.to_type}:{relationship.to_name}:"
                        f"{source.url or source.id}"
                    ),
                ),
                "candidate_type": "relationship",
                "name": (
                    f"{relationship.from_name} {relationship.relationship_type} "
                    f"{relationship.to_name}"
                ),
                "theme_ids": [relationship.theme_id or theme_id]
                if relationship.theme_id or theme_id
                else [],
                "priority": round(relationship.confidence * 100, 2),
                "review_status": "needs_review",
                "source_ids": [source.id],
                "job_id": job.id,
                "payload": {
                    **relationship.model_dump(),
                    "job_type": job.job_type,
                    "job_metadata": job.metadata,
                    "source_id": source.id,
                },
            }
        )

    saved_candidates = repo.upsert_discovery_candidates(candidates)
    match_candidates = []
    for candidate in saved_candidates:
        if candidate["candidate_type"] == "person":
            matches = repo.find_people_by_name(candidate["name"])
            candidate_org = str(candidate.get("payload", {}).get("current_organization") or "")
            for match in matches:
                match_org = str(match.get("current_organization") or "")
                organization_match = bool(
                    candidate_org
                    and match_org
                    and candidate_org.casefold() == match_org.casefold()
                )
                match_candidates.append(
                    {
                        "discovery_candidate_id": candidate["id"],
                        "canonical_entity_type": "person",
                        "canonical_entity_id": match["id"],
                        "match_method": "exact_name_and_organization"
                        if organization_match
                        else "exact_name",
                        "match_score": 0.98 if organization_match else 0.9,
                        "evidence": {
                            "candidate_name": candidate["name"],
                            "candidate_organization": candidate_org,
                            "canonical_name": match.get("name"),
                            "canonical_organization": match_org,
                            "source_id": source.id,
                        },
                        "review_status": "needs_review",
                    }
                )
        elif candidate["candidate_type"] == "company":
            for match in repo.find_companies_by_name(candidate["name"]):
                match_candidates.append(
                    {
                        "discovery_candidate_id": candidate["id"],
                        "canonical_entity_type": "company",
                        "canonical_entity_id": match["id"],
                        "match_method": "exact_name",
                        "match_score": 0.9,
                        "evidence": {
                            "candidate_name": candidate["name"],
                            "canonical_name": match.get("name"),
                            "source_id": source.id,
                        },
                        "review_status": "needs_review",
                    }
                )
    saved_matches = repo.upsert_entity_match_candidates(match_candidates)

    return {
        "people_candidates": sum(
            candidate["candidate_type"] == "person" for candidate in saved_candidates
        ),
        "company_candidates": sum(
            candidate["candidate_type"] == "company" for candidate in saved_candidates
        ),
        "relationship_candidates": sum(
            candidate["candidate_type"] == "relationship" for candidate in saved_candidates
        ),
        "entity_match_candidates": len(saved_matches),
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
