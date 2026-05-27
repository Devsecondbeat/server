# Database migrations

SQL migrations for the used-instruments marketplace. Apply in numeric order against your Supabase (or Postgres) database before running the API.

## Prerequisites

- PostgreSQL 14+ (Supabase projects qualify)
- `user_id` on ads is a **UUID** matching Supabase Auth `sub` (not the legacy integer `users.id`)

## Apply order

| File | Purpose |
|------|---------|
| `000-marketplace-base-schema.sql` | Tables + FKs (`make_id`, `ad_images` CASCADE on ad delete) |
| `001-add-instrument-type.sql` | `instrument_type` column + CHECK constraint |
| `002-seed-instrument-makes.sql` | Reference brands for create-ad |

**Quick apply:** `npm run db:migrate` (set `DATABASE_URL` from Supabase Dashboard → **Connect** → Transaction pooler).

Example (replace password):

```env
DATABASE_URL=postgresql://postgres.<project-ref>:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
```

## How to run (manual)

```bash
psql "$DATABASE_URL" -f docs/migrations/000-marketplace-base-schema.sql
psql "$DATABASE_URL" -f docs/migrations/001-add-instrument-type.sql
psql "$DATABASE_URL" -f docs/migrations/002-seed-instrument-makes.sql
```

Or paste each file into the Supabase SQL editor in order.

Verify after apply:

```bash
curl http://localhost:3000/health/database
curl http://localhost:3000/api/v1/instruments/getinstrumentMakes -H "Authorization: Bearer <token>"
```

## Supabase connection modes

### Direct (development)

| Variable | Example |
|----------|---------|
| `SUPABASE_DB_HOST` | `db.<project-ref>.supabase.co` |
| `SUPABASE_DB_PORT` | `5432` |
| `SUPABASE_DB_USER` | `postgres` |
| `SUPABASE_DB_USE_POOLER` | `false` |

### Pooler (recommended for production)

| Variable | Example |
|----------|---------|
| `SUPABASE_DB_HOST` | `aws-0-<region>.pooler.supabase.com` |
| `SUPABASE_DB_PORT` | `6543` (transaction) or `5432` (session) |
| `SUPABASE_DB_USE_POOLER` | `true` |
| `SUPABASE_DB_USER` | optional — app sets `postgres.<project-ref>` from `SUPABASE_URL` |

Copy exact values from **Supabase → Settings → Database → Connection string**.

## SSL / CERTPATH

- **Supabase hosted:** leave `CERTPATH` unset. `SUPABASE_DB_SSL_MODE=require` uses TLS without a local CA file.
- **Self-hosted fallback:** set `CERTPATH` only if the file exists. Missing paths log a warning instead of ENOENT.
- Remove placeholder `CERTPATH` lines from `.env` rather than pointing at non-existent files.

## Postgres fallback (optional)

MVP on Supabase only:

```env
DB_FALLBACK_ENABLED=false
```

To test failover, set `DBHOST`, `DBPORT`, `DBUSERNAME`, `DATABASENAME`, `DBPASSWORD` and keep `DB_FALLBACK_ENABLED=true`.

## Schema summary

### `instrument_makes`

- `id` SERIAL, `name` TEXT UNIQUE

### `used_instrument_ads`

- `user_id` UUID (Supabase auth subject)
- `make_id` → `instrument_makes.id`
- `instrument_type` — `guitar`, `drums`, `piano`, `accessories` (nullable, CHECK in `001`)
- `created_at` TIMESTAMPTZ

### `ad_images`

- Composite PK `(ad_id, cloudflare_image_id)`
- `ad_id` → `used_instrument_ads.id` **ON DELETE CASCADE**

## Rollback

```sql
DROP TABLE IF EXISTS ad_images CASCADE;
DROP TABLE IF EXISTS used_instrument_ads CASCADE;
DROP TABLE IF EXISTS instrument_makes CASCADE;
```

## Related issues

- [#48](https://github.com/Devsecondbeat/server/issues/48) base schema
- [#49](https://github.com/Devsecondbeat/server/issues/49) instrument_type
- [#50](https://github.com/Devsecondbeat/server/issues/50) seed
- [#51](https://github.com/Devsecondbeat/server/issues/51) FKs
- [#52](https://github.com/Devsecondbeat/server/issues/52) pooler
- [#53](https://github.com/Devsecondbeat/server/issues/53) SSL
- [#54](https://github.com/Devsecondbeat/server/issues/54) fallback
