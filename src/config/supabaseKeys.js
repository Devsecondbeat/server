const isSecretKey = (value) =>
  typeof value === 'string' && (value.startsWith('sb_secret_') || value.startsWith('eyJ'));

const isPublishableKey = (value) =>
  typeof value === 'string'
  && !isSecretKey(value)
  && (value.startsWith('sb_publishable_') || value.startsWith('eyJ'));

export const resolveSupabaseKeys = (env = process.env) => {
  const publishable = env.SUPABASE_PUBLISHABLE_KEY;
  const anon = env.SUPABASE_ANON_KEY;
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

  const clientKey = publishable
    || (isPublishableKey(anon) ? anon : null);

  const adminKey = serviceRole
    || (isSecretKey(anon) ? anon : null);

  return { clientKey, adminKey };
};

/** Safe metadata for logs — never includes full key values. */
export const describeSupabaseKey = (value) => {
  if (!value) {
    return { configured: false };
  }

  let kind = 'unknown';
  if (value.startsWith('eyJ')) kind = 'jwt';
  else if (value.startsWith('sb_secret_')) kind = 'sb_secret';
  else if (value.startsWith('sb_publishable_')) kind = 'sb_publishable';

  return {
    configured: true,
    kind,
    length: value.length,
    prefix: value.slice(0, 16),
    looksTruncated: (kind === 'sb_secret' || kind === 'sb_publishable') && value.length < 80,
  };
};

export const getSupabaseKeyDiagnostics = (env = process.env) => {
  const { clientKey, adminKey } = resolveSupabaseKeys(env);
  let urlHost = null;
  try {
    urlHost = env.SUPABASE_URL ? new URL(env.SUPABASE_URL).host : null;
  } catch {
    urlHost = 'invalid-url';
  }

  return {
    url: { configured: Boolean(env.SUPABASE_URL), host: urlHost },
    clientKey: describeSupabaseKey(clientKey),
    adminKey: describeSupabaseKey(adminKey),
    envVarsPresent: {
      SUPABASE_PUBLISHABLE_KEY: Boolean(env.SUPABASE_PUBLISHABLE_KEY),
      SUPABASE_ANON_KEY: Boolean(env.SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
      SUPABASE_SECRET_KEY: Boolean(env.SUPABASE_SECRET_KEY),
    },
  };
};
