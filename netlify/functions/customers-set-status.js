const { withClient, ensureSchema, success, failure } = require('./_db.js');

module.exports.handler = async (event) => {
  try {
    const { id, status, score, next_action, owner, phone, mobile, whatsapp } = JSON.parse(event.body||'{}');
    if (!id) return { statusCode: 400, body: JSON.stringify({ error:'missing id' }) };
    return await withClient(async (client)=>{
      await ensureSchema(client);
      await client.query(`
        UPDATE customers
           SET status=$2, score=$3, next_action=$4, owner=$5, phone=$6, mobile=$7, whatsapp=$8, last_contact_at=NOW()
         WHERE id=$1
      `, [id, status||null, Number.isFinite(score)?score:null, next_action||null, owner||null, phone||null, mobile||null, whatsapp||null]);
      return success({ id });
    });
  } catch (e){ return failure(e.message || String(e), 500); }
};
