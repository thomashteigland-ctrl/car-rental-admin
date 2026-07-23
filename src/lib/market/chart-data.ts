import { prisma } from "@/lib/prisma";
import { bestCurve, fitModels, modelPriceAt, type FitResult } from "./fit";
import { fuelGroupFor, wltpBucket } from "./parse";
import type { ChartListing, FitCurve, PriceStats } from "./types";

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return isoDate(new Date());
}

function priceStatsFromHistory(
  rows: { priceNok: number | null; previousPriceNok: number | null }[],
): PriceStats | null {
  const priced = rows.filter((r) => r.priceNok != null);
  if (priced.length === 0) return null;
  const first = priced[0].priceNok;
  const last = priced[priced.length - 1].priceNok;
  const changes = priced.filter(
    (r) =>
      r.previousPriceNok != null &&
      r.priceNok != null &&
      r.priceNok !== r.previousPriceNok,
  );
  const totalDelta =
    first == null || last == null ? null : last - first;
  return {
    firstPrice: first,
    lastPrice: last,
    totalDelta,
    changeCount: changes.length,
    dropped: totalDelta != null && totalDelta < 0,
    raised: totalDelta != null && totalDelta > 0,
  };
}

export async function loadMarketChartData() {
  const [models, listings] = await Promise.all([
    prisma.marketModel.findMany({ orderBy: { name: "asc" } }),
    prisma.marketListing.findMany({
      include: {
        priceHistory: { orderBy: { observedDate: "asc" } },
      },
    }),
  ]);

  const labels = Object.fromEntries(models.map((m) => [m.variant, m.name]));
  const today = todayIso();

  const activeRaw: ChartListing[] = [];
  const soldRaw: {
    listing: ChartListing;
    fuelGroup: "ICE" | "BEV";
    variant: string;
    km: number;
  }[] = [];

  for (const row of listings) {
    if (row.km == null) continue;
    const fuelGroup = fuelGroupFor(row.fuel || "Diesel");
    const stats = priceStatsFromHistory(row.priceHistory);
    const isSold = Boolean(row.status && row.status !== "active");
    const scrapedDate = isoDate(row.scrapedDate);
    const base = {
      id: row.id,
      km: row.km,
      priceNok: row.priceNok,
      title: row.title || "",
      year: row.year,
      status: row.status,
      fuel: row.fuel || "Unknown",
      fuelGroup,
      wltpKm: row.wltpKm,
      wltpBucket: wltpBucket(row.wltpKm),
      variant: row.variant,
      modelName: labels[row.variant] || row.variant || "Unknown",
      scrapedDate,
      isNew: scrapedDate === today && !isSold,
      isSold,
      priceStats: stats,
    };

    if (isSold) {
      soldRaw.push({
        listing: {
          ...base,
          plotPrice: row.priceNok ?? 0,
          priceLabel:
            row.priceNok != null
              ? `${row.priceNok.toLocaleString("nb-NO")} kr`
              : "Sold (no listed price)",
        },
        fuelGroup,
        variant: row.variant,
        km: row.km,
      });
    } else if (row.priceNok != null) {
      activeRaw.push({
        ...base,
        plotPrice: row.priceNok,
        priceLabel: `${row.priceNok.toLocaleString("nb-NO")} kr`,
      });
    }
  }

  const fitsByScope: Record<string, FitResult> = {};
  const scopes: { key: string; rows: ChartListing[] }[] = [
    { key: "all|ICE", rows: activeRaw.filter((r) => r.fuelGroup === "ICE") },
    { key: "all|BEV", rows: activeRaw.filter((r) => r.fuelGroup === "BEV") },
  ];
  for (const m of models) {
    scopes.push({
      key: `${m.variant}|ICE`,
      rows: activeRaw.filter(
        (r) => r.variant === m.variant && r.fuelGroup === "ICE",
      ),
    });
    scopes.push({
      key: `${m.variant}|BEV`,
      rows: activeRaw.filter(
        (r) => r.variant === m.variant && r.fuelGroup === "BEV",
      ),
    });
  }

  for (const scope of scopes) {
    const fit = fitModels(
      scope.rows.map((r) => r.km),
      scope.rows.map((r) => r.priceNok!),
    );
    if (fit) fitsByScope[scope.key] = fit;
  }

  const sold: ChartListing[] = [];
  for (const s of soldRaw) {
    if (s.listing.priceNok != null) {
      sold.push(s.listing);
      continue;
    }
    const fit =
      fitsByScope[`${s.variant}|${s.fuelGroup}`] ||
      fitsByScope[`all|${s.fuelGroup}`];
    if (!fit) continue;
    sold.push({
      ...s.listing,
      plotPrice: modelPriceAt(s.km, fit),
      priceLabel: "Sold (no listed price)",
    });
  }

  const fitCurves: Record<string, FitCurve> = {};
  for (const [key, fit] of Object.entries(fitsByScope)) {
    fitCurves[key] = bestCurve(fit);
  }

  const years = [
    ...new Set(
      [...activeRaw, ...sold]
        .map((r) => r.year)
        .filter((y): y is number => y != null),
    ),
  ].sort((a, b) => b - a);

  return {
    models: [
      { id: "all", name: "All models" },
      ...models.map((m) => ({ id: m.variant, name: m.name })),
    ],
    active: activeRaw,
    sold,
    fitCurves,
    years,
  };
}

export type MarketChartPayload = Awaited<ReturnType<typeof loadMarketChartData>>;
