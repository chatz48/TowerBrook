from app.schemas.domain import Citation
from app.services.deepseek_extractor import extractor


async def draft_email(person_name: str, purpose: str, citations: list[Citation]) -> dict:
    context = {
        "person_name": person_name,
        "purpose": purpose,
        "citations": [item.model_dump() for item in citations],
    }
    body = await extractor.synthesize(
        "Draft a short, professional outreach email. Do not overstate facts beyond the citations.",
        context,
    )
    return {
        "subject": f"Introductory conversation on {purpose}",
        "body": body,
        "citations": [item.model_dump() for item in citations],
    }
