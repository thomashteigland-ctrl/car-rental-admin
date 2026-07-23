"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { krToOre } from "@/lib/money";
import {
  resolveCarDepLive,
  type FuelGroup,
} from "@/lib/market/depreciation";
import { prisma } from "@/lib/prisma";
import { fromDateInput, fromDatetimeLocal } from "@/lib/dates";

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function upsertCarAction(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "") || null;

  const marketModelId =
    String(formData.get("marketModelId") ?? "").trim() || null;
  const fuelTypeRaw = String(formData.get("fuelType") ?? "").trim() || null;
  const fuelType =
    fuelTypeRaw === "ICE" || fuelTypeRaw === "BEV"
      ? (fuelTypeRaw as FuelGroup)
      : fuelTypeRaw;

  const purchasePriceOre = (() => {
    const kr = num(formData.get("purchasePriceKr"));
    return kr == null ? null : krToOre(kr);
  })();
  const purchaseOdometer = num(formData.get("purchaseOdometer")) ?? 0;

  let depPerKmOre = krToOre(num(formData.get("depPerKmKr")) ?? 0);
  let depPerDayOre = krToOre(num(formData.get("depPerDayKr")) ?? 0);

  let marketModel: { id: string; variant: string } | null = null;
  if (marketModelId) {
    marketModel = await prisma.marketModel.findUnique({
      where: { id: marketModelId },
      select: { id: true, variant: true },
    });
    if (!marketModel) throw new Error("Selected market model was not found");
    if (fuelType !== "ICE" && fuelType !== "BEV") {
      throw new Error("Select ICE or BEV when linking a market model");
    }
    if (purchasePriceOre == null) {
      throw new Error("Purchase price is required for market depreciation");
    }

    const breakdown = await resolveCarDepLive({
      purchasePriceOre,
      purchaseOdometer,
      fuelType,
      marketModelId: marketModel.id,
      marketModel: { variant: marketModel.variant },
      depPerKmOre,
      depPerDayOre,
    });
    if (breakdown.error || breakdown.source !== "market") {
      throw new Error(
        breakdown.error ?? "Could not derive depreciation from market curve",
      );
    }
    depPerKmOre = breakdown.rates.depPerKmOre;
    depPerDayOre = 0;
  }

  const data = {
    make: String(formData.get("make") ?? "").trim(),
    model: String(formData.get("model") ?? "").trim(),
    year: num(formData.get("year")),
    registrationPlate: String(formData.get("registrationPlate") ?? "")
      .trim()
      .toUpperCase(),
    vin: String(formData.get("vin") ?? "").trim() || null,
    status: String(formData.get("status") ?? "available"),
    category: String(formData.get("category") ?? "").trim() || null,
    fuelType,
    marketModelId: marketModel?.id ?? null,
    purchasePriceOre,
    purchaseDate: fromDatetimeLocal(String(formData.get("purchaseDate") ?? "")),
    purchaseOdometer,
    currentOdometer: num(formData.get("currentOdometer")) ?? 0,
    location: String(formData.get("location") ?? "").trim() || null,
    insuranceNote: String(formData.get("insuranceNote") ?? "").trim() || null,
    nextInspectionDue: fromDatetimeLocal(
      String(formData.get("nextInspectionDue") ?? ""),
    ),
    depPerKmOre,
    depPerDayOre,
    serviceIntervalKm: num(formData.get("serviceIntervalKm")),
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  if (!data.make || !data.model || !data.registrationPlate) {
    throw new Error("Make, model and registration plate are required");
  }

  const car = id
    ? await prisma.car.update({ where: { id }, data })
    : await prisma.car.create({ data });

  revalidatePath("/cars");
  revalidatePath(`/cars/${car.id}`);
  revalidatePath("/");
  redirect(`/cars/${car.id}`);
}

export type OdometerFormState = { error: string } | null;

export async function updateOdometerAction(
  _prev: OdometerFormState,
  formData: FormData,
): Promise<OdometerFormState> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const reading = num(formData.get("odometer"));
  const recordedAt = fromDateInput(String(formData.get("recordedAt") ?? ""));
  if (!id || reading == null || reading < 0) {
    return { error: "Enter a valid odometer reading" };
  }
  if (!recordedAt) {
    return { error: "Enter the date of the reading" };
  }

  const car = await prisma.car.findUnique({ where: { id } });
  if (!car) return { error: "Car not found" };

  const previous = await prisma.odometerReading.findFirst({
    where: { carId: id, recordedAt: { lte: recordedAt } },
    orderBy: [{ recordedAt: "desc" }, { odometerKm: "desc" }],
  });
  const floor = previous?.odometerKm ?? 0;
  if (reading < floor) {
    return {
      error: `Reading cannot be below ${floor.toLocaleString("nb-NO")} km (previous reading on or before this date)`,
    };
  }

  const laterLower = await prisma.odometerReading.findFirst({
    where: {
      carId: id,
      recordedAt: { gt: recordedAt },
      odometerKm: { lt: reading },
    },
    orderBy: { recordedAt: "asc" },
  });
  if (laterLower) {
    return {
      error: `A later reading is only ${laterLower.odometerKm.toLocaleString("nb-NO")} km — lower this value or pick an earlier date`,
    };
  }

  await prisma.odometerReading.create({
    data: {
      carId: id,
      odometerKm: reading,
      recordedAt,
    },
  });

  const latest = await prisma.odometerReading.findFirst({
    where: { carId: id },
    orderBy: [{ recordedAt: "desc" }, { odometerKm: "desc" }],
  });

  await prisma.car.update({
    where: { id },
    data: {
      currentOdometer: latest?.odometerKm ?? reading,
    },
  });

  revalidatePath("/cars");
  revalidatePath(`/cars/${id}`);
  revalidatePath("/");
  return null;
}

export async function deleteCarAction(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  await prisma.car.delete({ where: { id } });
  revalidatePath("/cars");
  redirect("/cars");
}
