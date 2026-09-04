import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Field, inputClass } from "@/components/ui";
import { toDateInputValue } from "@/lib/dates";
import { CAR_STATUSES, labelStatus } from "@/lib/labels";
import { krToOre, oreToKr } from "@/lib/money";
import { deleteCar, upsertCar, useAppData } from "@/lib/store";
import type { Car } from "@/lib/types";

export function CarFormFields({ car }: { car?: Car }) {
  const navigate = useNavigate();
  const { marketModels } = useAppData();
  const [marketModelId, setMarketModelId] = useState(car?.marketModelId ?? "");
  const linked = Boolean(marketModelId);
  const selectedModel = useMemo(
    () => marketModels.find((m) => m.id === marketModelId) ?? null,
    [marketModelId, marketModels],
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const purchaseKr = Number(fd.get("purchasePriceKr") || "");
    await upsertCar({
      id: car?.id,
      make: String(fd.get("make") ?? "").trim(),
      model: String(fd.get("model") ?? "").trim(),
      registrationPlate: String(fd.get("registrationPlate") ?? "").trim(),
      year: fd.get("year") ? Number(fd.get("year")) : null,
      vin: String(fd.get("vin") ?? "").trim() || null,
      status: String(fd.get("status") ?? "available"),
      category: String(fd.get("category") ?? "").trim() || null,
      fuelType: String(fd.get("fuelType") ?? "").trim() || null,
      marketModelId: marketModelId || null,
      purchasePriceOre: Number.isFinite(purchaseKr) && fd.get("purchasePriceKr")
        ? krToOre(purchaseKr)
        : null,
      purchaseDate: String(fd.get("purchaseDate") ?? "")
        ? new Date(String(fd.get("purchaseDate"))).toISOString()
        : null,
      purchaseOdometer: Number(fd.get("purchaseOdometer") || 0),
      currentOdometer: Number(fd.get("currentOdometer") || 0),
      location: String(fd.get("location") ?? "").trim() || null,
      insuranceNote: String(fd.get("insuranceNote") ?? "").trim() || null,
      nextInspectionDue: String(fd.get("nextInspectionDue") ?? "")
        ? new Date(String(fd.get("nextInspectionDue"))).toISOString()
        : null,
      depPerKmOre: krToOre(Number(fd.get("depPerKmKr") || 0)),
      depPerDayOre: krToOre(Number(fd.get("depPerDayKr") || 0)),
      serviceIntervalKm: fd.get("serviceIntervalKm")
        ? Number(fd.get("serviceIntervalKm"))
        : null,
      notes: String(fd.get("notes") ?? "").trim() || null,
    });
    navigate("/cars");
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-stone-900">Vehicle</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Make">
            <input name="make" required defaultValue={car?.make} className={inputClass} />
          </Field>
          <Field label="Model">
            <input name="model" required defaultValue={car?.model} className={inputClass} />
          </Field>
          <Field label="Year">
            <input name="year" type="number" defaultValue={car?.year ?? ""} className={inputClass} />
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
            <select name="status" defaultValue={car?.status ?? "available"} className={inputClass}>
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
            <input name="location" defaultValue={car?.location ?? ""} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-stone-900">Purchase & depreciation</h2>
        <p className="mb-4 text-xs text-stone-500">
          Link a market model to derive km-only depreciation from purchase price.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Market model">
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
          <Field label="Fuel group">
            <select
              name="fuelType"
              required={linked}
              defaultValue={car?.fuelType ?? ""}
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
                car?.purchasePriceOre != null ? oreToKr(car.purchasePriceOre) : ""
              }
              className={inputClass}
            />
          </Field>
          <Field label="Purchase date">
            <input
              name="purchaseDate"
              type="date"
              defaultValue={toDateInputValue(car?.purchaseDate)}
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
              Depreciation is derived from {selectedModel?.name ?? "the selected model"}{" "}
              using the market residual at 200,000 km.
            </div>
          ) : (
            <>
              <Field label="Depreciation per km (kr)">
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
          <Field label="Service interval (km)">
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
              type="date"
              defaultValue={toDateInputValue(car?.nextInspectionDue)}
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

      <div className="flex flex-wrap gap-2">
        <Button type="submit">{car ? "Save car" : "Create car"}</Button>
        <Button href="/cars" variant="secondary">
          Cancel
        </Button>
        {car ? (
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Delete this car and its bookings?")) {
                void deleteCar(car.id).then(() => navigate("/cars"));
              }
            }}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}
