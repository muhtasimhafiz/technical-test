import type { OddsEntry } from "./types"

export function buildMatrix(entries: OddsEntry[]) {
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

export function getChangeInfo(prev: OddsEntry | undefined, next: OddsEntry) {
  if (!prev) return { pChange: "none", wChange: "none" }
  return {
    pChange: next.fixedP > prev.fixedP ? "up" : next.fixedP < prev.fixedP ? "down" : "none",
    wChange: next.fixedW > prev.fixedW ? "up" : next.fixedW < prev.fixedW ? "down" : "none",
  }
} 