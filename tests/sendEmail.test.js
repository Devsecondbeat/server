import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';

const { mockSend, MockSESClient, MockSendEmailCommand } = vi.hoisted(() => {
  const send = vi.fn();
  class SesClient {
    constructor(config) {
      this.config = config;
    }

    send(...args) {
      return send(...args);
    }
  }
  class SendEmailCommand {
    constructor(input) {
      this.input = input;
    }
  }
  return {
    mockSend: send,
    MockSESClient: SesClient,
    MockSendEmailCommand: SendEmailCommand,
  };
});

vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: MockSESClient,
  SendEmailCommand: MockSendEmailCommand,
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const originalEnv = { ...process.env };

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      AWS_REGION: 'ap-south-1',
      AWS_ACCESS_KEY_ID: 'test-access-key',
      AWS_SECRET_ACCESS_KEY: 'test-secret-key',
      SES_FROM_EMAIL: 'support@secondbeat.in',
    };
    mockSend.mockResolvedValue({ MessageId: 'msg-123' });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  const loadSendEmail = async () => import('../src/Utils/sendEmail.js');

  it('throws EMAIL_NOT_CONFIGURED when AWS_REGION is missing', async () => {
    delete process.env.AWS_REGION;
    const { sendActivationEmail } = await loadSendEmail();

    await expect(
      sendActivationEmail('user@example.com', 'https://example.com/activate', 'Alex'),
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_CONFIGURED' });
  });

  it('throws EMAIL_NOT_CONFIGURED when AWS credentials are missing', async () => {
    delete process.env.AWS_ACCESS_KEY_ID;
    const { sendPasswordResetEmail } = await loadSendEmail();

    await expect(
      sendPasswordResetEmail('user@example.com', 'https://example.com/reset'),
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_CONFIGURED' });
  });

  it('sends activation email via SES with expected fields', async () => {
    const { sendActivationEmail } = await loadSendEmail();

    await sendActivationEmail('user@example.com', 'https://example.com/activate', 'Alex');

    expect(mockSend).toHaveBeenCalledOnce();
    const command = mockSend.mock.calls[0][0];
    expect(command.input).toEqual({
      Source: 'support@secondbeat.in',
      Destination: { ToAddresses: ['user@example.com'] },
      Message: {
        Subject: { Data: 'Activate Your Account - Second Beat', Charset: 'UTF-8' },
        Body: {
          Html: expect.objectContaining({
            Data: expect.stringContaining('https://example.com/activate'),
            Charset: 'UTF-8',
          }),
        },
      },
    });
  });

  it('sends password reset email via SES with expected subject', async () => {
    const { sendPasswordResetEmail } = await loadSendEmail();

    await sendPasswordResetEmail('user@example.com', 'https://example.com/reset');

    const command = mockSend.mock.calls[0][0];
    expect(command.input.Destination).toEqual({ ToAddresses: ['user@example.com'] });
    expect(command.input.Message.Subject.Data).toBe('Reset Your Password - Second Beat');
  });

  it('includes configuration set when SES_CONFIGURATION_SET is set', async () => {
    process.env.SES_CONFIGURATION_SET = 'secondbeat-transactional';
    const { sendActivationEmail } = await loadSendEmail();

    await sendActivationEmail('user@example.com', 'https://example.com/activate');

    const command = mockSend.mock.calls[0][0];
    expect(command.input.ConfigurationSetName).toBe('secondbeat-transactional');
  });

  it('maps invalid credentials to EMAIL_UNAUTHORIZED', async () => {
    mockSend.mockRejectedValue(Object.assign(new Error('Invalid token'), {
      name: 'InvalidClientTokenId',
    }));
    const { sendActivationEmail } = await loadSendEmail();

    await expect(
      sendActivationEmail('user@example.com', 'https://example.com/activate'),
    ).rejects.toMatchObject({ code: 'EMAIL_UNAUTHORIZED', message: 'Invalid token' });
  });

  it('maps other SES failures to EMAIL_SEND_FAILED', async () => {
    mockSend.mockRejectedValue(Object.assign(new Error('Message rejected'), {
      name: 'MessageRejected',
    }));
    const { sendActivationEmail } = await loadSendEmail();

    await expect(
      sendActivationEmail('user@example.com', 'https://example.com/activate'),
    ).rejects.toMatchObject({ code: 'EMAIL_SEND_FAILED', message: 'Message rejected' });
  });
});
