import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import dotenv from 'dotenv/config';
import {
  buildDatabaseSsl,
  getDefaultSupabaseDbPort,
  resolveSupabaseDbUser,
} from '../src/config/dbEnv.js';

const { Client } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '../docs/migrations');

const buildClientConfig = () => {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }

  const host = process.env.SUPABASE_DB_HOST || process.env.DBHOST;
  const database = process.env.SUPABASE_DB_NAME || process.env.DATABASENAME;
  const password = process.env.SUPABASE_DB_PASSWORD || process.env.DBPASSWORD;

  if (!host || !database || !password) {
    throw new Error(
      'Set DATABASE_URL or Supabase/Postgres vars (SUPABASE_DB_* or DBHOST, DATABASENAME, DBPASSWORD).',
    );
  }

  const isSupabase = Boolean(process.env.SUPABASE_DB_HOST);
  const sslResult = buildDatabaseSsl({
    sslMode: process.env.SUPABASE_DB_SSL_MODE,
    preferSupabaseDefault: isSupabase,
  });

  if (sslResult?.missingCert) {
    console.warn(`CERTPATH not found (${sslResult.certPath}); continuing without custom CA.`);
  }

  return {
    host,
    port: isSupabase ? getDefaultSupabaseDbPort() : parseInt(process.env.DBPORT || '5432', 10),
    database,
    user: isSupabase
      ? resolveSupabaseDbUser()
      : (process.env.DBUSERNAME || 'postgres'),
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
