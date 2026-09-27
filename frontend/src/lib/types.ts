export type NodeType = 'source' | 'fetch' | 'extract' | 'clean' | 'validate' | 'output';

export type NodeStatus = 'pending' | 'running' | 'done' | 'failed';

export type TaskStatus = 'draft' | 'running' | 'done' | 'failed';

export interface WorkflowNodeData {
  id: string;
  type: NodeType;
  label: string;
  config: Record<string, any>;
  status: NodeStatus;
  position_x: number;
  position_y: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export interface WorkflowEdgeData {
  id: string;
  from_node_id: string;
  to_node_id: string;
}

export interface TaskGraph {
  id: string;
  prompt: string;
  status: TaskStatus;
  created_at: string;
  nodes: WorkflowNodeData[];
  edges: WorkflowEdgeData[];
}

export interface TaskSummary {
  id: string;
  prompt: string;
  status: TaskStatus;
  result_count: number;
  created_at: string;
}

export interface ResultRow {
  id: string;
  task_id: string;
  fields: Record<string, any>;
  source_url: string;
  confidence: number;
  needs_review: boolean;
  created_at: string;
}

export interface PaginatedResults {
  task_id: string;
  results: ResultRow[];
  total: number;
  page: number;
  page_size: number;
}

export interface NodeEvent {
  node_id: string;
  status: NodeStatus;
  timestamp: string;
  error?: string | null;
}
