import Link from "next/link";
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  startOfWeek,
} from "date-fns";
import { Button, Card, PageHeader } from "@/components/ui";
import { labelStatus } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const anchor = params.week ? new Date(params.week) : new Date();
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const cars = await prisma.car.findMany({
    where: { status: { not: "retired" } },
    orderBy: { registrationPlate: "asc" },
  });

  const bookings = await prisma.booking.findMany({
    where: {
      status: { notIn: ["cancelled", "no_show"] },
      plannedStartAt: { lte: weekEnd },
      plannedEndAt: { gte: weekStart },
    },
  });

  const prev = format(addDays(weekStart, -7), "yyyy-MM-dd");
  const next = format(addDays(weekStart, 7), "yyyy-MM-dd");

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle={`${format(weekStart, "dd MMM")} – ${format(weekEnd, "dd MMM yyyy")}`}
        actions={
          <>
            <Button href={`/calendar?week=${prev}`} variant="secondary">
              Previous
            </Button>
            <Button href="/calendar" variant="secondary">
              This week
            </Button>
            <Button href={`/calendar?week=${next}`} variant="secondary">
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
            {cars.map((car) => (
              <tr key={car.id} className="border-b border-stone-100">
                <td className="sticky left-0 bg-white px-3 py-2 font-medium text-stone-800">
                  <Link href={`/cars/${car.id}`} className="hover:underline">
                    {car.registrationPlate}
                  </Link>
                </td>
                {days.map((day) => {
                  const dayBookings = bookings.filter(
                    (b) =>
                      b.carId === car.id &&
                      b.plannedStartAt <= addDays(day, 1) &&
                      b.plannedEndAt >= day,
                  );
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
            {cars.length === 0 ? (
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
