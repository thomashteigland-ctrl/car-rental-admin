import { supabase } from "./supabase";
import type {
  AppData,
  Booking,
  BookingLineItem,
  Car,
  CarFixedCost,
  LineItemCategory,
  MarketListing,
  MarketModel,
  OdometerReading,
  ServiceEvent,
} from "./types";

function throwIfError(error: { message: string } | null, label: string) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

function asIso(value: string | null | undefined): string | null {
  if (!value) return null;
  return value;
}

function mapCar(row: Record<string, unknown>): Car {
  return {
    id: String(row.id),
    make: String(row.make ?? ""),
    model: String(row.model ?? ""),
    year: (row.year as number | null) ?? null,
    registrationPlate: String(row.registrationPlate ?? ""),
    vin: (row.vin as string | null) ?? null,
    status: String(row.status ?? "available"),
    category: (row.category as string | null) ?? null,
    fuelType: (row.fuelType as string | null) ?? null,
    marketModelId: (row.marketModelId as string | null) ?? null,
    purchasePriceOre: (row.purchasePriceOre as number | null) ?? null,
    purchaseDate: asIso(row.purchaseDate as string | null),
    purchaseOdometer: Number(row.purchaseOdometer ?? 0),
    currentOdometer: Number(row.currentOdometer ?? 0),
    location: (row.location as string | null) ?? null,
    insuranceNote: (row.insuranceNote as string | null) ?? null,
    nextInspectionDue: asIso(row.nextInspectionDue as string | null),
    depPerKmOre: Number(row.depPerKmOre ?? 0),
    depPerDayOre: Number(row.depPerDayOre ?? 0),
    serviceIntervalKm: (row.serviceIntervalKm as number | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updatedAt ?? new Date().toISOString()),
  };
}

function mapBooking(row: Record<string, unknown>): Booking {
  return {
    id: String(row.id),
    carId: String(row.carId),
    customerName: String(row.customerName ?? ""),
    status: String(row.status ?? "confirmed"),
    channel: String(row.channel ?? "private"),
    plannedStartAt: String(row.plannedStartAt),
    plannedEndAt: String(row.plannedEndAt),
    pickupTime: (row.pickupTime as string | null) ?? null,
    deliveryTime: (row.deliveryTime as string | null) ?? null,
    drivenKm: (row.drivenKm as number | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updatedAt ?? new Date().toISOString()),
  };
}

function mapLineItem(row: Record<string, unknown>): BookingLineItem {
  return {
    id: String(row.id),
    bookingId: String(row.bookingId),
    kind: String(row.kind),
    category: String(row.category),
    description: String(row.description ?? ""),
    amountOre: Number(row.amountOre ?? 0),
    vatPercent: Number(row.vatPercent ?? 25),
    quantity: Number(row.quantity ?? 1),
    occurredOn: String(row.occurredOn ?? new Date().toISOString()),
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updatedAt ?? new Date().toISOString()),
  };
}

function mapService(row: Record<string, unknown>): ServiceEvent {
  return {
    id: String(row.id),
    carId: String(row.carId),
    bookingId: (row.bookingId as string | null) ?? null,
    occurredOn: String(row.occurredOn),
    odometer: (row.odometer as number | null) ?? null,
    type: String(row.type),
    vendor: (row.vendor as string | null) ?? null,
    amountOre: Number(row.amountOre ?? 0),
    vatPercent: Number(row.vatPercent ?? 25),
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updatedAt ?? new Date().toISOString()),
  };
}

function mapFixedCost(row: Record<string, unknown>): CarFixedCost {
  return {
    id: String(row.id),
    carId: String(row.carId),
    name: String(row.name),
    amountOre: Number(row.amountOre ?? 0),
    frequency: String(row.frequency),
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updatedAt ?? new Date().toISOString()),
  };
}

function mapOdometer(row: Record<string, unknown>): OdometerReading {
  return {
    id: String(row.id),
    carId: String(row.carId),
    odometerKm: Number(row.odometerKm ?? 0),
    recordedAt: String(row.recordedAt),
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.createdAt ?? new Date().toISOString()),
  };
}

function mapCategory(row: Record<string, unknown>): LineItemCategory {
  return {
    id: String(row.id),
    kind: String(row.kind),
    name: String(row.name),
    accountCode: (row.accountCode as string | null) ?? null,
    active: Boolean(row.active ?? true),
    createdAt: String(row.createdAt ?? new Date().toISOString()),
  };
}

function mapMarketModel(row: Record<string, unknown>): MarketModel {
  return {
    id: String(row.id),
    variant: String(row.variant),
    name: String(row.name),
    hidden: Boolean(row.hidden ?? false),
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updatedAt ?? new Date().toISOString()),
  };
}

function mapMarketListing(row: Record<string, unknown>): MarketListing {
  return {
    id: String(row.id),
    year: (row.year as number | null) ?? null,
    km: (row.km as number | null) ?? null,
    priceNok: (row.priceNok as number | null) ?? null,
    fuel: (row.fuel as string | null) ?? null,
    transmission: (row.transmission as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    sellerType: (row.sellerType as string | null) ?? null,
    title: (row.title as string | null) ?? null,
    status: String(row.status ?? "active"),
    scrapedDate: String(row.scrapedDate ?? new Date().toISOString().slice(0, 10)),
    wltpKm: (row.wltpKm as number | null) ?? null,
    variant: String(row.variant),
    updatedAt: String(row.updatedAt ?? new Date().toISOString()),
  };
}

async function selectAll(table: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.from(table).select("*");
  throwIfError(error, `Load ${table}`);
  return (data ?? []) as Record<string, unknown>[];
}

export function emptyAppData(): AppData {
  return {
    cars: [],
    bookings: [],
    lineItems: [],
    serviceEvents: [],
    odometerReadings: [],
    fixedCosts: [],
    categories: [],
    marketModels: [],
    marketListings: [],
    settings: {},
  };
}

export async function fetchAllFromSupabase(): Promise<AppData> {
  const [
    cars,
    bookings,
    lineItems,
    serviceEvents,
    odometerReadings,
    fixedCosts,
    categories,
    marketModels,
    marketListings,
    settingsRows,
  ] = await Promise.all([
    selectAll("Car"),
    selectAll("Booking"),
    selectAll("BookingLineItem"),
    selectAll("ServiceEvent"),
    selectAll("OdometerReading"),
    selectAll("CarFixedCost"),
    selectAll("LineItemCategory"),
    selectAll("MarketModel"),
    selectAll("MarketListing"),
    selectAll("AppSetting"),
  ]);

  const settings: Record<string, string> = {};
  for (const row of settingsRows) {
    settings[String(row.key)] = String(row.value ?? "");
  }

  return {
    cars: cars.map(mapCar),
    bookings: bookings.map(mapBooking),
    lineItems: lineItems.map(mapLineItem),
    serviceEvents: serviceEvents.map(mapService),
    odometerReadings: odometerReadings.map(mapOdometer),
    fixedCosts: fixedCosts.map(mapFixedCost),
    categories: categories.map(mapCategory),
    marketModels: marketModels.map(mapMarketModel),
    marketListings: marketListings.map(mapMarketListing),
    settings,
  };
}

export async function dbUpsertCar(car: Car) {
  const { error } = await supabase.from("Car").upsert({
    id: car.id,
    make: car.make,
    model: car.model,
    year: car.year,
    registrationPlate: car.registrationPlate,
    vin: car.vin,
    status: car.status,
    category: car.category,
    fuelType: car.fuelType,
    marketModelId: car.marketModelId,
    purchasePriceOre: car.purchasePriceOre,
    purchaseDate: car.purchaseDate,
    purchaseOdometer: car.purchaseOdometer,
    currentOdometer: car.currentOdometer,
    location: car.location,
    insuranceNote: car.insuranceNote,
    nextInspectionDue: car.nextInspectionDue,
    depPerKmOre: car.depPerKmOre,
    depPerDayOre: car.depPerDayOre,
    serviceIntervalKm: car.serviceIntervalKm,
    notes: car.notes,
    createdAt: car.createdAt,
    updatedAt: car.updatedAt,
  });
  throwIfError(error, "Save car");
}

export async function dbDeleteCar(id: string) {
  const { error } = await supabase.from("Car").delete().eq("id", id);
  throwIfError(error, "Delete car");
}

export async function dbUpsertBooking(booking: Booking) {
  const { error } = await supabase.from("Booking").upsert({
    id: booking.id,
    carId: booking.carId,
    customerName: booking.customerName,
    status: booking.status,
    channel: booking.channel,
    plannedStartAt: booking.plannedStartAt,
    plannedEndAt: booking.plannedEndAt,
    pickupTime: booking.pickupTime,
    deliveryTime: booking.deliveryTime,
    drivenKm: booking.drivenKm,
    notes: booking.notes,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  });
  throwIfError(error, "Save booking");
}

export async function dbDeleteBooking(id: string) {
  const { error } = await supabase.from("Booking").delete().eq("id", id);
  throwIfError(error, "Delete booking");
}

export async function dbInsertLineItem(item: BookingLineItem) {
  const { error } = await supabase.from("BookingLineItem").insert({
    id: item.id,
    bookingId: item.bookingId,
    kind: item.kind,
    category: item.category,
    description: item.description,
    amountOre: item.amountOre,
    vatPercent: item.vatPercent,
    quantity: item.quantity,
    occurredOn: item.occurredOn,
    notes: item.notes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });
  throwIfError(error, "Add line item");
}

export async function dbDeleteLineItem(id: string) {
  const { error } = await supabase.from("BookingLineItem").delete().eq("id", id);
  throwIfError(error, "Delete line item");
}

export async function dbInsertService(event: ServiceEvent) {
  const { error } = await supabase.from("ServiceEvent").insert({
    id: event.id,
    carId: event.carId,
    bookingId: event.bookingId,
    occurredOn: event.occurredOn,
    odometer: event.odometer,
    type: event.type,
    vendor: event.vendor,
    amountOre: event.amountOre,
    vatPercent: event.vatPercent,
    notes: event.notes,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  });
  throwIfError(error, "Add service");
}

export async function dbDeleteService(id: string) {
  const { error } = await supabase.from("ServiceEvent").delete().eq("id", id);
  throwIfError(error, "Delete service");
}

export async function dbInsertFixedCost(cost: CarFixedCost) {
  const { error } = await supabase.from("CarFixedCost").insert({
    id: cost.id,
    carId: cost.carId,
    name: cost.name,
    amountOre: cost.amountOre,
    frequency: cost.frequency,
    notes: cost.notes,
    createdAt: cost.createdAt,
    updatedAt: cost.updatedAt,
  });
  throwIfError(error, "Add fixed cost");
}

export async function dbDeleteFixedCost(id: string) {
  const { error } = await supabase.from("CarFixedCost").delete().eq("id", id);
  throwIfError(error, "Delete fixed cost");
}

export async function dbInsertCategory(cat: LineItemCategory) {
  const { error } = await supabase.from("LineItemCategory").insert({
    id: cat.id,
    kind: cat.kind,
    name: cat.name,
    accountCode: cat.accountCode,
    active: cat.active,
    createdAt: cat.createdAt,
  });
  throwIfError(error, "Add category");
}

export async function dbInsertMarketModel(model: MarketModel) {
  const { error } = await supabase.from("MarketModel").insert({
    id: model.id,
    variant: model.variant,
    name: model.name,
    params: {},
    hidden: model.hidden,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  });
  throwIfError(error, "Add market model");
}

export async function dbUpdateMarketModelHidden(id: string, hidden: boolean, updatedAt: string) {
  const { error } = await supabase
    .from("MarketModel")
    .update({ hidden, updatedAt })
    .eq("id", id);
  throwIfError(error, "Update market model");
}

export async function dbInsertMarketListing(listing: MarketListing) {
  const { error } = await supabase.from("MarketListing").insert({
    id: listing.id,
    year: listing.year,
    km: listing.km,
    priceNok: listing.priceNok,
    fuel: listing.fuel,
    transmission: listing.transmission,
    location: listing.location,
    sellerType: listing.sellerType,
    title: listing.title,
    status: listing.status,
    scrapedDate: listing.scrapedDate,
    wltpKm: listing.wltpKm,
    variant: listing.variant,
    updatedAt: listing.updatedAt,
  });
  throwIfError(error, "Add market listing");
}
