# ADR-0010: Ownership Enforcement Gap on Ad Image Deletion Endpoint

**Status:** Accepted (known gap, POC phase)  
**Date:** 2026-05-10  
**Deciders:** Engineering team (via design review)  
**Supersedes:** None

## Context
The endpoint `DELETE /api/v1/instruments/ads/:adId/images/:imageId` allows an authenticated user to delete a specific image attached to an ad. While the route is protected by the `authMiddleware` (JWT required), the controller (`removeAdImage` in `adImagesController.js`) performs **no ownership check** before deleting the `ad_images` row or calling `deleteImage` on Cloudflare.

In contrast, the ad-level delete (`DELETE /deleteinstrumentAds/:id`) and update operations correctly fetch the ad owner and compare it to `req.user.sub`. The image deletion path was left with a TODO comment: "TODO: Add authentication/authorization check here".

This creates a security gap: any authenticated user who knows (or guesses) an `adId` and `imageId` pair can delete images belonging to other users' ads.

## Decision
**Accept the gap for the immediate POC launch** but treat it as high-priority post-launch remediation. The short-term mitigation is:

- The endpoint remains authenticated (JWT required).
- No anonymous or public access is possible.
- Because ad IDs are sequential integers and image IDs are Cloudflare UUIDs, casual enumeration is difficult but not impossible.

A follow-up task will add the missing ownership verification (fetch ad owner via `getAdOwner` or a lightweight query, compare to `req.user.sub`, return 403 on mismatch) before the service handles real user data at scale.

## Alternatives Considered

| Alternative | Pros | Cons | Reason Rejected |
|-------------|------|------|-----------------|
| **Fix ownership check before launch** | Eliminates security gap immediately | Requires additional model query and test effort; delays first deploy | Acceptable risk for closed POC with limited users |
| **Make image deletion require ad ownership token** | Stronger security | Changes client contract, more complex | Over-engineering for POC |
| **Chosen: Authenticated only + post-launch fix** | Fast launch, still better than public access | Window of exposure for early users | Pragmatic given timeline |

## Consequences

**Positive**
- Launch is not blocked by one additional authorization check.
- The gap is explicitly documented and scheduled for remediation.

**Negative**
- Any authenticated user who can obtain an `adId` + `imageId` can delete another user's image (data loss / vandalism risk).
- Cloudflare delete is irreversible; deleted images cannot be recovered.

**Future Work**
- Implement the ownership check in `removeAdImage` (reuse existing `getAdOwner` pattern).
- Add an integration test that verifies a user cannot delete another user's image.
- Consider adding the same check to the "can-add" and list-images endpoints if they ever expose private data.
- Supersede this ADR once the fix is merged.

## Observability Requirement
Once the check is added, failed ownership attempts on image deletion should be logged with `adId`, `imageId`, and the requesting `userId` for security auditing.

---

*Decision reached after reviewing `adImagesController.js`, the TODO comment, and comparing it to the ownership logic in `instrumentMakesController.js` during the 2026-05-10 design review.*
