"use client";

import { useMemo, useState } from "react";
import { upsertCarAction } from "@/app/actions/cars";
import { Button, Field, inputClass } from "@/components/ui";
import { toDatetimeLocalValue } from "@/lib/dates";
import { CAR_STATUSES, labelStatus } from "@/lib/labels";
import { oreToKr } from "@/lib/money";
import type { Car, MarketModel } from "@prisma/client";

type CarWithMarket = Car & { marketModel?: MarketModel | null };

export function CarForm({
  car,
  marketModels = [],
}: {
  car?: CarWithMarket;
  marketModels?: Pick<MarketModel, "id" | "name" | "variant">[];
}) {
  const [marketModelId, setMarketModelId] = useState(car?.marketModelId ?? "");
  const linked = Boolean(marketModelId);
  const selectedModel = useMemo(
    () => marketModels.find((m) => m.id === marketModelId) ?? null,
    [marketModelId, marketModels],
  );

  return (
    <form action={upsertCarAction} className="space-y-6">
      {car ? <input type="hidden" name="id" value={car.id} /> : null}

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-stone-900">Vehicle</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Make">
            <input
              name="make"
              required
              defaultValue={car?.make}
              className={inputClass}
            />
          </Field>
          <Field label="Model">
            <input
              name="model"
              required
              defaultValue={car?.model}
              className={inputClass}
            />
          </Field>
          <Field label="Year">
            <input
              name="year"
              type="number"
              defaultValue={car?.year ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Registration plate">
            <input
              name="registrationPlate"
              required
              defaultValue={car?.registrationPlate}
              className={inputClass}
            />
          </Field>
          <Field label="VIN">
            <input name="vin" defaultValue={car?.vin ?? ""} className={inputClass} />
          </Field>
          <Field label="Status">
            <select
              name="status"
              defaultValue={car?.status ?? "available"}
              className={inputClass}
            >
              {CAR_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {labelStatus(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <input
              name="category"
              placeholder="long_wb"
              defaultValue={car?.category ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Current odometer (km)">
            <input
              name="currentOdometer"
              type="number"
              defaultValue={car?.currentOdometer ?? 0}
              className={inputClass}
            />
          </Field>
          <Field label="Location">
            <input
              name="location"
              defaultValue={car?.location ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-stone-900">
          Purchase & depreciation
        </h2>
        <p className="mb-4 text-xs text-stone-500">
          Link a market model to derive km-only depreciation from purchase price
          down to the expected residual at 200,000 km (ICE/BEV curve).
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Market model"
            hint="FINN variant used for the residual curve"
          >
            <select
              name="marketModelId"
              value={marketModelId}
              onChange={(e) => setMarketModelId(e.target.value)}
              className={inputClass}
            >
              <option value="">Manual rates (no market link)</option>
              {marketModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Fuel group"
            hint={
              linked
                ? "Selects ICE vs BEV depreciation curve"
                : "Optional unless a market model is linked"
            }
          >
            <select
              name="fuelType"
              required={linked}
              defaultValue={
                car?.fuelType === "ICE" || car?.fuelType === "BEV"
                  ? car.fuelType
                  : linked
                    ? ""
                    : (car?.fuelType ?? "")
              }
              className={inputClass}
            >
              <option value="">{linked ? "Select ICE or BEV" : "—"}</option>
              <option value="ICE">ICE</option>
              <option value="BEV">BEV</option>
            </select>
          </Field>
          <Field label="Purchase price (kr)">
            <input
              name="purchasePriceKr"
              type="number"
              step="1"
              required={linked}
              defaultValue={
                car?.purchasePriceOre != null
                  ? oreToKr(car.purchasePriceOre)
                  : ""
              }
              className={inputClass}
            />
          </Field>
          <Field label="Purchase date">
            <input
              name="purchaseDate"
              type="datetime-local"
              defaultValue={toDatetimeLocalValue(car?.purchaseDate)}
              className={inputClass}
            />
          </Field>
          <Field label="Odometer at purchase (km)">
            <input
              name="purchaseOdometer"
              type="number"
              min={0}
              defaultValue={car?.purchaseOdometer ?? 0}
              className={inputClass}
            />
          </Field>
          {linked ? (
            <div className="sm:col-span-2 rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-2 text-sm text-teal-950">
              Depreciation will be set automatically from{" "}
              <span className="font-medium">
                {selectedModel?.name ?? "the selected model"}
              </span>
              : straight line from purchase price at purchase odometer to the
              market residual at 200,000 km. Per-day depreciation is not used.
            </div>
          ) : (
            <>
              <Field
                label="Depreciation per km (kr)"
                hint="Expected economic value loss"
              >
                <input
                  name="depPerKmKr"
                  type="number"
                  step="0.01"
                  defaultValue={car ? oreToKr(car.depPerKmOre) : "0.85"}
                  className={inputClass}
                />
              </Field>
              <Field label="Depreciation per day (kr)">
                <input
                  name="depPerDayKr"
                  type="number"
                  step="1"
                  defaultValue={car ? oreToKr(car.depPerDayOre) : "120"}
                  className={inputClass}
                />
              </Field>
            </>
          )}
          <Field
            label="Service interval (km)"
            hint="Next service due = last service odo + this interval"
          >
            <input
              name="serviceIntervalKm"
              type="number"
              min={0}
              placeholder="e.g. 15000"
              defaultValue={car?.serviceIntervalKm ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Next inspection due">
            <input
              name="nextInspectionDue"
              type="datetime-local"
              defaultValue={toDatetimeLocalValue(car?.nextInspectionDue)}
              className={inputClass}
            />
          </Field>
          <Field label="Insurance note">
            <input
              name="insuranceNote"
              defaultValue={car?.insuranceNote ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Notes">
            <textarea
              name="notes"
              rows={3}
              defaultValue={car?.notes ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <div className="flex gap-2">
        <Button type="submit">{car ? "Save car" : "Create car"}</Button>
        <Button href="/cars" variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  );
}
