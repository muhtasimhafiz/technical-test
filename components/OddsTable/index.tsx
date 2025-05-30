"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type SortingState,
  useReactTable,
  getSortedRowModel,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMediaQuery } from "@/hooks/use-media-query";
import { buildMatrix } from "./oddsUtils";
import type { OddsEntry } from "./types";
import OddsCell from "./OddsCell";

interface Props {
  initialData: OddsEntry[];
  refreshInterval?: number;
}

export default function OddsTable({
  initialData,
  refreshInterval = 5000,
}: Props) {
  const [snapshot, setSnapshot] = useState(initialData);
  const prevRef = useRef<OddsEntry[] | null>(null);
  const isMobile = useMediaQuery("(max-width: 640px)");

  const RUNNER_COL_WIDTH = isMobile ? 90 : 110;
  const OTHER_COL_WIDTH = isMobile ? 110 : 130;

  const { runners, bookkeepers, map } = useMemo(
    () => buildMatrix(snapshot),
    [snapshot]
  );

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

  type Row = { runner: string; odds: Record<string, OddsEntry> };
  const data = useMemo<Row[]>(
    () => runners.map((r: string) => ({ runner: r, odds: map[r] })),
    [runners, map]
  );

  const [sorting, setSorting] = useState<SortingState>([]);
  const [bookkeeperSort, setBookkeeperSort] = useState<{
    id: string;
    desc: boolean;
  } | null>(null);

  const sortedBookkeepers = useMemo(() => {
    if (!bookkeeperSort) return bookkeepers;
    return [...bookkeepers].sort((a: string, b: string) =>
      bookkeeperSort.desc
        ? b.localeCompare(a, undefined, { numeric: true })
        : a.localeCompare(b, undefined, { numeric: true })
    );
  }, [bookkeepers, bookkeeperSort]);

  const runnerColumn: ColumnDef<Row, unknown> = {
    id: "runner",
    header: () => (
      <div className="font-semibold text-center text-amber-800">Runner</div>
    ),
    accessorKey: "runner",
    size: RUNNER_COL_WIDTH,
    enableSorting: false,
    cell: ({ getValue }: { getValue: () => unknown }) => (
      <div className="font-medium text-amber-700 text-center w-full">
        {getValue() as string}
      </div>
    ),
  };

  const otherColumns: ColumnDef<Row, unknown>[] = sortedBookkeepers.map(
    (bk: string, colIndex: number) => ({
      id: bk,
      header: () => (
        <div
          className="w-full truncate font-medium text-orange-700 flex items-center justify-center gap-1 select-none"
          title={bk}
        >
          {bk}
          {bookkeeperSort?.id === bk && bookkeeperSort ? (
            <span className="ml-1">{bookkeeperSort.desc ? "↓" : "↑"}</span>
          ) : null}
        </div>
      ),
      size: OTHER_COL_WIDTH,
      accessorFn: (row: Row) => row.odds[bk],
      enableSorting: false,
      cell: ({
        getValue,
        row: { index: rowIndex },
      }: {
        getValue: () => unknown;
        row: { index: number };
      }) => {
        const nextVal = getValue() as OddsEntry;
        const prevVal = prevRef.current?.find(
          (e) =>
            e.runner === nextVal.runner && e.bookkeeper === nextVal.bookkeeper
        );
        const isEven = (rowIndex + colIndex) % 2 === 0;
        return (
          <OddsCell
            nextVal={nextVal}
            prevVal={prevVal}
            isEven={isEven}
            useSmallText={isMobile}
          />
        );
      },
    })
  );

  const table = useReactTable<Row>({
    data,
    columns: [runnerColumn, ...otherColumns],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const columnVirtualizer = useVirtualizer({
    count: otherColumns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => OTHER_COL_WIDTH,
    overscan: 5,
    horizontal: true,
  });

  const virtualCols = columnVirtualizer.getVirtualItems();
  const totalOtherSize = columnVirtualizer.getTotalSize();

  const cellStyle = (start: number, width: number): React.CSSProperties => ({
    width,
    transform: `translate3d(${RUNNER_COL_WIDTH + start}px,0,0)`,
    position: "absolute",
    left: 0,
    contain: "paint",
  });

  return (
    <div
      ref={parentRef}
      className="w-full overflow-x-auto overflow-y-auto max-h-[85vh] rounded-xl shadow-lg bg-white border border-gray-200"
    >
      <table className="border-collapse table-fixed text-sm w-[max-content]">
        <thead className="sticky top-0 z-30 bg-gradient-to-r from-amber-100 to-orange-100 shadow-md">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="relative h-10">
              {/* sticky runner header */}
              <th
                key="runner-header"
                className="sticky left-0 z-20 border-b border-amber-200 px-2 py-2 bg-amber-100 text-center"
                style={{ width: RUNNER_COL_WIDTH }}
              >
                {flexRender(runnerColumn.header, hg.headers[0].getContext())}
              </th>

              {/* spacer to give row its full width */}
              <th
                style={{ width: totalOtherSize }}
                className="p-0 m-0 border-0"
              />

              {/* virtualised headers */}
              {virtualCols.map((vi) => {
                const header = hg.headers[vi.index + 1]; // +1 skips runner
                return (
                  <th
                    key={header.id}
                    style={cellStyle(vi.start, header.getSize())}
                    className="border-b border-orange-200 px-2 py-2 bg-orange-50 text-center cursor-pointer select-none hover:bg-orange-100 transition-colors"
                    onClick={() =>
                      setBookkeeperSort((prev) => {
                        if (!prev || prev.id !== header.id)
                          return { id: header.id, desc: false };
                        if (!prev.desc) return { id: header.id, desc: true };
                        return null;
                      })
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
          {table.getRowModel().rows.map((row, rowIndex) => {
            const runnerCell = row.getVisibleCells()[0]!;
            const isEven = rowIndex % 2 === 0;
            const bgColor = isEven ? "bg-amber-50" : "bg-white";
            const hoverBg = "hover:bg-amber-100";

            return (
              <tr
                key={row.id}
                className={`relative h-12 ${bgColor} ${hoverBg} transition-colors duration-150 border-b border-amber-100`}
              >
                {/* sticky runner cell with matching background */}
                <td
                  key="runner-cell"
                  className={`sticky left-0 z-10 ${bgColor} !bg-opacity-100 p-0`}
                  style={{ width: RUNNER_COL_WIDTH }}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    {flexRender(
                      runnerCell.column.columnDef.cell,
                      runnerCell.getContext()
                    )}
                  </div>
                </td>

                {/* spacer */}
                <td
                  style={{ width: totalOtherSize }}
                  className="p-0 m-0 border-0"
                />

                {/* virtualised cells */}
                {virtualCols.map((vi, colIndex) => {
                  const cell = row.getVisibleCells()[vi.index + 1]; // +1 skips runner
                  return (
                    <td
                      key={cell.id}
                      style={cellStyle(vi.start, cell.column.getSize())}
                      className="h-full flex items-center justify-center p-0.5 bg-transparent"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
