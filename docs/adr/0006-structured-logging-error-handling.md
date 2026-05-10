# ADR-0006: Structured Logging with Winston and Error Propagation Pattern

**Status:** Accepted (POC phase)  
**Date:** 2026-05-10  
**Deciders:** Engineering team (via design review)  
**Supersedes:** None

## Context
Reliable observability is essential for a marketplace that may experience database failovers, Cloudflare API hiccups, and authentication failures. The team needed a logging approach that:

- Captures structured context (not just strings) for easy querying and alerting.
- Avoids leaking secrets (tokens, passwords, full headers).
- Does not swallow errors or produce inconsistent JSON responses.
- Works with the existing Express `next(error)` pattern without requiring a full custom error handler yet.

Winston was chosen because it already supports rotating file transports, structured metadata objects, and multiple log levels. The project rules explicitly prefer `logger` from `src/config/logger.js` over raw `console.*` calls.

## Decision
Adopt the following logging and error-handling conventions across the codebase:

- **Logger usage**: Import the shared Winston logger. Use `logger.info/warn/error/debug` with an object as the second argument for structured metadata:
  ```js
  logger.error('Failed to delete Cloudflare image', { imageId, error: error.message, adId });
  ```
- **Error propagation**: Controllers catch expected outcomes and return appropriate HTTP status codes. Unexpected errors are logged and passed via `next(error)`.
- **No raw console**: ESLint rule + project convention forbids `console.log/error` in application code.
- **Secret hygiene**: Never log `Authorization` headers, raw tokens, or database passwords. Log only non-sensitive identifiers (e.g., `adId`, `userId` suffix).
- **Current limitation**: There is no centralized Express error-handling middleware yet; errors reaching the default handler may produce stack traces or inconsistent shapes in production.

This pattern balances immediate observability needs with the desire to keep the POC lightweight.

## Alternatives Considered

| Alternative | Pros | Cons | Reason Rejected |
|-------------|------|------|-----------------|
| **Bunyan / Pino** | Extremely fast, JSON by default | Another dependency; team already familiar with Winston | Unnecessary change |
| **Only console.log with JSON.stringify** | Zero dependencies | No rotation, no levels, easy to leak secrets | Violates project rules and operational requirements |
| **Full custom error handler + request IDs** | Consistent error shape, great tracing | More code for POC | Deferred until after launch |
| **Chosen: Winston + structured metadata + next(error)** | Good structure today, easy to evolve, secret-safe | Inconsistent error responses until global handler added | Best pragmatic choice |

## Consequences

**Positive**
- Logs are machine-readable and contain rich context for debugging failovers or image cleanup issues.
- Easy to add new transports (e.g., Datadog, Loki) later without changing call sites.
- Secret leakage risk is minimized by convention and review.

**Negative**
- Without a global error handler, some error responses may still leak stack traces or be non-JSON.
- Developers must remember to pass context objects; plain string logs lose value.

**Future Work**
- Introduce a centralized Express error handler that maps known error types to consistent `{ error: '...' }` responses and never leaks stacks in production.
- Add correlation/request IDs to every log line for request tracing.
- Configure log rotation size/time and external shipping for production.

## Observability Requirement
Every error log must include at minimum the error message and stack (for unexpected errors) plus relevant business identifiers (`adId`, `userId`, `imageId`) so that issues can be correlated across Cloudflare, database, and application layers.

---

*Decision reached after reviewing `logger.js`, controller error patterns, and the logging-and-errors rule file during the 2026-05-10 design review.*
