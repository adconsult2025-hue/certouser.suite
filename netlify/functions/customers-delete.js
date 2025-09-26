const { withClient, ensureSchema, success, failure } = require('./_db.js');
const { blobs } = require('@netlify/blobs');

module.exports.handler = async (event) => {
  try {
    let id = null;
    if (event.body) {
      try {
        const body = JSON.parse(event.body || '{}');
        if (body && body.id) id = String(body.id).trim();
      } catch (err) {
        return failure('JSON non valido', 400);
      }
    }
    if (!id && event.queryStringParameters && event.queryStringParameters.id) {
      id = String(event.queryStringParameters.id).trim();
    }

    if (!id) return failure('ID cliente mancante', 400);

    return await withClient(async (client) => {
      await ensureSchema(client);

      await client.query('BEGIN');
      const filesRes = await client.query(
        `SELECT key FROM customer_files WHERE customer_id=$1`,
        [id]
      );
      const deleteRes = await client.query(
        `DELETE FROM customers WHERE id=$1`,
        [id]
      );

      if (!deleteRes.rowCount) {
        await client.query('ROLLBACK');
        return failure('Cliente non trovato', 404);
      }

      await client.query('COMMIT');

      const store = blobs();
      for (const row of filesRes.rows) {
        if (!row.key) continue;
        try {
          await store.delete(row.key);
        } catch (err) {
          // ignore blob deletion errors
        }
      }

      return success({ id });
    });
  } catch (e) {
    return failure(e.message || String(e), 500);
  }
};
