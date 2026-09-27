import json
import os
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any

import httpx
from jsonschema import ValidationError, validate


ROOT_DIR = Path(__file__).resolve().parents[3]
WORKFLOW_SCHEMA_PATH = ROOT_DIR / "schemas" / "workflow_node.json"
EXAMPLE_PATHS = (
    ROOT_DIR / "examples" / "sample_prompt_1.json",
    ROOT_DIR / "examples" / "sample_prompt_2.json",
)


class PlannerError(Exception):
    pass


class PlannerConfigurationError(PlannerError):
    pass


class PlannerValidationError(PlannerError):
    pass


class PlannerProviderError(PlannerError):
    pass


LLMCall = Callable[[str], Awaitable[str]]


def _load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def _planner_prompt(prompt: str, retry_error: str | None = None) -> str:
    examples = [_load_json(path) for path in EXAMPLE_PATHS]
    retry_note = ""
    if retry_error:
        retry_note = (
            "\nYour previous response was invalid. Correct this validation error and return the complete plan again: "
            f"{retry_error}\n"
        )

    return (
        "You are the workflow planner for a permitted-source data intelligence product. "
        "Create a concise executable DAG for the user's request. Use only the node types "
        "source, fetch, extract, clean, validate, and output. Return JSON only, with no markdown. "
        "Every route must ultimately lead to an output node.\n\n"
        "Few-shot references:\n"
        f"{json.dumps(examples, indent=2)}\n\n"
        f"User request: {prompt}\n"
        f"Required output JSON Schema:\n{json.dumps(_load_json(WORKFLOW_SCHEMA_PATH), indent=2)}"
        f"{retry_note}"
    )


async def _default_llm_call(prompt: str) -> str:
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    if gemini_key:
        model = os.getenv("GEMINI_MODEL") or "gemini-3.8-flash"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"},
        }
        try:
            async with httpx.AsyncClient(timeout=45) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                    params={"key": gemini_key},
                    json=payload,
                )
                response.raise_for_status()
        except httpx.HTTPError as error:
            raise PlannerProviderError(f"Gemini planner request failed: {error}") from error
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]

    if openai_key:
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
        }
        headers = {"Authorization": f"Bearer {openai_key}"}
        try:
            async with httpx.AsyncClient(timeout=45) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions", headers=headers, json=payload
                )
                response.raise_for_status()
        except httpx.HTTPError as error:
            raise PlannerProviderError(f"OpenAI planner request failed: {error}") from error
        return response.json()["choices"][0]["message"]["content"]

    if anthropic_key:
        payload = {
            "model": "claude-3-5-haiku-latest",
            "max_tokens": 2_000,
            "messages": [{"role": "user", "content": prompt}],
        }
        headers = {
            "x-api-key": anthropic_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=45) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages", headers=headers, json=payload
                )
                response.raise_for_status()
        except httpx.HTTPError as error:
            raise PlannerProviderError(f"Anthropic planner request failed: {error}") from error
        return response.json()["content"][0]["text"]

    raise PlannerConfigurationError(
        "Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY to create a workflow plan."
    )


def _validate_plan(plan: dict[str, Any]) -> None:
    validate(instance=plan, schema=_load_json(WORKFLOW_SCHEMA_PATH))

    node_ids = [node["id"] for node in plan["nodes"]]
    if len(node_ids) != len(set(node_ids)):
        raise ValidationError("Workflow node ids must be unique.")
    unknown_edges = [
        edge for edge in plan["edges"] if edge["from"] not in node_ids or edge["to"] not in node_ids
    ]
    if unknown_edges:
        raise ValidationError("Workflow edges must reference nodes in the plan.")


async def generate_workflow_plan(prompt: str, llm_call: LLMCall | None = None) -> dict[str, Any]:
    """Generate and schema-validate a plan, retrying once after malformed output."""
    call = llm_call or _default_llm_call
    last_error: Exception | None = None

    for attempt in range(2):
        retry_error = str(last_error) if last_error else None
        try:
            raw_response = await call(_planner_prompt(prompt, retry_error))
            plan = json.loads(raw_response)
            _validate_plan(plan)
            return plan
        except PlannerConfigurationError:
            raise
        except (json.JSONDecodeError, ValidationError, KeyError, TypeError) as error:
            last_error = error

    raise PlannerValidationError(
        f"Planner output failed validation after one retry: {last_error}"
    )
