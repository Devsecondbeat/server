import { supabaseAdminClient, supabaseClient } from '../config/supabase.js';
import { assertRedirectToHonored } from '../config/authRedirects.js';
import { getSupabaseKeyDiagnostics } from '../config/supabaseKeys.js';
import logger from '../config/logger.js';
import { formatAuthFailure } from '../Utils/authErrorLog.js';

const logSupabaseAuthFailure = (operation, error) => {
  logger.error(`Supabase auth failed: ${operation}`, {
    operation,
    ...formatAuthFailure(error),
    keyDiagnostics: getSupabaseKeyDiagnostics(),
  });
};

const throwWithStep = (error, signupStep) => {
  const err = error instanceof Error ? error : new Error(String(error));
  err.signupStep = signupStep;
  throw err;
};

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
  if (message.includes('This endpoint requires a valid Bearer token')) {
    return {
      status: 503,
      error: 'Supabase secret key is missing or invalid. Set SUPABASE_SERVICE_ROLE_KEY (sb_secret_...) on the server.',
    };
  }
  if (message.includes('Invalid API key')) {
    return {
      status: 503,
      error: 'Supabase API key is invalid. Copy the full publishable/secret keys from Supabase Dashboard > Settings > API Keys.',
    };
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

  logger.info('Supabase admin generateLink starting', {
    operation: 'signup',
    email,
    redirectTo: redirectTo || null,
    keyDiagnostics: getSupabaseKeyDiagnostics(),
  });

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
    logSupabaseAuthFailure('signup_generate_link', error);
    throwWithStep(error, 'supabase_generate_link');
  }

  assertRedirectToHonored(redirectTo, data.properties.action_link);

  logger.info('Supabase admin generateLink succeeded', {
    operation: 'signup',
    userId: data.user?.id,
    email: data.user?.email,
    redirectTo,
  });

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

  assertRedirectToHonored(redirectTo, data.properties.action_link);

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

  assertRedirectToHonored(redirectTo, data.properties.action_link);

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
