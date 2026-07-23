import { differenceInCalendarDays } from "date-fns";

export const FIXED_COST_FREQUENCIES = [
  "weekly",
  "monthly",
  "quarterly",
  "half_yearly",
  "annually",
] as const;

export type FixedCostFrequency = (typeof FIXED_COST_FREQUENCIES)[number];

/** Average days in one billing cycle (for straight-line proration). */
const DAYS_PER_CYCLE: Record<FixedCostFrequency, number> = {
  weekly: 7,
  monthly: 365.25 / 12,
  quarterly: 365.25 / 4,
  half_yearly: 365.25 / 2,
  annually: 365.25,
};

export function isFixedCostFrequency(
  value: string,
): value is FixedCostFrequency {
  return (FIXED_COST_FREQUENCIES as readonly string[]).includes(value);
}

export function labelFixedCostFrequency(frequency: string): string {
  const map: Record<string, string> = {
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    half_yearly: "Half-yearly",
    annually: "Annually",
  };
  return map[frequency] ?? frequency;
}

export type FixedCostLike = {
  amountOre: number;
  frequency: string;
};

/** Inclusive calendar-day proration of a recurring fixed cost into [from, to]. */
export function prorateFixedCostOre(
  cost: FixedCostLike,
  from: Date,
  to: Date,
): number {
  if (!isFixedCostFrequency(cost.frequency) || cost.amountOre <= 0) return 0;
  const days = Math.max(0, differenceInCalendarDays(to, from) + 1);
  if (days <= 0) return 0;
  const cycleDays = DAYS_PER_CYCLE[cost.frequency];
  return Math.round((cost.amountOre * days) / cycleDays);
}

export function sumProratedFixedCostsOre(
  costs: FixedCostLike[],
  from: Date,
  to: Date,
): number {
  return costs.reduce((sum, c) => sum + prorateFixedCostOre(c, from, to), 0);
}
