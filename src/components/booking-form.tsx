"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  upsertBookingAction,
  type BookingFormState,
} from "@/app/actions/bookings";
import { Field, inputClass } from "@/components/ui";
import { toDateInputValue } from "@/lib/dates";
import { BOOKING_STATUSES, CHANNELS, labelStatus } from "@/lib/labels";
import type { Booking, Car } from "@prisma/client";

const SAVE_DEBOUNCE_MS = 500;

export function BookingForm({
  booking,
  cars,
}: {
  booking: Booking;
  cars: Car[];
}) {
  const [state, formAction, pending] = useActionState<
    BookingFormState,
    FormData
  >(upsertBookingAction, null);

  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasPending = useRef(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      setSavedFlash(true);
      const t = setTimeout(() => setSavedFlash(false), 1600);
      wasPending.current = pending;
      return () => clearTimeout(t);
    }
    wasPending.current = pending;
  }, [pending, state]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const submitNow = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const customerName = String(fd.get("customerName") ?? "").trim();
    const carId = String(fd.get("carId") ?? "");
    const start = String(fd.get("plannedStartAt") ?? "");
    const end = String(fd.get("plannedEndAt") ?? "");
    // Skip while required fields are empty mid-edit
    if (!customerName || !carId || !start || !end) return;
    formAction(fd);
  }, [formAction]);

  const scheduleSave = useCallback(
    (delayMs = SAVE_DEBOUNCE_MS) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        submitNow();
      }, delayMs);
    },
    [submitNow],
  );

  const flushSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    submitNow();
  }, [submitNow]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-6"
      onChange={(e) => {
        const el = e.target;
        const immediate =
          el instanceof HTMLSelectElement ||
          (el instanceof HTMLInputElement && el.type === "date");
        scheduleSave(immediate ? 100 : SAVE_DEBOUNCE_MS);
      }}
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (next && formRef.current?.contains(next)) return;
        flushSave();
      }}
    >
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
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-stone-900">
            Edit booking
          </h2>
          <p
            className="text-xs text-stone-500 tabular-nums"
            aria-live="polite"
          >
            {pending
              ? "Saving…"
              : state?.error
                ? "Couldn’t save"
                : savedFlash
                  ? "Saved"
                  : "Autosaves"}
          </p>
        </div>
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
    </form>
  );
}
