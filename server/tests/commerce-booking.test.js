const request = require('supertest');
const app = require('../index');
const { db } = require('../src/database/init');
const jwt = require('jsonwebtoken');
const fixture = require('./fixture');
const { localDate } = require('../src/utils/bookingSlots');

beforeAll(fixture);
afterAll(() => db.destroy());
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 2); return localDate(d); };

test('ecommerce checkout accepts no table, preserves variants, and cannot forge payment', async () => {
  const response = await request(app).post('/api/orders').send({ branchId: 2, customerName: 'Buyer', paymentMethod: 'cash', paymentStatus: 'PAID', orderStatus: 'COMPLETED', amountPaid: 999, items: [{menuItemId: 2, variantId: 1, quantity: 2}] });
  expect(response.status).toBe(201);
  const order = await db('orders').where({id: response.body.orderId}).first();
  expect(order.table_id).toBeNull();
  expect(order.payment_status).toBe('UNPAID');
  expect(order.status).toBe('PENDING');
  expect(order.amount_paid).toBe(0);
  expect(order.total).toBe(495);
  expect(order.service_charge).toBe(0);
  const item = await db('order_items').where({order_id: order.id}).first();
  expect(item.variant_id).toBe(1);
});
test('cross-store products and invalid variants are rejected', async () => {
  const cross = await request(app).post('/api/orders').send({branchId:2,items:[{menuItemId:1,quantity:1}]});
  expect(cross.status).toBe(400);
  const variant = await request(app).post('/api/orders').send({branchId:2,items:[{menuItemId:2,variantId:999,quantity:1}]});
  expect(variant.status).toBe(400);
});
test('POS supports take-out without a table and retains authorized payment state', async () => {
  const token = jwt.sign({userId:1}, process.env.JWT_SECRET);
  const response = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({ orderType:'TAKE_OUT',paymentMethod:'cash',paymentStatus:'PAID',amountPaid:110,items:[{menuItemId:1,quantity:1}] });
  expect(response.status).toBe(201);
  expect((await db('orders').where({id:response.body.orderId}).first()).payment_status).toBe('PAID');
});
test('booking enforces configured hours, rejects past times and conflicting bookings', async () => {
  const date = tomorrow();
  const availability = await request(app).get('/api/bookings/availability').query({branchId:1,serviceId:1,date});
  expect(availability.status).toBe(200);
  expect(availability.body.slots.length).toBeGreaterThan(0);
  const payload = {branchId:1,serviceId:1,customerName:'Guest',customerPhone:'12345678',startTime:availability.body.slots[0]};
  expect((await request(app).post('/api/bookings').send(payload)).status).toBe(201);
  expect((await request(app).post('/api/bookings').send(payload)).status).toBe(409);
  expect((await request(app).post('/api/bookings').send({...payload,startTime:new Date(0).toISOString()})).status).toBe(400);
  expect((await request(app).post('/api/bookings').send({...payload,startTime:new Date(`${date}T02:00:00`).toISOString()})).status).toBe(409);
});
test('blocked dates and malformed dates cannot return bookable slots', async () => {
  const date = tomorrow();
  await db('availability_exceptions').insert({branch_id:1,date,reason:'Holiday'});
  const response = await request(app).get('/api/bookings/availability').query({branchId:1,serviceId:1,date});
  expect(response.body.slots).toEqual([]);
  expect((await request(app).get('/api/bookings/availability').query({branchId:1,serviceId:1,date:'2026-02-30'})).status).toBe(400);
  await db('availability_exceptions').where({branch_id:1,date}).del();
});
test('reservation allocates capacity and prevents overlapping table bookings', async () => {
  const date=tomorrow();
  const response=await request(app).get('/api/reservations/availability').query({branchId:1,date,partySize:4});
  expect(response.status).toBe(200);
  const payload={branchId:1,date,partySize:4,startTime:response.body.slots[0],customerName:'Diner',customerPhone:'12345678'};
  expect((await request(app).post('/api/reservations').send(payload)).status).toBe(201);
  expect((await request(app).post('/api/reservations').send(payload)).status).toBe(409);
  expect((await request(app).get('/api/reservations/availability').query({branchId:1,date,partySize:5})).body.slots).toEqual([]);
});
test('a staff member cannot change another stores order status', async () => {
  const token=jwt.sign({userId:1},process.env.JWT_SECRET);
  const order=await db('orders').where({branch_id:2}).first();
  expect((await request(app).patch(`/api/orders/${order.id}/status`).set('Authorization',`Bearer ${token}`).send({status:'CONFIRMED'})).status).toBe(404);
});
