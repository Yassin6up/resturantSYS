const request = require('supertest');
const app = require('../index');
const { db } = require('../src/database/init');

describe('Orders API', () => {
  let authToken;

  beforeAll(async () => {
    // Setup test database
    await db.migrate.latest();
    await db.seed.run();

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });
    
    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('POST /api/orders', () => {
    it('should create a new order', async () => {
      const orderData = {
        branchId: 1,
        tableId: 1,
        customerName: 'Test Customer',
        items: [
          {
            menuItemId: 1,
            quantity: 2,
            note: 'No spice',
            modifiers: []
          }
        ],
        paymentMethod: 'CASH'
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('orderId');
      expect(response.body).toHaveProperty('orderCode');
      expect(response.body).toHaveProperty('qr');
      expect(response.body.status).toBe('PENDING');
    });

    it('should reject order with invalid data', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          branchId: 1,
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/orders', () => {
    it('should get orders list', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ branchId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('orders');
      expect(Array.isArray(response.body.orders)).toBe(true);
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ branchId: 1, status: 'PENDING' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('orders');
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    let orderId;

    beforeAll(async () => {
      // Create a test order
      const orderData = {
        branchId: 1,
        tableId: 1,
        customerName: 'Test Customer',
        items: [
          {
            menuItemId: 1,
            quantity: 1,
            modifiers: []
          }
        ],
        paymentMethod: 'CASH'
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData);
      
      orderId = response.body.orderId;
    });

    it('should update order status', async () => {
      const response = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'CONFIRMED' });

      expect(response.status).toBe(200);
      expect(response.body.order.status).toBe('CONFIRMED');
    });

    it('should reject invalid status', async () => {
      const response = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
    });
  });
});