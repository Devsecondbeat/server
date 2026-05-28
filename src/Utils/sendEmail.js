import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import logger from '../config/logger.js';

const getFromEmail = () => process.env.SES_FROM_EMAIL || 'support@secondbeat.in';

const ensureSesConfigured = () => {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    const error = new Error(
      'AWS SES is not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.',
    );
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }

  return { region, accessKeyId, secretAccessKey };
};

const createSesClient = ({ region, accessKeyId, secretAccessKey }) => new SESClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const mapSesError = (error) => {
  const wrapped = new Error(error.message || 'Failed to send email');
  wrapped.name = error.name;

  if (error.name === 'InvalidClientTokenId' || error.name === 'UnrecognizedClientException') {
    wrapped.code = 'EMAIL_UNAUTHORIZED';
  } else {
    wrapped.code = 'EMAIL_SEND_FAILED';
  }

  return wrapped;
};

const sendEmail = async ({ to, subject, html }) => {
  const config = ensureSesConfigured();
  const client = createSesClient(config);

  const commandInput = {
    Source: getFromEmail(),
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: { Html: { Data: html, Charset: 'UTF-8' } },
    },
  };

  if (process.env.SES_CONFIGURATION_SET) {
    commandInput.ConfigurationSetName = process.env.SES_CONFIGURATION_SET;
  }

  try {
    await client.send(new SendEmailCommand(commandInput));
  } catch (error) {
    throw mapSesError(error);
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
