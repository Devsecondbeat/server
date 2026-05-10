# server
Server code for second beat to host the features: Buying/Selling used products, Tutor module

## Health Endpoints
- `GET /health/live` - Liveness probe (always 200 if process healthy)
- `GET /health/ready` - Readiness probe (200 if DB reachable, else 503)
- `GET /health/database` - Database specific health (enhanced)
