import { krToOre, oreToKr } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import type { CarDepRates } from "@/lib/booking-calc";
import { fitModels, modelPriceAt, type FitResult } from "./fit";
import { fuelGroupFor } from "./parse";

/** Straight-line residual horizon used for market-linked depreciation. */
export const MARKET_DEP_TARGET_KM = 200_000;

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

/** Straight-line øre/km from purchase price @ purchase odo → residual @ target km. */
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

export async function fitVariantFuel(
  variant: string,
  fuelGroup: FuelGroup,
): Promise<FitResult | null> {
  const listings = await prisma.marketListing.findMany({
    where: {
      variant,
      status: "active",
      km: { not: null },
      priceNok: { not: null },
    },
    select: { km: true, priceNok: true, fuel: true },
  });
  const rows = listings.filter(
    (r) => fuelGroupFor(r.fuel || "Diesel") === fuelGroup,
  );
  return fitModels(
    rows.map((r) => r.km!),
    rows.map((r) => r.priceNok!),
  );
}

type FitCacheEntry = { at: number; fits: Record<string, FitResult> };

const FIT_CACHE_TTL_MS = 60_000;
const globalFitCache = globalThis as unknown as {
  __marketFitCache?: FitCacheEntry;
  __marketFitInflight?: Promise<Record<string, FitResult>>;
};

/** Drop cached curve fits (call after a market scrape). */
export function invalidateMarketFitCache(): void {
  globalFitCache.__marketFitCache = undefined;
  globalFitCache.__marketFitInflight = undefined;
}

/**
 * Fit cache keyed by `${variant}|${ICE|BEV}`.
 * Results are memoized for 60s (and de-duped while a load is in flight) so
 * dashboard / reports / fleet pages don't each re-query + refit every request.
 * `variants` is kept for call-site compatibility; the full active set is cached.
 */
export async function loadMarketFitCache(
  _variants?: string[],
): Promise<Record<string, FitResult>> {
  const cached = globalFitCache.__marketFitCache;
  if (cached && Date.now() - cached.at < FIT_CACHE_TTL_MS) {
    return cached.fits;
  }
  if (globalFitCache.__marketFitInflight) {
    return globalFitCache.__marketFitInflight;
  }

  globalFitCache.__marketFitInflight = (async () => {
    const listings = await prisma.marketListing.findMany({
      where: {
        status: "active",
        km: { not: null },
        priceNok: { not: null },
      },
      select: { km: true, priceNok: true, fuel: true, variant: true },
    });

    const byKey = new Map<string, { km: number[]; price: number[] }>();
    for (const row of listings) {
      const group = fuelGroupFor(row.fuel || "Diesel");
      const key = `${row.variant}|${group}`;
      let bucket = byKey.get(key);
      if (!bucket) {
        bucket = { km: [], price: [] };
        byKey.set(key, bucket);
      }
      bucket.km.push(row.km!);
      bucket.price.push(row.priceNok!);
    }

    const fits: Record<string, FitResult> = {};
    for (const [key, { km, price }] of byKey) {
      const fit = fitModels(km, price);
      if (fit) fits[key] = fit;
    }
    globalFitCache.__marketFitCache = { at: Date.now(), fits };
    return fits;
  })();

  try {
    return await globalFitCache.__marketFitInflight;
  } finally {
    globalFitCache.__marketFitInflight = undefined;
  }
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

export async function resolveCarDepLive(
  car: MarketDepInput,
): Promise<MarketDepBreakdown> {
  if (!car.marketModelId || !car.marketModel || car.purchasePriceOre == null) {
    return resolveCarDep(car, {});
  }
  const fuelGroup = resolveFuelGroup(car.fuelType);
  const fit = await fitVariantFuel(car.marketModel.variant, fuelGroup);
  if (!fit) {
    return {
      source: "manual",
      rates: {
        depPerKmOre: car.depPerKmOre,
        depPerDayOre: car.depPerDayOre,
      },
      fuelGroup,
      residualAtTargetOre: null,
      residualAtTargetKm: MARKET_DEP_TARGET_KM,
      kmSpan: null,
      lossOre: null,
      fitName: null,
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

/** Effective rates for economics: market straight-line when linked, else manual. */
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
  const lossKr =
    breakdown.lossOre != null ? oreToKr(breakdown.lossOre) : null;
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
