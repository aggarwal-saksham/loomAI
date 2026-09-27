import React, { useEffect, useCallback } from 'react';
import { CommandBar } from './components/CommandBar';
import { HistoryRail } from './components/history/HistoryRail';
import { WorkflowCanvas } from './components/graph/WorkflowCanvas';
import { ResultsDrawer } from './components/results/ResultsDrawer';
import { useAppStore } from './store/useAppStore';
import { useSSE } from './lib/useSSE';
import { NodeEvent } from './lib/types';

export const App: React.FC = () => {
  const currentTask = useAppStore((state) => state.currentTask);
  const isRunning = useAppStore((state) => state.isRunning);
  const updateNodeStatus = useAppStore((state) => state.updateNodeStatus);
  const loadTasks = useAppStore((state) => state.loadTasks);

  // SSE event callback
  const handleNodeEvent = useCallback(
    (event: NodeEvent) => {
      updateNodeStatus(event.node_id, event.status, event.error);
    },
    [updateNodeStatus]
  );

  // Connect SSE when currentTask is running
  const streamingTaskId = isRunning && currentTask ? currentTask.id : null;
  useSSE(streamingTaskId, handleNodeEvent);

  // Initial load
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-main text-gray-200 overflow-hidden font-mono">
      {/* Top Command Bar */}
      <CommandBar />

      {/* Main Terminal Body: Asymmetric 3-zone layout */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Zone 1: Collapsible History Left Rail */}
        <HistoryRail />

        {/* Zone 2: Dominant Center Graph Canvas */}
        <main className="flex-1 relative h-full w-full overflow-hidden bg-bg-main">
          <WorkflowCanvas />

          {/* Zone 3: Bottom Results Drawer (spring physics) */}
          <ResultsDrawer />
        </main>
      </div>
    </div>
  );
};

export default App;
