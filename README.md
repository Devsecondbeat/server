# server

Server API for Second Beat — used-instruments marketplace (buy/sell). Tutor module is post-MVP.

## Database (required before marketplace routes)

1. Copy `.env.example` to `.env` and set Supabase DB + auth vars (see pooler/SSL notes in migrations README).
2. Run migrations: `npm run db:migrate`
3. Confirm `GET /health/database` returns healthy.

Details: [`docs/migrations/README.md`](./docs/migrations/README.md).
