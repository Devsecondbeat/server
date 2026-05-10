# ADR-0002: Dual-Database Failover Strategy (Supabase Primary + Self-Hosted Postgres Fallback)

**Status:** Accepted (POC phase)  
**Date:** 2026-05-10  
**Deciders:** Engineering team (via design review)  
**Supersedes:** None

## Context
The application requires a PostgreSQL database for persistent storage of `instrument_makes`, `used_instrument_ads`, and `ad_images`. Early in development, the team chose Supabase as the primary hosted Postgres provider for its managed service, built-in auth integration, and generous free tier. However, concerns around vendor lock-in, latency in certain regions, and long-term cost/control led to the decision to also support a self-hosted PostgreSQL instance as a fallback.

The `src/config/databaseManager.js` implements an in-memory connection manager that:
- Attempts to connect to the preferred source (`DB_PREFERRED_SOURCE`).
- Periodically runs health checks (`DB_HEALTH_CHECK_INTERVAL`).
- Automatically switches to the secondary source when the primary becomes unhealthy (if `DB_FALLBACK_ENABLED`).
- Exposes `/health/database` for operational visibility.

No external connection pooler (PgBouncer) or read replicas are configured at this stage.

## Decision
Adopt a **dual-database failover architecture** with the following characteristics:

- **Primary**: Supabase-hosted Postgres (preferred via `DB_PREFERRED_SOURCE=supabase`).
- **Fallback**: Self-hosted PostgreSQL instance (activated automatically when Supabase health checks fail).
- **Mechanism**: In-process health-check loop inside the Node application that maintains a single active `pg.Pool`, switches on failure, and logs the active source.
- **Client impact**: All database access goes through `getPool()` from `src/config/database.js`; models are unaware of which physical database they are talking to.

This provides resilience without introducing additional infrastructure components during the POC phase.

## Alternatives Considered

| Alternative | Pros | Cons | Reason Rejected |
|-------------|------|------|-----------------|
| **Supabase only (no fallback)** | Simplest setup, single source of truth | Single point of failure; vendor risk | Unacceptable for marketplace reliability |
| **Self-hosted Postgres only** | Full control, no vendor dependency | Operational burden (backups, HA, patching) | Defeats the purpose of using Supabase |
| **Read replicas + connection pooling** | Better performance & scaling | Added complexity and cost | Overkill for POC; future optimization |
| **Chosen: Dual failover with in-app manager** | Good resilience, leverages existing Supabase, no extra services | In-process state, potential split-brain on rapid flapping, manual reconciliation if both fail | Best balance for current stage |

## Consequences

**Positive**
- Automatic recovery from Supabase outages without code changes or redeploys.
- Easy local development against a self-hosted Postgres while still validating the failover path.
- Health endpoint gives operators immediate visibility into which database is active.

**Negative**
- Connection state lives in the Node process memory; a crash or restart resets the active source.
- No automatic reconciliation if both databases diverge (requires manual intervention).
- Health-check interval adds a small amount of background load and log noise.

**Future Work**
- When traffic or data volume increases, evaluate introducing PgBouncer, read replicas, or moving to a more robust multi-region setup. A new ADR will document that evolution.

## Observability Requirement
The `/health/database` endpoint and structured logs must clearly report:
- Active database type (`supabase` or `postgresql`)
- Last successful health check timestamp
- Any failover events with before/after sources

---

*Decision reached after reviewing `databaseManager.js`, `database.js`, health routes, and operational requirements during the 2026-05-10 design review.*
