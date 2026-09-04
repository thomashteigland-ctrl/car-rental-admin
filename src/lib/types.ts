export type Car = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  registrationPlate: string;
  vin: string | null;
  status: string;
  category: string | null;
  fuelType: string | null;
  marketModelId: string | null;
  purchasePriceOre: number | null;
  purchaseDate: string | null;
  purchaseOdometer: number;
  currentOdometer: number;
  location: string | null;
  insuranceNote: string | null;
  nextInspectionDue: string | null;
  depPerKmOre: number;
  depPerDayOre: number;
  serviceIntervalKm: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CarFixedCost = {
  id: string;
  carId: string;
  name: string;
  amountOre: number;
  frequency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OdometerReading = {
  id: string;
  carId: string;
  odometerKm: number;
  recordedAt: string;
  notes: string | null;
  createdAt: string;
};

export type Booking = {
  id: string;
  carId: string;
  customerName: string;
  status: string;
  channel: string;
  plannedStartAt: string;
  plannedEndAt: string;
  pickupTime: string | null;
  deliveryTime: string | null;
  drivenKm: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BookingLineItem = {
  id: string;
  bookingId: string;
  kind: string;
  category: string;
  description: string;
  amountOre: number;
  vatPercent: number;
  quantity: number;
  occurredOn: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceEvent = {
  id: string;
  carId: string;
  bookingId: string | null;
  occurredOn: string;
  odometer: number | null;
  type: string;
  vendor: string | null;
  amountOre: number;
  vatPercent: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LineItemCategory = {
  id: string;
  kind: string;
  name: string;
  accountCode: string | null;
  active: boolean;
  createdAt: string;
};

export type MarketModel = {
  id: string;
  variant: string;
  name: string;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MarketListing = {
  id: string;
  year: number | null;
  km: number | null;
  priceNok: number | null;
  fuel: string | null;
  transmission: string | null;
  location: string | null;
  sellerType: string | null;
  title: string | null;
  status: string;
  scrapedDate: string;
  wltpKm: number | null;
  variant: string;
  updatedAt: string;
};

export type AppData = {
  cars: Car[];
  bookings: Booking[];
  lineItems: BookingLineItem[];
  serviceEvents: ServiceEvent[];
  odometerReadings: OdometerReading[];
  fixedCosts: CarFixedCost[];
  categories: LineItemCategory[];
  marketModels: MarketModel[];
  marketListings: MarketListing[];
  settings: Record<string, string>;
};
