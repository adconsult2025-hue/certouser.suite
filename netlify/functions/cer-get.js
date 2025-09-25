const { withClient, ensureSchema, success, failure } = require('./_db.js');
const failure2 = failure, success2 = success;

module.exports.handler = async (event) => {
  try {
    const id = event.queryStringParameters?.id;
    if (!id) return failure('missing id', 400);
    return await withClient(async (client)=>{
      await ensureSchema(client);
      const cer = await client.query(`SELECT * FROM cer WHERE id=$1`, [id]);
      if (!cer.rowCount) return failure('not found', 404);
      const members = await client.query(`
        SELECT cm.id, cm.customer_id, cm.role, cm.weight, c.name, c.type
        FROM cer_members cm
        JOIN customers c ON c.id=cm.customer_id
        WHERE cm.cer_id=$1
        ORDER BY cm.role, c.name
      `,[id]);
      return success({ cer: cer.rows[0], members: members.rows });
    });
  } catch(e){ return failure(e.message||String(e), 500); }
};
