import asyncio

from app.repositories.supabase_repo import repo
from app.schemas.domain import ExtractionResult, ResearchJob, SourceRecord
from app.services.copilot.tools import resolve_tools
from app.services.copilot.context import CopilotContext, parse_message
from app.services.copilot.tools import run_tool
from app.services.graph_builder import persist_candidate_extraction
from app.schemas.domain import ExtractedPerson


def test_hybrid_search_sources_uses_memory_text_rank():
    repo.memory_sources.clear()
    repo.memory_source_chunks.clear()
    source = repo.upsert_source(
        {
            "title": "Grid advisor source",
            "raw_text": "Jane Founder advised New Grid Co on interconnection strategy.",
            "metadata": {"theme_id": "grid-infrastructure"},
        }
    )
    repo.insert_chunks(
        [
            {
                "source_id": source.id,
                "content": "Jane Founder advised New Grid Co on interconnection strategy.",
                "theme_ids": ["grid-infrastructure"],
                "metadata": {"source_title": "Grid advisor source"},
            }
        ]
    )

    rows = repo.hybrid_search_sources(
        "Jane Founder interconnection",
        [0.0] * 384,
        "grid-infrastructure",
    )

    assert rows
    assert rows[0]["title"] == "Grid advisor source"
    assert rows[0]["text_rank"] > 0


def test_source_upsert_reuses_content_hash_and_preserves_cache():
    repo.memory_sources.clear()
    first = repo.upsert_source(
        {
            "title": "First title",
            "raw_text": "Same source body",
            "metadata": {"a": 1},
        }
    )
    repo.cache_extraction(first.id, "hash-1", {"people": [], "companies": []})

    second = repo.upsert_source(
        {
            "title": "Second title",
            "raw_text": "Same source body",
            "metadata": {"b": 2},
        }
    )

    assert second.id == first.id
    assert repo.get_cached_extraction(second.id, "hash-1") == {"people": [], "companies": []}
    assert repo.memory_sources[second.id]["metadata"]["a"] == 1
    assert repo.memory_sources[second.id]["metadata"]["b"] == 2


def test_candidate_review_promotes_and_rejects_memory_candidate():
    repo.memory_discovery_candidates.clear()
    repo.memory_people.clear()
    saved = repo.upsert_discovery_candidates(
        [
            {
                "external_id": "candidate-person:jane-founder",
                "candidate_type": "person",
                "name": "Jane Founder",
                "theme_ids": ["grid-infrastructure"],
                "priority": 95,
                "review_status": "needs_review",
                "source_ids": [],
                "payload": {
                    "external_id": "person:jane-founder",
                    "name": "Jane Founder",
                    "current_organization": "New Grid Co",
                    "theme_ids": ["grid-infrastructure"],
                },
            }
        ]
    )

    promoted = repo.promote_discovery_candidate(saved[0]["id"])

    assert promoted is not None
    assert promoted["review_status"] == "approved"
    assert promoted["canonical_entity_type"] == "person"
    assert promoted["canonical_entity_id"]
    assert any(person["name"] == "Jane Founder" for person in repo.memory_people.values())

    rejected = repo.review_discovery_candidate(saved[0]["id"], "rejected", note="bad source")
    assert rejected is not None
    assert rejected["review_status"] == "rejected"
    assert rejected["payload"]["review_note"] == "bad source"


def test_identity_resolution_match_scores_linkedin_exact():
    repo.memory_discovery_candidates.clear()
    repo.memory_entity_match_candidates.clear()
    repo.memory_people.clear()
    repo.memory_people["person-1"] = {
        "id": "person-1",
        "name": "Jane Founder",
        "current_organization": "New Grid Co",
        "linkedin_url": "https://www.linkedin.com/in/jane-founder",
    }
    extraction = ExtractionResult(
        people=[
            ExtractedPerson(
                name="Jane Founder",
                current_organization="New Grid Co",
                linkedin_url="https://www.linkedin.com/in/jane-founder",
                theme_ids=["grid-infrastructure"],
            )
        ]
    )

    result = asyncio.run(
        persist_candidate_extraction(
            extraction,
            SourceRecord(id="source-1", title="Profile", url="https://example.com/profile"),
            ["Jane Founder profile"],
            [[0.0] * 384],
            "grid-infrastructure",
            ResearchJob(id="job-1", job_type="identity_resolution", status="running"),
        )
    )

    assert result["entity_match_candidates"] == 1
    match = next(iter(repo.memory_entity_match_candidates.values()))
    assert match["match_method"] == "linkedin_exact"
    assert match["match_score"] == 0.995


def test_relationship_tool_is_in_default_expert_pipeline():
    ctx = CopilotContext(question="Who should we call about New Grid Co?", theme_id="grid-infrastructure")
    tools = resolve_tools("find_experts", ctx)
    assert "rag_search_relationships" in tools


def test_retrieval_options_parse_with_hybrid_default():
    ctx = parse_message('{"question":"Find experts","retrieval_options":{"reranking":true}}')

    assert ctx.retrieval_options == {
        "baseline": False,
        "hybrid": True,
        "reranking": True,
    }


def test_baseline_retrieval_option_skips_backend_tools():
    ctx = CopilotContext(
        question="Find experts",
        retrieval_options={"baseline": True, "hybrid": True, "reranking": False},
    )

    assert resolve_tools("find_experts", ctx) == []


def test_source_tool_respects_vector_only_and_reranking(monkeypatch):
    from app.services.copilot import tools as copilot_tools

    monkeypatch.setattr(copilot_tools.embeddings, "semantic_search_available", True)
    monkeypatch.setattr(copilot_tools.embeddings, "embed", lambda _query: [0.0] * 384)
    monkeypatch.setattr(
        copilot_tools.repo,
        "search_sources",
        lambda *_args, **_kwargs: [
            {
                "source_id": "s-low",
                "title": "Generic source",
                "url": None,
                "content": "Generic market note",
                "similarity": 0.99,
            },
            {
                "source_id": "s-high",
                "title": "Jane Founder source",
                "url": None,
                "content": "Jane Founder interconnection specialist",
                "similarity": 0.2,
            },
        ],
    )

    citations = []
    trace = asyncio.run(
        run_tool(
            "rag_search_sources",
            CopilotContext(
                question="Jane Founder interconnection",
                retrieval_options={"baseline": False, "hybrid": False, "reranking": True},
            ),
            citations,
            "Jane Founder interconnection",
        )
    )

    assert trace.output["mode"] == "vector_only"
    assert trace.output["reranked"] is True
    assert citations[0].source_id == "s-high"
