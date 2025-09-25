const { withClient, ensureSchema, success, failure } = require('./_db.js');

module.exports.handler = async (event) => {
  try {
    const q = (event.queryStringParameters && event.queryStringParameters.q) || '';
    return await withClient(async (client) => {
      await ensureSchema(client);

      let res;
      if (q) {
        res = await client.query(`
          SELECT id, type, name, email, piva, cf, status, score, owner, next_action, created_at
          FROM customers
          WHERE lower(name) LIKE lower($1)
             OR coalesce(email,'') ILIKE $1
             OR coalesce(piva,'') ILIKE $1
             OR coalesce(cf,'') ILIKE $1
          ORDER BY created_at DESC
          LIMIT 500
        `, [`%${q}%`]);
      } else {
        res = await client.query(`
          SELECT id, type, name, email, piva, cf, status, score, owner, next_action, created_at
          FROM customers
          ORDER BY created_at DESC
          LIMIT 500
        `);
      }

      return success({ items: res.rows });
    });
  } catch (e) {
    return failure(e.message || String(e), 500);
  }
};
