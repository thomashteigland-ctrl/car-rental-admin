import { notFound } from "next/navigation";
import {
  deleteBookingAction,
  deleteLineItemAction,
} from "@/app/actions/bookings";
import { BookingForm } from "@/components/booking-form";
import { BookingScheduleForm } from "@/components/booking-schedule-form";
import { LineItemForm } from "@/components/line-item-form";
import { Badge, Button, Card, PageHeader, StatCard } from "@/components/ui";
import { bookingEconomics, distanceDriven } from "@/lib/booking-calc";
import { formatBookingWhen } from "@/lib/dates";
import { labelStatus, statusTone } from "@/lib/labels";
import { formatNOK } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [booking, cars, categories] = await Promise.all([
    prisma.booking.findUnique({
      where: { id },
      include: {
        car: true,
        lineItems: { orderBy: { createdAt: "asc" } },
        serviceEvents: true,
      },
    }),
    prisma.car.findMany({ orderBy: { registrationPlate: "asc" } }),
    prisma.lineItemCategory.findMany({
      where: { active: true },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    }),
  ]);
  if (!booking) notFound();

  const linkedService = booking.serviceEvents.reduce(
    (s, e) => s + e.amountOre,
    0,
  );
  const econ = bookingEconomics(booking, booking.car, linkedService);
  const km = distanceDriven(booking);

  return (
    <div>
      <PageHeader
        title={`${booking.customerName} · ${booking.car.registrationPlate}`}
        subtitle={`${formatBookingWhen(booking.plannedStartAt, booking.pickupTime)} → ${formatBookingWhen(booking.plannedEndAt, booking.deliveryTime)}`}
        actions={
          <Badge className={statusTone(booking.status)}>
            {labelStatus(booking.status)}
          </Badge>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue ex VAT" value={formatNOK(econ.revenueExVatOre)} />
        <StatCard
          label="Cash margin"
          value={formatNOK(econ.cashMarginOre)}
          tone={econ.cashMarginOre >= 0 ? "good" : "bad"}
        />
        <StatCard
          label="Expected depreciation"
          value={formatNOK(econ.expectedDepOre)}
          hint={`${econ.rentalDays} d · ${km ?? 0} km`}
          tone="warn"
        />
        <StatCard
          label="Economic profit"
          value={formatNOK(econ.economicProfitOre)}
          hint={
            linkedService
              ? `Includes ${formatNOK(linkedService)} linked service`
              : undefined
          }
          tone={econ.economicProfitOre >= 0 ? "good" : "bad"}
        />
      </div>

      <div className="mb-6">
        <BookingScheduleForm booking={booking} />
      </div>

      <Card className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Line items</h2>
        </div>
        <table className="data mb-4 w-full">
          <thead>
            <tr>
              <th>Kind</th>
              <th>Category</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Amount ex VAT</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {booking.lineItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <span
                    className={
                      item.kind === "revenue"
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }
                  >
                    {item.kind === "revenue" ? "Revenue" : "Cost"}
                  </span>
                </td>
                <td>{item.category}</td>
                <td>{item.description}</td>
                <td>{item.quantity}</td>
                <td>
                  {formatNOK(Math.round(item.amountOre * item.quantity))}
                  <span className="ml-1 text-xs text-stone-400">
                    ({item.vatPercent}% VAT)
                  </span>
                </td>
                <td>
                  <form action={deleteLineItemAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      className="text-xs text-rose-700 hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {booking.lineItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-stone-500">
                  No line items yet — add revenue and costs below.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <LineItemForm bookingId={booking.id} categories={categories} />
      </Card>

      <BookingForm booking={booking} cars={cars} />

      <form action={deleteBookingAction} className="mt-8">
        <input type="hidden" name="id" value={booking.id} />
        <Button type="submit" variant="danger">
          Delete booking
        </Button>
      </form>
    </div>
  );
}
