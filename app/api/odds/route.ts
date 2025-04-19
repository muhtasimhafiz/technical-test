import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
let oddsCache: {
  id: number;
  runner: string;
  bookkeeper: string;
  fixedP: number;
  fixedW: number;
}[] = [];

// Load odds into cache on startup and update every 30 seconds
async function initializeOdds() {
  try {
    const odds = await prisma.odd.findMany();
    if (odds.length === 0) {
      throw new Error(
        "No odds data found in database. Please run the seed script."
      );
    }
    oddsCache = odds;
  } catch (error) {
    console.error("Failed to initialize odds:", error);
    // Keep oddsCache unchanged (retain previous data if available)
  }
}

initializeOdds().catch((e) => console.error("Failed to initialize odds:", e));

// Update odds every 30 seconds
setInterval(async () => {
  try {
    oddsCache = oddsCache.map((entry) => ({
      ...entry,
      fixedP: parseFloat(
        (entry.fixedP + (Math.random() - 0.5) * 0.5).toFixed(1)
      ),
      fixedW: parseFloat(
        (entry.fixedW + (Math.random() - 0.5) * 0.5).toFixed(1)
      ),
    }));

    // Optionally, update the database (infrequent to avoid load)
    await prisma.odd.deleteMany();
    await prisma.odd.createMany({ data: oddsCache });
  } catch (error) {
    console.error("Failed to update odds:", error);
    // Keep oddsCache unchanged (retain previous data)
  }
}, 3000);

export async function GET() {
  try {
    if (oddsCache.length === 0) {
      await initializeOdds();
    }
    if (oddsCache.length === 0) {
      return NextResponse.json({ error: "No data available" }, { status: 503 });
    }
    return NextResponse.json(oddsCache, {
      headers: {
        "Cache-Control": "s-maxage=5, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("GET /api/odds failed:", error);
    // Return cached data if available, even if fetch fails
    if (oddsCache.length > 0) {
      return NextResponse.json(oddsCache, {
        headers: {
          "Cache-Control": "s-maxage=5, stale-while-revalidate=30",
        },
      });
    }
    return NextResponse.json(
      { error: "Failed to fetch odds data" },
      { status: 500 }
    );
  }
}

// Ensure Prisma client is disconnected on server shutdown
process.on("SIGTERM", async () => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error("Failed to disconnect Prisma:", error);
  }
  process.exit(0);
});
