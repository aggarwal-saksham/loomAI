import React, { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useAppStore } from '../../store/useAppStore';
import { CustomNode } from './CustomNode';

const nodeTypes: any = {
  custom: CustomNode,
};

export const WorkflowCanvas: React.FC = () => {
  const currentTask = useAppStore((state) => state.currentTask);
  const isCreating = useAppStore((state) => state.isCreating);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Convert task nodes and edges to React Flow format
  useEffect(() => {
    if (!currentTask) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const flowNodes: Node[] = currentTask.nodes.map((node) => ({
      id: node.id,
      type: 'custom',
      position: { x: node.position_x, y: node.position_y },
      data: {
        id: node.id,
        type: node.type,
        label: node.label,
        config: node.config,
        status: node.status,
        started_at: node.started_at,
        completed_at: node.completed_at,
        error_message: node.error_message,
      },
    }));

    const nodeStatusMap = new Map(currentTask.nodes.map((n) => [n.id, n.status]));

    const flowEdges: Edge[] = currentTask.edges.map((edge) => {
      const sourceStatus = nodeStatusMap.get(edge.from_node_id);
      let edgeClass = 'edge-pending';
      if (sourceStatus === 'running') {
        edgeClass = 'edge-running';
      } else if (sourceStatus === 'done') {
        edgeClass = 'edge-done';
      } else if (sourceStatus === 'failed') {
        edgeClass = 'edge-failed';
      }

      return {
        id: edge.id,
        source: edge.from_node_id,
        target: edge.to_node_id,
        animated: sourceStatus === 'running',
        className: edgeClass,
      };
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [currentTask, setNodes, setEdges]);

  if (isCreating) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-bg-main neu-inset-deep text-center p-6 select-none">
        <div className="w-16 h-16 neu-inset rounded-2xl flex items-center justify-center mb-5 border border-white/5 shadow-neu-inset">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
        <div className="text-sm font-display font-semibold text-gray-100 uppercase tracking-widest mb-1.5">
          Synthesizing Workflow DAG
        </div>
        <div className="text-xs font-mono text-gray-500">
          Validating against workflow schema & configuring sources...
        </div>
      </div>
    );
  }

  if (!currentTask) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-bg-main neu-inset-deep text-center p-6 select-none">
        <div className="p-8 rounded-2xl neu-card max-w-md flex flex-col items-center border border-white/5">
          <div className="w-14 h-14 neu-slot rounded-xl flex items-center justify-center text-2xl text-accent/80 mb-4 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.8)]">
            ⧉
          </div>
          <div className="text-sm font-display font-semibold text-gray-100 uppercase tracking-widest mb-2">
            Tactile Terminal Offline
          </div>
          <div className="text-xs font-mono text-gray-400 leading-relaxed">
            Enter a data intelligence prompt above to synthesize an automated DAG pipeline, or select a previous run from the history rail.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-bg-main neu-inset-deep overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.2}
          color="#1E2430"
          className="bg-transparent"
        />
        <Controls
          showInteractive={false}
          className="!bg-[#161A22] !border !border-white/5 !rounded-lg !shadow-neu-card !fill-gray-300 [&>button]:!bg-[#1A1F29] [&>button]:!border-b [&>button]:!border-black/50 [&>button]:!text-gray-300 [&>button:hover]:!bg-[#222835]"
        />
      </ReactFlow>
    </div>
  );
};
