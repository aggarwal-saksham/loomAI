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
      <div className="w-12 h-full neu-plate border-r border-black/40 flex flex-col items-center py-4 select-none z-20">
        <button
          onClick={() => setLeftRailOpen(true)}
          className="neu-btn p-2 rounded-lg text-gray-400 hover:text-gray-100 cursor-pointer"
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
    <div className="w-72 h-full bg-[#13161D] border-r border-black/50 flex flex-col select-none z-20 transition-all shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
      {/* Rail Header */}
      <div className="p-3.5 neu-plate border-b border-black/40 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-display font-semibold tracking-wider text-gray-100 uppercase">
            Mission History
          </span>
          <span className="neu-slot text-[10px] font-mono px-2 py-0.5 rounded-full text-gray-400">
            {taskList.length}
          </span>
        </div>
        <button
          onClick={() => setLeftRailOpen(false)}
          className="neu-btn p-1.5 rounded-md text-gray-400 hover:text-gray-100 text-xs cursor-pointer"
          title="Collapse Rail"
        >
          ‹
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 neu-inset-deep">
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
                className={`p-3 rounded-xl cursor-pointer transition-all text-left group ${
                  isSelected
                    ? 'neu-card border-l-4 border-l-accent shadow-neu-card scale-[1.01]'
                    : 'bg-[#12151B] hover:neu-card border border-white/[0.03] text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`neu-slot text-[9px] font-mono px-2 py-0.5 rounded-full uppercase font-medium ${status.cls}`}
                  >
                    {status.label}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">{dateStr}</span>
                </div>

                <div className="text-xs font-mono text-gray-200 line-clamp-2 mb-2 group-hover:text-white leading-relaxed">
                  {task.prompt}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                  <span className="neu-slot px-2 py-0.5 rounded-md text-gray-400">{task.result_count} signals</span>
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        rerunTask();
                      }}
                      className="neu-btn px-2 py-0.5 rounded text-accent hover:text-white transition-colors cursor-pointer"
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
