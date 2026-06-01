#!/usr/bin/env node
/**
 * Live API E2E — hits every HTTP route against a running server.
 *
 * Usage:
 *   node --env-file=.env.staging scripts/run-api-e2e.mjs
 *
 * Auth (pick one):
 *   API_TEST_EMAIL + API_TEST_PASSWORD — your activated staging user
 *   Or omit both: script creates a confirmed user via Supabase admin (needs service role key)
 *
 * Optional:
 *   API_BASE_URL (default https://secondbeat-server-nywxc.ondigitalocean.app)
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { resolveSupabaseKeys } from '../src/config/supabaseKeys.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

dotenv.config({ path: path.join(root, '.env.staging') });
dotenv.config({ path: path.join(root, '.env'), override: false });

const baseUrl = (process.env.API_BASE_URL || 'https://secondbeat-server-nywxc.ondigitalocean.app').replace(/\/$/, '');

const results = [];

const record = (name, status, ok, detail = '') => {
  results.push({ name, status, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${status}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const jsonFetch = async (name, path, options = {}) => {
  const url = `${baseUrl}${path}`;
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    record(name, 0, false, error.message);
    return { status: 0, body: null };
  }

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text?.slice(0, 120);
  }

  return { status: res.status, body };
};

const expectStatus = (name, res, allowed, detailFn) => {
  const allowedList = Array.isArray(allowed) ? allowed : [allowed];
  const ok = allowedList.includes(res.status);
  const detail = detailFn?.(res) || (!ok && typeof res.body === 'object' ? res.body?.error : String(res.body).slice(0, 80));
  record(name, res.status, ok, ok ? '' : detail);
  return ok;
};

const ensureTestUser = async () => {
  let email = process.env.API_TEST_EMAIL;
  let password = process.env.API_TEST_PASSWORD;

  if (email && password) {
    console.log(`\nUsing API_TEST_EMAIL (${email})\n`);
    return { email, password, ephemeral: false };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const { adminKey } = resolveSupabaseKeys();
  if (!supabaseUrl || !adminKey) {
    throw new Error('Set API_TEST_EMAIL/API_TEST_PASSWORD or SUPABASE_URL + service role key in .env.staging');
  }

  email = `e2e-${Date.now()}@example.com`;
  password = `E2eTest-${Date.now()}!9`;
  const admin = createClient(supabaseUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: 'E2E', last_name: 'Runner' },
  });

  if (error) {
    throw new Error(`Supabase admin createUser failed: ${error.message}`);
  }

  console.log(`\nCreated ephemeral confirmed user: ${email}\n`);
  return { email, password, ephemeral: true };
};

const login = async (email, password) => {
  const res = await jsonFetch('POST /api/v1/auth/login', '/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!expectStatus('POST /api/v1/auth/login', res, 200, (r) => r.body?.error)) {
    throw new Error('Login failed');
  }
  return res.body.session;
};

const main = async () => {
  console.log(`\nAPI E2E base URL: ${baseUrl}\n`);

  let res = await jsonFetch('GET /', '/');
  expectStatus('GET /', res, 200);

  res = await jsonFetch('GET /health', '/health');
  expectStatus('GET /health', res, 200);

  res = await jsonFetch('GET /health/database', '/health/database');
  expectStatus('GET /health/database', res, [200, 503]);

  res = await jsonFetch('GET /api/v1/unknown', '/api/v1/unknown');
  expectStatus('GET /api/v1/unknown', res, 404);

  res = await jsonFetch('POST /api/v1/auth/signup (invalid)', '/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email: 'bad', password: 'short' }),
  });
  expectStatus('POST /api/v1/auth/signup (invalid)', res, 400);

  res = await jsonFetch('POST /api/v1/auth/activation/resend (invalid)', '/api/v1/auth/activation/resend', {
    method: 'POST',
    body: JSON.stringify({ email: 'bad' }),
  });
  expectStatus('POST /api/v1/auth/activation/resend (invalid)', res, 400);

  res = await jsonFetch('POST /api/v1/auth/refresh (missing token)', '/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  expectStatus('POST /api/v1/auth/refresh (missing token)', res, 400);

  res = await jsonFetch('POST /api/v1/auth/logout', '/api/v1/auth/logout', { method: 'POST' });
  expectStatus('POST /api/v1/auth/logout', res, 200);

  res = await jsonFetch('POST /api/v1/auth/password/recovery', '/api/v1/auth/password/recovery', {
    method: 'POST',
    body: JSON.stringify({ email: 'nobody@example.com' }),
  });
  expectStatus('POST /api/v1/auth/password/recovery', res, 200);

  res = await jsonFetch('GET /instruments (no auth)', '/api/v1/instruments/getinstrumentMakes');
  expectStatus('GET /instruments/getinstrumentMakes (no auth)', res, 401);

  const { email, password } = await ensureTestUser();
  const session = await login(email, password);
  const token = session.access_token;
  const refreshToken = session.refresh_token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  res = await jsonFetch('GET /api/v1/auth/me', '/api/v1/auth/me', { headers: authHeaders });
  expectStatus('GET /api/v1/auth/me', res, 200);
  const userId = res.body?.user?.id;

  res = await jsonFetch('GET /api/v1/auth/verify', '/api/v1/auth/verify', { headers: authHeaders });
  expectStatus('GET /api/v1/auth/verify', res, 200);

  res = await jsonFetch('POST /api/v1/auth/verify', '/api/v1/auth/verify', {
    method: 'POST',
    headers: authHeaders,
  });
  expectStatus('POST /api/v1/auth/verify', res, 200);

  res = await jsonFetch('POST /api/v1/auth/refresh', '/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  expectStatus('POST /api/v1/auth/refresh', res, 200);

  res = await jsonFetch('GET /api/v1/instruments/getinstrumentMakes', '/api/v1/instruments/getinstrumentMakes', {
    headers: authHeaders,
  });
  expectStatus('GET /api/v1/instruments/getinstrumentMakes', res, 200);
  const makes = Array.isArray(res.body) ? res.body : [];
  const makeId = makes[0]?.id ?? 1;

  res = await jsonFetch('GET /api/v1/instruments/getinstrumentAds', '/api/v1/instruments/getinstrumentAds?type=guitar&make_id=1&condition=good', {
    headers: authHeaders,
  });
  expectStatus('GET /api/v1/instruments/getinstrumentAds', res, 200);

  if (userId) {
    res = await jsonFetch(
      'GET /api/v1/instruments/getinstrumentAdsbyUser/:id',
      `/api/v1/instruments/getinstrumentAdsbyUser/${userId}`,
      { headers: authHeaders },
    );
    expectStatus('GET /api/v1/instruments/getinstrumentAdsbyUser/:id', res, 200);
  } else {
    record('GET /api/v1/instruments/getinstrumentAdsbyUser/:id', 0, false, 'no user id from /me');
  }

  res = await jsonFetch('POST /api/v1/instruments/createinstrumentAds', '/api/v1/instruments/createinstrumentAds', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      make_id: makeId,
      name: `E2E Guitar ${Date.now()}`,
      description: 'Automated E2E test listing',
      price: 199,
      condition: 'good',
    }),
  });
  const createdOk = expectStatus('POST /api/v1/instruments/createinstrumentAds', res, 201);
  const adId = res.body?.data?.id;

  if (createdOk && adId) {
    res = await jsonFetch(
      'PUT /api/v1/instruments/updateinstrumentAds/:id',
      `/api/v1/instruments/updateinstrumentAds/${adId}`,
      {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          description: 'Updated by E2E',
          price: 249,
          condition: 'excellent',
        }),
      },
    );
    expectStatus('PUT /api/v1/instruments/updateinstrumentAds/:id', res, 200);

    res = await jsonFetch(
      'GET /api/v1/instruments/ads/:adId/images/can-add',
      `/api/v1/instruments/ads/${adId}/images/can-add?count=1`,
      { headers: authHeaders },
    );
    expectStatus('GET /api/v1/instruments/ads/:adId/images/can-add', res, 200);

    res = await jsonFetch(
      'GET /api/v1/instruments/ads/:adId/images',
      `/api/v1/instruments/ads/${adId}/images`,
      { headers: authHeaders },
    );
    expectStatus('GET /api/v1/instruments/ads/:adId/images', res, 200);

    res = await jsonFetch(
      'POST /api/v1/instruments/images/upload-urls',
      '/api/v1/instruments/images/upload-urls',
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ count: 1 }),
      },
    );
    expectStatus('POST /api/v1/instruments/images/upload-urls', res, [200, 503]);

    res = await jsonFetch(
      'DELETE /api/v1/instruments/deleteinstrumentAds/:id',
      `/api/v1/instruments/deleteinstrumentAds/${adId}`,
      { method: 'DELETE', headers: authHeaders },
    );
    expectStatus('DELETE /api/v1/instruments/deleteinstrumentAds/:id', res, 200);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n--- ${results.length - failed.length}/${results.length} passed ---\n`);
  if (failed.length > 0) {
    process.exit(1);
  }
};

main().catch((error) => {
  console.error('\nE2E aborted:', error.message);
  process.exit(1);
});
