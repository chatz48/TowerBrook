from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.config import get_settings
from app.schemas.domain import (
    Citation,
    ExtractedCompany,
    ExtractedFact,
    ExtractedPerson,
    ExtractedRelationship,
    ExtractionResult,
)


SYSTEM_PROMPT = """You extract private-equity people intelligence.
Experts are the primary output. Deals and companies are evidence and graph anchors.

Prioritize every named person with a source-grounded role, especially:
- founders, former founders, management, operators, board members and alumni;
- private-equity and infrastructure-fund dealmakers;
- named bankers, lawyers, lenders, diligence professionals and service providers.

For each person, classify expert_type and explain why the person matters to the supplied theme.
Create typed person-to-company and person-to-deal relationships using exact roles such as
founded, led, invested_in, advised_on, banked, legal_counsel, diligence_provider or board_member.
Extract companies that become interesting through those expert relationships.

Return strict JSON with keys: people, companies, relationships, facts, citations.
Do not return arrays of strings. Every item must be an object matching the key names in the request.
Only extract facts grounded in the supplied text. Do not invent URLs, dates, people or companies."""


class DeepSeekExtractor:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def extract(
        self,
        text: str,
        title: str | None,
        url: str | None,
        theme_id: str | None,
        objective: str | None = None,
        target_context: dict[str, Any] | None = None,
    ) -> ExtractionResult:
        if not self.settings.deepseek_api_key:
            return self._heuristic_extract(text, title, url, theme_id)

        prompt = {
            "theme_id": theme_id,
            "source_title": title,
            "source_url": url,
            "research_objective": objective,
            "target_context": target_context or {},
            "text": text[:18000],
        }
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://api.deepseek.com/chat/completions",
                headers={"Authorization": f"Bearer {self.settings.deepseek_api_key}"},
                json={
                    "model": self.settings.deepseek_model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": json.dumps(prompt)},
                    ],
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            raw = response.json()["choices"][0]["message"]["content"]
        if not raw or not raw.strip():
            return self._heuristic_extract(text, title, url, theme_id)
        try:
            return ExtractionResult.model_validate_json(raw)
        except Exception:
            try:
                parsed = json.loads(raw)
                return ExtractionResult.model_validate(
                    self._normalize_extraction_payload(parsed, title, url, theme_id)
                )
            except Exception:
                return self._heuristic_extract(text, title, url, theme_id)

    async def synthesize(self, instruction: str, context: dict[str, Any]) -> str:
        if not self.settings.deepseek_api_key:
            return self._fallback_synthesis(instruction, context)
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://api.deepseek.com/chat/completions",
                headers={"Authorization": f"Bearer {self.settings.deepseek_api_key}"},
                json={
                    "model": self.settings.deepseek_model,
                    "messages": [
                        {"role": "system", "content": "Write concise, source-grounded investment research output. Do not invent facts."},
                        {"role": "user", "content": json.dumps({"instruction": instruction, "context": context})},
                    ],
                },
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]

    def _heuristic_extract(self, text: str, title: str | None, url: str | None, theme_id: str | None) -> ExtractionResult:
        people = []
        companies = []
        relationships = []
        facts = []
        evidence = text[:400]
        names = sorted(set(re.findall(r"\b[A-Z][a-z]+ [A-Z][a-z]+\b", text)))[:5]
        orgs = sorted(set(re.findall(r"\b[A-Z][A-Za-z0-9&.\-]+(?: [A-Z][A-Za-z0-9&.\-]+){0,3}\b", text)))[:8]

        for name in names:
            people.append(
                ExtractedPerson(
                    name=name,
                    headline="Potential sector expert",
                    expert_type="operator",
                    theme_ids=[theme_id] if theme_id else [],
                    summary=f"Mentioned in {title or 'uploaded source'}.",
                    why_relevant=evidence,
                    confidence=0.45,
                )
            )

        for org in orgs:
            if org in names or len(org) < 4:
                continue
            companies.append(
                ExtractedCompany(
                    name=org,
                    category="target",
                    theme_ids=[theme_id] if theme_id else [],
                    description=f"Mentioned in {title or 'uploaded source'}.",
                    confidence=0.4,
                )
            )

        if people and companies:
            relationships.append(
                ExtractedRelationship(
                    from_name=people[0].name,
                    from_type="person",
                    to_name=companies[0].name,
                    to_type="company",
                    relationship_type="mentioned_in_same_source",
                    theme_id=theme_id,  # type: ignore[arg-type]
                    evidence_text=evidence,
                    confidence=0.35,
                )
            )

        if theme_id:
            facts.append(
                ExtractedFact(
                    subject_name=title or "source",
                    subject_type="theme",
                    fact_type="source_signal",
                    fact_value=evidence,
                    evidence_text=evidence,
                    theme_id=theme_id,  # type: ignore[arg-type]
                    confidence=0.4,
                )
            )

        return ExtractionResult(
            people=people,
            companies=companies,
            relationships=relationships,
            facts=facts,
            citations=[Citation(title=title or "Uploaded source", url=url, evidence=evidence)] if evidence else [],
        )

    def _normalize_extraction_payload(
        self,
        payload: Any,
        title: str | None,
        url: str | None,
        theme_id: str | None,
    ) -> dict[str, Any]:
        if not isinstance(payload, dict):
            payload = {}

        return {
            "people": [
                item
                for item in (
                    self._normalize_person(person, theme_id)
                    for person in self._as_list(payload.get("people"))
                )
                if item
            ],
            "companies": [
                item
                for item in (
                    self._normalize_company(company, theme_id)
                    for company in self._as_list(payload.get("companies"))
                )
                if item
            ],
            "relationships": [
                item
                for item in (
                    self._normalize_relationship(relationship, theme_id)
                    for relationship in self._as_list(payload.get("relationships"))
                )
                if item
            ],
            "facts": [
                item
                for item in (
                    self._normalize_fact(fact, title, theme_id)
                    for fact in self._as_list(payload.get("facts"))
                )
                if item
            ],
            "citations": [
                item
                for item in (
                    self._normalize_citation(citation, title, url)
                    for citation in self._as_list(payload.get("citations"))
                )
                if item
            ],
        }

    def _normalize_person(self, value: Any, theme_id: str | None) -> dict[str, Any] | None:
        if isinstance(value, str):
            name = value.strip()
            data: dict[str, Any] = {"name": name}
        elif isinstance(value, dict):
            data = dict(value)
            name = self._first_text(data, "name", "person", "person_name", "full_name")
        else:
            return None
        if not name:
            return None
        return {
            "name": name,
            "headline": self._first_text(data, "headline", "title", "role"),
            "current_organization": self._first_text(
                data,
                "current_organization",
                "organization",
                "company",
                "firm",
                "current_employer",
            ),
            "expert_type": self._first_text(data, "expert_type", "type", "category") or "operator",
            "theme_ids": self._theme_ids(data, theme_id),
            "linkedin_url": self._first_text(data, "linkedin_url", "linkedin", "profile_url"),
            "website": self._first_text(data, "website", "url"),
            "summary": self._first_text(data, "summary", "description"),
            "why_relevant": self._first_text(data, "why_relevant", "relevance", "evidence"),
            "confidence": self._confidence(data),
        }

    def _normalize_company(self, value: Any, theme_id: str | None) -> dict[str, Any] | None:
        if isinstance(value, str):
            name = value.strip()
            data: dict[str, Any] = {"name": name}
        elif isinstance(value, dict):
            data = dict(value)
            name = self._first_text(data, "name", "company", "organization", "target")
        else:
            return None
        if not name:
            return None
        return {
            "name": name,
            "category": self._first_text(data, "category", "type") or "target",
            "theme_ids": self._theme_ids(data, theme_id),
            "website": self._first_text(data, "website", "url"),
            "hq": self._first_text(data, "hq", "headquarters"),
            "description": self._first_text(data, "description", "summary"),
            "why_interesting": self._first_text(data, "why_interesting", "why_relevant", "evidence"),
            "confidence": self._confidence(data),
        }

    def _normalize_relationship(self, value: Any, theme_id: str | None) -> dict[str, Any] | None:
        if not isinstance(value, dict):
            return None
        from_name = self._first_text(
            value,
            "from_name",
            "from",
            "from_entity",
            "person",
            "source",
            "organization",
        )
        to_name = self._first_text(
            value,
            "to_name",
            "to",
            "to_entity",
            "company",
            "target",
            "deal",
        )
        if not from_name or not to_name:
            return None
        return {
            "from_name": from_name,
            "from_type": self._entity_type(value.get("from_type"), fallback="person" if value.get("person") else "organization"),
            "to_name": to_name,
            "to_type": self._entity_type(value.get("to_type"), fallback="company" if value.get("company") else "organization"),
            "relationship_type": self._first_text(value, "relationship_type", "type", "role", "relationship") or "related_to",
            "theme_id": value.get("theme_id") or theme_id,
            "evidence_text": self._first_text(value, "evidence_text", "evidence", "description", "source") or f"{from_name} is related to {to_name}.",
            "confidence": self._confidence(value),
        }

    def _normalize_fact(self, value: Any, title: str | None, theme_id: str | None) -> dict[str, Any] | None:
        if isinstance(value, str):
            data: dict[str, Any] = {"fact_value": value}
        elif isinstance(value, dict):
            data = dict(value)
        else:
            return None
        fact_value = self._first_text(data, "fact_value", "fact", "value", "description", "evidence")
        if not fact_value:
            return None
        return {
            "subject_name": self._first_text(data, "subject_name", "subject", "name") or title or "source",
            "subject_type": self._entity_type(data.get("subject_type"), fallback="theme"),
            "fact_type": self._first_text(data, "fact_type", "type") or "source_signal",
            "fact_value": fact_value,
            "evidence_text": self._first_text(data, "evidence_text", "evidence", "source") or fact_value,
            "theme_id": data.get("theme_id") or theme_id,
            "confidence": self._confidence(data),
        }

    def _normalize_citation(self, value: Any, title: str | None, url: str | None) -> dict[str, Any] | None:
        if isinstance(value, str):
            return {"title": title or value, "url": value if value.startswith("http") else url, "evidence": title or value}
        if not isinstance(value, dict):
            return None
        evidence = self._first_text(value, "evidence", "text", "quote", "snippet") or title
        return {
            "source_id": self._first_text(value, "source_id"),
            "title": self._first_text(value, "title", "source_title", "name") or title or "Source",
            "url": self._first_text(value, "url", "source_url") or url,
            "evidence": evidence or "Source cited by extraction.",
        }

    def _as_list(self, value: Any) -> list[Any]:
        return value if isinstance(value, list) else []

    def _first_text(self, data: dict[str, Any], *keys: str) -> str | None:
        for key in keys:
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None

    def _theme_ids(self, data: dict[str, Any], theme_id: str | None) -> list[str]:
        value = data.get("theme_ids")
        if isinstance(value, list):
            return [item for item in value if isinstance(item, str)]
        value = data.get("theme_id")
        if isinstance(value, str):
            return [value]
        return [theme_id] if theme_id else []

    def _confidence(self, data: dict[str, Any]) -> float:
        value = data.get("confidence")
        if isinstance(value, int | float):
            return max(0.0, min(1.0, float(value)))
        return 0.7

    def _entity_type(self, value: Any, fallback: str) -> str:
        allowed = {"person", "company", "organization", "deal", "event", "theme", "relationship"}
        return value if isinstance(value, str) and value in allowed else fallback

    def _fallback_synthesis(self, instruction: str, context: dict[str, Any]) -> str:
        citations = context.get("citations") or []
        citation_text = "\n".join(f"- {item.get('title', 'Source')}: {item.get('evidence', '')}" for item in citations[:5])
        return f"{instruction}\n\nGrounded context:\n{citation_text or 'No configured model context available.'}"


extractor = DeepSeekExtractor()
