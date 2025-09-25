const { withClient, ensureSchema, success, failure, success2, failure2 } = require('./_db.js');

module.exports.handler = async () => {
  try {
    return await withClient(async (client) => {
      await ensureSchema(client);
      const r = await client.query(`
        SELECT id, name, cabina, quota_shared, split_prod, split_prosumer, split_cer_to_user, trader, created_at
        FROM cer
        ORDER BY created_at DESC
        LIMIT 200
      `);
      return success({ items: r.rows });
    });
  } catch (e) {
    // chiamiamo SEMPRE failure; gli alias esistono solo per compatibilità
    return failure(e.message || String(e), 500);
  }
};
