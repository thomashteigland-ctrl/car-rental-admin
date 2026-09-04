import { format } from "date-fns";
import { distanceDriven, sumLineItems } from "./booking-calc";
import {
  DASHBOARD_RANGES,
  filterWeeklyByRange,
  parseDashboardRangeParam,
  periodFromWeeklyWindow,
  type DashboardRangeKey,
} from "./dashboard-range";
import { fitsFromData } from "./market/depreciation";
import {
  annualizedRunRate,
  fleetExpectedValue,
  getAlerts,
  loadSettledPeriodBookings,
  monthParam,
  nextPeriod,
  periodFromMonthParam,
  periodSummary,
  previousPeriod,
  rentalStartSpan,
  weeklyEconomicsSeries,
  type WeeklyPoint,
} from "./reports";
import type { AppData } from "./types";

function leanSummary(summary: ReturnType<typeof periodSummary>) {
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
  fleet: ReturnType<typeof fleetExpectedValue>;
  alerts: ReturnType<typeof getAlerts>;
  monthSummary: ReturnType<typeof leanSummary>;
  rangeSummary: ReturnType<typeof leanSummary>;
  runRateRevenueOre: number;
  runRateKm: number;
  avgRevenuePerKmOre: number | null;
};

export function loadDashboardData(
  data: AppData,
  opts: { range?: string | null; month?: string | null },
): DashboardPayload {
  const rangeKey = parseDashboardRangeParam(opts.range);
  const monthPeriod = periodFromMonthParam(opts.month);
  const monthLabel = format(monthPeriod.from, "MMMM yyyy");
  const monthKey = opts.month ?? null;
  const prevMonth = monthParam(previousPeriod(monthPeriod).from);
  const nextMonth = monthParam(nextPeriod(monthPeriod).from);
  const rangeLabel =
    DASHBOARD_RANGES.find((r) => r.key === rangeKey)?.label ?? "This year";

  const fits = fitsFromData(data);
  const monthSummary = periodSummary(data, monthPeriod.from, monthPeriod.to, fits);
  const alerts = getAlerts(data);
  const weekly = weeklyEconomicsSeries(data, new Date(), fits);
  const fleet = fleetExpectedValue(data, new Date(), fits);
  const windowed = filterWeeklyByRange(weekly, rangeKey);
  const rangePeriod = periodFromWeeklyWindow(windowed);
  const rangeSummary = periodSummary(data, rangePeriod.from, rangePeriod.to, fits);
  const settledBookings = loadSettledPeriodBookings(
    data,
    rangePeriod.from,
    rangePeriod.to,
  );

  let settledRevenueOre = 0;
  let settledKm = 0;
  for (const b of settledBookings) {
    settledRevenueOre += sumLineItems(b.lineItems, "revenue").exVatOre;
    settledKm += distanceDriven(b) ?? 0;
  }
  const span = rentalStartSpan(settledBookings);
  const runRateRevenueOre = span
    ? annualizedRunRate(settledRevenueOre, span.from, span.to)
    : 0;
  const runRateKm = span ? annualizedRunRate(settledKm, span.from, span.to) : 0;

  let completedRevenueOre = 0;
  let completedKm = 0;
  for (const b of settledBookings) {
    if (b.status !== "completed") continue;
    completedRevenueOre += sumLineItems(b.lineItems, "revenue").exVatOre;
    completedKm += distanceDriven(b) ?? 0;
  }
  const avgRevenuePerKmOre =
    completedKm > 0 ? Math.round(completedRevenueOre / completedKm) : null;

  return {
    rangeKey,
    rangeLabel,
    monthKey,
    monthLabel,
    prevMonth,
    nextMonth,
    weekly,
    fleet,
    alerts,
    monthSummary: leanSummary(monthSummary),
    rangeSummary: leanSummary(rangeSummary),
    runRateRevenueOre,
    runRateKm,
    avgRevenuePerKmOre,
  };
}
