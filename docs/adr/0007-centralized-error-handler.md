# ADR-0007: Deferred Centralized Express Error Handler

**Status:** Accepted (POC phase)  
**Date:** 2026-05-10  
**Deciders:** Engineering team (via design review)  
**Supersedes:** None

## Context
The Express application currently handles errors in a decentralized way:
- Controllers catch expected validation or business-rule errors and return explicit `res.status(4xx).json({ error: '...' })`.
- Unexpected errors are logged and forwarded with `next(error)`.
- There is no `app.use((err, req, res, next) => { ... })` middleware that guarantees a consistent JSON error shape or prevents stack traces from leaking in production.

The `DESIGN_DOCUMENT.md` explicitly calls out this gap: "No centralized Express error handler is shown; controllers sometimes log and `next(error)` without a guaranteed consistent JSON error response format."

Adding a global handler now would require deciding on error taxonomy, status-code mapping, and whether to include request IDs — all of which add scope for the POC.

## Decision
**Defer** the introduction of a centralized error-handling middleware until after the initial launch and once real error patterns are observed in production.

In the interim:
- Controllers remain responsible for returning appropriate status codes for known failure modes.
- All unexpected errors continue to be logged with full context and passed to `next(error)`.
- The default Express error handler (or a minimal catch-all) is accepted as a temporary safety net.

This keeps the POC surface area small while still providing usable error responses for the happy and common error paths.

## Alternatives Considered

| Alternative | Pros | Cons | Reason Rejected |
|-------------|------|------|-----------------|
| **Implement full error handler now** | Consistent responses, no stack leaks, easy to add request IDs | Requires upfront design of error types and status mapping; adds code for POC | Overkill until real usage reveals the actual error distribution |
| **Use a library (express-async-errors, boom, etc.)** | Less custom code | Another dependency, learning curve | Unnecessary for current needs |
| **Chosen: Defer + rely on controller-level handling** | Fast to ship, controllers already do the right thing for known cases | Inconsistent shape for rare/unexpected errors | Pragmatic for POC launch |

## Consequences

**Positive**
- No additional code or design debt introduced during the critical launch window.
- Controllers stay focused and explicit about the HTTP outcomes they produce.
- Real production errors will inform the eventual handler design (which errors are common? which need custom messages?).

**Negative**
- A small number of unexpected errors may still return HTML or stack traces until the handler is added.
- Clients cannot yet rely on a single `{ error: string, code?: string }` shape for every failure.

**Future Work**
- After launch, analyze production error logs and introduce a centralized handler that:
  - Maps known error classes to appropriate status codes.
  - Never leaks stack traces in production.
  - Optionally attaches a correlation ID.
- A new ADR will document the final handler design.

## Observability Requirement
Until the global handler exists, every controller that calls `next(error)` must ensure the error has already been logged with sufficient context so that the failure is visible even if the response is non-JSON.

---

*Decision reached after reviewing controller error patterns and the explicit technical-debt note in DESIGN_DOCUMENT.md during the 2026-05-10 design review.*
