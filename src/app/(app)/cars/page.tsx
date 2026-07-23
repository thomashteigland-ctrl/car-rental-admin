import Link from "next/link";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";
import { formatNOK } from "@/lib/money";
import { labelStatus, statusTone } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<{ newerThan?: string }>;
}) {
  const params = await searchParams;
  const newerThanRaw = params.newerThan ? Number(params.newerThan) : null;
  const newerThan =
    newerThanRaw != null && Number.isFinite(newerThanRaw) ? newerThanRaw : null;

  const cars = await prisma.car.findMany({
    where:
      newerThan != null
        ? { year: { gt: newerThan } }
        : undefined,
    include: { marketModel: { select: { name: true } } },
    orderBy: { registrationPlate: "asc" },
  });

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return (
    <div>
      <PageHeader
        title="Cars"
        subtitle="Fleet inventory, status and depreciation rates"
        actions={<Button href="/cars/new">Add car</Button>}
      />

      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-stone-700">
            Newer than
          </span>
          <select
            name="newerThan"
            defaultValue={newerThan ?? ""}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none ring-teal-700/30 focus:ring-2"
          >
            <option value="">Any year</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
        {newerThan != null ? (
          <Button href="/cars" variant="ghost">
            Clear
          </Button>
        ) : null}
      </form>

      {cars.length === 0 ? (
        <EmptyState
          title={newerThan != null ? "No cars match" : "No cars yet"}
          body={
            newerThan != null
              ? `No cars newer than ${newerThan}.`
              : "Add your first van to start booking."
          }
          action={
            newerThan != null ? (
              <Button href="/cars" variant="secondary">
                Clear filter
              </Button>
            ) : (
              <Button href="/cars/new">Add car</Button>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="data w-full">
            <thead>
              <tr>
                <th>Plate</th>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Odometer</th>
                <th>Market</th>
                <th>Dep / km</th>
                <th>Dep / day</th>
              </tr>
            </thead>
            <tbody>
              {cars.map((car) => (
                <tr key={car.id}>
                  <td>
                    <Link
                      href={`/cars/${car.id}`}
                      className="font-medium text-teal-900 hover:underline"
                    >
                      {car.registrationPlate}
                    </Link>
                  </td>
                  <td>
                    {car.make} {car.model}
                    {car.year ? ` (${car.year})` : ""}
                  </td>
                  <td>
                    <Badge className={statusTone(car.status)}>
                      {labelStatus(car.status)}
                    </Badge>
                  </td>
                  <td>{car.currentOdometer.toLocaleString("nb-NO")} km</td>
                  <td className="text-stone-600">
                    {car.marketModel
                      ? `${car.marketModel.name}${car.fuelType ? ` · ${car.fuelType}` : ""}`
                      : "—"}
                  </td>
                  <td>{formatNOK(car.depPerKmOre, { decimals: 2 })}</td>
                  <td>
                    {car.marketModelId
                      ? "—"
                      : formatNOK(car.depPerDayOre)}
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
