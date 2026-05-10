# Database Migrations and Rollback Guide

This document describes the current database setup for the Second Beat server, how the schema is managed, and procedures for changes and rollbacks. The project uses raw SQL queries via the `pg` Node.js driver against a PostgreSQL database. There are no automated migration tools (such as Knex.js, Sequelize, or dbmate) integrated at this time.

## Database Connection

- **Driver**: `pg` (PostgreSQL client for Node.js)
- **Configuration**: Loaded from environment variables in `src/config/database.js`:
  - `DBUSERNAME`, `DATABASENAME`, `DBPASSWORD`, `DBPORT`, `DBHOST`
  - SSL enabled with CA certificate from `CERTPATH`
- **Usage**: Each model file (`src/models/*.js`) creates its own `Pool` instance for queries. No shared connection manager beyond the pool.

Connection example (see `src/testConnection.js` for testing).

## Current Database Schema

The schema supports user authentication/registration and used instrument marketplace features. Key tables are inferred from active queries in the models (no `CREATE TABLE` statements exist in the codebase).

### `users` table
Stores registered users, activation, and password reset flows.

| Column                      | Type          | Notes |
|-----------------------------|---------------|-------|
| id                          | SERIAL        | Primary key (RETURNING id on insert) |
| first_name                  | TEXT/VARCHAR  | Required for registration |
| last_name                   | TEXT/VARCHAR  | Required for registration |
| contact_number              | TEXT/VARCHAR  | Phone number |
| email                       | TEXT/VARCHAR  | Unique, used for login/queries |
| encrypted_password          | TEXT          | bcrypt-hashed |
| is_active                   | BOOLEAN       | Set true after email activation |
| activation_token            | TEXT          | Temporary token for signup confirmation |
| activation_token_expiry     | TIMESTAMP     | Expiry for activation link |
| reset_password_token        | TEXT          | Token for password reset |
| reset_password_token_expiry | TIMESTAMP     | Expiry for reset link |

**Key operations** (from `user_model.js`, `user_registration_model.js`):
- Insert on registration
- Select encrypted_password by email
- Update tokens/activation status

### `instrument_makes` table
Reference data for instrument manufacturers/brands.

| Column | Type | Notes |
|--------|------|-------|
| id     | SERIAL | PK |
| name   | TEXT   | e.g., "Fender", "Yamaha" (assumed from SELECT *) |

**Usage**: `SELECT * FROM instrument_makes` (see `instrument_makes_model.js`).

### `used_instrument_ads` table
Marketplace listings for used instruments.

| Column      | Type          | Notes |
|-------------|---------------|-------|
| id          | SERIAL        | PK |
| user_id     | INTEGER       | FK to users.id |
| make_id     | INTEGER       | FK to instrument_makes.id |
| name        | TEXT          | Ad title / instrument name |
| description | TEXT          | Details |
| price       | NUMERIC       | Listing price |
| condition   | TEXT          | e.g., "New", "Used - Good" |

**Key operations** (from `instrument_makes_model.js`):
- CRUD on ads (INSERT, SELECT, UPDATE, DELETE with user scoping)
- Images handled separately via S3 (not in DB schema)

## Running Migrations (Current Process)

Since there is no migration runner:

1. **Manual SQL execution**:
   - Use `psql` CLI connected to your DB (or a tool like pgAdmin, DBeaver).
   - Example: `psql -h $DBHOST -U $DBUSERNAME -d $DATABASENAME -f path/to/your_migration.sql`
   - Or paste `CREATE TABLE ...` / `ALTER TABLE ...` statements directly.

2. **Initial setup**:
   - The database and tables must be created manually before running the app (e.g., via `CREATE DATABASE` and the table definitions above).
   - Populate `instrument_makes` with seed data as needed.

3. **Testing changes**:
   - Run `npm start` (uses nodemon) after DB updates.
   - Use `src/testConnection.js` (edit host/creds temporarily) to verify queries.

**Recommendation for future**: Introduce a lightweight migration tool like [dbmate](https://github.com/amacneil/dbmate) or Knex migrations. Store `.sql` files in a `migrations/` folder and run via npm scripts. This would make schema versioned and reproducible.

## Rollback Procedures

Rollbacks are manual (reverse the SQL change):

- **Schema rollback example**:
  ```sql
  -- To undo an ALTER TABLE ADD COLUMN
  ALTER TABLE users DROP COLUMN new_column;

  -- To undo CREATE TABLE (destructive!)
  DROP TABLE IF EXISTS used_instrument_ads;
  ```
- **Data rollback**: Use transactions in psql (`BEGIN; ... ROLLBACK;`) or restore from backups.
- **Backup first**: Always `pg_dump` before structural changes:
  ```bash
  pg_dump -h $DBHOST -U $DBUSERNAME -d $DATABASENAME > backup_$(date +%Y%m%d).sql
  ```
- **Production caution**: Test rollbacks in staging. Coordinate with team if data loss risk.

## Future Migration Process (Proposed)

When adding features requiring schema changes:

1. Create a new `.sql` file (e.g., `docs/migrations/003_add_user_preferences.sql`) with `CREATE/ALTER` statements + comments.
2. Apply forward in dev/staging/prod using psql or future runner.
3. Document the change here.
4. For rollback, add a corresponding `..._rollback.sql` or note the reverse statements.
5. Update this document with new tables/columns.

This keeps the process practical while the project remains small. If the app grows, migrate to a proper tool to avoid drift.

## References
- Models: `src/models/`
- DB config: `src/config/database.js`
- Related issue: #21 (Document migrations and rollback)
