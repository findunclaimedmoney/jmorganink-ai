---
name: Production DB provisioning (EAI_AGAIN helium)
description: Why a deployed app throws DB connection errors while dev works, and how to fix it
---

Rule: If the **deployed** app throws DB connection errors like `EAI_AGAIN helium...` (or a generic "Server error" on a DB-backed route) while **dev works fine**, the production database was never wired — prod is still trying to reach the dev-only Helium DB host.

**Why:** The Replit Postgres DB can be half-registered. `checkDatabase()` can report `provisioned:false` even though the dev DB is fully working. Publishing is what actually wires the production DB connection and applies the dev schema to prod.

**How to apply:**
1. Run `createDatabase()` — it is idempotent (returns `alreadyExisted` if it's there) and flips `checkDatabase()` to `provisioned:true`.
2. Have the user click **Publish** — the Publish flow wires the prod DB connection and applies schema dev→prod.
3. No application code change is needed for this fix.
