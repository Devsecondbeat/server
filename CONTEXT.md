# SecondBeat Marketplace Context

## Purpose
SecondBeat is a marketplace platform that enables users to buy and sell used musical instruments. This backend API provides the core functionality for listing, browsing, and managing used instrument advertisements, including image management.

## Core Domain Concepts (Ubiquitous Language)

### User
- Represents an authenticated participant in the marketplace.
- Identified by a Supabase Auth UUID (`user_id` / `req.user.sub`).
- Users can only create, update, or delete their own ads (ownership enforced).

### InstrumentMake
- Reference data representing a musical instrument manufacturer or brand (e.g., Fender, Gibson, Yamaha).
- Stored in `instrument_makes` table.
- Every UsedInstrumentAd must reference exactly one InstrumentMake.

### UsedInstrumentAd (Ad)
- A marketplace listing for a single used instrument.
- Key attributes: name, description, price, condition, make reference, timestamps.
- Belongs to one User (creator/owner).
- Can have zero to many AdImages (maximum 5).

### AdImage
- Represents a photograph attached to a UsedInstrumentAd.
- Stored externally in Cloudflare Images (identified by `cloudflare_image_id`).
- Multiple variants (thumbnail, card, full, public) are generated automatically by Cloudflare.
- Display order is maintained for gallery presentation.
- Max 5 images per ad is a hard business limit.

## Key Business Rules
- Authentication is mandatory for all ad and image operations.
- Ownership: Only the creating user may modify or delete an ad.
- Image limit: No more than 5 images may be attached to any single ad.
- Image storage: Images live in Cloudflare Images; the database only stores references and ordering.
- Deletion of an ad triggers best-effort cleanup of its associated images (see ADR-0001).

## Relationships
- User (1) —owns—> UsedInstrumentAd (many)
- InstrumentMake (1) —referenced by—> UsedInstrumentAd (many)
- UsedInstrumentAd (1) —contains—> AdImage (0..5)

## Notes on Evolution
- The "Tutor module" mentioned in early documentation is currently out of scope for this bounded context.
- Future work includes moving image deletion to a background queue once traffic justifies it (see ADR-0001).

This document captures the shared domain understanding reached during design review on 2026-05-10.
