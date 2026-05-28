import { createClient } from '@supabase/supabase-js';
import logger from './logger.js';
import { resolveSupabaseKeys, getSupabaseKeyDiagnostics } from './supabaseKeys.js';

const supabaseUrl = process.env.SUPABASE_URL;
const { clientKey: supabaseAnonKey, adminKey: supabaseServiceRoleKey } = resolveSupabaseKeys();

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn(
    'Supabase URL or client key not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY).',
  );
}

if (!supabaseServiceRoleKey) {
  logger.warn(
    'Supabase secret key not configured. Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY). Signup activation and password reset will not work.',
  );
}

const diagnostics = getSupabaseKeyDiagnostics();
const truncated = diagnostics.clientKey.looksTruncated || diagnostics.adminKey.looksTruncated;
if (truncated || !supabaseServiceRoleKey) {
  logger.warn('Supabase key configuration', diagnostics);
} else {
  logger.debug('Supabase key configuration', diagnostics);
}

const createSupabaseClient = (key) => {
  if (!supabaseUrl || !key) {
    return null;
  }

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export const supabaseClient = createSupabaseClient(supabaseAnonKey);
export const supabaseAdminClient = createSupabaseClient(supabaseServiceRoleKey);

/**
 * Verify a Supabase JWT token
 * @param {string} token - The JWT token to verify
 * @returns {Promise<Object|null>} User data if token is valid, null otherwise
 */
export const verifySupabaseToken = async (token) => {
  if (!supabaseClient) {
    logger.error('Supabase client not initialized. Cannot verify token.');
    return null;
  }

  try {
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser(token);

    if (error) {
      logger.warn('Token verification failed:', error.message);
      return null;
    }

    if (!user) {
      logger.warn('No user found for token');
      return null;
    }

    logger.debug('Token verified successfully for user:', user.id);
    return user;
  } catch (error) {
    logger.error('Error verifying Supabase token:', error.message);
    return null;
  }
};

export default supabaseClient;
