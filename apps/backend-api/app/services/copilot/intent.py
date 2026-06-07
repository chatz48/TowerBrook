from __future__ import annotations

import logging
from dataclasses import dataclass

from app.services.copilot.context import CopilotContext
from app.services.copilot.prompts import INTENT_ROUTER_SYSTEM
from app.services.copilot.tools import INTENT_TOOL_PIPELINES
from app.services.deepseek_llm import FLASH_MODEL, PRO_MODEL, llm

logger = logging.getLogger("towerbrook.copilot.intent")

VALID_INTENTS = frozenset(INTENT_TOOL_PIPELINES.keys())


@dataclass
class RoutedIntent:
    intent: str
    complexity: str
    model: str
    tools: list[str]
    search_queries: list[str]
    reasoning: str


def _heuristic_route(ctx: CopilotContext) -> RoutedIntent:
    q = ctx.question.lower()
    if any(k in q for k in ("red team", "red-team", "disconfirm", "bear case")):
        intent = "red_team"
    elif any(k in q for k in ("memo", "report")):
        intent = "generate_report"
    elif any(k in q for k in ("email", "outreach")):
        intent = "draft_outreach"
    elif any(k in q for k in ("dig deeper", "deep discovery", "find more")):
        intent = "deep_discovery"
    elif "http://" in q or "https://" in q:
        intent = "source_analysis"
    elif any(k in q for k in ("company", "companies", "target")):
        intent = "map_companies"
    elif any(k in q for k in ("call plan", "sequence", "three-call")):
        intent = "build_call_plan"
    elif any(k in q for k in ("market", "buyer", "sector trend")):
        intent = "market_research"
    else:
        intent = "find_experts"
    complexity = "high" if intent in {"red_team", "generate_report", "market_research"} else "low"
    model = PRO_MODEL if complexity == "high" else FLASH_MODEL
    return RoutedIntent(
        intent=intent,
        complexity=complexity,
        model=model,
        tools=INTENT_TOOL_PIPELINES[intent],
        search_queries=[ctx.search_query()],
        reasoning="Heuristic intent routing (DeepSeek unavailable).",
    )


async def route_intent(ctx: CopilotContext, tools_hint: list[str] | None = None) -> RoutedIntent:
    if tools_hint:
        intent = _intent_from_tools(tools_hint)
        complexity = "high" if intent in {"red_team", "generate_report"} else "low"
        return RoutedIntent(
            intent=intent,
            complexity=complexity,
            model=PRO_MODEL if complexity == "high" else FLASH_MODEL,
            tools=list(dict.fromkeys(tools_hint)),
            search_queries=[ctx.search_query()],
            reasoning="Explicit tools hint from client.",
        )

    if not llm.configured:
        return _heuristic_route(ctx)

    try:
        parsed = await llm.parse_json(
            INTENT_ROUTER_SYSTEM,
            ctx.to_prompt_block(),
            model=FLASH_MODEL,
        )
        intent = str(parsed.get("intent") or "find_experts")
        if intent not in VALID_INTENTS:
            intent = "find_experts"
        complexity = str(parsed.get("complexity") or "low")
        if complexity not in {"low", "high"}:
            complexity = "high" if intent in {"red_team", "generate_report", "market_research"} else "low"
        queries = parsed.get("search_queries")
        search_queries = [str(q) for q in queries[:2]] if isinstance(queries, list) and queries else [ctx.search_query()]
        model = PRO_MODEL if complexity == "high" else FLASH_MODEL
        return RoutedIntent(
            intent=intent,
            complexity=complexity,
            model=model,
            tools=INTENT_TOOL_PIPELINES[intent],
            search_queries=search_queries,
            reasoning=str(parsed.get("reasoning") or ""),
        )
    except Exception:
        logger.exception("Intent routing failed; using heuristic fallback")
        return _heuristic_route(ctx)


def _intent_from_tools(tools: list[str]) -> str:
    if "generate_report" in tools:
        return "generate_report"
    if "draft_email" in tools:
        return "draft_outreach"
    if "run_deep_discovery" in tools:
        return "deep_discovery"
    if "fetch_source" in tools:
        return "source_analysis"
    return "find_experts"
