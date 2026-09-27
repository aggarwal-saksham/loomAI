import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.utcnow()


class TaskStatus(str, enum.Enum):
    DRAFT = "draft"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class NodeType(str, enum.Enum):
    SOURCE = "source"
    FETCH = "fetch"
    EXTRACT = "extract"
    CLEAN = "clean"
    VALIDATE = "validate"
    OUTPUT = "output"


class NodeStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus), nullable=False, default=TaskStatus.DRAFT
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)


class WorkflowNode(Base):
    __tablename__ = "workflow_nodes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), nullable=False, index=True)
    type: Mapped[NodeType] = mapped_column(Enum(NodeType), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    config_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[NodeStatus] = mapped_column(
        Enum(NodeStatus), nullable=False, default=NodeStatus.PENDING
    )
    position_x: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    position_y: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)


class WorkflowEdge(Base):
    __tablename__ = "workflow_edges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), nullable=False, index=True)
    from_node_id: Mapped[str] = mapped_column(ForeignKey("workflow_nodes.id"), nullable=False)
    to_node_id: Mapped[str] = mapped_column(ForeignKey("workflow_nodes.id"), nullable=False)


class ResultRow(Base):
    __tablename__ = "result_rows"
    __table_args__ = (
        CheckConstraint("source_url <> ''", name="result_rows_source_url_not_empty"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id"), nullable=False, index=True)
    fields_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    source_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    needs_review: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
