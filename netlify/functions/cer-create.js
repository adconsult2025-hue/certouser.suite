// netlify/functions/cer-create.js
const { withClient, ensureSchema, success, failure } = require('./_db.js');

const CER_FIXED = 15; // fisso a 15%
const PROD_MAX  = 55;
const PROS_MAX  = 50;

exports.handler = async (event) => {
  try {
    const p = JSON.parse(event.body || '{}');
    if (!p.name) return failure('Missing required field: name', 400);

    // --- Riparti a livello CER
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

    // --- Membri con pesi
    const members = Array.isArray(p.members) ? p.members : [];
    for (const m of members) {
      if (!m || !m.customer_id) return failure('Member senza customer_id', 400);
      if (!['producer','consumer'].includes(m.role)) return failure('Member role invalido', 400);
      const w = Number(m.weight ?? 0);
      if (!Number.isFinite(w) || w < 0) return failure('Peso membro non valido (deve essere >=0)', 400);
    }

    // somma pesi per ruolo
    const sumW = { producer: 0, consumer: 0 };
    for (const m of members) sumW[m.role] += Number(m.weight ?? 0);

    // requisiti minimi: se split di un ruolo > 0 e ci sono membri con peso 0 totale -> errore
    if (prod > 0 && sumW.producer <= 0 && members.some(m => m.role === 'producer')) {
      return failure('Pesi produttori tutti a 0: impostane almeno uno >0', 400);
    }
    if (pros > 0 && sumW.consumer <= 0 && members.some(m => m.role === 'consumer')) {
      return failure('Pesi consumer tutti a 0: impostane almeno uno >0', 400);
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

        // Inserisci membri con normalizzazione per ruolo
        for (const m of members) {
          const mid = (globalThis.crypto && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
          const w = Number(m.weight ?? 0);
          const totalW = sumW[m.role] || 0;
          // group_share: se non ci sono pesi nel gruppo (totalW=0), assegna 0 per sicurezza
          const groupShare = totalW > 0 ? (w / totalW) * 100 : 0;
          const roleSplit = m.role === 'producer' ? prod : pros;
          const absShare = groupShare * roleSplit / 100;

          await client.query(`
            INSERT INTO cer_members (id, cer_id, customer_id, role, weight, group_share, abs_share)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
          `, [mid, id, m.customer_id, m.role, w, groupShare, absShare]);
        }

        await client.query('COMMIT');
        return success({
          id,
          splits: { prod, pros, cer_to_user: CER_FIXED },
          members: members.length
        });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    });
  } catch (e) {
    return failure(e.message);
  }
};
