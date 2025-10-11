const test = require('node:test');
const assert = require('node:assert/strict');

const handlerPath = require.resolve('../contract-data.js');
const pgPath = require.resolve('pg');
const originalPg = require.cache[pgPath];

function restore() {
  delete require.cache[handlerPath];
  if (originalPg) require.cache[pgPath] = originalPg;
  else delete require.cache[pgPath];
}

function loadHandlerWithMock(ClientImpl) {
  require.cache[pgPath] = { exports: { Client: ClientImpl } };
  delete require.cache[handlerPath];
  return require('../contract-data.js').handler;
}

test('returns 400 when cer_id is missing', async (t) => {
  t.after(() => {
    restore();
  });
  delete process.env.NEON_DATABASE_URL;
  delete process.env.DATABASE_URL;
  delete process.env.NETLIFY_DATABASE_URL;
  delete process.env.NETLIFY_DATABASE_URL_UNPOOLED;

  const handler = loadHandlerWithMock(class {
    async connect() {}
    async query() { throw new Error('should not query without cer_id'); }
    async end() {}
  });

  const res = await handler({ queryStringParameters: null });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(JSON.parse(res.body), { error: 'cer_id mancante' });
});

test('returns 500 when database url is missing', async (t) => {
  t.after(() => {
    restore();
  });
  delete process.env.NEON_DATABASE_URL;
  delete process.env.DATABASE_URL;
  delete process.env.NETLIFY_DATABASE_URL;
  delete process.env.NETLIFY_DATABASE_URL_UNPOOLED;

  const handler = loadHandlerWithMock(class {
    async connect() { throw new Error('should not connect without db url'); }
    async query() {}
    async end() {}
  });

  const res = await handler({ queryStringParameters: { cer_id: 'abc' } });
  assert.equal(res.statusCode, 500);
  assert.deepEqual(JSON.parse(res.body), { error: 'DB non configurato' });
});

test('returns cer data with members and riparti', async (t) => {
  t.after(() => {
    restore();
    delete process.env.NEON_DATABASE_URL;
  });

  process.env.NEON_DATABASE_URL = 'postgres://example';
  const queries = [];
  class MockClient {
    constructor() {
      this.connected = false;
      this.closed = false;
    }
    async connect() {
      this.connected = true;
    }
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.startsWith('SELECT id,nome,cabina')) {
        return { rows: [{ id: 'cer-1', nome: 'CER Uno', cabina: 'CAB-1', quota_condivisa: 50, riparti: { foo: 'bar' } }] };
      }
      if (sql.startsWith('SELECT pod,cabina')) {
        return { rows: [{ pod: 'IT123', cabina: 'CAB-1' }, { pod: 'IT456', cabina: 'CAB-2' }] };
      }
      if (sql.includes('CREATE TABLE IF NOT EXISTS cer_members')) {
        return { rows: [] };
      }
      if (sql.startsWith('SELECT id,role,display_name')) {
        return { rows: [{ id: 'mem-1', role: 'PRESIDENTE', display_name: 'Mario Rossi', cf_piva: 'RSSMRA', pec: 'mario@pec', email: 'mario@example.com' }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    }
    async end() {
      this.closed = true;
    }
  }

  const handler = loadHandlerWithMock(MockClient);

  const res = await handler({ queryStringParameters: { cer_id: 'cer-1' } });
  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  assert.deepEqual(payload.cer, { id: 'cer-1', nome: 'CER Uno', cabina: 'CAB-1', quota_condivisa: 50, riparti: { foo: 'bar' } });
  assert.equal(payload.pod_univoco, 'IT123');
  assert.deepEqual(payload.membri, [{ id: 'mem-1', role: 'PRESIDENTE', display_name: 'Mario Rossi', cf_piva: 'RSSMRA', pec: 'mario@pec', email: 'mario@example.com' }]);
  assert.deepEqual(payload.riparti, { foo: 'bar' });
  assert.equal(typeof payload.generated_at, 'number');

  assert.ok(queries.some(q => q.sql.includes('CREATE TABLE IF NOT EXISTS cer_members')));
});
