---
name: Contact finder strategy
description: How the pipeline finds phone/email/address for prospects after scraping MoneySmart
---

# Contact Finder Strategy

**File:** `artifacts/api-server/src/lib/contact-finder.ts`

After a name is found on MoneySmart, the pipeline tries three sources IN ORDER, returning on the first hit:

1. **Google Search** — searches `"FirstName LastName" [state] contact phone email` via ScrapingBee. Returns phone + email if found.
2. **Yellow Pages AU** (`yellowpages.com.au/search/listings?type=people`) — returns phone + address.
3. **ABN Lookup** (`abr.business.gov.au`) — Australian government business register. Returns suburb/state address only (no phone/email), but confirms the person is real and locatable.

**Why ABN Lookup:** It's a free government source that doesn't require JS rendering, and it cross-references that the name is a real registered entity in Australia. It gives a suburb even when Google and Yellow Pages fail.

**How to apply:** If adding more contact sources, insert them between Yellow Pages and ABN Lookup (ABN should stay last as it gives address-only). Do NOT remove ABN — it's the government cross-reference fallback. Company names are filtered out before any search via `isCompanyName()`.
