from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.repositories.supabase_repo import repo
from app.schemas.domain import SourceInput
from app.services.chunker import chunk_text
from app.services.deepseek_extractor import extractor
from app.services.embeddings_bge import embeddings
from app.services.graph_builder import persist_extraction
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
    source_text = _validate_source_text(source_text)

    source = repo.upsert_source(
        {
            "url": url,
            "title": title or uploaded_title or (fetched or {}).get("title") or "Submitted source",
            "source_type": "user_upload" if file or text else "url",
            "raw_text": source_text,
            "metadata": {"theme_id": theme_id, "upload_filename": uploaded_title},
        }
    )
    chunks = chunk_text(source_text)
    vectors = embeddings.embed_many(chunks)
    extraction = await extractor.extract(source_text, source.title, source.url, theme_id)
    persisted = await persist_extraction(extraction, source, chunks, vectors, theme_id)
    return {
        "source": source.model_dump(),
        "extraction": extraction.model_dump(),
        "persisted": persisted,
        "mutation": repo.enabled,
    }


@router.post("/json")
async def ingest_json(body: SourceInput):
    source_text = _validate_source_text(body.text)
    source = repo.upsert_source(
        {
            "url": body.url,
            "title": body.title or body.url or "Submitted source",
            "source_type": body.source_type,
            "raw_text": source_text,
            "metadata": {"theme_id": body.theme_id, **body.metadata},
        }
    )
    chunks = chunk_text(source_text)
    vectors = embeddings.embed_many(chunks)
    extraction = await extractor.extract(source_text, source.title, source.url, body.theme_id)
    persisted = await persist_extraction(extraction, source, chunks, vectors, body.theme_id)
    return {"source": source.model_dump(), "extraction": extraction.model_dump(), "persisted": persisted}
