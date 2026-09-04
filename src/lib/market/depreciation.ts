import type { CarDepRates } from "@/lib/booking-calc";
import { krToOre, oreToKr } from "@/lib/money";
import type { AppData, MarketListing } from "@/lib/types";
import { fuelGroupFor } from "./fuel";
import { fitModels, modelPriceAt, type FitResult } from "./fit";
import { MARKET_DEP_TARGET_KM } from "./types";

export type FuelGroup = "ICE" | "BEV";

export type MarketDepInput = {
  purchasePriceOre: number | null;
  purchaseOdometer: number;
  fuelType: string | null;
  marketModel: { variant: string } | null;
  marketModelId?: string | null;
  depPerKmOre: number;
  depPerDayOre: number;
};

export type MarketDepBreakdown = {
  source: "market" | "manual";
  rates: CarDepRates;
  fuelGroup: FuelGroup | null;
  residualAtTargetOre: number | null;
  residualAtTargetKm: number;
  kmSpan: number | null;
  lossOre: number | null;
  fitName: string | null;
  error: string | null;
};

export function resolveFuelGroup(fuelType: string | null | undefined): FuelGroup {
  if (fuelType === "ICE" || fuelType === "BEV") return fuelType;
  return fuelGroupFor(fuelType || "Diesel");
}

export function straightLineDepPerKmOre(opts: {
  purchasePriceOre: number;
  purchaseOdometer: number;
  residualAtTargetOre: number;
  targetKm?: number;
}): { depPerKmOre: number; kmSpan: number; lossOre: number } | null {
  const targetKm = opts.targetKm ?? MARKET_DEP_TARGET_KM;
  const kmSpan = targetKm - opts.purchaseOdometer;
  if (kmSpan <= 0) return null;
  const lossOre = Math.max(0, opts.purchasePriceOre - opts.residualAtTargetOre);
  return {
    depPerKmOre: Math.round(lossOre / kmSpan),
    kmSpan,
    lossOre,
  };
}

export function loadMarketFitCache(
  listings: MarketListing[],
): Record<string, FitResult> {
  const byKey = new Map<string, { km: number[]; price: number[] }>();
  for (const row of listings) {
    if (row.status !== "active" || row.km == null || row.priceNok == null) {
      continue;
    }
    const group = fuelGroupFor(row.fuel || "Diesel");
    const key = `${row.variant}|${group}`;
    let bucket = byKey.get(key);
    if (!bucket) {
      bucket = { km: [], price: [] };
      byKey.set(key, bucket);
    }
    bucket.km.push(row.km);
    bucket.price.push(row.priceNok);
  }

  const fits: Record<string, FitResult> = {};
  for (const [key, { km, price }] of byKey) {
    const fit = fitModels(km, price);
    if (fit) fits[key] = fit;
  }
  return fits;
}

export function marketDepFromFit(
  car: {
    purchasePriceOre: number;
    purchaseOdometer: number;
    fuelType: string | null;
  },
  fit: FitResult,
  targetKm = MARKET_DEP_TARGET_KM,
): MarketDepBreakdown {
  const fuelGroup = resolveFuelGroup(car.fuelType);
  const residualNok = modelPriceAt(targetKm, fit);
  const residualAtTargetOre = krToOre(Math.max(0, residualNok));
  const line = straightLineDepPerKmOre({
    purchasePriceOre: car.purchasePriceOre,
    purchaseOdometer: car.purchaseOdometer,
    residualAtTargetOre,
    targetKm,
  });

  if (!line) {
    return {
      source: "manual",
      rates: { depPerKmOre: 0, depPerDayOre: 0 },
      fuelGroup,
      residualAtTargetOre,
      residualAtTargetKm: targetKm,
      kmSpan: null,
      lossOre: null,
      fitName: fit.name,
      error: `Purchase odometer must be below ${targetKm.toLocaleString("nb-NO")} km`,
    };
  }

  return {
    source: "market",
    rates: { depPerKmOre: line.depPerKmOre, depPerDayOre: 0 },
    fuelGroup,
    residualAtTargetOre,
    residualAtTargetKm: targetKm,
    kmSpan: line.kmSpan,
    lossOre: line.lossOre,
    fitName: fit.name,
    error: null,
  };
}

export function resolveCarDep(
  car: MarketDepInput,
  fits: Record<string, FitResult>,
): MarketDepBreakdown {
  const manual: MarketDepBreakdown = {
    source: "manual",
    rates: {
      depPerKmOre: car.depPerKmOre,
      depPerDayOre: car.depPerDayOre,
    },
    fuelGroup: car.fuelType ? resolveFuelGroup(car.fuelType) : null,
    residualAtTargetOre: null,
    residualAtTargetKm: MARKET_DEP_TARGET_KM,
    kmSpan: null,
    lossOre: null,
    fitName: null,
    error: null,
  };

  if (!car.marketModelId || !car.marketModel) return manual;
  if (car.purchasePriceOre == null) {
    return {
      ...manual,
      error: "Purchase price is required for market depreciation",
    };
  }

  const fuelGroup = resolveFuelGroup(car.fuelType);
  const fit = fits[`${car.marketModel.variant}|${fuelGroup}`];
  if (!fit) {
    return {
      ...manual,
      fuelGroup,
      error: `Not enough market listings to fit ${car.marketModel.variant} ${fuelGroup}`,
    };
  }

  return marketDepFromFit(
    {
      purchasePriceOre: car.purchasePriceOre,
      purchaseOdometer: car.purchaseOdometer,
      fuelType: car.fuelType,
    },
    fit,
  );
}

export function effectiveDepRates(
  car: MarketDepInput,
  fits: Record<string, FitResult>,
): CarDepRates {
  return resolveCarDep(car, fits).rates;
}

export function formatDepHint(breakdown: MarketDepBreakdown): string {
  if (breakdown.source !== "market" || breakdown.residualAtTargetOre == null) {
    return "Manual rates";
  }
  const residualKr = oreToKr(breakdown.residualAtTargetOre);
  const lossKr = breakdown.lossOre != null ? oreToKr(breakdown.lossOre) : null;
  const parts = [
    `Market ${breakdown.fuelGroup}`,
    `residual @ ${breakdown.residualAtTargetKm.toLocaleString("nb-NO")} km ≈ ${Math.round(residualKr).toLocaleString("nb-NO")} kr`,
  ];
  if (lossKr != null && breakdown.kmSpan != null) {
    parts.push(
      `write-off ${Math.round(lossKr).toLocaleString("nb-NO")} kr over ${breakdown.kmSpan.toLocaleString("nb-NO")} km`,
    );
  }
  if (breakdown.fitName) parts.push(breakdown.fitName);
  return parts.join(" · ");
}

export function fitsFromData(data: AppData): Record<string, FitResult> {
  return loadMarketFitCache(data.marketListings);
}
