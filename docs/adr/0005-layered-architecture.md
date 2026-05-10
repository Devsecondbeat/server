# ADR-0005: Strict Layered Architecture (Routes → Controllers → Models → Services)

**Status:** Accepted (POC phase)  
**Date:** 2026-05-10  
**Deciders:** Engineering team (via design review)  
**Supersedes:** None

## Context
As the codebase grew from a simple Express server to include authentication, database failover, Cloudflare integration, and business rules (ownership, image limits, transactions), the team needed a clear way to organize code so that:

- HTTP concerns (validation, response shaping) stay separate from persistence logic.
- External service calls (Cloudflare, future SendGrid) are isolated and testable.
- Database access uses a single shared connection manager (`getPool()`) and never creates new pools in application code.

Without an explicit structure, there was a risk of controllers becoming fat with SQL or business logic leaking into routes.

## Decision
Enforce a **strict layered architecture** with the following responsibilities and constraints:

| Layer | Directory | Responsibility | What it may NOT do |
|-------|-----------|----------------|--------------------|
| **Routes** | `src/routes/` | Path matching, middleware composition, route registration | Business logic, SQL, external calls |
| **Controllers** | `src/controllers/` | Request parsing, validation, calling models/services, mapping results to HTTP responses | Direct SQL, raw `pg` queries, new DB pools |
| **Models** | `src/models/` | All SQL queries, transactions, data shaping, business rule enforcement (e.g., MAX_IMAGES_PER_AD) | HTTP concerns, response formatting |
| **Services** | `src/services/` | Wrappers around external APIs (Cloudflare Images, SendGrid) | Database access, HTTP handling |
| **Config / Middleware** | `src/config/`, `src/middleware/` | Cross-cutting concerns (logger, DB manager, auth) | Feature-specific logic |

All local imports must use explicit `.js` extensions (ES Modules rule). Controllers and models communicate only through well-defined function calls; no direct module coupling beyond the layer boundaries.

This structure was chosen to keep the codebase navigable and to make future growth (new features, testing, onboarding) easier.

## Alternatives Considered

| Alternative | Pros | Cons | Reason Rejected |
|-------------|------|------|-----------------|
| **Flat structure (everything in one folder)** | Quick to start | Rapidly becomes unmaintainable | Not suitable even for POC |
| **Feature folders (co-located routes+controllers+models per domain)** | Good for large domains | More ceremony for small marketplace feature | Overkill for current scope |
| **Strict layered (chosen)** | Clear ownership, easy to enforce via code review, testable | Slightly more files to navigate | Best long-term investment for a growing team |
| **DDD-style aggregates / repositories** | Rich domain model | Heavy for a simple CRUD marketplace | Premature complexity |

## Consequences

**Positive**
- Any developer can quickly locate where a change belongs.
- Database connection rules (single pool via `getPool()`) are easy to enforce.
- External service changes (e.g., swapping Cloudflare) are isolated to the services layer.
- Controllers remain thin and focused on HTTP concerns.

**Negative**
- More files and imports for simple operations.
- Requires discipline during code review to prevent leakage (e.g., a controller importing `pg` directly).

**Future Work**
- Add integration tests that exercise full layers.
- Consider extracting a small "repository" abstraction inside models if query complexity grows.
- Document the layer contract in a CONTRIBUTING.md section.

## Observability Requirement
When a layer boundary is crossed (e.g., controller → model), any errors should be logged with enough context (`operation`, `params summary`) so that the failing layer is obvious from logs.

---

*Decision reached after reviewing the `src/` directory layout, import patterns, and controller/model responsibilities during the 2026-05-10 design review.*
