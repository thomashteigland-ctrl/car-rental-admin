import Link from "next/link";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { Button, Card, PageHeader, StatCard } from "@/components/ui";
import { bookingEconomics } from "@/lib/booking-calc";
import { formatBookingWhen, formatDateTime } from "@/lib/dates";
import { formatNOK } from "@/lib/money";
import { defaultPeriod, periodSummary } from "@/lib/reports";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const fallback = defaultPeriod();
  const from = params.from ? startOfMonth(parseISO(params.from)) : fallback.from;
  const to = params.to ? endOfMonth(parseISO(params.to)) : fallback.to;
  const summary = await periodSummary(from, to);

  const fromStr = format(from, "yyyy-MM-dd");
  const toStr = format(to, "yyyy-MM-dd");

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Period P&L with depreciation and service"
        actions={
          <Button
            href={`/api/export/bookings?from=${fromStr}&to=${toStr}`}
            variant="secondary"
          >
            Export CSV
          </Button>
        }
      />

      <Card className="mb-4">
        <form className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">From</span>
            <input
              type="date"
              name="from"
              defaultValue={fromStr}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">To</span>
            <input
              type="date"
              name="to"
              defaultValue={toStr}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue ex VAT" value={formatNOK(summary.revenueExVatOre)} />
        <StatCard label="Direct costs" value={formatNOK(summary.costExVatOre)} />
        <StatCard
          label="Cash margin"
          value={formatNOK(summary.cashMarginOre)}
          tone={summary.cashMarginOre >= 0 ? "good" : "bad"}
        />
        <StatCard
          label="Expected depreciation"
          value={formatNOK(summary.expectedDepOre)}
        />
        <StatCard label="Service" value={formatNOK(summary.totalServiceOre)} />
        <StatCard label="Fixed costs" value={formatNOK(summary.fixedCostOre)} />
        <StatCard
          label="Economic profit"
          value={formatNOK(summary.economicProfitOre)}
          tone={summary.economicProfitOre >= 0 ? "good" : "bad"}
        />
        <StatCard
          label="Actual profit"
          value={formatNOK(summary.actualProfitOre)}
          hint="Economic − fixed costs"
          tone={summary.actualProfitOre >= 0 ? "good" : "bad"}
        />
      </div>

      <Card className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Per car</h2>
        <table className="data w-full">
          <thead>
            <tr>
              <th>Car</th>
              <th>Bookings</th>
              <th>Km</th>
              <th>Revenue</th>
              <th>Cash margin</th>
              <th>Dep</th>
              <th>Service</th>
              <th>Fixed</th>
              <th>Actual profit</th>
            </tr>
          </thead>
          <tbody>
            {summary.perCar.map((row) => {
              const margin = row.revenueExVatOre - row.costExVatOre;
              const profit =
                margin -
                row.expectedDepOre -
                row.linkedServiceOre -
                row.fixedCostOre;
              return (
                <tr key={row.carId}>
                  <td>
                    <Link
                      href={`/cars/${row.carId}`}
                      className="text-teal-900 hover:underline"
                    >
                      {row.label}
                    </Link>
                  </td>
                  <td>{row.bookingCount}</td>
                  <td>{row.km}</td>
                  <td>{formatNOK(row.revenueExVatOre)}</td>
                  <td>{formatNOK(margin)}</td>
                  <td>{formatNOK(row.expectedDepOre)}</td>
                  <td>{formatNOK(row.linkedServiceOre)}</td>
                  <td>{formatNOK(row.fixedCostOre)}</td>
                  <td
                    className={
                      profit >= 0 ? "text-emerald-700" : "text-rose-700"
                    }
                  >
                    {formatNOK(profit)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="mt-4">
        <h2 className="mb-3 text-sm font-semibold">Bookings in period</h2>
        <table className="data w-full">
          <thead>
            <tr>
              <th>Start</th>
              <th>Car</th>
              <th>Customer</th>
              <th>Revenue</th>
              <th>Economic profit</th>
            </tr>
          </thead>
          <tbody>
            {summary.bookings.map((b) => {
              const linked = b.serviceEvents.reduce(
                (s, e) => s + e.amountOre,
                0,
              );
              const econ = bookingEconomics(b, b.car, linked);
              return (
                <tr key={b.id}>
                  <td>
                    <Link
                      href={`/bookings/${b.id}`}
                      className="text-teal-900 hover:underline"
                    >
                      {formatBookingWhen(b.plannedStartAt, b.pickupTime)}
                    </Link>
                  </td>
                  <td>{b.car.registrationPlate}</td>
                  <td>{b.customerName}</td>
                  <td>{formatNOK(econ.revenueExVatOre)}</td>
                  <td>{formatNOK(econ.economicProfitOre)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
