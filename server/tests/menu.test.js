const request = require('supertest');
const app = require('../index');
const db = require('../src/database/connection');

describe('Menu API', () => {
  let authToken;

  beforeAll(async () => {
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin@posq.com',
        password: 'admin123'
      });
    
    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('GET /api/menu', () => {
    it('should get menu for valid table and branch', async () => {
      const response = await request(app)
        .get('/api/menu?table=T1&branch=CAS');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('branch');
      expect(response.body).toHaveProperty('table');
      expect(response.body).toHaveProperty('menu');
      expect(Array.isArray(response.body.menu)).toBe(true);
    });

    it('should reject request without table and branch', async () => {
      const response = await request(app)
        .get('/api/menu');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid table or branch', async () => {
      const response = await request(app)
        .get('/api/menu?table=INVALID&branch=INVALID');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/menu/categories', () => {
    it('should get categories list', async () => {
      const response = await request(app)
        .get('/api/menu/categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter categories by branch', async () => {
      const response = await request(app)
        .get('/api/menu/categories?branchId=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/menu/categories', () => {
    it('should create a new category', async () => {
      const categoryData = {
        name: 'Test Category',
        branch_id: 1,
        position: 10
      };

      const response = await request(app)
        .post('/api/menu/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(categoryData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Category');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/menu/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required name field
          branch_id: 1
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/menu/items', () => {
    it('should get menu items list', async () => {
      const response = await request(app)
        .get('/api/menu/items')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter items by category', async () => {
      const response = await request(app)
        .get('/api/menu/items?categoryId=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter items by availability', async () => {
      const response = await request(app)
        .get('/api/menu/items?available=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/menu/items', () => {
    it('should create a new menu item', async () => {
      const itemData = {
        name: 'Test Item',
        price: 25.50,
        branch_id: 1,
        category_id: 1,
        sku: 'TEST001',
        description: 'Test description',
        is_available: true
      };

      const response = await request(app)
        .post('/api/menu/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(itemData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Item');
      expect(response.body.price).toBe(25.50);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/menu/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          name: 'Test Item'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate price format', async () => {
      const response = await request(app)
        .post('/api/menu/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Item',
          price: -10, // Invalid negative price
          branch_id: 1,
          category_id: 1
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });
});