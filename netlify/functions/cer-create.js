// netlify/functions/cer-create.js
const { withClient, ensureSchema, success, failure } = require('./_db.js');

const CER_FIXED = 15; // fisso a 15%
const PROD_MAX  = 55;
const PROS_MAX  = 50;

exports.handler = async (event) => {
  try {
    const p = JSON.parse(event.body || '{}');
    if (!p.name) return failure('Missing required field: name', 400);

    // --- Riparti
    const prod = Number(p.split_prod ?? 0);
    if (!Number.isFinite(prod) || prod < 0 || prod > 100) return failure('Produttore fuori range 0–100', 400);
    if (prod > PROD_MAX) return failure(`Produttore oltre ${PROD_MAX}%`, 400);

    const rawPros = Math.max(0, 100 - CER_FIXED - prod);
    const pros = Math.min(PROS_MAX, rawPros);
    if (rawPros > PROS_MAX) return failure(`Resto ai Consumers supera ${PROS_MAX}%: riduci Produttore`, 400);

    const quota = p.quota_shared == null ? null : Number(p.quota_shared);
    if (quota != null && (!Number.isFinite(quota) || quota < 0 || quota > 100)) {
      return failure('Quota condivisa fuori range 0–100', 400);
    }

    // --- Membri
    const members = Array.isArray(p.members) ? p.members : [];
    for (const m of members) {
      if (!m || !m.customer_id) return failure('Member senza customer_id', 400);
      if (!['producer','consumer'].includes(m.role)) return failure('Member role invalido', 400);
    }

    const id = (globalThis.crypto && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : String(Date.now());

    return await withClient(async (client) => {
      await ensureSchema(client);
      try {
        await client.query('BEGIN');

        await client.query(`
          INSERT INTO cer (id, name, cabina, quota_shared, split_prod, split_prosumer, split_cer_to_user, trader)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `, [id, p.name, p.cabina || null, quota, prod, pros, CER_FIXED, p.trader || null]);

        // inserisci membri
        for (const m of members) {
          const mid = (globalThis.crypto && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
          await client.query(`
            INSERT INTO cer_members (id, cer_id, customer_id, role)
            VALUES ($1,$2,$3,$4)
          `, [mid, id, m.customer_id, m.role]);
        }

        await client.query('COMMIT');
        return success({ id, computed: { split_prosumer: pros, split_cer_to_user: CER_FIXED }, members: members.length });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    });
  } catch (e) {
    return failure(e.message);
  }
};
