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
  const allResults = useAppStore((state) => state.allResults);
  const isDrawerOpen = useAppStore((state) => state.isDrawerOpen);
  const setDrawerOpen = useAppStore((state) => state.setDrawerOpen);
  const resultsFilter = useAppStore((state) => state.resultsFilter);
  const setResultsFilter = useAppStore((state) => state.setResultsFilter);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [hoveredSourceUrl, setHoveredSourceUrl] = useState<string | null>(null);

  // Stable counts from complete task results
  const totalCount = allResults.length;
  const cleanCount = useMemo(() => allResults.filter((r) => !r.needs_review).length, [allResults]);
  const reviewCount = useMemo(() => allResults.filter((r) => r.needs_review).length, [allResults]);

  // Instant zero-latency filtered data
  const filteredData = useMemo(() => {
    if (resultsFilter === null) return allResults;
    return allResults.filter((r) => r.needs_review === resultsFilter);
  }, [allResults, resultsFilter]);

  // Extract all distinct field keys from all results (completely stable across filter switches)
  const fieldKeys = useMemo(() => {
    const keys: string[] = [];
    allResults.forEach((row) => {
      Object.keys(row.fields || {}).forEach((k) => {
        if (!keys.includes(k)) keys.push(k);
      });
    });
    return keys;
  }, [allResults]);

  // Construct TanStack table columns dynamically
  const columns = useMemo<ColumnDef<ResultRow>[]>(() => {
    const cols: ColumnDef<ResultRow>[] = [
      {
        id: 'status_flag',
        header: 'STATUS',
        size: 95,
        cell: ({ row }) => (
          <div className="flex items-center space-x-1.5">
            {row.original.needs_review ? (
              <span className="neu-slot px-2 py-0.5 rounded-full text-[9px] font-mono text-node-failed border border-red-900/40">
                REVIEW
              </span>
            ) : (
              <span className="neu-slot px-2 py-0.5 rounded-full text-[9px] font-mono text-node-done border border-emerald-900/40">
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
            <span className="font-mono text-xs text-gray-200 truncate max-w-[280px] block" title={String(val)}>
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
        let barColor = 'bg-emerald-500 shadow-[0_0_6px_rgba(63,167,114,0.8)]';
        if (pct < 70) barColor = 'bg-amber-500 shadow-[0_0_6px_rgba(255,122,26,0.8)]';
        if (pct < 50) barColor = 'bg-red-500 shadow-[0_0_6px_rgba(193,85,74,0.8)]';

        return (
          <div className="flex items-center space-x-2">
            <div className="w-16 h-2 neu-slot rounded-full overflow-hidden p-[1px]">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-gray-300 font-semibold">{conf.toFixed(2)}</span>
          </div>
        );
      },
    });

    cols.push({
      id: 'source_link',
      header: 'SOURCE',
      size: 85,
      cell: ({ row }) => (
        <a
          href={row.original.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono text-accent hover:text-accent-hover hover:underline inline-flex items-center space-x-1"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={() => setHoveredSourceUrl(row.original.source_url)}
          title={row.original.source_url}
        >
          <span>source ↗</span>
        </a>
      ),
    });

    return cols;
  }, [fieldKeys]);

  const table = useReactTable({
    data: filteredData,
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
          className="absolute bottom-5 right-6 z-20 flex items-center space-x-2.5 neu-btn text-gray-100 px-4 py-2.5 rounded-xl cursor-pointer shadow-neu-panel text-xs font-mono"
        >
          <span className="w-2 h-2 rounded-full bg-accent animate-ping shadow-[0_0_6px_#FF7A1A]" />
          <span className="font-semibold tracking-wide">SIGNALS DRAWER ({totalCount})</span>
          <span className="text-accent font-bold">↑</span>
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
            className="absolute bottom-0 left-0 right-0 z-30 h-[48vh] bg-[#141820] border-t border-black/60 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden"
          >
            {/* Drawer Header Rail */}
            <div className="flex items-center justify-between px-4 py-3 neu-plate border-b border-black/50 select-none shrink-0">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-display font-semibold text-gray-100 tracking-wider uppercase">
                    Collected Signals
                  </span>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full neu-slot text-accent font-semibold">
                    {totalCount} rows
                  </span>
                </div>

                {/* Filter Selector in Debossed Well */}
                <div className="flex items-center space-x-1 neu-inset p-1 rounded-xl text-[11px] font-mono">
                  <button
                    onClick={() => setResultsFilter(null)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      resultsFilter === null
                        ? 'neu-btn text-gray-100 font-semibold shadow-neu-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    onClick={() => setResultsFilter(false)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      resultsFilter === false
                        ? 'neu-btn text-emerald-400 font-semibold shadow-neu-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Clean ({cleanCount})
                  </button>
                  <button
                    onClick={() => setResultsFilter(true)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      resultsFilter === true
                        ? 'neu-btn text-node-failed font-semibold shadow-neu-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Needs Review ({reviewCount})
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
                  className="neu-input rounded-lg px-3 py-1.5 text-xs font-mono text-gray-200 focus:outline-none w-48 placeholder-gray-500"
                />

                {/* Export Buttons */}
                <a
                  href={getExportUrl(currentTask.id, 'csv')}
                  download
                  className="flex items-center space-x-1.5 neu-btn text-gray-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-mono transition-transform cursor-pointer"
                >
                  <span>CSV</span>
                  <span className="text-[10px] text-accent">↓</span>
                </a>
                <a
                  href={getExportUrl(currentTask.id, 'json')}
                  download
                  className="flex items-center space-x-1.5 neu-btn text-gray-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-mono transition-transform cursor-pointer"
                >
                  <span>JSON</span>
                  <span className="text-[10px] text-accent">↓</span>
                </a>

                {/* Close Drawer Button */}
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="neu-btn text-gray-400 hover:text-white p-1.5 rounded-lg ml-2 cursor-pointer"
                  title="Collapse Drawer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Stable Table Container */}
            <div
              className="flex-1 overflow-auto neu-inset-deep"
              onMouseLeave={() => setHoveredSourceUrl(null)}
            >
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 neu-plate border-b border-black/60 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-3.5 py-2.5 text-[10px] font-display font-semibold text-gray-300 tracking-wider uppercase border-r border-black/40 last:border-r-0 cursor-pointer select-none hover:text-accent transition-colors"
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
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={Math.max(columns.length, 1)}
                        className="px-6 py-14 text-center text-xs font-mono select-none"
                      >
                        <div className="flex flex-col items-center justify-center space-y-1.5">
                          <span className="text-gray-300 font-semibold uppercase tracking-wider text-xs">
                            {resultsFilter === true
                              ? 'No signals flagged for review'
                              : resultsFilter === false
                              ? 'No clean signals recorded'
                              : 'No signals collected yet'}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {resultsFilter === true
                              ? 'All collected signals satisfied required validation constraints and confidence thresholds.'
                              : 'Execution in progress or filters returned zero matching items.'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row, idx) => (
                      <tr
                        key={row.id}
                        onMouseEnter={() => setHoveredSourceUrl(row.original.source_url)}
                        className={`border-b border-black/30 transition-colors hover:bg-[#1B212B] ${
                          idx % 2 === 0 ? 'bg-[#0E1116]' : 'bg-[#12151C]'
                        }`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-3.5 py-2 border-r border-black/20 last:border-r-0 whitespace-nowrap"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Persistent Telemetry Status Footer (Never shifts table height!) */}
            <div className="h-7 px-4 neu-plate border-t border-black/50 flex items-center justify-between text-[11px] font-mono select-none shrink-0">
              <div className="flex items-center space-x-2 truncate max-w-3xl">
                <span className="text-accent uppercase tracking-wider text-[10px] font-semibold">Origin Telemetry:</span>
                <span className="text-gray-300 truncate">
                  {hoveredSourceUrl ? (
                    <a
                      href={hoveredSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline font-mono text-[11px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {hoveredSourceUrl}
                    </a>
                  ) : (
                    <span className="text-gray-500 italic">Hover over any record or source link to view origin URL</span>
                  )}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 font-mono shrink-0 uppercase tracking-widest pl-2">
                SIGNAL ORIGIN LINK
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
