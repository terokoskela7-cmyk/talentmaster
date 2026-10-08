#!/usr/bin/env node
/* diag_tavoitteet_avaimet.js — KUIVA, VAIN LUKU.
 *
 * Listaa jokaisen seuran `konfiguraatio/tavoitteet`-dokumentin avaimet ja kertoo, mitkä niistä
 * ovat vanhaa slash-muotoa ('2026/27') ja mitkä uutta kausimuotoa ('2026' tai '2026-27').
 *
 * MIKSI: kausiavain vaihtui heinä–kesä-muodosta seuran kausimalliin (Suomessa kalenterivuosi).
 * Luku hyväksyy vanhan avaimen (tmTavoitteetKaudelle), mutta kirjoitus menee aina uuteen — tämä
 * skripti kertoo ENNEN mergeä, mitä dataa legacy-luku oikeasti koskee.
 *
 * Skripti ei kirjoita mitään eikä sillä ole --kirjoita-lippua.
 *
 * Ajo:  node scripts/diag_tavoitteet_avaimet.js [--seura=sjk]
 * Vaatii GOOGLE_APPLICATION_CREDENTIALS-ympäristömuuttujan (Admin SDK).
 */
if (require.main !== module) throw new Error('scripts/diag_tavoitteet_avaimet.js käsittelee tuotantodataa — aja suoraan: node scripts/diag_tavoitteet_avaimet.js (ei require/import)');   // vahinkoajon esto (S1)

const admin = require('firebase-admin');
const AH = require('../lib/tm_arviointi_historia.js');

const argv = process.argv.slice(2);
const arg = (nimi) => {
  const o = argv.find((a) => a.indexOf('--' + nimi + '=') === 0);
  return o ? o.split('=').slice(1).join('=') : null;
};
const VAIN_SEURA = arg('seura');

/** Uusi muoto: '2026' (kalenteri) tai '2026-27' (heinä–kesä). Vanha: '2026/27'. */
function avaimenMuoto(avain) {
  if (/^\d{4}$/.test(avain)) return 'uusi_kalenteri';
  if (/^\d{4}-\d{2}$/.test(avain)) return 'uusi_heina_kesa';
  if (/^\d{4}\/\d{2}$/.test(avain)) return 'legacy_slash';
  return 'tuntematon';
}

async function main() {
  if (!admin.apps.length) admin.initializeApp({ credential: admin.applicationDefault() });
  const db = admin.firestore();

  const seurat = VAIN_SEURA
    ? [await db.collection('seurat').doc(VAIN_SEURA).get()]
    : (await db.collection('seurat').get()).docs;

  console.log('KUIVA-AJO — ei kirjoituksia. Seuroja: ' + seurat.length + '\n');
  let legacyYht = 0, seurojaLegacylla = 0;

  for (const s of seurat) {
    if (!s.exists) { console.log('(seuraa ei ole: ' + VAIN_SEURA + ')'); continue; }
    const seura = s.data() || {};
    const kausimalli = AH.tmKausimalli(seura);
    const kausiNyt = AH.tmKausiNyt(seura);
    let doc = null;
    try {
      const snap = await db.collection('seurat').doc(s.id).collection('konfiguraatio').doc('tavoitteet').get();
      doc = snap.exists ? (snap.data() || {}) : null;
    } catch (e) {
      console.log(s.id + '  — lukuvirhe: ' + (e && e.message));
      continue;
    }

    const avaimet = doc ? Object.keys(doc) : [];
    const luku = AH.tmTavoitteetKaudelle(doc, kausiNyt, kausimalli);
    const legacyt = avaimet.filter((a) => avaimenMuoto(a) === 'legacy_slash');
    if (legacyt.length) { legacyYht += legacyt.length; seurojaLegacylla++; }

    console.log(s.id.padEnd(16)
      + ' kausimalli=' + kausimalli.padEnd(11)
      + ' kausi=' + String(kausiNyt).padEnd(9)
      + ' avaimia=' + String(avaimet.length).padEnd(3)
      + (avaimet.length ? ' [' + avaimet.map((a) => a + ':' + avaimenMuoto(a).replace('uusi_', 'uusi/')).join(' ') + ']' : ' (ei tavoitedokumenttia)'));
    if (luku.tavoitteet) {
      console.log('    → luetaan avaimelta "' + luku.avain + '"' + (luku.legacy ? '  ⚠ LEGACY — modaali näyttää vahvistuspyynnön' : '')
        + ', mittareita ' + Object.keys(luku.tavoitteet).length);
    } else {
      console.log('    → ei tavoitteita tälle kaudelle');
    }
  }

  console.log('\nYhteensä: ' + legacyYht + ' legacy-avainta ' + seurojaLegacylla + ' seurassa.');
  console.log('Legacy-avaimia EI poisteta: kirjoitus menee uuteen avaimeen ja vanha jää talteen.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
