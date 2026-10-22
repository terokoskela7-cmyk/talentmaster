#!/usr/bin/env node
/* migroi_sisainen_d3.js — Tietoturva vaihe 1 / PR 1d: kopioi D3-A-kentät pelaajadokumentista `sisainen/tiedot`:iin.
 *
 * Kentät (lib/tm_sisainen.js RYHMAT.d3): d3_viimeisin, d3_taso, d3_pvm, d3_varmuus, d3_vp_pvm → seurat/{sid}/pelaajat/{pid}/sisainen/tiedot (+ seuraId, paivitetty).
 * KOPIOI, EI POISTA: vanhat kentät jäävät pelaajadokumenttiin (dual-write/dual-read -siirtymä); poisto on PR 2:n siivousskripti.
 * IDEMPOTENTTI: kopioi vain kentät joita `sisainen/tiedot`:ssa EI vielä ole (sisainen voittaa — uudempi Master-kirjoitus ei ylikirjoitu); toinen ajo = 0 kirjoitusta.
 * TULOSTE: vain lukumäärät (seuroittain) — ei nimiä, ei dokumentti-id:itä, ei sisältöä.
 *
 * AJO (Teron kaista; gcloud ADC, EI palveluavainta):
 *   Dry-run (OLETUS, ei kirjoita):           node scripts/migroi_sisainen_d3.js            [--seura=<id>]
 *   Kirjoitus (vasta dry-run-tarkistuksen jälkeen):  node scripts/migroi_sisainen_d3.js --kirjoita [--seura=<id>]   (+ kirjoita KIRJOITA vahvistukseksi; --kylla ohittaa kysymyksen)
 * Vaatii ensin: Rules v3.66 deployattuna (Admin SDK ohittaa Rulesin, mutta indeksi sisainen.seuraId tarvitaan lukijoille).
 */
'use strict';

const KENTAT = ['d3_viimeisin', 'd3_taso', 'd3_pvm', 'd3_varmuus', 'd3_vp_pvm'];   // peilaa lib/tm_sisainen.js RYHMAT.d3 (testi vartioi)
const onArvo = (v) => v !== undefined && v !== null;

/* PURE: mitä tälle pelaajalle kopioitaisiin? → { luokka: 'ei_d3'|'jo_siirretty'|'kopioi', kentat:[…], data:{…}|null } */
function suunnittele(pelaaja, sisainen, sid, nytISO) {
  const p = pelaaja || {}, s = sisainen || null;
  const lahde = KENTAT.filter((k) => onArvo(p[k]));
  if (!lahde.length) return { luokka: 'ei_d3', kentat: [], data: null };
  const puuttuu = lahde.filter((k) => !s || !onArvo(s[k]));
  const seuraOk = !!s && s.seuraId === sid;
  if (!puuttuu.length && seuraOk) return { luokka: 'jo_siirretty', kentat: [], data: null };
  const data = { seuraId: sid, paivitetty: nytISO };
  puuttuu.forEach((k) => { data[k] = p[k]; });
  return { luokka: 'kopioi', kentat: puuttuu, data };
}

/* Ajo injektoidulla db:llä (testattavissa fake-Firestorella). deps: { db, kirjoita, seura, nytISO, loki(fn), BATCH } → yhteenveto */
async function aja(deps) {
  const db = deps.db, loki = deps.loki || (() => {}), BATCH = deps.BATCH || 400, nytISO = deps.nytISO || new Date().toISOString();
  const seurat = deps.seura ? [deps.seura] : (await db.collection('seurat').get()).docs.map((d) => d.id);
  const yht = { seuraa: seurat.length, pelaajia: 0, ei_d3: 0, jo_siirretty: 0, kopioi: 0, kirjoitettu: 0 };
  const kirj = [];
  for (const sid of seurat) {
    const snap = await db.collection('seurat').doc(sid).collection('pelaajat').get();
    const r = { ei_d3: 0, jo_siirretty: 0, kopioi: 0 };
    for (const d of snap.docs) {
      const sref = d.ref.collection('sisainen').doc('tiedot'), ss = await sref.get();
      const pl = suunnittele(d.data() || {}, ss.exists ? ss.data() : null, sid, nytISO);
      r[pl.luokka]++;
      if (pl.luokka === 'kopioi') kirj.push({ ref: sref, data: pl.data });
    }
    yht.pelaajia += snap.docs.length; yht.ei_d3 += r.ei_d3; yht.jo_siirretty += r.jo_siirretty; yht.kopioi += r.kopioi;
    loki('[' + sid + '] pelaajia ' + snap.docs.length + ' · ei D3-dataa ' + r.ei_d3 + ' · jo siirretty ' + r.jo_siirretty + ' · kopioitavia ' + r.kopioi);
  }
  if (deps.kirjoita) {
    for (let i = 0; i < kirj.length; i += BATCH) {
      const b = db.batch();
      kirj.slice(i, i + BATCH).forEach((k) => b.set(k.ref, k.data, { merge: true }));
      await b.commit(); yht.kirjoitettu += Math.min(BATCH, kirj.length - i);
    }
  }
  return yht;
}

async function main() {
  const path = require('path'), readline = require('readline');
  let admin; try { admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin')); } catch (e) { admin = require('firebase-admin'); }
  const argv = process.argv.slice(2), KIRJOITA = argv.includes('--kirjoita'), KYLLA = argv.includes('--kylla');
  const seura = (argv.find((a) => a.indexOf('--seura=') === 0) || '').split('=')[1] || null;
  admin.initializeApp({ projectId: 'talentmaster-pilot', credential: admin.credential.applicationDefault() });   // gcloud ADC
  const db = admin.firestore();
  console.log('=== D3 → sisainen/tiedot · ' + (KIRJOITA ? 'KIRJOITUS (vaatii vahvistuksen)' : 'DRY-RUN (ei kirjoita)') + ' ===');
  if (KIRJOITA && !KYLLA) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const vastaus = await new Promise((res) => rl.question('Kirjoita KIRJOITA vahvistukseksi: ', res)); rl.close();
    if (vastaus.trim() !== 'KIRJOITA') { console.log('Peruttu — mitään ei kirjoitettu.'); return; }
  }
  const y = await aja({ db, kirjoita: KIRJOITA, seura, loki: console.log });
  console.log('YHTEENVETO', JSON.stringify(y));
  if (!KIRJOITA) console.log('DRY-RUN — mitään ei kirjoitettu. Kirjoitus: --kirjoita');
}

if (require.main === module) main().catch((e) => { console.error('VIRHE:', e && e.message ? e.message : e); process.exit(1); });
else if (!(typeof process !== 'undefined' && process.env && process.env.VITEST)) throw new Error('scripts/migroi_sisainen_d3.js käsittelee tuotantodataa — aja suoraan: node scripts/migroi_sisainen_d3.js (ei require/import)');   // vahinkoajon esto (S1)
module.exports = { KENTAT, suunnittele, aja };
