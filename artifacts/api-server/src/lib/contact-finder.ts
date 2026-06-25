import { logger } from "./logger";

const SCRAPINGBEE_API = "https://app.scrapingbee.com/api/v1/";

export interface FoundContact {
  phone?: string;
  email?: string;
  address?: string;
  source: string;
}

// ---------- helpers ----------

function extractPhones(text: string): string[] {
  const raw = text.match(/(?:\+?61|0)[\s.-]?[2-9][\d\s.-]{7,9}/g) ?? [];
  return [...new Set(raw.map((p) => p.replace(/[\s.-]/g, "").replace(/^61/, "0")))].filter(
    (p) => /^0[2-9]\d{8}$/.test(p)
  );
}

function extractEmails(text: string): string[] {
  const raw = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [];
  const blocked = ["example.com", "gmail.com" /* too generic */, "sentry.io", "w3.org"];
  return [...new Set(raw)].filter(
    (e) => !blocked.some((b) => e.endsWith(b)) && e.length < 80
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function isCompanyName(name: string): boolean {
  const upper = name.toUpperCase();
  const tokens = [
    "PTY", "LTD", "TRUST", "FUND", "SUPER", "SUPERANNUATION",
    "FOUNDATION", "ASSOCIATION", "INCORPORATED", "INC", "GROUP",
    "HOLDINGS", "INVESTMENTS", "SERVICES", "ENTERPRISES",
    "& CO", "AND CO", "FAMILY", "ESTATE OF", "ESTATE",
  ];
  return tokens.some((t) => upper.includes(t));
}

export function parseName(raw: string): { firstName: string; lastName: string } | null {
  if (isCompanyName(raw)) return null;
  const cleaned = raw.replace(/[^a-zA-Z\s,'-]/g, " ").trim();
  // "SMITH, JOHN DAVID" → lastName=SMITH firstName=JOHN
  if (cleaned.includes(",")) {
    const [last, ...rest] = cleaned.split(",").map((s) => s.trim());
    const first = rest.join(" ").split(" ")[0] ?? "";
    if (!first || !last) return null;
    return { firstName: first, lastName: last };
  }
  const parts = cleaned.split(/\s+/);
  if (parts.length < 2) return null;
  // first part = firstName, last part = lastName (ignore middle names)
  return { firstName: parts[0]!, lastName: parts[parts.length - 1]! };
}

// ---------- ScrapingBee fetch ----------

async function sbFetch(url: string, apiKey: string, renderJs = false): Promise<string> {
  const params = new URLSearchParams({
    api_key: apiKey,
    url,
    render_js: renderJs ? "true" : "false",
    premium_proxy: "true",
    block_ads: "true",
    country_code: "au",
    ...(renderJs ? { wait: "2000" } : {}),
  });
  const res = await fetch(`${SCRAPINGBEE_API}?${params.toString()}`, {
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`ScrapingBee ${res.status}`);
  return res.text();
}

// ---------- source 1: Google search ----------

async function searchGoogle(name: string, state: string | null, apiKey: string): Promise<FoundContact | null> {
  const location = state ?? "Australia";
  const query = encodeURIComponent(`"${name}" ${location} contact phone email`);
  const url = `https://www.google.com.au/search?q=${query}&num=5&hl=en&gl=au`;

  try {
    const html = await sbFetch(url, apiKey, true);
    const text = stripHtml(html);

    const phones = extractPhones(text);
    const emails = extractEmails(text);

    if (phones.length === 0 && emails.length === 0) return null;

    return {
      phone: phones[0],
      email: emails[0],
      source: "Google Search",
    };
  } catch (err) {
    logger.warn({ err, name }, "contact-finder: Google search failed");
    return null;
  }
}

// ---------- source 2: ABN lookup ----------

async function searchABN(name: string, apiKey: string): Promise<FoundContact | null> {
  const query = encodeURIComponent(name);
  const url = `https://abr.business.gov.au/Search/ResultsActive?SearchText=${query}&IsCurrentIndicator=Y`;

  try {
    const html = await sbFetch(url, apiKey, false);
    const text = stripHtml(html);

    // ABN results give us name + address only — no phone/email — but confirms person is real + gives suburb
    const addrMatch = text.match(/([A-Z][a-z]+(?: [A-Z][a-z]+)*)\s+(?:NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s+\d{4}/);
    if (addrMatch) {
      return { address: addrMatch[0], source: "ABN Lookup" };
    }
    return null;
  } catch (err) {
    logger.warn({ err, name }, "contact-finder: ABN search failed");
    return null;
  }
}

// ---------- source 3: Yellow Pages ----------

async function searchYellowPages(firstName: string, lastName: string, state: string | null, apiKey: string): Promise<FoundContact | null> {
  const query = encodeURIComponent(`${firstName} ${lastName}`);
  const loc = encodeURIComponent(state ?? "Australia");
  const url = `https://www.yellowpages.com.au/search/listings?clue=${query}&locationClue=${loc}&type=people`;

  try {
    const html = await sbFetch(url, apiKey, true);
    const text = stripHtml(html);

    const phones = extractPhones(text);
    const addrMatch = text.match(/([A-Z][a-z]+(?: [A-Z][a-z]+)*)\s+(?:NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s+\d{4}/);

    if (phones.length === 0 && !addrMatch) return null;

    return {
      phone: phones[0],
      address: addrMatch?.[0],
      source: "Yellow Pages",
    };
  } catch (err) {
    logger.warn({ err, firstName, lastName }, "contact-finder: Yellow Pages search failed");
    return null;
  }
}

// ---------- main export ----------

export async function findContact(
  name: string,
  state: string | null
): Promise<FoundContact | null> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  if (!apiKey) {
    logger.warn("contact-finder: no SCRAPINGBEE_API_KEY");
    return null;
  }

  const parsed = parseName(name);
  if (!parsed) {
    logger.info({ name }, "contact-finder: skipping — looks like a company");
    return null;
  }

  const { firstName, lastName } = parsed;

  // Try sources in order, return first hit
  const google = await searchGoogle(`${firstName} ${lastName}`, state, apiKey);
  if (google?.phone || google?.email) {
    logger.info({ name, phone: google.phone, email: google.email, source: google.source }, "contact-finder: hit");
    return google;
  }

  await new Promise((r) => setTimeout(r, 500));

  const yp = await searchYellowPages(firstName, lastName, state, apiKey);
  if (yp?.phone) {
    logger.info({ name, phone: yp.phone, source: yp.source }, "contact-finder: hit");
    return yp;
  }

  await new Promise((r) => setTimeout(r, 500));

  const abn = await searchABN(`${firstName} ${lastName}`, apiKey);
  if (abn?.address) {
    logger.info({ name, address: abn.address, source: abn.source }, "contact-finder: address hit");
    return abn;
  }

  logger.info({ name }, "contact-finder: no contact found");
  return null;
}
