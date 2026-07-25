import { NextResponse } from "next/server";
import { loadDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const data = await loadDashboardData({
    range: searchParams.get("range"),
    month: searchParams.get("month"),
  });
  return NextResponse.json(data);
}
