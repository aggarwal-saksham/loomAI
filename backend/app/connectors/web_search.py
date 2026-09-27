import os

import httpx

from .base import Connector, SourceDocument


class WebSearchConnector(Connector):
    """Tavily web search connector, enabled only when SEARCH_API_KEY exists."""

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or os.getenv("SEARCH_API_KEY")
        if not self.api_key:
            raise ValueError("SEARCH_API_KEY is required for the web search connector.")

    async def fetch(self, query: str, limit: int = 10) -> list[SourceDocument]:
        payload = {
            "api_key": self.api_key,
            "query": query,
            "max_results": limit,
            "search_depth": "basic",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post("https://api.tavily.com/search", json=payload)
            response.raise_for_status()
        return [
            SourceDocument(
                url=item["url"],
                title=item.get("title", item["url"]),
                content=item.get("content", ""),
                metadata={"score": item.get("score")},
            )
            for item in response.json().get("results", [])
            if item.get("url")
        ]
