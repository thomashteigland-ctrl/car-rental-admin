import {
  BASE_URL,
  DEFAULT_SEARCH_PARAMS,
  MAX_PAGES,
  REQUEST_DELAY_MS,
  type MarketModelConfig,
  type ParsedListing,
  type SearchParams,
} from "./types";
import { countSearchHits, parseListings } from "./parse";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function buildUrl(searchParams: SearchParams, page: number): string {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(searchParams)) {
    if (Array.isArray(val)) {
      for (const v of val) params.append(key, v);
    } else {
      params.append(key, val);
    }
  }
  if (page > 1) params.append("page", String(page));
  return `${BASE_URL}?${params.toString()}`;
}

export async function fetchPage(
  searchParams: SearchParams,
  page: number,
): Promise<string> {
  const url = buildUrl(searchParams, page);
  const resp = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!resp.ok) {
    throw new Error(`FINN HTTP ${resp.status} for ${url}`);
  }
  return resp.text();
}

export async function resolveRegistrationClass(
  variant: string,
  baseParams: SearchParams,
): Promise<string> {
  const preferred = String(baseParams.registration_class || "2");
  const candidates = [preferred, "2", "1"].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );

  for (const cls of candidates) {
    const params = { ...baseParams, variant, registration_class: cls };
    try {
      const html = await fetchPage(params, 1);
      const hits = countSearchHits(html);
      if (hits == null) {
        if (parseListings(html, variant).length > 0) return cls;
        continue;
      }
      if (hits > 0) return cls;
    } catch {
      continue;
    }
  }
  return preferred;
}

export type ScrapeModelResult = {
  listings: ParsedListing[];
  pages: number;
};

export async function scrapeModel(
  model: MarketModelConfig,
  onProgress?: (message: string) => Promise<void> | void,
): Promise<ScrapeModelResult> {
  const variant = model.variant;
  const label = model.name || variant;
  const params: SearchParams = {
    ...DEFAULT_SEARCH_PARAMS,
    ...(model.params || {}),
    variant,
    sales_form: "1",
    transmission: "2",
  };

  const all: ParsedListing[] = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    await onProgress?.(`${label}: fetching page ${page}…`);
    let html: string;
    try {
      html = await fetchPage(params, page);
    } catch (e) {
      await onProgress?.(
        `${label}: request failed — ${e instanceof Error ? e.message : e}`,
      );
      break;
    }

    const listings = parseListings(html, variant);
    if (listings.length === 0) break;
    all.push(...listings);
    page += 1;
    if (page <= MAX_PAGES) await sleep(REQUEST_DELAY_MS);
  }

  return { listings: all, pages: page - 1 };
}
