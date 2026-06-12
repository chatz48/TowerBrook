from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.repositories.supabase_repo import repo
from app.schemas.domain import ResearchJobRequest, SourceInput
from app.services.chunker import chunk_text
from app.services.deepseek_extractor import extractor
from app.services.embeddings_bge import embeddings
from app.services.graph_builder import persist_candidate_extraction
from app.services.keiro_search import keiro
from app.services.parser import parse_upload

router = APIRouter(prefix="/ingest", tags=["ingest"])
MAX_INGEST_TEXT_CHARS = 50_000


def _validate_source_text(source_text: str | None) -> str:
    text = source_text or ""
    if len(text) > MAX_INGEST_TEXT_CHARS:
        raise HTTPException(
            status_code=413,
            detail=(
                "Submitted source text is too long. Keep uploads under 50,000 "
                "characters and split larger source packs into separate submissions."
            ),
        )
    return text


async def _ingest_validated_source(
    *,
    url: str | None,
    title: str | None,
    source_text: str,
    theme_id: str | None,
    source_type: str,
    metadata: dict,
) -> dict:
    source = repo.upsert_source(
        {
            "url": url,
            "title": title or url or "Submitted source",
            "source_type": source_type,
            "raw_text": source_text,
            "metadata": metadata,
        }
    )
    chunks = chunk_text(source_text)
    vectors = embeddings.embed_many(chunks)
    extraction = await extractor.extract(
        source_text,
        source.title,
        str(source.url) if source.url else None,
        theme_id,
    )
    job = repo.create_job(
        ResearchJobRequest(
            job_type="ingest_source",
            theme_id=theme_id,
            query=source.title,
            metadata={"source_id": source.id, "review_gated": True},
        )
    )
    persisted = await persist_candidate_extraction(extraction, source, chunks, vectors, theme_id, job)
    persisted_summary = {
        **persisted,
        "people_created": persisted.get("people_candidates", 0),
        "companies_created": persisted.get("company_candidates", 0),
        "relationships_created": persisted.get("relationship_candidates", 0),
        "facts_created": persisted.get("fact_candidates", 0),
    }
    return {
        "source": source.model_dump(mode="json"),
        "extraction": extraction.model_dump(mode="json"),
        "persisted": persisted_summary,
        "mutation": repo.enabled,
        "review_gated": True,
        "ingest_meta": {
            "source_text_chars": len(source_text),
            "chunks_created": len(chunks),
            "embedding_mode": "semantic" if embeddings.semantic_search_available else "hash",
        },
    }


@router.post("/source")
async def ingest_source(
    url: str | None = Form(default=None),
    title: str | None = Form(default=None),
    text: str | None = Form(default=None),
    theme_id: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
):
    uploaded_text, uploaded_title = await parse_upload(file, text)
    source_text = uploaded_text
    fetched = None
    if url and not source_text:
        fetched = await keiro.fetch_content(url)
        source_text = fetched.get("content", "")
        title = title or fetched.get("title")
        if not source_text.strip():
            raise HTTPException(
                status_code=422,
                detail=(
                    "Could not fetch readable content from the supplied URL. "
                    "Paste the article text directly or try a different source link."
                ),
            )
    source_text = _validate_source_text(source_text)

    return await _ingest_validated_source(
        url=url,
        title=title or uploaded_title or (fetched or {}).get("title"),
        source_text=source_text,
        theme_id=theme_id,
        source_type="user_upload" if file or text else "url",
        metadata={"theme_id": theme_id, "upload_filename": uploaded_title},
    )


@router.post("/json")
async def ingest_json(body: SourceInput):
    source_text = _validate_source_text(body.text)
    return await _ingest_validated_source(
        url=body.url,
        title=body.title,
        source_text=source_text,
        theme_id=body.theme_id,
        source_type=body.source_type,
        metadata={"theme_id": body.theme_id, **body.metadata},
    )
