from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import chat, discovery, ingest, jobs, linkedin, reports
from app.config import get_settings
from app.repositories.supabase_repo import repo
from app.services.embeddings_bge import embeddings

app = FastAPI(title="TowerBrook Backend API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(discovery.router)
app.include_router(ingest.router)
app.include_router(jobs.router)
app.include_router(linkedin.router)
app.include_router(reports.router)


@app.middleware("http")
async def require_api_token(request: Request, call_next):
    settings = get_settings()
    is_public = request.url.path == "/health" or (
        request.url.path == "/jobs/process-next" and request.method == "GET"
    )
    if (
        settings.backend_api_token
        and not is_public
        and request.method != "OPTIONS"
        and request.headers.get("authorization")
        != f"Bearer {settings.backend_api_token}"
    ):
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return await call_next(request)


@app.get("/health")
async def health():
    settings = get_settings()
    return {
        "ok": True,
        "supabase": repo.health(),
        "deepseek_configured": bool(settings.deepseek_api_key),
        "keirolabs_configured": bool(settings.keirolabs_api_key),
        "embedding_model": embeddings.model_name,
        "embedding_dimensions": embeddings.dimensions,
    }
