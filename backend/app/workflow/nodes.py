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
    examples = [json.loads((ROOT_DIR / "examples" / name).read_text(encoding="utf-8"))["expected_result_row_example"] for name in ("sample_prompt_1.json", "sample_prompt_2.json")]
    prompt = f"Extract rows with fields {fields} from these permitted documents. Return JSON only in this form {{\"rows\": [...]}}. Examples: {json.dumps(examples)}. Documents: {json.dumps([document.__dict__ for document in documents])}"
    last_error: Exception | None = None
    for _ in range(2):
        try:
            payload = json.loads(await _default_llm_call(prompt if not last_error else prompt + f" Previous error: {last_error}"))
            validate(instance=payload, schema=_schema())
            if any(not row.get("source_url") for row in payload["rows"]):
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
        if connector == "remoteok":
            return await RemoteOKConnector().fetch(" ".join(node.config_json.get("tags", [])))
        if connector == "hn_algolia":
            return await HNAlgoliaConnector().fetch(query)
        if connector == "mock":
            return await MockSearchConnector().fetch(query)
        return await (WebSearchConnector() if os.getenv("SEARCH_API_KEY") else MockSearchConnector()).fetch(query)
    if node.type.value == "fetch":
        return [item for group in upstream for item in group]
    if node.type.value == "extract":
        return await _extract(upstream[0] if upstream else [], node.config_json.get("fields", []))
    if node.type.value == "clean":
        rows = upstream[0] if upstream else []
        cleaned: list[dict[str, Any]] = []
        raw_threshold = node.config_json.get("threshold", 0.9)
        threshold = int(raw_threshold * 100) if isinstance(raw_threshold, float) else int(raw_threshold)
        dedupe_keys = node.config_json.get("dedupe_on", [])
        for row in rows:
            fields = {
                key: value.strip() if isinstance(value, str) else value
                for key, value in row.get("fields", {}).items()
            }
            row["fields"] = fields
            if dedupe_keys:
                ident = " ".join(str(fields.get(k, "")) for k in dedupe_keys).strip()
            else:
                ident = str(fields.get("company_name", fields.get("job_title", fields.get("name", "")))).strip()

            is_dup = False
            if ident:
                for old in cleaned:
                    old_fields = old.get("fields", {})
                    if dedupe_keys:
                        old_ident = " ".join(str(old_fields.get(k, "")) for k in dedupe_keys).strip()
                    else:
                        old_ident = str(old_fields.get("company_name", old_fields.get("job_title", old_fields.get("name", "")))).strip()
                    if old_ident and fuzz.ratio(ident.lower(), old_ident.lower()) >= threshold:
                        is_dup = True
                        break
            if not is_dup:
                cleaned.append(row)
        return cleaned
    if node.type.value == "validate":
        rows = upstream[0] if upstream else []
        required = node.config_json.get("required_fields", [])
        for row in rows:
            confidence = float(row.get("confidence", 1.0))
            fields = row.get("fields", {})
            has_missing = any(not fields.get(field) for field in required)
            row["needs_review"] = bool(row.get("needs_review", False) or confidence < 0.7 or has_missing)
        return rows
    if node.type.value == "output":
        rows = upstream[0] if upstream else []
        for row in rows:
            if not row.get("source_url"):
                raise ValueError("ResultRow source_url must not be null.")
            db.add(
                ResultRow(
                    task_id=node.task_id,
                    fields_json=row.get("fields", {}),
                    source_url=row["source_url"],
                    confidence=float(row.get("confidence", 1.0)),
                    needs_review=bool(row.get("needs_review", False)),
                )
            )
        db.commit()
        return rows
    raise ValueError(f"Unsupported node type: {node.type}")
