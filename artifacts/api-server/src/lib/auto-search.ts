import Stripe from "stripe";
import { Resend } from "resend";
import { db } from "@workspace/db";
import {
  financeEnquiriesTable,
  searchSubmissionsTable,
  tiktokLeadsTable,
  miaFreeSearchesTable,
  autoSearchResultsTable,
} from "@workspace/db/schema";
import { eq, notInArray, and, gte, sql } from "drizzle-orm";
import { searchAllSources } from "./multi-scraper";
import { logger } from "./logger";

const DAILY_LIMIT = parseInt(process.env.AUTO_SEARCH_DAILY_LIMIT ?? "100", 10);
const INTERVAL_MS = 3 * 60 * 1000;

const SITE_BASE = process.env.REPLIT_DOMAINS
  ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
  : "https://missingcash.com.au";

const FROM_ADDRESS =
  process.env.MISSINGCASH_DOMAIN_VERIFIED === "true"
    ? "MissingCash <leads@missingcash.com.au>"
    : "MissingCash <leads@lensflow.com.au>";

function fmtAUD(cents: number) {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

function parseAmountCents(amountStr: string): number {
  const match = amountStr.match(/\$?([\d,]+(?:\.\d{1,2})?)/);
  if (!match?.[1]) return 0;
  const dollars = parseFloat(match[1].replace(/,/g, ""));
  return isNaN(dollars) ? 0 : Math.round(dollars * 100);
}

function calcFeePercent(totalDollars: number): number {
  if (totalDollars <= 1000) return 5;
  if (totalDollars <= 5000) return 10;
  if (totalDollars <= 30000) return 15;
  if (totalDollars <= 100000) return 20;
  return 33;
}

function calcFeeCents(totalAmountCents: number): number {
  const totalDollars = totalAmountCents / 100;
  const pct = calcFeePercent(totalDollars);
  return Math.max(Math.round(totalAmountCents * pct / 100), 100);
}

async function sendFoundEmail(opts: {
  searchId: number;
  email: string;
  firstName: string;
  lastName: string;
  totalAmountCents: number;
  teaserMatches: { name: string; holder: string; state: string; amount: string; source?: string }[];
}) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!stripeKey || !resendKey) {
    logger.warn({ searchId: opts.searchId }, "auto-search: skipping found-email — missing keys");
    return;
  }

  const { searchId, email, firstName, lastName, totalAmountCents, teaserMatches } = opts;
  const feePercent = calcFeePercent(totalAmountCents / 100);
  const feeCents = calcFeeCents(totalAmountCents);
  const totalStr = fmtAUD(totalAmountCents);
  const feeStr = fmtAUD(feeCents);

  let checkoutUrl: string;
  try {
    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: feeCents,
            product_data: {
              name: `Mia Full Claim Report — ${feePercent}% success fee`,
              description: `Mia found ${totalStr} in your name. Pay ${feeStr} (${feePercent}%) to unlock your personalised step-by-step claim report.`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { product: "mia-free-search", searchId: String(searchId) },
      success_url: `${SITE_BASE}/mia-search/paid?id=${searchId}`,
      cancel_url: `${SITE_BASE}/mia-search/results?id=${searchId}`,
    });
    checkoutUrl = session.url!;
  } catch (err) {
    logger.error({ err, searchId }, "auto-search: failed to create Stripe session");
    return;
  }

  const matchRows = teaserMatches.slice(0, 3).map((m) => {
    const label = m.source || m.holder || "Institution on file";
    const loc = m.state ? ` · ${m.state}` : "";
    const amt = m.amount
      ? `<strong style="color:#00C1D5;">${m.amount}</strong>`
      : `<em style="color:#6b7a8d;">Amount on file</em>`;
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #1a2a3a;">
          <div style="color:#ffffff;font-size:14px;font-weight:bold;">${m.name}</div>
          <div style="color:#6b7a8d;font-size:12px;">${label}${loc}</div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #1a2a3a;text-align:right;">
          ${amt}
          <div style="color:#6b7a8d;font-size:10px;margin-top:2px;">🔒 Claim steps locked</div>
        </td>
      </tr>`;
  }).join("");

  const extraNote =
    teaserMatches.length > 3
      ? `<p style="color:#6b7a8d;font-size:12px;text-align:center;margin:8px 0 0;">+ ${teaserMatches.length - 3} more match${teaserMatches.length - 3 !== 1 ? "es" : ""} in your full report</p>`
      : "";

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#061826;padding:0;border-radius:12px;overflow:hidden;">
  <div style="background:#061826;padding:32px 32px 20px;text-align:center;">
    <h1 style="color:#f5b942;font-size:24px;margin:0;letter-spacing:2px;">MissingCash</h1>
    <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">Mia Free Search — Results Ready</p>
  </div>
  <div style="background:#0f2233;padding:28px 32px;border-top:3px solid #00C1D5;">
    <h2 style="color:#00C1D5;font-size:22px;margin:0 0 8px;">⚡ Mia found unclaimed money in your name!</h2>
    <p style="color:#ffffff;font-size:28px;font-weight:900;margin:0 0 4px;">${totalStr} found</p>
    <p style="color:#94a3b8;font-size:13px;margin:0 0 24px;">across ${teaserMatches.length} match${teaserMatches.length !== 1 ? "es" : ""} in Australian government databases</p>
    <table style="width:100%;border-collapse:collapse;background:#061826;border-radius:8px;overflow:hidden;margin-bottom:8px;">
      <thead>
        <tr style="background:#0a1f30;">
          <th style="padding:10px 12px;text-align:left;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Match</th>
          <th style="padding:10px 12px;text-align:right;color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Amount</th>
        </tr>
      </thead>
      <tbody>${matchRows}</tbody>
    </table>
    ${extraNote}
    <div style="background:#00C1D5/10;border:1px solid #00C1D5;border-radius:8px;padding:14px;margin:20px 0;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 6px;">🔒 Exact institution names, account references, claim form links and step-by-step instructions are in your full report</p>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${checkoutUrl}" style="background:#00C1D5;color:#ffffff;padding:18px 40px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:17px;display:inline-block;letter-spacing:1px;">
        🔓 Unlock My Full Report — ${feeStr}
      </a>
      <p style="color:#6b7a8d;font-size:11px;margin:12px 0 0;">${feePercent}% of ${totalStr} found · Secure payment via Stripe · Report emailed instantly</p>
    </div>
    <p style="color:#6b7a8d;font-size:11px;margin:16px 0 0;text-align:center;">No charge has been made. You only pay if you choose to unlock your report.<br>Questions? Email support@missingcash.com.au</p>
  </div>
  <div style="background:#061826;padding:20px 32px;text-align:center;border-top:1px solid #1a2a3a;">
    <p style="color:#6b7a8d;font-size:11px;margin:0;">© MissingCash | ABN 52 347 989 391 | support@missingcash.com.au</p>
  </div>
</div>`;

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: `⚡ Mia found ${totalStr} in your name, ${firstName} — unlock your report`,
      html,
    });
    logger.info({ searchId, email, totalAmountCents }, "auto-search: found-email sent");
  } catch (err) {
    logger.error({ err, searchId, email }, "auto-search: failed to send found-email");
  }
}

async function getTodayCount(): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(autoSearchResultsTable)
    .where(gte(autoSearchResultsTable.searchedAt, todayStart));
  return rows[0]?.count ?? 0;
}

async function getSearchedIds(sourceTable: string): Promise<number[]> {
  const rows = await db
    .select({ sourceId: autoSearchResultsTable.sourceId })
    .from(autoSearchResultsTable)
    .where(eq(autoSearchResultsTable.sourceTable, sourceTable));
  return rows.map((r) => r.sourceId);
}

type LeadCandidate = {
  sourceTable: string;
  sourceId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dob: string;
  address: string;
};

async function getNextLead(): Promise<LeadCandidate | null> {
  const financeSearched = await getSearchedIds("finance_enquiry");
  if (financeSearched.length === 0 || true) {
    const rows = await db
      .select()
      .from(financeEnquiriesTable)
      .where(
        financeSearched.length > 0
          ? notInArray(financeEnquiriesTable.id, financeSearched)
          : sql`true`
      )
      .orderBy(financeEnquiriesTable.id)
      .limit(1);
    if (rows[0]) {
      const r = rows[0];
      return {
        sourceTable: "finance_enquiry",
        sourceId: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        phone: r.phone,
        dob: "unknown",
        address: r.postcode,
      };
    }
  }

  const subSearched = await getSearchedIds("search_submission");
  const subRows = await db
    .select()
    .from(searchSubmissionsTable)
    .where(
      subSearched.length > 0
        ? notInArray(searchSubmissionsTable.id, subSearched)
        : sql`true`
    )
    .orderBy(searchSubmissionsTable.id)
    .limit(1);
  if (subRows[0]) {
    const r = subRows[0];
    return {
      sourceTable: "search_submission",
      sourceId: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: null,
      dob: r.birthYear ? `${r.birthYear}-01-01` : "unknown",
      address: r.state ?? "unknown",
    };
  }

  const ttSearched = await getSearchedIds("tiktok_lead");
  const ttRows = await db
    .select()
    .from(tiktokLeadsTable)
    .where(
      ttSearched.length > 0
        ? notInArray(tiktokLeadsTable.id, ttSearched)
        : sql`true`
    )
    .orderBy(tiktokLeadsTable.id)
    .limit(1);
  if (ttRows[0]) {
    const r = ttRows[0];
    return {
      sourceTable: "tiktok_lead",
      sourceId: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email ?? "",
      phone: null,
      dob: r.dob,
      address: "unknown",
    };
  }

  return null;
}

async function runAutoSearch() {
  try {
    const todayCount = await getTodayCount();
    if (todayCount >= DAILY_LIMIT) {
      logger.info({ todayCount, DAILY_LIMIT }, "auto-search: daily limit reached, skipping");
      return;
    }

    const lead = await getNextLead();
    if (!lead) {
      logger.info("auto-search: no unsearched leads found");
      return;
    }

    if (!lead.email) {
      await db.insert(autoSearchResultsTable).values({
        sourceTable: lead.sourceTable,
        sourceId: lead.sourceId,
        email: "no-email",
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        status: "skipped",
      });
      return;
    }

    logger.info({ lead: `${lead.firstName} ${lead.lastName}`, source: lead.sourceTable }, "auto-search: starting search");

    const [searchRow] = await db
      .insert(miaFreeSearchesTable)
      .values({
        email: lead.email,
        firstName: lead.firstName,
        lastName: lead.lastName,
        dob: lead.dob,
        currentAddress: lead.address,
        status: "searching",
      })
      .returning({ id: miaFreeSearchesTable.id });

    const searchId = searchRow!.id;

    const results = await searchAllSources({ firstName: lead.firstName, lastName: lead.lastName, address: lead.address || undefined, dob: lead.dob !== "unknown" ? lead.dob : undefined });
    const validMatches = results.matches.filter((m) => m.name && m.holder !== undefined);
    let totalAmountCents = 0;
    for (const m of validMatches) totalAmountCents += parseAmountCents(m.amount);

    const teaserMatches = validMatches.map((m) => ({
      name: m.name,
      holder: m.holder,
      state: m.state,
      amount: m.amount,
      source: (m as { source?: string }).source ?? "",
    }));

    const hasMatches = validMatches.length > 0;
    const status = hasMatches ? "found" : "not_found";

    await db
      .update(miaFreeSearchesTable)
      .set({ status, totalAmountCents: hasMatches ? totalAmountCents : 0, teaserMatchesJson: JSON.stringify(teaserMatches) })
      .where(eq(miaFreeSearchesTable.id, searchId));

    await db.insert(autoSearchResultsTable).values({
      sourceTable: lead.sourceTable,
      sourceId: lead.sourceId,
      email: lead.email,
      firstName: lead.firstName,
      lastName: lead.lastName,
      phone: lead.phone,
      freeSearchId: searchId,
      status,
      totalAmountCents: hasMatches ? totalAmountCents : 0,
    });

    logger.info({ searchId, status, matchCount: validMatches.length, totalAmountCents, source: lead.sourceTable }, "auto-search: search complete");

    if (hasMatches) {
      await sendFoundEmail({ searchId, email: lead.email, firstName: lead.firstName, lastName: lead.lastName, totalAmountCents, teaserMatches });
    }
  } catch (err) {
    logger.error({ err }, "auto-search: error in runAutoSearch");
  }
}

export function startAutoSearch() {
  logger.info({ intervalMs: INTERVAL_MS, dailyLimit: DAILY_LIMIT }, "auto-search: scheduler started");
  void runAutoSearch();
  setInterval(() => { void runAutoSearch(); }, INTERVAL_MS);
}
