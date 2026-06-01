const isProduction = process.env.NODE_ENV === 'production';

const stripTrailingSlash = (url) => url.replace(/\/$/, '');

const requireRedirectUrl = (envKey, devFallbackPath) => {
  const explicit = process.env[envKey];
  if (explicit) {
    return stripTrailingSlash(explicit);
  }

  if (!isProduction && process.env.CORS_ORIGIN) {
    return `${stripTrailingSlash(process.env.CORS_ORIGIN)}${devFallbackPath}`;
  }

  const error = new Error(`${envKey} is required when NODE_ENV=production`);
  error.code = 'AUTH_REDIRECT_NOT_CONFIGURED';
  throw error;
};

export const getActivationRedirectUrl = () => requireRedirectUrl(
  'SUPABASE_ACTIVATION_REDIRECT_URL',
  '/activate',
);

export const getPasswordResetRedirectUrl = () => requireRedirectUrl(
  'SUPABASE_PASSWORD_RESET_REDIRECT_URL',
  '/reset-password',
);

const normalizeRedirectHref = (url) => {
  try {
    return new URL(url).href.replace(/\/$/, '');
  } catch {
    return url;
  }
};

/**
 * Supabase silently replaces redirect_to when the URL is not on the Auth allowlist
 * or when Site URL is still localhost. Fail before emailing a broken link.
 */
export const assertRedirectToHonored = (requestedRedirect, actionLink) => {
  if (!requestedRedirect || !actionLink) {
    return;
  }

  let actualRedirect;
  try {
    actualRedirect = new URL(actionLink).searchParams.get('redirect_to');
  } catch {
    return;
  }

  if (!actualRedirect) {
    return;
  }

  if (normalizeRedirectHref(actualRedirect) === normalizeRedirectHref(requestedRedirect)) {
    return;
  }

  const error = new Error(
    `Supabase Auth replaced redirect_to with "${actualRedirect}" instead of "${requestedRedirect}". `
    + 'In Supabase Dashboard → Authentication → URL Configuration: set Site URL to your staging client origin '
    + 'and add the full activation or password-reset URL under Redirect URLs.',
  );
  error.code = 'AUTH_REDIRECT_MISMATCH';
  throw error;
};
