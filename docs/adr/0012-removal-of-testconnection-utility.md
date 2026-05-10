# ADR-0012: Removal of Unsafe testConnection Utility

**Status:** Accepted (cleanup task, POC phase)  
**Date:** 2026-05-10  
**Deciders:** Engineering team (via design review)  
**Supersedes:** None

## Context
The file `src/testConnection.js` contains a standalone script that creates its own `pg.Pool` using hardcoded or placeholder credentials:

```js
// src/testConnection.js
const pool = new Pool({ /* credentials */ });
```

This file is not imported by any other module and is not part of the official application startup. It was likely used for early manual verification of database connectivity. The `DESIGN_DOCUMENT.md` notes: "Dead/unsafe utility — `src/testConnection.js` contains hardcoded credentials placeholders and creates its own pool; it is not aligned with the connection manager and is risky if ever populated."

Because the application now uses the centralized `getPool()` from `src/config/database.js` (which respects `DB_PREFERRED_SOURCE`, failover, SSL, and health checks), any code that bypasses this manager risks:
- Using stale or incorrect credentials
- Creating multiple connection pools (resource leak)
- Bypassing the failover and logging mechanisms

## Decision
**Delete `src/testConnection.js`** (and any references to it) before the repository is considered production-ready. The functionality it provided is fully replaced by:

- `GET /health/database` endpoint (uses the managed pool and reports active source)
- The connection manager's own health-check and reconnect logic

No migration or replacement script is needed.

## Alternatives Considered

| Alternative | Pros | Cons | Reason Rejected |
|-------------|------|------|-----------------|
| **Keep file but empty credentials** | Preserves history | Still dead code; risk of accidental execution with real creds | No benefit |
| **Refactor to use getPool()** | Could become a useful diagnostic script | Adds maintenance burden for a one-off tool | Better to rely on the health endpoint |
| **Chosen: Delete entirely** | Removes risk, reduces repository noise | None | Simplest and safest |

## Consequences

**Positive**
- Eliminates a source of credential leakage and pool-management inconsistency.
- Reinforces the rule "never create new DB pools in application code" (documented in `.cursor/rules/db-models.mdc`).
- Keeps the codebase smaller and easier to audit.

**Negative**
- Developers lose a quick local connectivity test script (mitigated by the health endpoint and `npm run start` which already validates the pool on boot).

**Future Work**
- Confirm the file is not referenced in any npm script, documentation, or CI job.
- Add a repository search for `new Pool` outside of `databaseManager.js` as part of the security checklist.
- Supersede this ADR once the file is removed and the repository is clean.

## Observability Requirement
None — this is a static cleanup decision. After deletion, running `npm test` (once tests exist) or a simple `node -e "import('./src/config/database.js').then(m => m.getPool())"` will be sufficient to verify connectivity.

---

*Decision reached after reviewing `testConnection.js`, the database connection manager, and the explicit technical-debt note in DESIGN_DOCUMENT.md during the 2026-05-10 design review.*
