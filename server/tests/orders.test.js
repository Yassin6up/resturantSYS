const request = require('supertest');
const app = require('../index');
const db = require('../src/database/connection');

describe('Orders API', () => {
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

  beforeEach(async () => {
    // Clean up test data
    await db('order_item_modifiers').del();
    await db('order_items').del();
    await db('orders').del();
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

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          branchId: 1,
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should handle non-existent menu items', async () => {
      const orderData = {
        branchId: 1,
        tableId: 1,
        customerName: 'Test Customer',
        items: [
          {
            menuItemId: 99999, // Non-existent item
            quantity: 1,
            modifiers: []
          }
        ],
        paymentMethod: 'CASH'
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/orders', () => {
    beforeEach(async () => {
      // Create test order
      await db('orders').insert({
        branch_id: 1,
        table_id: 1,
        order_code: 'TEST-001',
        customer_name: 'Test Customer',
        total: 50.00,
        status: 'PENDING',
        payment_status: 'UNPAID'
      });
    });

    it('should get orders list', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/orders?status=PENDING')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    let orderId;

    beforeEach(async () => {
      const [id] = await db('orders').insert({
        branch_id: 1,
        table_id: 1,
        order_code: 'TEST-002',
        customer_name: 'Test Customer',
        total: 50.00,
        status: 'PENDING',
        payment_status: 'UNPAID'
      });
      orderId = id;
    });

    it('should update order status', async () => {
      const response = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'CONFIRMED' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verify status was updated
      const order = await db('orders').where({ id: orderId }).first();
      expect(order.status).toBe('CONFIRMED');
    });

    it('should validate status values', async () => {
      const response = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });
});