---
name: Mia voice & avatar (ElevenLabs / HeyGen)
description: How Mia's voice is wired, which voice ID is hers, and the openai/secrets gotchas around it
---

# Mia voice (ElevenLabs) & avatar (HeyGen)

## Which voice is Mia's
- Mia's real voice is the ElevenLabs voice **literally named "Mia"** (category `generated`, id `x3PfG9wL6FOEApZ1VJ9H`). Do not guess a premade voice.
- Discover voices via the ElevenLabs `GET /v1/voices` API (use the `xi-api-key` header). Don't keep a debug route for this in the server — list it ad hoc, pick the id, then remove the route.
- The id in `replit.md` under HeyGen (`05f1da4dc12744c087dace9e0651a6e0`) is a **HeyGen** id, NOT an ElevenLabs voice id. Don't confuse them.
- **Why:** the project gives both a HeyGen and an ElevenLabs key; it's easy to grab the wrong id and ship the wrong voice.
- **How to apply:** voice IDs are not secret — store as `ELEVENLABS_VOICE_ID` env (shared), keep `ELEVENLABS_API_KEY` as the secret. TTS uses model `eleven_turbo_v2_5`.

## openai package must stay installed
- `artifacts/api-server/src/routes/mia.ts` calls `await import("openai")` (dynamic) only when `OPENAI_API_KEY` is set; without the key Mia streams a knowledge fallback and the import never runs.
- Even though it's a dynamic import behind a runtime gate, the `openai` package must remain a dependency or `pnpm --filter @workspace/api-server run typecheck` fails with TS2307.
- **Why:** the runtime works fine without the package (fallback path), so it's tempting to think it's unused — but typecheck/build still resolves the import type.

## Newly-added secrets visibility
- A secret added during the session is visible only to **running workflows**, not to ad-hoc `bash` or the `code_execution` sandbox (`process.env` is empty there).
- **How to apply:** to exercise a new key, hit the running api-server through the `localhost:80` proxy (e.g. `curl`), never read the key in a shell. Restart workflows after adding secrets so they pick them up.

## Frontend playback (MiaChat.tsx)
- After a streamed chat reply completes, the client POSTs the cleaned text to `/api/mia/tts` and plays the returned blob via `Audio()`.
- Playback is guarded by a monotonic `speechIdRef` token so stale in-flight requests (mute / close / unmount / rapid re-send) can't start playing; object URLs are revoked on every stop/replace/cleanup path to avoid leaks.
- Voice on/off is a header toggle persisted to `localStorage` ("mia-voice"); the latest value is read via a ref inside `sendMessage` so toggling mid-stream is respected.
