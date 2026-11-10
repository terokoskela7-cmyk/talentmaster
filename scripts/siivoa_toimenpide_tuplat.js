#!/usr/bin/env node
/* siivoa_toimenpide_tuplat.js — Projekti 03 / PR B3. gcloud ADC (Tero ajaa).
 * Vanhan VP:n kilpatilanne tuotti automaattisia ehdotus-tuplia (seurat/{s}/toimenpiteet). Tämä merkitsee tuplat tilaan 'korvattu'.
 *  · KOHDE: vain tyyppi=='automaattinen' && tila=='ehdotus'. Muihin (pulssi, kuitattu, hylatty, käsin tehdyt) ei kosketa.
 *  · Ryhmittely signaali+joukkue; uusin (luotu) säilyy tilassa 'ehdotus', muut → tila:'korvattu'. EI poisteta mitään.
 *  · VP lukee vain tila=='ehdotus' → 'korvattu' ei näy listassa eikä laskuissa.
 *  · Oletus KUIVA-AJO (ei kirjoita). --aja tekee muutokset. --seura=kpv rajaa yhteen seuraan (muuten kaikki).
 *  · Tulostaa vain lukumäärät seuroittain ja signaali+joukkue-pareittain (ei tekstejä, ei pelaajatunnisteita).
 *  · --vieraat (PR B4): merkitsee tila:'korvattu' myös KAIKKI automaattiset ehdotukset, joiden joukkue ei kuulu seuraan (seurat/{s}/joukkueet.nimi, normalisoituna),
 *    ryhmän uusin mukaan lukien; loput tuplasiivotaan kuten ennenkin.
 * Ajo: node scripts/siivoa_toimenpide_tuplat.js [--seura=kpv] [--vieraat] [--aja] */
'use strict';

/** Puhdas ydin (testattava): rivit [{id, signaali, joukkue, luotuMs}] → { ryhmat: {avain: {yht, korvattavat:[id]}}, korvattavat:[id] }. Tasatilanne: id:n mukaan, jotta ajo on deterministinen. */
function suunnittele(rivit) {
  const ryhmat = {};
  (rivit || []).forEach((r) => { const k = (r.signaali || '') + ' | ' + (r.joukkue || ''); (ryhmat[k] = ryhmat[k] || []).push(r); });
  const ulos = {}, kaikki = [];
  Object.keys(ryhmat).forEach((k) => {
    const j = ryhmat[k].slice().sort((a, b) => (b.luotuMs - a.luotuMs) || (a.id < b.id ? 1 : -1));
    const korv = j.slice(1).map((r) => r.id);
    ulos[k] = { yht: j.length, korvattavat: korv };
    korv.forEach((id) => kaikki.push(id));
  });
  return { ryhmat: ulos, korvattavat: kaikki };
}
/* normJoukkue / onVieras: yksi totuus lib/tm_valvonta.js (projekti 07 / PR 1); skripti re-exporttaa ne (testit + laajuusskripti). */
const { normJoukkue, onVieras } = require('../lib/tm_valvonta.js');
const luotuMs = (v) => (v && typeof v.toMillis === 'function') ? v.toMillis() : (v && v.seconds ? v.seconds * 1000 : 0);

async function main(argv) {
  const path = require('path');
  const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  const aja = argv.indexOf('--aja') >= 0, vieraat = argv.indexOf('--vieraat') >= 0, seuraArg = (argv.find((a) => a.indexOf('--seura=') === 0) || '').slice(8) || null;
  admin.initializeApp({ projectId: 'talentmaster-pilot' }); const db = admin.firestore();
  const seurat = seuraArg ? [seuraArg] : (await db.collection('seurat').get()).docs.map((d) => d.id);
  console.log((vieraat ? '[--vieraat] ' : '') + (aja ? 'AJO (kirjoittaa)' : 'KUIVA-AJO (ei kirjoita; --aja tekee muutokset)') + ' · seuroja ' + seurat.length);
  let yhtKorv = 0;
  for (const sid of seurat) {
    const kok = db.collection('seurat').doc(sid).collection('toimenpiteet');
    const snap = await kok.where('tila', '==', 'ehdotus').get();
    const rivit = snap.docs.filter((d) => (d.data() || {}).tyyppi === 'automaattinen').map((d) => { const x = d.data() || {}; return { id: d.id, signaali: x.signaali, joukkue: x.joukkue, luotuMs: luotuMs(x.luotu) }; });
    let vierasIdt = [], jaljella = rivit;
    if (vieraat) {
      const omat = new Set((await db.collection('seurat').doc(sid).collection('joukkueet').get()).docs.map((d) => normJoukkue((d.data() || {}).nimi || d.id)));
      jaljella = rivit.filter((r) => !onVieras(r.joukkue, omat)); vierasIdt = rivit.filter((r) => onVieras(r.joukkue, omat)).map((r) => r.id);
      console.log('seura ' + sid + ': omia joukkueita ' + omat.size + ' · vieraan joukkueen ehdotuksia ' + vierasIdt.length);
    }
    const s = suunnittele(jaljella); s.korvattavat = vierasIdt.concat(s.korvattavat);
    console.log('seura ' + sid + ': automaattisia ehdotuksia ' + rivit.length + ' · korvattavia ' + s.korvattavat.length + ' · säilyy ' + (rivit.length - s.korvattavat.length));
    Object.keys(s.ryhmat).filter((k) => s.ryhmat[k].korvattavat.length).sort().forEach((k) => console.log('    ' + k + ': ' + s.ryhmat[k].yht + ' → 1 (korvataan ' + s.ryhmat[k].korvattavat.length + ')'));
    if (aja) for (let i = 0; i < s.korvattavat.length; i += 400) {
      const b = db.batch(); s.korvattavat.slice(i, i + 400).forEach((id) => b.update(kok.doc(id), { tila: 'korvattu' })); await b.commit();
    }
    yhtKorv += s.korvattavat.length;
  }
  console.log((aja ? 'Korvattu yhteensä ' : 'Korvattaisiin yhteensä ') + yhtKorv);
}

if (require.main === module) main(process.argv.slice(2)).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
module.exports = { suunnittele, luotuMs, normJoukkue, onVieras };
