# ADR-0004: Cloudflare Images Integration for Ad Photographs

**Status:** Accepted (POC phase)  
**Date:** 2026-05-10  
**Deciders:** Engineering team (via design review)  
**Supersedes:** None

## Context
Users must be able to attach up to 5 photographs to each `UsedInstrumentAd`. Storing binary image data directly in PostgreSQL (BLOBs or base64) was considered but rejected early due to:
- Database bloat and backup size
- Lack of automatic image optimization, resizing, and CDN delivery
- Operational complexity of serving images at scale

External image hosting services were evaluated. Cloudflare Images was selected because it offers:
- Direct upload URLs (no server-side proxying of bytes)
- Automatic variant generation (thumbnail, card, full, public)
- Simple REST API for upload + delete
- Generous free tier and tight integration with the team's existing Cloudflare account

The implementation uses `src/services/cloudflareImages.js` which wraps the Cloudflare v2 direct_upload and v1 delete endpoints, plus a `buildDeliveryUrl` helper that constructs `https://imagedelivery.net/...` URLs on the fly.

## Decision
Integrate **Cloudflare Images** as the sole storage and delivery mechanism for ad photographs with these characteristics:

- Client requests upload URLs via `POST /api/v1/instruments/images/upload-urls` (1–5 URLs returned).
- Client uploads bytes directly to Cloudflare using the signed `uploadURL`.
- Only the resulting `cloudflare_image_id` (string) is stored in the `ad_images` table along with `display_order`.
- Delivery URLs are never persisted; they are derived at read time using `buildDeliveryUrl(imageId, variant)`.
- Deletion of images from Cloudflare is best-effort and performed synchronously on ad deletion (see ADR-0001) or individually via the image delete endpoint.

This keeps the database lean and leverages Cloudflare's global CDN for fast image delivery worldwide.

## Alternatives Considered

| Alternative | Pros | Cons | Reason Rejected |
|-------------|------|------|-----------------|
| **Store images in PostgreSQL (bytea / base64)** | Single data store, strong consistency | Database bloat, no CDN, no variants, expensive backups | Unacceptable at even moderate scale |
| **AWS S3 + CloudFront** | Mature, widely used | More moving parts (bucket policy, IAM, signed URLs), higher cost for small POC | Overkill; team already on Cloudflare |
| **Imgix / Cloudinary** | Excellent transformation features | Additional vendor + cost | Unnecessary when Cloudflare provides similar capability at lower cost |
| **Chosen: Cloudflare Images + direct upload** | Fast uploads, automatic variants, simple API, free tier | External dependency, eventual consistency on delete | Best fit for current needs and infrastructure |

## Consequences

**Positive**
- Uploads bypass the server entirely → excellent scalability and low latency for large images.
- Automatic responsive variants reduce client-side image handling.
- Database only stores lightweight references → fast queries and small backups.
- Easy to add new variants later without code changes.

**Negative**
- Image assets live outside the primary database; referential integrity is eventual.
- Requires careful handling of failed uploads (client must retry or clean up dangling IDs).
- Deletion failures leave orphaned images in Cloudflare (mitigated by logging + manual endpoint).

**Future Work**
- Add background cleanup job for orphaned Cloudflare images (see ADR-0001).
- Consider signed delivery URLs or WebP/AVIF variants when performance requirements increase.
- Evaluate Cloudflare R2 + Images API evolution for cost optimization.

## Observability Requirement
All Cloudflare API calls (upload URL request, delete) must log success/failure with the `imageId` (or request count) so that operators can correlate client-side upload failures with backend logs.

---

*Decision reached after reviewing `cloudflareImages.js`, image-related controllers, and storage alternatives during the 2026-05-10 design review.*
