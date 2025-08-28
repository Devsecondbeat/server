import request from 'supertest';
import express from 'express';
import userRoutes from './routes/user.js';

const app = express();
app.use(express.json());
app.use('/api/v1/users', userRoutes);

const testUser = {
  firstName: 'Test',
  lastName: 'User',
  phoneNumber: '1234567890',
  emailId: `testuser_${Date.now()}@example.com`,
  password: 'testpassword123'
};

let registeredUserEmail = testUser.emailId;
let registeredUserPassword = testUser.password;

describe('User API Tests', () => {
  test('POST /register - should register a new user', async () => {
    const response = await request(app)
      .post('/api/v1/users/register')
      .send(testUser);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  test('POST /login - should fail with empty credentials', async () => {
    const response = await request(app)
      .post('/api/v1/users/login')
      .send({ emailId: '', password: '' });
    
    expect(response.status).toBe(400);
  });

  test('POST /login - should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/users/login')
      .send({ emailId: registeredUserEmail, password: registeredUserPassword });
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe(true);
    expect(response.body.token).toBeDefined();
  });

  test('POST /login - should fail with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/users/login')
      .send({ emailId: 'notfound@example.com', password: 'wrongpassword' });
    
    expect(response.status).toBe(400);
  });

  test('POST /forgotPassword - should handle forgot password request', async () => {
    const response = await request(app)
      .post('/api/v1/users/forgotPassword')
      .send({ emailId: registeredUserEmail });
    
    expect(response.status).toBe(200);
  });
}); 