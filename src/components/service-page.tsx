"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteServiceAction } from "@/app/actions/service";
import { ServiceLogForm } from "@/components/service-log-form";
import { Card, PageHeader } from "@/components/ui";
import { formatBookingWhen, formatDate } from "@/lib/dates";
import { labelStatus } from "@/lib/labels";
import { formatNOK } from "@/lib/money";
import { fetchJson, queryKeys } from "@/lib/query-keys";

type ServicePayload = {
  events: {
    id: string;
    carId: string;
    bookingId: string | null;
    type: string;
    occurredOn: string;
    odometer: number | null;
    amountOre: number;
    vendor: string | null;
    car: { id: string; registrationPlate: string };
  }[];
  cars: {
    id: string;
    registrationPlate: string;
    currentOdometer: number;
    serviceIntervalKm: number | null;
  }[];
  bookings: {
    id: string;
    carId: string;
    customerName: string;
    plannedStartAt: string;
    pickupTime: string | null;
    car: { registrationPlate: string };
  }[];
};

export function ServicePageClient() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const highlight = searchParams.get("highlight");

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.service,
    queryFn: () => fetchJson<ServicePayload>("/api/service"),
  });

  useEffect(() => {
    if (!highlight) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.service });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["reports"] });
    void queryClient.invalidateQueries({ queryKey: ["cars"] });
  }, [highlight, queryClient]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        {error instanceof Error ? error.message : "Could not load service"}
      </div>
    );
  }

  if (isPending && !data) {
    return (
      <div>
        <PageHeader
          title="Service"
          subtitle="Log date + odometer — intervals are tracked in km"
        />
        <div className="mt-4 h-72 animate-pulse rounded-xl bg-stone-200/60" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <PageHeader
        title="Service"
        subtitle="Log date + odometer — intervals are tracked in km"
      />

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">Log service event</h2>
        <ServiceLogForm
          cars={data.cars}
          bookings={data.bookings.map((b) => ({
            id: b.id,
            carId: b.carId,
            label: `${b.car.registrationPlate} · ${b.customerName} · ${formatBookingWhen(b.plannedStartAt, b.pickupTime)}`,
          }))}
        />
      </Card>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="data w-full min-w-[880px]">
          <thead>
            <tr>
              <th>Date</th>
              <th>Car</th>
              <th>Odometer</th>
              <th>Type</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Booking</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.events.map((e) => (
              <tr key={e.id}>
                <td>{formatDate(e.occurredOn)}</td>
                <td>
                  <Link
                    href={`/cars/${e.carId}`}
                    className="text-teal-900 hover:underline"
                  >
                    {e.car.registrationPlate}
                  </Link>
                </td>
                <td>
                  {e.odometer != null
                    ? `${e.odometer.toLocaleString("nb-NO")} km`
                    : "—"}
                </td>
                <td>{labelStatus(e.type)}</td>
                <td>{e.vendor ?? "—"}</td>
                <td>{formatNOK(e.amountOre)}</td>
                <td>
                  {e.bookingId ? (
                    <Link
                      href={`/bookings/${e.bookingId}`}
                      className="text-teal-900 hover:underline"
                    >
                      Linked
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <form
                    action={async (fd) => {
                      await deleteServiceAction(fd);
                      await Promise.all([
                        queryClient.invalidateQueries({
                          queryKey: queryKeys.service,
                        }),
                        queryClient.invalidateQueries({
                          queryKey: ["dashboard"],
                        }),
                        queryClient.invalidateQueries({
                          queryKey: ["reports"],
                        }),
                      ]);
                    }}
                  >
                    <input type="hidden" name="id" value={e.id} />
                    <button
                      type="submit"
                      className="text-xs text-rose-700 hover:underline"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {data.events.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-stone-500">
                  No service events yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
