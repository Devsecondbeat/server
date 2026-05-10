# Architecture Decision Records (ADRs) — SecondBeat Server

This directory contains Architecture Decision Records for the SecondBeat marketplace backend. Each ADR documents a significant, hard-to-reverse technical choice, the alternatives considered, and the rationale.

## Summary Table

| ADR | Title | Key Decision | Status | Date |
|-----|-------|--------------|--------|------|
| [0001](0001-ad-deletion-image-cleanup.md) | Synchronous Best-Effort Cloudflare Image Cleanup on UsedInstrumentAd Deletion | Best-effort synchronous deletion of Cloudflare images when an ad is deleted; background queue deferred until higher scale | Accepted (POC) | 2026-05-10 |
| [0002](0002-dual-database-failover.md) | Dual-Database Failover Strategy (Supabase Primary + Self-Hosted Postgres Fallback) | In-process health-check manager switches between Supabase and self-hosted Postgres automatically | Accepted (POC) | 2026-05-10 |
| [0003](0003-supabase-jwt-auth.md) | Supabase JWT Authentication with Client-Side Ownership Enforcement | ES256 JWTs verified via JWKS; `req.user.sub` used for ownership checks in controllers | Accepted (POC) | 2026-05-10 |
| [0004](0004-cloudflare-images-integration.md) | Cloudflare Images Integration for Ad Photographs | Direct-upload URLs from client; only `cloudflare_image_id` stored in DB; delivery URLs derived at read time | Accepted (POC) | 2026-05-10 |
| [0005](0005-layered-architecture.md) | Strict Layered Architecture (Routes → Controllers → Models → Services) | Enforced separation: routes for wiring, controllers for HTTP, models for SQL, services for external APIs | Accepted (POC) | 2026-05-10 |
| [0006](0006-structured-logging-error-handling.md) | Structured Logging with Winston and Error Propagation Pattern | Winston with metadata objects; `next(error)` for unexpected failures; no secret leakage | Accepted (POC) | 2026-05-10 |
| [0007](0007-centralized-error-handler.md) | Deferred Centralized Express Error Handler | No global `app.use((err, req, res, next))` yet; controllers handle known errors; global handler deferred until post-launch | Accepted (POC) | 2026-05-10 |
| [0008](0008-api-naming-and-versioning.md) | API Endpoint Naming Convention and Versioning Strategy | Keep inconsistent v1 names; introduce `/api/v2` for future clean redesign; no renaming in place | Accepted (POC) | 2026-05-10 |
| [0009](0009-testing-and-ci-strategy.md) | Deferred Automated Testing and CI Pipeline for Initial Launch | Launch without tests or CI; rely on manual Bruno testing + pre-commit hooks; add tests post-launch | Accepted (POC) | 2026-05-10 |
| [0010](0010-image-deletion-ownership-enforcement.md) | Ownership Enforcement Gap on Ad Image Deletion Endpoint | Authenticated but no ownership check on `DELETE /ads/:adId/images/:imageId`; TODO to add `getAdOwner` comparison; high-priority post-launch fix | Accepted (known gap) | 2026-05-10 |
| [0011](0011-legacy-upload-route-header-logging.md) | Legacy Upload Route Header Logging Risk | `POST /uploadImages` logs raw `req.headers` (including Authorization JWT); route is dead code and must be deleted before production | Accepted (security debt) | 2026-05-10 |
| [0012](0012-removal-of-testconnection-utility.md) | Removal of Unsafe testConnection Utility | `src/testConnection.js` creates its own `pg.Pool` with placeholder credentials; bypasses the managed connection manager; delete entirely | Accepted (cleanup) | 2026-05-10 |

## How to Read These Records
- Start with `CONTEXT.md` (root) for the domain language and core concepts.
- Read ADRs in numeric order to understand the cumulative architectural choices.
- Each ADR follows the same structure: Context → Decision → Alternatives → Consequences → Future Work.

## Status Legend
- **Accepted (POC)**: Decision is in effect for the initial launch and low-traffic phase.
- **Accepted (known gap / security debt / cleanup)**: Documented risk or task that must be addressed post-launch.
- Future ADRs will supersede earlier ones when the system evolves (e.g., background queue, global error handler, v2 API, ownership enforcement fix).

_Last updated: 2026-05-10_