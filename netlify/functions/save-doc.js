const { Client } = require("pg");
const { randomUUID } = require("crypto");

function res(code, body){return{statusCode:code,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}}

exports.handler = async (event)=>{
  if (event.httpMethod !== 'POST') return res(405,{error:'Metodo non consentito'});
  let body;
  try{ body = JSON.parse(event.body||'{}'); }catch(_){ return res(400,{error:'JSON non valido'}); }

  const { cer_id, doc_type, filename, content_base64, mime='text/plain' } = body;
  if (!cer_id || !doc_type || !filename || !content_base64) return res(400,{error:'campi obbligatori: cer_id, doc_type, filename, content_base64'});

  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED;
  if (!url) return res(500,{error:'DB non configurato'});

  const client = new Client({ connectionString: url });
  try{
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS cer_docs (
        id uuid PRIMARY KEY,
        cer_id uuid NOT NULL,
        doc_type text NOT NULL,
        filename text NOT NULL,
        mime text NOT NULL,
        content bytea NOT NULL,
        created_at timestamptz DEFAULT now()
      )
    `);
    const buffer = Buffer.from(content_base64, 'base64');
    await client.query(
      'INSERT INTO cer_docs (id,cer_id,doc_type,filename,mime,content) VALUES ($1,$2,$3,$4,$5,$6)',
      [randomUUID(), cer_id, doc_type, filename, mime, buffer]
    );
    return res(200,{ok:true});
  }catch(e){
    return res(500,{error:e.message});
  }finally{
    try{ await client.end(); }catch(_){}
  }
};
