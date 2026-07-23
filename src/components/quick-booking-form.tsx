"use client";

import { useActionState } from "react";
import {
  createQuickBookingAction,
  type BookingFormState,
} from "@/app/actions/bookings";
import { Button, Field, inputClass } from "@/components/ui";
import type { Car } from "@prisma/client";

function todayInputValue() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function QuickBookingForm({
  cars,
  defaultCarId,
}: {
  cars: Car[];
  defaultCarId?: string;
}) {
  const [state, action, pending] = useActionState<BookingFormState, FormData>(
    createQuickBookingAction,
    null,
  );
  const today = todayInputValue();
  const carDefault =
    defaultCarId || (cars.length === 1 ? cars[0].id : "");

  return (
    <form action={action} className="mx-auto max-w-lg space-y-6">
      {state?.error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {state.error}
        </div>
      ) : null}

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <Field label="Customer name">
            <input
              name="customerName"
              required
              autoFocus
              placeholder="Who booked?"
              className={inputClass}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date">
              <input
                name="plannedStartAt"
                type="date"
                required
                defaultValue={today}
                className={inputClass}
              />
            </Field>
            <Field label="End date">
              <input
                name="plannedEndAt"
                type="date"
                required
                defaultValue={today}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Revenue (kr ex VAT)" hint="Saved as base rental">
              <input
                name="revenueKr"
                type="number"
                step="0.01"
                min={0}
                required
                placeholder="0"
                className={inputClass}
              />
            </Field>
            <Field label="VAT %">
              <select name="vatPercent" defaultValue="25" className={inputClass}>
                <option value="25">25%</option>
                <option value="15">15%</option>
                <option value="12">12%</option>
                <option value="0">0%</option>
              </select>
            </Field>
          </div>

          <Field label="Car">
            <select
              name="carId"
              required
              defaultValue={carDefault}
              className={inputClass}
            >
              <option value="" disabled>
                Select car
              </option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.registrationPlate} — {c.make} {c.model}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create booking"}
        </Button>
        <Button href="/bookings" variant="secondary">
          Cancel
        </Button>
      </div>

      <p className="text-center text-xs text-stone-500">
        Status, km, times, and extra costs can be added after create.
      </p>
    </form>
  );
}
