// netlify/functions/cer-list.js
const { withClient, ensureSchema, success, failure } = require('./_db.js');

exports.handler = async () => {
  try {
    return await withClient(async (client) => {
      await ensureSchema(client);
      const res = await client.query(`
        SELECT id, name, cabina, quota_shared, split_prod, split_prosumer, split_cer_to_user, trader, created_at
        FROM cer
        ORDER BY created_at DESC
        LIMIT 200
      `);
      return success({ items: res.rows });
    });
  } catch (e) {
    return failure(e.message);
  }
};
