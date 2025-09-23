const { withClient, ensureSchema, success, failure } = require('./_db.js');

exports.handler = async () => {
  try {
    await withClient(async (client) => {
      await ensureSchema(client);
    });
    return success({ ok: true });
  } catch (e) {
    return failure(e.message);
  }
};
