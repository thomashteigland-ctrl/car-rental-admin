import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Card, PageHeader, StatCard } from "@/components/ui";
import { bookingsCsv, downloadText } from "@/lib/csv";
import { formatBookingWhen, toDateInputValue } from "@/lib/dates";
import { fitsFromData } from "@/lib/market/depreciation";
import { formatNOK } from "@/lib/money";
import {
  defaultPeriod,
  periodSummary,
} from "@/lib/reports";
import { useAppData } from "@/lib/store";

export function ReportsPage() {
  const data = useAppData();
  const [params, setParams] = useSearchParams();
  const fallback = defaultPeriod();
  const from = params.get("from") || toDateInputValue(fallback.from);
  const to = params.get("to") || toDateInputValue(fallback.to);

  const summary = useMemo(() => {
    const fits = fitsFromData(data);
    return periodSummary(data, new Date(from), new Date(to), fits);
  }, [data, from, to]);

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Period P&L with depreciation and service"
        actions={
          <Button
            variant="secondary"
            onClick={() =>
              downloadText("bookings.csv", bookingsCsv(data), "text/csv")
            }
          >
            Export CSV
          </Button>
        }
      />

      <Card className="mb-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const q = new URLSearchParams();
            q.set("from", String(fd.get("from") ?? ""));
            q.set("to", String(fd.get("to") ?? ""));
            setParams(q);
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">From</span>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">To</span>
            <input
              type="date"
              name="to"
              defaultValue={to}
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
        <StatCard label="Expected depreciation" value={formatNOK(summary.expectedDepOre)} />
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
        <div className="overflow-x-auto">
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
                  margin - row.expectedDepOre - row.linkedServiceOre - row.fixedCostOre;
                return (
                  <tr key={row.carId}>
                    <td>
                      <Link to={`/cars/${row.carId}`} className="text-teal-900 hover:underline">
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
                    <td className={profit >= 0 ? "text-emerald-700" : "text-rose-700"}>
                      {formatNOK(profit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
            </tr>
          </thead>
          <tbody>
            {summary.bookings.map((b) => (
              <tr key={b.id}>
                <td>
                  <Link to={`/bookings/${b.id}`} className="text-teal-900 hover:underline">
                    {formatBookingWhen(b.plannedStartAt, b.pickupTime)}
                  </Link>
                </td>
                <td>{b.car.registrationPlate}</td>
                <td>{b.customerName}</td>
                <td>
                  {formatNOK(
                    b.lineItems
                      .filter((i) => i.kind === "revenue")
                      .reduce((s, i) => s + Math.round(i.amountOre * i.quantity), 0),
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
