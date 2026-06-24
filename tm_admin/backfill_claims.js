/**
 * TalentMaster™ — Custom Claims -backfill (DYNAAMINEN)
 *
 * TARKOITUS:
 *   Cloud Functions hoitaa UUDET käyttäjät automaattisesti (luoKayttaja +
 *   vaihdaKayttajanRooli kirjoittavat claimsAsetettu:true). Tämä skripti
 *   varmistaa + korjaa KAIKKI nykyiset käyttäjät joilta claims voi puuttua:
 *   iteroi collectionGroup('kayttajat') (kaikki seurat) + admins-kokoelman,
 *   rakentaa claimsit kunkin dokumentin OMASTA rooli/seuraId-kentästä ja
 *   asettaa ne Authiin + kirjoittaa claimsAsetettu:true.
 *
 *   Ei nojaa kovakoodattuun listaan → kattaa Laurin + kaikki nykyiset + tulevat.
 *
 * AJETAAN:
 *   node tm_admin/backfill_claims.js     (idempotentti — voi ajaa uudelleen)
 *
 * VAATII (Application Default Credentials — ei avaintiedostoa):
 *   - Aja ensin:  gcloud auth application-default login
 *     (kirjautuneella oltava oikeudet asettaa Custom Claims + kirjoittaa
 *      Firestoreen projektissa talentmaster-pilot)
 *   - VAIHTOEHTO: aseta GOOGLE_APPLICATION_CREDENTIALS palvelutiliavaimeen.
 */

const admin = require('firebase-admin');

// Autentikointi: Application Default Credentials (ADC). Kelvollinen lähde voi olla
// gcloud-kirjautuminen TAI GOOGLE_APPLICATION_CREDENTIALS-palvelutiliavain.
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId:  'talentmaster-pilot',
});

const db = admin.firestore();

// ─────────────────────────────────────────────────────────────────
// CLAIMS-RAKENNE dokumentin OMASTA rooli/seuraId-kentästä.
// Sama logiikka kuin functions/index.js — pidettävä synkassa.
// onAdmin = admins/-kokoelman dokumentti (super-admin).
// ─────────────────────────────────────────────────────────────────
function rakennaClaims(data, seuraId, onAdmin) {
  const rooli = data.rooli || null;
  if (onAdmin || data.superAdmin === true || rooli === 'super_admin' || rooli === 'superadmin') {
    return { rooli: 'superadmin', superAdmin: true, seuraId: null, joukkue: null };
  }
  return {
    rooli:   rooli,
    seuraId: seuraId || data.seuraId || null,
    joukkue: data.joukkue || null,
  };
}

const LIPPU = function () {
  return {
    claimsAsetettu:   true,
    claimsPaivitetty: admin.firestore.FieldValue.serverTimestamp(),
    backfillAjettu:   true,
  };
};

// Asettaa claimsit + kirjoittaa lipun yhdelle dokumentille. Palauttaa true/false.
async function kasittele(ref, uid, data, seuraId, onAdmin, tila) {
  const claims = rakennaClaims(data, seuraId, onAdmin);
  const email = data.email || '(ei email-kenttää)';
  const tunniste = `${email} | rooli=${claims.rooli} | seura=${seuraId || '(kaikki)'}`;
  try {
    await admin.auth().setCustomUserClaims(uid, claims);
    await ref.set(LIPPU(), { merge: true });
    console.log(`✅ ${tunniste}`);
    console.log(`   uid=${uid} | claims=${JSON.stringify(claims)}\n`);
    tila.onnistui++;
    return true;
  } catch (virhe) {
    console.error(`✗ ${tunniste}`);
    console.error(`   uid=${uid} | Virhe: ${virhe.message}\n`);
    tila.epaonnistui++;
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// PÄÄLOGIIKKA
// ─────────────────────────────────────────────────────────────────
async function ajaBbackfill() {
  console.log('═══════════════════════════════════════════');
  console.log('  TalentMaster — Custom Claims Backfill (dynaaminen)');
  console.log('  Projekti: talentmaster-pilot');
  console.log('═══════════════════════════════════════════\n');

  // Preflight: pakota ADC:n tunnistus → selkeä virhe ENNEN kirjoituksia jos tunnukset puuttuvat.
  try {
    await admin.credential.applicationDefault().getAccessToken();
  } catch (e) {
    console.error('❌ Admin SDK ei saanut tunnuksia (ADC puuttuu tai virheellinen).');
    console.error('   Aja ensin:  gcloud auth application-default login');
    console.error('   (tai aseta GOOGLE_APPLICATION_CREDENTIALS palvelutiliavaimeen.)');
    console.error('   Virhe:', e.message);
    process.exit(1);
  }

  const tila = { onnistui: 0, epaonnistui: 0, ohitettu: 0 };

  // 1) Kaikkien seurojen kayttajat (collectionGroup) — seuraId polusta seurat/{sid}/kayttajat/{uid}
  const kSnap = await db.collectionGroup('kayttajat').get();
  console.log(`▸ kayttajat-dokumentteja: ${kSnap.size}\n`);
  for (const doc of kSnap.docs) {
    const data = doc.data() || {};
    const uid  = doc.id || data.uid;     // doc-ID = Firebase Auth UID (CLAUDE.md §11), fallback data.uid
    if (!data.rooli) {                   // vaatimus: uid + rooli
      tila.ohitettu++;
      console.log(`⏭  ${data.email || uid} — ei rooli-kenttää, ohitetaan\n`);
      continue;
    }
    const seuraId = (doc.ref.parent && doc.ref.parent.parent) ? doc.ref.parent.parent.id : (data.seuraId || null);
    await kasittele(doc.ref, uid, data, seuraId, false, tila);
  }

  // 2) admins-kokoelma (super-adminit)
  const aSnap = await db.collection('admins').get();
  console.log(`▸ admins-dokumentteja: ${aSnap.size}\n`);
  for (const doc of aSnap.docs) {
    const data = doc.data() || {};
    await kasittele(doc.ref, doc.id || data.uid, data, null, true, tila);
  }

  console.log('═══════════════════════════════════════════');
  console.log(`  Valmis: ${tila.onnistui} onnistui, ${tila.epaonnistui} epäonnistui, ${tila.ohitettu} ohitettu`);
  console.log('═══════════════════════════════════════════');

  if (tila.epaonnistui === 0) {
    console.log('\n✅ Käyttäjät päivitetty. Jokainen tarvitsee uuden kirjautumisen');
    console.log('   (tai token-refreshin) ennen kuin uudet claims astuvat selaimessa voimaan.\n');
  } else {
    console.log('\n⚠️  Osa epäonnistui — yleensä uid ≠ Auth-käyttäjä (poistettu/placeholder). Tarkista yllä.\n');
  }

  process.exit(tila.epaonnistui > 0 ? 1 : 0);
}

// Käynnistetään
ajaBbackfill().catch((virhe) => {
  console.error('Skripti kaatui:', virhe);
  process.exit(1);
});
