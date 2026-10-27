#!/usr/bin/env node
/**
 * tarkista_syntymaaika_1_1.js — LUKEVA tarkistus (ei kirjoita mitään; Teron kaista, Tero ajaa; PM päättää korjauksesta).
 * Laskee seuroittain pelaajat, joiden `syntymaaika` on 1.1. JA joilla on `muokkaajaUid`/`muokattu`-merkintä (Seura-sivun muokkaus)
 * eli jotka ovat todennäköisesti Muokkaa pelaajatietoja -lomakkeen vuodesta keksimä 1.1. (CODE_BRIEF_SEURA_SYNTYMAVUOSI).
 * Tulostaa VAIN lukumäärät (ei nimiä, ei tunnisteita). Logiikka: lib/tm_syntymavuosi.js tmSyntyma11Tilasto.
 *
 * AJO:  node scripts/tarkista_syntymaaika_1_1.js [--seura=kpv]      (ilman --seura: kaikki seurat)
 * Tunnistus: gcloud ADC (`gcloud auth application-default login`), ei SA-avainta.
 */
'use strict';
if (require.main !== module) throw new Error('scripts/tarkista_syntymaaika_1_1.js lukee tuotantodataa — aja suoraan: node scripts/tarkista_syntymaaika_1_1.js');
const admin = require('firebase-admin');
const { tmSyntyma11Tilasto } = require('../lib/tm_syntymavuosi.js');

const argv = process.argv.slice(2);
const seuraArg = (argv.find((a) => a.indexOf('--seura=') === 0) || '').split('=')[1] || null;

async function main() {
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'talentmaster-pilot' });
  const db = admin.firestore();
  const seurat = seuraArg ? [seuraArg] : (await db.collection('seurat').select().get()).docs.map((d) => d.id);
  console.log('LUKEVA tarkistus — ei kirjoituksia\n');
  console.log('seura'.padEnd(18) + 'pelaajia'.padStart(9) + '  syntymaaika 1.1.'.padStart(18) + '  josta Seura-muokattu'.padStart(22));
  let yht = { pelaajia: 0, ykkosyksi: 0, ykkosyksi_ja_muokattu: 0 };
  for (const sid of seurat) {
    const docs = (await db.collection('seurat').doc(sid).collection('pelaajat').select('syntymaaika', 'muokkaajaUid', 'muokattu').get()).docs;
    const t = tmSyntyma11Tilasto(docs.map((d) => d.data()));
    Object.keys(yht).forEach((k) => { yht[k] += t[k]; });
    console.log(sid.padEnd(18) + String(t.pelaajia).padStart(9) + String(t.ykkosyksi).padStart(18) + String(t.ykkosyksi_ja_muokattu).padStart(22));
  }
  console.log('YHTEENSÄ'.padEnd(18) + String(yht.pelaajia).padStart(9) + String(yht.ykkosyksi).padStart(18) + String(yht.ykkosyksi_ja_muokattu).padStart(22));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e.message || e); process.exit(1); });
