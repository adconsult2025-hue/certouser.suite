const { Client } = require("pg");

function ok(body){return{statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}}
function bad(code,msg){return{statusCode:code,headers:{'Content-Type':'application/json'},body:JSON.stringify({error:msg})}}

exports.handler = async (event)=>{
  try{
    const cer_id = (event.queryStringParameters||{}).cer_id;
    if (!cer_id) return bad(400,'cer_id mancante');

    const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED;
    if (!url) return bad(500,'DB non configurato');

    const client = new Client({ connectionString:url });
    await client.connect();

    const cerRes = await client.query('SELECT id,nome,cabina,quota_condivisa,riparti FROM cer WHERE id=$1',[cer_id]);
    if (!cerRes.rows.length) { await client.end(); return bad(404,'CER non trovata'); }
    const cer = cerRes.rows[0];

    const pods = (await client.query('SELECT pod,cabina FROM cer_pod WHERE cer_id=$1 ORDER BY pod',[cer_id])).rows;

    // Garantiamo l'esistenza della tabella membri (anche se vuota)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cer_members (
        id uuid PRIMARY KEY,
        cer_id uuid NOT NULL,
        role text NOT NULL,
        display_name text NOT NULL,
        cf_piva text,
        pec text,
        email text
      )
    `);
    const members = (await client.query(
      'SELECT id,role,display_name,cf_piva,pec,email FROM cer_members WHERE cer_id=$1 ORDER BY display_name',[cer_id]
    )).rows;

    const pod_univoco = pods[0]?.pod || '';

    await client.end();
    return ok({ cer, pod_univoco, membri: members, riparti: cer.riparti || {}, generated_at: Date.now() });
  }catch(e){
    return bad(500,e.message);
  }
};
