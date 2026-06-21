---
name: api-server has no hot reload
description: The Express api-server only picks up code/dependency changes on a workflow restart
---

Rule: After editing `artifacts/api-server` source or adding a dependency, restart the `artifacts/api-server` workflow before testing — it does NOT watch or hot-reload.

**Why:** the dev script is `build && start` (a one-shot esbuild bundle, then `node`). A server that's already running keeps serving the previous bundle, so a test hits stale code. Symptom: the new behaviour appears skipped (e.g. an email send that never fires) and the response is suspiciously fast (no external call happened).

**How to apply:** restart the workflow after every api-server code/dependency change, then re-run the test. Confirm via logs that the new run started (fresh "Server listening") before trusting a test result.
