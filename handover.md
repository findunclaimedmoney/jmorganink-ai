# MissingCash — Agent Handover

> **AGENT: Read this entire file before doing anything else. Do not ask questions already answered here.**

---

## ⚠️ What Was Done Most Recently (26 Jun 2026)

### 1. Mia Training Lab — Admin Dashboard Tab
**File:** `artifacts/missingcash/src/pages/AdminDashboard.tsx`

New 4th tab "🧪 Mia Lab" added to the admin dashboard at `/admin`:
- Type a test message → click **▶ Run** → see Mia's response (Response A)
- Edit the system prompt in the textarea → click **▶ Run Again** → Response B appears side-by-side with A (highlighted in gold)
- Toggle between **Boss Mode** and **Customer Mode** prompts
- Prompts are live-loaded from the server — always current

**API endpoints added** (`artifacts/api-server/src/routes/admin-mia.ts`):
- `GET /api/admin/mia/prompts` — returns current `MIA_BOSS_PROMPT` and `MIA_SYSTEM_PROMPT` as JSON
- `POST /api/admin/mia/test` — accepts `{ systemPrompt, message }`, streams SSE response using the custom prompt

### 2. Boss Mode Chat — Admin Dashboard "Talk to Mia" Tab
`POST /api/admin/mia/chat` — uses `MIA_BOSS_PROMPT`, requires `x-admin-password` header.
Mia knows she's talking to the business owner. Has access to `get_pipeline_stats` tool (live DB data).

### 3. Mia Personality Softened (Both Modes)
Both `MIA_SYSTEM_PROMPT` and `MIA_BOSS_PROMPT` updated in `artifacts/api-server/src/lib/mia-knowledge.ts`:
- Removed curt "Be concise. No filler." language
- Added warm, empathetic, caring personality description
- Boss Mode: "warm, caring, supportive — like a trusted colleague who genuinely wants the business to succeed"
- Customer Mode: "warm, kind, genuinely caring — people are often anxious or uncertain when they reach out, so lead with empathy"

### 4. Contact Finder Overhauled (6 Sources)
**File:** `artifacts/api-server/src/lib/contact-finder.ts`
Fixed critical bug: pipeline used to stop at phone-only hits and never searched for email.
Now runs ALL 6 sources, collecting best phone + email independently:

| # | Source | Gets | Proxy |
|---|---|---|---|
| 1 | DuckDuckGo general search | phone + email | stealth |
| 2 | DuckDuckGo email dork (AU ISP domains) | email only | stealth |
| 3 | Google email dork | email only | stealth |
| 4 | White Pages AU | phone + address | stealth + JS |
| 5 | Yellow Pages AU | phone + address | premium + JS |
| 6 | ABN Lookup (gov) | address only (suburb/state) | premium |

Only skips remaining sources if BOTH phone AND email are already found.
Company names (PTY, LTD, TRUST, FUND, etc.) are filtered out before any search via `isCompanyName()`.

### 5. Mystro CRM — Stratton Finance Leads Now Live
Test lead (enquiryId: 12) confirmed flowing directly to Erin/John in Mystro CRM.
Finance enquiry route: `POST /api/finance/enquiry` → saves to DB → emails Resend → Mystro picks it up.

---

## ⚠️ Previous Agent Errors — Do NOT Repeat

### Error: ScrapingBee `premium_proxy` blocked by Cloudflare
`stealth_proxy: true` is required for MoneySmart and DuckDuckGo/Google scraping.
`premium_proxy` uses datacenter IPs — Cloudflare blocks them with 500/613 errors.
**Do not revert to `premium_proxy` for Cloudflare-protected sites.**

### Error: MoneySmart single-letter search (`?name=A`) blocked as bot
Pipeline searches by 10 common Australian surnames per letter — NOT by single letter.
Surname lists are in `SURNAMES_BY_LETTER` constant in `alphabet-scraper.ts`. Do not change this approach.

### Error: Confused missingcash.com.au Cloudflare Worker with MoneySmart scraping
The Cloudflare Worker at `missingcash.jmorganegypt.workers.dev` handles INCOMING traffic to the site.
It has ZERO relationship to OUTBOUND scraping of MoneySmart. They are separate setups. Do not conflate them.

### Error: HeyGen iframe left on live page in broken state
HeyGen avatar ID `05f1da4dc12744c087dace9e0651a6e0` is documented but NOT integrated.
Do not add a HeyGen iframe to any page until the integration is properly built.

### Error: VideoSplash gate blocking all users
Removed. Site loads directly. Do not add any splash/gate screens.

---

## Project Overview

**Purpose:** Australian unclaimed money search service (missingcash.com.au)
**Mia:** Site-wide AI assistant that searches 13 government/financial databases
**Revenue model:** Fee paid upfront via Stripe before claim details are revealed (5%–33% sliding scale based on amount found)
**Partner:** Stratton Finance (Erin Crofton, Wanneroo WA) — finances claim fees for high-value (>$20k) prospects

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + Wouter + Tailwind v4 + shadcn/ui + framer-motion |
| API | Express 5 — runs at `/api` via shared proxy |
| DB | PostgreSQL + Drizzle ORM |
| Emails | Resend — sender: `MissingCash <leads@lensflow.com.au>` |
| Payments | Stripe (checkout sessions, AUD) |
| Scraping | ScrapingBee (~249k credits remaining, AU geo, stealth proxy) |
| AI chat | OpenAI gpt-4o-mini (Mia customer chat + boss chat) |
| AI voice | ElevenLabs — voice ID `x3PfG9wL6FOEApZ1VJ9H` (named "Mia", category `generated`) |

---

## Mia Architecture

### Customer-facing Mia
- **Route:** `POST /api/mia/chat` (streaming SSE)
- **File:** `artifacts/api-server/src/routes/mia.ts`
- **Prompt:** `MIA_SYSTEM_PROMPT` from `mia-knowledge.ts`
- **Stateless** — client holds full message history and POSTs it each time. No DB storage.
- **Tools available:** `lookup_prospect_database`, `search_unclaimed_money`
- **TTS:** `POST /api/mia/tts` → ElevenLabs → `audio/mpeg` (voice toggle in chat header, persisted to localStorage)
- **STT:** NOT built — no microphone input yet (Web Speech API browser-native option available)
- **Open from any page:** `window.dispatchEvent(new CustomEvent('mia:open', { detail: { message, autoSend } }))`

### Boss Mode Mia
- **Route:** `POST /api/admin/mia/chat` (streaming SSE)
- **File:** `artifacts/api-server/src/routes/admin-mia.ts`
- **Auth:** `x-admin-password` header required
- **Prompt:** `MIA_BOSS_PROMPT` from `mia-knowledge.ts`
- **Tools available:** `get_pipeline_stats` — pulls live DB data (total prospects, contacts found, outreach sent, per-letter breakdown)
- **Mia Lab:** `POST /api/admin/mia/test` — accepts any custom `{ systemPrompt, message }`, streams response for A/B comparison

---

## Admin Dashboard (`/admin`)

Password: `missingcash2024` (or `ADMIN_PASSWORD` env var)
Auth: stored in `sessionStorage` for the tab session

**4 Tabs:**

| Tab | What it shows |
|---|---|
| 📊 Live Traffic | Page views, Mia searches, finance leads, email signups — today/7d/all-time + 7-day bar charts + recent activity feed |
| 🤖 Pipeline | A–Z letter progress grid, summary stats, all scraped prospects table, contacts found table, ▶ Start/Resume button |
| 💬 Talk to Mia | Boss Mode chat — private channel, live pipeline stats tool |
| 🧪 Mia Lab | Prompt A/B tester — edit prompt → run same message → compare responses side by side |

**API Routes (all require `x-admin-password`):**

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/admin/pipeline-start` | Start/resume A-Z crawl |
| `POST` | `/api/admin/prospect-crawl` | Crawl single letter `{ letter: "A" }` |
| `GET` | `/api/admin/prospects` | List prospects (`?letter=A&page=1&search=smith`) |
| `GET` | `/api/admin/prospect-stats` | A-Z progress summary |
| `GET` | `/api/admin/analytics` | Live traffic stats |
| `GET` | `/api/admin/audit-export` | CSV download of all outreach sent |
| `POST` | `/api/admin/mia/chat` | Boss Mode chat (streaming SSE) |
| `GET` | `/api/admin/mia/prompts` | Returns current boss + customer prompts |
| `POST` | `/api/admin/mia/test` | Custom prompt A/B test (streaming SSE) |

---

## Alphabet Pipeline (A→Z MoneySmart Crawl)

**Files:** `artifacts/api-server/src/lib/alphabet-scraper.ts` + `contact-finder.ts`

**Full pipeline per letter:**
1. Searches MoneySmart using 10 common AU surnames per letter (NOT `?name=A` — blocked)
2. Stores names + amounts in `prospects` DB table
3. For each prospect: runs 6-source contact finder (see above)
4. If email found → creates Stripe checkout → sends outreach email
5. If phone only → flagged in admin dashboard for manual call/SMS
6. Deletes `not_found` prospects, keeps `found` ones
7. Marks letter done → auto-starts next letter

**Activation:**
- `ALPHABET_PIPELINE_ENABLED=true` → auto-starts on server boot
- OR admin dashboard **▶ Start / Resume** button

**ScrapingBee:** ~249k credits remaining. `stealth_proxy: true` required for Cloudflare sites.

---

## Fee Schedule (Stripe Checkout)

| Amount Found | Fee |
|---|---|
| ≤ $1,000 | 5% |
| ≤ $5,000 | 10% |
| ≤ $30,000 | 15% |
| ≤ $100,000 | 20% |
| > $100,000 | 33% |

For amounts > $20,000: second button in outreach email — "Finance my fee via Stratton →"
Links to `/finance?fn=FIRSTNAME&ln=LASTNAME&email=EMAIL&amount=AMOUNT&source=prospect-finance`

---

## Database Tables

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

## Environment Variables

| Variable | Notes |
|---|---|
| `DATABASE_URL` | PostgreSQL (set via Replit) |
| `OPENAI_API_KEY` | Mia chat (gpt-4o-mini) |
| `ELEVENLABS_API_KEY` | Mia voice — voice ID: `x3PfG9wL6FOEApZ1VJ9H` |
| `RESEND_API_KEY` | Email via lensflow.com.au (verified) |
| `STRIPE_SECRET_KEY` | Checkout sessions |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `SCRAPINGBEE_API_KEY` | Web scraping (~249k credits) |
| `MISSINGCASH_DOMAIN_VERIFIED` | Set `true` once missingcash.com.au verified in Resend — switches sender to branded address AND CCs Erin |
| `ALPHABET_PIPELINE_ENABLED` | Set `true` to auto-start A-Z crawl on server boot |
| `MAX_CONTACTS_PER_LETTER` | Default 300 — ScrapingBee credit guard |
| `ADMIN_PASSWORD` | Default `missingcash2024` |
| `ADMIN_REPORT_EMAIL` | Default `admin@missingcash.com.au` |

---

## Key Partners & Contacts

| | |
|---|---|
| **Stratton Finance** | Erin Crofton · Wanneroo WA · 0432 280 181 · ACL 364340 |
| **Stratton referral email** | integrations@stratton.com.au |
| **Stratton CRM** | Mystro — leads confirmed flowing (tested enquiryId: 12) |
| **Resend verified domain** | lensflow.com.au (`leads@lensflow.com.au`) |
| **Pending Resend verification** | missingcash.com.au — once verified, set `MISSINGCASH_DOMAIN_VERIFIED=true` and redeploy |
| **ElevenLabs voice** | "Mia" — category `generated`, ID `x3PfG9wL6FOEApZ1VJ9H` |
| **HeyGen avatar** | ID `05f1da4dc12744c087dace9e0651a6e0` — NOT integrated yet |
| **MissingCash ABN** | 52 347 989 391 |

---

## Key File Map

```
artifacts/
  api-server/src/
    index.ts                  — server entry, starts auto-search + alphabet pipeline
    lib/
      auto-search.ts          — 3-min search loop + daily 8am admin report
      alphabet-scraper.ts     — A-Z MoneySmart crawl + contact search + auto-progression
      contact-finder.ts       — 6-source contact lookup (DDG x2 + Google + WhitePages + YellowPages + ABN)
      multi-scraper.ts        — 13-database Mia search engine
      mia-knowledge.ts        — ALL Mia prompts (MIA_SYSTEM_PROMPT, MIA_BOSS_PROMPT, tools)
    routes/
      mia.ts                  — POST /api/mia/chat (customer, streaming SSE)
      mia-tts.ts              — POST /api/mia/tts (ElevenLabs voice)
      admin-mia.ts            — boss chat + prompts GET + test endpoint
      finance.ts              — POST /api/finance/enquiry (saves + emails Erin → Mystro)
      analytics.ts            — GET /api/admin/analytics
      prospects.ts            — pipeline admin routes
  missingcash/src/
    pages/
      AdminDashboard.tsx      — /admin (4 tabs: traffic, pipeline, mia chat, mia lab)
      Finance.tsx             — /finance (Stratton partner page, prospect pre-fill from URL params)
      Home.tsx                — / (hero + live ticker)
      Landing.tsx             — /start (TikTok ad landing page, no nav/footer)
    components/
      MiaChat.tsx             — floating AI assistant (TTS built, STT not built)
lib/
  db/src/schema/index.ts      — all DB table definitions (prospects + alphabet_crawl_progress + others)
```

---

## Important Gotchas

- **Electoral roll** is NOT publicly scrapable (Commonwealth Electoral Act 1918). Do not pursue this.
- **missingcash.com.au NOT verified in Resend** — emails send from `leads@lensflow.com.au`. Until verified, Erin is NOT CC'd.
- **Stripe checkout created at email-send time** — if Stripe fails, outreach not sent (no point sending without payment link).
- **`openai` package must stay installed** in api-server even though the import is dynamic — typecheck breaks without it.
- **`mia-poster.jpg`** is the Mia avatar image (NOT `mia-avatar.png` which doesn't exist).
- **Mia is stateless** — no DB conversation tables. Client POSTs full `messages` array each time.
- **Finance.tsx** was reconstructed — original upload was truncated at line 320. Current version is complete.
- **Always update `mia-knowledge.ts`** when adding features — it's Mia's brain. If it goes stale, she gives wrong answers.
- **STT (speech-to-text / microphone input) NOT built** — Mia can speak (ElevenLabs TTS) but cannot hear. Web Speech API is the no-cost option to build this.
