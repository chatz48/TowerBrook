from __future__ import annotations

import json
import logging
import time
from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

from app.repositories.supabase_repo import repo
from app.schemas.domain import ChatRequest, ChatResponse, Citation, ToolTrace
from app.services.copilot.context import parse_message
from app.services.copilot.graph import get_copilot_graph
from app.services.copilot.intent import VALID_INTENTS

logger = logging.getLogger("towerbrook.copilot")

PHASE_LABELS = {
    "route": "Routing intent with DeepSeek flash…",
    "research": "Running Keiro search and retrieval tools…",
    "synthesize": "Synthesising structured answer…",
    "finalize": "Finalising confidence scores…",
}


def _initial_state(request: ChatRequest) -> dict[str, Any]:
    ctx = parse_message(request.message, request.theme_id)
    return {
        "ctx": ctx,
        "tools_hint": list(request.tools) if request.tools else None,
        "citations": [],
        "tool_calls": [],
    }


def _build_response(
    session_id: str,
    final: dict[str, Any],
    *,
    request_id: str,
    node_timings_ms: dict[str, int],
) -> ChatResponse:
    citations: list[Citation] = final.get("citations") or []
    tool_calls: list[ToolTrace] = final.get("tool_calls") or []
    intent: str = final.get("intent") or "find_experts"
    structured = final.get("structured") or {}
    verification_warnings: list[str] = []
    if isinstance(structured, dict):
        notes = structured.get("uncertainty_notes")
        if isinstance(notes, str) and "Removed unverified" in notes:
            verification_warnings = [
                part.strip()
                for part in notes.split(";")
                if "Removed unverified" in part or "limited citation overlap" in part
            ]

    return ChatResponse(
        session_id=session_id,
        answer=final.get("answer") or "No synthesis produced.",
        citations=citations[:10],
        tool_calls=tool_calls,
        confidence=final.get("confidence") or 0.5,
        intent=intent if intent in VALID_INTENTS else "find_experts",
        model_used=final.get("model_used") or "deepseek-v4-flash",
        structured=structured,
        request_id=request_id,
        verification_warnings=verification_warnings,
        node_timings_ms=node_timings_ms,
    )


def _phase_payload(node: str, patch: dict[str, Any], elapsed_ms: int) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "phase": node,
        "label": PHASE_LABELS.get(node, node),
        "elapsed_ms": elapsed_ms,
    }
    if node == "route" and patch.get("intent"):
        payload["intent"] = patch["intent"]
        payload["model_used"] = patch.get("model_used")
    if node == "research" and patch.get("tool_calls"):
        tool_calls = patch["tool_calls"]
        payload["tools_completed"] = len(tool_calls)
        payload["citations_found"] = len(patch.get("citations") or [])
        for call in tool_calls:
            name = call.tool_name if isinstance(call, ToolTrace) else call.get("tool_name")
            output = call.output if isinstance(call, ToolTrace) else call.get("output", {})
            if name == "web_search" and output.get("keiro_live"):
                payload["keiro_live"] = True
                break
    return payload


async def run_copilot(request: ChatRequest, request_id: str | None = None) -> ChatResponse:
    rid = request_id or str(uuid4())
    session_id = request.session_id or str(uuid4())
    graph = get_copilot_graph()
    node_timings_ms: dict[str, int] = {}
    accumulated: dict[str, Any] = {}
    started = time.perf_counter()

    async for update in graph.astream(_initial_state(request), stream_mode="updates"):
        for node, patch in update.items():
            node_timings_ms[node] = int((time.perf_counter() - started) * 1000)
            accumulated.update(patch)

    response = _build_response(session_id, accumulated, request_id=rid, node_timings_ms=node_timings_ms)
    logger.info(
        "copilot_complete",
        extra={
            "request_id": rid,
            "intent": response.intent,
            "model": response.model_used,
            "tools": len(response.tool_calls),
            "citations": len(response.citations),
            "confidence": response.confidence,
            "timings_ms": node_timings_ms,
        },
    )
    _persist_chat(
        session_id,
        request.message,
        response.answer,
        response.citations,
        response.tool_calls,
        request.theme_id,
        response.intent or "find_experts",
        response.model_used or "deepseek-v4-flash",
        rid,
    )
    return response


async def run_copilot_stream(request: ChatRequest, request_id: str | None = None) -> AsyncIterator[str]:
    rid = request_id or str(uuid4())
    session_id = request.session_id or str(uuid4())
    graph = get_copilot_graph()
    accumulated: dict[str, Any] = {}
    node_timings_ms: dict[str, int] = {}
    started = time.perf_counter()

    yield _sse("started", {"session_id": session_id, "request_id": rid})

    try:
        async for update in graph.astream(_initial_state(request), stream_mode="updates"):
            for node, patch in update.items():
                elapsed = int((time.perf_counter() - started) * 1000)
                node_timings_ms[node] = elapsed
                accumulated.update(patch)
                yield _sse("phase", _phase_payload(node, patch, elapsed))
    except Exception as exc:
        logger.exception("Copilot stream failed", extra={"request_id": rid})
        yield _sse("error", {"message": str(exc), "request_id": rid})
        return

    response = _build_response(session_id, accumulated, request_id=rid, node_timings_ms=node_timings_ms)
    _persist_chat(
        session_id,
        request.message,
        response.answer,
        response.citations,
        response.tool_calls,
        request.theme_id,
        response.intent or "find_experts",
        response.model_used or "deepseek-v4-flash",
        rid,
    )
    yield _sse("complete", response.model_dump(mode="json"))


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


def _persist_chat(
    session_id: str,
    user_message: str,
    answer: str,
    citations: list[Citation],
    tool_calls: list[ToolTrace],
    theme_id: str | None,
    intent: str,
    model_used: str,
    request_id: str,
) -> None:
    if not repo.client:
        return
    try:
        repo.client.table("chat_sessions").upsert(
            {"id": session_id, "theme_id": theme_id, "title": user_message[:80]},
        ).execute()
        repo.client.table("chat_messages").insert(
            {"session_id": session_id, "role": "user", "content": user_message}
        ).execute()
        assistant_row = repo.client.table("chat_messages").insert(
            {
                "session_id": session_id,
                "role": "assistant",
                "content": answer,
                "citations": [citation.model_dump() for citation in citations],
                "metadata": {"intent": intent, "model_used": model_used, "request_id": request_id},
            }
        ).execute().data[0]
        for call in tool_calls:
            repo.client.table("tool_calls").insert(
                {
                    "session_id": session_id,
                    "message_id": assistant_row["id"],
                    "tool_name": call.tool_name,
                    "input": call.input,
                    "output": call.output,
                    "status": call.status,
                }
            ).execute()
    except Exception:
        logger.exception("Failed to persist chat session", extra={"request_id": request_id})
