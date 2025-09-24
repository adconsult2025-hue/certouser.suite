// netlify/functions/customers-create.js
const { withClient, ensureSchema, success, failure } = require('./_db.js');

function uuid() {
  return (globalThis.crypto && globalThis.crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');

    const type = (body.type || '').toLowerCase();   // 'privato' | 'piva'
    const name = (body.name || '').trim();
    const email = (body.email || null);

    if (!name) return failure('Nome / Ragione sociale obbligatorio', 400);
    if (!['privato','piva'].includes(type)) return failure('Tipo cliente non valido', 400);

    let piva = null, cf = null;
    if (type === 'piva') {
      piva = (body.piva || '').trim();
      if (!piva) return failure('P.IVA obbligatoria per aziende', 400);
    } else {
      cf = (body.cf || '').trim();
      if (!cf) return failure('Codice Fiscale obbligatorio per privati', 400);
    }

    return await withClient(async (client) => {
      await ensureSchema(client);
      const id = uuid();
      await client.query(
        `INSERT INTO customers (id, type, name, email, piva, cf) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, type, name, email, piva, cf]
      );
      return success({ id });
    });
  } catch (e) {
    return failure(e.message || String(e), 500);
  }
};
