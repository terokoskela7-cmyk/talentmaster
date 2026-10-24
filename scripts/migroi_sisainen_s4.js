#!/usr/bin/env node
/* migroi_sisainen_s4.js — Tietoturva vaihe 1 / PR 1e-1 (viipale S4): kopioi viiden ryhmän kentät pelaajadokumentista `sisainen/tiedot`:iin.
 *
 * Ryhmät (lib/tm_sisainen.js, lippu RYHMAT.s4.kirjoitus): adar_sisainen · arviointi · kypsyys_sisainen (+ vanhempien pituudet) · talentti_terveys · signaali.
 * JAETUT ARVOT: signaali → vain talenttisignaalit (SIGNAALI_SISAINEN: xfactor, x-factor, hidden-gem, hidden) kopioidaan; 'phv' ja muut jäävät pelaajalle. havainto_porras_ehdotus.hist → sisainen.havainto_porras_hist (pelaajalle jää {valmis, seuraava} + hist; hist_n lasketaan PR 2:n siivouksessa ennen hist:in poistoa — P7 lukee hist_n ?? hist.length).
 * KOPIOI, EI POISTA: vanhat kentät jäävät pelaajadokumenttiin (dual-write/dual-read -siirtymä); poisto on PR 2:n siivous.
 * IDEMPOTENTTI, samat kolme sääntöä kuin migroi_sisainen_henkilokunta.js: (1) yksikköä ei sisainen:ssä → kopioi; (2) molemmissa → SISAINEN VOITTAA (eroaa++), puuttuvat lehdet täydennetään; (3) pelaajadokumentin yksikön pvm myöhäisempi → VANHENTUNUT, korvataan pelaajadokumentin arvoilla.
 *   Päivämäärälliset yksiköt: adar (havainto_viimeisin_pvm), arviointi (arviointi_kooste_pvm | arviointi_pvm). Muut päivämäärättömiä → eivät vanhene.
 * Kirjoitus: yksi set mergeFields per pelaaja. TULOSTE: vain lukumäärät (seuroittain) — ei nimiä, ei dokumentti-id:itä, ei sisältöä (loukkaantumis-/terveystieto GDPR art. 9).
 *
 * AJO (Teron kaista; gcloud ADC, EI palveluavainta). EI AJETA ennen kuin Rules v3.70 on deployattu ja PM on kuitannut dry-runin:
 *   Dry-run (OLETUS, ei kirjoita):                    node scripts/migroi_sisainen_s4.js            [--seura=<id>]
 *   Kirjoitus (vasta dry-run-tarkistuksen jälkeen):   node scripts/migroi_sisainen_s4.js --kirjoita [--seura=<id>]   (+ kirjoita KIRJOITA vahvistukseksi; --kylla ohittaa kysymyksen)
 */
'use strict';

const S = require('../lib/tm_sisainen.js');
const RK = S.RYHMAT;
const onArvo = (v) => v !== undefined && v !== null;
const onKartta = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const kanon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).sort().reduce((o, a) => { o[a] = v[a]; return o; }, {}) : v);

/* Yksiköt: kentät (rekisteristä) + päivämäärän lukija. adar-yksikköön kuuluu johdettu havainto_porras_hist (ks. lahde). */
const YKSIKOT = [
  { nimi: 'adar_sisainen', kentat: RK.adar_sisainen.kentat, pvm: (x) => x.havainto_viimeisin_pvm },
  { nimi: 'arviointi', kentat: RK.arviointi.kentat, pvm: (x) => x.arviointi_kooste_pvm || x.arviointi_pvm },
  { nimi: 'kypsyys_sisainen', kentat: RK.kypsyys_sisainen.kentat, pvm: () => null },
  { nimi: 'talentti_terveys', kentat: RK.talentti_terveys.kentat, pvm: () => null },
  { nimi: 'signaali', kentat: RK.signaali.kentat, pvm: () => null }
];
/* Pelaajadokumentin LÄHDEARVOT migraatiolle: johdetut kentät (hist, talenttisignaali). 'phv'-signaali ei kopioidu. */
function lahde(p) {
  const l = Object.assign({}, p || {});
  const e = l.havainto_porras_ehdotus;
  if (e && Array.isArray(e.hist) && e.hist.length) l.havainto_porras_hist = e.hist.slice();
  if (S.tmSignaaliJaa(l.signaali).sisainen === null) delete l.signaali;
  return l;
}
const paiva = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) ? v.slice(0, 10) : null;

/* Lehtitason täydennys: puuttuvat lehdet kopioidaan, sisainen voittaa ristiriidassa. → { tulos, lisatty, eroaa } */
function taydenna(vanha, uusi) {
  const tulos = Object.assign({}, vanha); let lisatty = 0, eroaa = 0;
  Object.keys(uusi).forEach((k) => {
    if (!onArvo(vanha[k])) { tulos[k] = uusi[k]; lisatty++; }
    else if (onKartta(vanha[k]) && onKartta(uusi[k])) { const r = taydenna(vanha[k], uusi[k]); tulos[k] = r.tulos; lisatty += r.lisatty; eroaa += r.eroaa; }
    else if (kanon(vanha[k]) !== kanon(uusi[k])) eroaa++;
  });
  return { tulos, lisatty, eroaa };
}

/* PURE: mitä tälle pelaajalle kirjoitettaisiin? → { luokka:'ei_a'|'jo_siirretty'|'kopioi', kentat:{kenttä:arvo}, eroaa, vanhentunut, data|null, mergeFields|null } */
function suunnittele(pelaaja, sisainen, sid, nytISO) {
  const p = lahde(pelaaja), s = sisainen || {}, kirj = {}; let eroaa = 0, vanhentunut = 0, onA = false;
  YKSIKOT.forEach((y) => {
    const polla = y.kentat.filter((k) => onArvo(p[k]));
    if (!polla.length) return; onA = true;
    const sisassa = y.kentat.filter((k) => onArvo(s[k]));
    if (!sisassa.length) { polla.forEach((k) => { kirj[k] = p[k]; }); return; }   // 1. yksikköä ei sisainen:ssä → kopioi
    const pp = paiva(y.pvm(p)), sp = paiva(y.pvm(s));
    if (pp && sp && pp > sp) { vanhentunut++; polla.forEach((k) => { if (kanon(p[k]) !== kanon(s[k])) kirj[k] = p[k]; }); return; }   // 3. vanhentunut → korvaa pelaajadokumentin arvoilla
    polla.forEach((k) => {   // 2. sisainen voittaa; täydennä puuttuvat
      if (!onArvo(s[k])) kirj[k] = p[k];
      else if (onKartta(s[k]) && onKartta(p[k])) { const r = taydenna(s[k], p[k]); if (r.lisatty) kirj[k] = r.tulos; eroaa += r.eroaa; }
      else if (kanon(s[k]) !== kanon(p[k])) eroaa++;
    });
  });
  if (!onA) return { luokka: 'ei_a', kentat: {}, eroaa: 0, vanhentunut: 0, data: null, mergeFields: null };
  const nimet = Object.keys(kirj);
  if (!nimet.length) return { luokka: 'jo_siirretty', kentat: {}, eroaa, vanhentunut, data: null, mergeFields: null };
  return { luokka: 'kopioi', kentat: kirj, eroaa, vanhentunut, data: Object.assign({ seuraId: sid, paivitetty: nytISO }, kirj), mergeFields: ['seuraId', 'paivitetty'].concat(nimet) };
}

/* Ajo injektoidulla db:llä (testattavissa fake-Firestorella). deps: { db, kirjoita, seura, nytISO, loki(fn), BATCH } → yhteenveto */
async function aja(deps) {
  const db = deps.db, loki = deps.loki || (() => {}), BATCH = deps.BATCH || 400, nytISO = deps.nytISO || new Date().toISOString();
  const seurat = deps.seura ? [deps.seura] : (await db.collection('seurat').get()).docs.map((d) => d.id);
  const yht = { seuraa: seurat.length, pelaajia: 0, ei_a: 0, jo_siirretty: 0, kopioi: 0, kenttia: 0, eroaa: 0, vanhentunut: 0, kirjoitettu: 0 };
  const kirj = [];
  for (const sid of seurat) {
    const snap = await db.collection('seurat').doc(sid).collection('pelaajat').get();
    const r = { ei_a: 0, jo_siirretty: 0, kopioi: 0, kenttia: 0, eroaa: 0, vanh: 0 };
    for (const d of snap.docs) {
      const sref = d.ref.collection('sisainen').doc('tiedot'), ss = await sref.get();
      const pl = suunnittele(d.data() || {}, ss.exists ? ss.data() : null, sid, nytISO);
      r[pl.luokka]++; r.kenttia += Object.keys(pl.kentat).length; r.eroaa += pl.eroaa; r.vanh += pl.vanhentunut;
      if (pl.luokka === 'kopioi') kirj.push({ ref: sref, data: pl.data, mergeFields: pl.mergeFields });
    }
    yht.pelaajia += snap.docs.length; yht.ei_a += r.ei_a; yht.jo_siirretty += r.jo_siirretty; yht.kopioi += r.kopioi; yht.kenttia += r.kenttia; yht.eroaa += r.eroaa; yht.vanhentunut += r.vanh;
    loki('[' + sid + '] pelaajia ' + snap.docs.length + ' · ei S4-kenttiä ' + r.ei_a + ' · jo siirretty ' + r.jo_siirretty + ' · kopioitavia ' + r.kopioi + ' (kenttiä ' + r.kenttia + ') · eroaa sisainen:sta ' + r.eroaa + ' · vanhentunut sisainen ' + r.vanh);
  }
  if (deps.kirjoita) {
    for (let i = 0; i < kirj.length; i += BATCH) {
      const b = db.batch();
      kirj.slice(i, i + BATCH).forEach((k) => b.set(k.ref, k.data, { mergeFields: k.mergeFields }));
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
  console.log('=== S4-kentät → sisainen/tiedot · ' + (KIRJOITA ? 'KIRJOITUS (vaatii vahvistuksen)' : 'DRY-RUN (ei kirjoita)') + ' ===');
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
else if (!(typeof process !== 'undefined' && process.env && process.env.VITEST)) throw new Error('scripts/migroi_sisainen_s4.js käsittelee tuotantodataa — aja suoraan: node scripts/migroi_sisainen_s4.js (ei require/import)');
module.exports = { suunnittele, aja, YKSIKOT, lahde };
