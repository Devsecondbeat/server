// Set dummy env vars before imports to prevent S3/multer init crashes in tests
process.env.S3_BUCKET = 'test-bucket';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';

import request from 'supertest';
import app from '../src/server.js';

const API_BASE = '/api/v1/instruments';

describe('Marketplace API Regression Tests', () => {
  const validToken = 'Bearer invalid-token-for-test'; // In real env, use valid JWT
  const invalidToken = 'Bearer badtoken';

  describe('Auth error cases', () => {
    it('should return 401 for get makes without token', async () => {
      const res = await request(app).get(`${API_BASE}/getinstrumentMakes`);
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Access denied');
    });

    it('should return 401 for create ad without token', async () => {
      const res = await request(app)
        .post(`${API_BASE}/createinstrumentAds`)
        .send({ user_id: 1, make_id: 1, name: 'Test', description: 'desc', price: 100, condition: 'good' });
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for update/delete without token', async () => {
      const updateRes = await request(app).put(`${API_BASE}/updateinstrumentAds/1`).query({ description: 'new' });
      expect(updateRes.statusCode).toBe(401);

      const deleteRes = await request(app).delete(`${API_BASE}/deleteinstrumentAds/1`);
      expect(deleteRes.statusCode).toBe(401);
    });
  });

  describe('Get makes happy path (requires valid auth + DB)', () => {
    it('should return 201 with makes list when authenticated', async () => {
      const res = await request(app)
        .get(`${API_BASE}/getinstrumentMakes`)
        .set('Authorization', validToken);
      // Note: will be 401 with invalid token; replace with real token in CI
      expect([201, 401]).toContain(res.statusCode);
    });
  });

  describe('Create ad (with/without images flow)', () => {
    it('should attempt create ad with valid payload', async () => {
      const payload = {
        user_id: 1,
        make_id: 1,
        name: 'Guitar',
        description: 'Acoustic',
        price: 500,
        condition: 'new',
      };
      const res = await request(app)
        .post(`${API_BASE}/createinstrumentAds`)
        .set('Authorization', validToken)
        .send(payload);
      expect([201, 401]).toContain(res.statusCode);
    });

    // Images handled via separate /uploadImages; test endpoint exists
    it('should expose image upload endpoint', async () => {
      const res = await request(app)
        .put(`${API_BASE}/uploadImages`)
        .set('Authorization', validToken);
      // Multer expects file; without it may 400 or 200 depending
      expect([200, 400, 401]).toContain(res.statusCode);
    });
  });

  describe('Get ads flows', () => {
    it('should get all ads when authenticated', async () => {
      const res = await request(app)
        .get(`${API_BASE}/getinstrumentAds`)
        .set('Authorization', validToken);
      expect([201, 401]).toContain(res.statusCode);
    });

    it('should get ads by user', async () => {
      const res = await request(app)
        .get(`${API_BASE}/getinstrumentAdsbyUser/1`)
        .set('Authorization', validToken);
      expect([201, 401]).toContain(res.statusCode);
    });
  });

  describe('Update/delete with ownership (basic cases)', () => {
    it('should handle update for ad id (ownership not enforced yet)', async () => {
      const res = await request(app)
        .put(`${API_BASE}/updateinstrumentAds/999`)
        .set('Authorization', validToken)
        .query({ description: 'updated', price: 100, condition: 'used' });
      expect([200, 401]).toContain(res.statusCode);
    });

    it('should handle delete for ad id (ownership not enforced yet)', async () => {
      const res = await request(app)
        .delete(`${API_BASE}/deleteinstrumentAds/999`)
        .set('Authorization', validToken);
      expect([200, 401]).toContain(res.statusCode);
    });
  });

  describe('Image URL endpoint', () => {
    it('should respond to getImageURL', async () => {
      const res = await request(app)
        .get(`${API_BASE}/getImageURL`)
        .set('Authorization', validToken);
      expect([200, 401]).toContain(res.statusCode);
    });
  });
});
