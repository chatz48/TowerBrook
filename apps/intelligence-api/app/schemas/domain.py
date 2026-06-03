from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


ThemeId = Literal["clean-energy-advisory", "grid-infrastructure", "smart-water"]


class Citation(BaseModel):
    source_id: str | None = None
    title: str
    url: str | None = None
    evidence: str


class SourceInput(BaseModel):
    url: str | None = None
    title: str | None = None
    text: str | None = None
    source_type: str = "user_upload"
    theme_id: ThemeId | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SourceRecord(BaseModel):
    id: str
    title: str
    url: str | None = None
    publisher: str | None = None
    source_type: str = "submitted"
    raw_text: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ExtractedPerson(BaseModel):
    name: str
    headline: str | None = None
    current_organization: str | None = None
    expert_type: str = "operator"
    theme_ids: list[str] = Field(default_factory=list)
    linkedin_url: str | None = None
    website: str | None = None
    summary: str | None = None
    why_relevant: str | None = None
    confidence: float = 0.7


class ExtractedCompany(BaseModel):
    name: str
    category: str = "target"
    theme_ids: list[str] = Field(default_factory=list)
    website: str | None = None
    hq: str | None = None
    description: str | None = None
    why_interesting: str | None = None
    confidence: float = 0.7


class ExtractedRelationship(BaseModel):
    from_name: str
    from_type: Literal["person", "company", "organization", "deal", "event", "theme"]
    to_name: str
    to_type: Literal["person", "company", "organization", "deal", "event", "theme"]
    relationship_type: str
    theme_id: ThemeId | None = None
    evidence_text: str
    confidence: float = 0.7


class ExtractedFact(BaseModel):
    subject_name: str
    subject_type: Literal["person", "company", "organization", "deal", "event", "theme", "relationship"]
    fact_type: str
    fact_value: str
    evidence_text: str
    theme_id: ThemeId | None = None
    confidence: float = 0.7


class ExtractionResult(BaseModel):
    people: list[ExtractedPerson] = Field(default_factory=list)
    companies: list[ExtractedCompany] = Field(default_factory=list)
    relationships: list[ExtractedRelationship] = Field(default_factory=list)
    facts: list[ExtractedFact] = Field(default_factory=list)
    citations: list[Citation] = Field(default_factory=list)


class ResearchJobRequest(BaseModel):
    job_type: str = "deep_discovery"
    theme_id: ThemeId | None = None
    query: str | None = None
    target_type: str | None = None
    target_id: UUID | None = None
    priority: int = 50
    metadata: dict[str, Any] = Field(default_factory=dict)


class ResearchJob(BaseModel):
    id: str
    job_type: str
    status: str
    theme_id: str | None = None
    query: str | None = None
    progress_completed: int = 0
    progress_total: int = 0
    sources_found: int = 0
    entities_created: int = 0
    relationships_created: int = 0
    error: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    theme_id: ThemeId | None = None
    context_type: str | None = None
    context_id: str | None = None
    tools: list[str] = Field(default_factory=list)


class ToolTrace(BaseModel):
    tool_name: str
    input: dict[str, Any]
    output: dict[str, Any]
    status: str = "completed"


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    tool_calls: list[ToolTrace] = Field(default_factory=list)
    confidence: float = 0.7


class ReportRequest(BaseModel):
    report_type: str
    title: str | None = None
    theme_id: ThemeId | None = None
    subject_type: str | None = None
    subject_id: str | None = None
    prompt: str | None = None


class ReportResponse(BaseModel):
    id: str | None = None
    title: str
    markdown: str
    citations: list[Citation] = Field(default_factory=list)
    confidence: float = 0.7


class LinkedinSearchRequest(BaseModel):
    name: str
    company: str | None = None
    role: str | None = None


class LinkedinLink(BaseModel):
    name: str
    profile_url: HttpUrl
    confidence: float
    search_query: str
    source_url: str | None = None
