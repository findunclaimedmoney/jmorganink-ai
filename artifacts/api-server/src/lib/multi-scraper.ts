import { logger } from "./logger";
import { searchMoneySmart } from "./moneysmart-scraper";

const SCRAPINGBEE_API = "https://app.scrapingbee.com/api/v1/";

export interface SourceMatch {
  name: string;
  amount: string;
  holder: string;
  state: string;
  source: string;
  sourceKey: string;
}

export interface SourceResult {
  sourceKey: string;
  sourceName: string;
  matches: SourceMatch[];
  scraped: boolean;
  error?: string;
}

export interface MultiSourceResults {
  matches: SourceMatch[];
  totalScanned: number;
  sourceResults: SourceResult[];
  namesSearched: string[];
}

async function fetchPage(
  url: string,
  apiKey: string,
  opts: { wait?: number; jsScenario?: object } = {}
): Promise<string> {
  const params = new URLSearchParams({
    api_key: apiKey,
    url,
    render_js: "true",
    premium_proxy: "true",
    block_ads: "true",
    wait: String(opts.wait ?? 3000),
  });
  if (opts.jsScenario) {
    params.set("js_scenario", JSON.stringify(opts.jsScenario));
  }
  const res = await fetch(`${SCRAPINGBEE_API}?${params.toString()}`, {
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text().catch(() => "");
    throw new Error(`ScrapingBee ${res.status}: ${body.slice(0, 300)}`);
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
  const parts = s.split(" ").filter((p) => p.length > 1);
  return parts.length > 0 && parts.every((p) => r.includes(p));
}

function clean(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAmount(text: string): string {
  return text.match(/\$[\d,]+(?:\.\d{2})?/)?.[0] ?? "";
}

function parseHTML(html: string, searchName: string, sourceKey: string, sourceName: string): SourceMatch[] {
  const matches: SourceMatch[] = [];

  // Table rows
  const rowPat = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm: RegExpExecArray | null;
  while ((rm = rowPat.exec(html)) !== null) {
    const cells = [...rm[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => clean(m[1]));
    if (cells.length >= 2 && nameMatches(cells[0] ?? "", searchName)) {
      matches.push({ name: cells[0]!, amount: cells[1] ?? "", holder: cells[2] ?? "", state: cells[3] ?? "", source: sourceName, sourceKey });
    }
  }
  if (matches.length > 0) return matches;

  // Definition lists
  const dlPat = /<dt[^>]*>([\s\S]*?)<\/dt>[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  let dm: RegExpExecArray | null;
  while ((dm = dlPat.exec(html)) !== null) {
    const term = clean(dm[1]);
    const val = clean(dm[2]);
    if (nameMatches(term, searchName)) {
      matches.push({ name: term, amount: extractAmount(val), holder: "", state: "", source: sourceName, sourceKey });
    }
  }
  if (matches.length > 0) return matches;

  // Generic result cards
  const cardPat = /class="[^"]*(?:result|record|item|entry|match)[^"]*"[^>]*>([\s\S]*?)(?=class="[^"]*(?:result|record|item|entry|match)|$)/gi;
  let cm: RegExpExecArray | null;
  while ((cm = cardPat.exec(html)) !== null) {
    const text = clean(cm[1]);
    if (nameMatches(text, searchName)) {
      matches.push({ name: searchName, amount: extractAmount(text), holder: "", state: "", source: sourceName, sourceKey });
    }
  }

  return matches;
}

function noResults(html: string): boolean {
  return /no results found|no records found|no unclaimed money|0 results|nothing found|could not find|no entries|no match/i.test(html);
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  return {
    first: parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0]!,
    last: parts.length > 1 ? parts[parts.length - 1]! : "",
  };
}

/**
 * Builds a ScrapingBee JS scenario that uses `evaluate` (plain JS) to find + fill
 * form fields without depending on ScrapingBee's `fill` instruction format.
 * Dispatches input + change events so React/Angular/Vue frameworks pick up the value.
 */
function buildFillScenario(
  firstName: string,
  lastName: string,
  extraWaitMs = 3000
): object {
  // Escape for single-quoted JS string literal
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const fn = esc(firstName);
  const ln = esc(lastName);

  const surnameSelectors = [
    'input[name="Surname"]', 'input[id="Surname"]',
    'input[name="surname"]', 'input[name="lastName"]',
    'input[name="last_name"]', 'input[name="SURNAME"]',
    'input[placeholder*="surname" i]', 'input[placeholder*="last name" i]',
    'input[id*="urname" i]', 'input[name*="urname" i]',
  ];

  const givenSelectors = [
    'input[name="GivenNames"]', 'input[name="GivenName"]',
    'input[name="FirstName"]', 'input[name="firstName"]',
    'input[name="firstname"]', 'input[name="GIVENNAME"]',
    'input[placeholder*="given" i]', 'input[placeholder*="first name" i]',
    'input[id*="iven" i]', 'input[name*="iven" i]',
    'input[id*="irst" i]',
  ];

  const fillFn = `
(function(){
  function setVal(sel,val){
    try{var el=document.querySelector(sel);if(el){el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;}}catch(e){}return false;
  }
  var surSels=${JSON.stringify(surnameSelectors)};
  var givSels=${JSON.stringify(givenSelectors)};
  for(var i=0;i<surSels.length;i++){if(setVal(surSels[i],'${ln}'))break;}
  for(var j=0;j<givSels.length;j++){if(setVal(givSels[j],'${fn}'))break;}
})()`.trim();

  const submitFn = `
(function(){
  var btn=document.querySelector('input[type="submit"]')||document.querySelector('button[type="submit"]')||document.querySelector('button[class*="search" i]');
  if(btn){btn.click();}
})()`.trim();

  return {
    instructions: [
      { wait: 2000 },
      { evaluate: fillFn },
      { wait: 500 },
      { evaluate: submitFn },
      { wait: extraWaitMs },
    ],
  };
}

function formScraper(sourceKey: string, sourceName: string, baseUrl: string, extraWaitMs = 3000) {
  return async (searchName: string, apiKey: string): Promise<SourceResult> => {
    try {
      const { first, last } = splitName(searchName);
      const jsScenario = buildFillScenario(first, last, extraWaitMs);
      const html = await fetchPage(baseUrl, apiKey, { wait: extraWaitMs + 5000, jsScenario });
      if (noResults(html)) return { sourceKey, sourceName, matches: [], scraped: true };
      return { sourceKey, sourceName, matches: parseHTML(html, searchName, sourceKey, sourceName), scraped: true };
    } catch (err) {
      logger.error({ err, sourceKey }, "Gov scraper failed");
      return { sourceKey, sourceName, matches: [], scraped: false, error: String(err) };
    }
  };
}

const scrapeNSW = formScraper("nsw", "NSW Revenue", "https://unclaimed.revenue.nsw.gov.au/");
const scrapeVIC = formScraper("vic", "VIC SRO", "https://www.sro.vic.gov.au/unclaimedmoneys");
const scrapeQLD = formScraper("qld", "QLD Treasury", "https://www.treasury.qld.gov.au/programs-and-initiatives/unclaimed-money/");
const scrapeWA  = formScraper("wa",  "WA Finance",   "https://www.finance.wa.gov.au/cms/content.aspx?id=2022");
const scrapeSA  = formScraper("sa",  "SA RevenueSA", "https://www.revenuesa.sa.gov.au/grants-and-concessions/unclaimed-money");

async function scrapeComputershare(searchName: string, apiKey: string): Promise<SourceResult> {
  const sourceKey = "computershare";
  const sourceName = "Computershare (share registry)";
  try {
    const { first, last } = splitName(searchName);
    const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

    const fillFn = `
(function(){
  function setVal(sel,val){try{var el=document.querySelector(sel);if(el){el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;}}catch(e){}return false;}
  var surSels=['input[placeholder*="surname" i]','input[placeholder*="last name" i]','input[id*="surname" i]','input[name*="surname" i]'];
  var givSels=['input[placeholder*="first name" i]','input[placeholder*="given" i]','input[id*="firstname" i]','input[name*="firstname" i]'];
  for(var i=0;i<surSels.length;i++){if(setVal(surSels[i],'${esc(last)}'))break;}
  for(var j=0;j<givSels.length;j++){if(setVal(givSels[j],'${esc(first)}'))break;}
  var btn=document.querySelector('button[type="submit"]')||document.querySelector('input[type="submit"]');
  if(btn)btn.click();
})()`.trim();

    const jsScenario = {
      instructions: [
        { wait: 3000 },
        { evaluate: fillFn },
        { wait: 4000 },
      ],
    };
    const html = await fetchPage("https://www-au.computershare.com/Investor/#/FindInvestor", apiKey, { wait: 9000, jsScenario });
    if (noResults(html)) return { sourceKey, sourceName, matches: [], scraped: true };
    return { sourceKey, sourceName, matches: parseHTML(html, searchName, sourceKey, sourceName), scraped: true };
  } catch (err) {
    logger.error({ err, sourceKey }, "Gov scraper failed");
    return { sourceKey, sourceName, matches: [], scraped: false, error: String(err) };
  }
}

async function scrapeAFCA(searchName: string, apiKey: string): Promise<SourceResult> {
  const sourceKey = "afca";
  const sourceName = "AFCA Life Insurance Register";
  try {
    const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

    const fillFn = `
(function(){
  function setVal(sel,val){try{var el=document.querySelector(sel);if(el){el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;}}catch(e){}return false;}
  var sels=['input[type="search"]','input[placeholder*="name" i]','input[id*="search" i]','input[name*="search" i]'];
  for(var i=0;i<sels.length;i++){if(setVal(sels[i],'${esc(searchName)}'))break;}
  var btn=document.querySelector('button[type="submit"]')||document.querySelector('input[type="submit"]')||document.querySelector('button[aria-label*="search" i]');
  if(btn)btn.click();
})()`.trim();

    const jsScenario = {
      instructions: [
        { wait: 2000 },
        { evaluate: fillFn },
        { wait: 3000 },
      ],
    };
    const html = await fetchPage("https://www.afca.org.au/consumers/life-insurance/life-insurance-register", apiKey, { wait: 7000, jsScenario });
    if (noResults(html)) return { sourceKey, sourceName, matches: [], scraped: true };
    return { sourceKey, sourceName, matches: parseHTML(html, searchName, sourceKey, sourceName), scraped: true };
  } catch (err) {
    logger.error({ err, sourceKey }, "Gov scraper failed");
    return { sourceKey, sourceName, matches: [], scraped: false, error: String(err) };
  }
}

export async function searchAllSources(opts: {
  firstName: string;
  lastName: string;
  previousSurnames?: string;
}): Promise<MultiSourceResults> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  if (!apiKey) {
    logger.info("SCRAPINGBEE_API_KEY not set — skipping gov searches");
    return { matches: [], totalScanned: 0, sourceResults: [], namesSearched: [] };
  }

  const namesToSearch: string[] = [`${opts.firstName} ${opts.lastName}`];
  if (opts.previousSurnames) {
    for (const s of opts.previousSurnames.split(/[,;]+/)) {
      const surname = s.trim();
      if (surname) namesToSearch.push(`${opts.firstName} ${surname}`);
    }
  }

  const allMatches: SourceMatch[] = [];
  const allSourceResults: SourceResult[] = [];
  let totalScanned = 0;

  for (const name of namesToSearch) {
    const { first, last } = splitName(name);

    logger.info({ name }, "Starting multi-source search across 8 databases");

    // ScrapingBee allows max 5 concurrent requests — run in two batches
    const batch1 = await Promise.allSettled([
      searchMoneySmart({ firstName: first, lastName: last }).then((r): SourceResult => ({
        sourceKey: "moneysmart",
        sourceName: "MoneySmart (ASIC)",
        scraped: r.scraped,
        matches: r.matches.map((m) => ({ ...m, source: "MoneySmart (ASIC)", sourceKey: "moneysmart" })),
      })),
      scrapeNSW(name, apiKey),
      scrapeVIC(name, apiKey),
      scrapeQLD(name, apiKey),
      scrapeWA(name, apiKey),
    ]);

    const batch2 = await Promise.allSettled([
      scrapeSA(name, apiKey),
      scrapeComputershare(name, apiKey),
      scrapeAFCA(name, apiKey),
    ]);

    for (const r of [...batch1, ...batch2]) {
      if (r.status === "fulfilled") {
        allSourceResults.push(r.value);
        allMatches.push(...r.value.matches);
        totalScanned++;
      } else {
        logger.error({ reason: r.reason }, "Scraper promise rejected unexpectedly");
      }
    }
  }

  const seen = new Set<string>();
  const deduped = allMatches.filter((m) => {
    const key = `${normalise(m.name)}|${m.amount}|${m.sourceKey}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const sourceSummary = allSourceResults.map((r) => `${r.sourceName}:${r.matches.length}`).join(", ");
  logger.info({ total: deduped.length, totalScanned, sourceSummary }, "Multi-source search complete");

  return { matches: deduped, totalScanned, sourceResults: allSourceResults, namesSearched: namesToSearch };
}
