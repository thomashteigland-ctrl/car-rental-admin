"use client";

import { useActionState } from "react";
import {
  updateOdometerAction,
  type OdometerFormState,
} from "@/app/actions/cars";
import { Button, inputClass } from "@/components/ui";
import { toDateInputValue } from "@/lib/dates";

export function OdometerReadingForm({
  carId,
  currentOdometer,
}: {
  carId: string;
  currentOdometer: number;
}) {
  const [state, formAction, pending] = useActionState<
    OdometerFormState,
    FormData
  >(updateOdometerAction, null);

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="id" value={carId} />
      <div className="grid grid-cols-2 gap-2">
        <input
          name="odometer"
          type="number"
          min={0}
          required
          placeholder="Km"
          className={inputClass}
        />
        <input
          name="recordedAt"
          type="date"
          required
          defaultValue={toDateInputValue(new Date())}
          className={inputClass}
        />
      </div>
      <Button type="submit" disabled={pending} variant="secondary" className="w-full">
        {pending ? "…" : "Record reading"}
      </Button>
      <p className="text-[11px] text-stone-500">
        Current: {currentOdometer.toLocaleString("nb-NO")} km
      </p>
      {state?.error ? (
        <p className="text-xs text-rose-700" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
