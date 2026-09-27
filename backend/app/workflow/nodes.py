import json
import os
from pathlib import Path
from typing import Any

from jsonschema import validate
from rapidfuzz import fuzz
from sqlalchemy.orm import Session

from ..connectors import HNAlgoliaConnector, MockSearchConnector, RemoteOKConnector, WebSearchConnector
from ..connectors.base import SourceDocument
from ..models import ResultRow, WorkflowNode
from .planner import _default_llm_call


ROOT_DIR = Path(__file__).resolve().parents[3]


def _schema() -> dict:
    return json.loads((ROOT_DIR / "schemas" / "extraction_output.json").read_text(encoding="utf-8"))


def _parents(ids: set[str], data: dict[str, object]) -> list[object]:
    return [data[node_id] for node_id in ids if node_id in data]


async def _extract(documents: list[SourceDocument], fields: list[str]) -> list[dict[str, Any]]:
    examples = [json.loads((ROOT_DIR / "examples" / name).read_text())["expected_result_row_example"] for name in ("sample_prompt_1.json", "sample_prompt_2.json")]
    prompt = f"Extract rows with fields {fields} from these permitted documents. Return JSON only in this form {{\"rows\": [...]}}. Examples: {json.dumps(examples)}. Documents: {json.dumps([document.__dict__ for document in documents])}"
    last_error: Exception | None = None
    for _ in range(2):
        try:
            payload = json.loads(await _default_llm_call(prompt if not last_error else prompt + f" Previous error: {last_error}"))
            validate(instance=payload, schema=_schema())
            if any(not row["source_url"] for row in payload["rows"]):
                raise ValueError("Every extracted row requires source_url.")
            return payload["rows"]
        except Exception as error:
            last_error = error
    raise ValueError(f"Extraction output failed validation after one retry: {last_error}")


async def run_node(node: WorkflowNode, parent_ids: set[str], data: dict[str, object], db: Session) -> object:
    upstream = _parents(parent_ids, data)
    if node.type.value == "source":
        connector = node.config_json.get("connector", "web_search")
        query = " ".join(node.config_json.get("queries", [node.label]))
        if connector == "remoteok": return await RemoteOKConnector().fetch(" ".join(node.config_json.get("tags", [])))
        if connector == "hn_algolia": return await HNAlgoliaConnector().fetch(query)
        return await (WebSearchConnector() if os.getenv("SEARCH_API_KEY") else MockSearchConnector()).fetch(query)
    if node.type.value == "fetch": return [item for group in upstream for item in group]
    if node.type.value == "extract": return await _extract(upstream[0] if upstream else [], node.config_json.get("fields", []))
    if node.type.value == "clean":
        rows = upstream[0] if upstream else []
        cleaned = []
        for row in rows:
            row["fields"] = {key: value.strip() if isinstance(value, str) else value for key, value in row["fields"].items()}
            name = str(row["fields"].get("company_name", row["fields"].get("job_title", "")))
            if not any(fuzz.ratio(name.lower(), str(old["fields"].get("company_name", old["fields"].get("job_title", ""))).lower()) >= 90 for old in cleaned): cleaned.append(row)
        return cleaned
    if node.type.value == "validate":
        required = node.config_json.get("required_fields", [])
        for row in upstream[0] if upstream else []: row["needs_review"] = row["confidence"] < 0.7 or any(not row["fields"].get(field) for field in required)
        return upstream[0] if upstream else []
    if node.type.value == "output":
        rows = upstream[0] if upstream else []
        for row in rows:
            if not row.get("source_url"): raise ValueError("ResultRow source_url must not be null.")
            db.add(ResultRow(task_id=node.task_id, fields_json=row["fields"], source_url=row["source_url"], confidence=row["confidence"], needs_review=row.get("needs_review", False)))
        db.commit(); return rows
    raise ValueError(f"Unsupported node type: {node.type}")
