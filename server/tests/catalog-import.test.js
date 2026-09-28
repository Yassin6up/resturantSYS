const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const { db } = require('../src/database/init');
beforeAll(require('./fixture'));
afterAll(() => db.destroy());
const auth = id => `Bearer ${jwt.sign({ userId: id }, process.env.JWT_SECRET)}`;
const importRows = rows => request(app).post('/api/catalog-import').set('Authorization', auth(1)).send({ rows, branchId: 2 });

test('bulk import creates categories in the authenticated business and skips duplicates', async () => {
  const rows = [{ name: 'Coffee', category: 'Drinks', price: '2,50', sku: 'CF-01' }, { name: 'Tea', category: 'Drinks', price: '0' }];
  const first = await importRows(rows);
  expect(first.status).toBe(201);
  expect(first.body).toEqual({ created: 2, categoriesCreated: 1, skipped: 0 });
  const coffee = await db('menu_items').where({ name: 'Coffee' }).first();
  expect(coffee.branch_id).toBe(1);
  expect(Number(coffee.price)).toBe(2.5);
  expect((await importRows(rows)).body).toEqual({ created: 0, categoriesCreated: 0, skipped: 2 });
  expect(await db('categories').where({ branch_id: 2, name: 'Drinks' })).toHaveLength(0);
});
test('invalid row aborts the entire import with row errors', async () => {
  const result = await importRows([{ name: 'Valid', price: '10' }, { name: 'Bad', price: '-1' }]);
  expect(result.status).toBe(400);
  expect(result.body.errors[0].row).toBe(3);
  expect(await db('menu_items').where({ name: 'Valid' })).toHaveLength(0);
});
test('duplicates within one file, including SKUs in other categories, are skipped', async () => {
  const result = await importRows([{ name: 'New', price: '10', sku: 'ONE' }, { name: 'Other', price: '20', sku: 'ONE', category: 'Unused' }]);
  expect(result.body.created).toBe(1);
  expect(result.body.skipped).toBe(1);
  expect(await db('categories').where({ name: 'Unused' })).toHaveLength(0);
});
test('unauthenticated, cashier and appointment accounts cannot import products', async () => {
  expect((await request(app).post('/api/catalog-import').send({ rows: [] })).status).toBe(401);
  expect((await request(app).post('/api/catalog-import').set('Authorization', auth(2)).send({ rows: [] })).status).toBe(403);
  await db('branches').where({ id: 1 }).update({ business_type: 'appointments' });
  expect((await importRows([{ name: 'No', price: '1' }])).status).toBe(403);
  await db('branches').where({ id: 1 }).update({ business_type: 'restaurant' });
});
test('Google Sheet fetch is limited to the canonical CSV endpoint and selected tab', async () => {
  const mock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('Name,Price\nCoffee,2', { headers: { 'content-type': 'text/csv' } }));
  try {
    const endpoint = () => request(app).post('/api/catalog-import/google-sheet').set('Authorization', auth(1));
    expect((await endpoint().send({ url: 'http://127.0.0.1/secrets' })).status).toBe(400);
    expect(mock).not.toHaveBeenCalled();
    const result = await endpoint().send({ url: 'https://docs.google.com/spreadsheets/d/exampleId/edit#gid=123' });
    expect(result.status).toBe(200);
    expect(result.body.csv).toContain('Coffee');
    expect(mock.mock.calls[0][0]).toBe('https://docs.google.com/spreadsheets/d/exampleId/gviz/tq?tqx=out:csv&headers=1&gid=123');
    expect(mock.mock.calls[0][1].redirect).toBe('error');
  } finally { mock.mockRestore(); }
});
