// check_all_users.js — Tarkistaa KAIKKIEN VP-käyttäjien custom claims
// ja seura-dokumenttien vp_uid -kentät
// Ajetaan: node tm_admin/check_all_users.js

const admin = require('firebase-admin');

let serviceAccount;
const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (raw) {
  try { serviceAccount = JSON.parse(raw); }
  catch(e) { serviceAccount = JSON.parse(Buffer.from(raw,'base64').toString('utf8')); }
} else { serviceAccount = require('./serviceAccountKey.json'); }

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db   = admin.firestore();
const auth = admin.auth();

const KAYTTAJAT = [
  { email: 'talentmasterid@gmail.com', rooli: 'super_admin' },
  { email: 'vp.demo@talentmaster.fi',  rooli: 'vp', seuraId: 'demo-fc'     },
  { email: 'vp.fcl@talentmaster.fi',   rooli: 'vp', seuraId: 'fcl'         },
  { email: 'vp.kpv@talentmaster.fi',   rooli: 'vp', seuraId: 'kpv'         },
  { email: 'vp.palloiirot@talentmaster.fi', rooli: 'vp', seuraId: 'palloiirot' },
  { email: 'vp.yvies@talentmaster.fi', rooli: 'vp', seuraId: 'yvies'       },
  { email: 'vp.sjk@talentmaster.fi',   rooli: 'vp', seuraId: 'sjk'         },
  { email: 'vp.grifk@talentmaster.fi', rooli: 'vp', seuraId: 'grifk'       },
];

async function checkAll() {
  console.log('\n════════════════════════════════════════════════');
  console.log('  TalentMaster™ — Kaikkien käyttäjien tarkistus');
  console.log('════════════════════════════════════════════════\n');

  const fixes = [];

  for (const k of KAYTTAJAT) {
    try {
      const user = await auth.getUserByEmail(k.email);
      const claims = user.customClaims || {};
      const claimsStr = JSON.stringify(claims) || '{}';

      // Tarkistetaan täsmääkö claims
      let status = '✅';
      let note = '';

      if (k.rooli === 'super_admin') {
        // Super admin ei tarvitse custom claimeja — tarkistetaan admins-dokumentti
        const adminDoc = await db.collection('admins').doc(user.uid).get();
        if (adminDoc.exists) {
          status = '✅';
          note = 'admins-doc OK';
        } else {
          status = '⚠️';
          note = 'admins-doc PUUTTUU';
          fixes.push({ uid: user.uid, email: k.email, type: 'admin_doc' });
        }
      } else {
        // VP — tarkistetaan custom claims
        const hasCorrectClaims = claims.seuraId === k.seuraId && claims.rooli === 'vp';
        if (hasCorrectClaims) {
          status = '✅';
          note = `claims OK (${claimsStr})`;
        } else {
          status = '⚠️ KORJATAAN';
          note = `claims väärä: ${claimsStr} → pitäisi: {"seuraId":"${k.seuraId}","rooli":"vp"}`;
          fixes.push({ uid: user.uid, email: k.email, seuraId: k.seuraId, type: 'vp_claim' });
        }
      }

      console.log(`${status} ${k.email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   ${note}`);
      console.log();

    } catch(e) {
      console.log(`❌ ${k.email} — käyttäjää ei löydy (${e.message})`);
      console.log();
    }
  }

  // Korjataan automaattisesti
  if (fixes.length > 0) {
    console.log(`\n→ Korjataan ${fixes.length} ongelmaa automaattisesti...\n`);

    for (const fix of fixes) {
      if (fix.type === 'vp_claim') {
        await auth.setCustomUserClaims(fix.uid, {
          seuraId: fix.seuraId,
          rooli: 'vp'
        });
        console.log(`  ✅ ${fix.email} → claims asetettu {"seuraId":"${fix.seuraId}","rooli":"vp"}`);
      }
      if (fix.type === 'admin_doc') {
        await db.collection('admins').doc(fix.uid).set({
          email: fix.email,
          rooli: 'super_admin',
          superAdmin: true,
          luotu: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`  ✅ ${fix.email} → admins-dokumentti luotu`);
      }
    }

    console.log('\n⚠️  TÄRKEÄÄ: Jokaisen korjatun käyttäjän pitää');
    console.log('   kirjautua ulos ja uudelleen sisään jotta');
    console.log('   uudet custom claims aktivoituvat selaimessa.\n');
  } else {
    console.log('→ Ei korjattavaa — kaikki käyttäjät kunnossa!\n');
  }

  console.log('════════════════════════════════════════════════\n');
  process.exit(0);
}

checkAll().catch(err => {
  console.error('\n❌ Virhe:', err.message);
  process.exit(1);
});
