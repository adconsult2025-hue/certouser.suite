const { withClient, ensureSchema, success, failure } = require('./_db.js');

exports.handler = async () => {
  try {
    return await withClient(async (client) => {
      await ensureSchema(client);
      const res = await client.query('SELECT id, type, name, email, piva, created_at FROM customers ORDER BY created_at DESC LIMIT 200');
      return success({ items: res.rows });
    });
  } catch (e) {
    return failure(e.message);
  }
};
