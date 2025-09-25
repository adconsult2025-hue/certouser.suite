const { withClient, ensureSchema, success, failure } = require('./_db.js');
const failure2 = failure, success2 = success;

function uuid(){ return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`); }

module.exports.handler = async (event) => {
  try {
    const b = JSON.parse(event.body||'{}');
    const cer_id = b.cer_id, customer_id = b.customer_id;
    const role = b.role==='producer'?'producer':'consumer';
    const weight = Number.isFinite(+b.weight) ? +b.weight : 0;
    if(!cer_id || !customer_id) return failure('missing cer_id or customer_id', 400);

    return await withClient(async (client)=>{
      await ensureSchema(client);
      // se esiste, aggiorna peso/ruolo, altrimenti inserisci
      const exist = await client.query(`
        SELECT id FROM cer_members WHERE cer_id=$1 AND customer_id=$2
      `,[cer_id, customer_id]);
      if (exist.rowCount){
        await client.query(`UPDATE cer_members SET role=$3, weight=$4 WHERE id=$1`, [exist.rows[0].id, cer_id, role, weight]);
        return success({ id: exist.rows[0].id });
      }else{
        const id = uuid();
        await client.query(`
          INSERT INTO cer_members (id, cer_id, customer_id, role, weight)
          VALUES ($1,$2,$3,$4,$5)
        `,[id, cer_id, customer_id, role, weight]);
        return success({ id });
      }
    });
  } catch(e){ return failure(e.message||String(e), 500); }
};
