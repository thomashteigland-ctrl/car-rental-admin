import { useMemo, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Field, PageHeader, inputClass } from "@/components/ui";
import { bookingEconomics } from "@/lib/booking-calc";
import { toDateInputValue } from "@/lib/dates";
import { BOOKING_STATUSES, CHANNELS, labelStatus } from "@/lib/labels";
import { effectiveDepRates, fitsFromData } from "@/lib/market/depreciation";
import { formatNOK } from "@/lib/money";
import {
  addLineItem,
  deleteBooking,
  deleteLineItem,
  upsertBooking,
  useAppData,
  useBooking,
} from "@/lib/store";
import { useState } from "react";

export function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const booking = useBooking(id);
  const data = useAppData();
  const [kind, setKind] = useState<"revenue" | "cost">("revenue");

  const items = data.lineItems.filter((i) => i.bookingId === booking?.id);
  const categories = data.categories.filter((c) => c.kind === kind && c.active);
  const fits = useMemo(() => fitsFromData(data), [data]);

  const econ = useMemo(() => {
    if (!booking) return null;
    const car = data.cars.find((c) => c.id === booking.carId);
    const model = car?.marketModelId
      ? data.marketModels.find((m) => m.id === car.marketModelId)
      : null;
    const rates = car
      ? effectiveDepRates(
          {
            purchasePriceOre: car.purchasePriceOre,
            purchaseOdometer: car.purchaseOdometer,
            fuelType: car.fuelType,
            marketModelId: car.marketModelId,
            marketModel: model ? { variant: model.variant } : null,
            depPerKmOre: car.depPerKmOre,
            depPerDayOre: car.depPerDayOre,
          },
          fits,
        )
      : { depPerKmOre: 0, depPerDayOre: 0 };
    const serviceOre = data.serviceEvents
      .filter((e) => e.bookingId === booking.id)
      .reduce((s, e) => s + e.amountOre, 0);
    return bookingEconomics(
      {
        plannedStartAt: new Date(booking.plannedStartAt),
        plannedEndAt: new Date(booking.plannedEndAt),
        drivenKm: booking.drivenKm,
        lineItems: items,
      },
      rates,
      serviceOre,
    );
  }, [booking, data, fits, items]);

  if (!booking) {
    return (
      <div>
        <PageHeader title="Booking not found" />
        <Button href="/bookings" variant="secondary">
          Back
        </Button>
      </div>
    );
  }

  const current = booking;

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const kmRaw = String(fd.get("drivenKm") ?? "").trim();
    await upsertBooking({
      id: current.id,
      carId: String(fd.get("carId") ?? ""),
      customerName: String(fd.get("customerName") ?? "").trim(),
      status: String(fd.get("status") ?? "confirmed"),
      channel: String(fd.get("channel") ?? "private"),
      plannedStartAt: new Date(String(fd.get("plannedStartAt"))).toISOString(),
      plannedEndAt: new Date(String(fd.get("plannedEndAt"))).toISOString(),
      pickupTime: String(fd.get("pickupTime") ?? "").trim() || null,
      deliveryTime: String(fd.get("deliveryTime") ?? "").trim() || null,
      drivenKm: kmRaw ? Number(kmRaw) : null,
      notes: String(fd.get("notes") ?? "").trim() || null,
    });
  }

  async function addItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await addLineItem({
      bookingId: current.id,
      kind,
      category: String(fd.get("category") ?? ""),
      description: String(fd.get("description") ?? ""),
      amountKr: Number(fd.get("amountKr") || 0),
      quantity: Number(fd.get("quantity") || 1),
      vatPercent: Number(fd.get("vatPercent") || 25),
    });
    e.currentTarget.reset();
  }

  return (
    <div>
      <PageHeader
        title={booking.customerName}
        subtitle="Edit booking — saves on submit"
        actions={
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Delete this booking?")) {
                void deleteBooking(booking.id).then(() => navigate("/bookings"));
              }
            }}
          >
            Delete
          </Button>
        }
      />

      {econ ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
            <div className="text-xs text-stone-500">Revenue</div>
            <div className="font-semibold">{formatNOK(econ.revenueExVatOre)}</div>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
            <div className="text-xs text-stone-500">Cash margin</div>
            <div className="font-semibold">{formatNOK(econ.cashMarginOre)}</div>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
            <div className="text-xs text-stone-500">Economic profit</div>
            <div className="font-semibold">{formatNOK(econ.economicProfitOre)}</div>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={(e) => void save(e)}
        className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Car">
            <select name="carId" required defaultValue={booking.carId} className={inputClass}>
              {data.cars.map((c) => (
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
              defaultValue={booking.customerName}
              className={inputClass}
            />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={booking.status} className={inputClass}>
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {labelStatus(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Channel">
            <select name="channel" defaultValue={booking.channel} className={inputClass}>
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
          <Field label="Pickup time">
            <input
              name="pickupTime"
              defaultValue={booking.pickupTime ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Delivery time">
            <input
              name="deliveryTime"
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
        <Button type="submit">Save booking</Button>
      </form>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Line items</h2>
        <ul className="mb-4 divide-y divide-stone-100 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2 py-2">
              <span>
                <span className="text-stone-400">{i.kind}</span> · {i.category}{" "}
                {i.description ? `· ${i.description}` : ""}
              </span>
              <span className="flex items-center gap-3">
                {formatNOK(Math.round(i.amountOre * i.quantity))}
                <button
                  type="button"
                  className="text-xs text-rose-700 hover:underline"
                  onClick={() => void deleteLineItem(i.id)}
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
          {items.length === 0 ? (
            <li className="py-2 text-stone-500">No line items yet.</li>
          ) : null}
        </ul>

        <form onSubmit={(e) => void addItem(e)} className="space-y-4 rounded-lg border border-dashed border-stone-300 p-4">
          <div className="inline-flex rounded-lg border border-stone-300 bg-stone-50 p-0.5">
            <button
              type="button"
              onClick={() => setKind("revenue")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                kind === "revenue" ? "bg-emerald-700 text-white" : "text-stone-600"
              }`}
            >
              Revenue
            </button>
            <button
              type="button"
              onClick={() => setKind("cost")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                kind === "cost" ? "bg-rose-700 text-white" : "text-stone-600"
              }`}
            >
              Cost
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Category">
              <select name="category" required className={inputClass}>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description">
              <input name="description" className={inputClass} />
            </Field>
            <Field label="Amount (kr ex VAT)">
              <input name="amountKr" type="number" step="0.01" min={0} required className={inputClass} />
            </Field>
            <Field label="Qty">
              <input name="quantity" type="number" step="0.01" min={0} defaultValue={1} className={inputClass} />
            </Field>
            <Field label="VAT %">
              <input name="vatPercent" type="number" step="0.01" min={0} defaultValue={25} className={inputClass} />
            </Field>
          </div>
          <Button type="submit" variant="secondary">
            Add {kind} line
          </Button>
        </form>
      </section>
    </div>
  );
}
