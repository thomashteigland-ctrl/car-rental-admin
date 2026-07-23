import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCarAction } from "@/app/actions/cars";
import { CarFixedCosts } from "@/components/car-fixed-costs";
import { CarForm } from "@/components/car-form";
import { OdometerReadingForm } from "@/components/odometer-reading-form";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { bookingEconomics } from "@/lib/booking-calc";
import { formatBookingWhen, formatDate } from "@/lib/dates";
import { labelStatus, statusTone } from "@/lib/labels";
import {
  formatDepHint,
  resolveCarDepLive,
} from "@/lib/market/depreciation";
import { formatNOK } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [car, marketModels] = await Promise.all([
    prisma.car.findUnique({
      where: { id },
      include: {
        marketModel: true,
        bookings: {
          include: { lineItems: true },
          orderBy: { plannedStartAt: "desc" },
          take: 20,
        },
        serviceEvents: { orderBy: { occurredOn: "desc" }, take: 10 },
        odometerReadings: {
          orderBy: [{ recordedAt: "desc" }, { odometerKm: "desc" }],
          take: 20,
        },
        fixedCosts: { orderBy: { name: "asc" } },
      },
    }),
    prisma.marketModel.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, variant: true },
    }),
  ]);
  if (!car) notFound();

  const dep = await resolveCarDepLive({
    purchasePriceOre: car.purchasePriceOre,
    purchaseOdometer: car.purchaseOdometer,
    fuelType: car.fuelType,
    marketModelId: car.marketModelId,
    marketModel: car.marketModel
      ? { variant: car.marketModel.variant }
      : null,
    depPerKmOre: car.depPerKmOre,
    depPerDayOre: car.depPerDayOre,
  });

  const lastService = car.serviceEvents.find(
    (e) => e.type === "service" && e.odometer != null,
  );
  const serviceIntervalKm = car.serviceIntervalKm;
  const lastServiceOdo =
    lastService?.odometer ?? car.purchaseOdometer ?? null;
  const nextServiceAtKm =
    serviceIntervalKm != null &&
    serviceIntervalKm > 0 &&
    lastServiceOdo != null
      ? lastServiceOdo + serviceIntervalKm
      : null;
  const kmToService =
    nextServiceAtKm != null ? nextServiceAtKm - car.currentOdometer : null;

  return (
    <div>
      <PageHeader
        title={`${car.make} ${car.model}`}
        subtitle={car.registrationPlate}
        actions={
          <>
            <Badge className={statusTone(car.status)}>
              {labelStatus(car.status)}
            </Badge>
            <Button href={`/bookings/new?carId=${car.id}`}>New booking</Button>
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-xs uppercase text-stone-500">Odometer</div>
          <div className="mt-1 text-xl font-semibold">
            {car.currentOdometer.toLocaleString("nb-NO")} km
          </div>
          <OdometerReadingForm
            carId={car.id}
            currentOdometer={car.currentOdometer}
          />
        </Card>
        <Card>
          <div className="text-xs uppercase text-stone-500">Next service</div>
          {nextServiceAtKm != null && kmToService != null ? (
            <>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {nextServiceAtKm.toLocaleString("nb-NO")} km
              </div>
              <div
                className={`mt-0.5 text-xs ${
                  kmToService <= 0
                    ? "text-rose-700"
                    : kmToService <= 2000
                      ? "text-amber-700"
                      : "text-stone-500"
                }`}
              >
                {kmToService <= 0
                  ? `${Math.abs(kmToService).toLocaleString("nb-NO")} km overdue`
                  : `${kmToService.toLocaleString("nb-NO")} km remaining`}
                {serviceIntervalKm
                  ? ` · every ${serviceIntervalKm.toLocaleString("nb-NO")} km`
                  : ""}
              </div>
            </>
          ) : (
            <div className="mt-1 text-sm text-stone-500">
              Set a service interval on the car to track this.
            </div>
          )}
        </Card>
        <Card>
          <div className="text-xs uppercase text-stone-500">Depreciation</div>
          <div className="mt-1 text-sm">
            {formatNOK(dep.rates.depPerKmOre, { decimals: 2 })}/km
            {dep.source === "manual"
              ? ` · ${formatNOK(dep.rates.depPerDayOre, { decimals: 2 })}/day`
              : " · km only"}
          </div>
          <div className="mt-0.5 text-xs text-stone-500">
            {dep.error ? dep.error : formatDepHint(dep)}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-stone-500">Purchase</div>
          <div className="mt-1 text-sm">
            {car.purchasePriceOre != null
              ? formatNOK(car.purchasePriceOre)
              : "—"}
          </div>
          <div className="mt-0.5 text-xs text-stone-500">
            Odo at purchase:{" "}
            {(car.purchaseOdometer ?? 0).toLocaleString("nb-NO")} km
            {car.marketModel ? ` · ${car.marketModel.name}` : ""}
            {car.fuelType ? ` · ${car.fuelType}` : ""}
          </div>
        </Card>
      </div>

      <CarForm car={car} marketModels={marketModels} />

      <div className="mt-6">
        <CarFixedCosts carId={car.id} costs={car.fixedCosts} />
      </div>

      <Card className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Odometer history</h2>
        <ul className="divide-y divide-stone-100 text-sm">
          {car.odometerReadings.map((r) => (
            <li key={r.id} className="flex justify-between gap-3 py-2">
              <span className="text-stone-600">{formatDate(r.recordedAt)}</span>
              <span className="font-medium tabular-nums">
                {r.odometerKm.toLocaleString("nb-NO")} km
              </span>
            </li>
          ))}
          {car.odometerReadings.length === 0 ? (
            <li className="py-2 text-stone-500">
              No dated readings yet — record one above to build a history for
              graphing.
            </li>
          ) : null}
        </ul>
      </Card>

      <Card className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Recent bookings</h2>
        <table className="data w-full">
          <thead>
            <tr>
              <th>When</th>
              <th>Customer</th>
              <th>Km</th>
              <th>Cash margin</th>
              <th>Economic profit</th>
            </tr>
          </thead>
          <tbody>
            {car.bookings.map((b) => {
              const econ = bookingEconomics(b, dep.rates);
              return (
                <tr key={b.id}>
                  <td>
                    <Link
                      href={`/bookings/${b.id}`}
                      className="text-teal-900 hover:underline"
                    >
                      {formatBookingWhen(b.plannedStartAt, b.pickupTime)}
                    </Link>
                  </td>
                  <td>{b.customerName}</td>
                  <td>
                    {econ.distanceDriven != null
                      ? `${econ.distanceDriven} km`
                      : "—"}
                  </td>
                  <td>{formatNOK(econ.cashMarginOre)}</td>
                  <td>{formatNOK(econ.economicProfitOre)}</td>
                </tr>
              );
            })}
            {car.bookings.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-stone-500">
                  No bookings yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      <Card className="mt-4">
        <h2 className="mb-3 text-sm font-semibold">Service history</h2>
        <ul className="divide-y divide-stone-100 text-sm">
          {car.serviceEvents.map((e) => (
            <li key={e.id} className="flex justify-between gap-3 py-2">
              <span>
                {formatDate(e.occurredOn)}
                {e.odometer != null
                  ? ` · ${e.odometer.toLocaleString("nb-NO")} km`
                  : ""}{" "}
                · {labelStatus(e.type)}
                {e.vendor ? ` · ${e.vendor}` : ""}
              </span>
              <span className="shrink-0">{formatNOK(e.amountOre)}</span>
            </li>
          ))}
          {car.serviceEvents.length === 0 ? (
            <li className="py-2 text-stone-500">No service events.</li>
          ) : null}
        </ul>
      </Card>

      <form action={deleteCarAction} className="mt-8">
        <input type="hidden" name="id" value={car.id} />
        <Button type="submit" variant="danger">
          Delete car
        </Button>
      </form>
    </div>
  );
}
