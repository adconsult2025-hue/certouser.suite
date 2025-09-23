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

    CREATE TABLE IF NOT EXISTS customer_files (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime TEXT,
      size_bytes INTEGER,
      content BYTEA,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_customer_files_customer_id ON customer_files(customer_id);

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'contract', 'statuto', etc.
      content TEXT NOT NULL,     -- base64 or plain text
      encoding TEXT DEFAULT 'base64',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

function success(body, statusCode = 200) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function failure(message, statusCode = 500, extra = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: message, ...extra })
  };
}

module.exports = { withClient, ensureSchema, success, failure };
