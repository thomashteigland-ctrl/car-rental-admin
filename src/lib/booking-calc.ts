import {
  differenceInCalendarDays,
  differenceInHours,
  startOfDay,
} from "date-fns";

export type LineItemLike = {
  kind: string;
  amountOre: number;
  vatPercent: number;
  quantity: number;
};

export type BookingTimeDistance = {
  plannedStartAt: Date;
  plannedEndAt: Date;
  drivenKm?: number | null;
};

export type CarDepRates = {
  depPerKmOre: number;
  depPerDayOre: number;
};

export function rentalDays(booking: BookingTimeDistance): number {
  const days = differenceInCalendarDays(
    booking.plannedEndAt,
    booking.plannedStartAt,
  );
  return Math.max(1, days);
}

export function rentalHours(booking: BookingTimeDistance): number {
  return Math.max(
    0,
    differenceInHours(booking.plannedEndAt, booking.plannedStartAt),
  );
}

export function distanceDriven(booking: BookingTimeDistance): number | null {
  if (booking.drivenKm == null) return null;
  return Math.max(0, booking.drivenKm);
}

export function sumLineItems(
  items: LineItemLike[],
  kind: "revenue" | "cost",
): { exVatOre: number; incVatOre: number } {
  let exVatOre = 0;
  let incVatOre = 0;
  for (const item of items) {
    if (item.kind !== kind) continue;
    const lineEx = Math.round(item.amountOre * item.quantity);
    exVatOre += lineEx;
    incVatOre += Math.round(lineEx * (1 + item.vatPercent / 100));
  }
  return { exVatOre, incVatOre };
}

export function expectedDepreciationOre(
  booking: BookingTimeDistance,
  rates: CarDepRates,
): number {
  const days = rentalDays(booking);
  const km = distanceDriven(booking) ?? 0;
  return days * rates.depPerDayOre + km * rates.depPerKmOre;
}

export function bookingEconomics(
  booking: BookingTimeDistance & { lineItems: LineItemLike[] },
  rates: CarDepRates,
  allocatedServiceOre = 0,
) {
  const revenue = sumLineItems(booking.lineItems, "revenue");
  const costs = sumLineItems(booking.lineItems, "cost");
  const cashMarginOre = revenue.exVatOre - costs.exVatOre;
  const depOre = expectedDepreciationOre(booking, rates);
  const economicProfitOre = cashMarginOre - depOre - allocatedServiceOre;
  return {
    revenueExVatOre: revenue.exVatOre,
    revenueIncVatOre: revenue.incVatOre,
    costExVatOre: costs.exVatOre,
    cashMarginOre,
    expectedDepOre: depOre,
    allocatedServiceOre,
    economicProfitOre,
    rentalDays: rentalDays(booking),
    distanceDriven: distanceDriven(booking),
  };
}

/** Inclusive calendar-day overlap (date-only bookings; times ignored). */
export function bookingsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  const aS = startOfDay(aStart).getTime();
  const aE = startOfDay(aEnd).getTime();
  const bS = startOfDay(bStart).getTime();
  const bE = startOfDay(bEnd).getTime();
  return aS <= bE && bS <= aE;
}
