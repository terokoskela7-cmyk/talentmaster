#!/usr/bin/env node
'use strict';
/**
 * taydenna_harjoituskertyma.js — K35-6f · pelaajien harjoituskertymän täyttö (backfill) kauden tapahtumista, läsnäolo- ja kirjausdokeista. KUIVA-AJO OLETUKSENA.
 *   node scripts/taydenna_harjoituskertyma.js --seura demo                 # kuiva-ajo: tulostaa pelaajakohtaiset viikkomäärät, ei kirjoita
 *   node scripts/taydenna_harjoituskertyma.js --seura demo --kirjoita      # kirjoittaa seurat/demo/pelaajat/{pid}/kooste/kertyma_{kausi}
 * KOVA RAJAUS: --seura muu kuin 'demo' → keskeytys (KPV/Sibbo/SJK vasta Teron erillisellä päätöksellä). Admin SDK + ADC (admin.credential.applicationDefault()).
 * Laskenta: functions/harjoituskertyma.js taytaPelaaja (lib/tm_harjoituskertyma.js) — sama kuin triggerit; ei vertailua, vain pelaajan omat luvut.
 */
const SALLITTU = 'demo', PROJECT_ID = 'talentmaster-pilot';
function tarkistaSeura(s) { if (s !== SALLITTU) throw new Error("Keskeytetty: --seura '" + s + "' ei sallittu. Vain '" + SALLITTU + "' (KPV/Sibbo/SJK vasta Teron erillisellä päätöksellä)."); }
async function aja({ db, deps, seura, kirjoita, nyt, loki }) {
  tarkistaSeura(seura); loki = loki || console.log; nyt = nyt || Date.now();
  const K = require('../functions/harjoituskertyma'), snap = await db.collection('seurat').doc(seura).collection('pelaajat').get(), tulos = [];
  const pelaajat = []; snap.forEach((d) => { const x = d.data() || {}; if (x.poistettu === true || x.arkistoitu === true || x.aktiivinen === false) return; pelaajat.push(d.id); });
  loki((kirjoita ? 'KIRJOITUS' : 'KUIVA-AJO (ei kirjoiteta)') + ' · seura ' + seura + ' · ' + pelaajat.length + ' pelaajaa');
  for (const pid of pelaajat) { const r = await K.taytaPelaaja(deps, seura, pid, nyt, !!kirjoita); if (!r) continue; tulos.push([pid, r.viikkoja]); loki('  ' + pid + ': ' + r.viikkoja + ' viikkoa (kausi ' + r.kausi + ')'); }
  loki('Yhteensä: ' + tulos.length + ' pelaajaa, ' + tulos.reduce((a, x) => a + x[1], 0) + ' viikkokoria' + (kirjoita ? ' kirjoitettu.' : ' (kuiva-ajo: ei kirjoitettu). Kirjoita lipulla --kirjoita.'));
  return tulos;
}
async function main() {
  const argv = process.argv.slice(2), arg = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; }, seura = arg('seura');
  if (!seura) { console.error('Käyttö: node scripts/taydenna_harjoituskertyma.js --seura demo [--kirjoita]'); process.exit(1); }
  try { tarkistaSeura(seura); } catch (e) { console.error(e.message); process.exit(1); }
  const admin = require('firebase-admin'); if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  const db = admin.firestore();
  await aja({ db, deps: { db, Timestamp: admin.firestore.Timestamp, FieldPath: admin.firestore.FieldPath, palvelinAika: () => admin.firestore.FieldValue.serverTimestamp() }, seura, kirjoita: argv.includes('--kirjoita') });
}
module.exports = { aja, tarkistaSeura, SALLITTU };
if (require.main === module) main().catch((e) => { console.error('VIRHE:', e.message); process.exit(1); });
