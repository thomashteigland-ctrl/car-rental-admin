import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { nid, nowIso } from "./id";
import { krToOre } from "./money";
import {
  dbDeleteBooking,
  dbDeleteCar,
  dbDeleteFixedCost,
  dbDeleteLineItem,
  dbDeleteService,
  dbInsertCategory,
  dbInsertFixedCost,
  dbInsertLineItem,
  dbInsertMarketListing,
  dbInsertMarketModel,
  dbInsertService,
  dbUpdateMarketModelHidden,
  dbUpsertBooking,
  dbUpsertCar,
  emptyAppData,
  fetchAllFromSupabase,
} from "./supabase-sync";
import type {
  AppData,
  Booking,
  BookingLineItem,
  Car,
  CarFixedCost,
  LineItemCategory,
  MarketListing,
  MarketModel,
  ServiceEvent,
} from "./types";

export type StoreStatus = "loading" | "ready" | "error";

type StoreMeta = {
  status: StoreStatus;
  error: string | null;
};

let data: AppData = emptyAppData();
let meta: StoreMeta = { status: "loading", error: null };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshotData() {
  return data;
}

function snapshotMeta() {
  return meta;
}

function setData(next: AppData) {
  data = next;
  emit();
}

function setMeta(next: StoreMeta) {
  meta = next;
  emit();
}

function mutateLocal(fn: (draft: AppData) => AppData) {
  data = fn(data);
  emit();
}

export function getData(): AppData {
  return data;
}

export function importData(next: AppData) {
  setData(next);
  setMeta({ status: "ready", error: null });
}

export async function reloadFromSupabase() {
  setMeta({ status: "loading", error: null });
  try {
    const next = await fetchAllFromSupabase();
    setData(next);
    setMeta({ status: "ready", error: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load from Supabase";
    setMeta({ status: "error", error: message });
    throw e;
  }
}

export async function upsertCar(
  input: Partial<Car> & Pick<Car, "make" | "model" | "registrationPlate">,
) {
  const t = nowIso();
  const existing = input.id ? data.cars.find((c) => c.id === input.id) : undefined;
  const car: Car = {
    id: existing?.id ?? nid(),
    make: input.make,
    model: input.model,
    year: input.year ?? existing?.year ?? null,
    registrationPlate: input.registrationPlate,
    vin: input.vin ?? existing?.vin ?? null,
    status: input.status ?? existing?.status ?? "available",
    category: input.category ?? existing?.category ?? null,
    fuelType: input.fuelType ?? existing?.fuelType ?? null,
    marketModelId: input.marketModelId ?? existing?.marketModelId ?? null,
    purchasePriceOre: input.purchasePriceOre ?? existing?.purchasePriceOre ?? null,
    purchaseDate: input.purchaseDate ?? existing?.purchaseDate ?? null,
    purchaseOdometer: input.purchaseOdometer ?? existing?.purchaseOdometer ?? 0,
    currentOdometer: input.currentOdometer ?? existing?.currentOdometer ?? 0,
    location: input.location ?? existing?.location ?? null,
    insuranceNote: input.insuranceNote ?? existing?.insuranceNote ?? null,
    nextInspectionDue: input.nextInspectionDue ?? existing?.nextInspectionDue ?? null,
    depPerKmOre: input.depPerKmOre ?? existing?.depPerKmOre ?? 0,
    depPerDayOre: input.depPerDayOre ?? existing?.depPerDayOre ?? 0,
    serviceIntervalKm: input.serviceIntervalKm ?? existing?.serviceIntervalKm ?? null,
    notes: input.notes ?? existing?.notes ?? null,
    createdAt: existing?.createdAt ?? t,
    updatedAt: t,
  };
  await dbUpsertCar(car);
  mutateLocal((d) => ({
    ...d,
    cars: existing
      ? d.cars.map((c) => (c.id === car.id ? car : c))
      : [car, ...d.cars],
  }));
}

export async function deleteCar(id: string) {
  await dbDeleteCar(id);
  mutateLocal((d) => ({
    ...d,
    cars: d.cars.filter((c) => c.id !== id),
    bookings: d.bookings.filter((b) => b.carId !== id),
    lineItems: d.lineItems.filter(
      (i) => !d.bookings.some((b) => b.carId === id && b.id === i.bookingId),
    ),
    serviceEvents: d.serviceEvents.filter((e) => e.carId !== id),
    odometerReadings: d.odometerReadings.filter((r) => r.carId !== id),
    fixedCosts: d.fixedCosts.filter((c) => c.carId !== id),
  }));
}

export async function upsertBooking(
  input: Partial<Booking> &
    Pick<Booking, "carId" | "customerName" | "plannedStartAt" | "plannedEndAt">,
) {
  const t = nowIso();
  const existing = input.id ? data.bookings.find((b) => b.id === input.id) : undefined;
  const booking: Booking = {
    id: existing?.id ?? nid(),
    carId: input.carId,
    customerName: input.customerName,
    status: input.status ?? existing?.status ?? "confirmed",
    channel: input.channel ?? existing?.channel ?? "private",
    plannedStartAt: input.plannedStartAt,
    plannedEndAt: input.plannedEndAt,
    pickupTime: input.pickupTime ?? existing?.pickupTime ?? null,
    deliveryTime: input.deliveryTime ?? existing?.deliveryTime ?? null,
    drivenKm:
      input.drivenKm === undefined ? (existing?.drivenKm ?? null) : input.drivenKm,
    notes: input.notes ?? existing?.notes ?? null,
    createdAt: existing?.createdAt ?? t,
    updatedAt: t,
  };
  await dbUpsertBooking(booking);
  mutateLocal((d) => ({
    ...d,
    bookings: existing
      ? d.bookings.map((b) => (b.id === booking.id ? booking : b))
      : [booking, ...d.bookings],
  }));
  return booking.id;
}

export async function deleteBooking(id: string) {
  await dbDeleteBooking(id);
  mutateLocal((d) => ({
    ...d,
    bookings: d.bookings.filter((b) => b.id !== id),
    lineItems: d.lineItems.filter((i) => i.bookingId !== id),
    serviceEvents: d.serviceEvents.map((e) =>
      e.bookingId === id ? { ...e, bookingId: null } : e,
    ),
  }));
}

export async function addLineItem(input: {
  bookingId: string;
  kind: string;
  category: string;
  description?: string;
  amountKr: number;
  vatPercent?: number;
  quantity?: number;
}) {
  const t = nowIso();
  const item: BookingLineItem = {
    id: nid(),
    bookingId: input.bookingId,
    kind: input.kind,
    category: input.category,
    description: input.description ?? "",
    amountOre: krToOre(input.amountKr),
    vatPercent: input.vatPercent ?? 25,
    quantity: input.quantity ?? 1,
    occurredOn: t,
    notes: null,
    createdAt: t,
    updatedAt: t,
  };
  await dbInsertLineItem(item);
  mutateLocal((d) => ({ ...d, lineItems: [item, ...d.lineItems] }));
}

export async function deleteLineItem(id: string) {
  await dbDeleteLineItem(id);
  mutateLocal((d) => ({ ...d, lineItems: d.lineItems.filter((i) => i.id !== id) }));
}

export async function addService(input: {
  carId: string;
  bookingId?: string | null;
  occurredOn: string;
  odometer?: number | null;
  type: string;
  vendor?: string | null;
  amountKr: number;
  vatPercent?: number;
  notes?: string | null;
}) {
  const t = nowIso();
  const event: ServiceEvent = {
    id: nid(),
    carId: input.carId,
    bookingId: input.bookingId ?? null,
    occurredOn: input.occurredOn,
    odometer: input.odometer ?? null,
    type: input.type,
    vendor: input.vendor ?? null,
    amountOre: krToOre(input.amountKr),
    vatPercent: input.vatPercent ?? 25,
    notes: input.notes ?? null,
    createdAt: t,
    updatedAt: t,
  };
  await dbInsertService(event);
  if (input.odometer != null) {
    const car = data.cars.find((c) => c.id === input.carId);
    if (car && input.odometer > car.currentOdometer) {
      const updated = {
        ...car,
        currentOdometer: input.odometer,
        updatedAt: t,
      };
      await dbUpsertCar(updated);
    }
  }
  mutateLocal((d) => {
    const cars = d.cars.map((c) => {
      if (c.id !== input.carId || input.odometer == null) return c;
      return {
        ...c,
        currentOdometer: Math.max(c.currentOdometer, input.odometer),
        updatedAt: t,
      };
    });
    return { ...d, serviceEvents: [event, ...d.serviceEvents], cars };
  });
}

export async function deleteService(id: string) {
  await dbDeleteService(id);
  mutateLocal((d) => ({
    ...d,
    serviceEvents: d.serviceEvents.filter((e) => e.id !== id),
  }));
}

export async function addFixedCost(input: {
  carId: string;
  name: string;
  amountKr: number;
  frequency: string;
  notes?: string | null;
}) {
  const t = nowIso();
  const cost: CarFixedCost = {
    id: nid(),
    carId: input.carId,
    name: input.name,
    amountOre: krToOre(input.amountKr),
    frequency: input.frequency,
    notes: input.notes ?? null,
    createdAt: t,
    updatedAt: t,
  };
  await dbInsertFixedCost(cost);
  mutateLocal((d) => ({ ...d, fixedCosts: [cost, ...d.fixedCosts] }));
}

export async function deleteFixedCost(id: string) {
  await dbDeleteFixedCost(id);
  mutateLocal((d) => ({ ...d, fixedCosts: d.fixedCosts.filter((c) => c.id !== id) }));
}

export async function addCategory(input: {
  kind: string;
  name: string;
  accountCode?: string | null;
}) {
  const cat: LineItemCategory = {
    id: nid(),
    kind: input.kind,
    name: input.name,
    accountCode: input.accountCode ?? null,
    active: true,
    createdAt: nowIso(),
  };
  await dbInsertCategory(cat);
  mutateLocal((d) => ({ ...d, categories: [...d.categories, cat] }));
}

export async function addMarketModel(name: string, variant: string) {
  const t = nowIso();
  const model: MarketModel = {
    id: nid(),
    name,
    variant,
    hidden: false,
    createdAt: t,
    updatedAt: t,
  };
  await dbInsertMarketModel(model);
  mutateLocal((d) => ({ ...d, marketModels: [...d.marketModels, model] }));
}

export async function toggleMarketModelHidden(id: string) {
  const t = nowIso();
  const current = data.marketModels.find((m) => m.id === id);
  if (!current) return;
  const hidden = !current.hidden;
  await dbUpdateMarketModelHidden(id, hidden, t);
  mutateLocal((d) => ({
    ...d,
    marketModels: d.marketModels.map((m) =>
      m.id === id ? { ...m, hidden, updatedAt: t } : m,
    ),
  }));
}

export async function addMarketListing(input: {
  variant: string;
  km: number;
  priceNok: number;
  fuel?: string;
  year?: number | null;
  title?: string;
}) {
  const t = nowIso();
  const listing: MarketListing = {
    id: nid(),
    year: input.year ?? null,
    km: input.km,
    priceNok: input.priceNok,
    fuel: input.fuel ?? "Diesel",
    transmission: null,
    location: null,
    sellerType: null,
    title: input.title ?? null,
    status: "active",
    scrapedDate: t.slice(0, 10),
    wltpKm: null,
    variant: input.variant,
    updatedAt: t,
  };
  await dbInsertMarketListing(listing);
  mutateLocal((d) => ({ ...d, marketListings: [listing, ...d.marketListings] }));
}

const StoreContext = createContext<AppData | null>(null);
const MetaContext = createContext<StoreMeta>({ status: "loading", error: null });

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useSyncExternalStore(subscribe, snapshotData, snapshotData);
  const metaValue = useSyncExternalStore(subscribe, snapshotMeta, snapshotMeta);

  useEffect(() => {
    void reloadFromSupabase().catch(() => {
      /* error already stored in meta */
    });
  }, []);

  return (
    <MetaContext.Provider value={metaValue}>
      <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
    </MetaContext.Provider>
  );
}

export function useAppData(): AppData {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useAppData must be used inside StoreProvider");
  return ctx;
}

export function useStoreMeta(): StoreMeta {
  return useContext(MetaContext);
}

export function useCar(id: string | undefined) {
  const d = useAppData();
  return useMemo(() => d.cars.find((c) => c.id === id) ?? null, [d.cars, id]);
}

export function useBooking(id: string | undefined) {
  const d = useAppData();
  return useMemo(
    () => d.bookings.find((b) => b.id === id) ?? null,
    [d.bookings, id],
  );
}
