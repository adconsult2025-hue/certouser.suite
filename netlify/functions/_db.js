// netlify/functions/_db.js
// Helper condivisi per tutte le funzioni Netlify (DB + risposte)

// Dipendenze
const { Client } = require('pg');

// ===== Helpers HTTP =====
function success(body, code = 200) {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function failure(msg, code = 500, extra = {}) {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: msg, ...extra }),
  };
}

// ===== Connessione DB =====
function getDbUrl() {
  const url =
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL_UNPOOLED;

  if (!url) {
    throw new Error('NEON_DATABASE_URL / DATABASE_URL non impostato');
  }
  return url;
}

async function withClient(fn) {
  const client = new Client({
    connectionString: getDbUrl(),
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// ===== Schema minimo (idempotente) =====
async function ensureSchema(client) {
  // customers
  await client.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('privato','piva')),
      name TEXT NOT NULL,
      email TEXT,
      piva TEXT,
      cf TEXT,
      -- Estensioni CRM
      phone TEXT,
      mobile TEXT,
      whatsapp TEXT,
      status TEXT,
      score INT,
      tags TEXT[],
      last_contact_at TIMESTAMPTZ,
      next_action TEXT,
      owner TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // vincolo status opzionale
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'customers_status_check'
      ) THEN
        ALTER TABLE customers
        ADD CONSTRAINT customers_status_check
        CHECK (status IS NULL OR status IN ('lead','prospect','client','suspended'));
      END IF;
    END $$;
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers ((lower(name)));
  `);

  // cer (testata)
  await client.query(`
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
  `);

  // cer_members (righe)
  await client.query(`
    CREATE TABLE IF NOT EXISTS cer_members (
      id TEXT PRIMARY KEY,
      cer_id TEXT NOT NULL REFERENCES cer(id) ON DELETE CASCADE,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      role TEXT NOT NULL CHECK (role IN ('producer','consumer')),
      weight NUMERIC,
      group_share NUMERIC,
      abs_share NUMERIC,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_cer_members_cer ON cer_members(cer_id);
    CREATE INDEX IF NOT EXISTS idx_cer_members_customer ON cer_members(customer_id);
  `);

  // allegati per CRM (opzionali)
  await client.query(`
    CREATE TABLE IF NOT EXISTS customer_files (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      mime TEXT,
      size INT,
      key TEXT NOT NULL,
      url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_customer_files_cust ON customer_files(customer_id);
  `);
}

// ===== Export (con alias a prova di refusi) =====
module.exports = {
  withClient,
  ensureSchema,
  success,
  failure,
  // alias anti-refuso (qualsiasi vecchia chiamata non romperà)
  success2: success,
  failure2: failure,
  withClient2: withClient,
  ensureSchema2: ensureSchema,
};
