import logger from '../config/logger.js';
import { getActivationRedirectUrl, getPasswordResetRedirectUrl } from '../config/authRedirects.js';
import {
  buildRequestLogContext,
  formatAuthFailure,
} from '../Utils/authErrorLog.js';
import { getSupabaseKeyDiagnostics } from '../config/supabaseKeys.js';
import { sendActivationEmail, sendPasswordResetEmail } from '../Utils/sendEmail.js';
import {
  formatAuthSession,
  formatAuthUser,
  mapSupabaseAuthError,
  createActivationResendLink,
  createPasswordRecoveryLink,
  createSignupWithActivationLink,
  refreshAuthSession,
  signInWithPassword,
  updatePasswordAfterRecovery,
} from '../services/supabaseAuth.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmailPassword = (email, password) => {
  if (!email || !EMAIL_REGEX.test(email)) {
    return 'A valid email is required';
  }
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
};

const buildDisplayName = ({ firstName, lastName, email }) => {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  return firstName || lastName || email;
};

const authSuccess = (res, status, message, { session, user }) => {
  const payload = {
    success: true,
    message,
    user: formatAuthUser(user),
  };

  if (session) {
    payload.session = formatAuthSession(session);
  }

  return res.status(status).json(payload);
};

const handleAuthError = (res, error, req) => {
  const logContext = buildRequestLogContext(req);

  if (error.code === 'SUPABASE_NOT_CONFIGURED' || error.code === 'SUPABASE_ADMIN_NOT_CONFIGURED') {
    logger.error('Auth request rejected', {
      event: 'auth.request.failed',
      ...logContext,
      httpStatus: 503,
      clientError: error.message,
      ...formatAuthFailure(error),
    });
    return res.status(503).json({ success: false, error: error.message });
  }
  if (error.code === 'PASSWORD_UPDATE_SESSION_REQUIRED') {
    logger.warn('Auth request rejected', {
      event: 'auth.request.failed',
      ...logContext,
      httpStatus: 400,
      clientError: error.message,
      ...formatAuthFailure(error),
    });
    return res.status(400).json({ success: false, error: error.message });
  }
  if (error.code === 'AUTH_REDIRECT_NOT_CONFIGURED' || error.code === 'AUTH_REDIRECT_MISMATCH') {
    logger.error('Auth request rejected', {
      event: 'auth.request.failed',
      ...logContext,
      httpStatus: 503,
      clientError: error.message,
      ...formatAuthFailure(error),
    });
    return res.status(503).json({ success: false, error: error.message });
  }
  if (error.code === 'SENDGRID_NOT_CONFIGURED' || error.code === 'SENDGRID_INVALID_KEY') {
    logger.error('Auth request rejected', {
      event: 'auth.request.failed',
      ...logContext,
      httpStatus: 503,
      clientError: error.message,
      ...formatAuthFailure(error),
    });
    return res.status(503).json({ success: false, error: error.message });
  }
  if (error.code === 'SENDGRID_UNAUTHORIZED' || error.code === 'SENDGRID_SEND_FAILED') {
    const clientError = error.message.includes('Maximum credits exceeded')
      ? 'Email service quota exceeded. Account may still be created — contact support or try again later.'
      : `Email delivery failed: ${error.message}`;
    logger.error('Auth request rejected', {
      event: 'auth.request.failed',
      ...logContext,
      httpStatus: 503,
      clientError,
      ...formatAuthFailure(error),
    });
    return res.status(503).json({
      success: false,
      error: clientError,
    });
  }

  const mapped = mapSupabaseAuthError(error);
  logger.warn('Auth request rejected', {
    event: 'auth.request.failed',
    ...logContext,
    httpStatus: mapped.status,
    clientError: mapped.error,
    ...formatAuthFailure(error),
  });
  return res.status(mapped.status).json({ success: false, error: mapped.error });
};

export const signUp = async (req, res) => {
  let step = 'validate_input';

  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
    } = req.body;

    logger.info('Sign up started', {
      event: 'auth.signup.started',
      ...buildRequestLogContext(req),
      step,
      email,
    });

    const validationError = validateEmailPassword(email, password);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    const metadata = {};
    if (firstName) metadata.first_name = firstName;
    if (lastName) metadata.last_name = lastName;
    if (phoneNumber) metadata.phone_number = phoneNumber;

    const redirectTo = getActivationRedirectUrl();

    step = 'supabase_generate_link';
    const { user, activationLink } = await createSignupWithActivationLink({
      email,
      password,
      metadata,
      redirectTo,
    });

    step = 'send_activation_email';
    logger.info('Sign up supabase link created', {
      event: 'auth.signup.step',
      ...buildRequestLogContext(req),
      step: 'supabase_generate_link',
      email,
      userId: user?.id,
    });

    step = 'send_activation_email';
    logger.info('Sign up sending activation email', {
      event: 'auth.signup.step',
      ...buildRequestLogContext(req),
      step,
      email,
      sendgridConfigured: Boolean(process.env.SENDGRID_API_KEY?.startsWith('SG.')),
    });

    await sendActivationEmail(
      email,
      activationLink,
      buildDisplayName({ firstName, lastName, email }),
      { requestId: req.requestId },
    );

    logger.info('Sign up completed', {
      event: 'auth.signup.succeeded',
      ...buildRequestLogContext(req),
      email,
      userId: user?.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created. Check your email to activate your account before signing in.',
      user: formatAuthUser(user),
    });
  } catch (error) {
    logger.error('Sign up failed', {
      event: 'auth.signup.failed',
      ...buildRequestLogContext(req),
      step: error.signupStep || step,
      email: req.body?.email,
      ...formatAuthFailure(error),
      keyDiagnostics: step === 'supabase_generate_link' || error.signupStep === 'supabase_generate_link'
        ? getSupabaseKeyDiagnostics()
        : undefined,
      sendgridConfigured: Boolean(process.env.SENDGRID_API_KEY?.startsWith('SG.')),
    });
    return handleAuthError(res, error, req);
  }
};

export const resendActivationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, error: 'A valid email is required' });
    }

    const redirectTo = getActivationRedirectUrl();

    const { user, activationLink } = await createActivationResendLink({ email, redirectTo });
    const displayName = user.user_metadata?.first_name
      ? buildDisplayName({
        firstName: user.user_metadata.first_name,
        lastName: user.user_metadata.last_name,
        email,
      })
      : email;

    await sendActivationEmail(email, activationLink, displayName, { requestId: req.requestId });

    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, you will receive an activation email.',
    });
  } catch (error) {
    logger.warn('Activation email resend failed', {
      event: 'auth.activation_resend.failed',
      ...buildRequestLogContext(req),
      ...formatAuthFailure(error),
    });
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, you will receive an activation email.',
    });
  }
};

export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    const validationError = validateEmailPassword(email, password);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    const data = await signInWithPassword({ email, password });

    return authSuccess(res, 200, 'Signed in successfully', data);
  } catch (error) {
    logger.error('Sign in failed', {
      event: 'auth.signin.failed',
      ...buildRequestLogContext(req),
      ...formatAuthFailure(error),
    });
    return handleAuthError(res, error, req);
  }
};

export const refreshSession = async (req, res) => {
  try {
    const { refresh_token: refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'refresh_token is required' });
    }

    const data = await refreshAuthSession(refreshToken);

    if (!data.session || !data.user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    return authSuccess(res, 200, 'Session refreshed successfully', data);
  } catch (error) {
    logger.error('Session refresh failed', {
      event: 'auth.refresh.failed',
      ...buildRequestLogContext(req),
      ...formatAuthFailure(error),
    });
    return handleAuthError(res, error, req);
  }
};

const validatePasswordUpdateBody = ({ password, access_token, refresh_token, code }) => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  const hasTokens = Boolean(access_token && refresh_token);
  const hasCode = typeof code === 'string' && code.length > 0;

  if (!hasTokens && !hasCode) {
    return 'Recovery session is required (access_token and refresh_token, or code)';
  }
  if (hasTokens && hasCode) {
    return 'Provide either access_token and refresh_token, or code, not both';
  }

  return null;
};

export const requestPasswordRecovery = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, error: 'A valid email is required' });
    }

    const redirectTo = getPasswordResetRedirectUrl();

    try {
      const resetLink = await createPasswordRecoveryLink({ email, redirectTo });
      await sendPasswordResetEmail(email, resetLink, { requestId: req.requestId });
    } catch (error) {
      logger.warn('Password recovery email could not be sent', {
        event: 'auth.password_recovery.email_failed',
        ...buildRequestLogContext(req),
        ...formatAuthFailure(error),
      });
    }

    return res.status(200).json({
      success: true,
      message:
        'If an account with that email exists, you will receive password reset instructions.',
    });
  } catch (error) {
    logger.error('Password recovery request failed', {
      event: 'auth.password_recovery.failed',
      ...buildRequestLogContext(req),
      ...formatAuthFailure(error),
    });
    return handleAuthError(res, error, req);
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { password, access_token, refresh_token, code } = req.body;

    const validationError = validatePasswordUpdateBody({
      password,
      access_token,
      refresh_token,
      code,
    });
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    const data = await updatePasswordAfterRecovery({
      password,
      access_token,
      refresh_token,
      code,
    });

    if (!data.user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired recovery session' });
    }

    return authSuccess(res, 200, 'Password updated successfully', {
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    logger.error('Password update failed', {
      event: 'auth.password_update.failed',
      ...buildRequestLogContext(req),
      ...formatAuthFailure(error),
    });
    return handleAuthError(res, error, req);
  }
};

export const signOut = async (_req, res) => res.status(200).json({
  success: true,
  message: 'Signed out successfully. Discard the access and refresh tokens on the client.',
});

export const getCurrentUser = async (req, res) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found in request' });
    }

    return res.status(200).json({
      success: true,
      user: formatAuthUser(user),
    });
  } catch (error) {
    logger.error('Get current user failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const verifyToken = async (req, res) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found in request' });
    }

    return res.status(200).json({
      success: true,
      message: 'Token verified successfully',
      user: formatAuthUser(user),
    });
  } catch (error) {
    logger.error('Token verification failed', { error: error.message });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
