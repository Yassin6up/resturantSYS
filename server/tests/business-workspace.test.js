const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const { db } = require('../src/database/init');
beforeAll(require('./fixture'));
afterAll(() => db.destroy());
const token = () => `Bearer ${jwt.sign({ userId: 3 }, process.env.JWT_SECRET)}`;

test('owner with a stale restaurant assignment loads its own ecommerce business', async () => {
  await db('users').insert({ id: 3, username: 'shop-owner', password_hash: 'unused', role: 'owner', branch_id: 1, is_active: true });
  await db('branches').where({ id: 2 }).update({ owner_id: 3 });
  const profile = await request(app).get('/api/auth/profile').set('Authorization', token());
  expect(profile.status).toBe(200);
  expect(profile.body.user.branch_id).toBe(2);
  expect(profile.body.branch.business_type).toBe('ecommerce');
  const theme = await request(app).get('/api/themes/current').set('Authorization', token());
  expect(theme.body.businessType).toBe('ecommerce');
});

test('business type edits persist and profile immediately reflects appointments', async () => {
  const updated = await request(app).put('/api/restaurants/2').set('Authorization', token()).send({ business_type: 'appointments' });
  expect(updated.status).toBe(200);
  const profile = await request(app).get('/api/auth/profile').set('Authorization', token());
  expect(profile.body.branch.business_type).toBe('appointments');
  const wrong = await request(app).put('/api/restaurants/1').set('Authorization', token()).send({ business_type: 'appointments' });
  expect(wrong.status).toBe(403);
});
