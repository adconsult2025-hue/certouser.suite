const { withClient, ensureSchema, success, failure } = require('./_db.js');
const { blobs } = require('@netlify/blobs');

module.exports.handler = async (event) => {
  try {
    const id = (event.queryStringParameters && event.queryStringParameters.id) || (JSON.parse(event.body||'{}')).id;
    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'missing id' }) };
    return await withClient(async (client) => {
      await ensureSchema(client);
      const f = await client.query(`SELECT key FROM customer_files WHERE id=$1`, [id]);
      if (!f.rowCount) return { statusCode: 404, body: JSON.stringify({ error: 'file not found' }) };
      const key = f.rows[0].key;
      await client.query('BEGIN');
      await client.query(`DELETE FROM customer_files WHERE id=$1`, [id]);
      await client.query('COMMIT');
      try { await blobs().delete(key); } catch {}
      return success({ id });
    });
  } catch (e) { return failure(e.message || String(e), 500); }
};
