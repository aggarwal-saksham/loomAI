from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class SourceDocument:
    url: str
    title: str
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


class Connector(ABC):
    @abstractmethod
    async def fetch(self, query: str, limit: int = 10) -> list[SourceDocument]:
        """Return permitted, source-addressable documents for a workflow node."""
