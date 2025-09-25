// netlify/functions/cer-list.js
const { withClient, ensureSchema, success, failure } = require('./_db.js');

// Alias di sicurezza nel caso restassero refusi nel file
const failure2 = failure;
const success2 = success;

module.exports.handler = async (event) => {
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
    // usa sempre failure (gli alias sopra servono solo se da qualche parte rimane scritto failure2/success2)
    return failure(e.message || String(e), 500);
  }
};
