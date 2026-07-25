"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";
import { formatBookingWhen } from "@/lib/dates";
import { labelStatus, statusTone } from "@/lib/labels";
import { formatNOK } from "@/lib/money";
import { fetchJson, queryKeys } from "@/lib/query-keys";

type BookingsPayload = {
  bookings: {
    id: string;
    plannedStartAt: string;
    plannedEndAt: string;
    pickupTime: string | null;
    deliveryTime: string | null;
    customerName: string;
    status: string;
    registrationPlate: string;
    km: number | null;
    revenueExVatOre: number;
    cashMarginOre: number;
    economicProfitOre: number;
  }[];
};

export function BookingsPageClient() {
  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.bookings,
    queryFn: () => fetchJson<BookingsPayload>("/api/bookings"),
  });

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        {error instanceof Error ? error.message : "Could not load bookings"}
      </div>
    );
  }

  const bookings = data?.bookings ?? [];

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle="Rentals with schedule, distance and P&L"
        actions={<Button href="/bookings/new">New booking</Button>}
      />
      {isPending && !data ? (
        <div className="h-48 animate-pulse rounded-xl bg-stone-200/60" />
      ) : bookings.length === 0 ? (
        <EmptyState
          title="No bookings"
          action={<Button href="/bookings/new">New booking</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="data w-full min-w-[900px]">
            <thead>
              <tr>
                <th>Period</th>
                <th>Car</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Km</th>
                <th>Revenue</th>
                <th>Cash margin</th>
                <th>Econ. profit</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link
                      href={`/bookings/${b.id}`}
                      className="font-medium text-teal-900 hover:underline"
                    >
                      {formatBookingWhen(b.plannedStartAt, b.pickupTime)}
                    </Link>
                    <div className="text-xs text-stone-500">
                      → {formatBookingWhen(b.plannedEndAt, b.deliveryTime)}
                    </div>
                  </td>
                  <td>{b.registrationPlate}</td>
                  <td>{b.customerName}</td>
                  <td>
                    <Badge className={statusTone(b.status)}>
                      {labelStatus(b.status)}
                    </Badge>
                  </td>
                  <td>{b.km != null ? `${b.km} km` : "—"}</td>
                  <td>{formatNOK(b.revenueExVatOre)}</td>
                  <td>{formatNOK(b.cashMarginOre)}</td>
                  <td
                    className={
                      b.economicProfitOre >= 0
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }
                  >
                    {formatNOK(b.economicProfitOre)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
