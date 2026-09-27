import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import Task, TaskStatus, WorkflowEdge, WorkflowNode
from ..schemas import TaskCreate, TaskGraphResponse, WorkflowEdgeResponse, WorkflowNodeResponse
from ..workflow.planner import (
    PlannerConfigurationError,
    PlannerError,
    generate_workflow_plan,
)
from ..workflow.executor import event_bus, execute_task


router = APIRouter(prefix="/tasks", tags=["tasks"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def serialize_task(task: Task, db: Session) -> TaskGraphResponse:
    nodes = (
        db.query(WorkflowNode)
        .filter(WorkflowNode.task_id == task.id)
        .order_by(WorkflowNode.position_x)
        .all()
    )
    edges = db.query(WorkflowEdge).filter(WorkflowEdge.task_id == task.id).all()
    return TaskGraphResponse(
        id=task.id,
        prompt=task.prompt,
        status=task.status,
        created_at=task.created_at,
        nodes=[WorkflowNodeResponse.model_validate(node) for node in nodes],
        edges=[WorkflowEdgeResponse.model_validate(edge) for edge in edges],
    )


@router.post("", response_model=TaskGraphResponse, status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate, db: Session = Depends(get_db)) -> TaskGraphResponse:
    try:
        plan = await generate_workflow_plan(payload.prompt)
    except PlannerConfigurationError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    except PlannerError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error

    task = Task(prompt=payload.prompt, status=TaskStatus.DRAFT)
    db.add(task)
    db.flush()

    node_id_map: dict[str, str] = {}
    for index, node in enumerate(plan["nodes"]):
        record = WorkflowNode(
            task_id=task.id,
            type=node["type"],
            label=node["label"],
            config_json=node["config"],
            position_x=float(index * 220),
            position_y=float((index % 2) * 120),
        )
        db.add(record)
        db.flush()
        node_id_map[node["id"]] = record.id

    for edge in plan["edges"]:
        db.add(
            WorkflowEdge(
                task_id=task.id,
                from_node_id=node_id_map[edge["from"]],
                to_node_id=node_id_map[edge["to"]],
            )
        )

    db.commit()
    db.refresh(task)
    return serialize_task(task, db)


@router.post("/{task_id}/run", status_code=status.HTTP_202_ACCEPTED)
async def run_task(task_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if task.status == TaskStatus.RUNNING:
        return {"status": "running"}
    task.status = TaskStatus.RUNNING
    db.commit()
    asyncio.create_task(execute_task(task_id))
    return {"status": "running"}


@router.get("/{task_id}/stream")
async def stream_task(task_id: str):
    async def events():
        queue = event_bus.subscribe(task_id)
        try:
            while True:
                event = await queue.get()
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            event_bus.unsubscribe(task_id, queue)

    return StreamingResponse(events(), media_type="text/event-stream")
