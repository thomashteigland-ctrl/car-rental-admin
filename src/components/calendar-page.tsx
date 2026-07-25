"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { addDays, format, isSameDay, parseISO } from "date-fns";
import { Button, Card, PageHeader } from "@/components/ui";
import { labelStatus } from "@/lib/labels";
import { fetchJson, queryKeys } from "@/lib/query-keys";

type CalendarPayload = {
  weekStart: string;
  weekEnd: string;
  days: string[];
  prev: string;
  next: string;
  cars: {
    id: string;
    registrationPlate: string;
    make: string;
    model: string;
  }[];
  bookings: {
    id: string;
    carId: string;
    customerName: string;
    status: string;
    plannedStartAt: string;
    plannedEndAt: string;
  }[];
};

export function CalendarPageClient() {
  const searchParams = useSearchParams();
  const week = searchParams.get("week");

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.calendar(week),
    queryFn: () => {
      const q = week ? `?week=${encodeURIComponent(week)}` : "";
      return fetchJson<CalendarPayload>(`/api/calendar${q}`);
    },
    placeholderData: keepPreviousData,
  });

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        {error instanceof Error ? error.message : "Could not load calendar"}
      </div>
    );
  }

  if (isPending && !data) {
    return (
      <div>
        <PageHeader title="Calendar" subtitle="Loading…" />
        <div className="mt-4 h-72 animate-pulse rounded-xl bg-stone-200/60" />
      </div>
    );
  }

  if (!data) return null;

  const weekStart = parseISO(data.weekStart);
  const weekEnd = parseISO(data.weekEnd);
  const days = data.days.map((d) => parseISO(d));

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle={`${format(weekStart, "dd MMM")} – ${format(weekEnd, "dd MMM yyyy")}`}
        actions={
          <>
            <Button href={`/calendar?week=${data.prev}`} variant="secondary">
              Previous
            </Button>
            <Button href="/calendar" variant="secondary">
              This week
            </Button>
            <Button href={`/calendar?week=${data.next}`} variant="secondary">
              Next
            </Button>
            <Button href="/bookings/new">New booking</Button>
          </>
        }
      />

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="sticky left-0 bg-stone-50 px-3 py-2 text-left text-xs font-medium uppercase text-stone-500">
                Car
              </th>
              {days.map((d) => (
                <th
                  key={d.toISOString()}
                  className="px-2 py-2 text-center text-xs font-medium text-stone-600"
                >
                  <div>{format(d, "EEE")}</div>
                  <div className="text-stone-400">{format(d, "dd.MM")}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.cars.map((car) => (
              <tr key={car.id} className="border-b border-stone-100">
                <td className="sticky left-0 bg-white px-3 py-2 font-medium text-stone-800">
                  <Link href={`/cars/${car.id}`} className="hover:underline">
                    {car.registrationPlate}
                  </Link>
                </td>
                {days.map((day) => {
                  const dayStart = day.getTime();
                  const dayEnd = addDays(day, 1).getTime();
                  const dayBookings = data.bookings.filter((b) => {
                    const start = new Date(b.plannedStartAt).getTime();
                    const end = new Date(b.plannedEndAt).getTime();
                    return (
                      b.carId === car.id && start < dayEnd && end >= dayStart
                    );
                  });
                  return (
                    <td
                      key={day.toISOString()}
                      className={`align-top px-1 py-1 ${
                        isSameDay(day, new Date()) ? "bg-teal-50/50" : ""
                      }`}
                    >
                      <div className="flex min-h-12 flex-col gap-1">
                        {dayBookings.map((b) => (
                          <Link
                            key={b.id}
                            href={`/bookings/${b.id}`}
                            className="block rounded bg-teal-800/90 px-1.5 py-1 text-[11px] leading-tight text-white hover:bg-teal-900"
                            title={`${b.customerName} · ${labelStatus(b.status)}`}
                          >
                            {b.customerName}
                          </Link>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {data.cars.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-stone-500">
                  Add cars to see the calendar.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
