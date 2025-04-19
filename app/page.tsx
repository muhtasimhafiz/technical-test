import { Suspense } from "react";
import OddsTable, { OddsEntry } from "@/components/OddsTable";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function getInitialOdds(): Promise<OddsEntry[]> {
  const headersList = await headers();
  const host = headersList.get("host");
  if (!host) throw new Error("Unable to read request host header");
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const res = await fetch(`${protocol}://${host}/api/odds`, {
    cache: "no-store", // always fresh
  });
  if (!res.ok) throw new Error(`Failed to load odds → ${res.status}`);
  return res.json();
}

export default async function OddsPage() {
  const initial = await getInitialOdds();

  return (
    <div className="p-4 min-h-screen w-full overflow-x-auto">
      <h1 className="text-xl font-semibold mb-4">Live odds comparison</h1>

      <Suspense fallback={<p>Loading table…</p>}>
        <OddsTable initialData={initial} refreshInterval={5000} />
      </Suspense>
    </div>
  );
}
