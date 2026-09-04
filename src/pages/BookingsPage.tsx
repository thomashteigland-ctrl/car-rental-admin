import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";
import { bookingEconomics } from "@/lib/booking-calc";
import { formatBookingWhen } from "@/lib/dates";
import { labelStatus, statusTone } from "@/lib/labels";
import { fitsFromData, effectiveDepRates } from "@/lib/market/depreciation";
import { formatNOK } from "@/lib/money";
import { useAppData } from "@/lib/store";

export function BookingsPage() {
  const data = useAppData();
  const fits = useMemo(() => fitsFromData(data), [data]);

  const bookings = useMemo(() => {
    return [...data.bookings]
      .sort(
        (a, b) =>
          new Date(b.plannedStartAt).getTime() - new Date(a.plannedStartAt).getTime(),
      )
      .map((b) => {
        const car = data.cars.find((c) => c.id === b.carId);
        const lineItems = data.lineItems.filter((i) => i.bookingId === b.id);
        const serviceOre = data.serviceEvents
          .filter((e) => e.bookingId === b.id)
          .reduce((s, e) => s + e.amountOre, 0);
        const model = car?.marketModelId
          ? data.marketModels.find((m) => m.id === car.marketModelId)
          : null;
        const rates = car
          ? effectiveDepRates(
              {
                purchasePriceOre: car.purchasePriceOre,
                purchaseOdometer: car.purchaseOdometer,
                fuelType: car.fuelType,
                marketModelId: car.marketModelId,
                marketModel: model ? { variant: model.variant } : null,
                depPerKmOre: car.depPerKmOre,
                depPerDayOre: car.depPerDayOre,
              },
              fits,
            )
          : { depPerKmOre: 0, depPerDayOre: 0 };
        const econ = bookingEconomics(
          {
            plannedStartAt: new Date(b.plannedStartAt),
            plannedEndAt: new Date(b.plannedEndAt),
            drivenKm: b.drivenKm,
            lineItems,
          },
          rates,
          serviceOre,
        );
        return { ...b, plate: car?.registrationPlate ?? "—", econ };
      });
  }, [data, fits]);

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
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link
                      to={`/bookings/${b.id}`}
                      className="font-medium text-teal-900 hover:underline"
                    >
                      {formatBookingWhen(b.plannedStartAt, b.pickupTime)}
                    </Link>
                    <div className="text-xs text-stone-500">
                      → {formatBookingWhen(b.plannedEndAt, b.deliveryTime)}
                    </div>
                  </td>
                  <td>{b.plate}</td>
                  <td>{b.customerName}</td>
                  <td>
                    <Badge className={statusTone(b.status)}>
                      {labelStatus(b.status)}
                    </Badge>
                  </td>
                  <td>{b.drivenKm != null ? `${b.drivenKm} km` : "—"}</td>
                  <td>{formatNOK(b.econ.revenueExVatOre)}</td>
                  <td>{formatNOK(b.econ.cashMarginOre)}</td>
                  <td
                    className={
                      b.econ.economicProfitOre >= 0
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }
                  >
                    {formatNOK(b.econ.economicProfitOre)}
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
