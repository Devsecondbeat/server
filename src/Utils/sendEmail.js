import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendActivationEmail = async (recipientEmail, activationLink, userName) => {
  const msg = {
    to: recipientEmail,
    from: 'support@secondbeat.in', // Use the email address you verified with SendGrid
    subject: 'Activate Your Account - Second Beat',
    html: `
      <p>Dear ${userName},</p>
      <p>Thank you for registering with Second Beat! To activate your account and gain access to all of our features, please click the link below:</p>
      <p><a href="${activationLink}">${activationLink}</a></p>
      <p>If you cannot click the link, please copy and paste the following URL into your browser:</p>
      <p>${activationLink}</p>
      <p>Please note that this activation link is valid for a limited time only. If you did not request this activation or believe it to be in error, you can safely ignore this email.</p>
      <p>Welcome to Second Beat! We're excited to have you join us. If you have any questions or need assistance, feel free to contact our support team.</p>
      <p>Best regards,<br/>The Second Beat Team</p>
    `,
  };
  
  sgMail.send(msg)
    .then(() => console.log('Activation email sent successfully'))
    .catch(error => console.error('Error sending activation email:', error));
};