# ADR-0008: API Endpoint Naming Convention and Versioning Strategy

**Status:** Accepted (POC phase)  
**Date:** 2026-05-10  
**Deciders:** Engineering team (via design review)  
**Supersedes:** None

## Context
The current marketplace API endpoints under `/api/v1/instruments/` use inconsistent naming styles:

- `getinstrumentMakes`
- `getinstrumentAds`
- `getinstrumentAdsbyUser/:id`
- `createinstrumentAds`
- `updateinstrumentAds/:id`
- `deleteinstrumentAds/:id`

Some are camelCase, some mix "byUser", and none follow a consistent RESTful or resource-oriented pattern. There is also no explicit API versioning strategy beyond the `/api/v1` prefix (e.g., no semantic versioning, no deprecation policy).

The `DESIGN_DOCUMENT.md` lists this as technical debt: "API naming consistency — Endpoints and handlers use inconsistent casing (`getinstrumentMakes`, `createinstrumentAds`, etc.), which complicates long-term API evolution/versioning."

Changing names now would break existing Bruno collections and any early client integrations.

## Decision
**Accept the current inconsistent naming for the POC launch** and adopt a pragmatic versioning approach:

- Keep all existing endpoint paths unchanged until a deliberate v2 redesign.
- When a breaking change or major refactor is required, introduce a new version prefix (`/api/v2/...`) rather than renaming in place.
- New endpoints created after launch should follow a clearer resource-oriented style (e.g., `GET /api/v2/instruments/makes`, `POST /api/v2/instruments/ads`).
- Document the inconsistency in this ADR so future developers understand it is intentional temporary debt, not oversight.

This avoids churn for early consumers while providing a clean path forward.

## Alternatives Considered

| Alternative | Pros | Cons | Reason Rejected |
|-------------|------|------|-----------------|
| **Fix naming immediately** | Clean, consistent API from day one | Breaks all existing clients and test collections | Unacceptable for POC timeline |
| **No versioning, just rename later** | Simple | Forces clients to update URLs when names change | High risk of breaking changes |
| **Chosen: Keep current names + version on future changes** | Zero breaking changes for POC, clear migration path | Inconsistent names persist for the life of v1 | Best balance of speed and future safety |

## Consequences

**Positive**
- Existing Bruno collections, mobile/web clients, and documentation remain valid.
- Launch is not delayed by refactoring URLs and regenerating collections.
- Future v2 can be designed cleanly without legacy constraints.

**Negative**
- v1 endpoints will always look inconsistent; new developers may be confused.
- IDE auto-completion and OpenAPI generation are slightly harder.

**Future Work**
- When preparing v2, define a consistent naming convention (kebab-case or camelCase, plural resources, etc.) and publish a migration guide.
- Consider generating OpenAPI/Swagger specs from the route layer to enforce consistency going forward.

## Observability Requirement
None specific — this is a static design decision rather than a runtime behavior.

---

*Decision reached after examining `usedinstruments.js` routes and the naming-debt note in DESIGN_DOCUMENT.md during the 2026-05-10 design review.*
