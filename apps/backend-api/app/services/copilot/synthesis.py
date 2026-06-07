from __future__ import annotations

import json

from app.schemas.domain import Citation, ToolTrace
from app.services.copilot.claim_verification import verify_synthesis
from app.services.copilot.context import CopilotContext
from app.services.copilot.models import CopilotSynthesis
from app.services.copilot.prompts import INTENT_SYNTHESIS_PROMPTS, SYNTHESIS_BASE
from app.services.deepseek_extractor import extractor
from app.services.deepseek_llm import llm


async def synthesize_answer(
    ctx: CopilotContext,
    intent: str,
    model: str,
    citations: list[Citation],
    tool_calls: list[ToolTrace],
) -> CopilotSynthesis:
    instruction = INTENT_SYNTHESIS_PROMPTS.get(intent, INTENT_SYNTHESIS_PROMPTS["find_experts"])
    user_payload = {
        "context": ctx.to_prompt_block(),
        "intent": intent,
        "citations": [c.model_dump(mode="json") for c in citations[:10]],
        "tool_trace": [t.model_dump(mode="json") for t in tool_calls],
    }
    user_json = json.dumps(user_payload, ensure_ascii=False)

    synthesis: CopilotSynthesis | None = None
    if llm.configured:
        try:
            synthesis = await llm.structured(
                f"{SYNTHESIS_BASE}\n\n{instruction}",
                user_json,
                CopilotSynthesis,
                model=model,
                max_tokens=1800 if model.endswith("pro") else 1200,
            )
        except Exception:
            synthesis = None

    if synthesis is None:
        prose = await extractor.synthesize(
            f"{SYNTHESIS_BASE}\n\n{instruction}",
            user_payload,
        )
        synthesis = CopilotSynthesis(
            answer_summary=prose[:1200],
            key_findings=[],
            gaps=["Model structured synthesis unavailable — review citations directly."],
            risks=[],
            follow_ups=[],
            uncertainty_notes="Fallback synthesis path used.",
        )

    verified, warnings = verify_synthesis(synthesis, citations)
    if warnings:
        verified.uncertainty_notes = (
            f"{verified.uncertainty_notes} {'; '.join(warnings[:3])}".strip()
        )
    return verified
