import { db } from "@workspace/db";
import { prospectsTable, alphabetCrawlProgressTable, unsubscribesTable } from "@workspace/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import { Resend } from "resend";
import Stripe from "stripe";
import { logger } from "./logger";
import { findContact, parseName } from "./contact-finder";

const SCRAPINGBEE_API = "https://app.scrapingbee.com/api/v1/";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-AU,en;q=0.9",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
};
const MAX_PAGES = 60;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Max prospects to contact-search per letter (credit guard)
const MAX_CONTACTS_PER_LETTER = parseInt(process.env.MAX_CONTACTS_PER_LETTER ?? "300", 10);

const FROM_ADDRESS =
  process.env.MISSINGCASH_DOMAIN_VERIFIED === "true"
    ? "MissingCash <leads@missingcash.com.au>"
    : "MissingCash <leads@lensflow.com.au>";

// ---------- scraping helpers ----------

function hasTableData(html: string): boolean {
  return /<td/i.test(html) || /no results found|no records found|0 results/i.test(html);
}

async function fetchDirect(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return hasTableData(html) ? html : null;
  } catch {
    return null;
  }
}

async function fetchViaScrapingBee(url: string, apiKey: string, renderJs: boolean): Promise<string | null> {
  const params = new URLSearchParams({
    api_key: apiKey,
    url,
    render_js: renderJs ? "true" : "false",
    block_ads: "true",
    country_code: "au",
    ...(renderJs ? { wait_browser: "networkidle2", timeout: "15000" } : {}),
  });

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${SCRAPINGBEE_API}?${params.toString()}`, {
        signal: AbortSignal.timeout(90_000),
      });
      if (res.status === 404) return res.text();
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`ScrapingBee ${res.status}${errBody ? `: ${errBody.slice(0, 120)}` : ""}`);
      }
      return res.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ url, attempt, renderJs, err: msg }, "alphabet-scraper: ScrapingBee attempt failed");
      if (attempt < 3) await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
  return null;
}

async function fetchPage(url: string, apiKey: string): Promise<string> {
  // Tier 1: free direct fetch (works if the page does SSR)
  const direct = await fetchDirect(url);
  if (direct) {
    logger.info({ url }, "alphabet-scraper: fetched direct (no ScrapingBee)");
    return direct;
  }

  // Tier 2: ScrapingBee without JS rendering (faster, cheaper, fewer 500s)
  const noJs = await fetchViaScrapingBee(url, apiKey, false);
  if (noJs && hasTableData(noJs)) {
    logger.info({ url }, "alphabet-scraper: fetched via ScrapingBee (no JS)");
    return noJs;
  }

  // Tier 3: ScrapingBee with full JS rendering (most expensive, last resort)
  logger.info({ url }, "alphabet-scraper: falling back to ScrapingBee with JS rendering");
  const withJs = await fetchViaScrapingBee(url, apiKey, true);
  if (withJs) return withJs;

  throw new Error(`All fetch tiers failed for ${url}`);
}

interface RawMatch {
  name: string;
  amount: string;
  holder: string;
  state: string;
}

function parseMoneySmartRows(html: string): RawMatch[] {
  const matches: RawMatch[] = [];
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const row = rowMatch[1];
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim()
    );
    if (cells.length >= 2 && cells[0] && cells[0].trim().length > 2) {
      const amtMatch = (cells[1] ?? "").match(/\$[\d,]+(?:\.\d{2})?/);
      if (amtMatch) {
        matches.push({
          name: cells[0].trim(),
          amount: amtMatch[0],
          holder: cells[2] ?? "",
          state: cells[3] ?? "",
        });
      }
    }
  }
  return matches;
}

function hasNextPage(html: string, page: number): boolean {
  return (
    /rel=["']next["']/i.test(html) ||
    /class="[^"]*next[^"]*"/i.test(html) ||
    />\s*Next\s*</i.test(html) ||
    new RegExp(`page=${page + 1}`, "i").test(html)
  );
}

// ---------- top Australian surnames per letter ----------
// Searching by surname avoids MoneySmart's bot detection (single-letter searches get blocked)

const SURNAMES_BY_LETTER: Record<string, string[]> = {
  A: ["Anderson", "Adams", "Allen", "Armstrong", "Andrews", "Alexander", "Abbott", "Ahmed", "Ali", "Atkinson"],
  B: ["Brown", "Baker", "Bell", "Bennett", "Bailey", "Barnes", "Bishop", "Black", "Boyd", "Burns", "Butler"],
  C: ["Campbell", "Carter", "Clark", "Clarke", "Collins", "Cook", "Cooper", "Cox", "Crawford", "Curtis"],
  D: ["Davis", "Davies", "Dixon", "Duncan", "Davidson", "Dean", "Doyle", "Douglas", "Drew", "Dunn"],
  E: ["Evans", "Edwards", "Elliott", "Ellis", "Eriksson", "Egan", "Eaton", "Edmonds", "Emery", "English"],
  F: ["Fisher", "Foster", "Fox", "Fraser", "Freeman", "French", "Ferguson", "Field", "Fleming", "Flynn"],
  G: ["Gibson", "Graham", "Grant", "Gray", "Green", "Griffin", "George", "Gordon", "Gardner", "Gilbert"],
  H: ["Hall", "Harris", "Harrison", "Harvey", "Henderson", "Hill", "Holmes", "Howard", "Hughes", "Hunt"],
  I: ["Ingram", "Irving", "Ivanov", "Ibrahim", "Irwin", "Ingham", "Irvine", "Izard", "Imrie", "Inglis"],
  J: ["Jackson", "James", "Jenkins", "Johnson", "Jones", "Jordan", "Jensen", "Joyce", "Jeffrey", "Jacobs"],
  K: ["Kelly", "Kennedy", "King", "Knight", "Kumar", "Khan", "Kemp", "Kerr", "Kirk", "Klein"],
  L: ["Lane", "Lee", "Lewis", "Lloyd", "Long", "Lawson", "Lambert", "Lynch", "Lucas", "Lawrence"],
  M: ["Martin", "Mason", "Matthews", "McDonald", "Mitchell", "Moore", "Morgan", "Morris", "Morrison", "Murray"],
  N: ["Nelson", "Newman", "Newton", "Nguyen", "Nicholson", "Norman", "Nolan", "Neal", "Nash", "Norton"],
  O: ["Oliver", "Owen", "O'Brien", "O'Connor", "O'Neill", "O'Sullivan", "Olsen", "Osborne", "Owens", "Ortega"],
  P: ["Palmer", "Parker", "Patel", "Patterson", "Pearce", "Perry", "Peters", "Phillips", "Price", "Powell"],
  Q: ["Quinn", "Quigley", "Quinlan", "Quick", "Quint", "Quartermaine", "Quayle", "Quest", "Queale", "Quinton"],
  R: ["Reid", "Richards", "Richardson", "Roberts", "Robertson", "Robinson", "Rogers", "Ross", "Russell", "Ryan"],
  S: ["Scott", "Shaw", "Simpson", "Singh", "Smith", "Spencer", "Stevens", "Stewart", "Sullivan", "Sutton"],
  T: ["Taylor", "Thomas", "Thompson", "Thomson", "Turner", "Tucker", "Todd", "Tran", "Thornton", "Timms"],
  U: ["Underwood", "Unsworth", "Upton", "Urquhart", "Usher", "Urban", "Ulrich", "Upham", "Uttley", "Underhill"],
  V: ["Vincent", "Vance", "Vaughan", "Valentine", "Vargas", "Vasquez", "Victor", "Villa", "Vickers", "Vine"],
  W: ["Walker", "Wallace", "Walsh", "Ward", "Watson", "Webb", "White", "Williams", "Wilson", "Wood"],
  X: ["Xavier", "Xiao", "Xu", "Xenakis", "Xanthis", "Xenos", "Ximenes", "Xing", "Xiong", "Xue"],
  Y: ["Young", "Yates", "Yang", "York", "Yuen", "Yip", "Yeoman", "Yates", "Yarwood", "Yeung"],
  Z: ["Zhang", "Zhou", "Zimmermann", "Zito", "Zola", "Zorba", "Zander", "Zane", "Ziegler", "Zemansky"],
};

// ---------- crawl one letter (by surname list) ----------

async function crawlMoneySmartLetter(letter: string, apiKey: string): Promise<{ matches: RawMatch[]; pages: number }> {
  const allMatches: RawMatch[] = [];
  let totalPages = 0;
  const surnames = SURNAMES_BY_LETTER[letter] ?? [letter];
  const seen = new Set<string>();

  for (const surname of surnames) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const encoded = encodeURIComponent(surname);
      const url =
        page === 1
          ? `https://moneysmart.gov.au/find-unclaimed-money?name=${encoded}`
          : `https://moneysmart.gov.au/find-unclaimed-money?name=${encoded}&page=${page}`;

      logger.info({ letter, surname, page }, "alphabet-scraper: MoneySmart page");

      let html: string;
      try {
        html = await fetchPage(url, apiKey);
      } catch (err) {
        logger.error({ err, letter, surname, page }, "alphabet-scraper: page fetch failed");
        break;
      }

      totalPages++;
      const pageMatches = parseMoneySmartRows(html);

      // Deduplicate across surnames
      for (const m of pageMatches) {
        const key = `${m.name.toLowerCase()}|${m.amount}`;
        if (!seen.has(key)) {
          seen.add(key);
          allMatches.push(m);
        }
      }

      if (/no results found|no records found|0 results/i.test(html)) break;
      if (pageMatches.length === 0) break;
      if (!hasNextPage(html, page)) break;

      await new Promise((r) => setTimeout(r, 800));
    }

    // Polite pause between surnames
    await new Promise((r) => setTimeout(r, 1000));
  }

  return { matches: allMatches, pages: totalPages };
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

async function insertProspects(letter: string, matches: RawMatch[]): Promise<number> {
  if (matches.length === 0) return 0;

  // Clear old records for this letter
  await db.delete(prospectsTable).where(
    and(eq(prospectsTable.letter, letter), eq(prospectsTable.sourceKey, "moneysmart"))
  );

  const seen = new Set<string>();
  const rows = matches
    .filter((m) => {
      const key = `${normalise(m.name)}|${m.amount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((m) => ({
      name: m.name,
      amount: m.amount,
      holder: m.holder || null,
      state: m.state || null,
      source: "ASIC MoneySmart",
      sourceKey: "moneysmart",
      letter,
      contactStatus: "pending",
    }));

  for (let i = 0; i < rows.length; i += 100) {
    await db.insert(prospectsTable).values(rows.slice(i, i + 100));
  }

  return rows.length;
}

// ---------- contact search ----------

const SITE_BASE = process.env.REPLIT_DOMAINS
  ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
  : "https://missingcash.com.au";

function parseAmountDollars(amount: string): number {
  const m = amount.match(/\$?([\d,]+)/);
  if (!m) return 0;
  return parseFloat(m[1].replace(/,/g, "")) || 0;
}

function calcFee(dollars: number): { pct: number; cents: number; str: string } {
  const pct = dollars <= 1000 ? 5 : dollars <= 5000 ? 10 : dollars <= 30000 ? 15 : dollars <= 100000 ? 20 : 33;
  const cents = Math.max(Math.round(dollars * pct), 100);
  return { pct, cents, str: `$${(cents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}` };
}

async function sendOutreachEmail(
  email: string,
  name: string,
  amount: string,
  holder: string | null,
  prospectId: number,
): Promise<{ sent: boolean; stripeSessionId?: string; subject?: string; bodyText?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!resendKey || !stripeKey) return { sent: false };

  // Spam Act 2003 — check unsubscribe list before sending
  const unsub = await db.select().from(unsubscribesTable).where(eq(unsubscribesTable.email, email.toLowerCase())).limit(1);
  if (unsub.length > 0) {
    logger.info({ email, prospectId }, "alphabet-scraper: skipping — email is unsubscribed");
    return { sent: false };
  }

  const parsed = parseName(name);
  const firstName = parsed?.firstName ?? name.split(" ")[0] ?? name;
  const dollars = parseAmountDollars(amount);
  const { pct, cents, str: feeStr } = calcFee(dollars);
  const holderName = holder || "an Australian government register";

  // Create Stripe checkout — fee paid BEFORE claim details are revealed
  let checkoutUrl: string;
  let stripeSessionId: string;
  try {
    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{
        price_data: {
          currency: "aud",
          unit_amount: cents,
          product_data: {
            name: `MissingCash Claim Report — ${pct}% success fee`,
            description: `Mia found ${amount} held by ${holderName}. Pay ${feeStr} to unlock your personalised step-by-step claim instructions.`,
          },
        },
        quantity: 1,
      }],
      metadata: { product: "prospect-outreach", prospectId: String(prospectId) },
      success_url: `${SITE_BASE}/mia-search/paid?prospect=${prospectId}`,
      cancel_url: `${SITE_BASE}/`,
    });
    checkoutUrl = session.url!;
    stripeSessionId = session.id;
  } catch (err) {
    logger.error({ err, email, name }, "alphabet-scraper: Stripe session failed");
    return { sent: false };
  }

  const subject = `⚡ We found ${amount} in your name — unlock your claim report`;
  const unsubscribeUrl = `${SITE_BASE}/api/unsubscribe?e=${encodeURIComponent(email)}&pid=${prospectId}`;

  // Plain-text version stored for audit trail
  const bodyText = [
    `To: ${email}`,
    `From: ${FROM_ADDRESS}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toISOString()}`,
    `Stripe Session: ${stripeSessionId}`,
    ``,
    `Hi ${firstName},`,
    ``,
    `We searched the national unclaimed money registers and found money that appears to belong to you.`,
    ``,
    `Amount found in your name: ${amount}`,
    `Held by: ${holderName}`,
    ``,
    `Data source: ASIC MoneySmart public register (https://moneysmart.gov.au/find-unclaimed-money)`,
    `Fee: ${pct}% of ${amount} = ${feeStr} (paid before claim instructions are released)`,
    ``,
    `Claim instructions are locked — the exact account references, claim forms, and step-by-step process are in your paid report.`,
    ``,
    `Checkout URL: ${checkoutUrl}`,
    ``,
    `${dollars > 20000 ? `Stratton Finance option included (amount > $20,000). ACL 364340. Subject to credit assessment.` : ""}`,
    ``,
    `© MissingCash | ABN 52 347 989 391 | support@missingcash.com.au`,
    `To unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#061826;padding:0;border-radius:12px;overflow:hidden;">
  <div style="background:#061826;padding:28px 32px 16px;text-align:center;">
    <h1 style="color:#f5b942;font-size:22px;margin:0;letter-spacing:2px;">MissingCash</h1>
    <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">Australia's Unclaimed Money Service</p>
  </div>
  <div style="background:#0f2233;padding:28px 32px;border-top:3px solid #f5b942;">
    <h2 style="color:#ffffff;font-size:20px;margin:0 0 6px;">Hi ${firstName},</h2>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 20px;">
      We searched the national unclaimed money registers and found money that appears to belong to you.
    </p>
    <div style="background:#061826;border:1px solid #f5b942;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Amount found in your name</p>
      <p style="color:#f5b942;font-size:36px;font-weight:900;margin:0;">${amount}</p>
      <p style="color:#6b7a8d;font-size:12px;margin:6px 0 0;">Held by ${holderName}</p>
    </div>
    <div style="background:#0a1f30;border:1px solid #1a2a3a;border-radius:8px;padding:14px;margin-bottom:24px;">
      <p style="color:#94a3b8;font-size:13px;margin:0;">
        🔒 <strong style="color:#fff;">Claim instructions are locked</strong> — the exact account references, claim forms, and step-by-step process are in your paid report. Pay once, get everything you need to claim your ${amount}.
      </p>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${checkoutUrl}" style="background:#f5b942;color:#061826;padding:18px 40px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:17px;display:inline-block;letter-spacing:1px;">
        🔓 Unlock My Claim Report — ${feeStr}
      </a>
      <p style="color:#6b7a8d;font-size:11px;margin:12px 0 0;">${pct}% of ${amount} · Secure Stripe payment · Report delivered instantly after payment</p>
    </div>
    ${dollars > 20000 ? `
    <div style="margin-top:20px;padding-top:20px;border-top:1px solid #1a2a3a;text-align:center;">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 12px;">💡 <strong style="color:#fff;">Can't cover the fee upfront?</strong></p>
      <p style="color:#6b7a8d;font-size:12px;margin:0 0 14px;">Stratton Finance can fund your claim fee using your ${amount} as collateral — you pay nothing until the money is in your account.</p>
      <a href="${SITE_BASE}/finance?fn=${encodeURIComponent(firstName)}&ln=${encodeURIComponent(parsed?.lastName ?? "")}&email=${encodeURIComponent(email)}&amount=${encodeURIComponent(amount)}&source=prospect-finance" style="background:#0f2233;color:#f5b942;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;border:1px solid #f5b942/30;">
        Apply for Fee Finance via Stratton →
      </a>
      <p style="color:#6b7a8d;font-size:10px;margin:10px 0 0;">Stratton Finance ACL 364340 · Subject to credit assessment</p>
    </div>` : ""}
    <p style="color:#6b7a8d;font-size:11px;text-align:center;margin-top:16px;">Questions? Reply to this email or contact support@missingcash.com.au</p>
  </div>
  <div style="background:#061826;padding:16px 32px;text-align:center;border-top:1px solid #1a2a3a;">
    <p style="color:#6b7a8d;font-size:11px;margin:0;">© MissingCash | ABN 52 347 989 391 | support@missingcash.com.au</p>
    <p style="color:#4a5568;font-size:10px;margin:8px 0 0;">You received this because your name appears on the ASIC MoneySmart public unclaimed money register. <a href="${unsubscribeUrl}" style="color:#4a5568;">Unsubscribe</a></p>
  </div>
</div>`;

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({ from: FROM_ADDRESS, to: email, subject, html });
    logger.info({ email, name, amount, prospectId, stripeSessionId }, "alphabet-scraper: outreach email sent");
    return { sent: true, stripeSessionId, subject, bodyText };
  } catch (err) {
    logger.error({ err, email, name }, "alphabet-scraper: outreach email failed");
    return { sent: false };
  }
}

async function contactSearchLetter(letter: string): Promise<{ found: number; emailed: number }> {
  let found = 0;
  let emailed = 0;
  let processed = 0;

  while (processed < MAX_CONTACTS_PER_LETTER) {
    // Pick next pending prospect for this letter
    const rows = await db
      .select()
      .from(prospectsTable)
      .where(
        and(
          eq(prospectsTable.letter, letter),
          eq(prospectsTable.contactStatus, "pending")
        )
      )
      .limit(1);

    const prospect = rows[0];
    if (!prospect) break;

    processed++;

    const contact = await findContact(prospect.name, prospect.state ?? null);

    if (contact && (contact.phone || contact.email || contact.address)) {
      found++;

      let outreachSentAt: Date | null = null;
      let stripeSessionId: string | null = null;
      let outreachSubject: string | null = null;
      let outreachBodyText: string | null = null;
      if (contact.email) {
        const result = await sendOutreachEmail(contact.email, prospect.name, prospect.amount, prospect.holder ?? null, prospect.id);
        if (result.sent) {
          emailed++;
          outreachSentAt = new Date();
          stripeSessionId = result.stripeSessionId ?? null;
          outreachSubject = result.subject ?? null;
          outreachBodyText = result.bodyText ?? null;
        }
      }

      await db
        .update(prospectsTable)
        .set({
          contactStatus: "found",
          contactEmail: contact.email ?? null,
          contactPhone: contact.phone ?? null,
          contactAddress: contact.address ?? null,
          contactSource: contact.source,
          contactSearchedAt: new Date(),
          outreachSentAt,
          stripeSessionId,
          outreachSubject,
          outreachBodyText,
        })
        .where(eq(prospectsTable.id, prospect.id));
    } else {
      await db
        .update(prospectsTable)
        .set({
          contactStatus: "not_found",
          contactSearchedAt: new Date(),
        })
        .where(eq(prospectsTable.id, prospect.id));
    }

    // Polite pause between requests
    await new Promise((r) => setTimeout(r, 1200));
  }

  return { found, emailed };
}

// ---------- progress tracking ----------

async function getProgress(letter: string) {
  const rows = await db.select().from(alphabetCrawlProgressTable).where(eq(alphabetCrawlProgressTable.letter, letter));
  return rows[0] ?? null;
}

async function upsertProgress(letter: string, patch: Partial<typeof alphabetCrawlProgressTable.$inferInsert>) {
  await db
    .insert(alphabetCrawlProgressTable)
    .values({ letter, ...patch })
    .onConflictDoUpdate({ target: alphabetCrawlProgressTable.letter, set: patch });
}

// ---------- auto-progression ----------

let pipelineRunning = false;

async function runPipeline() {
  if (pipelineRunning) return;
  pipelineRunning = true;

  try {
    const apiKey = process.env.SCRAPINGBEE_API_KEY;
    if (!apiKey) { logger.warn("alphabet-pipeline: no SCRAPINGBEE_API_KEY"); return; }

    // Find first letter that isn't done
    for (const letter of LETTERS) {
      const progress = await getProgress(letter);

      if (progress?.status === "done") continue;

      // PHASE 1: crawl MoneySmart for this letter
      if (!progress || progress.status === "pending") {
        logger.info({ letter }, "alphabet-pipeline: starting crawl");
        await upsertProgress(letter, { status: "crawling", startedAt: new Date() });

        const { matches, pages } = await crawlMoneySmartLetter(letter, apiKey);

        if (pages === 0) {
          // Crawl failed entirely — reset to pending so it retries next run
          logger.warn({ letter }, "alphabet-pipeline: crawl returned 0 pages, resetting to pending for retry");
          await upsertProgress(letter, { status: "pending", startedAt: null });
          break;
        }

        const inserted = await insertProspects(letter, matches);
        logger.info({ letter, inserted, pages }, "alphabet-pipeline: crawl done");
        await upsertProgress(letter, { status: "searching", prospectCount: inserted });
      }

      // PHASE 2: contact-search all prospects
      if ((await getProgress(letter))?.status === "searching") {
        logger.info({ letter }, "alphabet-pipeline: starting contact search");
        const { found, emailed } = await contactSearchLetter(letter);

        logger.info({ letter, found, emailed }, "alphabet-pipeline: contact search done");
        await upsertProgress(letter, {
          status: "done",
          contactsFound: found,
          outreachSent: emailed,
          completedAt: new Date(),
        });

        // Delete prospects that had no contact (keep found ones for the daily report)
        await db
          .delete(prospectsTable)
          .where(
            and(
              eq(prospectsTable.letter, letter),
              eq(prospectsTable.contactStatus, "not_found")
            )
          );

        logger.info({ letter }, "alphabet-pipeline: letter complete, not_found prospects purged");
      }

      // Only do one letter per run — next letter triggers on next pipeline tick
      break;
    }
  } catch (err) {
    logger.error({ err }, "alphabet-pipeline: error");
  } finally {
    pipelineRunning = false;
  }
}

// ---------- public API ----------

export async function crawlLetter(letter: string): Promise<{ inserted: number; pages: number; error?: string }> {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  if (!apiKey) return { inserted: 0, pages: 0, error: "SCRAPINGBEE_API_KEY not set" };

  try {
    const { matches, pages } = await crawlMoneySmartLetter(letter.toUpperCase(), apiKey);
    const inserted = await insertProspects(letter.toUpperCase(), matches);
    return { inserted, pages };
  } catch (err) {
    return { inserted: 0, pages: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function startAlphabetPipeline() {
  logger.info("alphabet-pipeline: auto-start triggered");
  void runPipeline();
}

export async function getProspectStats() {
  const [byLetter, progress] = await Promise.all([
    db.select({
      letter: prospectsTable.letter,
      count: sql<number>`count(*)::int`,
      found: sql<number>`count(*) filter (where contact_status = 'found')::int`,
      emailed: sql<number>`count(*) filter (where outreach_sent_at is not null)::int`,
    }).from(prospectsTable).groupBy(prospectsTable.letter).orderBy(prospectsTable.letter),
    db.select().from(alphabetCrawlProgressTable).orderBy(alphabetCrawlProgressTable.letter),
  ]);

  const total = byLetter.reduce((sum, r) => sum + r.count, 0);
  return { total, byLetter, progress };
}

export function isLetterInProgress(letter: string): boolean {
  return pipelineRunning;
}
