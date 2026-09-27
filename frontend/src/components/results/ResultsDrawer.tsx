import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';

import { useAppStore } from '../../store/useAppStore';
import { ResultRow } from '../../lib/types';
import { getExportUrl } from '../../lib/api';

export const ResultsDrawer: React.FC = () => {
  const currentTask = useAppStore((state) => state.currentTask);
  const results = useAppStore((state) => state.results);
  const resultsTotal = useAppStore((state) => state.resultsTotal);
  const isDrawerOpen = useAppStore((state) => state.isDrawerOpen);
  const setDrawerOpen = useAppStore((state) => state.setDrawerOpen);
  const resultsFilter = useAppStore((state) => state.resultsFilter);
  const setResultsFilter = useAppStore((state) => state.setResultsFilter);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [hoveredSourceUrl, setHoveredSourceUrl] = useState<string | null>(null);

  // Extract all distinct field keys from the collected results
  const fieldKeys = useMemo(() => {
    const keys: string[] = [];
    results.forEach((row) => {
      Object.keys(row.fields || {}).forEach((k) => {
        if (!keys.includes(k)) keys.push(k);
      });
    });
    return keys;
  }, [results]);

  // Construct TanStack table columns dynamically
  const columns = useMemo<ColumnDef<ResultRow>[]>(() => {
    const cols: ColumnDef<ResultRow>[] = [
      {
        id: 'status_flag',
        header: 'STATUS',
        size: 90,
        cell: ({ row }) => (
          <div className="flex items-center space-x-1.5">
            {row.original.needs_review ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-950/40 text-node-failed border border-red-900/40">
                REVIEW
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/40 text-node-done border border-emerald-900/40">
                VERIFIED
              </span>
            )}
          </div>
        ),
      },
    ];

    fieldKeys.forEach((key) => {
      cols.push({
        id: key,
        header: key.replace(/_/g, ' ').toUpperCase(),
        accessorFn: (row) => row.fields?.[key] ?? '',
        cell: ({ getValue }) => {
          const val = getValue() as any;
          if (val === null || val === undefined || val === '') {
            return <span className="text-gray-600 italic font-mono text-xs">--</span>;
          }
          return (
            <span className="font-mono text-xs text-gray-300 truncate max-w-[280px] block" title={String(val)}>
              {String(val)}
            </span>
          );
        },
      });
    });

    cols.push({
      id: 'confidence',
      header: 'CONFIDENCE',
      size: 130,
      accessorKey: 'confidence',
      cell: ({ row }) => {
        const conf = row.original.confidence;
        const pct = Math.round(conf * 100);
        let barColor = 'bg-emerald-500';
        if (pct < 70) barColor = 'bg-amber-500';
        if (pct < 50) barColor = 'bg-red-500';

        return (
          <div className="flex items-center space-x-2">
            <div className="w-16 h-1.5 bg-bg-border rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-gray-400">{conf.toFixed(2)}</span>
          </div>
        );
      },
    });

    cols.push({
      id: 'source_link',
      header: 'SOURCE',
      size: 80,
      cell: ({ row }) => (
        <a
          href={row.original.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-accent hover:underline flex items-center space-x-1"
          onMouseEnter={() => setHoveredSourceUrl(row.original.source_url)}
          onMouseLeave={() => setHoveredSourceUrl(null)}
          title={row.original.source_url}
        >
          <span>source ↗</span>
        </a>
      ),
    });

    return cols;
  }, [fieldKeys]);

  const table = useReactTable({
    data: results,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (!currentTask) return null;

  return (
    <>
      {/* Floating Toggle Button when Drawer is collapsed */}
      {!isDrawerOpen && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="absolute bottom-4 right-6 z-20 flex items-center space-x-2 bg-bg-surface hover:bg-bg-subtle text-gray-200 px-4 py-2 rounded border border-bg-border shadow-lg transition-all text-xs font-mono"
        >
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>SIGNALS DRAWER ({resultsTotal})</span>
          <span className="text-gray-400">↑</span>
        </button>
      )}

      {/* Spring Animated Results Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="absolute bottom-0 left-0 right-0 z-30 h-[48vh] bg-bg-surface border-t border-bg-border shadow-2xl flex flex-col"
          >
            {/* Drawer Header Rail */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-bg-subtle/70 border-b border-bg-border select-none">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-display font-semibold text-gray-100 tracking-wider">
                    COLLECTED SIGNALS
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-main text-accent border border-accent/20">
                    {resultsTotal} rows
                  </span>
                </div>

                {/* Filter Selector */}
                <div className="flex items-center space-x-1 bg-bg-main p-0.5 rounded border border-bg-border text-[11px] font-mono">
                  <button
                    onClick={() => setResultsFilter(null)}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      resultsFilter === null ? 'bg-bg-surface text-gray-100 font-medium' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    All ({resultsTotal})
                  </button>
                  <button
                    onClick={() => setResultsFilter(false)}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      resultsFilter === false ? 'bg-bg-surface text-emerald-400 font-medium' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Clean
                  </button>
                  <button
                    onClick={() => setResultsFilter(true)}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      resultsFilter === true ? 'bg-bg-surface text-node-failed font-medium' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Needs Review
                  </button>
                </div>
              </div>

              {/* Search, Export and Drawer Controls */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="filter columns..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="bg-bg-main border border-bg-border rounded px-2.5 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:border-accent w-48 placeholder-gray-600"
                />

                {/* Export Buttons */}
                <a
                  href={getExportUrl(currentTask.id, 'csv')}
                  download
                  className="flex items-center space-x-1 bg-bg-main hover:bg-bg-border text-gray-300 hover:text-gray-100 px-2.5 py-1 rounded border border-bg-border text-xs font-mono transition-colors"
                >
                  <span>CSV</span>
                  <span className="text-[10px] text-gray-500">↓</span>
                </a>
                <a
                  href={getExportUrl(currentTask.id, 'json')}
                  download
                  className="flex items-center space-x-1 bg-bg-main hover:bg-bg-border text-gray-300 hover:text-gray-100 px-2.5 py-1 rounded border border-bg-border text-xs font-mono transition-colors"
                >
                  <span>JSON</span>
                  <span className="text-[10px] text-gray-500">↓</span>
                </a>

                {/* Close Drawer Button */}
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="text-gray-400 hover:text-gray-100 p-1 rounded hover:bg-bg-border ml-2"
                  title="Collapse Drawer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Source URL Preview Tooltip Bar (per DESIGN_SYSTEM.md) */}
            {hoveredSourceUrl && (
              <div className="bg-bg-main px-4 py-1 text-[11px] font-mono text-gray-400 border-b border-bg-border flex items-center space-x-2 truncate">
                <span className="text-accent uppercase tracking-wider text-[10px]">Source Target:</span>
                <span className="text-gray-200 truncate">{hoveredSourceUrl}</span>
              </div>
            )}

            {/* Table Container */}
            <div className="flex-1 overflow-auto bg-bg-main">
              {results.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 select-none">
                  <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">
                    No signals collected yet
                  </div>
                  <div className="text-[11px] font-mono text-gray-600">
                    Execution in progress or filters yielded no matching records.
                  </div>
                </div>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 bg-bg-subtle border-b border-bg-border z-10">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-3 py-2 text-[10px] font-display font-semibold text-gray-400 tracking-wider uppercase border-r border-bg-border/30 last:border-r-0 cursor-pointer select-none hover:text-gray-200"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <div className="flex items-center space-x-1">
                              <span>
                                {flexRender(header.column.columnDef.header, header.getContext())}
                              </span>
                              <span>
                                {{
                                  asc: ' ↑',
                                  desc: ' ↓',
                                }[header.column.getIsSorted() as string] ?? null}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`border-b border-bg-border/30 transition-colors hover:bg-bg-subtle/80 ${
                          idx % 2 === 0 ? 'bg-bg-main' : 'bg-[#101317]'
                        }`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-3 py-2 border-r border-bg-border/20 last:border-r-0 whitespace-nowrap"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
