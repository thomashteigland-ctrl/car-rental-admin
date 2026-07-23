import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";
import { fetchPage, resolveRegistrationClass } from "./scrape";
import { DEFAULT_SEARCH_PARAMS, type SearchParams } from "./types";

const VARIANT_RE = /^\d+(?:\.\d+)+$/;

/** Accept a FINN variant id or a search URL containing ?variant=. */
export function extractVariantFromInput(raw: string): string {
  const trimmed = raw.trim();
  if (VARIANT_RE.test(trimmed)) return trimmed;
  if (trimmed.includes("variant=") || trimmed.includes("finn.no")) {
    try {
      const url = new URL(trimmed);
      const variant = url.searchParams.get("variant");
      if (variant && VARIANT_RE.test(variant)) return variant;
    } catch {
      // fall through
    }
    const m = trimmed.match(/[?&]variant=([^&\s]+)/i);
    if (m?.[1] && VARIANT_RE.test(decodeURIComponent(m[1]))) {
      return decodeURIComponent(m[1]);
    }
  }
  throw new Error(
    "Enter a FINN variant ID (e.g. 2.813.2825.2000267) or a search URL with ?variant=",
  );
}

export async function guessModelName(
  variant: string,
  params: SearchParams,
): Promise<string> {
  try {
    const html = await fetchPage(params, 1);
    const $ = cheerio.load(html);
    const h1 = $("h1").first().text().replace(/\s+/g, " ").trim();
    const name = h1.replace(/\s+biler på FINN.*$/i, "").trim();
    if (name) return name;
  } catch {
    // fall through
  }
  return `Variant ${variant}`;
}

export type UpsertMarketModelResult = {
  id: string;
  variant: string;
  name: string;
  created: boolean;
};

/** Resolve registration class, upsert MarketModel for scraping. */
export async function upsertMarketModelFromInput(opts: {
  rawVariant: string;
  name?: string | null;
}): Promise<UpsertMarketModelResult> {
  const variant = extractVariantFromInput(opts.rawVariant);
  const params: SearchParams = {
    ...DEFAULT_SEARCH_PARAMS,
    variant,
    sales_form: "1",
    transmission: "2",
  };
  const registrationClass = await resolveRegistrationClass(variant, params);
  params.registration_class = registrationClass;

  const name =
    opts.name?.trim() || (await guessModelName(variant, params));

  const existing = await prisma.marketModel.findUnique({
    where: { variant },
  });

  if (existing) {
    const updated = await prisma.marketModel.update({
      where: { id: existing.id },
      data: {
        name: opts.name?.trim() || existing.name,
        params,
        // Re-adding a variant unhides it so it is scraped again.
        hidden: false,
      },
    });
    return {
      id: updated.id,
      variant: updated.variant,
      name: updated.name,
      created: false,
    };
  }

  const created = await prisma.marketModel.create({
    data: { variant, name, params },
  });
  return {
    id: created.id,
    variant: created.variant,
    name: created.name,
    created: true,
  };
}
