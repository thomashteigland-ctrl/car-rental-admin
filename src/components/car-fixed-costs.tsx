import {
  addFixedCostAction,
  deleteFixedCostAction,
} from "@/app/actions/fixed-costs";
import { Button, Field, inputClass } from "@/components/ui";
import {
  FIXED_COST_FREQUENCIES,
  labelFixedCostFrequency,
} from "@/lib/fixed-costs";
import { formatNOK } from "@/lib/money";
import type { CarFixedCost } from "@prisma/client";

export function CarFixedCosts({
  carId,
  costs,
}: {
  carId: string;
  costs: CarFixedCost[];
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-stone-900">Fixed costs</h2>
      <p className="mb-4 text-xs text-stone-500">
        Recurring costs (insurance, financing, parking, etc.) prorated into
        period profits.
      </p>

      <ul className="mb-4 divide-y divide-stone-100 text-sm">
        {costs.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 py-2"
          >
            <div>
              <div className="font-medium text-stone-900">{c.name}</div>
              <div className="text-xs text-stone-500">
                {formatNOK(c.amountOre)} · {labelFixedCostFrequency(c.frequency)}
                {c.notes ? ` · ${c.notes}` : ""}
              </div>
            </div>
            <form action={deleteFixedCostAction}>
              <input type="hidden" name="id" value={c.id} />
              <Button type="submit" variant="ghost" className="text-rose-700">
                Remove
              </Button>
            </form>
          </li>
        ))}
        {costs.length === 0 ? (
          <li className="py-2 text-stone-500">No fixed costs yet.</li>
        ) : null}
      </ul>

      <form action={addFixedCostAction} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="carId" value={carId} />
        <Field label="Name">
          <input
            name="name"
            required
            placeholder="Insurance"
            className={inputClass}
          />
        </Field>
        <Field label="Amount (kr)">
          <input
            name="amountKr"
            type="number"
            step="1"
            min={0}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Frequency">
          <select name="frequency" required defaultValue="monthly" className={inputClass}>
            {FIXED_COST_FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {labelFixedCostFrequency(f)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <input name="notes" className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" variant="secondary">
            Add fixed cost
          </Button>
        </div>
      </form>
    </section>
  );
}
