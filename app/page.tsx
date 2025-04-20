import { Suspense } from "react"
import OddsTable, { type OddsEntry } from "@/components/OddsTable"
import { headers } from "next/headers"

export const dynamic = "force-dynamic"

async function getInitialOdds(): Promise<OddsEntry[]> {
  const headersList = await headers()
  const host = headersList.get("host")
  if (!host) throw new Error("Unable to read request host header")
  const protocol = host.startsWith("localhost") ? "http" : "https"
  const res = await fetch(`${protocol}://${host}/api/odds`, {
    cache: "no-store", // always fresh
  })
  if (!res.ok) throw new Error(`Failed to load odds → ${res.status}`)
  return res.json()
}

export default async function OddsPage() {
  const initial = await getInitialOdds()

  return (
    <div className="p-6 min-h-screen w-full overflow-x-auto bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-gray-800">Live Odds Comparison</h1>
        <p className="text-gray-600 mb-6">Real-time odds from multiple bookmakers, updated every 5 seconds</p>

        <Suspense
          fallback={
            <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>
                <p className="text-gray-600 font-medium">Loading odds data...</p>
              </div>
            </div>
          }
        >
          <div className="w-full overflow-hidden">
            <OddsTable initialData={initial} refreshInterval={5000} />
          </div>
        </Suspense>
      </div>
    </div>
  )
}
