import { NextRequest, NextResponse } from "next/server";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import { bookingEconomics, distanceDriven } from "@/lib/booking-calc";
import { loadPeriodBookings } from "@/lib/reports";
import { defaultPeriod } from "@/lib/reports";

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const fallback = defaultPeriod();
  const from = searchParams.get("from")
    ? startOfDay(parseISO(searchParams.get("from")!))
    : fallback.from;
  const to = searchParams.get("to")
    ? endOfDay(parseISO(searchParams.get("to")!))
    : fallback.to;

  const bookings = await loadPeriodBookings(from, to);

  const header = [
    "booking_id",
    "status",
    "channel",
    "car_plate",
    "customer",
    "start",
    "end",
    "pickup_time",
    "delivery_time",
    "driven_km",
    "revenue_ex_vat_ore",
    "cost_ex_vat_ore",
    "cash_margin_ore",
    "expected_dep_ore",
    "linked_service_ore",
    "economic_profit_ore",
    "vat_note",
  ];

  const rows = bookings.map((b) => {
    const linked = b.serviceEvents.reduce((s, e) => s + e.amountOre, 0);
    const econ = bookingEconomics(b, b.car, linked);
    return [
      b.id,
      b.status,
      b.channel,
      b.car.registrationPlate,
      b.customerName,
      b.plannedStartAt.toISOString(),
      b.plannedEndAt.toISOString(),
      b.pickupTime ?? "",
      b.deliveryTime ?? "",
      distanceDriven(b) ?? "",
      econ.revenueExVatOre,
      econ.costExVatOre,
      econ.cashMarginOre,
      econ.expectedDepOre,
      linked,
      econ.economicProfitOre,
      "Amounts in øre, ex VAT unless noted",
    ]
      .map(csvEscape)
      .join(",");
  });

  const body = [header.join(","), ...rows].join("\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${from.toISOString().slice(0, 10)}.csv"`,
    },
  });
}
