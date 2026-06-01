#!/usr/bin/env node
/**
 * Live staging: upload a sample image to Cloudflare and attach it to a new ad.
 *
 *   API_BASE_URL=https://secondbeat-server-nywxc.ondigitalocean.app \
 *     node --env-file=.env.staging scripts/test-staging-ad-image-upload.mjs
 *
 * Optional:
 *   API_TEST_EMAIL, API_TEST_PASSWORD (else ephemeral Supabase user)
 *   IMAGE_COUNT=5 (1–5, default 1)
 *   AD_ID=4 — attach to existing ad via PUT (else creates a new ad)
 *   CLEANUP_AD=0 — do not delete the ad when done
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

const baseUrl = (
  process.env.API_BASE_URL || 'https://secondbeat-server-nywxc.ondigitalocean.app'
).replace(/\/$/, '');
const cleanupAd = process.env.CLEANUP_AD !== '0';
const imageCount = Math.min(5, Math.max(1, parseInt(process.env.IMAGE_COUNT || '1', 10)));
const existingAdId = process.env.AD_ID ? parseInt(process.env.AD_ID, 10) : null;

/** Minimal 1×1 PNG */
const SAMPLE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const log = (step, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail ? ` — ${detail}` : ''}`);
};

const api = async (apiPath, options = {}) => {
  const res = await fetch(`${baseUrl}${apiPath}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
};

const ensureTestUser = async () => {
  const email = process.env.API_TEST_EMAIL;
  const password = process.env.API_TEST_PASSWORD;
  if (email && password) {
    return { email, password };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const { adminKey } = resolveSupabaseKeys();
  if (!supabaseUrl || !adminKey) {
    throw new Error('Set API_TEST_EMAIL/PASSWORD or Supabase admin keys in .env.staging');
  }

  const ephemeralEmail = `img-e2e-${Date.now()}@example.com`;
  const ephemeralPassword = `E2eTest-${Date.now()}!9`;
  const admin = createClient(supabaseUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.createUser({
    email: ephemeralEmail,
    password: ephemeralPassword,
    email_confirm: true,
  });
  if (error) throw new Error(error.message);
  return { email: ephemeralEmail, password: ephemeralPassword };
};

const main = async () => {
  console.log(`\nStaging ad + image upload test\nBase URL: ${baseUrl}`);
  console.log(`Images: ${imageCount}, cleanup ad: ${cleanupAd}, existing adId: ${existingAdId ?? '(new ad)'}\n`);

  const { email, password } = await ensureTestUser();
  console.log(`User: ${email}\n`);

  let res = await api('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200 || !res.body?.session?.access_token) {
    log('POST /api/v1/auth/login', false, res.body?.error || res.status);
    process.exit(1);
  }
  log('POST /api/v1/auth/login', true);
  const auth = { Authorization: `Bearer ${res.body.session.access_token}` };

  res = await api('/api/v1/instruments/getinstrumentMakes', { headers: auth });
  if (res.status !== 200 || !Array.isArray(res.body) || res.body.length === 0) {
    log('GET /api/v1/instruments/getinstrumentMakes', false, String(res.status));
    process.exit(1);
  }
  const makeId = res.body[0].id;
  log('GET /api/v1/instruments/getinstrumentMakes', true, `make_id=${makeId}`);

  res = await api('/api/v1/instruments/images/upload-urls', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ count: imageCount }),
  });
  if (res.status !== 200 || !res.body?.uploadUrls?.length) {
    log('POST /api/v1/instruments/images/upload-urls', false, res.body?.error || res.status);
    process.exit(1);
  }
  const uploadSlots = res.body.uploadUrls;
  log('POST /api/v1/instruments/images/upload-urls', true, `count=${uploadSlots.length}`);

  const cloudflareImageIds = [];
  for (let i = 0; i < uploadSlots.length; i += 1) {
    const { uploadURL, id } = uploadSlots[i];
    const form = new FormData();
    form.append('file', new Blob([SAMPLE_PNG], { type: 'image/png' }), `sample-${i + 1}.png`);
    const uploadRes = await fetch(uploadURL, { method: 'POST', body: form });
    const uploadText = await uploadRes.text();
    let uploadBody;
    try {
      uploadBody = uploadText ? JSON.parse(uploadText) : null;
    } catch {
      uploadBody = uploadText?.slice(0, 120);
    }
    if (!uploadRes.ok) {
      log(`POST Cloudflare uploadURL #${i + 1}`, false, `${uploadRes.status} ${JSON.stringify(uploadBody)}`);
      process.exit(1);
    }
    cloudflareImageIds.push(id);
    log(`POST Cloudflare uploadURL #${i + 1}`, true, id);
  }

  await new Promise((r) => setTimeout(r, 3000));

  let adId = existingAdId;

  if (existingAdId) {
    res = await api(`/api/v1/instruments/updateinstrumentAds/${existingAdId}`, {
      method: 'PUT',
      headers: auth,
      body: JSON.stringify({
        description: `Updated with ${imageCount} staging test images at ${new Date().toISOString()}`,
        price: 150,
        condition: 'good',
        imageIds: cloudflareImageIds,
      }),
    });
    if (res.status !== 200) {
      log('PUT /api/v1/instruments/updateinstrumentAds/:id (imageIds)', false, res.body?.error || res.status);
      process.exit(1);
    }
    log('PUT /api/v1/instruments/updateinstrumentAds/:id (imageIds)', true, `adId=${existingAdId}, images=${res.body?.data?.images?.length ?? '?'}`);
  } else {
    const adPayload = {
      make_id: makeId,
      name: `Staging image test ${Date.now()}`,
      description: `Live staging test with ${imageCount} sample PNGs via imageIds`,
      price: 150,
      condition: 'good',
      imageIds: cloudflareImageIds,
    };

    res = await api('/api/v1/instruments/createinstrumentAds', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify(adPayload),
    });
    if (res.status !== 201 || !res.body?.data?.id) {
      log('POST /api/v1/instruments/createinstrumentAds (with imageIds)', false, res.body?.error || res.status);
      process.exit(1);
    }
    adId = res.body.data.id;
    log('POST /api/v1/instruments/createinstrumentAds (with imageIds)', true, `adId=${adId}, images=${res.body.data.images?.length ?? 0}`);
  }

  res = await api(`/api/v1/instruments/ads/${adId}/images`, { headers: auth });
  if (res.status !== 200 || !Array.isArray(res.body) || res.body.length !== imageCount) {
    log('GET /api/v1/instruments/ads/:adId/images', false, `expected ${imageCount}, got ${res.body?.length ?? 0}`);
    process.exit(1);
  }
  const allHaveUrls = res.body.every((img) => img.urls?.thumbnail && img.urls?.full);
  log('GET /api/v1/instruments/ads/:adId/images', allHaveUrls, `${res.body.length} images`);
  if (!allHaveUrls) process.exit(1);

  if (cleanupAd) {
    res = await api(`/api/v1/instruments/deleteinstrumentAds/${adId}`, {
      method: 'DELETE',
      headers: auth,
    });
    log('DELETE /api/v1/instruments/deleteinstrumentAds/:id (cleanup)', res.status === 200);
  } else {
    console.log('\nAd kept on staging:');
    console.log(`  adId: ${adId}`);
    console.log(`  imageIds: ${cloudflareImageIds.join(', ')}`);
    console.log(`  GET ${baseUrl}/api/v1/instruments/ads/${adId}/images\n`);
  }

  console.log('\n--- All steps passed ---\n');
};

main().catch((err) => {
  console.error('\nTest failed:', err.message);
  process.exit(1);
});
