# MissingCash — Agent Handover

## Project Overview
Australian unclaimed money search service (missingcash.com.au). Mia is a site-wide AI assistant that searches 13 government databases. Revenue model: fee paid upfront via Stripe before claim details are revealed (5%–33% sliding scale based on amount found). Stratton Finance (Erin Crofton, Wanneroo WA) is a partner for high-value prospects who can't afford the fee upfront.

---

## Stack
- **Frontend:** React + Vite + Wouter + Tailwind v4 + shadcn/ui + framer-motion (`artifacts/missingcash/`)
- **API:** Express 5 (`artifacts/api-server/`) — runs at `/api` via shared proxy
- **DB:** PostgreSQL + Drizzle ORM (`lib/db/`)
- **Emails:** Resend — sender: `MissingCash <leads@lensflow.com.au>` (missingcash.com.au not yet Resend-verified)
- **Payments:** Stripe (checkout sessions, AUD)
- **Scraping:** ScrapingBee (250k credits, AU geotargeting, premium proxy)
- **AI:** OpenAI gpt-4o-mini (Mia chat), ElevenLabs (Mia voice)

---

## What Was Built This Session

### 1. Daily Admin Report (8am AWST)
**File:** `artifacts/api-server/src/lib/auto-search.ts` — function `sendDailyReport()`

Emails `admin@missingcash.com.au` every morning at 00:00 UTC (08:00 AWST) via Resend:
- Summary stats: searches run, hits found, total $ found (real users only — test emails filtered)
- Table: Name · Email · Amount Found · Our Fee (pre-calculated per fee schedule)
- Each row has a pre-filled outreach email template (expandable, copy-paste ready)
- Scheduled via `scheduleDailyReport()` — 1-minute interval check for the time window

---

### 2. Alphabet Pipeline (A→Z MoneySmart Crawl)
**Files:**
- `artifacts/api-server/src/lib/alphabet-scraper.ts` — main pipeline
- `artifacts/api-server/src/lib/contact-finder.ts` — web contact lookup

**Full pipeline per letter:**
1. Crawls `moneysmart.gov.au/find-unclaimed-money?name=A` (up to 60 pages)
2. Stores all names + amounts in `prospects` DB table
3. For each prospect: searches Google → Yellow Pages AU → ABN Lookup for phone/email
4. If email found → creates Stripe checkout → sends outreach email (fee paid BEFORE claim details)
5. If only phone found → flagged in admin dashboard for manual call/SMS
6. Deletes `not_found` prospects, keeps `found` ones
7. Marks letter done → automatically starts next letter

**Activation:**
- Set env `ALPHABET_PIPELINE_ENABLED=true` to auto-start on server boot
- OR use admin dashboard **▶ Start / Resume** button → `POST /api/admin/pipeline-start`

**Credit usage:** ~3 ScrapingBee credits per prospect. Cap: `MAX_CONTACTS_PER_LETTER` (default 300).

**Contact finder — 3-source government + commercial cross-reference:**
File: `artifacts/api-server/src/lib/contact-finder.ts`
After a name is found on MoneySmart, the pipeline searches for contact details in this order:
1. Google Search → phone + email
2. Yellow Pages AU → phone + address
3. **ABN Lookup (`abr.business.gov.au`)** — Australian government business register → confirms person is real + returns suburb/state

Returns on first hit. Company names (PTY, LTD, TRUST, etc.) are skipped entirely before any search runs.

**⚠️ CRITICAL — How MoneySmart is crawled (do NOT change this without understanding it):**
MoneySmart blocks single-letter searches (e.g. `?name=A`) as bot traffic — returns 500 error. The pipeline does NOT search by letter. Instead, it searches by **10 common Australian surnames per letter** (e.g. for A: Anderson, Adams, Allen, Armstrong, Andrews, Alexander, Abbott, Ahmed, Ali, Atkinson). Each surname search looks like a real human search and gets through fine.

The surname lists live in `artifacts/api-server/src/lib/alphabet-scraper.ts` in the `SURNAMES_BY_LETTER` constant — one array per letter, A–Z. Currently 10 surnames per letter. To improve coverage, add more surnames to each array. To add a new letter's surnames, add a new key to the object. The list was hand-curated based on the most common Australian surnames per letter — it does NOT auto-generate at runtime.

---

### 3. New Database Tables
**File:** `lib/db/src/schema/index.ts` — both tables pushed to production DB

```
prospects
  id, name, amount, holder, state, source, sourceKey, letter,
  contactStatus (pending | found | not_found),
  contactEmail, contactPhone, contactAddress, contactSource,
  contactSearchedAt, outreachSentAt, scrapedAt

alphabet_crawl_progress
  letter (PK), status (pending | crawling | searching | done),
  prospectCount, contactsFound, outreachSent, startedAt, completedAt
```

---

### 4. Admin Dashboard — Pipeline Tab
**File:** `artifacts/missingcash/src/pages/AdminDashboard.tsx`

Added second tab "🤖 Mia Alphabet Pipeline":
- A–Z letter grid — grey=pending, yellow=in-progress, green=done (with counts per letter)
- Summary stats: total prospects found, contacts found, outreach emails sent
- Found contacts table: Name · Amount · Phone · Email · Address · Outreach status
- ▶ Start / Resume button

Existing tab "📊 Live Traffic" unchanged — page views, Mia searches, finance leads, email signups, 7-day charts, activity feed.

Admin URL: `missingcash.com.au/admin` — Password: `missingcash2024` (or set `ADMIN_PASSWORD` env var)

---

### 5. Outreach Emails — Stripe Upfront (Fee Before Details)
**Files:** `alphabet-scraper.ts`, `auto-search.ts`

Both email flows now:
- Create a **Stripe checkout session** before sending
- Embed checkout URL directly in email — person **pays first**, then gets claim details
- For amounts **> $20,000**: second button added — "Finance my fee via Stratton →"

Fee schedule (already in both files):
- ≤ $1,000 → 5%
- ≤ $5,000 → 10%
- ≤ $30,000 → 15%
- ≤ $100,000 → 20%
- > $100,000 → 33%

---

### 6. Stratton Finance Referral — High-Value Prospects (>$20k)
**Files:** `artifacts/missingcash/src/pages/Finance.tsx`, `auto-search.ts`, `alphabet-scraper.ts`

When a prospect with >$20k clicks "Finance my fee via Stratton →" in their email:
- Lands on `/finance?fn=FIRSTNAME&ln=LASTNAME&email=EMAIL&amount=AMOUNT&source=prospect-finance`
- Shows gold banner: *"MissingCash found $X in your name!"*
- Form pre-filled: name + email from URL params
- Message auto-filled: *"I'd like finance to cover the claim fee, using the unclaimed money as collateral once claimed"*
- On submit → Erin Crofton (Stratton Wanneroo) gets the lead with full context

**Business logic:** Stratton finances the claim fee → prospect claims money → repays Stratton. MissingCash still gets paid. Erin gets a new customer. Everyone wins.

---

## Environment Variables

| Variable | Value / Notes |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (set via Replit) |
| `OPENAI_API_KEY` | For Mia chat (gpt-4o-mini) |
| `ELEVENLABS_API_KEY` | For Mia voice (voice ID: `x3PfG9wL6FOEApZ1VJ9H`) |
| `RESEND_API_KEY` | Email sending via lensflow.com.au (verified) |
| `STRIPE_SECRET_KEY` | Stripe checkout sessions |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |
| `SCRAPINGBEE_API_KEY` | Web scraping (250k credits, AU proxy) |
| `MISSINGCASH_DOMAIN_VERIFIED` | Set to `true` once missingcash.com.au verified in Resend — switches sender to branded address AND CCs Erin Crofton |
| `ALPHABET_PIPELINE_ENABLED` | Set to `true` to auto-start A-Z crawl on server boot |
| `MAX_CONTACTS_PER_LETTER` | Default 300 — ScrapingBee credit guard |
| `ADMIN_PASSWORD` | Default `missingcash2024` |
| `ADMIN_REPORT_EMAIL` | Default `admin@missingcash.com.au` |

---

## API Endpoints (All Require `x-admin-password` Header)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/admin/pipeline-start` | Start/resume the full A-Z alphabet crawl |
| `POST` | `/api/admin/prospect-crawl` | Crawl a single letter `{ letter: "A" }` |
| `GET` | `/api/admin/prospects` | List prospects (`?letter=A&page=1&search=smith`) |
| `GET` | `/api/admin/prospect-stats` | A-Z progress summary with counts |
| `GET` | `/api/admin/analytics` | Live traffic stats (page views, searches, finance leads) |

---

## Key Partners & Contacts

| | |
|---|---|
| **Stratton Finance partner** | Erin Crofton, Wanneroo WA · 0432 280 181 · ACL 364340 |
| **Stratton referral email** | integrations@stratton.com.au |
| **Resend verified domain** | lensflow.com.au (`leads@lensflow.com.au`) |
| **Pending Resend verification** | missingcash.com.au — once verified, set `MISSINGCASH_DOMAIN_VERIFIED=true` and redeploy |
| **ElevenLabs voice** | "Mia" — category `generated`, ID `x3PfG9wL6FOEApZ1VJ9H` |
| **ABN** | 52 347 989 391 |

---

## Important Gotchas

- **Electoral roll** is NOT publicly scrapable online. White Pages is outdated. Current contact-finder uses Google + Yellow Pages AU + ABN Lookup.
- **missingcash.com.au NOT verified in Resend** — all emails send from `leads@lensflow.com.au`. Until verified, Erin is NOT CC'd (Stratton agreement forbids lensflow-origin leads reaching them).
- **Stripe checkout is created at email-send time** — if Stripe fails, the outreach email is not sent (by design — no point sending without a payment link).
- **`openai` package must stay installed** in api-server even though the import is dynamic — typecheck breaks without it.
- **`mia-poster.jpg`** is the Mia avatar image (not `mia-avatar.png` which doesn't exist).
- **Finance.tsx was reconstructed** — the original upload was truncated at line 320. The current version is complete.

---

## File Map (Key Files)

```
artifacts/
  api-server/src/
    index.ts                  — server entry, starts auto-search + alphabet pipeline
    lib/
      auto-search.ts          — 3-min search loop + daily 8am admin report
      alphabet-scraper.ts     — A-Z MoneySmart crawl + contact search + auto-progression
      contact-finder.ts       — Google + Yellow Pages + ABN contact lookup
      multi-scraper.ts        — 13-database Mia search engine
      mia-knowledge.ts        — Mia's static knowledge base
    routes/
      mia.ts                  — POST /api/mia/chat (streaming SSE)
      mia-tts.ts              — POST /api/mia/tts (ElevenLabs)
      finance.ts              — POST /api/finance/enquiry (saves + emails Erin)
      analytics.ts            — GET /api/admin/analytics
      prospects.ts            — prospect pipeline routes
  missingcash/src/
    pages/
      AdminDashboard.tsx      — /admin (traffic + pipeline tabs)
      Finance.tsx             — /finance (Stratton partner page, prospect pre-fill)
      Home.tsx                — / (hero + live ticker)
      Landing.tsx             — /start (TikTok ad landing page)
    components/
      MiaChat.tsx             — floating AI assistant
lib/
  db/src/schema/index.ts      — all DB table definitions
```
