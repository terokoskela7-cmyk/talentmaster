#!/usr/bin/env node
/**
 * UTJ-roolien laskenta (read-only, 1.10.2026). Henkilöstön claim on 'urheilutoimenjohtaja', mutta UTJ-sivu
 * hyväksyi vain 'utj' (vanha tm_admin/setup_seurat.js). Tämä laskee seuroittain, montako AKTIIVISTA käyttäjää
 * on kummallakin roolilla — sekä kayttajat-dokumentin rooli-kentästä että Auth-claimista.
 *
 * Ei kirjoita mitään. Tulostaa vain seuraId:t ja lukumäärät (ei sähköposteja, nimiä eikä uid:itä).
 * AJO (gcloud ADC, Teron tili):  node scripts/utj_roolit_laskenta.js
 */
if (require.main !== module) throw new Error('scripts/utj_roolit_laskenta.js käsittelee tuotantodataa — aja suoraan: node scripts/utj_roolit_laskenta.js (ei require/import)');   // vahinkoajon esto (S1)
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'talentmaster-pilot' });
const ROOLIT = ['urheilutoimenjohtaja', 'utj'];

(async () => {
  const db = admin.firestore();
  const docit = {};   // seuraId → { urheilutoimenjohtaja, utj }
  // Ilman where-ehtoa: collectionGroup-indeksiä kayttajat.rooli ei ole (vain uid). Dokumentteja on satoja.
  const snap = await db.collectionGroup('kayttajat').get();
  for (const d of snap.docs) {
    const x = d.data() || {};
    if (x.aktiivinen === false || !ROOLIT.includes(x.rooli)) continue;
    if (!d.ref.parent.parent || d.ref.parent.parent.parent.id !== 'seurat') continue;
    const seura = d.ref.parent.parent ? d.ref.parent.parent.id : '(ei seuraa)';
    docit[seura] = docit[seura] || { urheilutoimenjohtaja: 0, utj: 0 };
    docit[seura][x.rooli]++;
  }
  const claimit = {};   // seuraId (claimista) → { urheilutoimenjohtaja, utj }
  let sivu;
  do {
    const r = await admin.auth().listUsers(1000, sivu);
    for (const u of r.users) {
      const c = u.customClaims || {};
      if (u.disabled || !ROOLIT.includes(c.rooli)) continue;
      const seura = c.seuraId || c.seura || '(ei seuraId-claimia)';
      claimit[seura] = claimit[seura] || { urheilutoimenjohtaja: 0, utj: 0 };
      claimit[seura][c.rooli]++;
    }
    sivu = r.pageToken;
  } while (sivu);

  const tulosta = (otsikko, m) => {
    console.log('\n' + otsikko);
    const avaimet = Object.keys(m).sort();
    if (!avaimet.length) { console.log('  (ei yhtään)'); return; }
    let a = 0, b = 0;
    for (const k of avaimet) { console.log('  ' + k.padEnd(24) + ' urheilutoimenjohtaja ' + m[k].urheilutoimenjohtaja + ' · utj ' + m[k].utj); a += m[k].urheilutoimenjohtaja; b += m[k].utj; }
    console.log('  ' + 'YHTEENSÄ'.padEnd(24) + ' urheilutoimenjohtaja ' + a + ' · utj ' + b);
  };
  tulosta('kayttajat-dokumentit (aktiiviset, rooli-kenttä):', docit);
  tulosta('Auth-claimit (ei suljetut tilit, rooli-claim):', claimit);
  process.exit(0);
})().catch((e) => { console.error('Virhe:', e.message); process.exit(1); });
