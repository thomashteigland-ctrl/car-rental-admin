"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { upsertMarketModelFromInput } from "@/lib/market/add-model";
import { prisma } from "@/lib/prisma";

export type AddMarketModelState =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | null;

export async function addMarketModelAction(
  _prev: AddMarketModelState,
  formData: FormData,
): Promise<AddMarketModelState> {
  await requireSession();
  const rawVariant = String(formData.get("variant") ?? "");
  const name = String(formData.get("name") ?? "").trim() || null;

  if (!rawVariant.trim()) {
    return { ok: false, error: "Variant ID or FINN URL is required" };
  }

  try {
    const result = await upsertMarketModelFromInput({
      rawVariant,
      name,
    });
    revalidatePath("/market");
    revalidatePath("/cars");
    revalidatePath("/cars/new");
    return {
      ok: true,
      message: result.created
        ? `Added ${result.name} — run scrape to pull listings`
        : `Updated ${result.name}`,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not add model",
    };
  }
}

export async function deleteMarketModelAction(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing model id");

  const linked = await prisma.car.count({ where: { marketModelId: id } });
  if (linked > 0) {
    throw new Error(
      `Cannot delete: ${linked} car(s) still linked to this model`,
    );
  }

  await prisma.marketModel.delete({ where: { id } });
  revalidatePath("/market");
  revalidatePath("/cars");
  revalidatePath("/cars/new");
}
