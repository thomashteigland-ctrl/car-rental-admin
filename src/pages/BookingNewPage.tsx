import { type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Field, PageHeader, inputClass } from "@/components/ui";
import { CHANNELS, labelStatus } from "@/lib/labels";
import { upsertBooking, useAppData } from "@/lib/store";

export function BookingNewPage() {
  const navigate = useNavigate();
  const { cars } = useAppData();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const id = await upsertBooking({
      carId: String(fd.get("carId") ?? ""),
      customerName: String(fd.get("customerName") ?? "").trim(),
      status: "confirmed",
      channel: String(fd.get("channel") ?? "private"),
      plannedStartAt: new Date(String(fd.get("plannedStartAt"))).toISOString(),
      plannedEndAt: new Date(String(fd.get("plannedEndAt"))).toISOString(),
      pickupTime: String(fd.get("pickupTime") ?? "").trim() || null,
      deliveryTime: String(fd.get("deliveryTime") ?? "").trim() || null,
    });
    navigate(`/bookings/${id}`);
  }

  return (
    <div>
      <PageHeader title="New booking" subtitle="Create a rental" />
      {cars.length === 0 ? (
        <p className="text-sm text-stone-500">
          Add a car first, then come back here.
        </p>
      ) : (
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Car">
              <select name="carId" required className={inputClass}>
                {cars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.registrationPlate} — {c.make} {c.model}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Customer name">
              <input name="customerName" required className={inputClass} />
            </Field>
            <Field label="Channel">
              <select name="channel" defaultValue="private" className={inputClass}>
                {CHANNELS.map((s) => (
                  <option key={s} value={s}>
                    {labelStatus(s)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start date">
              <input name="plannedStartAt" type="date" required className={inputClass} />
            </Field>
            <Field label="End date">
              <input name="plannedEndAt" type="date" required className={inputClass} />
            </Field>
            <Field label="Pickup time">
              <input name="pickupTime" className={inputClass} />
            </Field>
            <Field label="Delivery time">
              <input name="deliveryTime" className={inputClass} />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Create booking</Button>
            <Button href="/bookings" variant="secondary">
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
