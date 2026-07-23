import Link from "next/link";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";
import { bookingEconomics, distanceDriven } from "@/lib/booking-calc";
import { formatBookingWhen } from "@/lib/dates";
import { labelStatus, statusTone } from "@/lib/labels";
import { formatNOK } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function BookingsPage() {
  const bookings = await prisma.booking.findMany({
    include: { car: true, lineItems: true },
    orderBy: { plannedStartAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle="Rentals with schedule, distance and P&L"
        actions={<Button href="/bookings/new">New booking</Button>}
      />
      {bookings.length === 0 ? (
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
              {bookings.map((b) => {
                const econ = bookingEconomics(b, b.car);
                const km = distanceDriven(b);
                return (
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
                    <td>{b.car.registrationPlate}</td>
                    <td>{b.customerName}</td>
                    <td>
                      <Badge className={statusTone(b.status)}>
                        {labelStatus(b.status)}
                      </Badge>
                    </td>
                    <td>{km != null ? `${km} km` : "—"}</td>
                    <td>{formatNOK(econ.revenueExVatOre)}</td>
                    <td>{formatNOK(econ.cashMarginOre)}</td>
                    <td
                      className={
                        econ.economicProfitOre >= 0
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }
                    >
                      {formatNOK(econ.economicProfitOre)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
