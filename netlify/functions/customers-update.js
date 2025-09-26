const { withClient, ensureSchema, success, failure } = require('./_db.js');

module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const id = (body.id || '').trim();
    if (!id) return failure('ID cliente mancante', 400);

    const type = (body.type || '').toLowerCase();
    if (!['privato', 'piva'].includes(type)) {
      return failure('Tipo cliente non valido', 400);
    }

    const name = (body.name || '').trim();
    if (!name) return failure('Nome / Ragione sociale obbligatorio', 400);

    const email = (body.email || '').trim() || null;

    let piva = null;
    let cf = null;
    if (type === 'piva') {
      piva = (body.piva || '').trim();
      if (!piva) return failure('P.IVA obbligatoria per aziende', 400);
    } else {
      cf = (body.cf || '').trim();
      if (!cf) return failure('Codice Fiscale obbligatorio per privati', 400);
    }

    const phone = (body.phone || '').trim() || null;
    const mobile = (body.mobile || '').trim() || null;
    const whatsapp = (body.whatsapp || '').trim() || null;

    let status = body.status;
    if (status === undefined || status === null || status === '') {
      status = null;
    } else {
      status = String(status).toLowerCase();
      if (!['lead', 'prospect', 'client', 'suspended'].includes(status)) {
        return failure('Stato non valido', 400);
      }
    }

    let score = null;
    if (body.score !== undefined && body.score !== null && body.score !== '') {
      const parsed = Number(body.score);
      if (!Number.isFinite(parsed)) {
        return failure('Score non valido', 400);
      }
      score = Math.round(parsed);
    }

    const next_action = (body.next_action || '').trim() || null;
    const owner = (body.owner || '').trim() || null;

    return await withClient(async (client) => {
      await ensureSchema(client);
      const result = await client.query(
        `UPDATE customers
            SET type=$2,
                name=$3,
                email=$4,
                piva=$5,
                cf=$6,
                phone=$7,
                mobile=$8,
                whatsapp=$9,
                status=$10,
                score=$11,
                next_action=$12,
                owner=$13
          WHERE id=$1`,
        [
          id,
          type,
          name,
          email,
          piva,
          cf,
          phone,
          mobile,
          whatsapp,
          status,
          score,
          next_action,
          owner,
        ]
      );

      if (!result.rowCount) {
        return failure('Cliente non trovato', 404);
      }

      return success({ id });
    });
  } catch (e) {
    return failure(e.message || String(e), 500);
  }
};
