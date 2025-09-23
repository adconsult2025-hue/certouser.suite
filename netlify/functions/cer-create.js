// netlify/functions/cer-create.js
const { withClient, ensureSchema, success, failure } = require('./_db.js');

const CER_FIXED = 15; // fisso a 15%
const PROD_MAX  = 55;
const PROS_MAX  = 50;

exports.handler = async (event) => {
  try {
    const p = JSON.parse(event.body || '{}');
    if (!p.name) return failure('Missing required field: name', 400);

    const prod = Number(p.split_prod ?? 0);
    if (!Number.isFinite(prod) || prod < 0 || prod > 100) return failure('Produttore fuori range 0–100', 400);
    if (prod > PROD_MAX) return failure(`Produttore oltre ${PROD_MAX}%`, 400);

    // Prosumer = resto fino a max 50%
    const rawPros = Math.max(0, 100 - CER_FIXED - prod);
    const pros = Math.min(PROS_MAX, rawPros);
    if (rawPros > PROS_MAX) return failure(`Resto ai Consumers supera ${PROS_MAX}%: riduci Produttore`, 400);

    const quota = p.quota_shared == null ? null : Number(p.quota_shared);
    if (quota != null && (!Number.isFinite(quota) || quota < 0 || quota > 100)) {
      return failure('Quota condivisa fuori range 0–100', 400);
    }

    const id = (globalThis.crypto && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : String(Date.now());
    const vals = [
      id,
      p.name,
      p.cabina || null,
      quota,
      prod,
      pros,
      CER_FIXED,
      p.trader || null
    ];

    return await withClient(async (client) => {
      await ensureSchema(client);
      await client.query(`
        INSERT INTO cer (id, name, cabina, quota_shared, split_prod, split_prosumer, split_cer_to_user, trader)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, vals);
      return success({ id, computed: { split_prosumer: pros, split_cer_to_user: CER_FIXED } });
    });
  } catch (e) {
    return failure(e.message);
  }
};
