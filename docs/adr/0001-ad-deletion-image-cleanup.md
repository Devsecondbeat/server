# ADR-0001: Synchronous Best-Effort Cloudflare Image Cleanup on UsedInstrumentAd Deletion

**Status:** Accepted (POC phase)  
**Date:** 2026-05-10  
**Deciders:** Engineering team (via design review)  
**Supersedes:** None  
**Superseded by:** Future ADR when background queue is introduced

## Context
When a `UsedInstrumentAd` is deleted via `DELETE /api/v1/instruments/deleteinstrumentAds/:id`, the system must:
- Remove the ad record from the database.
- Clean up any associated `AdImage` records (0–5 per ad).
- Delete the actual image assets stored in Cloudflare Images to avoid ongoing storage costs and permanent orphans.

The codebase already provides:
- `deleteImages(imageIds)` helper in `src/services/cloudflareImages.js` — performs best-effort deletion and returns `{ success: string[], failed: string[] }`.
- `deleteAllAdImages(adId)` in the model layer.
- Transaction support in `marketplace_model.js`.

At the time of this decision the service is in early POC / low-traffic stage. No background job infrastructure (Redis, BullMQ, SQS, etc.) has been deployed.

## Decision
Perform Cloudflare image deletion **synchronously** inside the delete ad flow using the following steps:

1. Verify ad ownership (already implemented).
2. Retrieve the list of `cloudflare_image_id` values for the ad.
3. Call `deleteImages(imageIds)` (best-effort; never throws on partial failure).
4. Log any failed deletions with `adId` and failed IDs for observability.
5. Delete database rows (`ad_images` then `used_instrument_ads`) inside a single transaction.
6. Return HTTP 200 success to the client regardless of Cloudflare outcome.

The ad is considered successfully deleted from the user's perspective once the database transaction commits.

## Alternatives Considered

| Alternative | Pros | Cons | Reason Rejected |
|-------------|------|------|-----------------|
| **Fire-and-forget (no Cloudflare call)** | Simplest code | Permanent orphaned images, ongoing storage cost, violates "clean marketplace" goal | Unacceptable |
| **Require full Cloudflare success before DB delete** | Strong consistency | Poor UX during Cloudflare outages; blocks legitimate user action | Not acceptable for marketplace |
| **Immediate background queue (Redis + worker)** | Non-blocking, retry/DLQ, excellent observability | Introduces new infrastructure, operational overhead, deployment complexity | Overkill for current POC traffic; delays launch |
| **Chosen: Synchronous best-effort** | Reuses existing helpers, fast response, minimal orphan window, easy to evolve | Possible transient orphans on rare Cloudflare failures | Best balance for POC |

## Consequences

**Positive**
- Keeps the delete handler simple and the HTTP response fast.
- Leverages already-implemented `deleteImages()` and `deleteAllAdImages()` helpers.
- No new dependencies or infrastructure for the POC phase.
- Small window for orphaned images (recoverable via existing manual `DELETE /ads/:adId/images/:imageId` endpoint).

**Negative**
- Under transient Cloudflare failures, a small number of images may remain in Cloudflare storage until manually cleaned or a future job runs.
- Requires good structured logging of cleanup failures so operators can investigate.

**Future Work**
- When daily active users or ad volume grows and/or repeated cleanup failures are observed, replace the synchronous step with a background queue worker. A new ADR will supersede this one at that time.

## Observability Requirement
Failed Cloudflare deletions must be logged with sufficient context (`adId`, `failedImageIds`, timestamp, error details) so that operators or a future cleanup job can identify and remediate them.

---

*This decision was reached after exploring the existing model, service, and controller code during the design review session on 2026-05-10.*
