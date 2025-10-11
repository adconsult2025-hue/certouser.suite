const test = require('node:test');
const assert = require('node:assert/strict');

const handlerPath = require.resolve('../save-doc.js');
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
  return require('../save-doc.js').handler;
}

test('rejects non POST methods', async (t) => {
  t.after(restore);
  const handler = loadHandlerWithMock(class {
    async connect() { throw new Error('should not connect'); }
    async query() {}
    async end() {}
  });

  const res = await handler({ httpMethod: 'GET' });
  assert.equal(res.statusCode, 405);
  assert.deepEqual(JSON.parse(res.body), { error: 'Metodo non consentito' });
});

test('rejects invalid JSON', async (t) => {
  t.after(restore);
  const handler = loadHandlerWithMock(class {
    async connect() { throw new Error('should not connect'); }
    async query() {}
    async end() {}
  });

  const res = await handler({ httpMethod: 'POST', body: 'non-json' });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(JSON.parse(res.body), { error: 'JSON non valido' });
});

test('requires mandatory fields', async (t) => {
  t.after(restore);
  const handler = loadHandlerWithMock(class {
    async connect() { throw new Error('should not connect'); }
    async query() {}
    async end() {}
  });

  const res = await handler({ httpMethod: 'POST', body: JSON.stringify({}) });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(JSON.parse(res.body), { error: 'campi obbligatori: cer_id, doc_type, filename, content_base64' });
});

test('saves document content to the database', async (t) => {
  t.after(() => {
    restore();
    delete process.env.NEON_DATABASE_URL;
  });

  process.env.NEON_DATABASE_URL = 'postgres://example';
  const executed = [];

  class MockClient {
    async connect() {
      executed.push({ step: 'connect' });
    }
    async query(sql, params) {
      if (sql.includes('CREATE TABLE IF NOT EXISTS cer_docs')) {
        executed.push({ step: 'create-table' });
        return { rows: [] };
      }
      if (sql.startsWith('INSERT INTO cer_docs')) {
        executed.push({ step: 'insert', params });
        return { rows: [] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    }
    async end() {
      executed.push({ step: 'end' });
    }
  }

  const handler = loadHandlerWithMock(MockClient);
  const body = {
    cer_id: 'cer-1',
    doc_type: 'test',
    filename: 'documento.txt',
    content_base64: Buffer.from('ciao mondo', 'utf8').toString('base64')
  };

  const res = await handler({ httpMethod: 'POST', body: JSON.stringify(body) });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { ok: true });

  const insertCall = executed.find(e => e.step === 'insert');
  assert.ok(insertCall, 'expected an insert query');
  const params = insertCall.params;
  assert.equal(params[1], 'cer-1');
  assert.equal(params[2], 'test');
  assert.equal(params[3], 'documento.txt');
  assert.equal(params[4], 'text/plain');
  assert.ok(Buffer.isBuffer(params[5]));
  assert.equal(params[5].toString('utf8'), 'ciao mondo');
});
