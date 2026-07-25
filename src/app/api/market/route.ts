import { NextResponse } from "next/server";
import { loadMarketChartData } from "@/lib/market/chart-data";
import { getScrapeStatus } from "@/lib/market/run-scrape";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [data, scrape, models] = await Promise.all([
    loadMarketChartData(),
    getScrapeStatus(),
    prisma.marketModel.findMany({
      orderBy: [{ hidden: "asc" }, { name: "asc" }],
      select: { id: true, name: true, variant: true, hidden: true },
    }),
  ]);

  return NextResponse.json({
    data,
    scrape: { status: scrape.status, message: scrape.message },
    models,
  });
}
