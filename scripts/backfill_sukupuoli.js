#!/usr/bin/env node
/**
 * backfill_sukupuoli.js — pelaajadokumentin `sukupuoli` ("M"/"N", §7.12) testitulokset-alikokoelmasta (Teron kaista; Tero ajaa).
 * Syy: Seura-tuonti ei kirjoittanut sukupuolta (KPV 7.10.2026: 126/126 ilman).
 * Sääntö: pelaajat joilta `sukupuoli` puuttuu → luetaan seurat/{sid}/pelaajat/{pid}/testitulokset/*.sukupuoli → kirjoitetaan VAIN jos kaikki tunnistetut arvot ovat yhtä mieltä.
 *         Ristiriidat (M ja N sekaisin) ja pelaajat ilman testituloksia → LISTAAN, ei kirjoiteta. Idempotentti: jo asetettua ei koskaan ylikirjoiteta (updatessa tarkistetaan uudelleen).
 *
 * AJO (dry-run oletus, EI kirjoita):   node scripts/backfill_sukupuoli.js [--seura=kpv]
 *      APPLY (kirjoittaa):             node scripts/backfill_sukupuoli.js --seura=kpv --apply
 * Tunnistus: gcloud ADC (`gcloud auth application-default login`), ei SA-avainta. ⚠ Aja dry-run ensin ja kuittauta luvut.
 */
'use strict';
const admin = require('firebase-admin');
const { tmSukupuoliTuloksista } = require('../lib/tm_sukupuoli.js');

const argv = process.argv.slice(2);
const arg = (n) => { const o = argv.find((a) => a.indexOf('--' + n + '=') === 0); return o ? o.split('=').slice(1).join('=') : null; };
const SEURA = arg('seura') || 'kpv', APPLY = argv.includes('--apply');

async function main() {
  if (!admin.apps.length) admin.initializeApp({ credential: admin.applicationDefault(), projectId: 'talentmaster-pilot' });
  const db = admin.firestore();
  console.log((APPLY ? '⚠ APPLY — kirjoittaa' : 'DRY-RUN — ei kirjoituksia') + ' · seura: ' + SEURA + '\n');
  const pelaajat = (await db.collection('seurat').doc(SEURA).collection('pelaajat').get()).docs;
  const ilman = pelaajat.filter((d) => { const s = d.get('sukupuoli'); return s !== 'M' && s !== 'N'; });
  const kirjoita = [], ristiriidat = [], eiTuloksia = [];
  for (const d of ilman) {
    const tul = await d.ref.collection('testitulokset').get();
    const x = tmSukupuoliTuloksista(tul.docs.map((t) => t.get('sukupuoli')));
    const nimi = [d.get('etunimi'), d.get('sukunimi')].filter(Boolean).join(' ') + ' (' + d.id + ')';
    if (x.syy === 'ok') kirjoita.push({ ref: d.ref, nimi, sukupuoli: x.sukupuoli, n: x.M + x.N });
    else if (x.syy === 'ristiriita') ristiriidat.push(nimi + ' — M:' + x.M + ' N:' + x.N);
    else eiTuloksia.push(nimi);
  }
  console.log('Pelaajia yhteensä: ' + pelaajat.length + ' · ilman sukupuolta: ' + ilman.length);
  console.log('→ päivitettäisiin: ' + kirjoita.length + ' (M ' + kirjoita.filter((k) => k.sukupuoli === 'M').length + ', N ' + kirjoita.filter((k) => k.sukupuoli === 'N').length + ')');
  console.log('→ ristiriita (EI kirjoiteta, käsin): ' + ristiriidat.length); ristiriidat.forEach((r) => console.log('   · ' + r));
  console.log('→ ei testituloksia / ei tunnistettavaa (EI kirjoiteta): ' + eiTuloksia.length); eiTuloksia.forEach((r) => console.log('   · ' + r));
  if (!APPLY) { console.log('\nDRY-RUN valmis. Kirjoita: --apply'); return; }
  let ok = 0, ohitettu = 0;
  for (let i = 0; i < kirjoita.length; i += 400) {
    const batch = db.batch();
    for (const k of kirjoita.slice(i, i + 400)) {
      const nyt = await k.ref.get(); const s = nyt.get('sukupuoli');
      if (s === 'M' || s === 'N') { ohitettu++; continue; }   // asetettu välillä → ei ylikirjoiteta
      batch.update(k.ref, { sukupuoli: k.sukupuoli }); ok++;
    }
    await batch.commit();
  }
  console.log('\nKirjoitettu: ' + ok + ' · ohitettu (asetettu välillä): ' + ohitettu);
}
main().catch((e) => { console.error('VIRHE:', e && e.message || e); process.exit(1); });
