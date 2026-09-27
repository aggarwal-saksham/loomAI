import asyncio
import json
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import NodeStatus, NodeType, ResultRow, Task, TaskStatus, WorkflowEdge, WorkflowNode
from app.workflow.executor import event_bus, execute_task


class ExecutorTests(unittest.TestCase):
    def setUp(self) -> None:
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()

    def tearDown(self) -> None:
        self.db.close()

    def _create_sample_graph(self) -> Task:
        task = Task(prompt="Find 15 fintech hackathon sponsors", status=TaskStatus.DRAFT)
        self.db.add(task)
        self.db.flush()

        n1 = WorkflowNode(
            task_id=task.id,
            type=NodeType.SOURCE,
            label="Source: Fintech sponsors",
            config_json={"connector": "mock", "queries": ["fintech hackathon sponsors"]},
            position_x=0.0,
            position_y=0.0,
        )
        n2 = WorkflowNode(
            task_id=task.id,
            type=NodeType.FETCH,
            label="Fetch pages",
            config_json={"max_urls": 5},
            position_x=200.0,
            position_y=0.0,
        )
        n3 = WorkflowNode(
            task_id=task.id,
            type=NodeType.EXTRACT,
            label="Extract sponsor details",
            config_json={"fields": ["company_name", "website", "why_relevant"]},
            position_x=400.0,
            position_y=0.0,
        )
        n4 = WorkflowNode(
            task_id=task.id,
            type=NodeType.CLEAN,
            label="Clean and dedupe",
            config_json={"dedupe_on": ["company_name"], "threshold": 0.85},
            position_x=600.0,
            position_y=0.0,
        )
        n5 = WorkflowNode(
            task_id=task.id,
            type=NodeType.VALIDATE,
            label="Validate fields",
            config_json={"required_fields": ["company_name", "website"]},
            position_x=800.0,
            position_y=0.0,
        )
        n6 = WorkflowNode(
            task_id=task.id,
            type=NodeType.OUTPUT,
            label="Output dataset",
            config_json={},
            position_x=1000.0,
            position_y=0.0,
        )

        nodes = [n1, n2, n3, n4, n5, n6]
        for node in nodes:
            self.db.add(node)
        self.db.flush()

        edges = [
            WorkflowEdge(task_id=task.id, from_node_id=n1.id, to_node_id=n2.id),
            WorkflowEdge(task_id=task.id, from_node_id=n2.id, to_node_id=n3.id),
            WorkflowEdge(task_id=task.id, from_node_id=n3.id, to_node_id=n4.id),
            WorkflowEdge(task_id=task.id, from_node_id=n4.id, to_node_id=n5.id),
            WorkflowEdge(task_id=task.id, from_node_id=n5.id, to_node_id=n6.id),
        ]
        for edge in edges:
            self.db.add(edge)
        self.db.commit()
        return task

    def test_execute_task_end_to_end(self) -> None:
        task = self._create_sample_graph()

        mock_extraction = {
            "rows": [
                {
                    "fields": {
                        "company_name": "Stripe",
                        "website": "https://stripe.com",
                        "why_relevant": "Sponsors major student fintech hackathons.",
                    },
                    "source_url": "https://stripe.com/community",
                    "confidence": 0.95,
                },
                {
                    "fields": {
                        "company_name": "Stripe.",  # Fuzzy match >= 85 with Stripe, should be deduplicated
                        "website": "https://stripe.com",
                        "why_relevant": "Global fintech sponsor.",
                    },
                    "source_url": "https://stripe.com/about",
                    "confidence": 0.90,
                },
                {
                    "fields": {
                        "company_name": "Plaid",
                        "website": "",  # Missing website, validate node should flag
                        "why_relevant": "API partner for finance.",
                    },
                    "source_url": "https://plaid.com",
                    "confidence": 0.85,
                },
            ]
        }

        async def fake_llm(_: str) -> str:
            return json.dumps(mock_extraction)

        with patch("app.workflow.nodes._default_llm_call", side_effect=fake_llm):
            asyncio.run(execute_task(task.id))

        self.db.expire_all()
        refreshed_task = self.db.get(Task, task.id)
        self.assertEqual(refreshed_task.status, TaskStatus.DONE)

        nodes = self.db.query(WorkflowNode).filter_by(task_id=task.id).all()
        self.assertEqual(len(nodes), 6)
        for node in nodes:
            self.assertEqual(node.status, NodeStatus.DONE, f"Node {node.label} status: {node.status}")
            self.assertIsNotNone(node.started_at)
            self.assertIsNotNone(node.completed_at)
            self.assertIsNone(node.error_message)

        results = self.db.query(ResultRow).filter_by(task_id=task.id).all()
        # Stripe and Stripe Inc deduped to 1 row; Plaid kept -> 2 rows
        self.assertEqual(len(results), 2)
        stripe_row = next(r for r in results if "Stripe" in r.fields_json["company_name"])
        plaid_row = next(r for r in results if r.fields_json["company_name"] == "Plaid")

        self.assertFalse(stripe_row.needs_review)
        self.assertTrue(plaid_row.needs_review)  # missing website flagged needs_review
        self.assertTrue(all(bool(r.source_url) for r in results))

    def test_node_retry_and_isolation(self) -> None:
        task = Task(prompt="Test failure isolation", status=TaskStatus.DRAFT)
        self.db.add(task)
        self.db.flush()

        # Branch A: n1 -> n2
        n1 = WorkflowNode(
            task_id=task.id,
            type=NodeType.SOURCE,
            label="Branch A source",
            config_json={"connector": "web_search", "queries": ["query a"]},
        )
        n2 = WorkflowNode(
            task_id=task.id,
            type=NodeType.EXTRACT,
            label="Branch A extract (will fail)",
            config_json={"fields": ["field_a"]},
        )
        # Branch B (independent): n3
        n3 = WorkflowNode(
            task_id=task.id,
            type=NodeType.SOURCE,
            label="Branch B independent source",
            config_json={"connector": "mock"},
        )
        # Output depends on n2
        n_out = WorkflowNode(
            task_id=task.id,
            type=NodeType.OUTPUT,
            label="Output node",
            config_json={},
        )
        self.db.add_all([n1, n2, n3, n_out])
        self.db.flush()

        self.db.add_all([
            WorkflowEdge(task_id=task.id, from_node_id=n1.id, to_node_id=n2.id),
            WorkflowEdge(task_id=task.id, from_node_id=n2.id, to_node_id=n_out.id),
        ])
        self.db.commit()

        # Mock LLM to always fail
        async def failing_llm(_: str) -> str:
            raise RuntimeError("API timeout")

        with patch("app.workflow.nodes._default_llm_call", side_effect=failing_llm):
            asyncio.run(execute_task(task.id))

        self.db.expire_all()
        refreshed_task = self.db.get(Task, task.id)
        # Output node could not run, so task is failed
        self.assertEqual(refreshed_task.status, TaskStatus.FAILED)

        # n1 succeeded
        self.assertEqual(self.db.get(WorkflowNode, n1.id).status, NodeStatus.DONE)
        # n2 failed with error message
        failed_n2 = self.db.get(WorkflowNode, n2.id)
        self.assertEqual(failed_n2.status, NodeStatus.FAILED)
        self.assertIn("API timeout", failed_n2.error_message)
        # Independent n3 completed successfully despite n2's failure!
        self.assertEqual(self.db.get(WorkflowNode, n3.id).status, NodeStatus.DONE)

    def test_sse_event_bus(self) -> None:
        task = Task(prompt="Test SSE events", status=TaskStatus.DRAFT)
        self.db.add(task)
        self.db.flush()

        n1 = WorkflowNode(
            task_id=task.id,
            type=NodeType.SOURCE,
            label="Single Source",
            config_json={"connector": "mock"},
        )
        n_out = WorkflowNode(
            task_id=task.id,
            type=NodeType.OUTPUT,
            label="Output",
            config_json={},
        )
        self.db.add_all([n1, n_out])
        self.db.flush()
        self.db.add(WorkflowEdge(task_id=task.id, from_node_id=n1.id, to_node_id=n_out.id))
        self.db.commit()

        received_events = []

        async def run_with_events():
            queue = event_bus.subscribe(task.id)
            task_runner = asyncio.create_task(execute_task(task.id))
            while not task_runner.done():
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=0.1)
                    received_events.append(event)
                except asyncio.TimeoutError:
                    pass
            # Drain remaining
            while not queue.empty():
                received_events.append(queue.get_nowait())
            await task_runner
            event_bus.unsubscribe(task.id, queue)

        asyncio.run(run_with_events())

        self.assertGreater(len(received_events), 0)
        for event in received_events:
            self.assertIn("node_id", event)
            self.assertIn("status", event)
            self.assertIn("timestamp", event)

    def test_run_endpoint(self) -> None:
        task = self._create_sample_graph()

        with patch("app.routes.tasks.execute_task", return_value=None):
            with TestClient(app) as client:
                resp = client.post(f"/tasks/{task.id}/run")
                self.assertEqual(resp.status_code, 202)
                self.assertEqual(resp.json(), {"status": "running"})

                resp_404 = client.post("/tasks/non-existent-id/run")
                self.assertEqual(resp_404.status_code, 404)


if __name__ == "__main__":
    unittest.main()
