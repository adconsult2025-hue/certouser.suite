const { withClient, ensureSchema, success, failure } = require('./_db.js');

module.exports.handler = async (event) => {
  try {
    const customer_id = event.queryStringParameters && event.queryStringParameters.customer_id;
    if (!customer_id) return { statusCode: 400, body: JSON.stringify({ error: 'missing customer_id' }) };
    return await withClient(async (client) => {
      await ensureSchema(client);
      const r = await client.query(`
        SELECT id, name, mime, size, url, created_at
        FROM customer_files WHERE customer_id=$1
        ORDER BY created_at DESC
      `, [customer_id]);
      return success({ items: r.rows });
    });
  } catch (e) { return failure(e.message || String(e), 500); }
};
