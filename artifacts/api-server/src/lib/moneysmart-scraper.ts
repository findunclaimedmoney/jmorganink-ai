import { logger } from "./logger";

const SCRAPINGBEE_API = "https://app.scrapingbee.com/api/v1/";
const MAX_PAGES = 25;

export interface MoneySmartMatch {
  name: string;
  amount: string;
  holder: string;
  state: string;
}

interface ScrapeOptions {
  firstName: string;
  lastName: string;
  previousSurnames?: string;
}

export interface MoneySmartResults {
  matches: MoneySmartMatch[];
  totalScanned: number;
  namesSearched: string[];
  scraped: boolean;
}

async function fetchViaScrapingBee(targetUrl: string, apiKey: string): Promise<string> {
  const params = new URLSearchParams({
    api_key: apiKey,
    url: targetUrl,
    render_js: "true",
    premium_proxy: "true",
    block_ads: "true",
    wait: "3000",
  });

  const res = await fetch(`${SCRAPINGBEE_API}?${params.toString()}`, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok && res.status !== 404) {
    const body = await res.text().catch(() => "");
    throw new Error(`ScrapingBee ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.text();
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function nameMatches(resultName: string, searchName: string): boolean {
  const r = normalise(resultName);
  const s = normalise(searchName);
  if (r === s) return true;
  const parts = s.split(" ");
  return parts.every((p) => r.includes(p));
}

function parseResults(html: string, searchName: string): MoneySmartMatch[] {
  const matches: MoneySmartMatch[] = [];

  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const row = rowMatch[1];
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim()
    );

    if (cells.length >= 2 && nameMatches(cells[0] ?? "", searchName)) {
      matches.push({
        name: cells[0] ?? "",
        amount: cells[1] ?? "",
        holder: cells[2] ?? "",
        state: cells[3] ?? "",
      });
    }
  }

  if (matches.length === 0) {
    const cardPattern = /class="[^"]*(?:result|record|item|row|entry)[^"]*"[^>]*>([\s\S]*?)(?=class="[^"]*(?:result|record|item|row|entry)|$)/gi;
    let cardMatch: RegExpExecArray | null;
    while ((cardMatch = cardPattern.exec(html)) !== null) {
      const card = cardMatch[1];
      const text = card.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (nameMatches(text, searchName)) {
        const amountMatch = text.match(/\$[\d,]+(?:\.\d{2})?/);
        matches.push({
          name: searchName,
          amount: amountMatch?.[0] ?? "Amount on file",
          holder: "",
          state: "",
        });
      }
    }
  }

  return matches;
}

function hasNextPage(html: string, currentPage: number): boolean {
  const nextPatterns = [
    /rel=["']next["']/i,
    /class="[^"]*next[^"]*"/i,
    /aria-label=["']next/i,
    new RegExp(`page=${currentPage + 1}`, "i"),
    />\s*Next\s*</i,
  ];
  return nextPatterns.some((p) => p.test(html));
}

function buildSearchUrl(name: string, page: number): string {
  const encoded = encodeURIComponent(name);
  if (page === 1) {
    return `https://moneysmart.gov.au/unclaimed-money?search=${encoded}`;
  }
  return `https://moneysmart.gov.au/unclaimed-money?search=${encoded}&page=${page}`;
}

async function scrapeForName(
  name: string,
  apiKey: string
): Promise<{ matches: MoneySmartMatch[]; pagesScanned: number }> {
  const allMatches: MoneySmartMatch[] = [];
  let pagesScanned = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = buildSearchUrl(name, page);
    logger.info({ url, page }, "ScrapingBee fetching MoneySmart page");

    let html: string;
    try {
      html = await fetchViaScrapingBee(url, apiKey);
    } catch (err) {
      logger.error({ err, page, name }, "ScrapingBee fetch failed");
      break;
    }

    pagesScanned++;
    const pageMatches = parseResults(html, name);
    allMatches.push(...pageMatches);

    const noResults =
      /no results found|no records found|no unclaimed money/i.test(html) ||
      /0 results/i.test(html);

    if (noResults || (!hasNextPage(html, page) && page > 1)) {
      break;
    }

    if (page === 1 && !hasNextPage(html, page)) {
      break;
    }

    await new Promise((r) => setTimeout(r, 800));
  }

  return { matches: allMatches, pagesScanned };
}

export async function searchMoneySmart(opts: ScrapeOptions): Promise<MoneySmartResults> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;

  if (!apiKey) {
    logger.info("SCRAPINGBEE_API_KEY not set — skipping live MoneySmart search");
    return { matches: [], totalScanned: 0, namesSearched: [], scraped: false };
  }

  const namesToSearch: string[] = [`${opts.firstName} ${opts.lastName}`];

  if (opts.previousSurnames) {
    for (const surname of opts.previousSurnames.split(/[,;]+/)) {
      const s = surname.trim();
      if (s) namesToSearch.push(`${opts.firstName} ${s}`);
    }
  }

  const allMatches: MoneySmartMatch[] = [];
  let totalScanned = 0;

  for (const name of namesToSearch) {
    try {
      const { matches, pagesScanned } = await scrapeForName(name, apiKey);
      allMatches.push(...matches);
      totalScanned += pagesScanned;
      logger.info({ name, matchCount: matches.length, pagesScanned }, "MoneySmart scrape complete for name");
    } catch (err) {
      logger.error({ err, name }, "MoneySmart scrape failed for name — continuing");
    }
  }

  const seen = new Set<string>();
  const deduped = allMatches.filter((m) => {
    const key = `${normalise(m.name)}|${m.amount}|${m.holder}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  logger.info({ totalMatches: deduped.length, totalPages: totalScanned }, "MoneySmart full search complete");

  return {
    matches: deduped,
    totalScanned,
    namesSearched: namesToSearch,
    scraped: true,
  };
}
