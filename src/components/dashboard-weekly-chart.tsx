"use client";

import { useMemo, useState } from "react";
import { parseISO, startOfDay, startOfWeek } from "date-fns";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  filterWeeklyByRange,
  type DashboardRangeKey,
} from "@/lib/dashboard-range";
import type { WeeklyPoint } from "@/lib/reports";
import { formatNOK, oreToKr } from "@/lib/money";

type Mode = "stacked" | "cumulative";

const COLORS = {
  completed: "#0f766e",
  /** Same teal as completed, more transparent for upcoming / forecast */
  upcoming: "rgba(15, 118, 110, 0.38)",
  costs: "#be123c",
  dep: "#d97706",
  revPerKm: "#0e7490",
  km: "#334155",
};

/** Keep plot areas aligned across the stacked charts. */
const AXIS = {
  leftWidth: 52,
  rightWidth: 64,
  margin: { top: 4, right: 4, left: 0, bottom: 4 },
} as const;

/** Carve costs/dep out of revenue; keep completed/upcoming proportion. */
function carveRevenue(
  completedOre: number,
  upcomingOre: number,
  costsOre: number,
  depOre: number,
  showCosts: boolean,
  showDep: boolean,
) {
  const total = completedOre + upcomingOre;
  let costsShow = showCosts ? costsOre : 0;
  let depShow = showDep ? depOre : 0;
  if (total <= 0) {
    return {
      completedOre: 0,
      upcomingOre: 0,
      costsOre: costsShow,
      depOre: depShow,
    };
  }
  if (costsShow + depShow > total) {
    const scale = total / (costsShow + depShow);
    costsShow = Math.round(costsShow * scale);
    depShow = total - costsShow;
  }
  const remaining = total - costsShow - depShow;
  const completedNet = Math.round(remaining * (completedOre / total));
  const upcomingNet = remaining - completedNet;
  return {
    completedOre: completedNet,
    upcomingOre: upcomingNet,
    costsOre: costsShow,
    depOre: depShow,
  };
}

type ChartRow = WeeklyPoint & {
  completedKr: number;
  upcomingKr: number;
  costsKr: number;
  depKr: number;
  /** Cumulative actual (completed) — null after pivot */
  actualKr: number | null;
  /** Cumulative forecast (includes upcoming) — null before pivot */
  forecastKr: number | null;
  /** Revenue/km in kr — null when no km */
  revPerKmKr: number | null;
  kmValue: number;
};

function formatKm(km: number) {
  return `${Math.round(km).toLocaleString("nb-NO")} km`;
}

function ChartTooltip({
  active,
  payload,
  mode,
  showCosts,
  showDep,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
  mode: Mode;
  showCosts: boolean;
  showDep: boolean;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const completed =
    mode === "cumulative" ? p.cumRevenueCompletedOre : p.revenueCompletedOre;
  const upcoming =
    mode === "cumulative" ? p.cumRevenueUpcomingOre : p.revenueUpcomingOre;
  const revenue = completed + upcoming;
  const costs = mode === "cumulative" ? p.cumCostsOre : p.costsOre;
  const dep = mode === "cumulative" ? p.cumDepOre : p.depOre;
  const km = mode === "cumulative" ? p.cumKm : p.km;
  const revPerKmOre =
    mode === "cumulative" ? p.cumRevenuePerKmOre : p.revenuePerKmOre;

  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs shadow-lg">
      <div className="font-semibold text-stone-900">
        Week {p.weekNumber} · {p.weekLabel}
      </div>
      <div className="mt-0.5 text-stone-500">
        {mode === "cumulative"
          ? p.forecastKr != null && p.actualKr == null
            ? "Forecast (cumulative)"
            : "Actual (cumulative)"
          : "This week"}
      </div>
      <dl className="mt-2 space-y-1">
        <div className="flex justify-between gap-6">
          <dt className="text-teal-800">Completed</dt>
          <dd className="font-medium tabular-nums">{formatNOK(completed)}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="text-teal-700/70">Upcoming / forecast</dt>
          <dd className="font-medium tabular-nums">{formatNOK(upcoming)}</dd>
        </div>
        <div className="flex justify-between gap-6 border-t border-stone-100 pt-1">
          <dt className="font-medium text-stone-700">Revenue total</dt>
          <dd className="font-medium tabular-nums">{formatNOK(revenue)}</dd>
        </div>
        {showCosts ? (
          <div className="flex justify-between gap-6">
            <dt className="text-rose-800">Costs</dt>
            <dd className="font-medium tabular-nums">{formatNOK(costs)}</dd>
          </div>
        ) : null}
        {showDep ? (
          <div className="flex justify-between gap-6">
            <dt className="text-amber-800">Depreciation</dt>
            <dd className="font-medium tabular-nums">{formatNOK(dep)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-6 border-t border-stone-100 pt-1">
          <dt className="text-slate-700">Driven km</dt>
          <dd className="font-medium tabular-nums">{formatKm(km)}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="text-cyan-800">Revenue / km</dt>
          <dd className="font-medium tabular-nums">
            {revPerKmOre != null
              ? formatNOK(revPerKmOre, { decimals: 2 })
              : "—"}
          </dd>
        </div>
      </dl>
      <div className="mt-2 border-t border-stone-100 pt-2">
        <div className="font-semibold text-stone-800">{p.monthLabel}</div>
        <div className="mt-0.5 text-stone-500">Full month totals</div>
        <dl className="mt-1.5 space-y-1">
          <div className="flex justify-between gap-6">
            <dt>Completed</dt>
            <dd className="tabular-nums">
              {formatNOK(p.monthRevenueCompletedOre)}
            </dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt>Upcoming</dt>
            <dd className="tabular-nums">
              {formatNOK(p.monthRevenueUpcomingOre)}
            </dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt>Revenue</dt>
            <dd className="tabular-nums">{formatNOK(p.monthRevenueOre)}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt>Km</dt>
            <dd className="tabular-nums">{formatKm(p.monthKm)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function KmTooltip({
  active,
  payload,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
  mode: Mode;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const km = mode === "cumulative" ? p.cumKm : p.km;
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs shadow-lg">
      <div className="font-semibold text-stone-900">
        Week {p.weekNumber} · {p.weekLabel}
      </div>
      <div className="mt-0.5 text-stone-500">
        {mode === "cumulative" ? "Cumulative" : "This week"}
      </div>
      <dl className="mt-2 space-y-1">
        <div className="flex justify-between gap-6">
          <dt className="text-slate-700">Driven km</dt>
          <dd className="font-medium tabular-nums">{formatKm(km)}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="text-stone-500">Month total</dt>
          <dd className="tabular-nums">{formatKm(p.monthKm)}</dd>
        </div>
      </dl>
    </div>
  );
}

function RevPerKmTooltip({
  active,
  payload,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
  mode: Mode;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const km = mode === "cumulative" ? p.cumKm : p.km;
  const revPerKmOre =
    mode === "cumulative" ? p.cumRevenuePerKmOre : p.revenuePerKmOre;
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-xs shadow-lg">
      <div className="font-semibold text-stone-900">
        Week {p.weekNumber} · {p.weekLabel}
      </div>
      <div className="mt-0.5 text-stone-500">
        {mode === "cumulative"
          ? "Cumulative avg · completed bookings"
          : "This week · completed bookings"}
      </div>
      <dl className="mt-2 space-y-1">
        <div className="flex justify-between gap-6">
          <dt className="text-cyan-800">Revenue / km</dt>
          <dd className="font-medium tabular-nums">
            {revPerKmOre != null
              ? formatNOK(revPerKmOre, { decimals: 2 })
              : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="text-stone-500">Driven km</dt>
          <dd className="tabular-nums">{formatKm(km)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  swatch,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  swatch: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-stone-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 rounded border-stone-300 text-teal-800 focus:ring-teal-700"
      />
      <span
        className="inline-block size-2.5 rounded-sm"
        style={{ background: swatch }}
        aria-hidden
      />
      {label}
    </label>
  );
}

/** Recompute cumulatives from the visible window (not full-year server cum). */
function withWindowCumulative(data: WeeklyPoint[]): WeeklyPoint[] {
  let cumRevenue = 0;
  let cumCompleted = 0;
  let cumUpcoming = 0;
  let cumCosts = 0;
  let cumDep = 0;
  let cumKm = 0;
  let cumCompletedBookingRevenue = 0;
  return data.map((d) => {
    cumRevenue += d.revenueOre;
    cumCompleted += d.revenueCompletedOre;
    cumUpcoming += d.revenueUpcomingOre;
    cumCosts += d.costsOre;
    cumDep += d.depOre;
    cumKm += d.km;
    cumCompletedBookingRevenue += d.completedBookingRevenueOre;
    return {
      ...d,
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

function compactNumber(v: number) {
  return new Intl.NumberFormat("nb-NO", {
    notation: "compact",
    compactDisplay: "short",
  }).format(v);
}

/** Invisible right axis — reserves the same width as the top chart. */
function SpacerRightAxis() {
  return (
    <YAxis
      yAxisId="spacer"
      orientation="right"
      width={AXIS.rightWidth}
      tick={false}
      axisLine={false}
      tickLine={false}
    />
  );
}

function WeekXAxis() {
  return (
    <XAxis
      dataKey="weekNumber"
      tick={{ fontSize: 9, fill: "#78716c" }}
      interval={0}
      tickFormatter={(v: number) => `${v}`}
      height={28}
    />
  );
}

function ChartGrid() {
  return (
    <CartesianGrid
      strokeDasharray="3 3"
      stroke="#e7e5e4"
      vertical
      horizontal
    />
  );
}

export function DashboardWeeklyChart({
  data,
  range,
}: {
  data: WeeklyPoint[];
  range: DashboardRangeKey;
}) {
  const [mode, setMode] = useState<Mode>("stacked");
  const [showCosts, setShowCosts] = useState(false);
  const [showDep, setShowDep] = useState(false);

  const chartData = useMemo(() => {
    const windowed = withWindowCumulative(filterWeeklyByRange(data, range));
    const today = startOfDay(new Date());
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

    // Last fully past week ends before today → pivot is the week before current
    // Forecast connects there and continues through current + future weeks.
    let pivotIdx = windowed.findIndex((d) => {
      const weekStart = parseISO(d.weekKey);
      return weekStart >= currentWeekStart;
    });
    if (pivotIdx < 0) pivotIdx = windowed.length; // all in the past
    const lastActualIdx = pivotIdx - 1;

    return windowed.map((d, i): ChartRow => {
      const revPerKmOre =
        mode === "cumulative" ? d.cumRevenuePerKmOre : d.revenuePerKmOre;
      const kmValue = mode === "cumulative" ? d.cumKm : d.km;

      if (mode === "stacked") {
        const carved = carveRevenue(
          d.revenueCompletedOre,
          d.revenueUpcomingOre,
          d.costsOre,
          d.depOre,
          showCosts,
          showDep,
        );
        return {
          ...d,
          completedKr: oreToKr(carved.completedOre),
          upcomingKr: oreToKr(carved.upcomingOre),
          costsKr: oreToKr(carved.costsOre),
          depKr: oreToKr(carved.depOre),
          actualKr: null,
          forecastKr: null,
          revPerKmKr: revPerKmOre != null ? oreToKr(revPerKmOre) : null,
          kmValue,
        };
      }

      const cumCompletedKr = oreToKr(d.cumRevenueCompletedOre);
      const cumAllKr = oreToKr(d.cumRevenueOre);
      const costsKr = oreToKr(showCosts ? d.cumCostsOre : 0);
      const depKr = oreToKr(showDep ? d.cumDepOre : 0);

      // Teal through last fully completed week; blue from that point onward
      let actualKr: number | null = null;
      let forecastKr: number | null = null;
      if (lastActualIdx < 0) {
        // Everything is current/future — all forecast
        forecastKr = cumAllKr;
      } else if (i < lastActualIdx) {
        actualKr = cumCompletedKr;
      } else if (i === lastActualIdx) {
        actualKr = cumCompletedKr;
        forecastKr = cumCompletedKr; // shared hinge point
      } else {
        forecastKr = cumAllKr;
      }

      return {
        ...d,
        completedKr: cumCompletedKr,
        upcomingKr: oreToKr(d.cumRevenueUpcomingOre),
        costsKr,
        depKr,
        actualKr,
        forecastKr,
        revPerKmKr: revPerKmOre != null ? oreToKr(revPerKmOre) : null,
        kmValue,
      };
    });
  }, [data, mode, range, showCosts, showDep]);

  const legendFormatter = (value: string) => {
    const map: Record<string, string> = {
      completedKr: "Completed",
      upcomingKr: "Upcoming",
      costsKr: "Costs",
      depKr: "Depreciation",
      actualKr: "Completed",
      forecastKr: "Forecast",
      revPerKmKr: "Revenue / km",
      kmValue: "Km",
    };
    return map[value] ?? value;
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">
            Weekly earnings
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            {mode === "cumulative"
              ? "Solid teal = completed · lighter teal continues as forecast · panels share week columns"
              : "Completed vs upcoming (lighter teal) · panels share week columns · toggle costs / dep"}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="inline-flex rounded-lg border border-stone-300 bg-stone-50 p-0.5 self-start sm:self-end">
            <button
              type="button"
              onClick={() => setMode("stacked")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                mode === "stacked"
                  ? "bg-teal-800 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Stacked bars
            </button>
            <button
              type="button"
              onClick={() => setMode("cumulative")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                mode === "cumulative"
                  ? "bg-teal-800 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Cumulative lines
            </button>
          </div>
          <div className="flex flex-wrap gap-4 self-start sm:self-end">
            <Toggle
              checked={showCosts}
              onChange={setShowCosts}
              label="Costs"
              swatch={COLORS.costs}
            />
            <Toggle
              checked={showDep}
              onChange={setShowDep}
              label="Depreciation"
              swatch={COLORS.dep}
            />
          </div>
        </div>
      </div>

      {/* Earnings */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={AXIS.margin}>
            <ChartGrid />
            <WeekXAxis />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: "#78716c" }}
              tickFormatter={compactNumber}
              width={AXIS.leftWidth}
            />
            <SpacerRightAxis />
            <Tooltip
              content={
                <ChartTooltip
                  mode={mode}
                  showCosts={showCosts}
                  showDep={showDep}
                />
              }
              cursor={{ fill: "rgba(15, 118, 110, 0.06)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
              formatter={legendFormatter}
            />
            {mode === "stacked" ? (
              <>
                <Bar
                  yAxisId="left"
                  dataKey="completedKr"
                  name="completedKr"
                  stackId="a"
                  fill={COLORS.completed}
                />
                <Bar
                  yAxisId="left"
                  dataKey="upcomingKr"
                  name="upcomingKr"
                  stackId="a"
                  fill={COLORS.upcoming}
                  radius={showCosts || showDep ? [0, 0, 0, 0] : [3, 3, 0, 0]}
                />
                {showCosts ? (
                  <Bar
                    yAxisId="left"
                    dataKey="costsKr"
                    name="costsKr"
                    stackId="a"
                    fill={COLORS.costs}
                    radius={showDep ? [0, 0, 0, 0] : [3, 3, 0, 0]}
                  />
                ) : null}
                {showDep ? (
                  <Bar
                    yAxisId="left"
                    dataKey="depKr"
                    name="depKr"
                    stackId="a"
                    fill={COLORS.dep}
                    radius={[3, 3, 0, 0]}
                  />
                ) : null}
              </>
            ) : (
              <>
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="actualKr"
                  name="actualKr"
                  stroke={COLORS.completed}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="forecastKr"
                  name="forecastKr"
                  stroke={COLORS.upcoming}
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
                {showCosts ? (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="costsKr"
                    name="costsKr"
                    stroke={COLORS.costs}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                ) : null}
                {showDep ? (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="depKr"
                    name="depKr"
                    stroke={COLORS.dep}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                ) : null}
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Kilometres — flush under earnings */}
      <div className="border-t border-stone-100 pt-1">
        <div className="mb-0.5 flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold text-stone-800">
            Weekly kilometres
          </h3>
          <p className="text-[11px] text-stone-500">
            Completed bookings
            {mode === "cumulative" ? " · cumulative" : ""}
          </p>
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={AXIS.margin}>
              <ChartGrid />
              <WeekXAxis />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: "#78716c" }}
                tickFormatter={compactNumber}
                width={AXIS.leftWidth}
              />
              <SpacerRightAxis />
              <Tooltip content={<KmTooltip mode={mode} />} />
              {mode === "stacked" ? (
                <Bar
                  yAxisId="left"
                  dataKey="kmValue"
                  name="kmValue"
                  fill={COLORS.km}
                  radius={[3, 3, 0, 0]}
                />
              ) : (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="kmValue"
                  name="kmValue"
                  stroke={COLORS.km}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue / km — flush under km */}
      <div className="border-t border-stone-100 pt-1">
        <div className="mb-0.5 flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold text-stone-800">
            Revenue per kilometre
          </h3>
          <p className="text-[11px] text-stone-500">
            Completed revenue ÷ km
            {mode === "cumulative" ? " · cumulative avg" : ""}
          </p>
        </div>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={AXIS.margin}>
              <ChartGrid />
              <WeekXAxis />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: "#78716c" }}
                tickFormatter={(v: number) => `${compactNumber(v)} kr`}
                width={AXIS.leftWidth}
              />
              <SpacerRightAxis />
              <Tooltip content={<RevPerKmTooltip mode={mode} />} />
              {mode === "stacked" ? (
                <Bar
                  yAxisId="left"
                  dataKey="revPerKmKr"
                  name="revPerKmKr"
                  fill={COLORS.revPerKm}
                  radius={[3, 3, 0, 0]}
                />
              ) : (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revPerKmKr"
                  name="revPerKmKr"
                  stroke={COLORS.revPerKm}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
