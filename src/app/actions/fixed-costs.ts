"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { isFixedCostFrequency } from "@/lib/fixed-costs";
import { krToOre } from "@/lib/money";
import { prisma } from "@/lib/prisma";

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function addFixedCostAction(formData: FormData) {
  await requireSession();
  const carId = String(formData.get("carId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const amountKr = num(formData.get("amountKr"));
  const frequency = String(formData.get("frequency") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!carId) throw new Error("Car is required");
  if (!name) throw new Error("Name is required");
  if (amountKr == null || amountKr < 0) {
    throw new Error("Enter a valid amount");
  }
  if (!isFixedCostFrequency(frequency)) {
    throw new Error("Select a valid frequency");
  }

  await prisma.carFixedCost.create({
    data: {
      carId,
      name,
      amountOre: krToOre(amountKr),
      frequency,
      notes,
    },
  });

  revalidatePath(`/cars/${carId}`);
  revalidatePath("/cars");
  revalidatePath("/");
  revalidatePath("/reports");
}

export async function deleteFixedCostAction(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing fixed cost id");

  const row = await prisma.carFixedCost.delete({ where: { id } });
  revalidatePath(`/cars/${row.carId}`);
  revalidatePath("/cars");
  revalidatePath("/");
  revalidatePath("/reports");
}
