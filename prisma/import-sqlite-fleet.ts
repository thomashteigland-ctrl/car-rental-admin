/**
 * Port local SQLite fleet data (prisma/dev.db export) into Supabase `rental`.
 *
 *   sqlite3 -json prisma/dev.db "SELECT * FROM Car;" > prisma/sqlite-export/Car.json
 *   npx tsx prisma/import-sqlite-fleet.ts
 */
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DIR = path.resolve(process.cwd(), "prisma/sqlite-export");

function load<T>(name: string): T[] {
  const file = path.join(DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, "utf8").trim();
  if (!raw) return [];
  return JSON.parse(raw) as T[];
}

function asDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return new Date(v);
  const n = Number(v);
  if (Number.isFinite(n) && String(v).length >= 10) return new Date(n);
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function asInt(v: unknown, fallback = 0): number {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asIntOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asFloat(v: unknown, fallback: number): number {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function main() {
  const users = load<Record<string, unknown>>("User");
  const cars = load<Record<string, unknown>>("Car");
  const bookings = load<Record<string, unknown>>("Booking");
  const lineItems = load<Record<string, unknown>>("BookingLineItem");
  const services = load<Record<string, unknown>>("ServiceEvent");
  const categories = load<Record<string, unknown>>("LineItemCategory");
  const settings = load<Record<string, unknown>>("AppSetting");

  for (const row of users) {
    await prisma.user.upsert({
      where: { id: String(row.id) },
      create: {
        id: String(row.id),
        email: String(row.email),
        name: String(row.name),
        passwordHash: String(row.passwordHash),
        role: String(row.role || "owner"),
        createdAt: asDate(row.createdAt) ?? new Date(),
        updatedAt: asDate(row.updatedAt) ?? new Date(),
      },
      update: {
        email: String(row.email),
        name: String(row.name),
        passwordHash: String(row.passwordHash),
        role: String(row.role || "owner"),
      },
    });
  }
  console.log(`Users: ${users.length}`);

  for (const row of categories) {
    const kind = String(row.kind);
    const name = String(row.name);
    await prisma.lineItemCategory.upsert({
      where: { kind_name: { kind, name } },
      create: {
        id: String(row.id),
        kind,
        name,
        accountCode: row.accountCode != null ? String(row.accountCode) : null,
        active: row.active === 0 || row.active === false ? false : true,
        createdAt: asDate(row.createdAt) ?? new Date(),
      },
      update: {
        accountCode: row.accountCode != null ? String(row.accountCode) : null,
        active: row.active === 0 || row.active === false ? false : true,
      },
    });
  }
  console.log(`Categories: ${categories.length}`);

  for (const row of settings) {
    await prisma.appSetting.upsert({
      where: { key: String(row.key) },
      create: {
        key: String(row.key),
        value: String(row.value),
        updatedAt: asDate(row.updatedAt) ?? new Date(),
      },
      update: { value: String(row.value) },
    });
  }
  console.log(`Settings: ${settings.length}`);

  for (const row of cars) {
    await prisma.car.upsert({
      where: { id: String(row.id) },
      create: {
        id: String(row.id),
        make: String(row.make),
        model: String(row.model),
        year: asIntOrNull(row.year),
        registrationPlate: String(row.registrationPlate),
        vin: row.vin != null ? String(row.vin) : null,
        status: String(row.status || "available"),
        category: row.category != null ? String(row.category) : null,
        fuelType: row.fuelType != null ? String(row.fuelType) : null,
        purchasePriceOre: asIntOrNull(row.purchasePriceOre),
        purchaseDate: asDate(row.purchaseDate),
        purchaseOdometer: asInt(row.purchaseOdometer, 0),
        currentOdometer: asInt(row.currentOdometer, 0),
        location: row.location != null ? String(row.location) : null,
        insuranceNote: row.insuranceNote != null ? String(row.insuranceNote) : null,
        nextInspectionDue: asDate(row.nextInspectionDue),
        depPerKmOre: asInt(row.depPerKmOre, 0),
        depPerDayOre: asInt(row.depPerDayOre, 0),
        serviceIntervalKm: asIntOrNull(row.serviceIntervalKm),
        notes: row.notes != null ? String(row.notes) : null,
        createdAt: asDate(row.createdAt) ?? new Date(),
        updatedAt: asDate(row.updatedAt) ?? new Date(),
      },
      update: {
        make: String(row.make),
        model: String(row.model),
        year: asIntOrNull(row.year),
        registrationPlate: String(row.registrationPlate),
        vin: row.vin != null ? String(row.vin) : null,
        status: String(row.status || "available"),
        category: row.category != null ? String(row.category) : null,
        fuelType: row.fuelType != null ? String(row.fuelType) : null,
        purchasePriceOre: asIntOrNull(row.purchasePriceOre),
        purchaseDate: asDate(row.purchaseDate),
        purchaseOdometer: asInt(row.purchaseOdometer, 0),
        currentOdometer: asInt(row.currentOdometer, 0),
        location: row.location != null ? String(row.location) : null,
        insuranceNote: row.insuranceNote != null ? String(row.insuranceNote) : null,
        nextInspectionDue: asDate(row.nextInspectionDue),
        depPerKmOre: asInt(row.depPerKmOre, 0),
        depPerDayOre: asInt(row.depPerDayOre, 0),
        serviceIntervalKm: asIntOrNull(row.serviceIntervalKm),
        notes: row.notes != null ? String(row.notes) : null,
      },
    });
  }
  console.log(`Cars: ${cars.length}`);

  for (const row of bookings) {
    const start = asDate(row.plannedStartAt);
    const end = asDate(row.plannedEndAt);
    if (!start || !end) {
      console.warn(`Skipping booking ${row.id}: missing dates`);
      continue;
    }
    await prisma.booking.upsert({
      where: { id: String(row.id) },
      create: {
        id: String(row.id),
        carId: String(row.carId),
        customerName: String(row.customerName),
        status: String(row.status || "confirmed"),
        channel: String(row.channel || "private"),
        plannedStartAt: start,
        plannedEndAt: end,
        pickupTime: row.pickupTime != null ? String(row.pickupTime) : null,
        deliveryTime: row.deliveryTime != null ? String(row.deliveryTime) : null,
        drivenKm: asIntOrNull(row.drivenKm),
        notes: row.notes != null ? String(row.notes) : null,
        createdAt: asDate(row.createdAt) ?? new Date(),
        updatedAt: asDate(row.updatedAt) ?? new Date(),
      },
      update: {
        carId: String(row.carId),
        customerName: String(row.customerName),
        status: String(row.status || "confirmed"),
        channel: String(row.channel || "private"),
        plannedStartAt: start,
        plannedEndAt: end,
        pickupTime: row.pickupTime != null ? String(row.pickupTime) : null,
        deliveryTime: row.deliveryTime != null ? String(row.deliveryTime) : null,
        drivenKm: asIntOrNull(row.drivenKm),
        notes: row.notes != null ? String(row.notes) : null,
      },
    });
  }
  console.log(`Bookings: ${bookings.length}`);

  for (const row of lineItems) {
    await prisma.bookingLineItem.upsert({
      where: { id: String(row.id) },
      create: {
        id: String(row.id),
        bookingId: String(row.bookingId),
        kind: String(row.kind),
        category: String(row.category),
        description: String(row.description),
        amountOre: asInt(row.amountOre, 0),
        vatPercent: asFloat(row.vatPercent, 25),
        quantity: asFloat(row.quantity, 1),
        occurredOn: asDate(row.occurredOn) ?? new Date(),
        notes: row.notes != null ? String(row.notes) : null,
        createdAt: asDate(row.createdAt) ?? new Date(),
        updatedAt: asDate(row.updatedAt) ?? new Date(),
      },
      update: {
        bookingId: String(row.bookingId),
        kind: String(row.kind),
        category: String(row.category),
        description: String(row.description),
        amountOre: asInt(row.amountOre, 0),
        vatPercent: asFloat(row.vatPercent, 25),
        quantity: asFloat(row.quantity, 1),
        occurredOn: asDate(row.occurredOn) ?? new Date(),
        notes: row.notes != null ? String(row.notes) : null,
      },
    });
  }
  console.log(`Line items: ${lineItems.length}`);

  for (const row of services) {
    const occurredOn = asDate(row.occurredOn);
    if (!occurredOn) continue;
    await prisma.serviceEvent.upsert({
      where: { id: String(row.id) },
      create: {
        id: String(row.id),
        carId: String(row.carId),
        bookingId: row.bookingId != null ? String(row.bookingId) : null,
        occurredOn,
        odometer: asIntOrNull(row.odometer),
        type: String(row.type),
        vendor: row.vendor != null ? String(row.vendor) : null,
        amountOre: asInt(row.amountOre, 0),
        vatPercent: asFloat(row.vatPercent, 25),
        notes: row.notes != null ? String(row.notes) : null,
        createdAt: asDate(row.createdAt) ?? new Date(),
        updatedAt: asDate(row.updatedAt) ?? new Date(),
      },
      update: {
        carId: String(row.carId),
        bookingId: row.bookingId != null ? String(row.bookingId) : null,
        occurredOn,
        odometer: asIntOrNull(row.odometer),
        type: String(row.type),
        vendor: row.vendor != null ? String(row.vendor) : null,
        amountOre: asInt(row.amountOre, 0),
        vatPercent: asFloat(row.vatPercent, 25),
        notes: row.notes != null ? String(row.notes) : null,
      },
    });
  }
  console.log(`Service events: ${services.length}`);

  const counts = {
    cars: await prisma.car.count(),
    bookings: await prisma.booking.count(),
    lineItems: await prisma.bookingLineItem.count(),
    service: await prisma.serviceEvent.count(),
  };
  console.log("Supabase totals:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
