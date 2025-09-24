// CommonJS, nessun "request", nessun searchParams
const { withClient, ensureSchema, success, failure } = require('./_db.js');

module.exports.handler = async () => {
  try {
    return await withClient(async (client) => {
      await ensureSchema(client);
      return success({ ok: true });
    });
  } catch (e) {
    return failure(e.message || String(e), 500);
  }
};
