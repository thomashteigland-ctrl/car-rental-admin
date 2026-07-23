"use client";

import { useActionState } from "react";
import {
  updateBookingScheduleAction,
  type BookingFormState,
} from "@/app/actions/bookings";
import { Button, Field, inputClass } from "@/components/ui";
import { toDateInputValue } from "@/lib/dates";
import type { Booking } from "@prisma/client";

export function BookingScheduleForm({ booking }: { booking: Booking }) {
  const [state, action, pending] = useActionState<BookingFormState, FormData>(
    updateBookingScheduleAction,
    null,
  );

  return (
    <form
      action={action}
      className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="id" value={booking.id} />
      <h2 className="mb-3 text-sm font-semibold text-stone-900">
        Name & dates
      </h2>

      {state?.error ? (
        <div
          role="alert"
          className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Customer name">
          <input
            name="customerName"
            required
            defaultValue={booking.customerName}
            className={inputClass}
          />
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
      </div>

      <div className="mt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save dates"}
        </Button>
      </div>
    </form>
  );
}
