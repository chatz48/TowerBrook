from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.schemas.domain import ChatRequest, ChatResponse
from app.services.copilot.orchestrator import run_copilot, run_copilot_stream

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """LangGraph copilot: intent router → Keiro/DeepSeek workflow → structured synthesis."""
    return await run_copilot(request)


@router.post("/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    """SSE stream with per-node phase updates, then final ChatResponse."""

    async def event_generator():
        async for chunk in run_copilot_stream(request):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
