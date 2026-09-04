import { nid, nowIso } from "./id";
import type { AppData } from "./types";

function iso(d: Date): string {
  return d.toISOString();
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  return daysAgo(-n);
}

export function createSeedData(): AppData {
  const created = nowIso();
  const proace = nid();
  const tang = nid();
  const proaceModel = nid();
  const tangModel = nid();

  const cats = [
    { kind: "revenue", name: "Base rental", accountCode: "3000" },
    { kind: "revenue", name: "Extra km", accountCode: "3000" },
    { kind: "revenue", name: "Extra days", accountCode: "3000" },
    { kind: "revenue", name: "Extras", accountCode: "3000" },
    { kind: "revenue", name: "Cleaning fee", accountCode: "3000" },
    { kind: "revenue", name: "Damage charge", accountCode: "3000" },
    { kind: "revenue", name: "Fuel charge", accountCode: "3000" },
    { kind: "cost", name: "Platform fee", accountCode: "7300" },
    { kind: "cost", name: "Payment fee", accountCode: "7770" },
    { kind: "cost", name: "Wash", accountCode: "7010" },
    { kind: "cost", name: "Fuel", accountCode: "7000" },
    { kind: "cost", name: "Tolls", accountCode: "7040" },
    { kind: "cost", name: "Damage repair", accountCode: "7020" },
    { kind: "cost", name: "Other", accountCode: "7790" },
  ].map((c) => ({
    id: nid(),
    kind: c.kind,
    name: c.name,
    accountCode: c.accountCode,
    active: true,
    createdAt: created,
  }));

  const b1 = nid();
  const b2 = nid();
  const b3 = nid();
  const b4 = nid();

  const listings: AppData["marketListings"] = [];
  const proacePrices = [
    [22000, 389000],
    [41000, 365000],
    [58000, 349000],
    [76000, 329000],
    [92000, 315000],
    [110000, 299000],
    [128000, 279000],
    [145000, 265000],
    [162000, 249000],
    [180000, 235000],
  ] as const;
  for (const [km, price] of proacePrices) {
    listings.push({
      id: nid(),
      year: 2022,
      km,
      priceNok: price,
      fuel: "Diesel",
      transmission: "Automat",
      location: "Oslo",
      sellerType: "forhandler",
      title: "Toyota Proace",
      status: "active",
      scrapedDate: created.slice(0, 10),
      wltpKm: null,
      variant: "proace",
      updatedAt: created,
    });
  }
  const tangPrices = [
    [8000, 549000],
    [18000, 529000],
    [29000, 509000],
    [41000, 489000],
    [55000, 469000],
    [68000, 449000],
    [82000, 429000],
    [96000, 409000],
    [115000, 389000],
    [140000, 359000],
  ] as const;
  for (const [km, price] of tangPrices) {
    listings.push({
      id: nid(),
      year: 2024,
      km,
      priceNok: price,
      fuel: "El",
      transmission: "Automat",
      location: "Bergen",
      sellerType: "forhandler",
      title: "BYD Tang",
      status: "active",
      scrapedDate: created.slice(0, 10),
      wltpKm: 400,
      variant: "tang",
      updatedAt: created,
    });
  }

  return {
    cars: [
      {
        id: proace,
        make: "Toyota",
        model: "Proace",
        year: 2023,
        registrationPlate: "EL 12345",
        vin: null,
        status: "available",
        category: "long_wb",
        fuelType: "ICE",
        marketModelId: proaceModel,
        purchasePriceOre: 42_000_000,
        purchaseDate: iso(daysAgo(400)),
        purchaseOdometer: 18000,
        currentOdometer: 86500,
        location: "Oslo",
        insuranceNote: null,
        nextInspectionDue: iso(daysFromNow(40)),
        depPerKmOre: 85,
        depPerDayOre: 12000,
        serviceIntervalKm: 15000,
        notes: null,
        createdAt: created,
        updatedAt: created,
      },
      {
        id: tang,
        make: "BYD",
        model: "Tang",
        year: 2024,
        registrationPlate: "EV 98765",
        vin: null,
        status: "on_rent",
        category: "suv",
        fuelType: "BEV",
        marketModelId: tangModel,
        purchasePriceOre: 52_000_000,
        purchaseDate: iso(daysAgo(220)),
        purchaseOdometer: 4000,
        currentOdometer: 42800,
        location: "Oslo",
        insuranceNote: null,
        nextInspectionDue: iso(daysFromNow(180)),
        depPerKmOre: 90,
        depPerDayOre: 0,
        serviceIntervalKm: 20000,
        notes: null,
        createdAt: created,
        updatedAt: created,
      },
    ],
    bookings: [
      {
        id: b1,
        carId: proace,
        customerName: "Hansen Bygg",
        status: "completed",
        channel: "private",
        plannedStartAt: iso(daysAgo(48)),
        plannedEndAt: iso(daysAgo(41)),
        pickupTime: "09:00",
        deliveryTime: "17:00",
        drivenKm: 920,
        notes: null,
        createdAt: created,
        updatedAt: created,
      },
      {
        id: b2,
        carId: tang,
        customerName: "Nordic Events",
        status: "completed",
        channel: "getaround",
        plannedStartAt: iso(daysAgo(21)),
        plannedEndAt: iso(daysAgo(16)),
        pickupTime: "10:00",
        deliveryTime: "12:00",
        drivenKm: 640,
        notes: null,
        createdAt: created,
        updatedAt: created,
      },
      {
        id: b3,
        carId: proace,
        customerName: "Oslo Flyttehjelp",
        status: "completed",
        channel: "private",
        plannedStartAt: iso(daysAgo(10)),
        plannedEndAt: iso(daysAgo(6)),
        pickupTime: "08:00",
        deliveryTime: "18:00",
        drivenKm: 380,
        notes: null,
        createdAt: created,
        updatedAt: created,
      },
      {
        id: b4,
        carId: tang,
        customerName: "Lien Familie",
        status: "active",
        channel: "private",
        plannedStartAt: iso(daysAgo(1)),
        plannedEndAt: iso(daysFromNow(4)),
        pickupTime: "etter lunsj",
        deliveryTime: "10:00",
        drivenKm: null,
        notes: null,
        createdAt: created,
        updatedAt: created,
      },
    ],
    lineItems: [
      line(b1, "revenue", "Base rental", 980000, created),
      line(b1, "cost", "Wash", 45000, created),
      line(b2, "revenue", "Base rental", 1250000, created),
      line(b2, "cost", "Platform fee", 187500, created),
      line(b3, "revenue", "Base rental", 620000, created),
      line(b3, "revenue", "Extra km", 80000, created),
      line(b4, "revenue", "Base rental", 890000, created),
    ],
    serviceEvents: [
      {
        id: nid(),
        carId: proace,
        bookingId: null,
        occurredOn: iso(daysAgo(70)),
        odometer: 72000,
        type: "service",
        vendor: "Toyota Oslo",
        amountOre: 420000,
        vatPercent: 25,
        notes: null,
        createdAt: created,
        updatedAt: created,
      },
    ],
    odometerReadings: [],
    fixedCosts: [
      {
        id: nid(),
        carId: proace,
        name: "Insurance",
        amountOre: 180000,
        frequency: "monthly",
        notes: null,
        createdAt: created,
        updatedAt: created,
      },
      {
        id: nid(),
        carId: tang,
        name: "Insurance",
        amountOre: 210000,
        frequency: "monthly",
        notes: null,
        createdAt: created,
        updatedAt: created,
      },
    ],
    categories: cats,
    marketModels: [
      {
        id: proaceModel,
        variant: "proace",
        name: "Toyota Proace",
        hidden: false,
        createdAt: created,
        updatedAt: created,
      },
      {
        id: tangModel,
        variant: "tang",
        name: "BYD Tang",
        hidden: false,
        createdAt: created,
        updatedAt: created,
      },
    ],
    marketListings: listings,
    settings: {
      default_vat_percent: "25",
      currency: "NOK",
    },
  };
}

function line(
  bookingId: string,
  kind: string,
  category: string,
  amountOre: number,
  created: string,
) {
  return {
    id: nid(),
    bookingId,
    kind,
    category,
    description: "",
    amountOre,
    vatPercent: 25,
    quantity: 1,
    occurredOn: created,
    notes: null,
    createdAt: created,
    updatedAt: created,
  };
}
