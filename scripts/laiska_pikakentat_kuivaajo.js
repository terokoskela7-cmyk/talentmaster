#!/usr/bin/env node
/**
 * Valmentajien arviointi-pikakentät (harjoituslaatu_*, valmennustaito_*) — KUIVA-AJO ensin (laiska-normit-korjaus 26.11.2026).
 * Tausta: #1298 (L2, 17.11.) teki tm_eerikkila_normit.js:stä laiskan; tallennuspolun typeof-vartija saattoi ohittaa pikakenttien päivityksen hiljaa.
 * Kooste lasketaan AINA koko listasta (laskeValmentajaHarjoitusKooste) → seuraava tallennus korjaa kentät itsestään; tämä skripti kertoo kuinka monta on jäänyt jälkeen
 * ja voi (vain --apply) korjata ne kertaluontoisesti. Tulostaa VAIN lukumäärät seuroittain (ei nimiä, ei UID:itä).
 *
 *   Kuiva-ajo:  node scripts/laiska_pikakentat_kuivaajo.js                (ei kirjoita mitään)
 *   Korjaus:    node scripts/laiska_pikakentat_kuivaajo.js --apply        (update() vain 8 pikakenttää, vain olemassa oleviin käyttäjädokumentteihin)
 *   Rajaus:     --seura=<id>   ·   --sen=2026-11-17 (uusien arviointien raja, oletus 17.11.)
 *
 * Auth: gcloud ADC (`gcloud auth application-default login`), EI palvelutilin avainta. Ajaa Tero (`! node …`).
 */
'use strict';
const KENTAT = ['harjoituslaatu_ka', 'harjoituslaatu_n', 'harjoituslaatu_pvm', 'harjoituslaatu_liike_pct', 'harjoituslaatu_maali_pct', 'valmennustaito_ka', 'valmennustaito_n', 'valmennustaito_pvm'];

/** Puhdas laskenta (testattu): arvioinnit = [{valmentajaUid, malli, luotuMs, ...}], kayttajat = { uid: kayttajadoc } → seurakohtainen yhteenveto + korjattavat. */
function suunnittele(arvioinnit, kayttajat, rajaMs, kooste) {
  const perUid = {}, mallit = {};
  arvioinnit.forEach((a) => { if (!a.valmentajaUid) return; (perUid[a.valmentajaUid] = perUid[a.valmentajaUid] || []).push(a); mallit[a.malli || '(puuttuu)'] = (mallit[a.malli || '(puuttuu)'] || 0) + 1; });
  const out = { arviointeja: arvioinnit.length, mallit, valmentajia: Object.keys(perUid).length, uusiaArvioijia: 0, jalkessa: 0, ilmanDokumenttia: 0, korjattavat: [] };
  Object.keys(perUid).forEach((uid) => {
    const lista = perUid[uid];
    if (lista.some((a) => a.luotuMs != null && a.luotuMs >= rajaMs)) out.uusiaArvioijia++;
    const k = kooste(lista), doc = kayttajat[uid];
    if (!doc) { out.ilmanDokumenttia++; return; }
    const pika = {}; let ero = false;
    KENTAT.forEach((key) => { if (k[key] !== undefined && k[key] !== null) { pika[key] = k[key]; if (doc[key] !== k[key]) ero = true; } });
    if (ero) { out.jalkessa++; out.korjattavat.push({ uid, pika }); }
  });
  return out;
}

async function main() {
  const args = process.argv.slice(2), APPLY = args.includes('--apply');
  const seuraRaja = (args.find((a) => a.startsWith('--seura=')) || '').split('=')[1] || null;
  const sen = (args.find((a) => a.startsWith('--sen=')) || '--sen=2026-11-17').split('=')[1], rajaMs = Date.parse(sen + 'T00:00:00+02:00');
  const admin = require('firebase-admin'); admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'talentmaster-pilot' });
  const db = admin.firestore(), { laskeValmentajaHarjoitusKooste } = require('../lib/tm_eerikkila_normit.js');
  const seurat = seuraRaja ? [seuraRaja] : (await db.collection('seurat').select().get()).docs.map((d) => d.id);
  console.log((APPLY ? 'KORJAUS (--apply)' : 'KUIVA-AJO (ei kirjoita)') + ' · uudet = luotu ≥ ' + sen);
  let yht = { seuroja: 0, valmentajia: 0, uusiaArvioijia: 0, jalkessa: 0 };
  for (const sid of seurat) {
    const arvSnap = await db.collection('seurat/' + sid + '/harjoitusarvioinnit').get();
    if (arvSnap.empty) continue;
    const arv = arvSnap.docs.map((d) => { const x = d.data(); return Object.assign({}, x, { luotuMs: x.luotu && x.luotu.toMillis ? x.luotu.toMillis() : null }); });
    const kay = {}; (await db.collection('seurat/' + sid + '/kayttajat').get()).docs.forEach((d) => { kay[d.id] = d.data(); });
    const s = suunnittele(arv, kay, rajaMs, laskeValmentajaHarjoitusKooste);
    console.log(sid + ': arviointeja ' + s.arviointeja + ' · mallit ' + JSON.stringify(s.mallit) + ' · valmentajia ' + s.valmentajia + ' · uusia (≥ ' + sen + ') arvioijia ' + s.uusiaArvioijia + ' · pikakentät jäljessä ' + s.jalkessa + ' · ilman käyttäjädokumenttia ' + s.ilmanDokumenttia);
    yht.seuroja++; yht.valmentajia += s.valmentajia; yht.uusiaArvioijia += s.uusiaArvioijia; yht.jalkessa += s.jalkessa;
    if (APPLY) for (const kx of s.korjattavat) { try { await db.doc('seurat/' + sid + '/kayttajat/' + kx.uid).update(kx.pika); } catch (e) { console.log('  ohitettu (update epäonnistui): ' + e.code); } }
  }
  console.log('YHTEENSÄ ' + JSON.stringify(yht));
}
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { suunnittele, KENTAT };
