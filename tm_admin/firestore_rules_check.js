// Tarkistaa onko demo-fc VP:llä oikeat custom claims ja seura-dokumentti
const admin = require('firebase-admin');

let serviceAccount;
const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (raw) {
  try { serviceAccount = JSON.parse(raw); }
  catch(e) { serviceAccount = JSON.parse(Buffer.from(raw,'base64').toString('utf8')); }
} else { serviceAccount = require('./serviceAccountKey.json'); }

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const auth = admin.auth();

async function check() {
  console.log('\n=== TARKISTUS: demo-fc VP-käyttäjä ===\n');

  // 1. Tarkista käyttäjä ja claims
  try {
    const user = await auth.getUserByEmail('vp.demo@talentmaster.fi');
    console.log('Auth-käyttäjä:', user.uid);
    console.log('Custom claims:', JSON.stringify(user.customClaims));
  } catch(e) { console.error('Auth-virhe:', e.message); }

  // 2. Tarkista seura-dokumentti
  try {
    const doc = await db.collection('seurat').doc('demo-fc').get();
    if (doc.exists) {
      const d = doc.data();
      console.log('\nSeura-doc demo-fc:');
      console.log('  vp_uid:', d.vp_uid);
      console.log('  vp_email:', d.vp_email);
      console.log('  nimi:', d.nimi);
    } else { console.log('⚠️ Seura-dokumenttia ei löydy!'); }
  } catch(e) { console.error('Firestore-virhe:', e.message); }

  // 3. Tarkista kartoitukset
  try {
    const snap = await db.collection('seurat').doc('demo-fc')
      .collection('kartoitukset').limit(3).get();
    console.log('\nKartoituksia Firestoressä:', snap.size);
    snap.forEach(d => console.log('  -', d.id, d.data().nimi));
  } catch(e) { console.error('Kartoitukset-virhe:', e.message); }

  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
