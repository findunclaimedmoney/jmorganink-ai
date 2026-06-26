---
name: Contact finder strategy
description: How the pipeline finds phone/email/address for prospects after scraping MoneySmart — 6 sources, collects best independently
---

# Contact Finder Strategy

**File:** `artifacts/api-server/src/lib/contact-finder.ts`

After a name is found on MoneySmart, the pipeline runs ALL 6 sources, collecting best phone + best email independently. It only skips remaining sources once BOTH phone AND email are found.

**Critical fix (June 2026):** Previous version stopped at the first phone-only hit and never searched for email. Now all 6 sources always run unless full hit (phone + email) achieved early.

| Pass | Source | Gets | Proxy type |
|---|---|---|---|
| 1 | DuckDuckGo general search | phone + email | stealth |
| 2 | DuckDuckGo email dork (AU ISP domains: bigpond, iinet, optusnet, tpg etc.) | email only | stealth |
| 3 | Google SERP email dork | email only | stealth |
| 4 | White Pages AU (`whitepages.com.au`) | phone + address | stealth + JS render |
| 5 | Yellow Pages AU (`yellowpages.com.au/search/listings?type=people`) | phone + address | premium + JS render |
| 6 | ABN Lookup (`abr.business.gov.au`) — government fallback | address only (suburb/state) | premium, no JS |

**Why:** Collects best contact independently — a phone from Yellow Pages + email from Google dork = full outreach record, even if no single source had both.

**Why ABN last:** Free government source, no JS needed, confirms the person is a real registered entity in Australia. Address-only but valuable as a last resort.

**Company filter:** `isCompanyName()` checks for PTY, LTD, TRUST, FUND, SUPER, FOUNDATION, ASSOCIATION, etc. — skips entirely before any source is tried.

**How to add more sources:** Insert between Yellow Pages (pass 5) and ABN Lookup (pass 6). ABN should stay last — it's address-only and the government fallback.
