const fs = require('fs');
const path = require('path');
let admin;

function initFromFile() {
  try {
    const p = path.join(__dirname, '_secrets', 'firebase-admin.json');
    if (fs.existsSync(p)) {
      const c = JSON.parse(fs.readFileSync(p, 'utf8'));
      return { projectId: c.project_id, clientEmail: c.client_email, privateKey: c.private_key };
    }
  } catch (e) { console.warn('Firebase creds file error:', e.message); }
  return null;
}
function initFromEnv() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKey) { privateKey = privateKey.replace(/\\n/g, '\n'); return { projectId, clientEmail, privateKey }; }
  return null;
}
function getAdmin() {
  if (admin) return admin;
  admin = require('firebase-admin');
  if (!admin.apps.length) {
    const creds = initFromFile() || initFromEnv();
    if (!creds) console.warn('Firebase Admin: nessuna credenziale trovata (file o env).');
    else admin.initializeApp({ credential: admin.credential.cert(creds) });
  }
  return admin;
}
module.exports = { getAdmin };