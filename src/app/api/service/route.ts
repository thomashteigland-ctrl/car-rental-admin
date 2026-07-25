import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [events, cars, bookings] = await Promise.all([
    prisma.serviceEvent.findMany({
      include: { car: true, booking: true },
      orderBy: { occurredOn: "desc" },
      take: 100,
    }),
    prisma.car.findMany({
      where: { status: { not: "retired" } },
      orderBy: { registrationPlate: "asc" },
    }),
    prisma.booking.findMany({
      where: { status: { notIn: ["cancelled"] } },
      include: { car: true },
      orderBy: { plannedStartAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      carId: e.carId,
      bookingId: e.bookingId,
      type: e.type,
      occurredOn: e.occurredOn.toISOString(),
      odometer: e.odometer,
      amountOre: e.amountOre,
      vendor: e.vendor,
      notes: e.notes,
      car: {
        id: e.car.id,
        registrationPlate: e.car.registrationPlate,
      },
    })),
    cars: cars.map((c) => ({
      id: c.id,
      registrationPlate: c.registrationPlate,
      currentOdometer: c.currentOdometer,
      serviceIntervalKm: c.serviceIntervalKm,
    })),
    bookings: bookings.map((b) => ({
      id: b.id,
      carId: b.carId,
      customerName: b.customerName,
      plannedStartAt: b.plannedStartAt.toISOString(),
      pickupTime: b.pickupTime,
      car: { registrationPlate: b.car.registrationPlate },
    })),
  });
}
