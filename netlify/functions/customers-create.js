const { withClient, ensureSchema, success, failure } = require('./_db.js');

exports.handler = async (event) => {
  try {
    const payload = JSON.parse(event.body || '{}');
    const { type, name, email, piva } = payload;
    if (!type || !name) return failure('Missing required fields: type, name', 400);

    const id = (globalThis.crypto && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : String(Date.now());

    return await withClient(async (client) => {
      await ensureSchema(client);
      await client.query(
        'INSERT INTO customers (id, type, name, email, piva) VALUES ($1,$2,$3,$4,$5)',
        [id, type, name, email || null, piva || null]
      );
      return success({ id });
    });
  } catch (e) {
    return failure(e.message);
  }
};
