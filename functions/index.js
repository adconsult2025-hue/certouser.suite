const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

admin.initializeApp();
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ====== CONFIG ======
const SUPERADMINS = [
    "adconsult2025@gmail.com"
];
const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  PRODUCER: 'producer_collab',
  PROSUMER: 'prosumer',
  CONSUMER: 'consumer',
  VIEWER: 'viewer',
};
const DEFAULT_SCOPE = { cerIds: [], provinces: [], clientIds: [] };

// ====== AUTH & ACCESS HELPERS ======
async function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ error: 'Missing Bearer token' });
  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    req.user = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function superadminRequired(req, res, next) {
  const email = req.user && req.user.email;
  if (email && SUPERADMINS.includes(email)) return next();
  return res.status(403).json({ error: 'Superadmin only' });
}

function hasAnyRole(userRole, allowed) {
  if (!userRole) return false;
  if (allowed.includes(userRole)) return true;
  if (allowed.length && userRole === ROLES.SUPERADMIN) return true;
  return false;
}

function roleRequired(...allowed) {
  return (req, res, next) => {
    const r = (req.user && (req.user.role || (req.user.roles && req.user.roles[0]))) || null;
    if (!hasAnyRole(r, allowed)) return res.status(403).json({ error: 'Insufficient role' });
    return next();
  };
}

// Carica accesso effettivo da claims o Firestore (fallback se scopeRef=true)
async function loadAccess(uid, claims = {}) {
  const base = {
    role: claims.role || null,
    scope: {
      cerIds: claims.cerIds || [],
      provinces: claims.provinces || [],
      clientIds: claims.clientIds || [],
    },
  };
  if (claims.scopeRef) {
    const snap = await admin.firestore().doc(`access/${uid}`).get();
    if (snap.exists) {
      const data = snap.data() || {};
      base.role = data.role || base.role;
      base.scope = {
        cerIds: data.cerIds || [],
        provinces: data.provinces || [],
        clientIds: data.clientIds || [],
      };
    }
  }
  return base;
}

function inScope(scope, entity = {}) {
  if (!scope) return false;
  const { cerIds = [], provinces = [], clientIds = [] } = scope;
  if (entity.clientId && clientIds.includes(String(entity.clientId))) return true;
  if (entity.cerId && cerIds.includes(String(entity.cerId))) return true;
  if (entity.province && provinces.includes(String(entity.province))) return true;
  return cerIds.length === 0 && provinces.length === 0 && clientIds.length === 0 ? true : false;
}

function scopeFilter(scope) {
  return (row) => inScope(scope, row);
}

// ====== DEMO DB (sostituisci con Firestore/SQL) ======
let DB = {
  clients: [
    { id: 1, name: 'Cliente Demo', email: 'demo@certouser.it', cerId: 'CER001', province: 'LT' },
  ],
  cers: [
    { id: 'CER001', nome: 'CER Terracina', cabina: 'CP-123', province: 'LT' },
    { id: 'CER045', nome: 'CER Latina',     cabina: 'CP-789', province: 'LT' },
  ],
};

// ====== ROUTES ======
app.get('/me', authRequired, async (req, res) => {
  const acc = await loadAccess(req.user.uid, req.user);
  res.json({ uid: req.user.uid, email: req.user.email, claims: req.user, access: acc });
});

// LISTE (lettura)
app.get('/clients', authRequired, async (req, res) => {
  const acc = await loadAccess(req.user.uid, req.user);
  res.json(DB.clients.filter(scopeFilter(acc.scope)));
});
app.get('/cers', authRequired, async (req, res) => {
  const acc = await loadAccess(req.user.uid, req.user);
  res.json(DB.cers.filter(scopeFilter(acc.scope)));
});

// SCRITTURA CLIENTI: admin + producer_collab
app.post('/clients', authRequired, roleRequired(ROLES.ADMIN, ROLES.PRODUCER), async (req, res) => {
  const acc = await loadAccess(req.user.uid, req.user);
  const body = req.body || {};
  if (!body.name || !body.email) return res.status(400).json({ error: 'name and email required' });
  const target = { cerId: body.cerId, province: body.province, clientId: null };
  if (!inScope(acc.scope, target)) return res.status(403).json({ error: 'Out of scope' });
  const id = (DB.clients.at(-1)?.id || 0) + 1;
  const row = { id, name: body.name, email: body.email, cerId: body.cerId || null, province: body.province || null };
  DB.clients.push(row);
  res.json(row);
});

// ====== ADMIN MANAGEMENT (superadmin only) ======
app.get('/admin/getUser', authRequired, superadminRequired, async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    const user = await admin.auth().getUserByEmail(email);
    const accSnap = await admin.firestore().doc(`access/${user.uid}`).get();
    res.json({
      uid: user.uid,
      email: user.email,
      customClaims: user.customClaims || null,
      accessDoc: accSnap.exists ? accSnap.data() : null,
    });
  } catch (e) {
    res.status(404).json({ error: 'user not found' });
  }
});

app.post('/admin/setAccess', authRequired, superadminRequired, async (req, res) => {
  const { email, role, cerIds = [], provinces = [], clientIds = [] } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    const user = await admin.auth().getUserByEmail(email);
    const access = { role: role || null, cerIds, provinces, clientIds };
    const claimTry = { role: access.role, cerIds, provinces, clientIds };
    const bytes = Buffer.from(JSON.stringify(claimTry), 'utf8').length;

    if (bytes < 900) {
      await admin.auth().setCustomUserClaims(user.uid, claimTry);
      await admin.firestore().doc(`access/${user.uid}`).delete().catch(() => {});
      res.json({ ok: true, where: 'claims', bytes });
    } else {
      await admin.auth().setCustomUserClaims(user.uid, { role: access.role, scopeRef: true });
      await admin.firestore().doc(`access/${user.uid}`).set(access, { merge: true });
      res.json({ ok: true, where: 'firestore', bytes });
    }
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

exports.api = functions.region('europe-west1').https.onRequest(app);

