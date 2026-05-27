import assert from 'node:assert/strict';
import test from 'node:test';

process.env.SUPABASE_URL ??= 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY ??= 'test-anon-key';

const { createVerifySupabaseTokenMiddleware } = await import(
  '../src/middleware/authMiddleware.js'
);

const noopLogger = {
  debug() {},
  error() {},
};

const createRequest = (authorization) => ({
  header(name) {
    return name === 'Authorization' ? authorization : undefined;
  },
});

const createResponse = () => ({
  statusCode: undefined,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test('verifySupabaseTokenMiddleware rejects missing authorization header', async () => {
  let verifierCalls = 0;
  const middleware = createVerifySupabaseTokenMiddleware({
    verifySupabaseTokenFn: async () => {
      verifierCalls += 1;
    },
    loggerInstance: noopLogger,
  });
  const req = createRequest(undefined);
  const res = createResponse();
  let nextCalls = 0;

  await middleware(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    success: false,
    error: 'Authorization header is missing',
  });
  assert.equal(verifierCalls, 0);
  assert.equal(nextCalls, 0);
});

test('verifySupabaseTokenMiddleware rejects malformed authorization header', async () => {
  let verifierCalls = 0;
  const middleware = createVerifySupabaseTokenMiddleware({
    verifySupabaseTokenFn: async () => {
      verifierCalls += 1;
    },
    loggerInstance: noopLogger,
  });
  const req = createRequest('Token abc');
  const res = createResponse();
  let nextCalls = 0;

  await middleware(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    success: false,
    error: 'Invalid authorization header format. Expected: Bearer <token>',
  });
  assert.equal(verifierCalls, 0);
  assert.equal(nextCalls, 0);
});

test('verifySupabaseTokenMiddleware rejects empty bearer token', async () => {
  let verifierCalls = 0;
  const middleware = createVerifySupabaseTokenMiddleware({
    verifySupabaseTokenFn: async () => {
      verifierCalls += 1;
    },
    loggerInstance: noopLogger,
  });
  const req = createRequest('Bearer ');
  const res = createResponse();
  let nextCalls = 0;

  await middleware(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    success: false,
    error: 'Token is missing',
  });
  assert.equal(verifierCalls, 0);
  assert.equal(nextCalls, 0);
});

test('verifySupabaseTokenMiddleware rejects invalid or expired tokens', async () => {
  const middleware = createVerifySupabaseTokenMiddleware({
    verifySupabaseTokenFn: async () => null,
    loggerInstance: noopLogger,
  });
  const req = createRequest('Bearer expired-token');
  const res = createResponse();
  let nextCalls = 0;

  await middleware(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    success: false,
    error: 'Invalid or expired token',
  });
  assert.equal(nextCalls, 0);
  assert.equal(req.user, undefined);
  assert.equal(req.supabaseToken, undefined);
});

test('verifySupabaseTokenMiddleware attaches verified user and token', async () => {
  const verifiedUser = {
    id: 'user-123',
    email: 'player@example.com',
  };
  const seenTokens = [];
  const middleware = createVerifySupabaseTokenMiddleware({
    verifySupabaseTokenFn: async (token) => {
      seenTokens.push(token);
      return verifiedUser;
    },
    loggerInstance: noopLogger,
  });
  const req = createRequest('Bearer valid-token');
  const res = createResponse();
  let nextCalls = 0;

  await middleware(req, res, () => {
    nextCalls += 1;
  });

  assert.deepEqual(seenTokens, ['valid-token']);
  assert.equal(nextCalls, 1);
  assert.equal(res.statusCode, undefined);
  assert.equal(res.body, undefined);
  assert.equal(req.user, verifiedUser);
  assert.equal(req.supabaseToken, 'valid-token');
});

test('verifySupabaseTokenMiddleware returns 500 when verifier throws', async () => {
  const loggedErrors = [];
  const middleware = createVerifySupabaseTokenMiddleware({
    verifySupabaseTokenFn: async () => {
      throw new Error('supabase unavailable');
    },
    loggerInstance: {
      debug() {},
      error(...args) {
        loggedErrors.push(args);
      },
    },
  });
  const req = createRequest('Bearer valid-looking-token');
  const res = createResponse();
  let nextCalls = 0;

  await middleware(req, res, () => {
    nextCalls += 1;
  });

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    success: false,
    error: 'Internal server error during token verification',
  });
  assert.equal(nextCalls, 0);
  assert.equal(loggedErrors.length, 1);
});
