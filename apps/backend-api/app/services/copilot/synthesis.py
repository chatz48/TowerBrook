from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.domain import Citation, ToolTrace
from app.services.copilot.context import CopilotContext
from app.services.copilot.prompts import INTENT_SYNTHESIS_PROMPTS, SYNTHESIS_BASE
from app.services.deepseek_extractor import extractor
from app.services.deepseek_llm import llm


class CopilotSynthesis(BaseModel):
    answer_summary: str
    key_findings: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    follow_ups: list[str] = Field(default_factory=list)
    uncertainty_notes: str = ""


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
        "citations": [c.model_dump() for c in citations[:10]],
        "tool_trace": [t.model_dump() for t in tool_calls],
    }

    if llm.configured:
        try:
            return await llm.structured(
                f"{SYNTHESIS_BASE}\n\n{instruction}",
                str(user_payload),
                CopilotSynthesis,
                model=model,
                max_tokens=1800 if model.endswith("pro") else 1200,
            )
        except Exception:
            pass

    # Fallback: legacy extractor synthesize → wrap in structured shape.
    prose = await extractor.synthesize(
        f"{SYNTHESIS_BASE}\n\n{instruction}",
        user_payload,
    )
    return CopilotSynthesis(
        answer_summary=prose[:1200],
        key_findings=[],
        gaps=["Model structured synthesis unavailable — review citations directly."],
        risks=[],
        follow_ups=[],
        uncertainty_notes="Fallback synthesis path used.",
    )
