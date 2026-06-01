#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'postman');

const jsonHeader = { key: 'Content-Type', value: 'application/json' };

const bearerAuth = {
  type: 'bearer',
  bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }],
};

const testScript = (lines) => ({
  listen: 'test',
  script: {
    type: 'text/javascript',
    exec: lines,
  },
});

const request = (name, method, urlPath, options = {}) => {
  const item = {
    name,
    request: {
      method,
      header: [jsonHeader],
      url: `{{baseUrl}}${urlPath}`,
    },
  };

  if (options.description) {
    item.request.description = options.description;
  }

  if (options.auth) {
    item.request.auth = options.auth;
  }

  if (options.body) {
    item.request.body = {
      mode: 'raw',
      raw: JSON.stringify(options.body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }

  if (options.tests) {
    item.event = [testScript(options.tests)];
  }

  return item;
};

const folder = (name, items, options = {}) => ({
  name,
  ...(options.description ? { description: options.description } : {}),
  ...(options.auth ? { auth: options.auth } : {}),
  item: items,
});

const loginTests = [
  "pm.test('Status is 200', () => pm.response.to.have.status(200));",
  'const json = pm.response.json();',
  "pm.test('Login succeeded', () => pm.expect(json.success).to.eql(true));",
  'if (json.session?.access_token) {',
  "  pm.collectionVariables.set('accessToken', json.session.access_token);",
  '}',
  'if (json.session?.refresh_token) {',
  "  pm.collectionVariables.set('refreshToken', json.session.refresh_token);",
  '}',
  'if (json.user?.id) {',
  "  pm.collectionVariables.set('userId', json.user.id);",
  '}',
];

const healthTests = [
  "pm.test('Status is 200', () => pm.response.to.have.status(200));",
];

const collection = {
  info: {
    name: 'Second Beat API',
    description:
      'Second Beat marketplace server API. Set `baseUrl` (staging or local), run Auth > Login, then exercise protected routes.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'https://secondbeat-server-nywxc.ondigitalocean.app' },
    { key: 'accessToken', value: '' },
    { key: 'refreshToken', value: '' },
    { key: 'userId', value: '' },
    { key: 'adId', value: '1' },
    { key: 'imageId', value: 'img-1' },
    { key: 'testEmail', value: 'sddeals877@gmail.com' },
    { key: 'testPassword', value: 'password123' },
  ],
  item: [
    folder('Health', [
      request('Root', 'GET', '/', { tests: healthTests }),
      request('Liveness', 'GET', '/health', {
        description: 'App Platform health check endpoint.',
        tests: [
          ...healthTests,
          "pm.test('Status ok', () => pm.expect(pm.response.json().status).to.eql('ok'));",
        ],
      }),
      request('Database health', 'GET', '/health/database', {
        description: 'Readiness check — verifies database connectivity.',
        tests: [
          "pm.test('Status is 200 or 503', () => pm.expect(pm.response.code).to.be.oneOf([200, 503]));",
        ],
      }),
    ]),
    folder('Auth', [
      request('Sign up', 'POST', '/api/v1/auth/signup', {
        body: {
          email: '{{testEmail}}',
          password: '{{testPassword}}',
          firstName: 'Test',
          lastName: 'User',
          phoneNumber: '+919999999999',
        },
      }),
      request('Resend activation email', 'POST', '/api/v1/auth/activation/resend', {
        body: { email: '{{testEmail}}' },
      }),
      request('Login', 'POST', '/api/v1/auth/login', {
        description: 'Saves accessToken, refreshToken, and userId to collection variables.',
        body: { email: '{{testEmail}}', password: '{{testPassword}}' },
        tests: loginTests,
      }),
      request('Refresh session', 'POST', '/api/v1/auth/refresh', {
        body: { refresh_token: '{{refreshToken}}' },
        tests: loginTests,
      }),
      request('Logout', 'POST', '/api/v1/auth/logout'),
      request('Password recovery', 'POST', '/api/v1/auth/password/recovery', {
        body: { email: '{{testEmail}}' },
      }),
      request('Password update (after reset link)', 'POST', '/api/v1/auth/password/update', {
        description:
          'Use access_token and refresh_token from the /reset-password redirect URL hash, or code for PKCE.',
        body: {
          password: '{{testPassword}}',
          access_token: '{{recoveryAccessToken}}',
          refresh_token: '{{recoveryRefreshToken}}',
        },
      }),
      request('Get current user', 'GET', '/api/v1/auth/me', { auth: bearerAuth }),
      request('Verify token (GET)', 'GET', '/api/v1/auth/verify', { auth: bearerAuth }),
      request('Verify token (POST)', 'POST', '/api/v1/auth/verify', { auth: bearerAuth }),
    ]),
    folder('Instruments', [
      request('Get instrument makes', 'GET', '/api/v1/instruments/getinstrumentMakes', {
        auth: bearerAuth,
        tests: healthTests,
      }),
      request('List instrument ads', 'GET', '/api/v1/instruments/getinstrumentAds?type=guitar&make_id=1&condition=good', {
        auth: bearerAuth,
      }),
      request('Create instrument ad', 'POST', '/api/v1/instruments/createinstrumentAds', {
        auth: bearerAuth,
        body: {
          make_id: 1,
          name: 'Stratocaster',
          description: 'Well maintained electric guitar',
          price: 500,
          condition: 'good',
          imageIds: [],
        },
        tests: [
          "pm.test('Status is 201', () => pm.response.to.have.status(201));",
          'const json = pm.response.json();',
          'if (json.data?.id) {',
          "  pm.collectionVariables.set('adId', String(json.data.id));",
          '}',
        ],
      }),
      request('Get ads by user', 'GET', '/api/v1/instruments/getinstrumentAdsbyUser/{{userId}}', {
        auth: bearerAuth,
      }),
      request('Update instrument ad', 'PUT', '/api/v1/instruments/updateinstrumentAds/{{adId}}', {
        auth: bearerAuth,
        body: {
          description: 'Updated description',
          price: 450,
          condition: 'excellent',
        },
      }),
      request('Delete instrument ad', 'DELETE', '/api/v1/instruments/deleteinstrumentAds/{{adId}}', {
        auth: bearerAuth,
      }),
    ], { auth: bearerAuth, description: 'Requires Bearer token. Run Auth > Login first.' }),
    folder('Ad images', [
      request('Get upload URLs', 'POST', '/api/v1/instruments/images/upload-urls', {
        auth: bearerAuth,
        body: { count: 1 },
      }),
      request('List ad images', 'GET', '/api/v1/instruments/ads/{{adId}}/images', { auth: bearerAuth }),
      request('Check can add images', 'GET', '/api/v1/instruments/ads/{{adId}}/images/can-add?count=1', {
        auth: bearerAuth,
      }),
      request('Delete ad image', 'DELETE', '/api/v1/instruments/ads/{{adId}}/images/{{imageId}}', {
        auth: bearerAuth,
      }),
    ], { auth: bearerAuth }),
  ],
};

const environments = [
  {
    name: 'Second Beat - Staging',
    values: [
      { key: 'baseUrl', value: 'https://secondbeat-server-nywxc.ondigitalocean.app', enabled: true },
      { key: 'testEmail', value: 'user@example.com', enabled: true },
      { key: 'testPassword', value: 'password123', enabled: true, type: 'secret' },
      { key: 'accessToken', value: '', enabled: true, type: 'secret' },
      { key: 'refreshToken', value: '', enabled: true, type: 'secret' },
      { key: 'userId', value: '', enabled: true },
      { key: 'adId', value: '1', enabled: true },
      { key: 'imageId', value: 'img-1', enabled: true },
    ],
  },
  {
    name: 'Second Beat - Local',
    values: [
      { key: 'baseUrl', value: 'http://localhost:3000', enabled: true },
      { key: 'testEmail', value: 'user@example.com', enabled: true },
      { key: 'testPassword', value: 'password123', enabled: true, type: 'secret' },
      { key: 'accessToken', value: '', enabled: true, type: 'secret' },
      { key: 'refreshToken', value: '', enabled: true, type: 'secret' },
      { key: 'userId', value: '', enabled: true },
      { key: 'adId', value: '1', enabled: true },
      { key: 'imageId', value: 'img-1', enabled: true },
    ],
  },
];

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'SecondBeat-API.postman_collection.json'),
  `${JSON.stringify(collection, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(outDir, 'SecondBeat-Staging.postman_environment.json'),
  `${JSON.stringify(environments[0], null, 2)}\n`,
);
fs.writeFileSync(
  path.join(outDir, 'SecondBeat-Local.postman_environment.json'),
  `${JSON.stringify(environments[1], null, 2)}\n`,
);

console.log('Generated Postman files in postman/');
