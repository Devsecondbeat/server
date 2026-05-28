import logger from '../config/logger.js';
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

const handleAuthError = (res, error) => {
  if (error.code === 'SUPABASE_NOT_CONFIGURED' || error.code === 'SUPABASE_ADMIN_NOT_CONFIGURED') {
    return res.status(503).json({ success: false, error: error.message });
  }
  if (error.code === 'EMAIL_NOT_CONFIGURED') {
    return res.status(503).json({ success: false, error: error.message });
  }
  if (error.code === 'EMAIL_UNAUTHORIZED' || error.code === 'EMAIL_SEND_FAILED') {
    const isQuotaError = error.name === 'Throttling'
      || error.message.includes('Maximum sending rate exceeded');

    return res.status(503).json({
      success: false,
      error: isQuotaError
        ? 'Email service quota exceeded. Account may still be created — contact support or try again later.'
        : `Email delivery failed: ${error.message}`,
    });
  }

  const mapped = mapSupabaseAuthError(error);
  return res.status(mapped.status).json({ success: false, error: mapped.error });
};

export const signUp = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
    } = req.body;

    const validationError = validateEmailPassword(email, password);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    const metadata = {};
    if (firstName) metadata.first_name = firstName;
    if (lastName) metadata.last_name = lastName;
    if (phoneNumber) metadata.phone_number = phoneNumber;

    const redirectTo = process.env.SUPABASE_ACTIVATION_REDIRECT_URL
      || process.env.CORS_ORIGIN
      || undefined;

    const { user, activationLink } = await createSignupWithActivationLink({
      email,
      password,
      metadata,
      redirectTo,
    });

    await sendActivationEmail(
      email,
      activationLink,
      buildDisplayName({ firstName, lastName, email }),
    );

    return res.status(201).json({
      success: true,
      message: 'Account created. Check your email to activate your account before signing in.',
      user: formatAuthUser(user),
    });
  } catch (error) {
    logger.error('Sign up failed', { error: error.message });
    return handleAuthError(res, error);
  }
};

export const resendActivationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, error: 'A valid email is required' });
    }

    const redirectTo = process.env.SUPABASE_ACTIVATION_REDIRECT_URL
      || process.env.CORS_ORIGIN
      || undefined;

    const { user, activationLink } = await createActivationResendLink({ email, redirectTo });
    const displayName = user.user_metadata?.first_name
      ? buildDisplayName({
        firstName: user.user_metadata.first_name,
        lastName: user.user_metadata.last_name,
        email,
      })
      : email;

    await sendActivationEmail(email, activationLink, displayName);

    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, you will receive an activation email.',
    });
  } catch (error) {
    logger.warn('Activation email resend failed', { error: error.message });
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
    logger.error('Sign in failed', { error: error.message });
    return handleAuthError(res, error);
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
    logger.error('Session refresh failed', { error: error.message });
    return handleAuthError(res, error);
  }
};

export const requestPasswordRecovery = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, error: 'A valid email is required' });
    }

    const redirectTo = process.env.SUPABASE_PASSWORD_RESET_REDIRECT_URL
      || process.env.CORS_ORIGIN
      || undefined;

    try {
      const resetLink = await createPasswordRecoveryLink({ email, redirectTo });
      await sendPasswordResetEmail(email, resetLink);
    } catch (error) {
      logger.warn('Password recovery email could not be sent', {
        email,
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message:
        'If an account with that email exists, you will receive password reset instructions.',
    });
  } catch (error) {
    logger.error('Password recovery request failed', { error: error.message });
    return handleAuthError(res, error);
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
