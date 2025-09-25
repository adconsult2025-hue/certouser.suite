const { withClient, ensureSchema, success, failure } = require('./_db.js');
const failure2 = failure, success2 = success;

module.exports.handler = async (event) => {
  try {
    const b = JSON.parse(event.body||'{}');
    const id = b.id || event.queryStringParameters?.id;
    if(!id) return failure('missing id', 400);
    return await withClient(async (client)=>{
      await ensureSchema(client);
      await client.query('BEGIN');
      await client.query(`DELETE FROM cer_members WHERE cer_id=$1`, [id]);
      const r = await client.query(`DELETE FROM cer WHERE id=$1`, [id]);
      await client.query('COMMIT');
      if (!r.rowCount) return failure('not found', 404);
      return success({ id });
    });
  } catch(e){ return failure(e.message||String(e), 500); }
};
