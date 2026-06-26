---
name: MoneySmart crawl strategy
description: Why the alphabet pipeline searches by surname not by letter, and where the surname list lives
---

# MoneySmart Crawl Strategy

## The rule
The alphabet pipeline NEVER searches MoneySmart by single letter (e.g. `?name=A`). Always searches by full surname (e.g. `?name=Anderson`).

**Why:** MoneySmart detects single-letter searches as bot traffic and returns a 500 error. Full surname searches look like real human searches and get through fine. Discovered this when Letter A completed in 35 seconds with 0 results — the ScrapingBee 500 was being silently swallowed.

## Where the surname list lives
`artifacts/api-server/src/lib/alphabet-scraper.ts` — `SURNAMES_BY_LETTER` constant.
Currently 10 surnames per letter, A–Z, hand-curated based on most common Australian surnames.

**How to apply:** If asked to expand coverage or add more names, edit `SURNAMES_BY_LETTER` directly. Do NOT switch back to single-letter searching. Do NOT auto-generate names at runtime — the list must be static and reviewed.

## Two bugs that were also fixed alongside this
1. ScrapingBee fetch now retries 3 times with backoff before giving up (was failing silently on first 500)
2. If all retries fail and pages=0, the letter resets to `pending` instead of being marked `done` — so it retries next pipeline run
