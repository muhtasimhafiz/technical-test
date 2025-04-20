"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type SortingState,
  useReactTable,
  getSortedRowModel,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ArrowDown, ArrowUp, Minus } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"

export interface OddsEntry {
  runner: string
  bookkeeper: string
  fixedP: number
  fixedW: number
}

function buildMatrix(entries: OddsEntry[]) {
  const runners: string[] = []
  const bookkeepers: string[] = []
  const map: Record<string, Record<string, OddsEntry>> = {}
  for (const e of entries) {
    if (!map[e.runner]) {
      map[e.runner] = {}
      runners.push(e.runner)
    }
    if (!bookkeepers.includes(e.bookkeeper)) bookkeepers.push(e.bookkeeper)
    map[e.runner][e.bookkeeper] = e
  }
  return { runners, bookkeepers, map } as const
}

function getChangeInfo(prev: OddsEntry | undefined, next: OddsEntry) {
  if (!prev) return { pChange: "none", wChange: "none" }
  return {
    pChange: next.fixedP > prev.fixedP ? "up" : next.fixedP < prev.fixedP ? "down" : "none",
    wChange: next.fixedW > prev.fixedW ? "up" : next.fixedW < prev.fixedW ? "down" : "none",
  }
}

/* Component */
interface Props {
  initialData: OddsEntry[]
  refreshInterval?: number
}

export default function OddsTable({ initialData, refreshInterval = 5_000 }: Props) {
  const [snapshot, setSnapshot] = useState(initialData)
  const prevRef = useRef<OddsEntry[] | null>(null)
  const isMobile = useMediaQuery("(max-width: 640px)")

  const RUNNER_COL_WIDTH = isMobile ? 90 : 110
  const OTHER_COL_WIDTH = isMobile ? 120 : 140

  const { runners, bookkeepers, map } = useMemo(() => buildMatrix(snapshot), [snapshot])

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const next: OddsEntry[] = await fetch("/api/odds").then((r) => r.json())
        prevRef.current = snapshot
        setSnapshot(next)
      } catch (err) {
        console.error("Polling /api/odds failed", err)
      }
    }, refreshInterval)
    return () => clearInterval(id)
  }, [refreshInterval, snapshot])

  /*  row data  */
  type Row = { runner: string; odds: Record<string, OddsEntry> }
  const data = useMemo<Row[]>(() => runners.map((r) => ({ runner: r, odds: map[r] })), [runners, map])

  const [sorting, setSorting] = useState<SortingState>([])
  const [bookkeeperSort, setBookkeeperSort] = useState<{
    id: string
    desc: boolean
  } | null>(null)

  const sortedBookkeepers = useMemo(() => {
    if (!bookkeeperSort) return bookkeepers
    return [...bookkeepers].sort((a, b) =>
      bookkeeperSort.desc
        ? b.localeCompare(a, undefined, { numeric: true })
        : a.localeCompare(b, undefined, { numeric: true }),
    )
  }, [bookkeepers, bookkeeperSort])

  /* ─── column defs ─── */
  const runnerColumn: ColumnDef<Row, unknown> = {
    id: "runner",
    header: () => <div className="font-semibold text-center text-gray-800">Runner</div>,
    accessorKey: "runner",
    size: RUNNER_COL_WIDTH,
    enableSorting: false,
    cell: ({ getValue }) => <div className="px-2 py-2 font-medium text-gray-800 text-center">{getValue<string>()}</div>,
  }

  const otherColumns: ColumnDef<Row, unknown>[] = sortedBookkeepers.map((bk) => ({
    id: bk,
    header: () => (
      <div
        className="w-full truncate font-medium text-gray-700 flex items-center justify-center gap-1 select-none"
        title={bk}
      >
        {bk}
        {bookkeeperSort?.id === bk && <span className="ml-1">{bookkeeperSort.desc ? "↓" : "↑"}</span>}
      </div>
    ),
    size: OTHER_COL_WIDTH,
    accessorFn: (row) => row.odds[bk],
    enableSorting: false,
    cell: ({ getValue }) => {
      const nextVal = getValue<OddsEntry>()
      const prevVal = prevRef.current?.find((e) => e.runner === nextVal.runner && e.bookkeeper === nextVal.bookkeeper)
      const { pChange, wChange } = getChangeInfo(prevVal, nextVal)

      const pBg = pChange === "up" ? "bg-emerald-100" : pChange === "down" ? "bg-rose-100" : "bg-gray-100"
      const wBg = wChange === "up" ? "bg-emerald-100" : wChange === "down" ? "bg-rose-100" : "bg-gray-100"

      return (
        <div className="px-2 py-2 text-sm whitespace-nowrap bg-white rounded-lg shadow-sm border border-gray-100">
          <div className={`flex items-center justify-center mb-1.5 rounded-md ${pBg} px-2 py-1`}>
            <span className="font-medium text-gray-700">P:</span>
            <span className="ml-2 font-medium">{nextVal.fixedP.toFixed(1)}</span>
            {pChange === "up" && <ArrowUp className="w-3 h-3 text-emerald-500 ml-1" />}
            {pChange === "down" && <ArrowDown className="w-3 h-3 text-rose-500 ml-1" />}
            {pChange === "none" && <Minus className="w-3 h-3 text-gray-300 ml-1" />}
          </div>
          <div className={`flex items-center justify-center rounded-md ${wBg} px-2 py-1`}>
            <span className="font-medium text-gray-700">W:</span>
            <span className="ml-2 font-medium">{nextVal.fixedW.toFixed(1)}</span>
            {wChange === "up" && <ArrowUp className="w-3 h-3 text-emerald-500 ml-1" />}
            {wChange === "down" && <ArrowDown className="w-3 h-3 text-rose-500 ml-1" />}
            {wChange === "none" && <Minus className="w-3 h-3 text-gray-300 ml-1" />}
          </div>
        </div>
      )
    },
  }))

  const table = useReactTable<Row>({
    data,
    columns: [runnerColumn, ...otherColumns],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  })

  /* ─── virtualise only the NON‑sticky columns ─── */
  const parentRef = useRef<HTMLDivElement>(null)
  const columnVirtualizer = useVirtualizer({
    count: otherColumns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => OTHER_COL_WIDTH,
    overscan: 5,
    horizontal: true,
  })

  const virtualCols = columnVirtualizer.getVirtualItems()
  const totalOtherSize = columnVirtualizer.getTotalSize()

  const cellStyle = (start: number, width: number): React.CSSProperties => ({
    width,
    transform: `translate3d(${RUNNER_COL_WIDTH + start}px,0,0)`,
    position: "absolute",
    left: 0,
    contain: "paint",
  })

  return (
    <div
      ref={parentRef}
      className="w-full overflow-x-auto overflow-y-auto max-h-[70vh] rounded-xl shadow-lg bg-white border border-gray-200"
    >
      <table className="border-collapse table-fixed text-sm w-[max-content]">
        <thead className="sticky top-0 z-30 bg-white shadow-md">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="relative h-12">
              {/* sticky runner header */}
              <th
                key="runner-header"
                className="sticky left-0 z-20 border-b border-gray-200 px-2 py-3 bg-gray-50 text-center"
                style={{ width: RUNNER_COL_WIDTH }}
              >
                {flexRender(runnerColumn.header, hg.headers[0].getContext())}
              </th>

              {/* spacer to give row its full width */}
              <th style={{ width: totalOtherSize }} className="p-0 m-0 border-0" />

              {/* virtualised headers */}
              {virtualCols.map((vi) => {
                const header = hg.headers[vi.index + 1] // +1 skips runner
                return (
                  <th
                    key={header.id}
                    style={cellStyle(vi.start, header.getSize())}
                    className="border-b border-gray-200 px-2 py-3 bg-gray-50 text-center cursor-pointer select-none"
                    onClick={() =>
                      setBookkeeperSort((prev) => {
                        if (!prev || prev.id !== header.id) return { id: header.id, desc: false }
                        if (!prev.desc) return { id: header.id, desc: true }
                        return null
                      })
                    }
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map((row, rowIndex) => {
            const runnerCell = row.getVisibleCells()[0]!
            const isEven = rowIndex % 2 === 0
            const bgColor = isEven ? "bg-gray-50" : "bg-white"

            return (
              <tr key={row.id} className={`relative h-20 ${bgColor} hover:bg-gray-100 transition-colors duration-150`}>
                {/* sticky runner cell with explicit background */}
                <td
                  key="runner-cell"
                  className={`sticky left-0 z-10 p-1 text-center ${bgColor}`}
                  style={{ width: RUNNER_COL_WIDTH }}
                >
                  {flexRender(runnerCell.column.columnDef.cell, runnerCell.getContext())}
                </td>

                {/* spacer */}
                <td style={{ width: totalOtherSize }} className="p-0 m-0 border-0" />

                {/* virtualised cells */}
                {virtualCols.map((vi) => {
                  const cell = row.getVisibleCells()[vi.index + 1] // +1 skips runner
                  return (
                    <td key={cell.id} style={cellStyle(vi.start, cell.column.getSize())} className="p-1 text-center">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
