#!/usr/bin/env node
/* migroi_sisainen_henkilokunta.js — Tietoturva vaihe 1 / PR 1c-1 (viipale S2): kopioi henkilökunnan kentät pelaajadokumentista `sisainen/tiedot`:iin.
 *
 * Kentät (lib/tm_sisainen.js RYHMAT.henkilokunta): vastuuhenkilo · tukitarve · scout_potentiaali(+_taso/_huomiot/_pvm/_arvioija) · talentti_ehdotus · review_viimeisin_pvm/_tyyppi + review_tagit · idp_edistyma/_lahde/_viim_review/_dvi.
 * KOPIOI, EI POISTA: vanhat kentät jäävät pelaajadokumenttiin (dual-write/dual-read -siirtymä); poisto on yleisen PR 2:n siivous. Pelaajadokumentista poistettua kenttää ei voi havaita → ei poisteta sisainen:istä.
 * IDEMPOTENTTI, kolme sääntöä (yksikkö = kenttäryhmä, jolla on yhteinen päivämäärä: vastuuhenkilo.asetettu_pvm · tukitarve.merkitty_pvm · talentti_ehdotus.pvm · scout_potentiaali_pvm · review_viimeisin_pvm · idp_viim_review):
 *   1. Yksikköä ei ole sisainen:ssä → kopioidaan kaikki sen kentät.
 *   2. Yksikkö on molemmissa → SISAINEN VOITTAA ristiriidassa (eroaa++); puuttuvat kentät ja karttojen puuttuvat LEHDET täydennetään (lehtitason täydennys); pelaajadokumentin null-lehti ei täydennä mitään.
 *   3. VANHENTUNUT: pelaajadokumentin yksikön päivämäärä on myöhäisempi kuin sisainen:n (vanha asiakas kirjoitti vain pelaajadokumenttiin) → yksikön kentät KORVATAAN pelaajadokumentin arvoilla (vanhentunut++). Päivämäärätön yksikkö (idp_edistyma ilman viim_review) ei voi olla vanhentunut.
 * Kirjoitus: yksi set mergeFields per pelaaja (vain kopioitavat kentät + seuraId/paivitetty). TULOSTE: vain lukumäärät (seuroittain) — ei nimiä, ei dokumentti-id:itä, ei sisältöä.
 *
 * AJO (Teron kaista; gcloud ADC, EI palveluavainta). EI AJETA ennen kuin Rules v3.69 on deployattu ja PM on kuitannut dry-runin:
 *   Dry-run (OLETUS, ei kirjoita):                    node scripts/migroi_sisainen_henkilokunta.js            [--seura=<id>]
 *   Selitys (LUKEVA; kopioitavat kentät: seura + kenttä/lehtipolku + arvotyyppi, ei arvoja eikä id:itä):  node scripts/migroi_sisainen_henkilokunta.js --selita [--seura=<id>]
 *   Kirjoitus (vasta dry-run-tarkistuksen jälkeen):   node scripts/migroi_sisainen_henkilokunta.js --kirjoita [--seura=<id>]   (+ kirjoita KIRJOITA vahvistukseksi; --kylla ohittaa kysymyksen)
 */
'use strict';

const S = require('../lib/tm_sisainen.js');
const onArvo = (v) => v !== undefined && v !== null;
const onKartta = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const kanon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).sort().reduce((o, a) => { o[a] = v[a]; return o; }, {}) : v);

/* Yksiköt: kentät + päivämäärän lukija (kentän tai kartan sisäinen pvm). */
const YKSIKOT = [
  { nimi: 'vastuuhenkilo', kentat: ['vastuuhenkilo'], pvm: (x) => x.vastuuhenkilo && x.vastuuhenkilo.asetettu_pvm },
  { nimi: 'tukitarve', kentat: ['tukitarve'], pvm: (x) => x.tukitarve && x.tukitarve.merkitty_pvm },
  { nimi: 'talentti_ehdotus', kentat: ['talentti_ehdotus'], pvm: (x) => x.talentti_ehdotus && x.talentti_ehdotus.pvm },
  { nimi: 'scout', kentat: ['scout_potentiaali', 'scout_potentiaali_taso', 'scout_potentiaali_huomiot', 'scout_potentiaali_pvm', 'scout_potentiaali_arvioija'], pvm: (x) => x.scout_potentiaali_pvm },
  { nimi: 'review', kentat: ['review_viimeisin_pvm', 'review_viimeisin_tyyppi', 'review_tagit'], pvm: (x) => x.review_viimeisin_pvm },
  { nimi: 'idp', kentat: ['idp_edistyma', 'idp_lahde', 'idp_viim_review', 'idp_dvi'], pvm: (x) => x.idp_viim_review }
];
/* Arvon tyyppi selitystä varten (ei arvoa): null · Timestamp · kenttäoperaatio (sentinel) · taulukko · tyhjä map · map · typeof. */
const tyyppi = (v) => {
  if (v === undefined) return 'puuttuu'; if (v === null) return 'null'; if (Array.isArray(v)) return v.length ? 'taulukko' : 'tyhjä taulukko';
  if (typeof v === 'object') {
    const n = (v.constructor && v.constructor.name) || '';
    if (typeof v.toDate === 'function' || n === 'Timestamp') return 'Timestamp'; if (/Field.?Value|Transform|Sentinel/.test(n) || (typeof v.isEqual === 'function' && !Object.keys(v).length)) return 'kenttäoperaatio(' + n + ')';   // serverTimestamp/increment/poisto-sentinel
    if (n && n !== 'Object') return n; return Object.keys(v).length ? 'map' : 'tyhjä map';
  }
  return typeof v;
};
const turvaAvain = (k) => (/^[A-Za-z0-9_-]{16,}$/.test(k) && /\d/.test(k)) ? '<id>' : k;   // id-näköiset map-avaimet (uid tms.) peitetään
const paiva = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) ? v.slice(0, 10) : null;

/* Lehtitason täydennys: puuttuvat lehdet kopioidaan, sisainen voittaa ristiriidassa. → { tulos, lisatty, eroaa } */
function taydenna(vanha, uusi, polku, selitys) {
  const tulos = Object.assign({}, vanha); let lisatty = 0, eroaa = 0;
  Object.keys(uusi).forEach((k) => {
    const pk = (polku || '') + '.' + turvaAvain(k);
    if (!onArvo(uusi[k])) return;   // pelaajadokumentin null-lehti ei ole täydennettävää (muuten null kopioituu joka ajolla uudelleen: kopioi 1 ei koskaan nollaudu)
    if (!onArvo(vanha[k])) { tulos[k] = uusi[k]; lisatty++; if (selitys) selitys.push({ polku: pk, syy: 'lehti puuttuu sisainen:sta', pelaaja: tyyppi(uusi[k]), sisainen: tyyppi(vanha[k]) }); }
    else if (onKartta(vanha[k]) && onKartta(uusi[k])) { const r = taydenna(vanha[k], uusi[k], pk, selitys); tulos[k] = r.tulos; lisatty += r.lisatty; eroaa += r.eroaa; }
    else if (kanon(vanha[k]) !== kanon(uusi[k])) eroaa++;
  });
  return { tulos, lisatty, eroaa };
}

/* PURE: mitä tälle pelaajalle kirjoitettaisiin? → { luokka:'ei_a'|'jo_siirretty'|'kopioi', kentat:{kenttä:arvo}, eroaa, vanhentunut, data|null, mergeFields|null } */
function suunnittele(pelaaja, sisainen, sid, nytISO, selitys) {
  const p = pelaaja || {}, s = sisainen || {}, kirj = {}; let eroaa = 0, vanhentunut = 0, onA = false;
  YKSIKOT.forEach((y) => {
    const polla = y.kentat.filter((k) => onArvo(p[k]));
    if (!polla.length) return; onA = true;
    const sisassa = y.kentat.filter((k) => onArvo(s[k]));
    if (!sisassa.length) { polla.forEach((k) => { kirj[k] = p[k]; if (selitys) selitys.push({ polku: k, syy: 'yksikkö puuttuu sisainen:sta', pelaaja: tyyppi(p[k]), sisainen: tyyppi(s[k]) }); }); return; }   // 1. yksikköä ei sisainen:ssä → kopioi
    const pp = paiva(y.pvm(p)), sp = paiva(y.pvm(s));
    if (pp && sp && pp > sp) { vanhentunut++; polla.forEach((k) => { if (kanon(p[k]) !== kanon(s[k])) { kirj[k] = p[k]; if (selitys) selitys.push({ polku: k, syy: 'vanhentunut', pelaaja: tyyppi(p[k]), sisainen: tyyppi(s[k]) }); } }); return; }   // 3. vanhentunut → korvaa pelaajadokumentin arvoilla
    polla.forEach((k) => {   // 2. sisainen voittaa; täydennä puuttuvat
      if (!onArvo(s[k])) { kirj[k] = p[k]; if (selitys) selitys.push({ polku: k, syy: 'kenttä puuttuu sisainen:sta', pelaaja: tyyppi(p[k]), sisainen: tyyppi(s[k]) }); }
      else if (onKartta(s[k]) && onKartta(p[k])) { const r = taydenna(s[k], p[k], k, selitys); if (r.lisatty) kirj[k] = r.tulos; eroaa += r.eroaa; }
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
      const sel = deps.selita ? [] : null, pl = suunnittele(d.data() || {}, ss.exists ? ss.data() : null, sid, nytISO, sel);
      if (sel && pl.luokka === 'kopioi') sel.forEach((x) => loki('  [' + sid + '] SELITYS ' + x.polku + ' · ' + x.syy + ' · tyyppi pelaajadokumentissa: ' + x.pelaaja + ' · sisainen: ' + x.sisainen));
      r[pl.luokka]++; r.kenttia += Object.keys(pl.kentat).length; r.eroaa += pl.eroaa; r.vanh += pl.vanhentunut;
      if (pl.luokka === 'kopioi') kirj.push({ ref: sref, data: pl.data, mergeFields: pl.mergeFields });
    }
    yht.pelaajia += snap.docs.length; yht.ei_a += r.ei_a; yht.jo_siirretty += r.jo_siirretty; yht.kopioi += r.kopioi; yht.kenttia += r.kenttia; yht.eroaa += r.eroaa; yht.vanhentunut += r.vanh;
    loki('[' + sid + '] pelaajia ' + snap.docs.length + ' · ei henkilökunta-kenttiä ' + r.ei_a + ' · jo siirretty ' + r.jo_siirretty + ' · kopioitavia ' + r.kopioi + ' (kenttiä ' + r.kenttia + ') · eroaa sisainen:sta ' + r.eroaa + ' · vanhentunut sisainen ' + r.vanh);
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
  const argv = process.argv.slice(2), KIRJOITA = argv.includes('--kirjoita'), KYLLA = argv.includes('--kylla'), SELITA = argv.includes('--selita');
  const seura = (argv.find((a) => a.indexOf('--seura=') === 0) || '').split('=')[1] || null;
  admin.initializeApp({ projectId: 'talentmaster-pilot', credential: admin.credential.applicationDefault() });   // gcloud ADC
  const db = admin.firestore();
  console.log('=== Henkilökunnan kentät → sisainen/tiedot · ' + (KIRJOITA ? 'KIRJOITUS (vaatii vahvistuksen)' : 'DRY-RUN (ei kirjoita)') + ' ===');
  if (KIRJOITA && !KYLLA) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const vastaus = await new Promise((res) => rl.question('Kirjoita KIRJOITA vahvistukseksi: ', res)); rl.close();
    if (vastaus.trim() !== 'KIRJOITA') { console.log('Peruttu — mitään ei kirjoitettu.'); return; }
  }
  if (KIRJOITA && SELITA) { console.log('--selita on lukeva tila; ei yhdessä --kirjoita:n kanssa.'); return; }
  const y = await aja({ db, kirjoita: KIRJOITA, seura, selita: SELITA, loki: console.log });
  console.log('YHTEENVETO', JSON.stringify(y));
  if (!KIRJOITA) console.log('DRY-RUN — mitään ei kirjoitettu. Kirjoitus: --kirjoita');
}

if (require.main === module) main().catch((e) => { console.error('VIRHE:', e && e.message ? e.message : e); process.exit(1); });
else if (!(typeof process !== 'undefined' && process.env && process.env.VITEST)) throw new Error('scripts/migroi_sisainen_henkilokunta.js käsittelee tuotantodataa — aja suoraan: node scripts/migroi_sisainen_henkilokunta.js (ei require/import)');
module.exports = { suunnittele, aja, YKSIKOT, tyyppi };
