# server

Server API for Second Beat — used-instruments marketplace (buy/sell). Tutor module is post-MVP.

## Local setup

1. Copy `.env.example` to `.env`. Set `DATABASE_URL` from Supabase **Connect** (transaction pooler URI) plus auth keys.
2. Run migrations: `npm run db:migrate`
3. Start dev server: `npm run dev`
4. Confirm health:
   - `GET /health` — liveness (no DB)
   - `GET /health/database` — database connectivity

Details: [`docs/migrations/README.md`](./docs/migrations/README.md).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Production (`node src/server.js`) — default on DigitalOcean |
| `npm run dev` | Local development (nodemon) |
| `npm test` | Vitest |
| `npm run db:migrate` | Apply SQL migrations |

## Deployment (DigitalOcean App Platform)

**Platform:** DigitalOcean App Platform, region **Bangalore (`blr`)**.  
**Run command:** `npm start` (or `npm run start:prod`)  
**Health check:** `GET /health` (not `/health/database`)

Full guide: [`docs/deployment/digitalocean.md`](./docs/deployment/digitalocean.md)

| Environment | Git branch | App name (suggested) |
|-------------|------------|----------------------|
| Staging | `develop` | `secondbeat-api-staging` |
| Production | `main` | `secondbeat-api-prod` |

Optional App Platform spec: [`.do/app.yaml`](./.do/app.yaml) (template). Staging deploy:

```bash
cp .env.staging.example .env.staging   # fill DIGITALOCEAN_ACCESS_TOKEN, CORS_ORIGIN, keys
npm run db:migrate
npm run deploy:staging
```

See [`docs/deployment/digitalocean.md`](./docs/deployment/digitalocean.md). Pushes to `develop` auto-deploy after the app exists (`deploy_on_push: true`).

External services (configured via app env vars): Supabase (auth + DB), SendGrid (email), Cloudflare Images (ad photos).

## API

- Base path: `/api/v1`
- Auth: Supabase JWT (`Authorization: Bearer <access_token>`)
