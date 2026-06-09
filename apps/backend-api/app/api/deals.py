from fastapi import APIRouter

from app.services.deal_enrichment import run_deal_enrichment

router = APIRouter(prefix="/deals", tags=["deals"])


@router.post("/{external_deal_id}/enrich")
async def enrich_deal(external_deal_id: str):
    return await run_deal_enrichment(external_deal_id)
