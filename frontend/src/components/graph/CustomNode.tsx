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
  pending: 'border-white/[0.06] shadow-neu-card',
  running: 'border-accent/80 shadow-neu-accent',
  done: 'border-emerald-500/50 shadow-neu-done',
  failed: 'border-red-500/50 shadow-neu-failed',
};

const STATUS_INDICATOR: Record<NodeStatus, { text: string; color: string; dot: string; glow: string }> = {
  pending: { text: 'PENDING', color: 'text-node-pending', dot: 'bg-node-pending', glow: '' },
  running: { text: 'RUNNING', color: 'text-accent font-semibold', dot: 'bg-accent animate-ping', glow: 'shadow-[0_0_8px_rgba(255,122,26,0.8)]' },
  done: { text: 'DONE', color: 'text-node-done', dot: 'bg-node-done', glow: 'shadow-[0_0_6px_rgba(63,167,114,0.8)]' },
  failed: { text: 'FAILED', color: 'text-node-failed', dot: 'bg-node-failed', glow: 'shadow-[0_0_6px_rgba(193,85,74,0.8)]' },
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
      className={`relative min-w-[210px] max-w-[270px] rounded-xl neu-card transition-all duration-200 ${
        STATUS_BORDER[nodeData.status]
      } ${isRunning ? 'node-pulse-running' : ''} ${isDone ? 'node-just-done' : ''} ${
        selected ? 'ring-2 ring-accent shadow-neu-accent' : ''
      } p-3.5 select-none text-left`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-[#12151B] !w-3 !h-3 !border-2 !border-[#2B3240] !rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.8)]"
      />

      {/* Top Header Row: Type chip and status */}
      <div className="flex items-center justify-between mb-2.5">
        <div
          className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[10px] tracking-wider uppercase font-mono neu-chip border ${typeMeta.tagBg} ${typeMeta.tagText}`}
        >
          <span>{typeMeta.symbol}</span>
          <span className="font-semibold">{typeMeta.label}</span>
        </div>
        <div className="flex items-center space-x-1.5 neu-slot px-2 py-0.5 rounded-full">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusMeta.dot} ${statusMeta.glow}`} />
          <span className={`text-[9px] font-mono tracking-tight ${statusMeta.color}`}>
            {statusMeta.text}
          </span>
        </div>
      </div>

      {/* Node Label / Description */}
      <div className="text-xs font-display font-medium text-gray-100 leading-tight mb-2 truncate tracking-wide">
        {nodeData.label}
      </div>

      {/* Node Config / Details in Debossed Bay */}
      {nodeData.config && Object.keys(nodeData.config).length > 0 && (
        <div className="text-[10px] font-mono text-gray-400 neu-inset px-2.5 py-1.5 rounded-lg truncate mb-1">
          {nodeData.config.connector && (
            <span>src: <span className="text-gray-200">{nodeData.config.connector}</span></span>
          )}
          {nodeData.config.fields && (
            <span>fields: <span className="text-gray-200">{nodeData.config.fields.slice(0, 2).join(', ')}{nodeData.config.fields.length > 2 ? '...' : ''}</span></span>
          )}
          {nodeData.config.queries && (
            <span>q: <span className="text-gray-200">{nodeData.config.queries[0]}</span></span>
          )}
          {nodeData.config.required_fields && (
            <span>req: <span className="text-gray-200">{nodeData.config.required_fields.join(', ')}</span></span>
          )}
          {nodeData.config.threshold !== undefined && (
            <span>th: <span className="text-gray-200">{nodeData.config.threshold}</span></span>
          )}
        </div>
      )}

      {/* Error message if failed */}
      {nodeData.error_message && (
        <div className="text-[10px] font-mono text-node-failed neu-inset bg-red-950/40 p-2 rounded-lg mt-1 break-words border-red-900/40">
          err: {nodeData.error_message}
        </div>
      )}

      {/* Running animated bar */}
      {isRunning && (
        <div className="absolute -bottom-[2px] left-2 right-2 h-[2px] neu-inset overflow-hidden rounded-full">
          <div className="h-full bg-accent animate-[pulse_1s_infinite] w-full shadow-[0_0_8px_#FF7A1A]" />
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-[#12151B] !w-3 !h-3 !border-2 !border-[#2B3240] !rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.8)]"
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
