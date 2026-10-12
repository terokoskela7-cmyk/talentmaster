#!/usr/bin/env node
'use strict';
/**
 * taydenna_harjoituskertyma.js — K35-6f · pelaajien harjoituskertymän täyttö (backfill) kauden tapahtumista, läsnäolo- ja kirjausdokeista. KUIVA-AJO OLETUKSENA.
 *   node scripts/taydenna_harjoituskertyma.js --seura <id>                 # kuiva-ajo: tulostaa pelaajakohtaiset viikkomäärät, ei kirjoita
 *   node scripts/taydenna_harjoituskertyma.js --seura <id> --kirjoita      # kirjoittaa seurat/<id>/pelaajat/{pid}/kooste/kertyma_{kausi}
 *   node scripts/taydenna_harjoituskertyma.js --kaikki-seurat [--kirjoita] # KAIKKI seurat: oma erillinen lippu (ei johdu --seura:sta); kuiva-ajo oletus
 * K35-11 #6: --seura <id> sallittu kaikille seuroille (aiemmin vain 'demo'). Kirjoitus vaatii aina --kirjoita; --seura ja --kaikki-seurat eivät yhdisty. Admin SDK + ADC (admin.credential.applicationDefault()).
 * Laskenta: functions/harjoituskertyma.js taytaPelaaja (lib/tm_harjoituskertyma.js) — sama kuin triggerit; ei vertailua, vain pelaajan omat luvut.
 */
const PROJECT_ID = 'talentmaster-pilot';
function tarkistaSeura(s) { if (!s || typeof s !== 'string' || s.charAt(0) === '-' || /[\/\s]/.test(s)) throw new Error("Keskeytetty: --seura vaatii seuran id:n (sai '" + s + "')."); }
async function aja({ db, deps, seura, kirjoita, nyt, loki }) {
  tarkistaSeura(seura); loki = loki || console.log; nyt = nyt || Date.now();
  const K = require('../functions/harjoituskertyma'), snap = await db.collection('seurat').doc(seura).collection('pelaajat').get(), tulos = [];
  const pelaajat = []; snap.forEach((d) => { const x = d.data() || {}; if (x.poistettu === true || x.arkistoitu === true || x.aktiivinen === false) return; pelaajat.push(d.id); });
  loki((kirjoita ? 'KIRJOITUS' : 'KUIVA-AJO (ei kirjoiteta)') + ' · seura ' + seura + ' · ' + pelaajat.length + ' pelaajaa');
  for (const pid of pelaajat) { const r = await K.taytaPelaaja(deps, seura, pid, nyt, !!kirjoita); if (!r) continue; tulos.push([pid, r.viikkoja]); loki('  ' + pid + ': ' + r.viikkoja + ' viikkoa (kausi ' + r.kausi + ')'); }
  loki('Yhteensä: ' + tulos.length + ' pelaajaa, ' + tulos.reduce((a, x) => a + x[1], 0) + ' viikkokoria' + (kirjoita ? ' kirjoitettu.' : ' (kuiva-ajo: ei kirjoitettu). Kirjoita lipulla --kirjoita.'));
  return tulos;
}
function lueArgit(argv) {   // → { seura, kaikki, kirjoita } tai heittää virheen (--seura ja --kaikki-seurat eivät yhdisty; kumpikin vaaditaan erikseen)
  const i = argv.indexOf('--seura'), seura = i >= 0 ? argv[i + 1] : null, kaikki = argv.includes('--kaikki-seurat'), kirjoita = argv.includes('--kirjoita');
  if (i >= 0 && kaikki) throw new Error('Keskeytetty: --seura ja --kaikki-seurat eivät yhdisty.');
  if (kaikki) return { seura: null, kaikki: true, kirjoita };
  if (i < 0) throw new Error('Käyttö: node scripts/taydenna_harjoituskertyma.js --seura <id> [--kirjoita]   |   --kaikki-seurat [--kirjoita]');
  tarkistaSeura(seura); return { seura, kaikki: false, kirjoita };
}
async function main() {
  let a; try { a = lueArgit(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
  const admin = require('firebase-admin'); if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  const db = admin.firestore(), deps = { db, Timestamp: admin.firestore.Timestamp, FieldPath: admin.firestore.FieldPath, palvelinAika: () => admin.firestore.FieldValue.serverTimestamp() };
  const seurat = a.kaikki ? (await db.collection('seurat').get()).docs.map((d) => d.id) : [a.seura];
  for (const seura of seurat) await aja({ db, deps, seura, kirjoita: a.kirjoita });
}
module.exports = { aja, tarkistaSeura, lueArgit };
if (require.main === module) main().catch((e) => { console.error('VIRHE:', e.message); process.exit(1); });
