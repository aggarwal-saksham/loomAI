import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  draft: { label: 'DRAFT', cls: 'bg-gray-800 text-gray-400 border-gray-700' },
  running: { label: 'RUNNING', cls: 'bg-amber-950/60 text-accent border-accent/40 animate-pulse' },
  done: { label: 'DONE', cls: 'bg-emerald-950/50 text-node-done border-emerald-800/40' },
  failed: { label: 'FAILED', cls: 'bg-red-950/50 text-node-failed border-red-800/40' },
};

export const HistoryRail: React.FC = () => {
  const taskList = useAppStore((state) => state.taskList);
  const currentTask = useAppStore((state) => state.currentTask);
  const isLeftRailOpen = useAppStore((state) => state.isLeftRailOpen);
  const setLeftRailOpen = useAppStore((state) => state.setLeftRailOpen);
  const selectTask = useAppStore((state) => state.selectTask);
  const rerunTask = useAppStore((state) => state.rerunTask);
  const loadTasks = useAppStore((state) => state.loadTasks);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  if (!isLeftRailOpen) {
    return (
      <div className="w-12 h-full bg-bg-surface border-r border-bg-border flex flex-col items-center py-4 select-none z-20">
        <button
          onClick={() => setLeftRailOpen(true)}
          className="p-2 rounded hover:bg-bg-subtle text-gray-400 hover:text-gray-100 transition-colors"
          title="Expand Mission History"
        >
          <span className="text-sm">≡</span>
        </button>
        <div className="mt-8 text-[10px] font-mono tracking-widest text-gray-500 uppercase -rotate-90 whitespace-nowrap">
          MISSIONS ({taskList.length})
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 h-full bg-bg-surface border-r border-bg-border flex flex-col select-none z-20 transition-all">
      {/* Rail Header */}
      <div className="p-3 border-b border-bg-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-display font-semibold tracking-wider text-gray-200 uppercase">
            Mission History
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-main text-gray-400 border border-bg-border">
            {taskList.length}
          </span>
        </div>
        <button
          onClick={() => setLeftRailOpen(false)}
          className="p-1 rounded hover:bg-bg-subtle text-gray-400 hover:text-gray-100 transition-colors text-xs"
          title="Collapse Rail"
        >
          ‹
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto divide-y divide-bg-border/30">
        {taskList.length === 0 ? (
          <div className="p-4 text-center text-xs font-mono text-gray-500">
            No past missions recorded.
          </div>
        ) : (
          taskList.map((task) => {
            const isSelected = currentTask?.id === task.id;
            const status = STATUS_CHIP[task.status] || STATUS_CHIP.draft;
            const dateStr = new Date(task.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={task.id}
                onClick={() => selectTask(task.id)}
                className={`p-3 cursor-pointer transition-colors text-left group ${
                  isSelected
                    ? 'bg-bg-subtle border-l-2 border-accent'
                    : 'hover:bg-bg-subtle/50 border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase ${status.cls}`}
                  >
                    {status.label}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">{dateStr}</span>
                </div>

                <div className="text-xs font-mono text-gray-300 line-clamp-2 mb-2 group-hover:text-gray-100">
                  {task.prompt}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
                  <span>{task.result_count} signals</span>
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        rerunTask();
                      }}
                      className="px-1.5 py-0.5 rounded bg-bg-main hover:bg-bg-border text-accent hover:text-accent-hover border border-accent/20 transition-colors"
                      title="Re-run Mission"
                    >
                      ↺ Re-run
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
