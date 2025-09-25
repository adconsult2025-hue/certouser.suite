const { withClient, ensureSchema, success, failure } = require('./_db.js');
const failure2 = failure, success2 = success;

function uuid(){ return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`); }

module.exports.handler = async (event) => {
  try {
    const b = JSON.parse(event.body || '{}');
    const id = b.id || uuid();
    const name = (b.name||'').trim();
    if (!name) return failure('missing name', 400);

    // parametri CER (fissi+variabili)
    const split_cer_to_user = Number.isFinite(+b.split_cer_to_user) ? +b.split_cer_to_user : 15;
    const split_prod = Number.isFinite(+b.split_prod) ? +b.split_prod : 55;
    const split_prosumer = Number.isFinite(+b.split_prosumer) ? +b.split_prosumer : 50;
    const cabina = b.cabina || null;
    const quota_shared = Number.isFinite(+b.quota_shared) ? +b.quota_shared : null;
    const trader = b.trader || null;

    return await withClient(async (client)=>{
      await ensureSchema(client);
      await client.query('BEGIN');
      // upsert CER
      await client.query(`
        INSERT INTO cer (id, name, cabina, quota_shared, split_prod, split_prosumer, split_cer_to_user, trader)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE SET
          name=excluded.name, cabina=excluded.cabina, quota_shared=excluded.quota_shared,
          split_prod=excluded.split_prod, split_prosumer=excluded.split_prosumer,
          split_cer_to_user=excluded.split_cer_to_user, trader=excluded.trader
      `,[id, name, cabina, quota_shared, split_prod, split_prosumer, split_cer_to_user, trader]);

      // membri iniziali (opzionali)
      const members = Array.isArray(b.members)? b.members : [];
      for (const m of members){
        const mid = uuid();
        const role = m.role==='producer' ? 'producer' : 'consumer';
        const weight = Number.isFinite(+m.weight) ? +m.weight : 0;
        await client.query(`
          INSERT INTO cer_members (id, cer_id, customer_id, role, weight)
          VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT (id) DO NOTHING
        `,[mid, id, m.customer_id, role, weight]);
      }
      await client.query('COMMIT');
      return success({ id });
    });
  } catch(e){ return failure(e.message||String(e), 500); }
};
