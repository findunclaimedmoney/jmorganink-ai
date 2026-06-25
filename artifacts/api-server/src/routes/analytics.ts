import { Router } from "express";
import { db } from "@workspace/db";
import { pageViewsTable, miaFreeSearchesTable, financeEnquiriesTable, tiktokLeadsTable, emailAlertsTable, searchSubmissionsTable } from "@workspace/db/schema";
import { sql, gte, and, notLike } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const TEST_EMAIL_PATTERNS = [
  "%@missingcash.com.au",
  "%@lensflow.com.au",
  "%@test.com",
  "%@example.com",
  "test@%",
  "%ignore%",
];

function isTestEmail(email: string): boolean {
  const e = email.toLowerCase();
  return (
    e.includes("@missingcash.com.au") ||
    e.includes("@lensflow.com.au") ||
    e.includes("@test.com") ||
    e.includes("@example.com") ||
    e.startsWith("test@") ||
    e.includes("ignore")
  );
}

router.post("/analytics/pageview", async (req, res): Promise<void> => {
  try {
    const { path, referrer } = req.body as { path?: string; referrer?: string };
    if (!path) { res.status(400).json({ error: "path required" }); return; }
    await db.insert(pageViewsTable).values({
      path: String(path).slice(0, 200),
      referrer: referrer ? String(referrer).slice(0, 500) : null,
      userAgent: req.headers["user-agent"]?.slice(0, 500) ?? null,
    });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "pageview insert failed");
    res.json({ ok: false });
  }
});

function checkAuth(req: Parameters<Parameters<typeof router.get>[1]>[0]): boolean {
  const password = process.env["ADMIN_PASSWORD"] ?? "missingcash2024";
  const auth = req.headers["x-admin-password"] ?? req.query["p"];
  return auth === password;
}

router.get("/admin/analytics", async (req, res): Promise<void> => {
  if (!checkAuth(req)) {
    res.status(401).json({ error: "Unauthorized" }); return;
  }

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [pvToday, pvWeek, pvTotal] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(pageViewsTable).where(gte(pageViewsTable.createdAt, today)),
      db.select({ count: sql<number>`count(*)::int` }).from(pageViewsTable).where(gte(pageViewsTable.createdAt, weekAgo)),
      db.select({ count: sql<number>`count(*)::int` }).from(pageViewsTable),
    ]);

    const [searchesToday, searchesWeek, searchesTotal, searchesFound] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(miaFreeSearchesTable)
        .where(and(gte(miaFreeSearchesTable.createdAt, today), notLike(miaFreeSearchesTable.email, "%missingcash.com.au"), notLike(miaFreeSearchesTable.email, "%lensflow.com.au"), notLike(miaFreeSearchesTable.email, "%test.%"), notLike(miaFreeSearchesTable.email, "%example.com"))),
      db.select({ count: sql<number>`count(*)::int` }).from(miaFreeSearchesTable)
        .where(and(gte(miaFreeSearchesTable.createdAt, weekAgo), notLike(miaFreeSearchesTable.email, "%missingcash.com.au"), notLike(miaFreeSearchesTable.email, "%lensflow.com.au"), notLike(miaFreeSearchesTable.email, "%test.%"), notLike(miaFreeSearchesTable.email, "%example.com"))),
      db.select({ count: sql<number>`count(*)::int` }).from(miaFreeSearchesTable)
        .where(and(notLike(miaFreeSearchesTable.email, "%missingcash.com.au"), notLike(miaFreeSearchesTable.email, "%lensflow.com.au"), notLike(miaFreeSearchesTable.email, "%test.%"), notLike(miaFreeSearchesTable.email, "%example.com"))),
      db.select({ count: sql<number>`count(*)::int` }).from(miaFreeSearchesTable)
        .where(and(sql`status = 'found'`, notLike(miaFreeSearchesTable.email, "%missingcash.com.au"), notLike(miaFreeSearchesTable.email, "%lensflow.com.au"), notLike(miaFreeSearchesTable.email, "%test.%"), notLike(miaFreeSearchesTable.email, "%example.com"))),
    ]);

    const [financeToday, financeWeek, financeTotal] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(financeEnquiriesTable)
        .where(and(gte(financeEnquiriesTable.createdAt, today), notLike(financeEnquiriesTable.email, "%missingcash.com.au"), notLike(financeEnquiriesTable.email, "%test.%"), notLike(financeEnquiriesTable.email, "%example.com"))),
      db.select({ count: sql<number>`count(*)::int` }).from(financeEnquiriesTable)
        .where(and(gte(financeEnquiriesTable.createdAt, weekAgo), notLike(financeEnquiriesTable.email, "%missingcash.com.au"), notLike(financeEnquiriesTable.email, "%test.%"), notLike(financeEnquiriesTable.email, "%example.com"))),
      db.select({ count: sql<number>`count(*)::int` }).from(financeEnquiriesTable)
        .where(and(notLike(financeEnquiriesTable.email, "%missingcash.com.au"), notLike(financeEnquiriesTable.email, "%test.%"), notLike(financeEnquiriesTable.email, "%example.com"))),
    ]);

    const [emailsToday, emailsWeek, emailsTotal] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(emailAlertsTable)
        .where(and(gte(emailAlertsTable.createdAt, today), notLike(emailAlertsTable.email, "%missingcash.com.au"), notLike(emailAlertsTable.email, "%test.%"), notLike(emailAlertsTable.email, "%example.com"))),
      db.select({ count: sql<number>`count(*)::int` }).from(emailAlertsTable)
        .where(and(gte(emailAlertsTable.createdAt, weekAgo), notLike(emailAlertsTable.email, "%missingcash.com.au"), notLike(emailAlertsTable.email, "%test.%"), notLike(emailAlertsTable.email, "%example.com"))),
      db.select({ count: sql<number>`count(*)::int` }).from(emailAlertsTable)
        .where(and(notLike(emailAlertsTable.email, "%missingcash.com.au"), notLike(emailAlertsTable.email, "%test.%"), notLike(emailAlertsTable.email, "%example.com"))),
    ]);

    const pvByDay = await db.select({
      day: sql<string>`date_trunc('day', created_at)::text`,
      count: sql<number>`count(*)::int`,
    }).from(pageViewsTable).where(gte(pageViewsTable.createdAt, weekAgo)).groupBy(sql`date_trunc('day', created_at)`).orderBy(sql`date_trunc('day', created_at)`);

    const searchesByDay = await db.select({
      day: sql<string>`date_trunc('day', created_at)::text`,
      count: sql<number>`count(*)::int`,
    }).from(miaFreeSearchesTable)
      .where(and(gte(miaFreeSearchesTable.createdAt, weekAgo), notLike(miaFreeSearchesTable.email, "%missingcash.com.au"), notLike(miaFreeSearchesTable.email, "%lensflow.com.au"), notLike(miaFreeSearchesTable.email, "%test.%"), notLike(miaFreeSearchesTable.email, "%example.com")))
      .groupBy(sql`date_trunc('day', created_at)`).orderBy(sql`date_trunc('day', created_at)`);

    const recentActivity = await db.execute(sql`
      SELECT 'search' as type, email, first_name, last_name, status as detail, created_at
      FROM mia_free_searches
      WHERE email NOT LIKE '%missingcash.com.au'
        AND email NOT LIKE '%lensflow.com.au'
        AND email NOT LIKE '%test.%'
        AND email NOT LIKE '%example.com'
      UNION ALL
      SELECT 'finance' as type, email, first_name, last_name, loan_type as detail, created_at
      FROM finance_enquiries
      WHERE email NOT LIKE '%missingcash.com.au'
        AND email NOT LIKE '%test.%'
        AND email NOT LIKE '%example.com'
      UNION ALL
      SELECT 'email_alert' as type, email, first_name, '' as last_name, 'subscribed' as detail, created_at
      FROM email_alerts
      WHERE email NOT LIKE '%missingcash.com.au'
        AND email NOT LIKE '%test.%'
        AND email NOT LIKE '%example.com'
      ORDER BY created_at DESC
      LIMIT 30
    `);

    res.json({
      pageViews: { today: pvToday[0]?.count ?? 0, week: pvWeek[0]?.count ?? 0, total: pvTotal[0]?.count ?? 0 },
      searches: { today: searchesToday[0]?.count ?? 0, week: searchesWeek[0]?.count ?? 0, total: searchesTotal[0]?.count ?? 0, found: searchesFound[0]?.count ?? 0 },
      finance: { today: financeToday[0]?.count ?? 0, week: financeWeek[0]?.count ?? 0, total: financeTotal[0]?.count ?? 0 },
      emailAlerts: { today: emailsToday[0]?.count ?? 0, week: emailsWeek[0]?.count ?? 0, total: emailsTotal[0]?.count ?? 0 },
      charts: { pageViewsByDay: pvByDay, searchesByDay },
      recentActivity: recentActivity.rows,
    });
  } catch (err) {
    logger.error({ err }, "analytics query failed");
    res.status(500).json({ error: "query failed" });
  }
});

export default router;
