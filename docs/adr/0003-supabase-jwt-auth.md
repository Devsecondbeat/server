# ADR-0003: Supabase JWT Authentication with Client-Side Ownership Enforcement

**Status:** Accepted (POC phase)  
**Date:** 2026-05-10  
**Deciders:** Engineering team (via design review)  
**Supersedes:** None

## Context
All marketplace operations (creating, updating, deleting ads, managing images) must be restricted to authenticated users. The team evaluated several authentication approaches:

- Building a custom username/password system with bcrypt + sessions
- Using a different identity provider (Auth0, Firebase, Clerk)
- Leveraging Supabase Auth (already chosen for the database tier)

Because Supabase Auth issues ES256-signed JWTs and provides a public JWKS endpoint, the decision was made to validate tokens server-side using `jsonwebtoken` + `jwks-rsa`. The resulting `req.user.sub` (the Supabase user UUID) is then used for ownership checks inside controllers and models.

No session storage or refresh token handling is performed on the server; clients are expected to manage token lifecycle via the Supabase client SDK.

## Decision
Use **Supabase-issued JWTs verified via JWKS** as the sole authentication mechanism with the following rules:

- Every request to `/api/v1/instruments/*` must include a valid `Authorization: Bearer <token>` header.
- The server verifies the token signature against Supabase's JWKS (cached for 10 minutes) using the ES256 algorithm.
- On successful verification, `req.user` is populated with the decoded claims; `req.user.sub` is treated as the authoritative user identifier.
- Ownership enforcement (user may only modify their own `used_instrument_ads` rows) is performed in the controller layer by comparing `ad.user_id` with `req.user.sub` before allowing update or delete operations.
- Image deletion currently lacks ownership enforcement (known gap documented in DESIGN_DOCUMENT.md).

This approach keeps authentication stateless on the server and reuses the identity system already tied to the database.

## Alternatives Considered

| Alternative | Pros | Cons | Reason Rejected |
|-------------|------|------|-----------------|
| **Custom auth (bcrypt + JWT or sessions)** | Full control | High implementation & security maintenance burden | Reinvents the wheel; diverts focus from marketplace features |
| **Auth0 / Firebase / Clerk** | Mature SDKs, social login | Additional vendor, cost, integration complexity | Unnecessary when Supabase already provides auth + DB |
| **Supabase JWT + server-side ownership checks (chosen)** | Simple, stateless, leverages existing Supabase investment, strong ownership model | Requires careful `user_id` propagation; image delete missing enforcement today | Best fit for current architecture and team size |
| **Row-Level Security (RLS) only** | Database-enforced | Harder to debug, less visibility in application code | Team preferred explicit controller checks for POC |

## Consequences

**Positive**
- No server-side session storage or password hashing required.
- Authentication logic is centralized in one middleware (`authMiddleware.js`).
- Ownership checks are explicit and easy to audit in controllers.
- Clients can use the official Supabase JavaScript client for login, signup, and token refresh.

**Negative**
- Any compromise of Supabase's private signing key would affect this service (mitigated by JWKS rotation and short token expiry).
- Ownership enforcement for `DELETE /ads/:adId/images/:imageId` is still missing (TODO in `adImagesController.js`).
- Token validation failures produce generic 401 responses; more granular error codes could improve client UX.

**Future Work**
- Add ownership enforcement to the image deletion endpoint.
- Consider adding rate limiting and request logging with user context.
- Evaluate moving to Supabase RLS for defense-in-depth once the application matures.

## Observability Requirement
Failed authentication attempts and ownership violations should be logged with the attempted `user_id` (when available) and the target resource ID to support security monitoring and abuse detection.

---

*Decision reached after examining `authMiddleware.js`, controller ownership patterns, and route protection during the 2026-05-10 design review.*
