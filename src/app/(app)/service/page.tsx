import Link from "next/link";
import { deleteServiceAction } from "@/app/actions/service";
import { ServiceLogForm } from "@/components/service-log-form";
import { Card, PageHeader } from "@/components/ui";
import { formatBookingWhen, formatDate } from "@/lib/dates";
import { labelStatus } from "@/lib/labels";
import { formatNOK } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function ServicePage() {
  const [events, cars, bookings] = await Promise.all([
    prisma.serviceEvent.findMany({
      include: { car: true, booking: true },
      orderBy: { occurredOn: "desc" },
      take: 100,
    }),
    prisma.car.findMany({
      where: { status: { not: "retired" } },
      orderBy: { registrationPlate: "asc" },
    }),
    prisma.booking.findMany({
      where: { status: { notIn: ["cancelled"] } },
      include: { car: true },
      orderBy: { plannedStartAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Service"
        subtitle="Log date + odometer — intervals are tracked in km"
      />

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">Log service event</h2>
        <ServiceLogForm
          cars={cars.map((c) => ({
            id: c.id,
            registrationPlate: c.registrationPlate,
            currentOdometer: c.currentOdometer,
            serviceIntervalKm: c.serviceIntervalKm,
          }))}
          bookings={bookings.map((b) => ({
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
            {events.map((e) => (
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
                  <form action={deleteServiceAction}>
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
            {events.length === 0 ? (
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
