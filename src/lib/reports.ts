import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  getISOWeek,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from "date-fns";
import {
  bookingEconomics,
  expectedDepreciationOre,
  rentalDays,
} from "./booking-calc";
import { sumProratedFixedCostsOre } from "./fixed-costs";
import {
  effectiveDepRates,
  type MarketDepInput,
} from "./market/depreciation";
import type { FitResult } from "./market/fit";
import type { AppData, Booking, Car, ServiceEvent } from "./types";

type FitCache = Record<string, FitResult>;

function asDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function asMarketCar(
  car: Car,
  models: AppData["marketModels"],
): MarketDepInput {
  const marketModel = car.marketModelId
    ? (models.find((m) => m.id === car.marketModelId) ?? null)
    : null;
  return {
    purchasePriceOre: car.purchasePriceOre,
    purchaseOdometer: car.purchaseOdometer,
    fuelType: car.fuelType,
    marketModelId: car.marketModelId,
    marketModel: marketModel ? { variant: marketModel.variant } : null,
    depPerKmOre: car.depPerKmOre,
    depPerDayOre: car.depPerDayOre,
  };
}

function overlaps(
  start: Date,
  end: Date,
  from: Date,
  to: Date,
): boolean {
  return start <= to && end >= from;
}

export type Period = { from: Date; to: Date };

export function defaultPeriod(): Period {
  const now = new Date();
  return { from: startOfMonth(now), to: endOfMonth(now) };
}

export function periodFromMonthParam(month?: string | null): Period {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const from = startOfMonth(parseISO(`${month}-01`));
    return { from, to: endOfMonth(from) };
  }
  return defaultPeriod();
}

export function monthParam(d: Date): string {
  return format(d, "yyyy-MM");
}

export function previousPeriod(p: Period): Period {
  const mid = subMonths(p.from, 1);
  return { from: startOfMonth(mid), to: endOfMonth(mid) };
}

export function nextPeriod(p: Period): Period {
  const mid = addMonths(p.from, 1);
  return { from: startOfMonth(mid), to: endOfMonth(mid) };
}

export type WeeklyPoint = {
  weekKey: string;
  weekLabel: string;
  weekNumber: number;
  monthKey: string;
  monthLabel: string;
  revenueOre: number;
  revenueCompletedOre: number;
  revenueUpcomingOre: number;
  costOre: number;
  serviceOre: number;
  depOre: number;
  costsOre: number;
  km: number;
  completedBookingRevenueOre: number;
  revenuePerKmOre: number | null;
  monthRevenueOre: number;
  monthRevenueCompletedOre: number;
  monthRevenueUpcomingOre: number;
  monthCostOre: number;
  monthServiceOre: number;
  monthDepOre: number;
  monthCostsOre: number;
  monthKm: number;
  cumRevenueOre: number;
  cumRevenueCompletedOre: number;
  cumRevenueUpcomingOre: number;
  cumCostsOre: number;
  cumDepOre: number;
  cumKm: number;
  cumRevenuePerKmOre: number | null;
};

function splitEvenly(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  let rem = total - base * n;
  return Array.from({ length: n }, () => {
    if (rem > 0) {
      rem -= 1;
      return base + 1;
    }
    return base;
  });
}

function bookingWithRelations(data: AppData, b: Booking) {
  const car = data.cars.find((c) => c.id === b.carId);
  if (!car) return null;
  return {
    ...b,
    plannedStartAt: asDate(b.plannedStartAt),
    plannedEndAt: asDate(b.plannedEndAt),
    car,
    lineItems: data.lineItems.filter((i) => i.bookingId === b.id),
    serviceEvents: data.serviceEvents.filter((e) => e.bookingId === b.id),
  };
}

export function weeklyEconomicsSeries(
  data: AppData,
  periodTo: Date,
  fits: FitCache,
): WeeklyPoint[] {
  const from = startOfYear(periodTo);
  const to = endOfYear(periodTo);
  const rangeStart = startOfWeek(from, { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(to, { weekStartsOn: 1 });

  const bookings = data.bookings
    .filter((b) => !["cancelled", "no_show", "draft"].includes(b.status))
    .filter((b) =>
      overlaps(asDate(b.plannedStartAt), asDate(b.plannedEndAt), rangeStart, rangeEnd),
    )
    .map((b) => bookingWithRelations(data, b))
    .filter((b): b is NonNullable<typeof b> => b != null);

  const serviceEvents = data.serviceEvents.filter((e) => {
    const d = asDate(e.occurredOn);
    return d >= rangeStart && d <= rangeEnd;
  });

  type Bucket = {
    weekKey: string;
    weekStart: Date;
    revenueCompletedOre: number;
    revenueUpcomingOre: number;
    completedBookingRevenueOre: number;
    costOre: number;
    serviceOre: number;
    depOre: number;
    km: number;
  };

  const weeks = new Map<string, Bucket>();
  const today = startOfDay(new Date());

  function ensure(d: Date): Bucket {
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const key = format(start, "yyyy-MM-dd");
    let b = weeks.get(key);
    if (!b) {
      b = {
        weekKey: key,
        weekStart: start,
        revenueCompletedOre: 0,
        revenueUpcomingOre: 0,
        completedBookingRevenueOre: 0,
        costOre: 0,
        serviceOre: 0,
        depOre: 0,
        km: 0,
      };
      weeks.set(key, b);
    }
    return b;
  }

  for (let d = rangeStart; d <= rangeEnd; d = addWeeks(d, 1)) {
    ensure(d);
  }

  function allocateAcrossDays(
    bookingStart: Date,
    bookingEnd: Date,
    status: string,
    amounts: {
      revenueOre: number;
      costOre: number;
      depOre: number;
      km: number;
    },
  ) {
    const dayStart = startOfDay(bookingStart);
    const dayEnd = startOfDay(bookingEnd);
    const dayCount = Math.max(1, differenceInCalendarDays(dayEnd, dayStart) + 1);
    const days: Date[] = [];
    for (let i = 0; i < dayCount; i++) days.push(addDays(dayStart, i));

    const revShares = splitEvenly(amounts.revenueOre, dayCount);
    const costShares = splitEvenly(amounts.costOre, dayCount);
    const depShares = splitEvenly(amounts.depOre, dayCount);
    const kmShares = splitEvenly(amounts.km, dayCount);
    const forceCompleted = status === "completed";

    days.forEach((day, i) => {
      if (day < rangeStart || day > rangeEnd) return;
      const bucket = ensure(day);
      if (forceCompleted || day < today) {
        bucket.revenueCompletedOre += revShares[i];
      } else {
        bucket.revenueUpcomingOre += revShares[i];
      }
      if (forceCompleted) bucket.completedBookingRevenueOre += revShares[i];
      bucket.costOre += costShares[i];
      bucket.depOre += depShares[i];
      bucket.km += kmShares[i];
    });
  }

  for (const b of bookings) {
    const linked = b.serviceEvents.reduce((s, e) => s + e.amountOre, 0);
    const rates = effectiveDepRates(asMarketCar(b.car, data.marketModels), fits);
    const econ = bookingEconomics(b, rates, linked);
    const km = b.status === "completed" ? (econ.distanceDriven ?? 0) : 0;
    allocateAcrossDays(b.plannedStartAt, b.plannedEndAt, b.status, {
      revenueOre: econ.revenueExVatOre,
      costOre: econ.costExVatOre,
      depOre: econ.expectedDepOre,
      km,
    });
  }

  for (const e of serviceEvents) {
    ensure(asDate(e.occurredOn)).serviceOre += e.amountOre;
  }

  const sorted = [...weeks.values()].sort(
    (a, b) => a.weekStart.getTime() - b.weekStart.getTime(),
  );

  const monthTotals = new Map<
    string,
    {
      revenueCompletedOre: number;
      revenueUpcomingOre: number;
      costOre: number;
      serviceOre: number;
      depOre: number;
      km: number;
    }
  >();
  for (const w of sorted) {
    const mk = format(w.weekStart, "yyyy-MM");
    const m = monthTotals.get(mk) ?? {
      revenueCompletedOre: 0,
      revenueUpcomingOre: 0,
      costOre: 0,
      serviceOre: 0,
      depOre: 0,
      km: 0,
    };
    m.revenueCompletedOre += w.revenueCompletedOre;
    m.revenueUpcomingOre += w.revenueUpcomingOre;
    m.costOre += w.costOre;
    m.serviceOre += w.serviceOre;
    m.depOre += w.depOre;
    m.km += w.km;
    monthTotals.set(mk, m);
  }

  let cumRevenue = 0;
  let cumCompleted = 0;
  let cumUpcoming = 0;
  let cumCosts = 0;
  let cumDep = 0;
  let cumKm = 0;
  let cumCompletedBookingRevenue = 0;

  return sorted.map((w) => {
    const revenueOre = w.revenueCompletedOre + w.revenueUpcomingOre;
    const costsOre = w.costOre + w.serviceOre;
    cumRevenue += revenueOre;
    cumCompleted += w.revenueCompletedOre;
    cumUpcoming += w.revenueUpcomingOre;
    cumCosts += costsOre;
    cumDep += w.depOre;
    cumKm += w.km;
    cumCompletedBookingRevenue += w.completedBookingRevenueOre;
    const weekEnd = addDays(w.weekStart, 6);
    const monthKey = format(w.weekStart, "yyyy-MM");
    const mt = monthTotals.get(monthKey)!;
    const monthRevenueOre = mt.revenueCompletedOre + mt.revenueUpcomingOre;
    return {
      weekKey: w.weekKey,
      weekLabel: `${format(w.weekStart, "d MMM")}–${format(weekEnd, "d MMM")}`,
      weekNumber: getISOWeek(w.weekStart),
      monthKey,
      monthLabel: format(w.weekStart, "MMMM yyyy"),
      revenueOre,
      revenueCompletedOre: w.revenueCompletedOre,
      revenueUpcomingOre: w.revenueUpcomingOre,
      costOre: w.costOre,
      serviceOre: w.serviceOre,
      depOre: w.depOre,
      costsOre,
      km: w.km,
      completedBookingRevenueOre: w.completedBookingRevenueOre,
      revenuePerKmOre:
        w.km > 0 ? Math.round(w.completedBookingRevenueOre / w.km) : null,
      monthRevenueOre,
      monthRevenueCompletedOre: mt.revenueCompletedOre,
      monthRevenueUpcomingOre: mt.revenueUpcomingOre,
      monthCostOre: mt.costOre,
      monthServiceOre: mt.serviceOre,
      monthDepOre: mt.depOre,
      monthCostsOre: mt.costOre + mt.serviceOre,
      monthKm: mt.km,
      cumRevenueOre: cumRevenue,
      cumRevenueCompletedOre: cumCompleted,
      cumRevenueUpcomingOre: cumUpcoming,
      cumCostsOre: cumCosts,
      cumDepOre: cumDep,
      cumKm,
      cumRevenuePerKmOre:
        cumKm > 0
          ? Math.round(cumCompletedBookingRevenue / cumKm)
          : null,
    };
  });
}

export function loadPeriodBookings(data: AppData, from: Date, to: Date) {
  return data.bookings
    .filter((b) => !["cancelled", "no_show", "draft"].includes(b.status))
    .filter((b) =>
      overlaps(asDate(b.plannedStartAt), asDate(b.plannedEndAt), from, to),
    )
    .map((b) => bookingWithRelations(data, b))
    .filter((b): b is NonNullable<typeof b> => b != null)
    .sort((a, b) => b.plannedStartAt.getTime() - a.plannedStartAt.getTime());
}

export function loadSettledPeriodBookings(data: AppData, from: Date, to: Date) {
  return data.bookings
    .filter((b) => b.status === "completed" || b.status === "no_show")
    .filter((b) =>
      overlaps(asDate(b.plannedStartAt), asDate(b.plannedEndAt), from, to),
    )
    .map((b) => bookingWithRelations(data, b))
    .filter((b): b is NonNullable<typeof b> => b != null)
    .sort((a, b) => b.plannedStartAt.getTime() - a.plannedStartAt.getTime());
}

export function periodSummary(data: AppData, from: Date, to: Date, fits: FitCache) {
  const bookings = loadPeriodBookings(data, from, to);
  const serviceEvents = data.serviceEvents.filter((e) => {
    const d = asDate(e.occurredOn);
    return d >= from && d <= to;
  });

  let revenueExVatOre = 0;
  let costExVatOre = 0;
  let expectedDepOre = 0;
  let linkedServiceOre = 0;
  const perCar = new Map<
    string,
    {
      carId: string;
      label: string;
      revenueExVatOre: number;
      costExVatOre: number;
      expectedDepOre: number;
      linkedServiceOre: number;
      fixedCostOre: number;
      bookingCount: number;
      km: number;
      days: number;
    }
  >();

  for (const b of bookings) {
    const linked = b.serviceEvents.reduce((s: number, e: ServiceEvent) => s + e.amountOre, 0);
    const rates = effectiveDepRates(asMarketCar(b.car, data.marketModels), fits);
    const econ = bookingEconomics(b, rates, linked);
    revenueExVatOre += econ.revenueExVatOre;
    costExVatOre += econ.costExVatOre;
    expectedDepOre += econ.expectedDepOre;
    linkedServiceOre += linked;

    const row = perCar.get(b.carId) ?? {
      carId: b.carId,
      label: `${b.car.make} ${b.car.model} (${b.car.registrationPlate})`,
      revenueExVatOre: 0,
      costExVatOre: 0,
      expectedDepOre: 0,
      linkedServiceOre: 0,
      fixedCostOre: 0,
      bookingCount: 0,
      km: 0,
      days: 0,
    };
    row.revenueExVatOre += econ.revenueExVatOre;
    row.costExVatOre += econ.costExVatOre;
    row.expectedDepOre += econ.expectedDepOre;
    row.linkedServiceOre += linked;
    row.bookingCount += 1;
    if (b.status === "completed") row.km += econ.distanceDriven ?? 0;
    row.days += econ.rentalDays;
    perCar.set(b.carId, row);
  }

  const unlinkedServiceOre = serviceEvents
    .filter((e) => !e.bookingId)
    .reduce((s, e) => s + e.amountOre, 0);
  const totalServiceOre = serviceEvents.reduce((s, e) => s + e.amountOre, 0);

  const rentedKm = [...perCar.values()].reduce((s, r) => s + r.km, 0);
  const allocKm = rentedKm || 1;
  for (const row of perCar.values()) {
    row.linkedServiceOre += Math.round((row.km / allocKm) * unlinkedServiceOre);
  }

  const cars = data.cars.filter((c) => c.status !== "retired");
  let fixedCostOre = 0;
  for (const car of cars) {
    const carFixed = sumProratedFixedCostsOre(
      data.fixedCosts.filter((c) => c.carId === car.id),
      from,
      to,
    );
    if (carFixed <= 0 && !perCar.has(car.id)) continue;
    fixedCostOre += carFixed;
    const row = perCar.get(car.id) ?? {
      carId: car.id,
      label: `${car.make} ${car.model} (${car.registrationPlate})`,
      revenueExVatOre: 0,
      costExVatOre: 0,
      expectedDepOre: 0,
      linkedServiceOre: 0,
      fixedCostOre: 0,
      bookingCount: 0,
      km: 0,
      days: 0,
    };
    row.fixedCostOre = carFixed;
    perCar.set(car.id, row);
  }

  const cashMarginOre = revenueExVatOre - costExVatOre;
  const economicProfitOre =
    cashMarginOre - expectedDepOre - linkedServiceOre - unlinkedServiceOre;
  const actualProfitOre = economicProfitOre - fixedCostOre;
  const rentalDaysTotal = [...perCar.values()].reduce((s, r) => s + r.days, 0);
  const availableCarDays =
    cars.length * Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
  const utilization = availableCarDays > 0 ? rentalDaysTotal / availableCarDays : 0;

  return {
    bookingCount: bookings.length,
    revenueExVatOre,
    costExVatOre,
    cashMarginOre,
    expectedDepOre,
    totalServiceOre,
    unlinkedServiceOre,
    fixedCostOre,
    economicProfitOre,
    actualProfitOre,
    rentedKm,
    utilization,
    activeCars: cars.length,
    perCar: [...perCar.values()].sort(
      (a, b) => b.revenueExVatOre - a.revenueExVatOre,
    ),
    bookings,
  };
}

export function annualizedRunRate(amount: number, from: Date, to: Date): number {
  const days = Math.max(
    1,
    differenceInCalendarDays(startOfDay(to), startOfDay(from)) + 1,
  );
  return Math.round((amount * 365) / days);
}

export function rentalStartSpan(
  bookings: { plannedStartAt: Date }[],
): { from: Date; to: Date } | null {
  if (bookings.length === 0) return null;
  let from = bookings[0]!.plannedStartAt;
  let to = from;
  for (const b of bookings) {
    if (b.plannedStartAt < from) from = b.plannedStartAt;
    if (b.plannedStartAt > to) to = b.plannedStartAt;
  }
  return { from, to };
}

export function getAlerts(data: AppData) {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400000);

  const upcoming = data.bookings
    .filter((b) => b.status === "confirmed" || b.status === "active")
    .filter((b) => {
      const start = asDate(b.plannedStartAt);
      const end = asDate(b.plannedEndAt);
      return (
        (start >= now && start <= in7) || (end >= now && end <= in7)
      );
    })
    .sort(
      (a, b) =>
        asDate(a.plannedStartAt).getTime() - asDate(b.plannedStartAt).getTime(),
    )
    .slice(0, 12)
    .map((b) => ({
      ...b,
      car: data.cars.find((c) => c.id === b.carId) ?? {
        registrationPlate: "—",
      },
    }));

  const missingOdo = data.bookings
    .filter((b) => b.status === "completed" && b.drivenKm == null)
    .slice(0, 10)
    .map((b) => ({
      ...b,
      car: data.cars.find((c) => c.id === b.carId) ?? {
        registrationPlate: "—",
      },
    }));

  const inspectionDue = data.cars
    .filter(
      (c) =>
        c.status !== "retired" &&
        c.nextInspectionDue != null &&
        asDate(c.nextInspectionDue) <= in7,
    )
    .sort(
      (a, b) =>
        asDate(a.nextInspectionDue!).getTime() -
        asDate(b.nextInspectionDue!).getTime(),
    )
    .slice(0, 10);

  const serviceDue = data.cars
    .filter(
      (car) =>
        car.status !== "retired" &&
        car.serviceIntervalKm != null &&
        car.serviceIntervalKm > 0,
    )
    .map((car) => {
      const last = data.serviceEvents
        .filter((e) => e.carId === car.id && e.type === "service" && e.odometer != null)
        .sort((a, b) => asDate(b.occurredOn).getTime() - asDate(a.occurredOn).getTime())[0];
      const interval = car.serviceIntervalKm!;
      const lastOdo = last?.odometer ?? car.purchaseOdometer ?? 0;
      const dueAtKm = lastOdo + interval;
      return {
        id: car.id,
        registrationPlate: car.registrationPlate,
        currentOdometer: car.currentOdometer,
        dueAtKm,
        kmRemaining: dueAtKm - car.currentOdometer,
        intervalKm: interval,
      };
    })
    .filter((c) => c.kmRemaining <= 2000)
    .sort((a, b) => a.kmRemaining - b.kmRemaining)
    .slice(0, 10);

  return { upcoming, missingOdo, inspectionDue, serviceDue };
}

export function fleetExpectedValue(
  data: AppData,
  asOf: Date,
  fits: FitCache,
) {
  const cars = data.cars.filter((c) => c.status !== "retired");
  const today = startOfDay(asOf);
  let purchaseTotalOre = 0;
  let expectedValueOre = 0;
  let accumulatedDepOre = 0;
  let valuedCars = 0;
  let missingPurchasePrice = 0;

  for (const car of cars) {
    if (car.purchasePriceOre == null) {
      missingPurchasePrice += 1;
      continue;
    }
    valuedCars += 1;
    purchaseTotalOre += car.purchasePriceOre;
    const rates = effectiveDepRates(asMarketCar(car, data.marketModels), fits);
    let bookingDepOre = 0;
    let bookingKm = 0;
    let bookingDays = 0;
    for (const b of data.bookings.filter(
      (x) => x.carId === car.id && x.status === "completed",
    )) {
      const booking = {
        plannedStartAt: asDate(b.plannedStartAt),
        plannedEndAt: asDate(b.plannedEndAt),
        drivenKm: b.drivenKm,
      };
      bookingDepOre += expectedDepreciationOre(booking, rates);
      bookingKm += Math.max(0, b.drivenKm ?? 0);
      bookingDays += rentalDays(booking);
    }
    const ownedDays =
      car.purchaseDate != null
        ? Math.max(0, differenceInCalendarDays(today, startOfDay(asDate(car.purchaseDate))))
        : 0;
    const odoKm = Math.max(0, car.currentOdometer - (car.purchaseOdometer ?? 0));
    const extraKm = Math.max(0, odoKm - bookingKm);
    const extraDays = Math.max(0, ownedDays - bookingDays);
    const depOre =
      bookingDepOre + extraKm * rates.depPerKmOre + extraDays * rates.depPerDayOre;
    expectedValueOre += Math.max(0, car.purchasePriceOre - depOre);
    accumulatedDepOre += Math.min(car.purchasePriceOre, depOre);
  }

  return {
    expectedValueOre,
    purchaseTotalOre,
    accumulatedDepOre,
    valuedCars,
    activeCars: cars.length,
    missingPurchasePrice,
  };
}
