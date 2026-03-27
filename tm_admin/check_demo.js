// ══════════════════════════════════════════════════════════════════════
// TalentMaster™ — check_demo.js
// Tarkistaa Demo FC:n tilan: käyttäjä, custom claims, seura-doc, kartoitukset
// Ajo: node tm_admin/check_demo.js
// ══════════════════════════════════════════════════════════════════════

const admin = require('firebase-admin');

// Sama joustava parsinta kuin muissakin skripteissä
let serviceAccount;
const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (raw) {
  try {
    serviceAccount = JSON.parse(raw);
    console.log('[AUTH] Service account: suora JSON ✅');
  } catch (e1) {
    try {
      serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
      console.log('[AUTH] Service account: base64 decoded ✅');
    } catch (e2) {
      console.error('[AUTH] Parsinta epäonnistui:', e1.message, '/', e2.message);
      process.exit(1);
    }
  }
} else {
  serviceAccount = require('./serviceAccountKey.json');
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db   = admin.firestore();
const auth = admin.auth();

async function checkDemo() {
  console.log('\n════════════════════════════════════════');
  console.log('  TalentMaster™ — Demo FC tarkistus');
  console.log('════════════════════════════════════════\n');

  let allOk = true;

  // ── 1. Auth-käyttäjä ja custom claims ──────────────────────────────
  console.log('1/3 Auth-käyttäjä...');
  try {
    const user = await auth.getUserByEmail('vp.demo@talentmaster.fi');
    console.log('   UID:    ', user.uid);
    console.log('   Claims: ', JSON.stringify(user.customClaims));

    // Tarkistetaan täsmääkö claims
    const claims = user.customClaims || {};
    if (claims.seuraId === 'demo-fc' && claims.rooli === 'vp') {
      console.log('   → Custom claims OK ✅');
    } else {
      console.log('   → ⚠️  Custom claims PUUTTUU tai väärä!');
      console.log('     Pitäisi olla: {"seuraId":"demo-fc","rooli":"vp"}');
      console.log('     On nyt:       ' + JSON.stringify(claims));
      console.log('   → Korjataan automaattisesti...');
      await auth.setCustomUserClaims(user.uid, { seuraId: 'demo-fc', rooli: 'vp' });
      console.log('   → Claims korjattu ✅ — kirjaudu ulos ja uudelleen sisään');
      allOk = false;
    }
  } catch (e) {
    console.error('   ❌ Käyttäjää ei löydy:', e.message);
    console.log('   → Ajetaan setup_demo_fc.js ensin!');
    allOk = false;
    process.exit(1);
  }

  // ── 2. Seura-dokumentti ────────────────────────────────────────────
  console.log('\n2/3 Seura-dokumentti...');
  try {
    const doc = await db.collection('seurat').doc('demo-fc').get();
    if (doc.exists) {
      const d = doc.data();
      console.log('   nimi:     ', d.nimi);
      console.log('   vp_email: ', d.vp_email);
      console.log('   vp_uid:   ', d.vp_uid);
      console.log('   paketti:  ', d.paketti);
      console.log('   tilastot: ', JSON.stringify(d.tilastot));
      console.log('   → Seura-dokumentti OK ✅');
    } else {
      console.log('   ❌ Seura-dokumenttia ei löydy!');
      console.log('   → Ajetaan setup_demo_fc.js!');
      allOk = false;
    }
  } catch (e) {
    console.error('   ❌ Firestore-virhe:', e.message);
    allOk = false;
  }

  // ── 3. Kartoitukset ────────────────────────────────────────────────
  console.log('\n3/3 Kartoitukset...');
  try {
    const snap = await db.collection('seurat').doc('demo-fc')
      .collection('kartoitukset').limit(10).get();
    console.log('   Kartoituksia:', snap.size);
    snap.forEach(doc => {
      const d = doc.data();
      const flei = (d.yhteenveto || {}).fleiProsentti || '?';
      console.log(`   - ${doc.id}: ${d.nimi} (FLEI ${flei}%)`);
    });
    if (snap.size >= 3) {
      console.log('   → Kartoitukset OK ✅');
    } else {
      console.log('   → ⚠️  Kartoituksia vähemmän kuin 3 — ajetaan setup_demo_fc.js');
      allOk = false;
    }
  } catch (e) {
    console.error('   ❌ Kartoitushaku epäonnistui:', e.message);
    allOk = false;
  }

  // ── Yhteenveto ─────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  if (allOk) {
    console.log('  ✅ Kaikki kunnossa!');
    console.log('');
    console.log('  Kirjaudu sisään:');
    console.log('  Email:    vp.demo@talentmaster.fi');
    console.log('  Salasana: TM_Demo_2026!');
    console.log('');
    console.log('  HUOM: Jos selain on auki, kirjaudu ulos ja');
    console.log('  uudelleen sisään jotta uudet claims aktivoituvat.');
  } else {
    console.log('  ⚠️  Ongelmia löytyi — katso yllä olevat viestit.');
    console.log('  Jos claims korjattiin, kirjaudu ulos ja uudelleen sisään.');
  }
  console.log('════════════════════════════════════════\n');

  process.exit(0);
}

checkDemo().catch(err => {
  console.error('\n❌ Odottamaton virhe:', err.message);
  process.exit(1);
});
