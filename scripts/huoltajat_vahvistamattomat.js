#!/usr/bin/env node
'use strict';
/**
 * B4 — huoltajatilien sähköpostin vahvistus (docs/CODE_BRIEF_B4_PELAAJAN_KALENTERI.md; Tero 10.10.2026). haePelaajanKalenteri ja kirjaaHuoltajaKaynti vaativat
 * email_verified == true. Ennen Rules v3.55 -kiristystä tämä laskee Admin SDK:lla VAIN LUKUMÄÄRÄT seuroittain: kuinka monella huoltajatilillä emailVerified == false.
 * EI nimiä, EI osoitteita, EI uid:itä tulosteessa. Vain luku — ei kirjoita mitään. TERO AJAA (tuotantodata); Code ei aja.
 *
 * AJO (gcloud ADC, Teron tili; ei SA-avainta):   node scripts/huoltajat_vahvistamattomat.js           (kaikki seurat)
 *                                                node scripts/huoltajat_vahvistamattomat.js --seura=kpv
 * LAAJENNUS (10.10.2026): vahvistamattomista tulostuu lisäksi vain lukumääriä: kirjautumistapa (providerData: password / google.com / muu / ei yhtään), luontikuukausi (YYYY-MM) ja onko tilillä
 * KOSKAAN kirjautumista (lastSignInTime) — erottaa "salasanalinkkiä ei koskaan käytetty / vanheni (1 h)" siitä, että tilille on kirjauduttu mutta osoite on silti vahvistamatta.
 * Huoltajatili = Auth-käyttäjä, jonka sähköposti on jonkin pelaajan `huoltajaEmail` (seurat/{sid}/pelaajat). Sama huoltaja usealla lapsella/seuralla lasketaan kerran per seura.
 * Tulostaa per seura: huoltajaEmail-pelaajia · uniikkeja huoltajia · tili on · tili puuttuu (ei vielä kirjautunut/luotu) · VAHVISTAMATTOMIA tilejä · niiden lapsia (pelaajia).
 */
const admin = require('firebase-admin');

/* Puhdas laskenta (testattu tests/huoltajat_vahvistamattomat.test.js): pelaajat [{ seura, email }], tilit [{ email, vahvistettu }] → { seura: {...lukumäärät} }. */
function laske(pelaajat, tilit) {
  const tili = new Map(); (tilit || []).forEach((t) => { if (t && t.email) tili.set(String(t.email).toLowerCase().trim(), t.vahvistettu === true); });
  const ulos = {};
  for (const p of pelaajat || []) {
    const e = p && typeof p.email === 'string' ? p.email.toLowerCase().trim() : ''; if (!e || !p.seura) continue;
    const s = ulos[p.seura] = ulos[p.seura] || { pelaajia: 0, huoltajia: 0, tili: 0, ilmanTilia: 0, vahvistamattomia: 0, vahvistamattomienLapsia: 0, _nahty: new Set() };
    s.pelaajia++;
    const onTili = tili.has(e), vahv = tili.get(e) === true;
    if (onTili && !vahv) s.vahvistamattomienLapsia++;
    if (!s._nahty.has(e)) { s._nahty.add(e); s.huoltajia++; if (!onTili) s.ilmanTilia++; else { s.tili++; if (!vahv) s.vahvistamattomia++; } }
  }
  Object.keys(ulos).forEach((k) => { delete ulos[k]._nahty; });
  return ulos;
}

/* Vahvistamattomien erittely (testattu): tilit [{ email, vahvistettu, providers:[providerId…], luotu:ms|null, viimeisinKirjautuminen:ms|null }], huoltajaEmailit = Set (pienet kirjaimet).
   Vain huoltajatilit (sähköposti on jonkin pelaajan huoltajaEmail) ja vain vahvistamattomat. Palauttaa VAIN lukumäärät. */
function erittele(tilit, huoltajaEmailit) {
  const ulos = { yhteensa: 0, kirjautumistapa: {}, luontikuukausi: {}, kirjautunutKoskaan: { ei: 0, kylla: 0 } };
  const lisaa = (o, k) => { o[k] = (o[k] || 0) + 1; };
  for (const t of tilit || []) {
    const e = t && typeof t.email === 'string' ? t.email.toLowerCase().trim() : '';
    if (!e || t.vahvistettu === true || !huoltajaEmailit.has(e)) continue;
    ulos.yhteensa++;
    const pr = Array.isArray(t.providers) ? t.providers.filter(Boolean).sort() : [];
    lisaa(ulos.kirjautumistapa, pr.length ? pr.join('+') : 'ei_yhtaan');
    const kk = t.luotu ? new Date(t.luotu).toISOString().slice(0, 7) : 'tuntematon';
    lisaa(ulos.luontikuukausi, kk);
    ulos.kirjautunutKoskaan[t.viimeisinKirjautuminen ? 'kylla' : 'ei']++;
  }
  return ulos;
}

async function main() {
  const vainSeura = (process.argv.find((x) => x.startsWith('--seura=')) || '').slice(8) || null;
  if (!admin.apps.length) admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const snap = await admin.firestore().collectionGroup('pelaajat').get();
  const pelaajat = [];
  snap.forEach((d) => {
    const seuraRef = d.ref.parent.parent; if (!seuraRef || !seuraRef.parent || seuraRef.parent.id !== 'seurat') return;   // vain seurat/{sid}/pelaajat
    if (vainSeura && seuraRef.id !== vainSeura) return;
    const e = (d.data() || {}).huoltajaEmail; if (typeof e === 'string' && e.trim()) pelaajat.push({ seura: seuraRef.id, email: e });
  });
  const tilit = []; let sivu;
  do { const r = await admin.auth().listUsers(1000, sivu); r.users.forEach((u) => { if (u.email) tilit.push({ email: u.email, vahvistettu: u.emailVerified === true, providers: (u.providerData || []).map((p) => p.providerId), luotu: u.metadata && u.metadata.creationTime ? Date.parse(u.metadata.creationTime) : null, viimeisinKirjautuminen: u.metadata && u.metadata.lastSignInTime ? Date.parse(u.metadata.lastSignInTime) : null }); }); sivu = r.pageToken; } while (sivu);
  const huoltajaEmailit = new Set(pelaajat.map((p) => String(p.email).toLowerCase().trim()));
  const tulos = laske(pelaajat, tilit), rivit = Object.keys(tulos).sort();
  console.log('seura'.padEnd(18) + 'pelaajia  huoltajia  tili  ilman_tilia  VAHVISTAMATTOMIA  niiden_lapsia');
  let yht = { huoltajia: 0, tili: 0, ilmanTilia: 0, vahvistamattomia: 0, vahvistamattomienLapsia: 0 };
  for (const k of rivit) { const t = tulos[k]; console.log(k.padEnd(18) + String(t.pelaajia).padEnd(10) + String(t.huoltajia).padEnd(11) + String(t.tili).padEnd(6) + String(t.ilmanTilia).padEnd(13) + String(t.vahvistamattomia).padEnd(18) + t.vahvistamattomienLapsia); Object.keys(yht).forEach((x) => { yht[x] += t[x]; }); }
  console.log('YHTEENSÄ'.padEnd(18) + ''.padEnd(10) + String(yht.huoltajia).padEnd(11) + String(yht.tili).padEnd(6) + String(yht.ilmanTilia).padEnd(13) + String(yht.vahvistamattomia).padEnd(18) + yht.vahvistamattomienLapsia);
  const er = erittele(tilit, huoltajaEmailit);
  console.log('\nVAHVISTAMATTOMAT (' + er.yhteensa + ') — vain lukumääriä:');
  console.log('  kirjautumistapa:      ' + JSON.stringify(er.kirjautumistapa));
  console.log('  luontikuukausi:       ' + JSON.stringify(er.luontikuukausi));
  console.log('  kirjautunut koskaan:  kyllä ' + er.kirjautunutKoskaan.kylla + ' · ei ' + er.kirjautunutKoskaan.ei);
  if (yht.vahvistamattomia > 0) console.log('\n⚠ Vahvistamattomia huoltajatilejä löytyi → ENNEN Rules v3.55 -kiristystä: uusi vahvistuslinkki niille (raportoi Codelle; ks. B4-PR).');
  else console.log('\n✓ Ei vahvistamattomia huoltajatilejä — kiristyksen voi deployata.');
}
if (require.main === module) main().catch((e) => { console.error(e && e.message ? e.message : e); process.exit(1); });
module.exports = { laske, erittele };
