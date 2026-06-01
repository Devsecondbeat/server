import { createClient } from '@supabase/supabase-js';
import { resolveSupabaseKeys } from '../../src/config/supabaseKeys.js';
import { baseUrl, samplePngBuffer } from './env.js';

export const apiFetch = async (apiPath, options = {}) => {
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
  return { status: res.status, body, ok: res.ok };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Retries when DO/Supabase returns transient gateway errors (not app 503). */
export const apiFetchRetryGateway = async (apiPath, options = {}, { attempts = 3 } = {}) => {
  const retryStatuses = new Set([502, 504]);
  let last;
  for (let i = 0; i < attempts; i += 1) {
    last = await apiFetch(apiPath, options);
    if (!retryStatuses.has(last.status)) return last;
    if (i < attempts - 1) await sleep(1500 * (i + 1));
  }
  return last;
};

export const createEphemeralUser = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const { adminKey } = resolveSupabaseKeys();
  if (!supabaseUrl || !adminKey) {
    throw new Error('SUPABASE_URL and service role key required in .env.staging');
  }

  const email = `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = `IntTest-${Date.now()}!9`;
  const admin = createClient(supabaseUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: 'Integration', last_name: 'Test' },
  });
  if (error) {
    throw new Error(`createUser failed: ${error.message}`);
  }

  return { email, password };
};

export const login = async (email, password) => {
  const res = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200 || !res.body?.session?.access_token) {
    throw new Error(res.body?.error || `login failed with status ${res.status}`);
  }
  return res.body.session;
};

export const authHeaders = (accessToken) => ({
  Authorization: `Bearer ${accessToken}`,
});

export const uploadSampleToCloudflare = async (uploadURL) => {
  const form = new FormData();
  form.append('file', new Blob([samplePngBuffer], { type: 'image/png' }), 'sample.png');
  const res = await fetch(uploadURL, { method: 'POST', body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare upload failed: ${res.status} ${text.slice(0, 120)}`);
  }
};
