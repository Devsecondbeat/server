import sgMail from '@sendgrid/mail';
import logger from '../config/logger.js';

const sendGridApiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'support@secondbeat.in';

const ensureSendGridConfigured = () => {
  if (!sendGridApiKey) {
    const error = new Error('SENDGRID_API_KEY is not configured');
    error.code = 'SENDGRID_NOT_CONFIGURED';
    throw error;
  }

  if (!sendGridApiKey.startsWith('SG.')) {
    const error = new Error('SENDGRID_API_KEY must start with "SG."');
    error.code = 'SENDGRID_INVALID_KEY';
    throw error;
  }

  sgMail.setApiKey(sendGridApiKey);
};

const sendEmail = async ({ to, subject, html }) => {
  ensureSendGridConfigured();

  try {
    await sgMail.send({
      to,
      from: fromEmail,
      subject,
      html,
    });
  } catch (error) {
    const sendGridMessage = error.response?.body?.errors?.[0]?.message;
    const wrapped = new Error(sendGridMessage || error.message || 'Failed to send email');
    wrapped.code = error.code === 401 ? 'SENDGRID_UNAUTHORIZED' : 'SENDGRID_SEND_FAILED';
    throw wrapped;
  }

  logger.info('Email sent successfully', { to, subject });
};

export const sendActivationEmail = async (recipientEmail, activationLink, userName) => {
  const displayName = userName || 'there';

  await sendEmail({
    to: recipientEmail,
    subject: 'Activate Your Account - Second Beat',
    html: `
      <p>Dear ${displayName},</p>
      <p>Thank you for registering with Second Beat! To activate your account and gain access
      to all of our features, please click the link below:</p>
      <p><a href="${activationLink}">${activationLink}</a></p>
      <p>If you cannot click the link, please copy and paste the following URL into your browser:</p>
      <p>${activationLink}</p>
      <p>Please note that this activation link is valid for a limited time only.
      If you did not request this activation or believe it to be in error,
      you can safely ignore this email.</p>
      <p>Welcome to Second Beat! We're excited to have you join us.
      If you have any questions or need assistance, feel free to contact our support team.</p>
      <p>Best regards,<br/>The Second Beat Team</p>
    `,
  });
};

export const sendPasswordResetEmail = async (recipientEmail, resetLink) => {
  await sendEmail({
    to: recipientEmail,
    subject: 'Reset Your Password - Second Beat',
    html: `
      <p>Dear User,</p>
      <p>We received a request to reset your password for your Second Beat account.
      Click the link below to choose a new password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you cannot click the link, please copy and paste the following URL into your browser:</p>
      <p>${resetLink}</p>
      <p>If you did not request a password reset, please ignore this email
      or contact our support team if you have any concerns.</p>
      <p>For security reasons, this link will expire after a limited time.</p>
      <p>Thank you,<br/>The Second Beat Team</p>
    `,
  });
};
