import csv
import io
import json
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import NodeStatus, NodeType, ResultRow, Task, TaskStatus, WorkflowEdge, WorkflowNode


class RouteTests(unittest.TestCase):
    def setUp(self) -> None:
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.db.close()

    def _seed_task_with_results(self) -> Task:
        task = Task(prompt="Test endpoints task", status=TaskStatus.DONE)
        self.db.add(task)
        self.db.flush()

        n1 = WorkflowNode(
            task_id=task.id,
            type=NodeType.SOURCE,
            label="Source Node",
            config_json={},
            status=NodeStatus.DONE,
        )
        n2 = WorkflowNode(
            task_id=task.id,
            type=NodeType.OUTPUT,
            label="Output Node",
            config_json={},
            status=NodeStatus.DONE,
        )
        self.db.add_all([n1, n2])
        self.db.flush()
        self.db.add(WorkflowEdge(task_id=task.id, from_node_id=n1.id, to_node_id=n2.id))

        r1 = ResultRow(
            task_id=task.id,
            fields_json={"company_name": "Acme Corp", "website": "https://acme.com"},
            source_url="https://acme.com/source",
            confidence=0.95,
            needs_review=False,
        )
        r2 = ResultRow(
            task_id=task.id,
            fields_json={"company_name": "Beta LLC", "website": "https://beta.com"},
            source_url="https://beta.com/source",
            confidence=0.60,
            needs_review=True,
        )
        self.db.add_all([r1, r2])
        self.db.commit()
        return task

    def test_get_tasks_history_list(self) -> None:
        task = self._seed_task_with_results()
        resp = self.client.get("/tasks")
        self.assertEqual(resp.status_code, 200)
        items = resp.json()
        self.assertIsInstance(items, list)
        matching = next((item for item in items if item["id"] == task.id), None)
        self.assertIsNotNone(matching)
        self.assertEqual(matching["prompt"], "Test endpoints task")
        self.assertEqual(matching["status"], "done")
        self.assertEqual(matching["result_count"], 2)

    def test_get_task_by_id(self) -> None:
        task = self._seed_task_with_results()
        resp = self.client.get(f"/tasks/{task.id}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["id"], task.id)
        self.assertEqual(len(data["nodes"]), 2)
        self.assertEqual(len(data["edges"]), 1)

        resp_404 = self.client.get("/tasks/non-existent-task-id")
        self.assertEqual(resp_404.status_code, 404)

    def test_get_task_results_pagination_and_filter(self) -> None:
        task = self._seed_task_with_results()

        # All results
        resp = self.client.get(f"/tasks/{task.id}/results?page=1&page_size=10")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["total"], 2)
        self.assertEqual(len(data["results"]), 2)
        self.assertEqual(data["page"], 1)
        self.assertEqual(data["page_size"], 10)

        # Filter needs_review=true
        resp_filtered = self.client.get(f"/tasks/{task.id}/results?needs_review=true")
        self.assertEqual(resp_filtered.status_code, 200)
        data_filtered = resp_filtered.json()
        self.assertEqual(data_filtered["total"], 1)
        self.assertEqual(len(data_filtered["results"]), 1)
        self.assertTrue(data_filtered["results"][0]["needs_review"])

        # Filter needs_review=false
        resp_filtered_false = self.client.get(f"/tasks/{task.id}/results?needs_review=false")
        self.assertEqual(resp_filtered_false.status_code, 200)
        data_filtered_false = resp_filtered_false.json()
        self.assertEqual(data_filtered_false["total"], 1)
        self.assertEqual(len(data_filtered_false["results"]), 1)
        self.assertFalse(data_filtered_false["results"][0]["needs_review"])

    def test_export_task_results(self) -> None:
        task = self._seed_task_with_results()

        # JSON export
        resp_json = self.client.get(f"/tasks/{task.id}/export?format=json")
        self.assertEqual(resp_json.status_code, 200)
        self.assertIn("application/json", resp_json.headers["content-type"])
        self.assertIn(f"loomai-export-{task.id}.json", resp_json.headers["content-disposition"])
        parsed_json = resp_json.json()
        self.assertEqual(len(parsed_json), 2)
        self.assertEqual(parsed_json[0]["fields"]["company_name"], "Acme Corp")

        # CSV export
        resp_csv = self.client.get(f"/tasks/{task.id}/export?format=csv")
        self.assertEqual(resp_csv.status_code, 200)
        self.assertIn("text/csv", resp_csv.headers["content-type"])
        self.assertIn(f"loomai-export-{task.id}.csv", resp_csv.headers["content-disposition"])
        reader = csv.DictReader(io.StringIO(resp_csv.text))
        rows = list(reader)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["company_name"], "Acme Corp")
        self.assertEqual(rows[0]["source_url"], "https://acme.com/source")

    def test_rerun_task(self) -> None:
        task = self._seed_task_with_results()

        with patch("app.routes.tasks.execute_task", return_value=None):
            resp = self.client.post(f"/tasks/{task.id}/rerun")
            self.assertEqual(resp.status_code, 202)
            self.assertEqual(resp.json(), {"status": "running"})

        self.db.expire_all()
        refreshed_task = self.db.get(Task, task.id)
        self.assertEqual(refreshed_task.status, TaskStatus.RUNNING)

        # Existing ResultRows should be cleared
        result_count = self.db.query(ResultRow).filter_by(task_id=task.id).count()
        self.assertEqual(result_count, 0)

        # Nodes should be reset to PENDING
        nodes = self.db.query(WorkflowNode).filter_by(task_id=task.id).all()
        for node in nodes:
            self.assertEqual(node.status, NodeStatus.PENDING)
            self.assertIsNone(node.started_at)
            self.assertIsNone(node.completed_at)
            self.assertIsNone(node.error_message)


if __name__ == "__main__":
    unittest.main()
