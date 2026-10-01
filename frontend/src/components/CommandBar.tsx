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
    <div className="w-full neu-plate z-20 flex flex-col select-none relative">
      {/* Upper Terminal Bar */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-black/40">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 neu-chip px-2.5 py-1 rounded-md">
            <span className="w-2.5 h-2.5 bg-accent rounded-sm rotate-45 shadow-[0_0_8px_rgba(255,122,26,0.6)]" />
            <span className="font-display font-bold text-sm tracking-wider text-gray-100 uppercase">
              loom<span className="text-accent">AI</span>
            </span>
          </div>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest pl-2">
            TACTILE TERMINAL v0.2
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {currentTask && (
            <div className="flex items-center space-x-2 text-xs font-mono">
              <span className="text-gray-500">TASK:</span>
              <span className="text-gray-300 truncate max-w-xs">{currentTask.id.slice(0, 8)}...</span>
              <span
                className={`neu-slot px-2.5 py-1 rounded text-[10px] font-mono uppercase font-semibold flex items-center space-x-1.5 ${
                  currentTask.status === 'running'
                    ? 'text-accent shadow-[0_0_10px_rgba(255,122,26,0.3)] animate-pulse'
                    : currentTask.status === 'done'
                    ? 'text-node-done shadow-[0_0_10px_rgba(63,167,114,0.25)]'
                    : currentTask.status === 'failed'
                    ? 'text-node-failed shadow-[0_0_10px_rgba(193,85,74,0.3)]'
                    : 'text-gray-400'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    currentTask.status === 'running'
                      ? 'bg-accent animate-ping'
                      : currentTask.status === 'done'
                      ? 'bg-node-done'
                      : currentTask.status === 'failed'
                      ? 'bg-node-failed'
                      : 'bg-gray-500'
                  }`}
                />
                <span>{currentTask.status}</span>
              </span>
              <button
                onClick={() => rerunTask()}
                disabled={isRunning}
                className="neu-btn px-2.5 py-1 rounded text-gray-300 hover:text-white text-[11px] font-mono disabled:opacity-40"
              >
                ↺ Rerun
              </button>
            </div>
          )}

          <div className="neu-slot flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-mono text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-node-done shadow-[0_0_6px_rgba(63,167,114,0.8)]" />
            <span className="tracking-wide">CONNECTORS ONLINE</span>
          </div>
        </div>
      </div>

      {/* Main Command Input Row */}
      <form onSubmit={handleSubmit} className="p-3 px-4 flex items-center space-x-3 bg-bg-surface/50">
        <div className="flex-1 flex items-center space-x-2 neu-input rounded-lg px-3 py-1.5">
          <span className="text-xs font-mono text-accent select-none font-bold tracking-tight">&gt;&gt;</span>
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Mission directive: e.g. Find 15 companies that sponsor student hackathons in fintech..."
            disabled={isCreating || isRunning}
            className="flex-1 bg-transparent text-xs font-mono text-gray-100 placeholder-gray-500 focus:outline-none disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={!promptText.trim() || isCreating || isRunning}
          className="neu-btn-accent text-black font-display font-semibold text-xs px-5 py-2 rounded-lg disabled:opacity-40 disabled:pointer-events-none flex items-center space-x-2 cursor-pointer"
        >
          {isCreating ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              <span>PLANNING...</span>
            </>
          ) : isRunning ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              <span>EXECUTING...</span>
            </>
          ) : (
            <span>EXECUTE MISSION</span>
          )}
        </button>
      </form>

      {/* Quick Prompts Bar */}
      <div className="px-4 pb-2.5 flex items-center space-x-2 text-[10px] font-mono text-gray-500 overflow-x-auto">
        <span className="uppercase text-gray-500 font-bold shrink-0 tracking-wider">Directives:</span>
        {QUICK_PROMPTS.map((qp, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSelectQuickPrompt(qp)}
            className="neu-btn shrink-0 px-2.5 py-1 rounded text-gray-400 hover:text-gray-100 truncate max-w-sm transition-transform cursor-pointer"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="px-4 py-2 bg-red-950/60 border-t border-red-900/60 text-node-failed text-xs font-mono flex items-center justify-between shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
          <span className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-node-failed animate-ping" />
            <span>MISSION DIRECTIVE ERROR: {error}</span>
          </span>
          <button onClick={clearError} className="neu-btn text-gray-400 hover:text-white px-2 py-0.5 rounded text-[11px]">
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
