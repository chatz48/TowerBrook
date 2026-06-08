from __future__ import annotations

import json

from app.schemas.domain import Citation, ToolTrace
from app.services.copilot.claim_verification import verify_synthesis
from app.services.copilot.context import CopilotContext
from app.services.copilot.models import CopilotSynthesis
from app.services.copilot.prompts import INTENT_SYNTHESIS_PROMPTS, SYNTHESIS_BASE
from app.services.deepseek_extractor import extractor
from app.services.deepseek_llm import llm


def _trim_synthesis(synthesis: CopilotSynthesis) -> CopilotSynthesis:
    summary = synthesis.answer_summary.strip()
    if len(summary) > 420:
        summary = f"{summary[:417].rstrip()}..."
    return CopilotSynthesis(
        answer_summary=summary,
        key_findings=synthesis.key_findings[:2],
        gaps=synthesis.gaps[:2],
        risks=synthesis.risks[:1],
        follow_ups=synthesis.follow_ups[:3],
        uncertainty_notes=synthesis.uncertainty_notes[:200].strip(),
    )


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
                max_tokens=900 if model.endswith("pro") else 600,
            )
        except Exception:
            synthesis = None

    if synthesis is None:
        prose = await extractor.synthesize(
            f"{SYNTHESIS_BASE}\n\n{instruction}",
            user_payload,
        )
        synthesis = CopilotSynthesis(
            answer_summary=prose[:420],
            key_findings=[],
            gaps=[],
            risks=[],
            follow_ups=[],
            uncertainty_notes="Fallback synthesis path used.",
        )

    synthesis = _trim_synthesis(synthesis)
    verified, warnings = verify_synthesis(synthesis, citations)
    if warnings:
        verified.uncertainty_notes = (
            f"{verified.uncertainty_notes} {'; '.join(warnings[:3])}".strip()
        )
    return _trim_synthesis(verified)
