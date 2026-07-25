import { format } from "date-fns";
import {
  DASHBOARD_RANGES,
  filterWeeklyByRange,
  parseDashboardRangeParam,
  periodFromWeeklyWindow,
  type DashboardRangeKey,
} from "@/lib/dashboard-range";
import { loadMarketFitCache } from "@/lib/market/depreciation";
import {
  annualizedRunRate,
  fleetExpectedValue,
  getAlerts,
  monthParam,
  nextPeriod,
  periodFromMonthParam,
  periodSummary,
  previousPeriod,
  rentalStartSpan,
  weeklyEconomicsSeries,
  type WeeklyPoint,
} from "@/lib/reports";

function leanSummary(
  summary: Awaited<ReturnType<typeof periodSummary>>,
) {
  const { bookings: _bookings, ...rest } = summary;
  return rest;
}

export type DashboardPayload = {
  rangeKey: DashboardRangeKey;
  rangeLabel: string;
  monthKey: string | null;
  monthLabel: string;
  prevMonth: string;
  nextMonth: string;
  weekly: WeeklyPoint[];
  fleet: Awaited<ReturnType<typeof fleetExpectedValue>>;
  alerts: {
    upcoming: {
      id: string;
      customerName: string;
      status: string;
      plannedStartAt: string;
      plannedEndAt: string;
      pickupTime: string | null;
      deliveryTime: string | null;
      car: { registrationPlate: string };
    }[];
    missingOdo: {
      id: string;
      car: { registrationPlate: string };
    }[];
    inspectionDue: {
      id: string;
      registrationPlate: string;
    }[];
    serviceDue: {
      id: string;
      registrationPlate: string;
      kmRemaining: number;
    }[];
  };
  monthSummary: ReturnType<typeof leanSummary>;
  rangeSummary: ReturnType<typeof leanSummary>;
  rangePeriod: { from: string; to: string };
  runRateRevenueOre: number;
  runRateKm: number;
  avgRevenuePerKmOre: number | null;
};

export async function loadDashboardData(opts: {
  range?: string | null;
  month?: string | null;
}): Promise<DashboardPayload> {
  const rangeKey = parseDashboardRangeParam(opts.range);
  const monthPeriod = periodFromMonthParam(opts.month);
  const monthLabel = format(monthPeriod.from, "MMMM yyyy");
  const monthKey = opts.month ?? null;
  const prevMonth = monthParam(previousPeriod(monthPeriod).from);
  const nextMonth = monthParam(nextPeriod(monthPeriod).from);
  const rangeLabel =
    DASHBOARD_RANGES.find((r) => r.key === rangeKey)?.label ?? "This year";

  const fits = await loadMarketFitCache();
  const [monthSummary, alerts, weekly, fleet] = await Promise.all([
    periodSummary(monthPeriod.from, monthPeriod.to, fits),
    getAlerts(),
    weeklyEconomicsSeries(new Date(), fits),
    fleetExpectedValue(new Date(), fits),
  ]);

  const windowed = filterWeeklyByRange(weekly, rangeKey);
  const rangePeriod = periodFromWeeklyWindow(windowed);
  const rangeSummary = await periodSummary(
    rangePeriod.from,
    rangePeriod.to,
    fits,
  );

  // Run-rate span = first→last rental start in the selected period (not calendar window).
  const span = rentalStartSpan(rangeSummary.bookings);
  const runRateRevenueOre = span
    ? annualizedRunRate(
        rangeSummary.revenueExVatOre,
        span.from,
        span.to,
      )
    : 0;
  const runRateKm = span
    ? annualizedRunRate(rangeSummary.rentedKm, span.from, span.to)
    : 0;
  const avgRevenuePerKmOre =
    rangeSummary.rentedKm > 0
      ? Math.round(rangeSummary.revenueExVatOre / rangeSummary.rentedKm)
      : null;

  return {
    rangeKey,
    rangeLabel,
    monthKey,
    monthLabel,
    prevMonth,
    nextMonth,
    weekly,
    fleet,
    alerts: {
      upcoming: alerts.upcoming.map((b) => ({
        id: b.id,
        customerName: b.customerName,
        status: b.status,
        plannedStartAt: b.plannedStartAt.toISOString(),
        plannedEndAt: b.plannedEndAt.toISOString(),
        pickupTime: b.pickupTime,
        deliveryTime: b.deliveryTime,
        car: { registrationPlate: b.car.registrationPlate },
      })),
      missingOdo: alerts.missingOdo.map((b) => ({
        id: b.id,
        car: { registrationPlate: b.car.registrationPlate },
      })),
      inspectionDue: alerts.inspectionDue.map((c) => ({
        id: c.id,
        registrationPlate: c.registrationPlate,
      })),
      serviceDue: alerts.serviceDue.map((c) => ({
        id: c.id,
        registrationPlate: c.registrationPlate,
        kmRemaining: c.kmRemaining,
      })),
    },
    monthSummary: leanSummary(monthSummary),
    rangeSummary: leanSummary(rangeSummary),
    rangePeriod: {
      from: rangePeriod.from.toISOString(),
      to: rangePeriod.to.toISOString(),
    },
    runRateRevenueOre,
    runRateKm,
    avgRevenuePerKmOre,
  };
}
