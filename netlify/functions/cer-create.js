const { withClient, ensureSchema, success, failure } = require('./_db.js');

exports.handler = async (event) => {
  try {
    const p = JSON.parse(event.body || '{}');
    const required = ['name'];
    for (const k of required) {
      if (!p[k]) return failure(`Missing required field: ${k}`, 400);
    }
    const id = (globalThis.crypto && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : String(Date.now());
    const vals = [
      id,
      p.name,
      p.cabina || null,
      p.quota_shared ?? null,
      p.split_prod ?? null,
      p.split_prosumer ?? null,
      p.split_cer_to_user ?? null,
      p.trader || null
    ];
    return await withClient(async (client) => {
      await ensureSchema(client);
      await client.query(`
        INSERT INTO cer (id, name, cabina, quota_shared, split_prod, split_prosumer, split_cer_to_user, trader)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, vals);
      return success({ id });
    });
  } catch (e) {
    return failure(e.message);
  }
};
