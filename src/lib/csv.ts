import { bookingEconomics } from "./booking-calc";
import { formatDate } from "./dates";
import { fitsFromData } from "./market/depreciation";
import { effectiveDepRates } from "./market/depreciation";
import type { AppData } from "./types";

export function bookingsCsv(data: AppData): string {
  const fits = fitsFromData(data);
  const header = [
    "Start",
    "End",
    "Car",
    "Customer",
    "Status",
    "Channel",
    "Km",
    "RevenueExVat",
    "CostsExVat",
    "CashMargin",
    "Dep",
    "EconomicProfit",
  ];
  const rows = data.bookings.map((b) => {
    const car = data.cars.find((c) => c.id === b.carId);
    const lineItems = data.lineItems.filter((i) => i.bookingId === b.id);
    const serviceOre = data.serviceEvents
      .filter((e) => e.bookingId === b.id)
      .reduce((s, e) => s + e.amountOre, 0);
    const rates = car
      ? effectiveDepRates(
          {
            purchasePriceOre: car.purchasePriceOre,
            purchaseOdometer: car.purchaseOdometer,
            fuelType: car.fuelType,
            marketModelId: car.marketModelId,
            marketModel: car.marketModelId
              ? (data.marketModels.find((m) => m.id === car.marketModelId) ?? null)
              : null,
            depPerKmOre: car.depPerKmOre,
            depPerDayOre: car.depPerDayOre,
          },
          fits,
        )
      : { depPerKmOre: 0, depPerDayOre: 0 };
    const econ = bookingEconomics(
      {
        plannedStartAt: new Date(b.plannedStartAt),
        plannedEndAt: new Date(b.plannedEndAt),
        drivenKm: b.drivenKm,
        lineItems,
      },
      rates,
      serviceOre,
    );
    return [
      formatDate(b.plannedStartAt),
      formatDate(b.plannedEndAt),
      car?.registrationPlate ?? "",
      b.customerName,
      b.status,
      b.channel,
      b.drivenKm ?? "",
      (econ.revenueExVatOre / 100).toFixed(2),
      (econ.costExVatOre / 100).toFixed(2),
      (econ.cashMarginOre / 100).toFixed(2),
      (econ.expectedDepOre / 100).toFixed(2),
      (econ.economicProfitOre / 100).toFixed(2),
    ];
  });
  return [header, ...rows]
    .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
