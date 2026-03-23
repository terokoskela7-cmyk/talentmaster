/**
 * TalentMaster™ — Olemassa olevien käyttäjien Custom Claims -backfill
 *
 * TARKOITUS:
 *   Cloud Functions hoitaa automaattisesti UUDET käyttäjät jotka
 *   luodaan Admin-näkymän kautta. Mutta 7 olemassa olevaa käyttäjää
 *   (6 VP + 1 super-admin) on luotu manuaalisesti ennen Cloud
 *   Functions -integraatiota. Tämä skripti asettaa heille Custom
 *   Claims kertaluonteisesti.
 *
 * AJETAAN KERRAN:
 *   node tm_admin/backfill_claims.js
 *
 * VAATII:
 *   - Firebase Admin SDK palvelutilin avain JSON-tiedostona
 *   - Tallenna se: tm_admin/serviceAccountKey.json
 *   - ÄLÄ lisää serviceAccountKey.json:ia GitHubiin! (.gitignore)
 *
 * PALVELUTILIN AVAIN:
 *   Firebase Console → Projektiasetukset → Palvelutilit
 *   → "Luo uusi yksityinen avain" → Tallenna tm_admin/serviceAccountKey.json
 */

const admin = require('firebase-admin');
const path  = require('path');

// Ladataan palvelutilin avain — tämä antaa Admin SDK:lle
// oikeudet kirjoittaa Custom Claims ilman selainkontekstia
const serviceAccount = require(
  path.join(__dirname, 'serviceAccountKey.json')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId:  'talentmaster-pilot',
});

const db = admin.firestore();

// ─────────────────────────────────────────────────────────────────
// OLEMASSA OLEVAT KÄYTTÄJÄT
//
// Nämä tiedot tulevat SESSION_SUMMARY.md:stä.
// Rakenne vastaa Firestoren kayttajat-dokumentteja.
//
// TÄRKEÄ: Kun uusi VP lisätään jatkossa Admin-näkymästä,
// hän EI tarvitse tätä skriptiä — Cloud Function hoitaa sen
// automaattisesti. Tämä skripti on vain kertaluonteinen
// retroaktiivinen korjaus.
// ─────────────────────────────────────────────────────────────────
const KAYTTAJAT = [
  // ── SUPER-ADMIN ──
  // UID haetaan sähköpostista ajon aikana — ei kovakoodata
  // jotta väärä UID ei voi aiheuttaa ongelmia
  {
    uid:     null,
    email:   'talentmasterid@gmail.com',
    rooli:   'superadmin',
    seuraId: null,
    joukkue: null,
    superAdmin: true,
    kuvaus:  'TalentMaster Super Admin',
  },

  // ── VALMENNUSPÄÄLLIKÖT ──
  {
    uid:     'dpYcfa154ZOHshZzHrVaTZ2iTHE3',
    email:   'vp.fcl@talentmaster.fi',
    rooli:   'vp',
    seuraId: 'fcl',
    joukkue: null,      // VP näkee koko seuran — ei joukkuerajausta
    kuvaus:  'FC Lahti Juniorit',
  },
  {
    uid:     'jIbW7q8nLggswTjefkYuSvtneH92',
    email:   'vp.kpv@talentmaster.fi',
    rooli:   'vp',
    seuraId: 'kpv',
    joukkue: null,
    kuvaus:  'KPV',
  },
  {
    uid:     'fBf1c60rjXTPxYlsV03EfrHZ2xM2',
    email:   'vp.palloiirot@talentmaster.fi',
    rooli:   'vp',
    seuraId: 'palloiirot',
    joukkue: null,
    kuvaus:  'Pallo-Iirot',
  },
  {
    uid:     'U21RwOm7OYdrAQB8wTXXlDQksEk2',
    email:   'vp.yvies@talentmaster.fi',
    rooli:   'vp',
    seuraId: 'yvies',
    joukkue: null,
    kuvaus:  'Ylöjärven Ilves',
  },
  {
    uid:     '1eHyfKsuTSRAAsPu9kRZ22E4hwo2',
    email:   'vp.sjk@talentmaster.fi',
    rooli:   'vp',
    seuraId: 'sjk',
    joukkue: null,
    kuvaus:  'SJK Juniorit',
  },
  {
    uid:     'lBCx0ivDYVWLmxD9TGKsvYrFrlo1',
    email:   'vp.grifk@talentmaster.fi',
    rooli:   'vp',
    seuraId: 'grifk',
    joukkue: null,
    kuvaus:  'GrIFK',
  },
];

// ─────────────────────────────────────────────────────────────────
// CLAIMS-RAKENNE roolin perusteella
// Sama logiikka kuin functions/index.js:ssä — pidettävä synkassa!
// ─────────────────────────────────────────────────────────────────
function rakennaClaims(kayttaja) {
  if (kayttaja.rooli === 'superadmin') {
    return {
      rooli:      'superadmin',
      superAdmin: true,
      seuraId:    null,
      joukkue:    null,
    };
  }

  return {
    rooli:    kayttaja.rooli,
    seuraId:  kayttaja.seuraId,
    joukkue:  kayttaja.joukkue || null,
  };
}

// ─────────────────────────────────────────────────────────────────
// PÄÄLOGIIKKA
// ─────────────────────────────────────────────────────────────────
async function ajaBbackfill() {
  console.log('═══════════════════════════════════════════');
  console.log('  TalentMaster — Custom Claims Backfill');
  console.log('  Projekti: talentmaster-pilot');
  console.log(`  Käyttäjiä: ${KAYTTAJAT.length}`);
  console.log('═══════════════════════════════════════════\n');

  let onnistui = 0;
  let epaonnistui = 0;

  for (const kayttaja of KAYTTAJAT) {
    const claims = rakennaClaims(kayttaja);

    try {
      // Jos UID puuttuu, haetaan se sähköpostiosoitteen perusteella.
      // Tämä on turvallisempi tapa kuin kovakoodata UID joka voi vanhentua.
      if (!kayttaja.uid) {
        const authUser = await admin.auth().getUserByEmail(kayttaja.email);
        kayttaja.uid = authUser.uid;
        console.log(`   UID haettu sähköpostista: ${kayttaja.uid}`);
      }

      // Asetetaan Custom Claims Firebase Authiin
      await admin.auth().setCustomUserClaims(kayttaja.uid, claims);

      // Merkitään Firestoreen lokiin — noudattaa samaa rakennetta
      // kuin Cloud Functions tekee automaattisesti jatkossa
      if (kayttaja.rooli === 'superadmin') {
        // Super-admin on admins/-kokoelmassa
        await db.collection('admins').doc(kayttaja.uid).set(
          {
            claimsAsetettu:   true,
            claimsPaivitetty: admin.firestore.FieldValue.serverTimestamp(),
            backfillAjettu:   true,
          },
          { merge: true }   // merge: true säilyttää olemassa olevat kentät
        );
      } else {
        // VP:t ovat seurat/{seuraId}/kayttajat/{uid}
        await db
          .collection('seurat').doc(kayttaja.seuraId)
          .collection('kayttajat').doc(kayttaja.uid)
          .set(
            {
              claimsAsetettu:   true,
              claimsPaivitetty: admin.firestore.FieldValue.serverTimestamp(),
              backfillAjettu:   true,
            },
            { merge: true }
          );
      }

      console.log(`✅ ${kayttaja.email}`);
      console.log(`   Rooli: ${kayttaja.rooli} | Seura: ${kayttaja.seuraId || '(kaikki)'}`);
      console.log(`   Claims: ${JSON.stringify(claims)}\n`);
      onnistui++;

    } catch (virhe) {
      console.error(`❌ ${kayttaja.email}`);
      console.error(`   Virhe: ${virhe.message}\n`);
      epaonnistui++;
    }
  }

  console.log('═══════════════════════════════════════════');
  console.log(`  Valmis: ${onnistui} onnistui, ${epaonnistui} epäonnistui`);
  console.log('═══════════════════════════════════════════');

  if (epaonnistui === 0) {
    console.log('\n✅ Kaikki käyttäjät päivitetty. Jokainen käyttäjä tarvitsee');
    console.log('   uuden kirjautumisen (tai token-refreshin) ennen kuin');
    console.log('   uudet claims astuvat heidän selaimessaan voimaan.\n');
  } else {
    console.log('\n⚠️  Osa käyttäjistä epäonnistui — tarkista UID:t yllä.\n');
  }

  process.exit(epaonnistui > 0 ? 1 : 0);
}

// Käynnistetään
ajaBbackfill().catch((virhe) => {
  console.error('Skripti kaatui:', virhe);
  process.exit(1);
});
