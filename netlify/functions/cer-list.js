// netlify/functions/cer-list.js
const { withClient, ensureSchema, success, failure } = require('./_db.js');

// Alias locali: anche se restasse scritto failure2/success2 da qualche parte,
// qui NON potranno essere undefined.
const failure2 = failure;
const success2 = success;

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

      // Risposta standard
      return success({ items: r.rows });
    });
  } catch (e) {
    // Usare sempre failure; alias sopra solo per compatibilità
    return failure(e.message || String(e), 500);
  }
};
