import { NextResponse } from "next/server";
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  startOfWeek,
} from "date-fns";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week");
  const anchor = weekParam ? new Date(weekParam) : new Date();
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).map((d) =>
    d.toISOString(),
  );

  const [cars, bookings] = await Promise.all([
    prisma.car.findMany({
      where: { status: { not: "retired" } },
      orderBy: { registrationPlate: "asc" },
      select: {
        id: true,
        registrationPlate: true,
        make: true,
        model: true,
      },
    }),
    prisma.booking.findMany({
      where: {
        status: { notIn: ["cancelled", "no_show"] },
        plannedStartAt: { lte: weekEnd },
        plannedEndAt: { gte: weekStart },
      },
      select: {
        id: true,
        carId: true,
        customerName: true,
        status: true,
        plannedStartAt: true,
        plannedEndAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    days,
    prev: format(addDays(weekStart, -7), "yyyy-MM-dd"),
    next: format(addDays(weekStart, 7), "yyyy-MM-dd"),
    cars,
    bookings: bookings.map((b) => ({
      ...b,
      plannedStartAt: b.plannedStartAt.toISOString(),
      plannedEndAt: b.plannedEndAt.toISOString(),
    })),
  });
}
