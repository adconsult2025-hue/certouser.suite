// netlify/functions/_db.js
const { Client } = require('pg');

function getDbUrl() {
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  if (!url) throw new Error('NEON_DATABASE_URL is not set.');
  return url;
}

async function withClient(fn) {
  const client = new Client({
    connectionString: getDbUrl(),
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function ensureSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, -- 'privato' | 'piva'
      name TEXT NOT NULL,
      email TEXT,
      piva TEXT,
      cf TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cer (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cabina TEXT,
      quota_shared NUMERIC,
      split_prod NUMERIC,
      split_prosumer NUMERIC,
      split_cer_to_user NUMERIC,
      trader TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cer_members (
      id TEXT PRIMARY KEY,
      cer_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      role TEXT NOT NULL,     -- 'producer' | 'consumer'
      weight NUMERIC,         -- parametro inserito dall'utente (>=0)
      group_share NUMERIC,    -- % sul 100% del gruppo (normalizzata)
      abs_share NUMERIC,      -- % sull'intera CER (group_share * split_role / 100)
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_cer_members_cer ON cer_members(cer_id);
    CREATE INDEX IF NOT EXISTS idx_cer_members_customer ON cer_members(customer_id);
  `);
}

function success(body, statusCode = 200) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
function failure(message, statusCode = 500, extra = {}) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: message, ...extra }) };
}

module.exports = { withClient, ensureSchema, success, failure };
