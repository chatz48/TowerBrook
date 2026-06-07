from __future__ import annotations

from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.schemas.domain import Citation, ToolTrace
from app.services.copilot.context import CopilotContext
from app.services.copilot.intent import RoutedIntent, route_intent
from app.services.copilot.models import CopilotSynthesis
from app.services.copilot.synthesis import synthesize_answer
from app.services.copilot.tools import run_pipeline


class CopilotState(TypedDict, total=False):
    ctx: CopilotContext
    tools_hint: list[str]
    routed: RoutedIntent
    citations: list[Citation]
    tool_calls: list[ToolTrace]
    synthesis: CopilotSynthesis
    answer: str
    structured: dict[str, Any]
    confidence: float
    intent: str
    model_used: str


async def _node_route(state: CopilotState) -> CopilotState:
    ctx = state["ctx"]
    routed = await route_intent(ctx, state.get("tools_hint"))
    return {
        "routed": routed,
        "intent": routed.intent,
        "model_used": routed.model,
    }


async def _node_research(state: CopilotState) -> CopilotState:
    routed = state["routed"]
    ctx = state["ctx"]
    query = routed.search_queries[0] if routed.search_queries else ctx.search_query()
    citations, tool_calls = await run_pipeline(routed.tools, ctx, query)
    return {"citations": citations, "tool_calls": tool_calls}


async def _node_synthesize(state: CopilotState) -> CopilotState:
    routed = state["routed"]
    ctx = state["ctx"]
    synthesis = await synthesize_answer(
        ctx,
        routed.intent,
        routed.model,
        state.get("citations") or [],
        state.get("tool_calls") or [],
    )
    structured = synthesis.model_dump()
    return {
        "synthesis": synthesis,
        "structured": structured,
        "answer": synthesis.answer_summary,
    }


async def _node_finalize(state: CopilotState) -> CopilotState:
    from app.services.copilot.tools import compute_confidence

    confidence = compute_confidence(state.get("citations") or [], state.get("tool_calls") or [])
    return {"confidence": confidence}


def _build_graph() -> Any:
    graph = StateGraph(CopilotState)
    graph.add_node("route", _node_route)
    graph.add_node("research", _node_research)
    graph.add_node("synthesize", _node_synthesize)
    graph.add_node("finalize", _node_finalize)
    graph.add_edge(START, "route")
    graph.add_edge("route", "research")
    graph.add_edge("research", "synthesize")
    graph.add_edge("synthesize", "finalize")
    graph.add_edge("finalize", END)
    return graph.compile()


# Per-intent compiled graphs share topology; intent-specific behaviour lives in route_intent.
_INTENT_GRAPHS: dict[str, Any] = {}


def get_intent_graph(intent: str) -> Any:
    """Return a LangGraph workflow for the routed intent (cached singleton per intent)."""
    if intent not in _INTENT_GRAPHS:
        _INTENT_GRAPHS[intent] = _build_graph()
    return _INTENT_GRAPHS[intent]


# Master orchestrator graph — entry point for all copilot requests.
_copilot_graph = _build_graph()


def get_copilot_graph() -> Any:
    return _copilot_graph
