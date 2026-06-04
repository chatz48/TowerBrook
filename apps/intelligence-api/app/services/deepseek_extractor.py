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
        try:
            return ExtractionResult.model_validate_json(raw)
        except Exception:
            parsed = json.loads(raw)
            return ExtractionResult.model_validate(parsed)

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

    def _fallback_synthesis(self, instruction: str, context: dict[str, Any]) -> str:
        citations = context.get("citations") or []
        citation_text = "\n".join(f"- {item.get('title', 'Source')}: {item.get('evidence', '')}" for item in citations[:5])
        return f"{instruction}\n\nGrounded context:\n{citation_text or 'No configured model context available.'}"


extractor = DeepSeekExtractor()
