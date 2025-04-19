"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  SortingState,
  useReactTable,
  getSortedRowModel,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

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

function getChangeInfo(prev: OddsEntry | undefined, next: OddsEntry) {
  if (!prev) return { pChange: "none", wChange: "none" };

  const pChange =
    next.fixedP > prev.fixedP
      ? "up"
      : next.fixedP < prev.fixedP
      ? "down"
      : "none";

  const wChange =
    next.fixedW > prev.fixedW
      ? "up"
      : next.fixedW < prev.fixedW
      ? "down"
      : "none";

  return { pChange, wChange };
}

/* ────────────────────────────────────
   Component
   ──────────────────────────────────── */
interface Props {
  initialData: OddsEntry[];
  refreshInterval?: number; // default 5 000 ms
}

export default function OddsTable({
  initialData,
  refreshInterval = 5_000,
}: Props) {
  const [snapshot, setSnapshot] = useState(initialData);
  const prevRef = useRef<OddsEntry[] | null>(null);

  const { runners, bookkeepers, map } = useMemo(
    () => buildMatrix(snapshot),
    [snapshot]
  );

  /* poll API */
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const next: OddsEntry[] = await fetch("/api/odds").then((r) =>
          r.json()
        );
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
    () => runners.map((r) => ({ runner: r, odds: map[r] })),
    [runners, map]
  );

  const [sorting, setSorting] = useState<SortingState>([]);

  // Add state for bookkeeper column sorting
  const [bookkeeperSort, setBookkeeperSort] = useState<{
    id: string;
    desc: boolean;
  } | null>(null);

  const sortedBookkeepers = useMemo(() => {
    if (!bookkeeperSort) return bookkeepers;
    return [...bookkeepers].sort((a, b) => {
      if (bookkeeperSort.desc) {
        return b.localeCompare(a, undefined, { numeric: true });
      } else {
        return a.localeCompare(b, undefined, { numeric: true });
      }
    });
  }, [bookkeepers, bookkeeperSort]);

  const columns = useMemo<ColumnDef<Row, unknown>[]>(() => {
    const base: ColumnDef<Row, unknown>[] = [
      {
        id: "runner",
        header: () => <div className="font-semibold">Runner</div>,
        accessorKey: "runner",
        size: 140,
        enableSorting: false,
        cell: ({ getValue }) => (
          <div className="px-3 py-2 font-medium text-gray-800">
            {getValue<string>()}
          </div>
        ),
      },
    ];

    for (const bk of sortedBookkeepers) {
      base.push({
        id: bk,
        header: () => (
          <div
            className="w-full truncate font-medium text-gray-700 flex items-center gap-1 select-none"
            title={bk}
          >
            {bk}
            {bookkeeperSort?.id === bk && (
              <span className="ml-1">{bookkeeperSort.desc ? "🔽" : "🔼"}</span>
            )}
          </div>
        ),
        size: 140,
        accessorFn: (row) => row.odds[bk],
        enableSorting: false, // handled manually
        cell: ({ getValue }) => {
          const nextVal = getValue<OddsEntry>();
          const prevVal = prevRef.current?.find(
            (e) =>
              e.runner === nextVal.runner && e.bookkeeper === nextVal.bookkeeper
          );
          const { pChange, wChange } = getChangeInfo(prevVal, nextVal);

          return (
            <div className="px-3 py-2 text-sm whitespace-nowrap bg-white rounded-md shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-700">P:</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">
                    {nextVal.fixedP.toFixed(1)}
                  </span>
                  {pChange === "up" && (
                    <ArrowUp className="w-3 h-3 text-emerald-500" />
                  )}
                  {pChange === "down" && (
                    <ArrowDown className="w-3 h-3 text-rose-500" />
                  )}
                  {pChange === "none" && (
                    <Minus className="w-3 h-3 text-gray-300" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">W:</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">
                    {nextVal.fixedW.toFixed(1)}
                  </span>
                  {wChange === "up" && (
                    <ArrowUp className="w-3 h-3 text-emerald-500" />
                  )}
                  {wChange === "down" && (
                    <ArrowDown className="w-3 h-3 text-rose-500" />
                  )}
                  {wChange === "none" && (
                    <Minus className="w-3 h-3 text-gray-300" />
                  )}
                </div>
              </div>
            </div>
          );
        },
      });
    }
    return base;
  }, [sortedBookkeepers, bookkeeperSort]);

  const table = useReactTable<Row>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  /* horizontal virtualisation */
  const parentRef = useRef<HTMLDivElement>(null);
  const columnVirtualizer = useVirtualizer({
    count: table.getFlatHeaders().length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 5,
    horizontal: true,
  });

  const virtualCols = columnVirtualizer.getVirtualItems();
  const totalSize = columnVirtualizer.getTotalSize();

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
    <div
      ref={parentRef}
      className="w-full overflow-x-auto rounded-lg shadow-md bg-gradient-to-b from-gray-50 to-white border border-gray-200"
    >
      <table className="border-collapse table-fixed text-sm w-[max-content]">
        <thead className="sticky top-0 z-10 bg-white">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="relative h-12">
              {/* spacer */}
              <th style={{ width: totalSize }} className="p-0 m-0 border-0" />
              {virtualCols.map((vi) => {
                const header = hg.headers[vi.index];
                // Add click handler for bookkeeper columns
                const isBookkeeper = header.id !== "runner";
                return (
                  <th
                    key={header.id}
                    style={cellStyle(vi.start, header.getSize())}
                    className={
                      "border-b border-gray-200 px-3 py-3 bg-gray-50 text-center cursor-pointer select-none"
                    }
                    onClick={
                      isBookkeeper
                        ? () => {
                            setBookkeeperSort((prev) => {
                              if (!prev || prev.id !== header.id)
                                return { id: header.id, desc: false };
                              if (!prev.desc)
                                return { id: header.id, desc: true };
                              return null; // unsort
                            });
                          }
                        : undefined
                    }
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, rowIndex) => (
            <tr
              key={row.id}
              className={`relative h-20 ${
                rowIndex % 2 === 0 ? "bg-gray-50/30" : "bg-white"
              } hover:bg-gray-100/50 transition-colors duration-150`}
            >
              <td style={{ width: totalSize }} className="p-0 m-0 border-0" />
              {virtualCols.map((vi) => {
                const cell = row.getVisibleCells()[vi.index];
                return (
                  <td
                    key={cell.id}
                    style={cellStyle(vi.start, cell.column.getSize())}
                    className="p-1"
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
