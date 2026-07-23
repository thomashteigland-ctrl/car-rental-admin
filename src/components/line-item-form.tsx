"use client";

import { useMemo, useState } from "react";
import { addLineItemAction } from "@/app/actions/bookings";
import { Button, Field, inputClass } from "@/components/ui";

type Category = {
  id: string;
  kind: string;
  name: string;
};

export function LineItemForm({
  bookingId,
  categories,
}: {
  bookingId: string;
  categories: Category[];
}) {
  const [kind, setKind] = useState<"revenue" | "cost">("revenue");

  const options = useMemo(
    () => categories.filter((c) => c.kind === kind),
    [categories, kind],
  );

  const defaultCategory = options[0]?.name ?? "";

  return (
    <form
      action={addLineItemAction}
      className="space-y-4 rounded-lg border border-dashed border-stone-300 p-4"
      key={kind}
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="kind" value={kind} />

      <div>
        <div className="mb-1.5 text-sm font-medium text-stone-700">Type</div>
        <div className="inline-flex rounded-lg border border-stone-300 bg-stone-50 p-0.5">
          <button
            type="button"
            onClick={() => setKind("revenue")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              kind === "revenue"
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Revenue
          </button>
          <button
            type="button"
            onClick={() => setKind("cost")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              kind === "cost"
                ? "bg-rose-700 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Cost
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Category">
          <select
            name="category"
            required
            defaultValue={defaultCategory}
            className={inputClass}
          >
            {options.length === 0 ? (
              <option value="">No categories — add in Settings</option>
            ) : (
              options.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        </Field>
        <Field label="Description">
          <input
            name="description"
            placeholder="Optional note"
            className={inputClass}
          />
        </Field>
        <Field label="Amount (kr ex VAT)">
          <input
            name="amountKr"
            type="number"
            step="0.01"
            min={0}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Qty">
          <input
            name="quantity"
            type="number"
            step="0.01"
            min={0}
            defaultValue={1}
            className={inputClass}
          />
        </Field>
        <Field label="VAT %">
          <input
            name="vatPercent"
            type="number"
            step="0.01"
            min={0}
            defaultValue={25}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <Button type="submit" variant="secondary">
        Add {kind === "revenue" ? "revenue" : "cost"} line
      </Button>
    </form>
  );
}
