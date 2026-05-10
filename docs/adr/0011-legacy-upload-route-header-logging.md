# ADR-0011: Legacy Upload Route Header Logging Risk

**Status:** Accepted (known security debt, POC phase)  
**Date:** 2026-05-10  
**Deciders:** Engineering team (via design review)  
**Supersedes:** None

## Context
The route `POST /uploadImages` (mounted outside the `/api/v1` versioned prefix) contains code that logs the entire `req.headers` object:

```js
// legacy route
console.log(req.headers); // or similar
```

This route is not part of the current documented API surface and appears to be a remnant from early development. Logging raw headers is dangerous because the `Authorization` header (containing the Supabase JWT) and any other sensitive metadata will be written to logs, potentially exposing tokens if logs are viewed, shipped to external systems, or accidentally committed.

The `DESIGN_DOCUMENT.md` explicitly flags this: "A legacy route logs `req.headers` (`/uploadImages`), which risks leaking secrets (e.g., `Authorization`)."

## Decision
**Disable or remove the legacy `/uploadImages` route** before any production deployment, and ensure the logging statement is deleted. Until that cleanup occurs, the route must not be exercised in any environment where real JWTs are used.

The recommended action is to delete the entire route handler and its mounting point, as the functionality has been replaced by the properly designed `POST /api/v1/instruments/images/upload-urls` flow that uses Cloudflare direct uploads.

## Alternatives Considered

| Alternative | Pros | Cons | Reason Rejected |
|-------------|------|------|-----------------|
| **Keep route but sanitize logs** | Minimal change | Still dead code; risk remains if someone re-enables logging | No value in keeping unused route |
| **Move route behind stricter auth + redacted logging** | Could preserve functionality | Unclear what the route was meant to do; better to use the new image upload flow | Unnecessary complexity |
| **Chosen: Delete route and logging statement** | Eliminates secret-leakage vector entirely, reduces attack surface | Requires removing a few lines of code | Clear win for security hygiene |

## Consequences

**Positive**
- Removes a high-risk source of credential leakage from the codebase.
- Reduces the number of routes that must be maintained, documented, or secured.
- Aligns with the project's "never log secrets" rule stated in the logging guidelines.

**Negative**
- Any external client or test that was still calling the old `/uploadImages` endpoint will break (unlikely, since the new flow is the documented one).

**Future Work**
- Search the entire codebase (including Bruno collections and any client code) for references to `/uploadImages` and remove them.
- Add a pre-commit or CI check that fails if `req.headers` or raw `Authorization` appears in log statements.
- Supersede this ADR once the route is confirmed deleted and no references remain.

## Observability Requirement
After removal, verify that no log output (file or console) ever contains JWT tokens or other sensitive header values. The existing Winston logger configuration already discourages raw header logging; this ADR reinforces that policy.

---

*Decision reached after examining the legacy route in the route files and the explicit warning in DESIGN_DOCUMENT.md during the 2026-05-10 design review.*
