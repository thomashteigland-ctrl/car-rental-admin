"use client";

import { useActionState } from "react";
import {
  upsertBookingAction,
  type BookingFormState,
} from "@/app/actions/bookings";
import { Button, Field, inputClass } from "@/components/ui";
import { toDateInputValue } from "@/lib/dates";
import { BOOKING_STATUSES, CHANNELS, labelStatus } from "@/lib/labels";
import type { Booking, Car } from "@prisma/client";

export function BookingForm({
  booking,
  cars,
}: {
  booking: Booking;
  cars: Car[];
}) {
  const [state, action, pending] = useActionState<BookingFormState, FormData>(
    upsertBookingAction,
    null,
  );

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={booking.id} />

      {state?.error ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {state.error}
        </div>
      ) : null}

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-stone-900">
          Edit booking
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Car">
            <select
              name="carId"
              required
              defaultValue={booking.carId}
              className={inputClass}
            >
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.registrationPlate} — {c.make} {c.model}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Customer name">
            <input
              name="customerName"
              required
              placeholder="Name for reference"
              defaultValue={booking.customerName}
              className={inputClass}
            />
          </Field>
          <Field label="Status">
            <select
              name="status"
              defaultValue={booking.status}
              className={inputClass}
            >
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {labelStatus(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Channel">
            <select
              name="channel"
              defaultValue={booking.channel}
              className={inputClass}
            >
              {CHANNELS.map((s) => (
                <option key={s} value={s}>
                  {labelStatus(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start date">
            <input
              name="plannedStartAt"
              type="date"
              required
              defaultValue={toDateInputValue(booking.plannedStartAt)}
              className={inputClass}
            />
          </Field>
          <Field label="End date">
            <input
              name="plannedEndAt"
              type="date"
              required
              defaultValue={toDateInputValue(booking.plannedEndAt)}
              className={inputClass}
            />
          </Field>
          <Field label="Pickup time" hint="Optional — e.g. 10:00 or after lunch">
            <input
              name="pickupTime"
              type="text"
              placeholder="Optional"
              defaultValue={booking.pickupTime ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Delivery time" hint="Optional — return / handoff time">
            <input
              name="deliveryTime"
              type="text"
              placeholder="Optional"
              defaultValue={booking.deliveryTime ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Driven km">
            <input
              name="drivenKm"
              type="number"
              min={0}
              defaultValue={booking.drivenKm ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Notes">
            <textarea
              name="notes"
              rows={3}
              defaultValue={booking.notes ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
