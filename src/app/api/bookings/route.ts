import { NextResponse } from "next/server";
import { bookingEconomics, distanceDriven } from "@/lib/booking-calc";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const bookings = await prisma.booking.findMany({
    include: { car: true, lineItems: true },
    orderBy: { plannedStartAt: "desc" },
  });

  const rows = bookings.map((b) => {
    const econ = bookingEconomics(b, b.car);
    const km = distanceDriven(b);
    return {
      id: b.id,
      plannedStartAt: b.plannedStartAt.toISOString(),
      plannedEndAt: b.plannedEndAt.toISOString(),
      pickupTime: b.pickupTime,
      deliveryTime: b.deliveryTime,
      customerName: b.customerName,
      status: b.status,
      registrationPlate: b.car.registrationPlate,
      km,
      revenueExVatOre: econ.revenueExVatOre,
      cashMarginOre: econ.cashMarginOre,
      economicProfitOre: econ.economicProfitOre,
    };
  });

  return NextResponse.json({ bookings: rows });
}
