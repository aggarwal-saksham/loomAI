import asyncio
import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import NodeStatus, ResultRow, Task, TaskStatus, WorkflowEdge, WorkflowNode
from ..schemas import (
    PaginatedResultsResponse,
    ResultRowResponse,
    TaskCreate,
    TaskGraphResponse,
    TaskSummaryResponse,
    WorkflowEdgeResponse,
    WorkflowNodeResponse,
)
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


@router.get("", response_model=list[TaskSummaryResponse])
def list_tasks(db: Session = Depends(get_db)) -> list[TaskSummaryResponse]:
    rows = (
        db.query(
            Task.id,
            Task.prompt,
            Task.status,
            func.count(ResultRow.id).label("result_count"),
            Task.created_at,
        )
        .outerjoin(ResultRow, Task.id == ResultRow.task_id)
        .group_by(Task.id)
        .order_by(Task.created_at.desc())
        .all()
    )
    return [
        TaskSummaryResponse(
            id=row.id,
            prompt=row.prompt,
            status=row.status,
            result_count=row.result_count,
            created_at=row.created_at,
        )
        for row in rows
    ]


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


@router.get("/{task_id}", response_model=TaskGraphResponse)
def get_task(task_id: str, db: Session = Depends(get_db)) -> TaskGraphResponse:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
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
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        except (asyncio.CancelledError, GeneratorExit):
            pass
        finally:
            event_bus.unsubscribe(task_id, queue)

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{task_id}/results", response_model=PaginatedResultsResponse)
def get_task_results(
    task_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    needs_review: bool | None = Query(None),
    db: Session = Depends(get_db),
) -> PaginatedResultsResponse:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    query = db.query(ResultRow).filter(ResultRow.task_id == task_id)
    if needs_review is not None:
        query = query.filter(ResultRow.needs_review == needs_review)

    total = query.count()
    rows = (
        query.order_by(ResultRow.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return PaginatedResultsResponse(
        task_id=task_id,
        results=[ResultRowResponse.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{task_id}/export")
def export_task_results(
    task_id: str,
    format: str = Query("csv", pattern="^(csv|json)$"),
    db: Session = Depends(get_db),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    rows = (
        db.query(ResultRow)
        .filter(ResultRow.task_id == task_id)
        .order_by(ResultRow.created_at.asc())
        .all()
    )

    if format == "json":
        data = [
            {
                "id": r.id,
                "fields": r.fields_json,
                "source_url": r.source_url,
                "confidence": r.confidence,
                "needs_review": r.needs_review,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ]
        return Response(
            content=json.dumps(data, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="loomai-export-{task_id}.json"'},
        )

    # Format CSV: collect unique field keys preserving order
    field_keys: list[str] = []
    for r in rows:
        for k in r.fields_json.keys():
            if k not in field_keys:
                field_keys.append(k)

    headers = field_keys + ["source_url", "confidence", "needs_review", "created_at"]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    for r in rows:
        row_dict = {k: r.fields_json.get(k, "") for k in field_keys}
        row_dict["source_url"] = r.source_url
        row_dict["confidence"] = r.confidence
        row_dict["needs_review"] = r.needs_review
        row_dict["created_at"] = r.created_at.isoformat()
        writer.writerow(row_dict)

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="loomai-export-{task_id}.csv"'},
    )


@router.post("/{task_id}/rerun", status_code=status.HTTP_202_ACCEPTED)
async def rerun_task(task_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    db.query(ResultRow).filter(ResultRow.task_id == task_id).delete()

    nodes = db.query(WorkflowNode).filter(WorkflowNode.task_id == task_id).all()
    for node in nodes:
        node.status = NodeStatus.PENDING
        node.started_at = None
        node.completed_at = None
        node.error_message = None

    task.status = TaskStatus.RUNNING
    db.commit()

    asyncio.create_task(execute_task(task_id))
    return {"status": "running"}

