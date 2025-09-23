// netlify/functions/customers-create.js
const { withClient, ensureSchema, success, failure } = require('./_db.js');

exports.handler = async (event) => {
  try {
    const payload = JSON.parse(event.body || '{}');
    let { type, name, email, piva, cf } = payload;

    if (!type || !name) return failure('Missing required fields: type, name', 400);
    if (!['privato', 'piva'].includes(type)) return failure('Invalid type', 400);

    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) {
      return failure('Email non valida', 400);
    }

    if (type === 'piva') {
      if (!piva || !/^[0-9A-Z]{11}$/i.test(String(piva).trim())) {
        return failure('P.IVA non valida (11 caratteri)', 400);
      }
      cf = null; // non salvo CF per aziende
    } else {
      if (!cf || !/^[A-Z0-9]{16}$/i.test(String(cf).trim())) {
        return failure('Codice Fiscale non valido (16 caratteri)', 400);
      }
      piva = null; // non salvo P.IVA per privati
    }

    const id = (globalThis.crypto && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : String(Date.now());

    return await withClient(async (client) => {
      await ensureSchema(client);
      await client.query(
        'INSERT INTO customers (id, type, name, email, piva, cf) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, type, name, email || null, piva || null, cf || null]
      );
      return success({ id });
    });
  } catch (e) {
    return failure(e.message);
  }
};
