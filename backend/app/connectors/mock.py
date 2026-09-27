import json
from pathlib import Path

from .base import Connector, SourceDocument


class MockSearchConnector(Connector):
    """Offline connector built from the documented example result records."""

    def __init__(self) -> None:
        root = Path(__file__).resolve().parents[3]
        fixtures = [
            json.loads((root / "examples" / name).read_text(encoding="utf-8"))
            for name in ("sample_prompt_1.json", "sample_prompt_2.json")
        ]
        self.documents = [
            SourceDocument(
                url=fixture["expected_result_row_example"]["source_url"],
                title=fixture["expected_result_row_example"]["fields"].get(
                    "company_name", fixture["expected_result_row_example"]["fields"].get("job_title", "Mock result")
                ),
                content=json.dumps(fixture["expected_result_row_example"]),
                metadata={"fixture": fixture["prompt"]},
            )
            for fixture in fixtures
        ]

    async def fetch(self, query: str, limit: int = 10) -> list[SourceDocument]:
        query_terms = set(query.lower().split())
        ranked = sorted(
            self.documents,
            key=lambda item: len(query_terms & set((item.title + item.content).lower().split())),
            reverse=True,
        )
        return ranked[:limit]
