import asyncio
from collections import defaultdict
from datetime import datetime

from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import NodeStatus, Task, TaskStatus, WorkflowEdge, WorkflowNode
from .nodes import run_node


class TaskEventBus:
    def __init__(self) -> None:
        self.subscribers: dict[str, list[asyncio.Queue]] = defaultdict(list)

    def subscribe(self, task_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        self.subscribers[task_id].append(queue)
        return queue

    def unsubscribe(self, task_id: str, queue: asyncio.Queue) -> None:
        if queue in self.subscribers[task_id]:
            self.subscribers[task_id].remove(queue)

    async def publish(self, task_id: str, node_id: str, status: object, error: str | None = None) -> None:
        status_val = status.value if hasattr(status, "value") else str(status)
        clean_error = error
        if clean_error and "key=" in clean_error:
            import re
            clean_error = re.sub(r"key=[A-Za-z0-9_\-\.]+", "key=[REDACTED]", clean_error)
        event = {"node_id": node_id, "status": status_val, "timestamp": datetime.utcnow().isoformat(), "error": clean_error}
        for queue in list(self.subscribers[task_id]):
            await queue.put(event)


event_bus = TaskEventBus()


async def execute_task(task_id: str) -> None:
    db = SessionLocal()
    try:
        task = db.get(Task, task_id)
        if not task:
            return
        nodes = db.query(WorkflowNode).filter_by(task_id=task_id).all()
        edges = db.query(WorkflowEdge).filter_by(task_id=task_id).all()
        parents: dict[str, set[str]] = {node.id: set() for node in nodes}
        for edge in edges:
            parents[edge.to_node_id].add(edge.from_node_id)
        data: dict[str, object] = {}
        pending = {node.id: node for node in nodes}
        completed: set[str] = set()

        while pending:
            ready = [node for node_id, node in pending.items() if parents[node_id] <= completed]
            if not ready:
                break
            for node in ready:
                pending.pop(node.id)
                node.status, node.started_at = NodeStatus.RUNNING, datetime.utcnow()
                db.commit()
                await event_bus.publish(task_id, node.id, node.status)
                try:
                    for attempt in range(2):
                        try:
                            data[node.id] = await run_node(node, parents[node.id], data, db)
                            break
                        except Exception:
                            if attempt:
                                raise
                    node.status = NodeStatus.DONE
                    completed.add(node.id)
                except Exception as error:
                    node.status, node.error_message = NodeStatus.FAILED, str(error)
                node.completed_at = datetime.utcnow()
                db.commit()
                await event_bus.publish(task_id, node.id, node.status, node.error_message)

        output = next((node for node in nodes if node.type.value == "output"), None)
        task.status = TaskStatus.DONE if output and output.status == NodeStatus.DONE else TaskStatus.FAILED
        db.commit()
    finally:
        db.close()
