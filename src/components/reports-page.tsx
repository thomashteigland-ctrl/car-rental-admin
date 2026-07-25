"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button, Card, PageHeader, StatCard } from "@/components/ui";
import { formatBookingWhen } from "@/lib/dates";
import { formatNOK } from "@/lib/money";
import { fetchJson, queryKeys } from "@/lib/query-keys";

type ReportsPayload = {
  from: string;
  to: string;
  summary: {
    revenueExVatOre: number;
    costExVatOre: number;
    cashMarginOre: number;
    expectedDepOre: number;
    totalServiceOre: number;
    fixedCostOre: number;
    economicProfitOre: number;
    actualProfitOre: number;
    perCar: {
      carId: string;
      label: string;
      bookingCount: number;
      km: number;
      revenueExVatOre: number;
      costExVatOre: number;
      expectedDepOre: number;
      linkedServiceOre: number;
      fixedCostOre: number;
    }[];
  };
  bookingRows: {
    id: string;
    customerName: string;
    plannedStartAt: string;
    pickupTime: string | null;
    registrationPlate: string;
    revenueExVatOre: number;
    economicProfitOre: number;
  }[];
};

export function ReportsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.reports(fromParam, toParam),
    queryFn: () => {
      const q = new URLSearchParams();
      if (fromParam) q.set("from", fromParam);
      if (toParam) q.set("to", toParam);
      const qs = q.toString();
      return fetchJson<ReportsPayload>(
        qs ? `/api/reports?${qs}` : "/api/reports",
      );
    },
    placeholderData: keepPreviousData,
  });

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        {error instanceof Error ? error.message : "Could not load reports"}
      </div>
    );
  }

  if (isPending && !data) {
    return (
      <div>
        <PageHeader title="Reports" subtitle="Period P&L with depreciation and service" />
        <div className="mt-4 h-72 animate-pulse rounded-xl bg-stone-200/60" />
      </div>
    );
  }

  if (!data) return null;
  const { summary } = data;

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Period P&L with depreciation and service"
        actions={
          <Button
            href={`/api/export/bookings?from=${data.from}&to=${data.to}`}
            variant="secondary"
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
            const from = String(fd.get("from") ?? "");
            const to = String(fd.get("to") ?? "");
            const q = new URLSearchParams();
            if (from) q.set("from", from);
            if (to) q.set("to", to);
            router.push(`/reports?${q.toString()}`);
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">From</span>
            <input
              type="date"
              name="from"
              defaultValue={data.from}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-stone-600">To</span>
            <input
              type="date"
              name="to"
              defaultValue={data.to}
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
            {data.bookingRows.map((b) => (
              <tr key={b.id}>
                <td>
                  <Link
                    href={`/bookings/${b.id}`}
                    className="text-teal-900 hover:underline"
                  >
                    {formatBookingWhen(b.plannedStartAt, b.pickupTime)}
                  </Link>
                </td>
                <td>{b.registrationPlate}</td>
                <td>{b.customerName}</td>
                <td>{formatNOK(b.revenueExVatOre)}</td>
                <td>{formatNOK(b.economicProfitOre)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
