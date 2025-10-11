const { initAdmin, scopeMatch, getScopeByEmail } = require("./_lib/common");
// TODO: sostituire con DB reale
const DB = {
  cers: [
    { id: "CER001", nome: "CER Terracina", cabina: "CP-123", province: "LT" },
    { id: "CER045", nome: "CER Latina",     cabina: "CP-789", province: "LT" }
  ]
};
exports.handler = async (event, context) => {
  try {
    const user = context.clientContext && context.clientContext.user;
    if (!user) return { statusCode: 401, body: JSON.stringify({ error: "Identity token required" }) };

    const email = user.email || (user.app_metadata && user.app_metadata.email);
    const admin = initAdmin();
    const scope = await getScopeByEmail(admin, email);

    const result = DB.cers.filter(row => scopeMatch(scope, row));
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e.message || e) }) };
  }
};

