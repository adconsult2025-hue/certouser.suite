const admin = require('firebase-admin');

function getServiceAccount(){
  const raw = process.env.FIREBASE_ADMIN_JSON || null;
  const b64 = process.env.FIREBASE_ADMIN_B64 || null;
  if (!raw && !b64) throw new Error('FIREBASE_ADMIN_JSON/B64 not set');
  const json = raw ? raw : Buffer.from(b64, 'base64').toString('utf8');
  return JSON.parse(json);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(getServiceAccount()) });
}

module.exports = admin;
