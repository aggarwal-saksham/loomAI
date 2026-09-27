import asyncio
import json
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.routes import tasks
from app.workflow.planner import generate_workflow_plan


ROOT_DIR = Path(__file__).resolve().parents[2]
EXAMPLES = (
    ROOT_DIR / "examples" / "sample_prompt_1.json",
    ROOT_DIR / "examples" / "sample_prompt_2.json",
)


class PlannerTests(unittest.TestCase):
    def test_fixture_plans_validate(self) -> None:
        for path in EXAMPLES:
            fixture = json.loads(path.read_text(encoding="utf-8"))

            async def fixture_call(_: str, output=fixture["expected_planner_output"]) -> str:
                return json.dumps(output)

            plan = asyncio.run(generate_workflow_plan(fixture["prompt"], fixture_call))
            self.assertEqual(plan, fixture["expected_planner_output"])

    def test_invalid_plan_retries_once(self) -> None:
        fixture = json.loads(EXAMPLES[0].read_text(encoding="utf-8"))
        responses = iter(["{}", json.dumps(fixture["expected_planner_output"])])

        async def fixture_call(_: str) -> str:
            return next(responses)

        plan = asyncio.run(generate_workflow_plan(fixture["prompt"], fixture_call))
        self.assertEqual(plan["goal"], fixture["expected_planner_output"]["goal"])

    def test_post_tasks_persists_a_valid_plan(self) -> None:
        fixture = json.loads(EXAMPLES[0].read_text(encoding="utf-8"))
        original = tasks.generate_workflow_plan

        async def fixture_planner(_: str) -> dict:
            return fixture["expected_planner_output"]

        tasks.generate_workflow_plan = fixture_planner
        try:
            with TestClient(app) as client:
                response = client.post("/tasks", json={"prompt": fixture["prompt"]})
        finally:
            tasks.generate_workflow_plan = original

        self.assertEqual(response.status_code, 201, response.text)
        payload = response.json()
        self.assertEqual(payload["status"], "draft")
        self.assertEqual(len(payload["nodes"]), 6)
        self.assertEqual(len(payload["edges"]), 5)


if __name__ == "__main__":
    unittest.main()
