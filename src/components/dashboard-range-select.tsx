import { useNavigate } from "react-router-dom";
import {
  DASHBOARD_RANGES,
  type DashboardRangeKey,
} from "@/lib/dashboard-range";

export function DashboardRangeSelect({
  range,
  month,
}: {
  range: DashboardRangeKey;
  month?: string | null;
}) {
  const navigate = useNavigate();

  return (
    <label className="flex items-center gap-2 text-sm text-stone-600">
      <span className="font-medium text-stone-700">Period</span>
      <select
        value={range}
        onChange={(e) => {
          const q = new URLSearchParams();
          const next = e.target.value as DashboardRangeKey;
          if (next !== "ytd") q.set("range", next);
          if (month) q.set("month", month);
          const s = q.toString();
          navigate(s ? `/?${s}` : "/");
        }}
        className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-800 outline-none ring-teal-700/30 focus:ring-2"
      >
        {DASHBOARD_RANGES.map((r) => (
          <option key={r.key} value={r.key}>
            {r.label}
          </option>
        ))}
      </select>
    </label>
  );
}
