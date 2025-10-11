const { Client } = require('pg');

const DB_URL = process.env.NETLIFY_DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!DB_URL) throw new Error('DATABASE URL mancante (NETLIFY_DATABASE_URL / NEON_DATABASE_URL / DATABASE_URL)');

const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

const INIT_SQL = 
create table if not exists users (
  id bigserial primary key,
  email text unique not null,
  display_name text,
  created_at timestamptz default now()
);
create table if not exists roles (
  id bigserial primary key,
  email text not null references users(email) on delete cascade,
  role  text not null check (role in ('SUPERADMIN','ADMIN_CER','COLLABORATORE','VIEWER')),
  cer_id text,
  territori text,
  assigned_at timestamptz default now()
);
create index if not exists roles_email_idx on roles(email);
create index if not exists roles_cer_idx   on roles(cer_id);
-- unico per (email, role, COALESCE(cer_id,''))
create unique index if not exists roles_unique
  on roles(email, role, coalesce(cer_id,''));
;

let _ready;
async function ready() {
  if (!_ready) {
    _ready = (async () => {
      await client.connect();
      await client.query('begin');
      try { await client.query(INIT_SQL); await client.query('commit'); }
      catch (e) { try { await client.query('rollback'); } catch {} throw e; }
    })();
  }
  return _ready;
}

async function query(text, params) { await ready(); return client.query(text, params); }
module.exports = { query };