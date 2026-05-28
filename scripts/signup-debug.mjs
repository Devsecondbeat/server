#!/usr/bin/env node
/**
 * Run signup flow locally with staging env and verbose logs.
 * Usage: node --env-file=.env.staging scripts/signup-debug.mjs [email]
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

dotenv.config({ path: path.join(root, '.env.staging') });
dotenv.config({ path: path.join(root, '.env'), override: false });
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'debug';

const email = process.argv[2] || `debug-${Date.now()}@example.com`;
const password = process.argv[3] || 'password123';

const { getActivationRedirectUrl } = await import('../src/config/authRedirects.js');
const { getSupabaseKeyDiagnostics } = await import('../src/config/supabaseKeys.js');
const { createSignupWithActivationLink } = await import('../src/services/supabaseAuth.js');
const { sendActivationEmail } = await import('../src/Utils/sendEmail.js');

console.log('\n--- Supabase key diagnostics (safe) ---');
console.log(JSON.stringify(getSupabaseKeyDiagnostics(), null, 2));

console.log('\n--- Step 1: Supabase generateLink ---');
try {
  const { user, activationLink } = await createSignupWithActivationLink({
    email,
    password,
    metadata: { first_name: 'Debug', last_name: 'Test' },
    redirectTo: getActivationRedirectUrl(),
  });
  console.log('OK userId:', user.id);

  console.log('\n--- Step 2: SendGrid activation email ---');
  await sendActivationEmail(email, activationLink, 'Debug Test');
  console.log('OK email sent');
} catch (error) {
  console.error('\nFAILED at:', error.signupStep || 'unknown');
  console.error('message:', error.message);
  console.error('code:', error.code);
  console.error('status:', error.status);
  process.exit(1);
}
