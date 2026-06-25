import { Router, type IRouter } from "express";
import { searchAllSources } from "../lib/multi-scraper";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "missingcash-admin";

router.post("/admin/batch-search", async (req, res) => {
  const auth = req.headers["x-admin-token"];
  if (auth !== ADMIN_TOKEN) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }

  const b = (req.body ?? {}) as Record<string, unknown>;
  const names = b["names"] as { firstName: string; lastName: string }[] | undefined;

  if (!Array.isArray(names) || names.length === 0) {
    res.status(400).json({ error: "Provide names array: [{firstName, lastName}]" });
    return;
  }

  const batch = names.slice(0, 10);

  res.json({ started: batch.length, message: "Searching — results will stream as each name completes" });

  for (const { firstName, lastName } of batch) {
    try {
      logger.info({ firstName, lastName }, "Batch search: starting");
      const results = await searchAllSources({ firstName, lastName });
      const matches = results.matches.filter((m) => m.name && m.holder !== undefined);
      const totalCents = matches.reduce((sum, m) => {
        const match = m.amount?.match(/\$?([\d,]+(?:\.\d{1,2})?)/);
        if (!match?.[1]) return sum;
        return sum + Math.round(parseFloat(match[1].replace(/,/g, "")) * 100);
      }, 0);

      logger.info(
        { firstName, lastName, matchCount: matches.length, totalCents },
        "Batch search: complete"
      );
    } catch (err) {
      logger.error({ err, firstName, lastName }, "Batch search: failed");
    }
  }
});

router.post("/admin/batch-search/sync", async (req, res) => {
  const auth = req.headers["x-admin-token"];
  if (auth !== ADMIN_TOKEN) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }

  const b = (req.body ?? {}) as Record<string, unknown>;
  const names = b["names"] as { firstName: string; lastName: string }[] | undefined;

  if (!Array.isArray(names) || names.length === 0) {
    res.status(400).json({ error: "Provide names array: [{firstName, lastName}]" });
    return;
  }

  const batch = names.slice(0, 10);
  const results: {
    firstName: string;
    lastName: string;
    status: "found" | "not_found" | "error";
    matchCount: number;
    totalAmountCents: number;
    matches: { name: string; holder: string; state: string; amount: string; source?: string }[];
  }[] = [];

  for (const { firstName, lastName } of batch) {
    try {
      const r = await searchAllSources({ firstName, lastName });
      const matches = r.matches
        .filter((m) => m.name && m.holder !== undefined)
        .map((m) => ({
          name: m.name,
          holder: m.holder,
          state: m.state,
          amount: m.amount,
          source: (m as { source?: string }).source ?? "",
        }));

      const totalAmountCents = matches.reduce((sum, m) => {
        const match = m.amount?.match(/\$?([\d,]+(?:\.\d{1,2})?)/);
        if (!match?.[1]) return sum;
        return sum + Math.round(parseFloat(match[1].replace(/,/g, "")) * 100);
      }, 0);

      results.push({
        firstName,
        lastName,
        status: matches.length > 0 ? "found" : "not_found",
        matchCount: matches.length,
        totalAmountCents,
        matches,
      });
    } catch {
      results.push({ firstName, lastName, status: "error", matchCount: 0, totalAmountCents: 0, matches: [] });
    }
  }

  res.json({ results });
});

export default router;
