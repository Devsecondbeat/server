#!/usr/bin/env node
/**
 * Sync Supabase keys from .env.staging into the live DO app spec and redeploy.
 * Maps SUPABASE_PUBLISHABLE_KEY -> SUPABASE_ANON_KEY and secret -> SUPABASE_SERVICE_ROLE_KEY.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { resolveSupabaseKeys } from '../src/config/supabaseKeys.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const APP_ID = 'a5bf29fe-60ee-4bf8-9cee-c62bf927761e';
const DOCTL = path.join(root, 'bin/doctl');
const SPEC_PATH = '/tmp/secondbeat-server-spec-sync.yaml';

dotenv.config({ path: path.join(root, '.env.staging') });

const looksLikeFullSupabaseKey = (value) =>
  typeof value === 'string'
  && value.length >= 80
  && !value.includes('your_')
  && !value.includes('REPLACE');

const validateKeys = (clientKey, adminKey) => {
  if (!looksLikeFullSupabaseKey(clientKey)) {
    throw new Error(
      'SUPABASE_PUBLISHABLE_KEY (or client anon key) looks truncated. Copy the full key from Supabase Dashboard > Connect.',
    );
  }
  if (!looksLikeFullSupabaseKey(adminKey)) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY (or sb_secret key) looks truncated. Copy the full secret key from Supabase Dashboard > Settings > API Keys.',
    );
  }
};

const { clientKey, adminKey } = resolveSupabaseKeys(process.env);

if (!clientKey || !adminKey) {
  console.error('Missing Supabase keys in .env.staging.');
  console.error('Required: SUPABASE_PUBLISHABLE_KEY + SUPABASE_SERVICE_ROLE_KEY');
  console.error('Or: SUPABASE_PUBLISHABLE_KEY + SUPABASE_ANON_KEY (sb_secret_...)');
  process.exit(1);
}

try {
  validateKeys(clientKey, adminKey);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const token = process.env.DIGITALOCEAN_ACCESS_TOKEN
  || fs.readFileSync(path.join(root, '.env.staging'), 'utf8')
    .match(/^DIGITALOCEAN_ACCESS_TOKEN=(.+)$/m)?.[1]
    ?.replace(/^["']|["']$/g, '');

if (!token) {
  console.error('DIGITALOCEAN_ACCESS_TOKEN not found in .env.staging');
  process.exit(1);
}

execSync(`${DOCTL} auth init --access-token ${token}`, { stdio: 'ignore' });
execSync(`${DOCTL} apps spec get ${APP_ID} > ${SPEC_PATH}`, { stdio: 'inherit' });

let spec = fs.readFileSync(SPEC_PATH, 'utf8');

const upsertSecret = (key, value) => {
  const block = `  - key: ${key}\n    scope: RUN_AND_BUILD_TIME\n    type: SECRET\n    value: ${JSON.stringify(value)}`;
  const duplicatePattern = new RegExp(`  - key: ${key}\\n[\\s\\S]*?(?=\\n  - key:|\\n  github:|\\n[a-z_]+:)`, 'g');
  if (spec.match(duplicatePattern)) {
    spec = spec.replace(duplicatePattern, '');
  }
  spec = spec.replace(/\n  github:/, `\n${block}\n  github:`);
};

upsertSecret('SUPABASE_ANON_KEY', clientKey);
upsertSecret('SUPABASE_SERVICE_ROLE_KEY', adminKey);

fs.writeFileSync(SPEC_PATH, spec);

console.log('Updating DO app with Supabase client + secret keys...');
execSync(`${DOCTL} apps update ${APP_ID} --spec ${SPEC_PATH}`, { stdio: 'inherit' });
console.log('Triggering deployment...');
execSync(`${DOCTL} apps create-deployment ${APP_ID}`, { stdio: 'inherit' });
console.log('Done. Wait for deployment ACTIVE, then retry signup.');
