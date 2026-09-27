import httpx

from .base import Connector, SourceDocument


class RemoteOKConnector(Connector):
    async def fetch(self, query: str, limit: int = 10) -> list[SourceDocument]:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get("https://remoteok.com/api")
            response.raise_for_status()
        jobs = response.json()
        tags = {term.lower() for term in query.split()}
        documents = []
        for job in jobs:
            if not isinstance(job, dict) or not job.get("url"):
                continue
            haystack = " ".join(str(job.get(key, "")) for key in ("position", "tags", "description"))
            if tags and not any(tag in haystack.lower() for tag in tags):
                continue
            documents.append(
                SourceDocument(
                    url=job["url"],
                    title=job.get("position", "RemoteOK job"),
                    content=job.get("description", ""),
                    metadata=job,
                )
            )
        return documents[:limit]
