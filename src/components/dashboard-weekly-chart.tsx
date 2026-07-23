"use client";

import { useMemo, useState } from "react";
import { parseISO, startOfDay, startOfWeek } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  upcoming: "#38bdf8",
  costs: "#be123c",
  dep: "#d97706",
};

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
};

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
          <dt className="text-sky-600">Upcoming / forecast</dt>
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
        </dl>
      </div>
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
  return data.map((d) => {
    cumRevenue += d.revenueOre;
    cumCompleted += d.revenueCompletedOre;
    cumUpcoming += d.revenueUpcomingOre;
    cumCosts += d.costsOre;
    cumDep += d.depOre;
    return {
      ...d,
      cumRevenueOre: cumRevenue,
      cumRevenueCompletedOre: cumCompleted,
      cumRevenueUpcomingOre: cumUpcoming,
      cumCostsOre: cumCosts,
      cumDepOre: cumDep,
    };
  });
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
    };
    return map[value] ?? value;
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">
            Weekly earnings
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            {mode === "cumulative"
              ? "Teal = actual completed · blue continues as forecast"
              : "Completed vs upcoming · toggle costs / dep to recolor revenue"}
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

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {mode === "stacked" ? (
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e7e5e4"
                vertical={false}
              />
              <XAxis
                dataKey="weekNumber"
                tick={{ fontSize: 9, fill: "#78716c" }}
                interval={0}
                tickFormatter={(v: number) => `${v}`}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#78716c" }}
                tickFormatter={(v: number) =>
                  new Intl.NumberFormat("nb-NO", {
                    notation: "compact",
                    compactDisplay: "short",
                  }).format(v)
                }
                width={48}
              />
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
                wrapperStyle={{ fontSize: 12 }}
                formatter={legendFormatter}
              />
              <Bar
                dataKey="completedKr"
                name="completedKr"
                stackId="a"
                fill={COLORS.completed}
              />
              <Bar
                dataKey="upcomingKr"
                name="upcomingKr"
                stackId="a"
                fill={COLORS.upcoming}
                radius={showCosts || showDep ? [0, 0, 0, 0] : [3, 3, 0, 0]}
              />
              {showCosts ? (
                <Bar
                  dataKey="costsKr"
                  name="costsKr"
                  stackId="a"
                  fill={COLORS.costs}
                  radius={showDep ? [0, 0, 0, 0] : [3, 3, 0, 0]}
                />
              ) : null}
              {showDep ? (
                <Bar
                  dataKey="depKr"
                  name="depKr"
                  stackId="a"
                  fill={COLORS.dep}
                  radius={[3, 3, 0, 0]}
                />
              ) : null}
            </BarChart>
          ) : (
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e7e5e4"
                vertical={false}
              />
              <XAxis
                dataKey="weekNumber"
                tick={{ fontSize: 9, fill: "#78716c" }}
                interval={0}
                tickFormatter={(v: number) => `${v}`}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#78716c" }}
                tickFormatter={(v: number) =>
                  new Intl.NumberFormat("nb-NO", {
                    notation: "compact",
                    compactDisplay: "short",
                  }).format(v)
                }
                width={48}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    mode={mode}
                    showCosts={showCosts}
                    showDep={showDep}
                  />
                }
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={legendFormatter}
              />
              <Line
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
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
