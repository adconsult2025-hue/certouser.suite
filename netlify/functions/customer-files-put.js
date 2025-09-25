const { withClient, ensureSchema, success, failure } = require('./_db.js');
const { blobs } = require('@netlify/blobs');

function uuid(){ return (globalThis.crypto && globalThis.crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`; }

module.exports.handler = async (event) => {
  try {
    const customer_id = event.queryStringParameters && event.queryStringParameters.customer_id;
    const name = event.queryStringParameters && event.queryStringParameters.name;
    const mime = event.headers['content-type'] || 'application/octet-stream';
    if (!customer_id || !name) return { statusCode: 400, body: JSON.stringify({ error: 'missing customer_id or name' }) };

    const buf = Buffer.from(event.body || '', event.isBase64Encoded ? 'base64' : 'utf8');
    const size = buf.length;

    const key = `customers/${customer_id}/${uuid()}_${name}`;
    const store = blobs();
    await store.set(key, buf, { contentType: mime });
    const url = store.getPublicUrl ? store.getPublicUrl(key) : null;

    return await withClient(async (client) => {
      await ensureSchema(client);
      const id = uuid();
      await client.query(`
        INSERT INTO customer_files (id, customer_id, name, mime, size, key, url)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [id, customer_id, name, mime, size, key, url]);
      return success({ id, url });
    });
  } catch (e) { return failure(e.message || String(e), 500); }
};
