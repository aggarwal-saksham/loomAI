import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

const QUICK_PROMPTS = [
  'Find 15 companies that sponsor student hackathons in fintech',
  'Collect open remote DevOps job listings posted this week with salary if available',
];

export const CommandBar: React.FC = () => {
  const [promptText, setPromptText] = useState('');
  const submitPrompt = useAppStore((state) => state.submitPrompt);
  const rerunTask = useAppStore((state) => state.rerunTask);
  const currentTask = useAppStore((state) => state.currentTask);
  const isCreating = useAppStore((state) => state.isCreating);
  const isRunning = useAppStore((state) => state.isRunning);
  const error = useAppStore((state) => state.error);
  const clearError = useAppStore((state) => state.clearError);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim() || isCreating || isRunning) return;
    submitPrompt(promptText.trim());
  };

  const handleSelectQuickPrompt = (p: string) => {
    setPromptText(p);
  };

  return (
    <div className="w-full bg-bg-surface border-b border-bg-border z-20 flex flex-col select-none">
      {/* Upper Terminal Bar */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-bg-border/40">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-accent rounded-sm rotate-45" />
            <span className="font-display font-bold text-sm tracking-wider text-gray-100 uppercase">
              loom<span className="text-accent">AI</span>
            </span>
          </div>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest border-l border-bg-border pl-3">
            SIGNAL TERMINAL v0.1
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {currentTask && (
            <div className="flex items-center space-x-2 text-xs font-mono">
              <span className="text-gray-500">TASK:</span>
              <span className="text-gray-300 truncate max-w-xs">{currentTask.id.slice(0, 8)}...</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${
                  currentTask.status === 'running'
                    ? 'bg-amber-950/40 text-accent border-accent/40 animate-pulse'
                    : currentTask.status === 'done'
                    ? 'bg-emerald-950/40 text-node-done border-emerald-800/40'
                    : currentTask.status === 'failed'
                    ? 'bg-red-950/40 text-node-failed border-red-800/40'
                    : 'bg-gray-800 text-gray-400 border-gray-700'
                }`}
              >
                {currentTask.status}
              </span>
              <button
                onClick={() => rerunTask()}
                disabled={isRunning}
                className="px-2 py-0.5 rounded bg-bg-main hover:bg-bg-border text-gray-300 hover:text-white border border-bg-border text-[11px] font-mono disabled:opacity-50"
              >
                ↺ Rerun
              </button>
            </div>
          )}

          <div className="flex items-center space-x-1.5 px-2 py-1 bg-bg-main rounded border border-bg-border text-[10px] font-mono text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-node-done" />
            <span>CONNECTORS ONLINE</span>
          </div>
        </div>
      </div>

      {/* Main Command Input Row */}
      <form onSubmit={handleSubmit} className="p-2.5 px-4 flex items-center space-x-2 bg-bg-surface">
        <span className="text-xs font-mono text-accent select-none font-bold">&gt;&gt;</span>
        <input
          type="text"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Mission directive: e.g. Find 15 companies that sponsor student hackathons in fintech..."
          disabled={isCreating || isRunning}
          className="flex-1 bg-bg-main border border-bg-border focus:border-accent rounded px-3 py-1.5 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none disabled:opacity-50 transition-colors"
        />

        <button
          type="submit"
          disabled={!promptText.trim() || isCreating || isRunning}
          className="bg-accent hover:bg-accent-hover text-black font-display font-semibold text-xs px-4 py-1.5 rounded disabled:opacity-40 disabled:hover:bg-accent transition-colors flex items-center space-x-1.5"
        >
          {isCreating ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              <span>PLANNING...</span>
            </>
          ) : isRunning ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              <span>EXECUTING...</span>
            </>
          ) : (
            <span>EXECUTE MISSION</span>
          )}
        </button>
      </form>

      {/* Quick Prompts Bar */}
      <div className="px-4 pb-2 flex items-center space-x-2 text-[10px] font-mono text-gray-500 overflow-x-auto">
        <span className="uppercase text-gray-600 font-bold shrink-0">Preset Directives:</span>
        {QUICK_PROMPTS.map((qp, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSelectQuickPrompt(qp)}
            className="shrink-0 px-2 py-0.5 rounded bg-bg-main hover:bg-bg-border text-gray-400 hover:text-gray-200 border border-bg-border/60 transition-colors truncate max-w-sm"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="px-4 py-1.5 bg-red-950/50 border-t border-red-900/50 text-node-failed text-xs font-mono flex items-center justify-between">
          <span>MISSION DIRECTIVE ERROR: {error}</span>
          <button onClick={clearError} className="text-gray-400 hover:text-white ml-4">
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
