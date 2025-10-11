const { query } = require('./_db');
const { getAdmin } = require('./common');

function cors(){ return { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" }; }
function ok(d){ return { statusCode: 200, headers: cors(), body: JSON.stringify(d) }; }
function bad(m){ return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: m }) }; }
function err(e){ console.error("ROLES ERROR:", e && (e.stack || e)); return { statusCode: 502, headers: cors(), body: JSON.stringify({ error: e.message || "Server error" }) }; }

exports.handler = async (ev) => {
  if (ev.httpMethod === 'OPTIONS') return ok({});

  try {
    const admin = getAdmin(); // opzionale

    if (ev.httpMethod === 'GET') {
      const q = (ev.queryStringParameters?.q || '').trim();
      const sql = `select email, role, coalesce(cer_id,'') as cer_id, coalesce(territori,'') as territori, assigned_at
                   from roles ${q ? "where email ilike $1 or role ilike $1 or coalesce(cer_id,'') ilike $1" : ""}
                   order by assigned_at desc limit 500`;
      const res = q ? await query(sql, [`%${q}%`]) : await query(sql);
      return ok({ rows: res.rows });
    }

    if (ev.httpMethod === 'POST') {
      const body = JSON.parse(ev.body || '{}');
      const { email, role, cer_id = '', territori = null, action = 'assign', display_name = null } = body;
      if (!email) return bad('email mancante');

      if (action === 'revoke') {
        await query('delete from roles where email=$1', [email]);
        return ok({ revoked: true });
      }

      if (!role) return bad('role mancante');

      // users
      await query('insert into users(email, display_name) values($1,$2) on conflict (email) do nothing', [email, display_name]);

      // roles upsert: usa la UNIQUE(email,role,cer_id)
      await query(
        `insert into roles(email, role, cer_id, territori)
         values($1,$2,$3,$4)
         on conflict (email, role, cer_id) do update
         set territori = excluded.territori,
             cer_id    = excluded.cer_id,
             assigned_at = now()`,
        [email, role, cer_id ?? '', territori]
      );

      // opzionale: bootstrap utente in Firebase
      if (admin && email) {
        try {
          const a = getAdmin().auth();
          let u = null;
          try { u = await a.getUserByEmail(email); } catch (_) {}
          if (!u) await a.createUser({ email, emailVerified: false, disabled: false });
        } catch (fe) { console.warn('Firebase createUser warning:', fe.message); }
      }

      return ok({ assigned: true });
    }

    return bad('Metodo non supportato');
  } catch (e) { return err(e); }
};