import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const newerThanRaw = searchParams.get("newerThan");
  const newerThan =
    newerThanRaw != null && Number.isFinite(Number(newerThanRaw))
      ? Number(newerThanRaw)
      : null;

  const cars = await prisma.car.findMany({
    where: newerThan != null ? { year: { gt: newerThan } } : undefined,
    include: { marketModel: { select: { name: true } } },
    orderBy: { registrationPlate: "asc" },
  });

  return NextResponse.json({ cars, newerThan });
}
