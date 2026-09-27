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
      <div className="w-full h-full flex flex-col items-center justify-center bg-bg-main text-center p-6 select-none">
        <div className="w-12 h-12 border-2 border-accent/20 border-t-accent rounded-full animate-spin mb-4" />
        <div className="text-sm font-display text-gray-200 uppercase tracking-widest mb-1">
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
      <div className="w-full h-full flex flex-col items-center justify-center bg-bg-main text-center p-6 select-none border border-dashed border-bg-border/40 rounded-lg m-2">
        <div className="text-3xl text-gray-600 mb-3 font-mono">⧉</div>
        <div className="text-sm font-display text-gray-400 uppercase tracking-widest mb-1">
          Signal Intelligence Terminal Offline
        </div>
        <div className="text-xs font-mono text-gray-600 max-w-md">
          Enter a data intelligence prompt above to synthesize an automated DAG pipeline, or select a previous run from the history rail.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-bg-main overflow-hidden">
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
          gap={20}
          size={1}
          color="#222730"
          className="bg-bg-main"
        />
        <Controls
          showInteractive={false}
          className="!bg-bg-surface !border-bg-border !fill-gray-300 [&>button]:!bg-bg-surface [&>button]:!border-bg-border [&>button:hover]:!bg-bg-subtle"
        />
      </ReactFlow>
    </div>
  );
};
