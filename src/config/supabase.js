import { createClient } from '@supabase/supabase-js';
import logger from './logger.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn(
    'Supabase URL or Anon Key not configured. Supabase authentication will not work.',
  );
  logger.warn('Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
}

if (!supabaseServiceRoleKey) {
  logger.warn(
    'SUPABASE_SERVICE_ROLE_KEY is not configured. Signup activation and password reset emails will not work.',
  );
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
