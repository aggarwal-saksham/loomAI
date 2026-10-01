import { PaginatedResults, TaskGraph, TaskSummary } from './types';

export const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function createTask(prompt: string): Promise<TaskGraph> {
  const response = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to create task' }));
    throw new Error(errorData.detail || 'Failed to create task');
  }
  return response.json();
}

export async function runTask(taskId: string): Promise<{ status: string }> {
  const response = await fetch(`${BASE_URL}/tasks/${taskId}/run`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to execute task' }));
    throw new Error(errorData.detail || 'Failed to execute task');
  }
  return response.json();
}

export async function getTask(taskId: string): Promise<TaskGraph> {
  const response = await fetch(`${BASE_URL}/tasks/${taskId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch task ${taskId}`);
  }
  return response.json();
}

export async function listTasks(): Promise<TaskSummary[]> {
  const response = await fetch(`${BASE_URL}/tasks`);
  if (!response.ok) {
    throw new Error('Failed to fetch task list');
  }
  return response.json();
}

export async function getTaskResults(
  taskId: string,
  page = 1,
  pageSize = 50,
  needsReview?: boolean
): Promise<PaginatedResults> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (needsReview !== undefined) {
    params.set('needs_review', String(needsReview));
  }
  const response = await fetch(`${BASE_URL}/tasks/${taskId}/results?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch results for task ${taskId}`);
  }
  return response.json();
}

export async function rerunTask(taskId: string): Promise<{ status: string }> {
  const response = await fetch(`${BASE_URL}/tasks/${taskId}/rerun`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to rerun task' }));
    throw new Error(errorData.detail || 'Failed to rerun task');
  }
  return response.json();
}

export function getExportUrl(taskId: string, format: 'csv' | 'json'): string {
  return `${BASE_URL}/tasks/${taskId}/export?format=${format}`;
}
