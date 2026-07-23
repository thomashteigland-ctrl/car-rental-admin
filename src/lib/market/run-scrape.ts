import type { MarketListing, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapPool, scrapeModel } from "./scrape";
import {
  MODEL_CONCURRENCY,
  type MarketModelConfig,
  type ParsedListing,
  type SearchParams,
} from "./types";

function todayDate(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

async function setJob(status: string, message: string, started = false) {
  const now = new Date();
  await prisma.scrapeJob.upsert({
    where: { id: "current" },
    create: {
      id: "current",
      status,
      message,
      startedAt: started ? now : null,
    },
    update: {
      status,
      message,
      ...(started ? { startedAt: now, finishedAt: null } : {}),
      ...(status === "running" ? {} : { finishedAt: now }),
    },
  });
}

function asSearchParams(raw: Prisma.JsonValue): SearchParams {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: SearchParams = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
    else if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
      out[k] = v as string[];
    }
  }
  return out;
}

function listingFromParsed(fresh: ParsedListing, today: Date): MarketListing {
  return {
    id: fresh.id,
    year: fresh.year,
    km: fresh.km,
    priceNok: fresh.priceNok,
    fuel: fresh.fuel,
    transmission: fresh.transmission,
    location: fresh.location,
    sellerType: fresh.sellerType,
    title: fresh.title,
    status: fresh.status,
    scrapedDate: today,
    wltpKm: fresh.wltpKm,
    variant: fresh.variant,
    updatedAt: new Date(),
  };
}

type ApplyStats = { created: number; updated: number; sold: number };

function isSoldStatus(status: string | null | undefined): boolean {
  return Boolean(status) && status !== "active";
}

/** Apply scraped listings in batches — far fewer DB round-trips than per-row. */
async function applyListingsBatch(
  listings: ParsedListing[],
  byId: Map<string, MarketListing>,
  today: Date,
  opts?: { markMissingSoldForVariant?: string },
): Promise<ApplyStats> {
  const toCreate: Prisma.MarketListingCreateManyInput[] = [];
  const priceObs: Prisma.MarketPriceObservationCreateManyInput[] = [];
  const toDelete: string[] = [];
  const updates: { id: string; data: Prisma.MarketListingUpdateInput }[] = [];

  let created = 0;
  let updated = 0;
  let sold = 0;
  const seenIds = new Set<string>();

  for (const fresh of listings) {
    const existing = byId.get(fresh.id);

    if (fresh.excludeCity) {
      if (existing) {
        toDelete.push(fresh.id);
        byId.delete(fresh.id);
        updated += 1;
      }
      continue;
    }

    seenIds.add(fresh.id);

    if (!existing) {
      toCreate.push({
        id: fresh.id,
        year: fresh.year,
        km: fresh.km,
        priceNok: fresh.priceNok,
        fuel: fresh.fuel,
        transmission: fresh.transmission,
        location: fresh.location,
        sellerType: fresh.sellerType,
        title: fresh.title,
        status: fresh.status,
        scrapedDate: today,
        wltpKm: fresh.wltpKm,
        variant: fresh.variant,
      });
      if (fresh.priceNok != null) {
        priceObs.push({
          listingId: fresh.id,
          observedDate: today,
          priceNok: fresh.priceNok,
          previousPriceNok: null,
          deltaNok: null,
          km: fresh.km,
          status: fresh.status,
          variant: fresh.variant,
          title: fresh.title,
        });
      }
      byId.set(fresh.id, listingFromParsed(fresh, today));
      created += 1;
      continue;
    }

    const oldPrice = existing.priceNok;
    const newPrice = fresh.priceNok;
    const priceChanged = newPrice != null && newPrice !== oldPrice;

    const data: Prisma.MarketListingUpdateInput = {};
    if (fresh.year != null && fresh.year !== existing.year) data.year = fresh.year;
    if (fresh.title != null && fresh.title !== existing.title) data.title = fresh.title;
    if (fresh.fuel && fresh.fuel !== existing.fuel) data.fuel = fresh.fuel;
    if (fresh.transmission !== existing.transmission) {
      data.transmission = fresh.transmission;
    }
    if (fresh.km != null && fresh.km !== existing.km) data.km = fresh.km;
    if (fresh.wltpKm != null && fresh.wltpKm !== existing.wltpKm) {
      data.wltpKm = fresh.wltpKm;
    }
    // Do not resurrect a sold listing unless FINN clearly shows it active again.
    const nextStatus =
      isSoldStatus(existing.status) && fresh.status === "active"
        ? fresh.priceNok != null
          ? "active"
          : existing.status
        : fresh.status;
    if (nextStatus !== existing.status) {
      data.status = nextStatus;
      if (isSoldStatus(nextStatus) && !isSoldStatus(existing.status)) sold += 1;
    }
    if (fresh.variant && fresh.variant !== existing.variant) {
      data.variant = fresh.variant;
    }
    if (priceChanged) data.priceNok = newPrice;

    const changed = Object.keys(data).length > 0;
    if (changed) {
      updates.push({ id: fresh.id, data });
      byId.set(fresh.id, {
        ...existing,
        year: fresh.year ?? existing.year,
        title: fresh.title ?? existing.title,
        fuel: fresh.fuel || existing.fuel,
        transmission:
          fresh.transmission !== existing.transmission
            ? fresh.transmission
            : existing.transmission,
        km: fresh.km ?? existing.km,
        wltpKm: fresh.wltpKm ?? existing.wltpKm,
        status: nextStatus,
        variant: fresh.variant || existing.variant,
        priceNok: priceChanged ? newPrice : existing.priceNok,
      });
      updated += 1;
    }

    if (priceChanged) {
      priceObs.push({
        listingId: fresh.id,
        observedDate: today,
        priceNok: newPrice!,
        previousPriceNok: oldPrice,
        deltaNok: oldPrice == null ? null : newPrice! - oldPrice,
        km: fresh.km ?? existing.km,
        status: nextStatus,
        variant: fresh.variant || existing.variant,
        title: fresh.title || existing.title,
      });
    }
  }

  const missingVariant = opts?.markMissingSoldForVariant;
  if (missingVariant) {
    for (const [id, row] of byId) {
      if (row.variant !== missingVariant) continue;
      if (isSoldStatus(row.status)) continue;
      if (seenIds.has(id)) continue;
      updates.push({ id, data: { status: "sold" } });
      byId.set(id, { ...row, status: "sold" });
      updated += 1;
      sold += 1;
    }
  }

  if (toDelete.length > 0) {
    await prisma.marketListing.deleteMany({ where: { id: { in: toDelete } } });
  }

  if (toCreate.length > 0) {
    await prisma.marketListing.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
  }

  const CHUNK = 40;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const slice = updates.slice(i, i + CHUNK);
    await prisma.$transaction(
      slice.map(({ id, data }) =>
        prisma.marketListing.update({ where: { id }, data }),
      ),
    );
  }

  if (priceObs.length > 0) {
    await prisma.marketPriceObservation.createMany({ data: priceObs });
  }

  return { created, updated, sold };
}

export async function runMarketScrape(): Promise<{
  newCount: number;
  updatedCount: number;
  message: string;
}> {
  const current = await prisma.scrapeJob.findUnique({ where: { id: "current" } });
  if (current?.status === "running") {
    throw new Error("Scrape already running");
  }

  await setJob("running", "Starting scrape…", true);

  try {
    const models = await prisma.marketModel.findMany({
      where: { hidden: false },
      orderBy: { name: "asc" },
    });
    if (models.length === 0) {
      throw new Error(
        "No visible market models. Add a model or unhide one on the Market page.",
      );
    }

    const existing = await prisma.marketListing.findMany();
    const byId = new Map(existing.map((r) => [r.id, r]));
    const today = todayDate();

    let lastProgressAt = 0;
    const progress = async (msg: string) => {
      const now = Date.now();
      if (now - lastProgressAt < 1500) return;
      lastProgressAt = now;
      await setJob("running", msg);
    };

    await progress(
      `Scraping ${models.length} models (${MODEL_CONCURRENCY} at a time)…`,
    );

    const scraped = await mapPool(models, MODEL_CONCURRENCY, async (row) => {
      const model: MarketModelConfig = {
        variant: row.variant,
        name: row.name,
        params: asSearchParams(row.params),
      };
      return scrapeModel(model, progress);
    });

    await setJob("running", "Saving listings…");

    let newCount = 0;
    let updatedCount = 0;
    let soldCount = 0;
    for (const result of scraped) {
      const stats = await applyListingsBatch(result.listings, byId, today, {
        markMissingSoldForVariant: result.complete ? result.variant : undefined,
      });
      newCount += stats.created;
      updatedCount += stats.updated;
      soldCount += stats.sold;
    }

    const message =
      `Done — ${newCount} new, ${updatedCount} updated` +
      (soldCount ? `, ${soldCount} sold` : "");
    await setJob("done", message);
    return { newCount, updatedCount, message };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await setJob("error", message);
    throw e;
  }
}

export async function getScrapeStatus() {
  const job = await prisma.scrapeJob.findUnique({ where: { id: "current" } });
  return {
    status: job?.status ?? "idle",
    message: job?.message ?? "",
    startedAt: job?.startedAt?.toISOString() ?? null,
    finishedAt: job?.finishedAt?.toISOString() ?? null,
  };
}
