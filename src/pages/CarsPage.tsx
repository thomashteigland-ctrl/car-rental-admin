import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";
import { labelStatus, statusTone } from "@/lib/labels";
import { formatNOK } from "@/lib/money";
import { useAppData } from "@/lib/store";

export function CarsPage() {
  const { cars, marketModels } = useAppData();
  const [newerThan, setNewerThan] = useState<number | "">("");
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 30 }, (_, i) => currentYear - i);

  const filtered = useMemo(
    () =>
      cars.filter((c) => (newerThan === "" ? true : (c.year ?? 0) > newerThan)),
    [cars, newerThan],
  );

  return (
    <div>
      <PageHeader
        title="Cars"
        subtitle="Fleet inventory, status and depreciation rates"
        actions={<Button href="/cars/new">Add car</Button>}
      />

      <form
        className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="text-sm">
          <span className="mb-1 block font-medium text-stone-700">Newer than</span>
          <select
            value={newerThan}
            onChange={(e) =>
              setNewerThan(e.target.value ? Number(e.target.value) : "")
            }
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
        {newerThan !== "" ? (
          <Button variant="ghost" onClick={() => setNewerThan("")}>
            Clear
          </Button>
        ) : null}
      </form>

      {filtered.length === 0 ? (
        <EmptyState
          title={newerThan !== "" ? "No cars match" : "No cars yet"}
          body={
            newerThan !== ""
              ? `No cars newer than ${newerThan}.`
              : "Add your first van to start booking."
          }
          action={
            newerThan !== "" ? (
              <Button variant="secondary" onClick={() => setNewerThan("")}>
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
              {filtered.map((car) => {
                const model = marketModels.find((m) => m.id === car.marketModelId);
                return (
                  <tr key={car.id}>
                    <td>
                      <Link
                        to={`/cars/${car.id}`}
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
                      {model
                        ? `${model.name}${car.fuelType ? ` · ${car.fuelType}` : ""}`
                        : "—"}
                    </td>
                    <td>{formatNOK(car.depPerKmOre, { decimals: 2 })}</td>
                    <td>
                      {car.marketModelId ? "—" : formatNOK(car.depPerDayOre)}
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
