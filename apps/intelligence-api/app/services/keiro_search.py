from __future__ import annotations

from typing import Any

import httpx

from app.config import get_settings


class KeiroSearchService:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def search(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        if not self.settings.keirolabs_api_key:
            return self._fallback_results(query)
        payload = {"query": query, "limit": limit}
        headers = {"Authorization": f"Bearer {self.settings.keirolabs_api_key}"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.settings.keirolabs_base_url.rstrip('/')}/search",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
        results = data.get("results", data if isinstance(data, list) else [])
        return [self._normalize_result(item, query) for item in results[:limit]]

    async def fetch_content(self, url: str) -> dict[str, Any]:
        if not self.settings.keirolabs_api_key:
            return {"url": url, "title": url, "content": ""}
        payload = {"url": url}
        headers = {"Authorization": f"Bearer {self.settings.keirolabs_api_key}"}
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                f"{self.settings.keirolabs_base_url.rstrip('/')}/content",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
        return {
            "url": url,
            "title": data.get("title") or url,
            "publisher": data.get("publisher"),
            "content": data.get("content") or data.get("text") or "",
            "metadata": data,
        }

    async def linkedin_links(self, name: str, company: str | None, role: str | None) -> list[dict[str, Any]]:
        query = " ".join(part for part in [name, company, role, "LinkedIn profile"] if part)
        results = await self.search(query, limit=8)
        links = []
        for result in results:
            url = result.get("url", "")
            if "linkedin.com/in/" not in url:
                continue
            links.append(
                {
                    "name": name,
                    "profile_url": url,
                    "confidence": 0.78 if company and company.lower() in result.get("snippet", "").lower() else 0.64,
                    "search_query": query,
                    "source_url": result.get("url"),
                }
            )
        return links[:5]

    def _normalize_result(self, item: dict[str, Any], query: str) -> dict[str, Any]:
        return {
            "title": item.get("title") or item.get("name") or query,
            "url": item.get("url") or item.get("link"),
            "snippet": item.get("snippet") or item.get("description") or "",
            "publisher": item.get("publisher") or item.get("domain"),
            "metadata": item,
        }

    def _fallback_results(self, query: str) -> list[dict[str, Any]]:
        return [
            {
                "title": f"Search not configured: {query}",
                "url": None,
                "snippet": "Set KEIROLABS_API_KEY to enable public web discovery.",
                "publisher": "local-fallback",
                "metadata": {"query": query, "provider": "keirolabs"},
            }
        ]


keiro = KeiroSearchService()
