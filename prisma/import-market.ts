/**
 * One-time import of CSV listings/history from the repo root scraper data.
 *
 *   npx tsx prisma/import-market.ts
 */
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ROOT = path.resolve(process.cwd(), "..");

function parseIntOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[\s,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseDate(v: unknown): Date {
  const s = String(v || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T00:00:00.000Z`);
  }
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

async function main() {
  const listingsPath = path.join(ROOT, "proace_listings.csv");
  const historyPath = path.join(ROOT, "proace_price_history.csv");
  if (!fs.existsSync(listingsPath)) {
    throw new Error(`Missing ${listingsPath}`);
  }

  const listingRows = parse(fs.readFileSync(listingsPath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];

  const listingData = listingRows
    .map((row) => {
      const id = row.id?.trim();
      if (!id) return null;
      return {
        id,
        year: parseIntOrNull(row.year),
        km: parseIntOrNull(row.km),
        priceNok: parseIntOrNull(row.price_nok),
        fuel: row.fuel || null,
        transmission: row.transmission || null,
        location: row.location || null,
        sellerType: row.seller_type || null,
        title: row.title || null,
        status: row.status || "active",
        scrapedDate: parseDate(row.scraped_date),
        wltpKm: parseIntOrNull(row.wltp_km),
        variant: row.variant || "",
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  // Upsert in chunks
  const chunk = 50;
  for (let i = 0; i < listingData.length; i += chunk) {
    const slice = listingData.slice(i, i + chunk);
    await Promise.all(
      slice.map((row) =>
        prisma.marketListing.upsert({
          where: { id: row.id },
          create: row,
          update: {
            year: row.year,
            km: row.km,
            priceNok: row.priceNok,
            fuel: row.fuel,
            transmission: row.transmission,
            title: row.title,
            status: row.status,
            wltpKm: row.wltpKm,
            variant: row.variant,
          },
        }),
      ),
    );
  }
  console.log(`Imported ${listingData.length} listings`);

  if (!fs.existsSync(historyPath)) return;

  const histRows = parse(fs.readFileSync(historyPath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];

  const listingIds = new Set(listingData.map((r) => r.id));
  const observations = histRows
    .map((row) => {
      const listingId = row.id?.trim();
      if (!listingId || !listingIds.has(listingId)) return null;
      const price = parseIntOrNull(row.price_nok);
      const prev = parseIntOrNull(row.previous_price_nok);
      return {
        listingId,
        observedDate: parseDate(row.observed_date),
        priceNok: price,
        previousPriceNok: prev,
        deltaNok:
          parseIntOrNull(row.delta_nok) ??
          (price != null && prev != null ? price - prev : null),
        km: parseIntOrNull(row.km),
        status: row.status || null,
        variant: row.variant || null,
        title: row.title || null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null);

  await prisma.marketPriceObservation.deleteMany({});
  for (let i = 0; i < observations.length; i += 100) {
    await prisma.marketPriceObservation.createMany({
      data: observations.slice(i, i + 100),
    });
  }
  console.log(`Imported ${observations.length} price observations`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
