"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { fromDateInput, fromDatetimeLocal } from "@/lib/dates";
import { krToOre } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export type BookingFormState = { error: string } | null;

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function createQuickBookingAction(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  await requireSession();

  const customerName = String(formData.get("customerName") ?? "").trim();
  const carId = String(formData.get("carId") ?? "");
  const plannedStartAt = fromDateInput(
    String(formData.get("plannedStartAt") ?? ""),
  );
  if (!plannedStartAt) return { error: "Start date is required" };

  const endRaw = String(formData.get("plannedEndAt") ?? "").trim();
  const plannedEndAt = fromDateInput(endRaw) ?? plannedStartAt;
  const revenueKr = num(formData.get("revenueKr"));
  const vatPercent = num(formData.get("vatPercent")) ?? 25;

  if (!customerName) return { error: "Customer name is required" };
  if (!carId) return { error: "Car is required" };
  if (plannedEndAt < plannedStartAt) {
    return { error: "End date must be on or after start date" };
  }
  if (revenueKr == null || revenueKr < 0) {
    return { error: "Revenue amount is required" };
  }
  if (vatPercent < 0) {
    return { error: "VAT % cannot be negative" };
  }

  const booking = await prisma.booking.create({
    data: {
      carId,
      customerName,
      status: "confirmed",
      channel: "getaround",
      plannedStartAt,
      plannedEndAt,
      lineItems: {
        create: {
          kind: "revenue",
          category: "Base rental",
          description: "Rental",
          amountOre: krToOre(revenueKr),
          vatPercent,
          quantity: 1,
          occurredOn: plannedStartAt,
        },
      },
    },
  });

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${booking.id}`);
  revalidatePath("/calendar");
  revalidatePath("/");
  redirect(`/bookings/${booking.id}`);
}

export async function updateBookingScheduleAction(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing booking id" };

  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) return { error: "Booking not found" };

  const customerName = String(formData.get("customerName") ?? "").trim();
  const plannedStartAt = fromDateInput(
    String(formData.get("plannedStartAt") ?? ""),
  );
  const plannedEndAt = fromDateInput(
    String(formData.get("plannedEndAt") ?? ""),
  );

  if (!customerName) return { error: "Customer name is required" };
  if (!plannedStartAt || !plannedEndAt) {
    return { error: "Start and end dates are required" };
  }
  if (plannedEndAt < plannedStartAt) {
    return { error: "End date must be on or after start date" };
  }

  await prisma.booking.update({
    where: { id },
    data: { customerName, plannedStartAt, plannedEndAt },
  });

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  revalidatePath("/calendar");
  revalidatePath("/");
  return null;
}

export async function upsertBookingAction(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing booking id" };

  const plannedStartAt = fromDateInput(
    String(formData.get("plannedStartAt") ?? ""),
  );
  const plannedEndAt = fromDateInput(
    String(formData.get("plannedEndAt") ?? ""),
  );
  if (!plannedStartAt || !plannedEndAt) {
    return { error: "Start and end dates are required" };
  }
  if (plannedEndAt < plannedStartAt) {
    return { error: "End date must be on or after start date" };
  }

  const carId = String(formData.get("carId") ?? "");
  const customerName = String(formData.get("customerName") ?? "").trim();
  if (!carId || !customerName) {
    return { error: "Car and customer name are required" };
  }

  const drivenKm = num(formData.get("drivenKm"));
  if (drivenKm != null && drivenKm < 0) {
    return { error: "Driven km cannot be negative" };
  }

  const pickupTime = String(formData.get("pickupTime") ?? "").trim() || null;
  const deliveryTime = String(formData.get("deliveryTime") ?? "").trim() || null;

  const data = {
    carId,
    customerName,
    status: String(formData.get("status") ?? "confirmed"),
    channel: String(formData.get("channel") ?? "getaround"),
    plannedStartAt,
    plannedEndAt,
    pickupTime,
    deliveryTime,
    drivenKm,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const previous = await prisma.booking.findUnique({
    where: { id },
    select: { drivenKm: true },
  });

  const booking = await prisma.booking.update({ where: { id }, data });

  const prevKm = previous?.drivenKm ?? 0;
  const nextKm = drivenKm ?? 0;
  const kmDelta = nextKm - prevKm;
  if (kmDelta !== 0) {
    await prisma.car.update({
      where: { id: carId },
      data: { currentOdometer: { increment: kmDelta } },
    });
  }

  if (data.status === "active") {
    await prisma.car.update({
      where: { id: carId },
      data: { status: "on_rent" },
    });
  } else if (["completed", "cancelled", "no_show"].includes(data.status)) {
    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (car && car.status === "on_rent") {
      await prisma.car.update({
        where: { id: carId },
        data: { status: "available" },
      });
    }
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${booking.id}`);
  revalidatePath("/calendar");
  revalidatePath("/");
  return null;
}

export async function addLineItemAction(formData: FormData) {
  await requireSession();
  const bookingId = String(formData.get("bookingId") ?? "");
  const amountKr = num(formData.get("amountKr"));
  if (amountKr == null) throw new Error("Amount required");

  await prisma.bookingLineItem.create({
    data: {
      bookingId,
      kind: String(formData.get("kind") ?? "revenue"),
      category: String(formData.get("category") ?? "Other"),
      description:
        String(formData.get("description") ?? "").trim() ||
        String(formData.get("category") ?? "Line item"),
      amountOre: krToOre(amountKr),
      vatPercent: num(formData.get("vatPercent")) ?? 25,
      quantity: num(formData.get("quantity")) ?? 1,
      occurredOn:
        fromDatetimeLocal(String(formData.get("occurredOn") ?? "")) ??
        new Date(),
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/");
  revalidatePath("/reports");
}

export async function deleteLineItemAction(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const item = await prisma.bookingLineItem.delete({ where: { id } });
  revalidatePath(`/bookings/${item.bookingId}`);
  revalidatePath("/");
  revalidatePath("/reports");
}

export async function deleteBookingAction(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  await prisma.booking.delete({ where: { id } });
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/");
  redirect("/bookings");
}
