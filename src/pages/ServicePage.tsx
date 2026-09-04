import { type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { formatBookingWhen, formatDate, toDateInputValue } from "@/lib/dates";
import { SERVICE_TYPES, labelStatus } from "@/lib/labels";
import { formatNOK } from "@/lib/money";
import { addService, deleteService, useAppData } from "@/lib/store";

export function ServicePage() {
  const { serviceEvents, cars, bookings } = useAppData();
  const events = [...serviceEvents].sort(
    (a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime(),
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const odo = String(fd.get("odometer") ?? "").trim();
    await addService({
      carId: String(fd.get("carId") ?? ""),
      bookingId: String(fd.get("bookingId") ?? "") || null,
      occurredOn: new Date(String(fd.get("occurredOn"))).toISOString(),
      odometer: odo ? Number(odo) : null,
      type: String(fd.get("type") ?? "service"),
      vendor: String(fd.get("vendor") ?? "").trim() || null,
      amountKr: Number(fd.get("amountKr") || 0),
      notes: String(fd.get("notes") ?? "").trim() || null,
    });
    e.currentTarget.reset();
  }

  return (
    <div>
      <PageHeader
        title="Service"
        subtitle="Log date + odometer — intervals are tracked in km"
      />

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">Log service event</h2>
        <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Car">
            <select name="carId" required className={inputClass}>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.registrationPlate}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select name="type" defaultValue="service" className={inputClass}>
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {labelStatus(t)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input
              name="occurredOn"
              type="date"
              required
              defaultValue={toDateInputValue(new Date())}
              className={inputClass}
            />
          </Field>
          <Field label="Odometer">
            <input name="odometer" type="number" className={inputClass} />
          </Field>
          <Field label="Vendor">
            <input name="vendor" className={inputClass} />
          </Field>
          <Field label="Amount (kr ex VAT)">
            <input name="amountKr" type="number" step="0.01" min={0} required className={inputClass} />
          </Field>
          <Field label="Link booking">
            <select name="bookingId" className={inputClass}>
              <option value="">None</option>
              {bookings.map((b) => {
                const car = cars.find((c) => c.id === b.carId);
                return (
                  <option key={b.id} value={b.id}>
                    {car?.registrationPlate} · {b.customerName} ·{" "}
                    {formatBookingWhen(b.plannedStartAt, b.pickupTime)}
                  </option>
                );
              })}
            </select>
          </Field>
          <Field label="Notes">
            <input name="notes" className={inputClass} />
          </Field>
          <div className="flex items-end">
            <Button type="submit">Add event</Button>
          </div>
        </form>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="data w-full min-w-[880px]">
          <thead>
            <tr>
              <th>Date</th>
              <th>Car</th>
              <th>Odometer</th>
              <th>Type</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Booking</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const car = cars.find((c) => c.id === e.carId);
              return (
                <tr key={e.id}>
                  <td>{formatDate(e.occurredOn)}</td>
                  <td>
                    <Link to={`/cars/${e.carId}`} className="text-teal-900 hover:underline">
                      {car?.registrationPlate ?? "—"}
                    </Link>
                  </td>
                  <td>
                    {e.odometer != null
                      ? `${e.odometer.toLocaleString("nb-NO")} km`
                      : "—"}
                  </td>
                  <td>{labelStatus(e.type)}</td>
                  <td>{e.vendor ?? "—"}</td>
                  <td>{formatNOK(e.amountOre)}</td>
                  <td>
                    {e.bookingId ? (
                      <Link
                        to={`/bookings/${e.bookingId}`}
                        className="text-teal-900 hover:underline"
                      >
                        Linked
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="text-xs text-rose-700 hover:underline"
                      onClick={() => void deleteService(e.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {events.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-stone-500">
                  No service events yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
