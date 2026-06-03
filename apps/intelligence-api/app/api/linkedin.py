from fastapi import APIRouter

from app.repositories.supabase_repo import repo
from app.schemas.domain import LinkedinLink, LinkedinSearchRequest
from app.services.keiro_search import keiro

router = APIRouter(prefix="/linkedin", tags=["linkedin"])


@router.post("/search", response_model=list[LinkedinLink])
async def search_linkedin_links(request: LinkedinSearchRequest):
    links = await keiro.linkedin_links(request.name, request.company, request.role)
    if repo.client and links:
        repo.client.table("linkedin_profile_links").upsert(links, on_conflict="profile_url").execute()
    return links
