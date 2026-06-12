from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.repositories.supabase_repo import repo
from app.schemas.domain import ResearchJob, ResearchJobRequest

router = APIRouter(prefix="/discovery", tags=["discovery"])


@router.post("/jobs", response_model=ResearchJob)
async def create_discovery_job(request: ResearchJobRequest):
    return repo.create_job(request)


@router.get("/jobs/{job_id}", response_model=ResearchJob)
async def get_discovery_job(job_id: str):
    job = repo.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Research job not found")
    return job


class CandidateReviewRequest(BaseModel):
    action: str = Field(pattern="^(approve|reject|merge)$")
    canonical_entity_id: str | None = None
    note: str | None = None


@router.get("/candidates")
async def list_discovery_candidates(review_status: str = "needs_review", limit: int = 50):
    return {
        "candidates": repo.list_discovery_candidates(
            review_status=review_status,
            limit=max(1, min(limit, 200)),
        )
    }


@router.post("/candidates/{candidate_id}/review")
async def review_discovery_candidate(candidate_id: str, request: CandidateReviewRequest):
    if request.action == "reject":
        reviewed = repo.review_discovery_candidate(
            candidate_id,
            "rejected",
            note=request.note or "Rejected through review workflow.",
        )
    elif request.action == "merge":
        if not request.canonical_entity_id:
            raise HTTPException(status_code=400, detail="canonical_entity_id is required for merge")
        reviewed = repo.promote_discovery_candidate(candidate_id, merge_entity_id=request.canonical_entity_id)
    else:
        reviewed = repo.promote_discovery_candidate(candidate_id)

    if not reviewed:
        raise HTTPException(status_code=404, detail="Discovery candidate not found")
    return {"candidate": reviewed}
