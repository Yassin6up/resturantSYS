const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const { db } = require('../src/database/init');
const fixture = require('./fixture');
beforeAll(fixture);
afterAll(() => db.destroy());
const auth = () => `Bearer ${jwt.sign({ userId: 1 }, process.env.JWT_SECRET)}`;
const upload = theme => request(app).post('/api/themes/upload').set('Authorization', auth()).attach('theme', Buffer.from(JSON.stringify(theme)), 'theme.json');

test('theme drafts preserve the live design, publish explicitly, and stay within the business type', async () => {
  expect((await upload({ businessType: 'ecommerce', template: 'bold' })).status).toBe(400);
  for (const businessType of ['restaurant', 'ecommerce', 'appointments']) {
    await db('branches').where({ id: 1 }).update({ business_type: businessType, settings: '{}' });
    const draft = await upload({ name: 'First', businessType, template: 'default' });
    expect(draft.status).toBe(201);
    expect(draft.body.theme.active).toBe(false);
    let publicSite = await request(app).get('/api/restaurants/public/current').set('X-Branch-Id', '1');
    expect(publicSite.body.settings.custom_theme).toBeUndefined();
    expect(publicSite.body.settings.theme_draft).toBeUndefined();
    expect((await request(app).post('/api/themes/activate').set('Authorization', auth()).send({ active: true })).status).toBe(200);
    await upload({ name: 'Second', businessType, template: 'default' });
    publicSite = await request(app).get('/api/restaurants/public/current').set('X-Branch-Id', '1');
    expect(publicSite.body.settings.custom_theme.name).toBe('First');
    const saved = await request(app).get('/api/themes/current').set('Authorization', auth());
    expect(saved.body.theme.name).toBe('Second');
    expect(saved.body.publishedTheme.name).toBe('First');
    await request(app).post('/api/themes/activate').set('Authorization', auth()).send({ active: true });
    publicSite = await request(app).get('/api/restaurants/public/current').set('X-Branch-Id', '1');
    expect(publicSite.body.settings.custom_theme.name).toBe('Second');
    await request(app).delete('/api/themes/current').set('Authorization', auth());
    const other = await db('branches').where({ id: 2 }).first();
    expect(JSON.parse(other.settings || '{}').custom_theme).toBeUndefined();
  }
});

test('unauthenticated and cashier accounts cannot upload themes', async () => {
  expect((await request(app).post('/api/themes/upload')).status).toBe(401);
  const token = jwt.sign({ userId: 2 }, process.env.JWT_SECRET);
  expect((await request(app).post('/api/themes/upload').set('Authorization', `Bearer ${token}`)).status).toBe(403);
});
