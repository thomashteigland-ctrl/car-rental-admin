import {
  addWeeks,
  endOfDay,
  endOfWeek,
  parseISO,
  startOfDay,
  startOfWeek,
  startOfYear,
} from "date-fns";

export type DashboardRangeKey = "ytd" | "8w" | "12w" | "26w";

export const DASHBOARD_RANGES: { key: DashboardRangeKey; label: string }[] = [
  { key: "ytd", label: "This year" },
  { key: "8w", label: "Last 8 weeks" },
  { key: "12w", label: "Last 12 weeks" },
  { key: "26w", label: "Last 26 weeks" },
];

export function parseDashboardRangeParam(
  value?: string | null,
): DashboardRangeKey {
  if (value === "8w" || value === "12w" || value === "26w" || value === "ytd") {
    return value;
  }
  return "ytd";
}

/**
 * Window the weekly series for the dashboard period control.
 * YTD keeps the full year (including future confirmed weeks).
 * Last N weeks anchors on the current week so future year-end weeks
 * don't shift the window away from "now".
 */
export function filterWeeklyByRange<T extends { weekKey: string }>(
  data: T[],
  range: DashboardRangeKey,
  asOf: Date = new Date(),
): T[] {
  if (range === "ytd" || data.length === 0) return data;
  const weeks = Number(range.replace("w", ""));
  const anchor = startOfWeek(asOf, { weekStartsOn: 1 });
  const cutoff = addWeeks(anchor, -(weeks - 1));
  return data.filter((d) => {
    const start = parseISO(d.weekKey);
    return start >= cutoff;
  });
}

/** Calendar bounds matching the visible weekly chart window. */
export function periodFromWeeklyWindow(
  weeks: { weekKey: string }[],
): { from: Date; to: Date } {
  if (weeks.length === 0) {
    const now = new Date();
    return { from: startOfYear(now), to: endOfDay(now) };
  }
  const from = startOfDay(parseISO(weeks[0].weekKey));
  const lastStart = parseISO(weeks[weeks.length - 1].weekKey);
  const to = endOfWeek(lastStart, { weekStartsOn: 1 });
  return { from, to };
}
