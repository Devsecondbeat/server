import { supabaseAdminClient, supabaseClient } from '../config/supabase.js';
import logger from '../config/logger.js';

const requireClient = () => {
  if (!supabaseClient) {
    const error = new Error(
      'Supabase auth is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.',
    );
    error.code = 'SUPABASE_NOT_CONFIGURED';
    throw error;
  }
  return supabaseClient;
};

const requireAdminClient = () => {
  if (!supabaseAdminClient) {
    const error = new Error(
      'Supabase admin auth is not configured. Set SUPABASE_SERVICE_ROLE_KEY.',
    );
    error.code = 'SUPABASE_ADMIN_NOT_CONFIGURED';
    throw error;
  }
  return supabaseAdminClient;
};

export const formatAuthUser = (user) => ({
  id: user.id,
  email: user.email,
  email_confirmed_at: user.email_confirmed_at,
  created_at: user.created_at,
  updated_at: user.updated_at,
  user_metadata: user.user_metadata ?? {},
});

export const formatAuthSession = (session) => ({
  access_token: session.access_token,
  refresh_token: session.refresh_token,
  expires_in: session.expires_in,
  expires_at: session.expires_at,
  token_type: session.token_type,
});

export const mapSupabaseAuthError = (error) => {
  const message = error?.message || 'Authentication failed';

  if (message.includes('Invalid login credentials')) {
    return { status: 401, error: 'Invalid email or password' };
  }
  if (message.includes('Email not confirmed')) {
    return { status: 403, error: 'Email not confirmed' };
  }
  if (message.toLowerCase().includes('already registered')) {
    return { status: 409, error: 'An account with this email already exists' };
  }
  if (message.includes('Password should be at least')) {
    return { status: 400, error: message };
  }

  logger.warn('Supabase auth error', { message });
  return { status: 400, error: message };
};

export const createSignupWithActivationLink = async ({
  email,
  password,
  metadata = {},
  redirectTo,
}) => {
  const admin = requireAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      data: metadata,
      redirectTo,
    },
  });

  if (error) {
    throw error;
  }

  return {
    user: data.user,
    activationLink: data.properties.action_link,
  };
};

export const createActivationResendLink = async ({ email, redirectTo }) => {
  const admin = requireAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });

  if (error) {
    throw error;
  }

  return {
    user: data.user,
    activationLink: data.properties.action_link,
  };
};

export const createPasswordRecoveryLink = async ({ email, redirectTo }) => {
  const admin = requireAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  });

  if (error) {
    throw error;
  }

  return data.properties.action_link;
};

export const signInWithPassword = async ({ email, password }) => {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  return data;
};

export const refreshAuthSession = async (refreshToken) => {
  const client = requireClient();
  const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });

  if (error) {
    throw error;
  }

  return data;
};
