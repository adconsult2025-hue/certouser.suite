// netlify/functions/cer-list.js
// Versione blindata: NON usa success/failure da _db per evitare qualsiasi refuso.
// Manteniamo solo DB helpers.
const { withClient, ensureSchema } = require('./_db.js');

// Risposte locali (no dipendenze esterne)
const ok = (body, code = 200) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const ko = (msg, code = 500) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ error: msg }),
});

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

      return ok({ items: r.rows, endpoint: 'cer-list' });
    });
  } catch (e) {
    return ko(e.message || String(e), 500);
  }
};
