import type { MarketListing, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { scrapeModel } from "./scrape";
import type { MarketModelConfig, ParsedListing, SearchParams } from "./types";

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
      finishedAt: status === "running" ? null : now,
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

async function applyListing(
  fresh: ParsedListing,
  existing: MarketListing | undefined,
  today: Date,
): Promise<{ created: boolean; updated: boolean; priceEvent: boolean }> {
  if (fresh.excludeCity) {
    if (existing) {
      await prisma.marketListing.delete({ where: { id: fresh.id } });
      return { created: false, updated: true, priceEvent: false };
    }
    return { created: false, updated: false, priceEvent: false };
  }

  if (!existing) {
    await prisma.marketListing.create({
      data: {
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
      },
    });
    if (fresh.priceNok != null) {
      await prisma.marketPriceObservation.create({
        data: {
          listingId: fresh.id,
          observedDate: today,
          priceNok: fresh.priceNok,
          previousPriceNok: null,
          deltaNok: null,
          km: fresh.km,
          status: fresh.status,
          variant: fresh.variant,
          title: fresh.title,
        },
      });
    }
    return { created: true, updated: false, priceEvent: true };
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
  if (fresh.status !== existing.status) data.status = fresh.status;
  if (fresh.variant && fresh.variant !== existing.variant) {
    data.variant = fresh.variant;
  }
  if (priceChanged) data.priceNok = newPrice;

  const changed = Object.keys(data).length > 0;
  if (changed) {
    await prisma.marketListing.update({ where: { id: fresh.id }, data });
  }

  if (priceChanged) {
    await prisma.marketPriceObservation.create({
      data: {
        listingId: fresh.id,
        observedDate: today,
        priceNok: newPrice,
        previousPriceNok: oldPrice,
        deltaNok: oldPrice == null ? null : newPrice! - oldPrice,
        km: fresh.km ?? existing.km,
        status: fresh.status,
        variant: fresh.variant || existing.variant,
        title: fresh.title || existing.title,
      },
    });
  }

  return { created: false, updated: changed, priceEvent: priceChanged };
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
    const models = await prisma.marketModel.findMany({ orderBy: { name: "asc" } });
    if (models.length === 0) {
      throw new Error("No market models configured. Run db:seed / import.");
    }

    const existing = await prisma.marketListing.findMany();
    const byId = new Map(existing.map((r) => [r.id, r]));
    const today = todayDate();

    let newCount = 0;
    let updatedCount = 0;

    for (const row of models) {
      const model: MarketModelConfig = {
        variant: row.variant,
        name: row.name,
        params: asSearchParams(row.params),
      };

      const { listings } = await scrapeModel(model, async (msg) => {
        await setJob("running", msg);
      });

      for (const listing of listings) {
        const prev = byId.get(listing.id);
        const result = await applyListing(listing, prev, today);
        if (result.created) {
          newCount += 1;
          const created = await prisma.marketListing.findUnique({
            where: { id: listing.id },
          });
          if (created) byId.set(listing.id, created);
        } else if (result.updated) {
          updatedCount += 1;
          if (listing.excludeCity) byId.delete(listing.id);
          else {
            const updated = await prisma.marketListing.findUnique({
              where: { id: listing.id },
            });
            if (updated) byId.set(listing.id, updated);
          }
        }
      }
    }

    const message = `Done — ${newCount} new, ${updatedCount} updated`;
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
