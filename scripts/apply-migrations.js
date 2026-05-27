import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import dotenv from 'dotenv/config';
import { buildDatabaseSsl, buildSupabasePoolConfig } from '../src/config/dbEnv.js';

const { Client } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '../docs/migrations');

const buildClientConfig = () => {
  if (process.env.DATABASE_URL || process.env.SUPABASE_DB_HOST) {
    return buildSupabasePoolConfig();
  }

  const host = process.env.DBHOST;
  const database = process.env.DATABASENAME;
  const password = process.env.DBPASSWORD;

  if (!host || !database || !password) {
    throw new Error(
      'Set DATABASE_URL or Supabase/Postgres vars (SUPABASE_DB_* or DBHOST, DATABASENAME, DBPASSWORD).',
    );
  }

  const sslResult = buildDatabaseSsl({
    sslMode: process.env.DB_SSL_MODE || 'disable',
    preferSupabaseDefault: false,
  });

  return {
    host,
    port: parseInt(process.env.DBPORT || '5432', 10),
    database,
    user: process.env.DBUSERNAME || 'postgres',
    password,
    ssl: sslResult?.ssl ?? sslResult ?? false,
  };
};

const listMigrationFiles = () => fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort();

const applyMigrations = async () => {
  const config = buildClientConfig();
  const client = new Client(config);

  await client.connect();

  try {
    const files = listMigrationFiles();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      console.log(`Applied ${file}`);
    }

    const makes = await client.query('SELECT COUNT(*)::int AS count FROM instrument_makes');
    console.log(`instrument_makes rows: ${makes.rows[0].count}`);
  } finally {
    await client.end();
  }
};

applyMigrations().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
