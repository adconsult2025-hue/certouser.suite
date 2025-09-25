const { withClient, ensureSchema, success, failure } = require('./_db.js');
const failure2 = failure, success2 = success;

module.exports.handler = async (event) => {
  try {
    return await withClient(async (client)=>{
      await ensureSchema(client);
      const r = await client.query(`
        SELECT id, name, cabina, quota_shared, split_prod, split_prosumer, split_cer_to_user, trader, created_at
        FROM cer ORDER BY created_at DESC LIMIT 200
      `);
      return success({ items: r.rows });
    });
  } catch(e){ return failure(e.message||String(e), 500); }
};
