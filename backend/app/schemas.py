from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from .models import NodeStatus, NodeType, TaskStatus


class TaskCreate(BaseModel):
    prompt: str = Field(min_length=3, max_length=4_000)


class WorkflowNodeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: NodeType
    label: str
    config: dict = Field(validation_alias="config_json", serialization_alias="config")
    status: NodeStatus
    position_x: float
    position_y: float
    started_at: datetime | None
    completed_at: datetime | None
    error_message: str | None


class WorkflowEdgeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    from_node_id: str
    to_node_id: str


class TaskGraphResponse(BaseModel):
    id: str
    prompt: str
    status: TaskStatus
    created_at: datetime
    nodes: list[WorkflowNodeResponse]
    edges: list[WorkflowEdgeResponse]


class TaskSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    prompt: str
    status: TaskStatus
    result_count: int
    created_at: datetime


class ResultRowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    fields: dict = Field(validation_alias="fields_json", serialization_alias="fields")
    source_url: str
    confidence: float
    needs_review: bool
    created_at: datetime


class PaginatedResultsResponse(BaseModel):
    task_id: str
    results: list[ResultRowResponse]
    total: int
    page: int
    page_size: int

