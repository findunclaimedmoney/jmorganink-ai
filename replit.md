# MissingCash

An Australian unclaimed-money search service: helps people find money held by the ATO, ASIC, and banks, with guidance on claiming it, a crypto-recovery section, a Stratton Finance loans page, and "Mia", a site-wide AI assistant.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Frontend (React + Vite + Wouter + Tailwind v4 + shadcn/ui + framer-motion): `artifacts/missingcash/`
  - Pages: `src/pages/` — Home, Finance, Crypto, Guides, FindMyMoney, DeceasedEstate, LotteryChecker, AustraliaMap, Contact, Privacy, ThankYou, not-found
  - Components: `src/components/` — NavBar, Footer, MiaChat, TrustTicker, UnclaimedTicker, EmailAlertSignup
  - SEO: `src/hooks/use-page-seo.ts` — sets title/description/keywords/OG/Twitter meta per page
  - Theme: navy `#061826` background, gold `#f5b942` primary — defined in `src/index.css` via `@theme`
- API (Express 5, routed at `/api` via shared proxy): `artifacts/api-server/`
  - Mia chat route: `POST /api/mia/chat` (streaming SSE) — built
  - Mia voice route: `POST /api/mia/tts` (ElevenLabs TTS → audio/mpeg) — built
  - Email alerts route needed: `POST /api/alerts/subscribe`
  - Finance enquiry route needed: `POST /api/finance/enquiry`
- Static assets (PDFs, videos, images): `artifacts/missingcash/public/`

## Architecture decisions

- Mia is a **stateless** assistant: no DB tables for conversations. Client holds history and POSTs full `messages` array; server streams SSE response. Client parses manually (codegen can't model SSE).
- MiaChat listens to `window.dispatchEvent(new CustomEvent('mia:open', { detail: { message, autoSend } }))` — any page can open it and optionally auto-send a message.
- Finance.tsx posts enquiries to `/api/finance/enquiry` — Stratton Finance partner (Erin Crofton, Wanneroo WA, 0432 280 181, ACL 364340).
- Static site assets remain in `public/` and are served by Vite at root paths — PDFs, videos, images all accessible.
- Finance.tsx was truncated in the original upload at line 320 mid-JSX — it was reconstructed manually with loan calculator + enquiry form.

## Product

- **Home**: hero search + live unclaimed ticker ($2.6B+ ticking up every second), trust signals, FAQ.
- **Find My Money**: step-by-step search guide across ATO, ASIC, banks, state registers.
- **Crypto**: lost/inaccessible crypto recovery guidance.
- **Finance**: Stratton Finance loans page (Erin Crofton, Wanneroo/Perth) with loan calculator and enquiry form.
- **Guides**: premium PDF guides for sale via Stripe — MissingCash guide, crypto recovery, cyber security, identity theft.
- **Deceased Estate**: guide for finding unclaimed money in deceased estates.
- **Lottery Checker**: check old lottery tickets.
- **Australia Map**: state-by-state guide to unclaimed money registers.
- **Mia**: site-wide floating AI assistant — floating "Ask Mia" button, streaming chat, animated avatar.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Integrations

- **ElevenLabs** — Mia's voice. Her cloned voice is the one literally named "Mia" (category `generated`, id `x3PfG9wL6FOEApZ1VJ9H`), set as `ELEVENLABS_VOICE_ID` (voice IDs are not secret; `ELEVENLABS_API_KEY` is the secret). TTS route: `POST /api/mia/tts` ({text}) → `audio/mpeg`, model `eleven_turbo_v2_5`. Frontend plays it after each Mia reply, with a voice on/off toggle in the chat header (persisted to localStorage).
- **HeyGen** — avatar id `05f1da4dc12744c087dace9e0651a6e0` (this is a HeyGen id, NOT an ElevenLabs voice id). Talking-avatar integration not yet wired.
- **OpenAI** — `mia.ts` uses `gpt-4o-mini` via a dynamic `import("openai")` when `OPENAI_API_KEY` is set; otherwise Mia streams the knowledge fallback. The `openai` package must stay installed — api-server typecheck breaks without it even though the import is dynamic.

## Gotchas

- Finance.tsx was truncated in the original file upload (320 lines, cut mid-JSX). If rebuilding, reconstruct manually.
- `mia-avatar.png` does not exist in `public/` — MiaChat uses `mia-poster.jpg` as the avatar image.
- MiaChat expects streaming SSE from `POST /api/mia/chat`. Until that endpoint is built it will show an error message gracefully.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
