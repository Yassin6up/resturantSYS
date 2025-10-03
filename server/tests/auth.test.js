const request = require('supertest');
const app = require('../index');
const db = require('../src/database/connection');

describe('Authentication', () => {
  beforeEach(async () => {
    // Clean up test data
    await db('audit_logs').del();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin@posq.com',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('admin@posq.com');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin@posq.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate input data', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'invalid-email',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/pin-login', () => {
    it('should login with valid PIN', async () => {
      const response = await request(app)
        .post('/api/auth/pin-login')
        .send({
          username: 'cashier1@posq.com',
          pin: '2222'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
    });

    it('should reject invalid PIN', async () => {
      const response = await request(app)
        .post('/api/auth/pin-login')
        .send({
          username: 'cashier1@posq.com',
          pin: '9999'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});