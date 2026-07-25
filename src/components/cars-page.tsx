"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";
import { formatNOK } from "@/lib/money";
import { labelStatus, statusTone } from "@/lib/labels";
import { fetchJson, queryKeys } from "@/lib/query-keys";

type CarsPayload = {
  newerThan: number | null;
  cars: {
    id: string;
    registrationPlate: string;
    make: string;
    model: string;
    year: number | null;
    status: string;
    currentOdometer: number;
    depPerKmOre: number;
    depPerDayOre: number;
    marketModelId: string | null;
    fuelType: string | null;
    marketModel: { name: string } | null;
  }[];
};

export function CarsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const newerThanRaw = searchParams.get("newerThan");
  const newerThan =
    newerThanRaw != null && Number.isFinite(Number(newerThanRaw))
      ? Number(newerThanRaw)
      : null;

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.cars(newerThan),
    queryFn: () => {
      const q =
        newerThan != null ? `?newerThan=${encodeURIComponent(String(newerThan))}` : "";
      return fetchJson<CarsPayload>(`/api/cars${q}`);
    },
    placeholderData: keepPreviousData,
  });

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 30 }, (_, i) => currentYear - i);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        {error instanceof Error ? error.message : "Could not load cars"}
      </div>
    );
  }

  const cars = data?.cars ?? [];

  return (
    <div>
      <PageHeader
        title="Cars"
        subtitle="Fleet inventory, status and depreciation rates"
        actions={<Button href="/cars/new">Add car</Button>}
      />

      <form
        className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const value = String(fd.get("newerThan") ?? "");
          router.push(value ? `/cars?newerThan=${value}` : "/cars");
        }}
      >
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

      {isPending && !data ? (
        <div className="h-48 animate-pulse rounded-xl bg-stone-200/60" />
      ) : cars.length === 0 ? (
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
                    {car.marketModelId ? "—" : formatNOK(car.depPerDayOre)}
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
