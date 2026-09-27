import { create } from 'zustand';
import { NodeStatus, ResultRow, TaskGraph, TaskSummary } from '../lib/types';
import * as api from '../lib/api';

interface AppState {
  currentTask: TaskGraph | null;
  taskList: TaskSummary[];
  results: ResultRow[];
  resultsTotal: number;
  resultsPage: number;
  resultsFilter: boolean | null;
  resultsSearch: string;
  isLeftRailOpen: boolean;
  isDrawerOpen: boolean;
  isLoading: boolean;
  isCreating: boolean;
  isRunning: boolean;
  error: string | null;

  setLeftRailOpen: (open: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
  setResultsFilter: (filter: boolean | null) => void;
  setResultsSearch: (query: string) => void;
  setCurrentTask: (task: TaskGraph | null) => void;
  updateNodeStatus: (nodeId: string, status: NodeStatus, error?: string | null) => void;
  clearError: () => void;

  loadTasks: () => Promise<void>;
  selectTask: (taskId: string) => Promise<void>;
  submitPrompt: (prompt: string) => Promise<void>;
  runTask: () => Promise<void>;
  rerunTask: () => Promise<void>;
  loadResults: (page?: number) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentTask: null,
  taskList: [],
  results: [],
  resultsTotal: 0,
  resultsPage: 1,
  resultsFilter: null,
  resultsSearch: '',
  isLeftRailOpen: false, // collapsed by default per DESIGN_SYSTEM.md
  isDrawerOpen: false,
  isLoading: false,
  isCreating: false,
  isRunning: false,
  error: null,

  setLeftRailOpen: (open) => set({ isLeftRailOpen: open }),
  setDrawerOpen: (open) => set({ isDrawerOpen: open }),
  setResultsFilter: (filter) => {
    set({ resultsFilter: filter, resultsPage: 1 });
    get().loadResults(1);
  },
  setResultsSearch: (query) => set({ resultsSearch: query }),
  setCurrentTask: (task) => set({ currentTask: task }),
  clearError: () => set({ error: null }),

  updateNodeStatus: (nodeId, status, errorMessage) => {
    const { currentTask } = get();
    if (!currentTask) return;

    let hasOutputDone = false;
    let hasOutputFailed = false;

    const updatedNodes = currentTask.nodes.map((node) => {
      if (node.id === nodeId) {
        if (node.type === 'output') {
          if (status === 'done') hasOutputDone = true;
          if (status === 'failed') hasOutputFailed = true;
        }
        return {
          ...node,
          status,
          error_message: errorMessage ?? node.error_message,
          completed_at: status === 'done' || status === 'failed' ? new Date().toISOString() : node.completed_at,
          started_at: status === 'running' ? new Date().toISOString() : node.started_at,
        };
      }
      return node;
    });

    let taskStatus = currentTask.status;
    if (hasOutputDone) taskStatus = 'done';
    else if (hasOutputFailed) taskStatus = 'failed';

    set({
      currentTask: {
        ...currentTask,
        status: taskStatus,
        nodes: updatedNodes,
      },
    });

    if (hasOutputDone) {
      set({ isRunning: false, isDrawerOpen: true });
      get().loadResults(1);
      get().loadTasks();
    } else if (hasOutputFailed) {
      set({ isRunning: false });
      get().loadTasks();
    }
  },

  loadTasks: async () => {
    try {
      const list = await api.listTasks();
      set({ taskList: list });
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
    }
  },

  selectTask: async (taskId) => {
    set({ isLoading: true, error: null });
    try {
      const task = await api.getTask(taskId);
      set({ currentTask: task, isDrawerOpen: task.status === 'done', isLoading: false });
      if (task.status === 'done') {
        get().loadResults(1);
      } else {
        set({ results: [], resultsTotal: 0 });
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  submitPrompt: async (prompt) => {
    set({ isCreating: true, error: null, results: [], resultsTotal: 0, isDrawerOpen: false });
    try {
      const graph = await api.createTask(prompt);
      set({ currentTask: graph, isCreating: false });
      await get().loadTasks();
      // Automatically trigger execution after plan is created
      await get().runTask();
    } catch (err: any) {
      set({ error: err.message, isCreating: false });
    }
  },

  runTask: async () => {
    const { currentTask } = get();
    if (!currentTask) return;

    set({ isRunning: true, error: null });
    try {
      await api.runTask(currentTask.id);
      set({
        currentTask: {
          ...currentTask,
          status: 'running',
        },
      });
      await get().loadTasks();
    } catch (err: any) {
      set({ error: err.message, isRunning: false });
    }
  },

  rerunTask: async () => {
    const { currentTask } = get();
    if (!currentTask) return;

    set({ isRunning: true, error: null, results: [], resultsTotal: 0, isDrawerOpen: false });
    try {
      await api.rerunTask(currentTask.id);
      // Reset local node statuses
      const resetNodes = currentTask.nodes.map((n) => ({
        ...n,
        status: 'pending' as NodeStatus,
        started_at: null,
        completed_at: null,
        error_message: null,
      }));
      set({
        currentTask: {
          ...currentTask,
          status: 'running',
          nodes: resetNodes,
        },
      });
      await get().loadTasks();
    } catch (err: any) {
      set({ error: err.message, isRunning: false });
    }
  },

  loadResults: async (page = 1) => {
    const { currentTask, resultsFilter } = get();
    if (!currentTask) return;

    try {
      const data = await api.getTaskResults(
        currentTask.id,
        page,
        50,
        resultsFilter === null ? undefined : resultsFilter
      );
      set({
        results: data.results,
        resultsTotal: data.total,
        resultsPage: data.page,
      });
    } catch (err: any) {
      console.error('Failed to load results:', err);
    }
  },
}));
