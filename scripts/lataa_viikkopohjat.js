#!/usr/bin/env node
'use strict';
/**
 * lataa_viikkopohjat.js — K35-4 · Palloliiton viikkopohjat FC Demoon (kaista Tero; Tero ajaa). KUIVA-AJO OLETUKSENA.
 *
 *   node scripts/lataa_viikkopohjat.js --seura demo                       # kuiva-ajo: tulostaa mitä kirjoitettaisiin, ei kirjoita mitään
 *   node scripts/lataa_viikkopohjat.js --seura demo --kirjoita            # kirjoittaa
 *   node scripts/lataa_viikkopohjat.js --seura demo --kirjoita --korvaa   # korvaa myös olemassa olevat Palloliiton pohjat
 *
 * KOVA RAJAUS: --seura muu kuin 'demo' → keskeytyy (KPV / Sibbo / SJK vasta Teron erillisellä päätöksellä). Pilottiseuroihin ei kirjoiteta.
 * KIRJOITTAA (vain seurat/demo/ -polun alle):
 *   valmennuslinja/viikkopohjat = { pohjat:[...tmPalloliitonPohjat(docs/data/spl_viikkopohjat_2023.json)], paivitetty, lahde:'palloliitto_2023' }
 *     · lahde:'seura' -pohjat säilyvät aina; Palloliiton pohjat korvataan vain --korvaa-lipulla (muuten olemassa olevat jäävät, puuttuvat avaimet lisätään)
 *   joukkueet/{id}.pelimuoto — VAIN jos kenttä puuttuu (ei ylikirjoita): demo_u13 → 8v8, demo_u15 → 11v11, demo_u17 → 11v11 (D173).
 *     Kenttä on toisen session Rules-PR B:n (marraskuu) aluetta: tämä skripti kirjoittaa vain arvon (Admin SDK ohittaa Rulesin), Rulesia ei muuteta.
 * AUTENTIKOINTI: Admin SDK + ADC (gcloud auth application-default login), kuten muut scripts/-ajot.
 */
const fs = require('fs');
const path = require('path');
const V = require('../lib/tm_viikkopohja.js');

const PROJECT_ID = 'talentmaster-pilot';
const SALLITTU_SEURA = 'demo';
const DEMO_PELIMUODOT = { demo_u13: '8v8', demo_u15: '11v11', demo_u17: '11v11' };   // vakio vain seuralle 'demo'
const LAHDE = 'palloliitto_2023';
const JSON_POLKU = path.join(__dirname, '..', 'docs', 'data', 'spl_viikkopohjat_2023.json');

function tarkistaSeura(seura) { if (seura !== SALLITTU_SEURA) throw new Error("Keskeytetty: --seura '" + seura + "' ei sallittu. Vain '" + SALLITTU_SEURA + "' (KPV/Sibbo/SJK vasta Teron erillisellä päätöksellä)."); }

/** Puhdas suunnittelu: ei kirjoita. nykyinen = viikkopohjat-dokin data | null; joukkueet = [{id, pelimuoto?}]. */
function suunnittele({ nykyinen, joukkueet, json, korvaa, nyt }) {
  const uudet = V.tmPalloliitonPohjat(json), virheet = uudet.map((p) => [p.avain, V.tmViikkopohjaVirhe(p)]).filter((x) => x[1]);
  if (virheet.length || uudet.length !== 6) throw new Error('Palloliiton pohjat eivät kelpaa: ' + JSON.stringify(virheet) + ' (' + uudet.length + ' pohjaa)');
  const vanhat = nykyinen && Array.isArray(nykyinen.pohjat) ? nykyinen.pohjat : [], seuran = vanhat.filter((p) => p && p.lahde === 'seura'), vanhaPl = vanhat.filter((p) => p && p.lahde !== 'seura');
  let pl, lisatty = [], sailytetty = [];
  if (korvaa || !vanhaPl.length) { pl = uudet; lisatty = uudet.map((p) => p.avain); }
  else { sailytetty = vanhaPl.map((p) => p.avain); const on = {}; vanhaPl.forEach((p) => { on[p.avain] = 1; }); const puuttuvat = uudet.filter((p) => !on[p.avain]); lisatty = puuttuvat.map((p) => p.avain); pl = vanhaPl.concat(puuttuvat); }
  const ilmanIkaa = uudet.filter((p) => !Array.isArray(p.ika_ohje) || p.ika_ohje.length !== 2).map((p) => p.avain);   // vanha koodi (ei ika_ohje) → keskeytä, ettei Firestoreen mene ika_ohje: null
  if (ilmanIkaa.length) throw new Error('Keskeytetty: Palloliiton pohjilta puuttuu ika_ohje (' + ilmanIkaa.join(', ') + ') — aja skripti ajantasaisesta origin/main-työpuusta (git pull / git worktree add ../tm-main origin/main).');
  const doc = { pohjat: JSON.parse(JSON.stringify(seuran.concat(pl))), paivitetty: nyt, lahde: LAHDE };
  const pelimuodot = [], ohitetut = [];
  Object.keys(DEMO_PELIMUODOT).forEach((id) => {
    const j = (joukkueet || []).find((x) => x.id === id);
    if (!j) ohitetut.push({ id: id, syy: 'joukkuetta ei löydy' });
    else if (j.pelimuoto != null && j.pelimuoto !== '') ohitetut.push({ id: id, syy: 'pelimuoto jo asetettu (' + j.pelimuoto + ')' });
    else if (V.PELIMUODOT.indexOf(DEMO_PELIMUODOT[id]) < 0) ohitetut.push({ id: id, syy: 'virheellinen pelimuoto' });
    else pelimuodot.push({ id: id, pelimuoto: DEMO_PELIMUODOT[id] });
  });
  return { doc: doc, lisatty: lisatty, sailytetty: sailytetty, seuranPohjia: seuran.length, pelimuodot: pelimuodot, ohitetut: ohitetut };
}

/** db = Firestore-yhteensopiva (Admin SDK tai mock). Kirjoittaa vain kun kirjoita === true. */
async function aja({ db, seura, kirjoita, korvaa, json, nyt, loki }) {
  tarkistaSeura(seura); loki = loki || console.log; nyt = nyt || new Date();
  const sRef = db.collection('seurat').doc(seura), viikkoRef = sRef.collection('valmennuslinja').doc('viikkopohjat');
  const vSnap = await viikkoRef.get(), jSnap = await sRef.collection('joukkueet').get();
  const joukkueet = []; jSnap.forEach((d) => { const x = d.data() || {}; joukkueet.push({ id: d.id, pelimuoto: x.pelimuoto }); });
  const p = suunnittele({ nykyinen: vSnap.exists ? vSnap.data() : null, joukkueet: joukkueet, json: json, korvaa: !!korvaa, nyt: nyt });
  loki((kirjoita ? 'KIRJOITUS' : 'KUIVA-AJO (ei kirjoiteta)') + ' · seura ' + seura + (korvaa ? ' · --korvaa' : ''));
  loki('seurat/' + seura + '/valmennuslinja/viikkopohjat: ' + p.doc.pohjat.length + ' pohjaa (' + p.seuranPohjia + ' seuran säilyy, Palloliiton lisätään/korvataan: ' + p.lisatty.length + ', säilyy: ' + p.sailytetty.length + ')');
  p.doc.pohjat.forEach((x) => loki('  · ' + x.avain + ' [' + x.lahde + '] ' + x.pelimuoto + ' · ' + x.paivat.length + ' harjoitusta · ika_ohje ' + (Array.isArray(x.ika_ohje) ? '[' + x.ika_ohje.join(',') + ']' : (x.lahde === 'palloliitto' ? 'PUUTTUU' : '–'))));
  p.pelimuodot.forEach((x) => loki('joukkueet/' + x.id + '.pelimuoto ← ' + x.pelimuoto));
  p.ohitetut.forEach((x) => loki('ohitetaan joukkueet/' + x.id + ': ' + x.syy));
  if (kirjoita) {
    await viikkoRef.set(p.doc, { merge: true });
    for (const x of p.pelimuodot) await sRef.collection('joukkueet').doc(x.id).update({ pelimuoto: x.pelimuoto });
  }
  loki('Yhteensä: ' + p.doc.pohjat.length + ' pohjaa, ' + p.pelimuodot.length + ' pelimuotoa asetettu' + (kirjoita ? '' : ' (kuiva-ajo: ei kirjoitettu)') + ', ' + p.ohitetut.length + ' ohitettu.' + (kirjoita ? '' : ' Kirjoita lipulla --kirjoita.'));
  return p;
}

async function main() {
  const argv = process.argv.slice(2), arg = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
  const seura = arg('seura'); if (!seura) { console.error('Käyttö: node scripts/lataa_viikkopohjat.js --seura demo [--kirjoita] [--korvaa]'); process.exit(1); }
  try { tarkistaSeura(seura); } catch (e) { console.error(e.message); process.exit(1); }
  const admin = require('firebase-admin'); if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  await aja({ db: admin.firestore(), seura: seura, kirjoita: argv.includes('--kirjoita'), korvaa: argv.includes('--korvaa'), json: JSON.parse(fs.readFileSync(JSON_POLKU, 'utf8')) });
}
module.exports = { suunnittele, aja, tarkistaSeura, DEMO_PELIMUODOT, SALLITTU_SEURA };
if (require.main === module) main().catch((e) => { console.error('VIRHE:', e.message); process.exit(1); });
