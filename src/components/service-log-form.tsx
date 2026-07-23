"use client";

import { useMemo, useState } from "react";
import { upsertServiceAction } from "@/app/actions/service";
import { Button, Field, inputClass } from "@/components/ui";
import { toDateInputValue } from "@/lib/dates";
import { SERVICE_TYPES, labelStatus } from "@/lib/labels";

type CarOption = {
  id: string;
  registrationPlate: string;
  currentOdometer: number;
  serviceIntervalKm: number | null;
};

type BookingOption = {
  id: string;
  carId: string;
  label: string;
};

function todayInput() {
  return toDateInputValue(new Date());
}

export function ServiceLogForm({
  cars,
  bookings,
}: {
  cars: CarOption[];
  bookings: BookingOption[];
}) {
  const [carId, setCarId] = useState(cars[0]?.id ?? "");
  const selected = useMemo(
    () => cars.find((c) => c.id === carId),
    [cars, carId],
  );
  const filteredBookings = useMemo(
    () =>
      carId ? bookings.filter((b) => b.carId === carId) : bookings,
    [bookings, carId],
  );

  return (
    <form action={upsertServiceAction} className="grid gap-3 sm:grid-cols-3">
      <Field label="Car">
        <select
          name="carId"
          required
          value={carId}
          onChange={(e) => setCarId(e.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            Select…
          </option>
          {cars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.registrationPlate}
              {c.serviceIntervalKm
                ? ` · every ${c.serviceIntervalKm.toLocaleString("nb-NO")} km`
                : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date">
        <input
          name="occurredOn"
          type="date"
          required
          defaultValue={todayInput()}
          className={inputClass}
        />
      </Field>
      <Field
        label="Odometer (km)"
        hint={
          selected
            ? `Current: ${selected.currentOdometer.toLocaleString("nb-NO")} km`
            : undefined
        }
      >
        <input
          key={carId}
          name="odometer"
          type="number"
          min={0}
          required
          defaultValue={selected?.currentOdometer ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Type">
        <select name="type" defaultValue="service" className={inputClass}>
          {SERVICE_TYPES.map((t) => (
            <option key={t} value={t}>
              {labelStatus(t)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Amount (kr ex VAT)">
        <input
          name="amountKr"
          type="number"
          step="0.01"
          required
          className={inputClass}
        />
      </Field>
      <Field label="VAT %">
        <input
          name="vatPercent"
          type="number"
          defaultValue={25}
          className={inputClass}
        />
      </Field>
      <Field label="Vendor">
        <input name="vendor" className={inputClass} />
      </Field>
      <Field label="Related booking (optional)">
        <select name="bookingId" className={inputClass} defaultValue="">
          <option value="">None — allocate by km later</option>
          {filteredBookings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notes">
        <input name="notes" className={inputClass} />
      </Field>
      <div className="sm:col-span-3">
        <Button type="submit">Save event</Button>
      </div>
    </form>
  );
}
