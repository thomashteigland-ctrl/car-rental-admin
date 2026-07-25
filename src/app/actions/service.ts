"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { fromDateInput, fromDatetimeLocal } from "@/lib/dates";
import { krToOre } from "@/lib/money";
import { prisma } from "@/lib/prisma";

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function upsertServiceAction(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "") || null;

  const occurredRaw = String(formData.get("occurredOn") ?? "");
  const occurredOn =
    fromDateInput(occurredRaw) ?? fromDatetimeLocal(occurredRaw);
  if (!occurredOn) throw new Error("Date is required");

  const amountKr = num(formData.get("amountKr"));
  if (amountKr == null) throw new Error("Amount required");

  const odometer = num(formData.get("odometer"));
  if (odometer == null || odometer < 0) {
    throw new Error("Odometer reading is required");
  }

  const carId = String(formData.get("carId") ?? "");
  if (!carId) throw new Error("Car required");

  const bookingId = String(formData.get("bookingId") ?? "") || null;

  const data = {
    carId,
    bookingId,
    occurredOn,
    odometer,
    type: String(formData.get("type") ?? "service"),
    vendor: String(formData.get("vendor") ?? "").trim() || null,
    amountOre: krToOre(amountKr),
    vatPercent: num(formData.get("vatPercent")) ?? 25,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const event = id
    ? await prisma.serviceEvent.update({ where: { id }, data })
    : await prisma.serviceEvent.create({ data });

  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (car && odometer >= car.currentOdometer) {
    await prisma.car.update({
      where: { id: carId },
      data: { currentOdometer: odometer },
    });
  }

  revalidatePath("/service");
  revalidatePath(`/cars/${carId}`);
  revalidatePath("/");
  revalidatePath("/reports");
  redirect(`/service?highlight=${event.id}`);
}

export async function deleteServiceAction(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  await prisma.serviceEvent.delete({ where: { id } });
  revalidatePath("/service");
  revalidatePath("/");
  revalidatePath("/reports");
}
