---
name: Mia Lab
description: Admin dashboard A/B prompt tester — run same message against two different prompts and compare responses side by side
---

# Mia Lab

**Tab:** "🧪 Mia Lab" in admin dashboard at `/admin` (4th tab)
**Built:** June 2026 — user's design concept, not auto-generated

## How it works

1. User types a test message
2. Clicks **▶ Run** → Response A appears (uses current prompt)
3. User edits the system prompt in the textarea below
4. Clicks **▶ Run Again** → Response B appears side by side with A (highlighted in gold)
5. Compare. Clear and start again.

Toggle between **Boss Mode** and **Customer Mode** prompts at top right. Switching mode loads the live prompt from the server and resets A/B.

## API endpoints

Both require `x-admin-password` header. File: `artifacts/api-server/src/routes/admin-mia.ts`

- `GET /api/admin/mia/prompts` → `{ boss: string, customer: string }` — current live prompts
- `POST /api/admin/mia/test` → `{ systemPrompt: string, message: string }` → streaming SSE response

## Why this exists

The user's philosophy: an AI prompt tester should be the FIRST thing built before any AI feature. Lets you freeze a scenario, edit Mia's instructions, replay the exact same message, and see the difference immediately — without deploying or restarting anything.

**How to apply:** When changing Mia's personality or instructions, the user expects to verify changes in the Lab before confirming them. Always tell the user to test in the Lab after prompt changes.
