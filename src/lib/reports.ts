import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
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
  loadMarketFitCache,
  type MarketDepInput,
} from "./market/depreciation";
import { prisma } from "./prisma";

const carWithMarket = {
  include: { marketModel: { select: { variant: true } } },
} as const;

function asMarketCar(car: {
  purchasePriceOre: number | null;
  purchaseOdometer: number;
  fuelType: string | null;
  marketModelId: string | null;
  marketModel: { variant: string } | null;
  depPerKmOre: number;
  depPerDayOre: number;
}): MarketDepInput {
  return {
    purchasePriceOre: car.purchasePriceOre,
    purchaseOdometer: car.purchaseOdometer,
    fuelType: car.fuelType,
    marketModelId: car.marketModelId,
    marketModel: car.marketModel,
    depPerKmOre: car.depPerKmOre,
    depPerDayOre: car.depPerDayOre,
  };
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
  /** Direct costs + service for the week */
  costsOre: number;
  monthRevenueOre: number;
  monthRevenueCompletedOre: number;
  monthRevenueUpcomingOre: number;
  monthCostOre: number;
  monthServiceOre: number;
  monthDepOre: number;
  monthCostsOre: number;
  /** Cumulative from series start through this week */
  cumRevenueOre: number;
  cumRevenueCompletedOre: number;
  cumRevenueUpcomingOre: number;
  cumCostsOre: number;
  cumDepOre: number;
};

/** Split an integer amount into n nearly-equal integer parts (exact sum). */
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

/** Monday-start weeks from year start through period end. */
export async function weeklyEconomicsSeries(
  periodTo: Date,
): Promise<WeeklyPoint[]> {
  const from = startOfYear(periodTo);
  const to = endOfMonth(periodTo);
  const rangeStart = startOfWeek(from, { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(to, { weekStartsOn: 1 });

  const [bookings, serviceEvents] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: { notIn: ["cancelled", "no_show", "draft"] },
        plannedStartAt: { lte: rangeEnd },
        plannedEndAt: { gte: rangeStart },
      },
      include: {
        car: carWithMarket,
        lineItems: true,
        serviceEvents: true,
      },
    }),
    prisma.serviceEvent.findMany({
      where: { occurredOn: { gte: rangeStart, lte: rangeEnd } },
    }),
  ]);

  const fits = await loadMarketFitCache(
    [
      ...new Set(
        bookings
          .map((b) => b.car.marketModel?.variant)
          .filter((v): v is string => Boolean(v)),
      ),
    ],
  );

  type Bucket = {
    weekKey: string;
    weekStart: Date;
    revenueCompletedOre: number;
    revenueUpcomingOre: number;
    costOre: number;
    serviceOre: number;
    depOre: number;
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
        costOre: 0,
        serviceOre: 0,
        depOre: 0,
      };
      weeks.set(key, b);
    }
    return b;
  }

  for (let d = rangeStart; d <= rangeEnd; d = addWeeks(d, 1)) {
    ensure(d);
  }

  /**
   * Spread amounts evenly across each inclusive calendar day of the booking,
   * attributing each day to its Monday-start week. Revenue is split into
   * completed (past / completed status) vs upcoming (today and future).
   */
  function allocateAcrossDays(
    bookingStart: Date,
    bookingEnd: Date,
    status: string,
    amounts: { revenueOre: number; costOre: number; depOre: number },
  ) {
    const dayStart = startOfDay(bookingStart);
    const dayEnd = startOfDay(bookingEnd);
    const dayCount = Math.max(
      1,
      differenceInCalendarDays(dayEnd, dayStart) + 1,
    );

    const days: Date[] = [];
    for (let i = 0; i < dayCount; i++) {
      days.push(addDays(dayStart, i));
    }

    const revShares = splitEvenly(amounts.revenueOre, dayCount);
    const costShares = splitEvenly(amounts.costOre, dayCount);
    const depShares = splitEvenly(amounts.depOre, dayCount);
    const forceCompleted = status === "completed";

    days.forEach((day, i) => {
      if (day < rangeStart || day > rangeEnd) return;
      const bucket = ensure(day);
      if (forceCompleted || day < today) {
        bucket.revenueCompletedOre += revShares[i];
      } else {
        bucket.revenueUpcomingOre += revShares[i];
      }
      bucket.costOre += costShares[i];
      bucket.depOre += depShares[i];
    });
  }

  for (const b of bookings) {
    const linked = b.serviceEvents.reduce((s, e) => s + e.amountOre, 0);
    const rates = effectiveDepRates(asMarketCar(b.car), fits);
    const econ = bookingEconomics(b, rates, linked);
    allocateAcrossDays(b.plannedStartAt, b.plannedEndAt, b.status, {
      revenueOre: econ.revenueExVatOre,
      costOre: econ.costExVatOre,
      depOre: econ.expectedDepOre,
    });
  }

  for (const e of serviceEvents) {
    ensure(e.occurredOn).serviceOre += e.amountOre;
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
    };
    m.revenueCompletedOre += w.revenueCompletedOre;
    m.revenueUpcomingOre += w.revenueUpcomingOre;
    m.costOre += w.costOre;
    m.serviceOre += w.serviceOre;
    m.depOre += w.depOre;
    monthTotals.set(mk, m);
  }

  let cumRevenue = 0;
  let cumCompleted = 0;
  let cumUpcoming = 0;
  let cumCosts = 0;
  let cumDep = 0;

  return sorted.map((w) => {
    const revenueOre = w.revenueCompletedOre + w.revenueUpcomingOre;
    const costsOre = w.costOre + w.serviceOre;
    cumRevenue += revenueOre;
    cumCompleted += w.revenueCompletedOre;
    cumUpcoming += w.revenueUpcomingOre;
    cumCosts += costsOre;
    cumDep += w.depOre;
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
      monthRevenueOre,
      monthRevenueCompletedOre: mt.revenueCompletedOre,
      monthRevenueUpcomingOre: mt.revenueUpcomingOre,
      monthCostOre: mt.costOre,
      monthServiceOre: mt.serviceOre,
      monthDepOre: mt.depOre,
      monthCostsOre: mt.costOre + mt.serviceOre,
      cumRevenueOre: cumRevenue,
      cumRevenueCompletedOre: cumCompleted,
      cumRevenueUpcomingOre: cumUpcoming,
      cumCostsOre: cumCosts,
      cumDepOre: cumDep,
    };
  });
}

export async function loadPeriodBookings(from: Date, to: Date) {
  return prisma.booking.findMany({
    where: {
      status: { notIn: ["cancelled", "no_show", "draft"] },
      plannedStartAt: { lte: to },
      plannedEndAt: { gte: from },
    },
    include: {
      car: carWithMarket,
      lineItems: true,
      serviceEvents: true,
    },
    orderBy: { plannedStartAt: "desc" },
  });
}

export async function periodSummary(from: Date, to: Date) {
  const bookings = await loadPeriodBookings(from, to);
  const serviceEvents = await prisma.serviceEvent.findMany({
    where: { occurredOn: { gte: from, lte: to } },
  });
  const fits = await loadMarketFitCache(
    [
      ...new Set(
        bookings
          .map((b) => b.car.marketModel?.variant)
          .filter((v): v is string => Boolean(v)),
      ),
    ],
  );

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
    const linked = b.serviceEvents.reduce((s, e) => s + e.amountOre, 0);
    const rates = effectiveDepRates(asMarketCar(b.car), fits);
    const econ = bookingEconomics(b, rates, linked);
    revenueExVatOre += econ.revenueExVatOre;
    costExVatOre += econ.costExVatOre;
    expectedDepOre += econ.expectedDepOre;
    linkedServiceOre += linked;

    const key = b.carId;
    const row = perCar.get(key) ?? {
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
    row.km += econ.distanceDriven ?? 0;
    row.days += econ.rentalDays;
    perCar.set(key, row);
  }

  const unlinkedServiceOre = serviceEvents
    .filter((e) => !e.bookingId)
    .reduce((s, e) => s + e.amountOre, 0);
  const totalServiceOre = serviceEvents.reduce((s, e) => s + e.amountOre, 0);

  const totalKm = [...perCar.values()].reduce((s, r) => s + r.km, 0) || 1;
  for (const row of perCar.values()) {
    const share = (row.km / totalKm) * unlinkedServiceOre;
    row.linkedServiceOre += Math.round(share);
  }

  const cars = await prisma.car.findMany({
    where: { status: { not: "retired" } },
    include: { fixedCosts: true },
  });

  let fixedCostOre = 0;
  for (const car of cars) {
    const carFixed = sumProratedFixedCostsOre(car.fixedCosts, from, to);
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
    cars.length *
    Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
  const utilization =
    availableCarDays > 0 ? rentalDaysTotal / availableCarDays : 0;

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
    utilization,
    activeCars: cars.length,
    perCar: [...perCar.values()].sort(
      (a, b) => b.revenueExVatOre - a.revenueExVatOre,
    ),
    bookings,
  };
}

export async function getAlerts() {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400000);

  const upcoming = await prisma.booking.findMany({
    where: {
      status: { in: ["confirmed", "active"] },
      OR: [
        { plannedStartAt: { gte: now, lte: in7 } },
        { plannedEndAt: { gte: now, lte: in7 } },
      ],
    },
    include: { car: true },
    orderBy: { plannedStartAt: "asc" },
    take: 12,
  });

  const missingOdo = await prisma.booking.findMany({
    where: {
      status: "completed",
      drivenKm: null,
    },
    include: { car: true },
    take: 10,
  });

  const inspectionDue = await prisma.car.findMany({
    where: {
      status: { not: "retired" },
      nextInspectionDue: { lte: in7 },
    },
    orderBy: { nextInspectionDue: "asc" },
    take: 10,
  });

  const carsWithInterval = await prisma.car.findMany({
    where: {
      status: { not: "retired" },
      serviceIntervalKm: { not: null, gt: 0 },
    },
    include: {
      serviceEvents: {
        where: { type: "service", odometer: { not: null } },
        orderBy: { occurredOn: "desc" },
        take: 1,
      },
    },
  });

  const serviceDue = carsWithInterval
    .map((car) => {
      const interval = car.serviceIntervalKm!;
      const lastOdo =
        car.serviceEvents[0]?.odometer ?? car.purchaseOdometer ?? 0;
      const dueAtKm = lastOdo + interval;
      const kmRemaining = dueAtKm - car.currentOdometer;
      return {
        id: car.id,
        registrationPlate: car.registrationPlate,
        currentOdometer: car.currentOdometer,
        dueAtKm,
        kmRemaining,
        intervalKm: interval,
      };
    })
    .filter((c) => c.kmRemaining <= 2_000)
    .sort((a, b) => a.kmRemaining - b.kmRemaining)
    .slice(0, 10);

  return { upcoming, missingOdo, inspectionDue, serviceDue };
}

/**
 * Book value of active fleet: purchase − accumulated dep.
 * Completed bookings contribute their expected depreciation (days×daily + km×per-km).
 * Any extra odometer/ownership beyond those bookings is depreciated the same way,
 * so stale/low currentOdometer cannot zero out booking dep.
 */
export async function fleetExpectedValue(asOf: Date = new Date()) {
  const cars = await prisma.car.findMany({
    where: { status: { not: "retired" } },
    include: {
      marketModel: { select: { variant: true } },
      bookings: {
        where: { status: "completed" },
        select: {
          plannedStartAt: true,
          plannedEndAt: true,
          drivenKm: true,
        },
      },
    },
  });
  const fits = await loadMarketFitCache(
    [
      ...new Set(
        cars
          .map((c) => c.marketModel?.variant)
          .filter((v): v is string => Boolean(v)),
      ),
    ],
  );
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

    const rates = effectiveDepRates(asMarketCar(car), fits);
    let bookingDepOre = 0;
    let bookingKm = 0;
    let bookingDays = 0;
    for (const b of car.bookings) {
      bookingDepOre += expectedDepreciationOre(b, rates);
      bookingKm += Math.max(0, b.drivenKm ?? 0);
      bookingDays += rentalDays(b);
    }

    const ownedDays =
      car.purchaseDate != null
        ? Math.max(0, differenceInCalendarDays(today, startOfDay(car.purchaseDate)))
        : 0;
    const odoKm = Math.max(
      0,
      car.currentOdometer - (car.purchaseOdometer ?? 0),
    );
    const extraKm = Math.max(0, odoKm - bookingKm);
    const extraDays = Math.max(0, ownedDays - bookingDays);
    const depOre =
      bookingDepOre +
      extraKm * rates.depPerKmOre +
      extraDays * rates.depPerDayOre;
    const valueOre = Math.max(0, car.purchasePriceOre - depOre);
    accumulatedDepOre += Math.min(car.purchasePriceOre, depOre);
    expectedValueOre += valueOre;
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
