import { type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import {
  FIXED_COST_FREQUENCIES,
  labelFixedCostFrequency,
} from "@/lib/fixed-costs";
import { formatNOK } from "@/lib/money";
import {
  addFixedCost,
  deleteFixedCost,
  useAppData,
  useCar,
} from "@/lib/store";
import { CarFormFields } from "./CarFormFields";

export function CarDetailPage() {
  const { id } = useParams();
  const car = useCar(id);
  const { fixedCosts } = useAppData();
  const costs = fixedCosts.filter((c) => c.carId === car?.id);

  if (!car) {
    return (
      <div>
        <PageHeader title="Car not found" />
        <Button href="/cars" variant="secondary">
          Back
        </Button>
      </div>
    );
  }

  const current = car;

  async function onAddCost(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await addFixedCost({
      carId: current.id,
      name: String(fd.get("name") ?? "").trim(),
      amountKr: Number(fd.get("amountKr") || 0),
      frequency: String(fd.get("frequency") ?? "monthly"),
      notes: String(fd.get("notes") ?? "").trim() || null,
    });
    e.currentTarget.reset();
  }

  return (
    <div>
      <PageHeader
        title={`${car.make} ${car.model}`}
        subtitle={car.registrationPlate}
        actions={
          <Link to="/cars" className="text-sm text-teal-800 hover:underline">
            All cars
          </Link>
        }
      />
      <CarFormFields car={car} />

      <Card className="mt-6">
        <h2 className="mb-1 text-sm font-semibold text-stone-900">Fixed costs</h2>
        <p className="mb-4 text-xs text-stone-500">
          Recurring costs prorated into period profits.
        </p>
        <ul className="mb-4 divide-y divide-stone-100 text-sm">
          {costs.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2">
              <div>
                <div className="font-medium text-stone-900">{c.name}</div>
                <div className="text-xs text-stone-500">
                  {formatNOK(c.amountOre)} · {labelFixedCostFrequency(c.frequency)}
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-rose-700 hover:underline"
                onClick={() => void deleteFixedCost(c.id)}
              >
                Remove
              </button>
            </li>
          ))}
          {costs.length === 0 ? (
            <li className="py-2 text-stone-500">No fixed costs yet.</li>
          ) : null}
        </ul>
        <form onSubmit={(e) => void onAddCost(e)} className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input name="name" required placeholder="Insurance" className={inputClass} />
          </Field>
          <Field label="Amount (kr)">
            <input name="amountKr" type="number" min={0} required className={inputClass} />
          </Field>
          <Field label="Frequency">
            <select name="frequency" defaultValue="monthly" className={inputClass}>
              {FIXED_COST_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {labelFixedCostFrequency(f)}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" variant="secondary">
              Add cost
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
