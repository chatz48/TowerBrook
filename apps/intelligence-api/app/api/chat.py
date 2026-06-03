from uuid import uuid4

from fastapi import APIRouter

from app.repositories.supabase_repo import repo
from app.schemas.domain import ChatRequest, ChatResponse, Citation, ToolTrace
from app.services.deepseek_extractor import extractor
from app.services.email_drafter import draft_email
from app.services.embeddings_bge import embeddings
from app.services.keiro_search import keiro
from app.schemas.domain import ReportRequest, ResearchJobRequest
from app.services.report_generator import generate_report

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    session_id = request.session_id or str(uuid4())
    tool_calls: list[ToolTrace] = []
    citations: list[Citation] = []
    requested = set(request.tools) or _infer_tools(request.message)

    if "rag_search_sources" in requested:
        vector = embeddings.embed(request.message)
        rows = repo.search_sources(vector, request.theme_id, limit=6)
        citations.extend(
            Citation(
                source_id=str(row.get("source_id")),
                title=row.get("title") or "Source chunk",
                url=row.get("url"),
                evidence=row.get("content") or "",
            )
            for row in rows
        )
        tool_calls.append(
            ToolTrace(
                tool_name="rag_search_sources",
                input={"theme_id": request.theme_id},
                output={"count": len(rows)},
            )
        )

    if "rag_search_entities" in requested:
        rows = repo.search_entities(embeddings.embed(request.message), None, limit=6)
        tool_calls.append(
            ToolTrace(
                tool_name="rag_search_entities",
                input={},
                output={"count": len(rows), "entities": rows},
            )
        )

    if "web_search" in requested:
        results = await keiro.search(request.message, limit=5)
        citations.extend(
            Citation(title=item["title"], url=item.get("url"), evidence=item.get("snippet") or "")
            for item in results
        )
        tool_calls.append(
            ToolTrace(tool_name="web_search", input={"query": request.message}, output={"count": len(results)})
        )

    if "fetch_source" in requested:
        url = _first_url(request.message)
        fetched = await keiro.fetch_content(url) if url else {"error": "No URL found in message"}
        if fetched.get("content"):
            citations.append(
                Citation(
                    title=fetched.get("title") or url or "Fetched source",
                    url=url,
                    evidence=fetched.get("content", "")[:500],
                )
            )
        tool_calls.append(ToolTrace(tool_name="fetch_source", input={"url": url}, output=fetched))

    if "graph_query" in requested:
        rows = repo.search_entities(embeddings.embed(request.message), None, limit=10)
        tool_calls.append(ToolTrace(tool_name="graph_query", input={"query": request.message}, output={"entities": rows}))

    if "generate_report" in requested:
        report = await generate_report(
            ReportRequest(report_type="custom", title="Research Copilot Report", theme_id=request.theme_id, prompt=request.message),
            citations,
        )
        tool_calls.append(ToolTrace(tool_name="generate_report", input={"prompt": request.message}, output=report.model_dump()))

    if "run_deep_discovery" in requested:
        job = repo.create_job(
            ResearchJobRequest(job_type="deep_discovery", theme_id=request.theme_id, query=request.message)
        )
        tool_calls.append(ToolTrace(tool_name="run_deep_discovery", input={"theme_id": request.theme_id}, output=job.model_dump()))

    if "linkedin_link_search" in requested:
        links = await keiro.linkedin_links(request.message, None, None)
        tool_calls.append(
            ToolTrace(tool_name="linkedin_link_search", input={"query": request.message}, output={"links": links})
        )

    if "draft_email" in requested:
        email = await draft_email(request.message, "expert diligence", citations)
        tool_calls.append(ToolTrace(tool_name="draft_email", input={"message": request.message}, output=email))

    context = {
        "message": request.message,
        "theme_id": request.theme_id,
        "citations": [citation.model_dump() for citation in citations],
        "tool_calls": [call.model_dump() for call in tool_calls],
    }
    answer = await extractor.synthesize(
        "Answer as a concise TowerBrook research copilot. Cite evidence and label uncertainty.",
        context,
    )
    _persist_chat(session_id, request.message, answer, citations, tool_calls, request.theme_id)
    return ChatResponse(
        session_id=session_id,
        answer=answer,
        citations=citations[:10],
        tool_calls=tool_calls,
        confidence=0.78 if citations else 0.52,
    )


def _infer_tools(message: str) -> set[str]:
    lower = message.lower()
    tools = {"rag_search_sources", "rag_search_entities"}
    if "web" in lower or "search" in lower or "find more" in lower:
        tools.add("web_search")
    if "linkedin" in lower:
        tools.add("linkedin_link_search")
    if "email" in lower or "outreach" in lower:
        tools.add("draft_email")
    if "report" in lower or "memo" in lower:
        tools.add("generate_report")
    if "dig deeper" in lower or "deep discovery" in lower or "find more" in lower:
        tools.add("run_deep_discovery")
    if "http://" in lower or "https://" in lower:
        tools.add("fetch_source")
    if "connection" in lower or "path" in lower or "graph" in lower:
        tools.add("graph_query")
    return tools


def _first_url(text: str) -> str | None:
    for part in text.split():
        if part.startswith("http://") or part.startswith("https://"):
            return part.rstrip(").,;")
    return None


def _persist_chat(
    session_id: str,
    user_message: str,
    answer: str,
    citations: list[Citation],
    tool_calls: list[ToolTrace],
    theme_id: str | None,
) -> None:
    if not repo.client:
        return
    repo.client.table("chat_sessions").upsert(
        {"id": session_id, "theme_id": theme_id, "title": user_message[:80]},
    ).execute()
    user_row = repo.client.table("chat_messages").insert(
        {"session_id": session_id, "role": "user", "content": user_message}
    ).execute().data[0]
    assistant_row = repo.client.table("chat_messages").insert(
        {
            "session_id": session_id,
            "role": "assistant",
            "content": answer,
            "citations": [citation.model_dump() for citation in citations],
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
