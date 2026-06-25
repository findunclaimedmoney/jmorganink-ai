import { Router, type IRouter } from "express";
import Stripe from "stripe";
import { db, miaFreeSearchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { searchAllSources } from "../lib/multi-scraper";

const router: IRouter = Router();

const SITE_BASE = process.env.REPLIT_DOMAINS
  ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
  : "https://missingcash.com.au";

function parseAmountCents(amountStr: string): number {
  const match = amountStr.match(/\$?([\d,]+(?:\.\d{1,2})?)/);
  if (!match || !match[1]) return 0;
  const dollars = parseFloat(match[1].replace(/,/g, ""));
  return isNaN(dollars) ? 0 : Math.round(dollars * 100);
}

function calcFeePercent(totalDollars: number): number {
  if (totalDollars < 250) return 5;
  if (totalDollars <= 1000) return 5;
  if (totalDollars <= 5000) return 10;
  if (totalDollars <= 30000) return 15;
  if (totalDollars <= 100000) return 20;
  return 33;
}

function calcFeeCents(totalAmountCents: number): number {
  const totalDollars = totalAmountCents / 100;
  const pct = calcFeePercent(totalDollars);
  const fee = Math.round(totalAmountCents * pct / 100);
  return Math.max(fee, 100);
}

router.post("/mia/search/start", async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const email = str(b["email"]);
  const firstName = str(b["firstName"]);
  const lastName = str(b["lastName"]);
  const dob = str(b["dob"]);
  const currentAddress = str(b["currentAddress"]);
  const previousAddresses = str(b["previousAddresses"]);
  const previousSurnames = str(b["previousSurnames"]);

  if (!email || !firstName || !lastName || !dob || !currentAddress) {
    res.status(400).json({ error: "Missing required fields: email, firstName, lastName, dob, currentAddress" });
    return;
  }

  let searchId: number;
  try {
    const [row] = await db.insert(miaFreeSearchesTable).values({
      email, firstName, lastName, dob, currentAddress,
      previousAddresses: previousAddresses || null,
      previousSurnames: previousSurnames || null,
      status: "searching",
    }).returning({ id: miaFreeSearchesTable.id });
    searchId = row!.id;
  } catch (err) {
    req.log.error({ err }, "Failed to create free search record");
    res.status(500).json({ error: "Failed to start search. Please try again." });
    return;
  }

  res.status(201).json({ searchId });

  (async () => {
    try {
      req.log.info({ searchId, firstName, lastName }, "Starting multi-source search (8 databases)");

      const results = await searchAllSources({
        firstName,
        lastName,
        previousSurnames: previousSurnames || undefined,
      });

      const validMatches = results.matches.filter((m) => m.name && m.holder !== undefined);

      let totalAmountCents = 0;
      for (const m of validMatches) {
        totalAmountCents += parseAmountCents(m.amount);
      }

      const teaserMatches = validMatches.map((m) => ({
        name: m.name,
        holder: m.holder,
        state: m.state,
        amount: m.amount,
        source: (m as { source?: string }).source ?? "",
      }));

      const hasMatches = validMatches.length > 0;
      const status = hasMatches ? "found" : "not_found";

      await db.update(miaFreeSearchesTable).set({
        status,
        totalAmountCents: hasMatches ? totalAmountCents : 0,
        teaserMatchesJson: JSON.stringify(teaserMatches),
      }).where(eq(miaFreeSearchesTable.id, searchId));

      req.log.info({ searchId, status, matchCount: validMatches.length, totalAmountCents, sourcesSearched: results.sourceResults.length }, "Multi-source search complete");
    } catch (err) {
      req.log.error({ err, searchId }, "Free search failed");
      try {
        await db.update(miaFreeSearchesTable).set({ status: "error" }).where(eq(miaFreeSearchesTable.id, searchId));
      } catch (_) {}
    }
  })();
});

router.get("/mia/search/:id", async (req, res) => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid search ID" });
    return;
  }

  try {
    const [row] = await db.select().from(miaFreeSearchesTable).where(eq(miaFreeSearchesTable.id, id)).limit(1);
    if (!row) {
      res.status(404).json({ error: "Search not found" });
      return;
    }

    const teaserMatches = row.teaserMatchesJson ? (JSON.parse(row.teaserMatchesJson) as { name: string; holder: string; state: string; amount: string }[]) : [];
    const totalAmountCents = row.totalAmountCents ?? 0;
    const feeCents = totalAmountCents > 0 ? calcFeeCents(totalAmountCents) : 0;
    const feePercent = totalAmountCents > 0 ? calcFeePercent(totalAmountCents / 100) : 0;

    res.json({
      status: row.status,
      totalAmountCents,
      feeCents,
      feePercent,
      matchCount: teaserMatches.length,
      teaserMatches,
      email: row.email,
      firstName: row.firstName,
    });
  } catch (err) {
    req.log.error({ err, id }, "Failed to fetch search status");
    res.status(500).json({ error: "Failed to fetch search status" });
  }
});

router.post("/mia/search/checkout", async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const searchId = parseInt(String(b["searchId"] ?? ""), 10);

  if (isNaN(searchId)) {
    res.status(400).json({ error: "Invalid searchId" });
    return;
  }

  let row: typeof miaFreeSearchesTable.$inferSelect | undefined;
  try {
    const rows = await db.select().from(miaFreeSearchesTable).where(eq(miaFreeSearchesTable.id, searchId)).limit(1);
    row = rows[0];
  } catch (err) {
    req.log.error({ err, searchId }, "Failed to fetch search for checkout");
    res.status(500).json({ error: "Failed to process request" });
    return;
  }

  if (!row) {
    res.status(404).json({ error: "Search not found" });
    return;
  }

  if (row.status !== "found") {
    res.status(400).json({ error: "Search results not ready or no money found" });
    return;
  }

  const totalAmountCents = row.totalAmountCents ?? 0;
  const feeCents = totalAmountCents > 0 ? calcFeeCents(totalAmountCents) : 100;
  const feePercent = calcFeePercent(totalAmountCents / 100);
  const totalDollars = (totalAmountCents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
  const feeDollars = (feeCents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD" });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    res.status(500).json({ error: "Payment not configured" });
    return;
  }

  try {
    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: row.email,
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: feeCents,
            product_data: {
              name: `Mia Full Claim Report — ${feePercent}% success fee`,
              description: `Mia found ${totalDollars} in your name. Pay ${feeDollars} (${feePercent}%) to unlock your full personalised claim report with step-by-step instructions for every database.`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        product: "mia-free-search",
        searchId: String(searchId),
      },
      success_url: `${SITE_BASE}/mia-search/paid?id=${searchId}`,
      cancel_url: `${SITE_BASE}/mia-search/results?id=${searchId}`,
    });

    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err, searchId }, "Failed to create Stripe checkout session");
    res.status(500).json({ error: "Failed to create payment session. Please try again." });
  }
});

export default router;
