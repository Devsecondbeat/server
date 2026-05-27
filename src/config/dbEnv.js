import fs from 'fs';

/**
 * Extract Supabase project ref from SUPABASE_URL (e.g. https://abcdef.supabase.co → abcdef).
 */
export const getSupabaseProjectRef = (supabaseUrl = process.env.SUPABASE_URL) => {
  if (!supabaseUrl) {
    return null;
  }

  const match = supabaseUrl.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match?.[1] ?? null;
};

/**
 * Pooler hosts require user postgres.<project-ref>; direct db.* hosts use postgres.
 */
export const resolveSupabaseDbUser = ({
  user = process.env.SUPABASE_DB_USER,
  usePooler = process.env.SUPABASE_DB_USE_POOLER === 'true',
  projectRef = getSupabaseProjectRef(),
} = {}) => {
  const baseUser = user || 'postgres';

  if (!usePooler || !projectRef || baseUser.includes('.')) {
    return baseUser;
  }

  return `postgres.${projectRef}`;
};

/**
 * Build pg SSL options. Returns false when SSL is disabled.
 * When certPath is set but missing, returns { missingCert: true } so callers can warn once.
 */
export const buildDatabaseSsl = ({
  sslMode,
  certPath = process.env.CERTPATH,
  preferSupabaseDefault = false,
} = {}) => {
  const mode = sslMode ?? (preferSupabaseDefault ? 'require' : 'disable');

  if (mode === 'disable') {
    return false;
  }

  if (certPath) {
    if (!fs.existsSync(certPath)) {
      return { missingCert: true, certPath };
    }

    return {
      ssl: {
        ca: fs.readFileSync(certPath, 'utf8'),
        rejectUnauthorized: true,
      },
    };
  }

  if (preferSupabaseDefault && mode === 'require') {
    return {
      ssl: { rejectUnauthorized: false },
    };
  }

  return false;
};

export const getDefaultSupabaseDbPort = () => (
  process.env.SUPABASE_DB_USE_POOLER === 'true'
    ? parseInt(process.env.SUPABASE_DB_PORT || '6543', 10)
    : parseInt(process.env.SUPABASE_DB_PORT || '5432', 10)
);
