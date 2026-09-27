import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { NodeType, NodeStatus } from '../../lib/types';

interface CustomNodeData {
  id: string;
  type: NodeType;
  label: string;
  config: Record<string, any>;
  status: NodeStatus;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

const TYPE_CONFIG: Record<
  NodeType,
  { label: string; tagBg: string; tagText: string; symbol: string }
> = {
  source: {
    label: 'SOURCE',
    tagBg: 'bg-amber-950/40 border-amber-600/40',
    tagText: 'text-amber-400',
    symbol: '⚡',
  },
  fetch: {
    label: 'FETCH',
    tagBg: 'bg-cyan-950/40 border-cyan-600/40',
    tagText: 'text-cyan-400',
    symbol: '↓',
  },
  extract: {
    label: 'EXTRACT',
    tagBg: 'bg-emerald-950/40 border-emerald-600/40',
    tagText: 'text-emerald-400',
    symbol: '✦',
  },
  clean: {
    label: 'CLEAN',
    tagBg: 'bg-blue-950/40 border-blue-600/40',
    tagText: 'text-blue-400',
    symbol: '⊘',
  },
  validate: {
    label: 'VALIDATE',
    tagBg: 'bg-purple-950/40 border-purple-600/40',
    tagText: 'text-purple-400',
    symbol: '✓',
  },
  output: {
    label: 'OUTPUT',
    tagBg: 'bg-orange-950/40 border-orange-600/40',
    tagText: 'text-orange-400',
    symbol: '⊞',
  },
};

const STATUS_BORDER: Record<NodeStatus, string> = {
  pending: 'border-[#2B3038]',
  running: 'border-accent shadow-[0_0_12px_rgba(255,122,26,0.35)]',
  done: 'border-[#3FA772]/70',
  failed: 'border-[#C1554A]',
};

const STATUS_INDICATOR: Record<NodeStatus, { text: string; color: string; dot: string }> = {
  pending: { text: 'PENDING', color: 'text-node-pending', dot: 'bg-node-pending' },
  running: { text: 'RUNNING', color: 'text-accent font-semibold', dot: 'bg-accent animate-ping' },
  done: { text: 'DONE', color: 'text-node-done', dot: 'bg-node-done' },
  failed: { text: 'FAILED', color: 'text-node-failed', dot: 'bg-node-failed' },
};

export const CustomNode = memo(({ data, selected }: NodeProps<any>) => {
  const nodeData = data as CustomNodeData;
  const typeMeta = TYPE_CONFIG[nodeData.type] || {
    label: nodeData.type.toUpperCase(),
    tagBg: 'bg-gray-800 border-gray-700',
    tagText: 'text-gray-300',
    symbol: '•',
  };
  const statusMeta = STATUS_INDICATOR[nodeData.status] || STATUS_INDICATOR.pending;
  const isRunning = nodeData.status === 'running';
  const isDone = nodeData.status === 'done';

  return (
    <div
      className={`relative min-w-[200px] max-w-[260px] rounded bg-bg-surface border transition-all duration-200 ${
        STATUS_BORDER[nodeData.status]
      } ${isRunning ? 'node-pulse-running' : ''} ${isDone ? 'node-just-done' : ''} ${
        selected ? 'ring-1 ring-accent' : ''
      } p-3 select-none text-left`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-[#2B3038] !w-2.5 !h-2.5 !border !border-bg-surface"
      />

      {/* Top Header Row: Type chip and status */}
      <div className="flex items-center justify-between mb-2">
        <div
          className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] tracking-wider uppercase font-mono border ${typeMeta.tagBg} ${typeMeta.tagText}`}
        >
          <span>{typeMeta.symbol}</span>
          <span>{typeMeta.label}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
          <span className={`text-[10px] font-mono tracking-tight ${statusMeta.color}`}>
            {statusMeta.text}
          </span>
        </div>
      </div>

      {/* Node Label / Description */}
      <div className="text-xs font-display font-medium text-gray-200 leading-tight mb-2 truncate">
        {nodeData.label}
      </div>

      {/* Node Config / Details */}
      {nodeData.config && Object.keys(nodeData.config).length > 0 && (
        <div className="text-[10px] font-mono text-gray-400 bg-bg-main/60 px-2 py-1 rounded border border-bg-border/40 truncate mb-1">
          {nodeData.config.connector && (
            <span>src: {nodeData.config.connector}</span>
          )}
          {nodeData.config.fields && (
            <span>fields: {nodeData.config.fields.slice(0, 2).join(', ')}{nodeData.config.fields.length > 2 ? '...' : ''}</span>
          )}
          {nodeData.config.queries && (
            <span>q: {nodeData.config.queries[0]}</span>
          )}
          {nodeData.config.required_fields && (
            <span>req: {nodeData.config.required_fields.join(', ')}</span>
          )}
          {nodeData.config.threshold !== undefined && (
            <span>th: {nodeData.config.threshold}</span>
          )}
        </div>
      )}

      {/* Error message if failed */}
      {nodeData.error_message && (
        <div className="text-[10px] font-mono text-node-failed bg-red-950/30 p-1.5 rounded border border-red-900/50 mt-1 break-words">
          err: {nodeData.error_message}
        </div>
      )}

      {/* Running animated bar */}
      {isRunning && (
        <div className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-bg-border overflow-hidden rounded-b">
          <div className="h-full bg-accent animate-[pulse_1s_infinite] w-full" />
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-[#2B3038] !w-2.5 !h-2.5 !border !border-bg-surface"
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
