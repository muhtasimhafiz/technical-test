"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

/* ────────────────────────────────────
   Types
   ──────────────────────────────────── */
export interface OddsEntry {
  runner: string;
  bookkeeper: string;
  fixedP: number;
  fixedW: number;
}

/* ────────────────────────────────────
   Helpers
   ──────────────────────────────────── */
function buildMatrix(entries: OddsEntry[]) {
  const runners: string[] = [];
  const bookkeepers: string[] = [];
  const map: Record<string, Record<string, OddsEntry>> = {};
  for (const e of entries) {
    if (!map[e.runner]) {
      map[e.runner] = {};
      runners.push(e.runner);
    }
    if (!bookkeepers.includes(e.bookkeeper)) bookkeepers.push(e.bookkeeper);
    map[e.runner][e.bookkeeper] = e;
  }
  return { runners, bookkeepers, map } as const;
}

function colourForDelta(prev: OddsEntry | undefined, next: OddsEntry) {
  if (!prev) return "bg-gray-100";
  const up   = next.fixedP > prev.fixedP || next.fixedW > prev.fixedW;
  const down = next.fixedP < prev.fixedP || next.fixedW < prev.fixedW;
  if (up)   return "bg-green-200";
  if (down) return "bg-red-200";
  return "bg-gray-100";
}

/* ────────────────────────────────────
   Component
   ──────────────────────────────────── */
interface Props {
  initialData: OddsEntry[];
  refreshInterval?: number;  // default 5 000 ms
}

export default function OddsTable({ initialData, refreshInterval = 5_000 }: Props) {
  const [snapshot, setSnapshot] = useState(initialData);
  const prevRef = useRef<OddsEntry[] | null>(null);

  const { runners, bookkeepers, map } = useMemo(() => buildMatrix(snapshot), [snapshot]);

  /* poll API */
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const next: OddsEntry[] = await fetch("/api/odds").then(r => r.json());
        prevRef.current = snapshot;
        setSnapshot(next);
      } catch (err) {
        console.error("Polling /api/odds failed", err);
      }
    }, refreshInterval);
    return () => clearInterval(id);
  }, [refreshInterval, snapshot]);

  /* react‑table rows */
  type Row = { runner: string; odds: Record<string, OddsEntry> };
  const data = useMemo<Row[]>(
    () => runners.map(r => ({ runner: r, odds: map[r] })),
    [runners, map]
  );

  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<Row, unknown>[]>(() => {
    const base: ColumnDef<Row, unknown>[] = [
      {
        id: "runner",
        header: () => <div className="font-semibold">Runner</div>,
        accessorKey: "runner",
        size: 110,
        enableSorting: false,
        cell: ({ getValue }) => <div className="px-2 py-1">{getValue<string>()}</div>,
      },
    ];

    for (const bk of bookkeepers) {
      base.push({
        id: bk,
        header: () => (
          <button className="w-full truncate" title={bk}>
            {bk}
          </button>
        ),
        size: 120,
        accessorFn: row => row.odds[bk],
        cell: ({ getValue }) => {
          const nextVal = getValue<OddsEntry>();
          const prevVal = prevRef.current?.find(
            e => e.runner === nextVal.runner && e.bookkeeper === nextVal.bookkeeper
          );
          const bg = colourForDelta(prevVal, nextVal);
          return (
            <div className={`px-2 py-1 text-xs whitespace-nowrap ${bg}`}> 
              <span className="font-medium">P:</span> {nextVal.fixedP.toFixed(1)} &nbsp;/&nbsp;
              <span className="font-medium">W:</span> {nextVal.fixedW.toFixed(1)}
            </div>
          );
        },
      });
    }
    return base;
  }, [bookkeepers]);

  const table = useReactTable<Row>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  /* horizontal virtualisation */
  const parentRef = useRef<HTMLDivElement>(null);
  const columnVirtualizer = useVirtualizer({
    count: table.getFlatHeaders().length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
    horizontal: true,
  });

  const virtualCols = columnVirtualizer.getVirtualItems();
  const totalSize   = columnVirtualizer.getTotalSize();

  /* ───────────────── render ───────────────── */
  const cellStyle = (start: number, width: number): React.CSSProperties => ({
    width,
    transform: `translate3d(${start}px,0,0)`,
    position: "absolute",
    left: 0,
    contain: "paint",
    backfaceVisibility: "hidden",
    willChange: "transform",
  });

  return (
    <div ref={parentRef} className="w-full overflow-x-auto border rounded shadow-inner">
      <table className="border-collapse table-fixed text-[11px] w-[max-content]">
        <thead className="sticky top-0 z-10 bg-white">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id} className="relative h-8">
              {/* spacer */}
              <th style={{ width: totalSize }} className="p-0 m-0 border-0" />
              {virtualCols.map(vi => {
                const header = hg.headers[vi.index];
                return (
                  <th
                    key={header.id}
                    style={cellStyle(vi.start, header.getSize())}
                    className="border px-2 py-1 bg-gray-50 text-center font-semibold"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="relative h-8">
              <td style={{ width: totalSize }} className="p-0 m-0 border-0" />
              {virtualCols.map(vi => {
                const cell = row.getVisibleCells()[vi.index];
                return (
                  <td
                    key={cell.id}
                    style={cellStyle(vi.start, cell.column.getSize())}
                    className="border"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
