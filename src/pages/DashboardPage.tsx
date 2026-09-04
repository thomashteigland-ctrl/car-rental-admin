import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DashboardRangeSelect } from "@/components/dashboard-range-select";
import { DashboardWeeklyChart } from "@/components/dashboard-weekly-chart";
import { Badge, Button, Card, PageHeader, StatCard } from "@/components/ui";
import { loadDashboardData } from "@/lib/dashboard";
import { formatBookingWhen } from "@/lib/dates";
import { labelStatus, statusTone } from "@/lib/labels";
import { formatNOK } from "@/lib/money";
import { useAppData } from "@/lib/store";

function dashboardHref(opts: { range?: string | null; month?: string | null }) {
  const q = new URLSearchParams();
  if (opts.range && opts.range !== "ytd") q.set("range", opts.range);
  if (opts.month) q.set("month", opts.month);
  const s = q.toString();
  return s ? `/?${s}` : "/";
}

function formatKm(km: number) {
  return `${Math.round(km).toLocaleString("nb-NO")} km`;
}

export function DashboardPage() {
  const data = useAppData();
  const [params] = useSearchParams();
  const payload = useMemo(
    () =>
      loadDashboardData(data, {
        range: params.get("range"),
        month: params.get("month"),
      }),
    [data, params],
  );

  const {
    rangeKey,
    rangeLabel,
    monthKey,
    monthLabel,
    prevMonth,
    nextMonth,
    weekly,
    fleet,
    alerts,
    monthSummary,
    rangeSummary,
    runRateRevenueOre,
    runRateKm,
    avgRevenuePerKmOre,
  } = payload;

  const rangeRev = rangeSummary.revenueExVatOre;
  const monthRev = monthSummary.revenueExVatOre;
  const pctOf = (rev: number, ore: number) =>
    rev > 0 ? `${Math.round((ore / rev) * 100)}% of rev` : "—";

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Earnings overview, weekly chart, then month detail"
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">
            Overview — {rangeLabel}
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            Run-rates annualize period totals over first→last rental start in
            the selection
          </p>
        </div>
        <DashboardRangeSelect range={rangeKey} month={monthKey} />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-3">
          <StatCard
            label="Run-rate revenue"
            value={formatNOK(runRateRevenueOre)}
            hint="Annualized · completed + no-show · × 365 / (max − min start)"
          />
          <StatCard
            label="Revenue this period"
            value={formatNOK(rangeSummary.revenueExVatOre)}
            hint={`${rangeSummary.bookingCount} bookings · ex VAT`}
          />
        </div>
        <div className="grid gap-3">
          <StatCard
            label="Run-rate kilometers"
            value={formatKm(runRateKm)}
            hint="Annualized · completed + no-show · × 365 / (max − min start)"
          />
          <StatCard
            label="Kilometers rented this period"
            value={formatKm(rangeSummary.rentedKm)}
            hint="Driven km on completed bookings in window"
          />
        </div>
        <div className="grid gap-3">
          <StatCard
            label="Avg revenue / km"
            value={
              avgRevenuePerKmOre != null
                ? formatNOK(avgRevenuePerKmOre, { decimals: 2 })
                : "—"
            }
            hint={
              avgRevenuePerKmOre != null
                ? "Completed rentals only · revenue ÷ km"
                : "No completed rentals with km yet"
            }
          />
          <StatCard
            label="Economic profit this period"
            value={formatNOK(rangeSummary.economicProfitOre)}
            pct={pctOf(rangeRev, rangeSummary.economicProfitOre)}
            hint="Revenue − direct costs − dep − service"
            tone={rangeSummary.economicProfitOre >= 0 ? "good" : "bad"}
          />
        </div>
        <div className="grid gap-3">
          <StatCard
            label="Fleet value"
            value={formatNOK(fleet.expectedValueOre)}
            hint={
              fleet.missingPurchasePrice > 0
                ? `${fleet.valuedCars} cars · ${fleet.missingPurchasePrice} missing price`
                : `${fleet.valuedCars} cars · purchase − booking dep`
            }
          />
        </div>
      </div>

      <div className="mb-6">
        <DashboardWeeklyChart data={weekly} range={rangeKey} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">
            Month detail — {monthLabel}
          </h2>
          <p className="mt-0.5 text-xs text-stone-500">
            Stats and per-car breakdown for the selected month
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href={dashboardHref({ range: rangeKey, month: prevMonth })} variant="secondary">
            Previous
          </Button>
          <Button href={dashboardHref({ range: rangeKey })} variant="secondary">
            This month
          </Button>
          <Button href={dashboardHref({ range: rangeKey, month: nextMonth })} variant="secondary">
            Next
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue (ex VAT)"
          value={formatNOK(monthSummary.revenueExVatOre)}
          hint={`${monthSummary.bookingCount} bookings`}
        />
        <StatCard
          label="Cash profit"
          value={formatNOK(monthSummary.cashMarginOre)}
          pct={pctOf(monthRev, monthSummary.cashMarginOre)}
          hint="Revenue − direct costs"
          tone={monthSummary.cashMarginOre >= 0 ? "good" : "bad"}
        />
        <StatCard
          label="Depreciation"
          value={formatNOK(monthSummary.expectedDepOre)}
          pct={pctOf(monthRev, monthSummary.expectedDepOre)}
          hint="Expected dep this month"
          tone="warn"
        />
        <StatCard
          label="Actual profit"
          value={formatNOK(monthSummary.actualProfitOre)}
          pct={pctOf(monthRev, monthSummary.actualProfitOre)}
          hint="Economic − fixed costs"
          tone={monthSummary.actualProfitOre >= 0 ? "good" : "bad"}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Direct costs" value={formatNOK(monthSummary.costExVatOre)} hint="Booking line-item costs" />
        <StatCard label="Service costs" value={formatNOK(monthSummary.totalServiceOre)} hint="In month (linked + unlinked)" />
        <StatCard
          label="Fixed costs"
          value={formatNOK(monthSummary.fixedCostOre)}
          pct={pctOf(monthRev, monthSummary.fixedCostOre)}
          hint="Prorated recurring car costs"
        />
        <StatCard
          label="Utilization"
          value={`${Math.round(monthSummary.utilization * 100)}%`}
          hint={`${monthSummary.activeCars} active cars`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-stone-900">
            Upcoming pickups & returns
          </h2>
          <ul className="mt-3 divide-y divide-stone-100">
            {alerts.upcoming.length === 0 ? (
              <li className="py-3 text-sm text-stone-500">Nothing in the next 7 days.</li>
            ) : (
              alerts.upcoming.map((b) => (
                <li key={b.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <Link
                      to={`/bookings/${b.id}`}
                      className="text-sm font-medium text-teal-900 hover:underline"
                    >
                      {b.customerName} · {b.car.registrationPlate}
                    </Link>
                    <div className="text-xs text-stone-500">
                      {formatBookingWhen(b.plannedStartAt, b.pickupTime)} →{" "}
                      {formatBookingWhen(b.plannedEndAt, b.deliveryTime)}
                    </div>
                  </div>
                  <Badge className={statusTone(b.status)}>{labelStatus(b.status)}</Badge>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-stone-900">Alerts</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {alerts.missingOdo.map((b) => (
              <li key={b.id} className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                Missing driven km on completed booking —{" "}
                <Link to={`/bookings/${b.id}`} className="underline">
                  {b.car.registrationPlate}
                </Link>
              </li>
            ))}
            {alerts.inspectionDue.map((c) => (
              <li key={c.id} className="rounded-lg bg-rose-50 px-3 py-2 text-rose-900">
                Inspection due —{" "}
                <Link to={`/cars/${c.id}`} className="underline">
                  {c.registrationPlate}
                </Link>
              </li>
            ))}
            {alerts.serviceDue.map((c) => (
              <li
                key={c.id}
                className={`rounded-lg px-3 py-2 ${
                  c.kmRemaining <= 0 ? "bg-rose-50 text-rose-900" : "bg-amber-50 text-amber-900"
                }`}
              >
                Service{" "}
                {c.kmRemaining <= 0
                  ? `${Math.abs(c.kmRemaining).toLocaleString("nb-NO")} km overdue`
                  : `due in ${c.kmRemaining.toLocaleString("nb-NO")} km`}{" "}
                —{" "}
                <Link to={`/cars/${c.id}`} className="underline">
                  {c.registrationPlate}
                </Link>
              </li>
            ))}
            {alerts.missingOdo.length +
              alerts.inspectionDue.length +
              alerts.serviceDue.length ===
            0 ? (
              <li className="text-stone-500">No open alerts.</li>
            ) : null}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900">Per-car — {monthLabel}</h2>
          <Link to="/reports" className="text-sm text-teal-800 hover:underline">
            Full reports →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data w-full min-w-[640px]">
            <thead>
              <tr>
                <th>Car</th>
                <th>Bookings</th>
                <th>Revenue</th>
                <th>Cash margin</th>
                <th>Dep</th>
                <th>Fixed</th>
                <th>Actual profit</th>
              </tr>
            </thead>
            <tbody>
              {monthSummary.perCar.map((row) => {
                const margin = row.revenueExVatOre - row.costExVatOre;
                const profit =
                  margin - row.expectedDepOre - row.linkedServiceOre - row.fixedCostOre;
                return (
                  <tr key={row.carId}>
                    <td>
                      <Link to={`/cars/${row.carId}`} className="text-teal-900 hover:underline">
                        {row.label}
                      </Link>
                    </td>
                    <td>{row.bookingCount}</td>
                    <td>{formatNOK(row.revenueExVatOre)}</td>
                    <td>{formatNOK(margin)}</td>
                    <td>{formatNOK(row.expectedDepOre)}</td>
                    <td>{formatNOK(row.fixedCostOre)}</td>
                    <td className={profit >= 0 ? "text-emerald-700" : "text-rose-700"}>
                      {formatNOK(profit)}
                    </td>
                  </tr>
                );
              })}
              {monthSummary.perCar.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-stone-500">
                    No cars or bookings this month yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
