import asyncio

from app.services.copilot.models import CopilotSynthesis
from app.services.copilot.synthesis import synthesize_answer
from app.services.copilot.context import CopilotContext
from app.schemas.domain import Citation, ToolTrace


def test_synthesis_fallback_does_not_leak_prompt():
    ctx = CopilotContext(
        question="Who should I call for PJM interconnection?",
        objective="Find experts",
        theme_id="grid-infrastructure",
    )
    citations = [
        Citation(
            title="PJM queue update",
            url="https://example.com/pjm",
            evidence="Interconnection backlog remains elevated across PJM.",
        )
    ]
    tool_calls = [
        ToolTrace(
            tool_name="web_search",
            input={"query": "PJM interconnection"},
            output={"count": 1, "provider": "fallback", "keiro_live": False},
            status="completed",
        )
    ]

    result = asyncio.run(
        synthesize_answer(ctx, "find_experts", "deepseek-v4-flash", citations, tool_calls)
    )

    assert isinstance(result, CopilotSynthesis)
    assert "JSON schema" not in result.answer_summary
    assert "TowerBrook's research copilot" not in result.answer_summary
    assert len(result.answer_summary) < 400
