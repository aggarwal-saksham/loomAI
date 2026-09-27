import httpx

from .base import Connector, SourceDocument


class HNAlgoliaConnector(Connector):
    async def fetch(self, query: str, limit: int = 10) -> list[SourceDocument]:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                "https://hn.algolia.com/api/v1/search", params={"query": query, "hitsPerPage": limit}
            )
            response.raise_for_status()
        return [
            SourceDocument(
                url=item.get("url") or f"https://news.ycombinator.com/item?id={item['objectID']}",
                title=item.get("title") or item.get("story_title") or "Hacker News result",
                content=item.get("story_text") or item.get("comment_text") or "",
                metadata={"object_id": item["objectID"]},
            )
            for item in response.json().get("hits", [])
        ]
