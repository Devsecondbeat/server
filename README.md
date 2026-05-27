# server

Server API for Second Beat — used-instruments marketplace (buy/sell). Tutor module is post-MVP.

## Database (required before marketplace routes)

1. Copy `.env.example` to `.env`. Set `DATABASE_URL` from Supabase **Connect** (transaction pooler URI) plus auth keys.
2. Run migrations: `npm run db:migrate`
3. Confirm `GET /health/database` returns healthy.

Details: [`docs/migrations/README.md`](./docs/migrations/README.md).

## Scripts

- `npm start` — development (nodemon)
- `npm run start:prod` — production
- `npm test` — Vitest
- `npm run lint` — ESLint
- `npm run db:migrate` — apply SQL migrations

## API

- `GET /health/database` — database health
- `/api/v1/auth/*` — Supabase auth (signup, login, refresh, emails)
- `/api/v1/instruments/*` — marketplace (Bearer JWT required)
