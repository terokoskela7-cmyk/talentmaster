#!/usr/bin/env node
/* migroi_sisainen_jaksofokus.js — Tietoturva vaihe 1 / PR 1b-1 (viipale S1): kopioi jaksofokuksen A-osat pelaajadokumentista `sisainen/tiedot`:iin.
 *
 * Kopioitavat (lib/tm_sisainen.js JAKSOFOKUS_A / HISTORIA_A):
 *   · pelaajan `jaksofokus.<A-alikenttä>` → sisainen.jaksofokus_sisainen.<A-alikenttä>   (osa_havainnot, osa_havainnot_vk, tavoite_tarkenteet, onnistumiskriteeri, linkitetyt, tavoite_alue, valitavoite_idx, poikkeama, oma_jakso)
 *   · pelaajan `jaksofokus_historia[]`-rivien A-kentät → sisainen.historia_sisainen.<alkoi>_<konsepti_avain>.<A-kenttä>   (havainnot_vk, arvio_ennen/_jalkeen/_itse/_valmentaja/_vp, arvioija_rooli, kalibraatio_ero, delta_mitattu, d3_snapshot, sitoumus_snapshot)
 *   jaksofokus.asetti {rooli,pvm} ja jaksofokus.lahde (tyyppi) JÄÄVÄT pelaajadokumenttiin (PM 23.10.: ei uid/email) — niihin ei kosketa.
 * KOPIOI, EI POISTA: vanhat kentät jäävät pelaajadokumenttiin (dual-read/dual-write -siirtymä); poisto on yleisen PR 2:n siivousskripti.
 * IDEMPOTENTTI: kopioi vain kentät/rivit/lehdet joita sisainen/tiedot:ssa EI vielä ole (sisainen voittaa — uudempi kirjoitus ei ylikirjoitu); toinen ajo = 0 kirjoitusta.
 * PR 1b-3: (a) karttamaiset kentät (osa_havainnot, osa_havainnot_vk, d3_snapshot …) täydennetään SYVÄSTI lehti kerrallaan — dual-write luo sisainen:iin vain uudet lehdet, joten kartta on siellä osittainen;
 *          (b) VANHENTUNUT jaksofokus_sisainen (jakso_avain ≠ nykyinen jakso: vanha asiakas vaihtoi jakson vain pelaajadokumenttiin) KORVATAAN nykyisen jakson A-osilla + uusi jakso_avain-leima; luku `vanhentunut` raportoidaan.
 * TULOSTE: vain lukumäärät (seuroittain) — ei nimiä, ei dokumentti-id:itä, ei sisältöä.
 *
 * AJO (Teron kaista; gcloud ADC, EI palveluavainta). EI AJETA ennen kuin Rules v3.68 on deployattu ja PM on kuitannut dry-runin:
 *   Dry-run (OLETUS, ei kirjoita):                    node scripts/migroi_sisainen_jaksofokus.js            [--seura=<id>]
 *   Kirjoitus (vasta dry-run-tarkistuksen jälkeen):   node scripts/migroi_sisainen_jaksofokus.js --kirjoita [--seura=<id>]   (+ kirjoita KIRJOITA vahvistukseksi; --kylla ohittaa kysymyksen)
 */
'use strict';

const S = require('../lib/tm_sisainen.js');
const onArvo = (v) => v !== undefined && v !== null;
const kanon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)) ? Object.keys(v).sort().reduce((o, a) => { o[a] = v[a]; return o; }, {}) : v);

/* PURE: mitä tälle pelaajalle kopioitaisiin?
   → { luokka:'ei_a'|'jo_siirretty'|'ilman_avainta'|'kopioi', jaksofokus:{kentta:arvo} (puuttuvat), historia:{avain:{kentta:arvo}} (puuttuvat A-kentät, rivi kerrallaan), ilmanAvainta:n, eroaa:n (sisainen:ssä eri arvo → ei ylikirjoiteta), data|null } */
const onKartta = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
/* PR 1b-3: SYVÄ täydennys karttamaisille A-kentille (osa_havainnot, osa_havainnot_vk, d3_snapshot …). Dual-write (lippu päällä) luo sisainen:iin vain UUDET lehdet (osa_havainnot.k.a.<uid>), joten kartta on
   siellä osittainen; pelkkä "kenttä löytyy → sisainen voittaa" jättäisi vanhemmat lehdet piiloon dual-readissa. Täydennys: puuttuvat lehdet kopioidaan, sisainen voittaa ristiriidassa (eroaa++), ei ylikirjoitusta.
   → { tulos (täydennetty kartta), lisatty (lehtiä), eroaa } */
function taydenna(vanha, uusi) {
  const tulos = Object.assign({}, vanha); let lisatty = 0, eroaa = 0;
  Object.keys(uusi).forEach((k) => {
    if (!onArvo(vanha[k])) { tulos[k] = uusi[k]; lisatty++; }
    else if (onKartta(vanha[k]) && onKartta(uusi[k])) { const r = taydenna(vanha[k], uusi[k]); tulos[k] = r.tulos; lisatty += r.lisatty; eroaa += r.eroaa; }
    else if (kanon(vanha[k]) !== kanon(uusi[k])) eroaa++;
  });
  return { tulos, lisatty, eroaa };
}
function suunnittele(pelaaja, sisainen, sid, nytISO) {
  const p = pelaaja || {}, s = sisainen || null, sj0 = (s && s.jaksofokus_sisainen && typeof s.jaksofokus_sisainen === 'object') ? s.jaksofokus_sisainen : {}, sh = (s && s.historia_sisainen && typeof s.historia_sisainen === 'object') ? s.historia_sisainen : {};
  const jaa = S.tmJaksofokusJaa(p.jaksofokus), puuttuvaJf = {}, ja = S.tmJaksoAvain(p.jaksofokus); let eroaa = 0, ilmanAvainta = 0, onA = false;
  /* VANHENTUNUT: sisainen.jaksofokus_sisainen on eri jaksolta (jakso_avain ≠ nykyinen; vanha asiakas vaihtoi jakson vain pelaajadokumenttiin) → korvataan koko kenttä nykyisen jakson A-osilla (mergeFields). Dual-read ohittaa sen jo nyt;
     korjaus on pakollinen ennen kuin pelaajadokumentin A-osat siivotaan (PR 2). Jos nykyisellä jaksolla ei ole A-osia, vanhentunutta ei voi poistaa tässä skriptissä (skripti ei poista kenttiä) → lasketaan vanhentunut_ilman_a. */
  const vanhentunut = !!(ja && typeof sj0.jakso_avain === 'string' && sj0.jakso_avain !== ja), korvaa = vanhentunut && !!jaa.sisainen, sj = korvaa ? {} : sj0;
  if (jaa.sisainen) {
    onA = true;
    Object.keys(jaa.sisainen).forEach((k) => {
      const uusi = jaa.sisainen[k];
      if (!onArvo(sj[k])) puuttuvaJf[k] = uusi;
      else if (onKartta(sj[k]) && onKartta(uusi)) { const r = taydenna(sj[k], uusi); if (r.lisatty) puuttuvaJf[k] = r.tulos; eroaa += r.eroaa; }
      else if (kanon(sj[k]) !== kanon(uusi)) eroaa++;
    });
  }
  const puuttuvaHis = {};
  (Array.isArray(p.jaksofokus_historia) ? p.jaksofokus_historia : []).forEach((rivi) => {
    const j = S.tmHistoriaJaa(rivi); if (!j.sisainen) return; onA = true;
    if (!j.avain) { ilmanAvainta++; return; }
    const ol = (sh[j.avain] && typeof sh[j.avain] === 'object') ? sh[j.avain] : {}, uusi = {};
    Object.keys(j.sisainen).forEach((k) => {
      const v = j.sisainen[k];
      if (!onArvo(ol[k])) uusi[k] = v;
      else if (onKartta(ol[k]) && onKartta(v)) { const r = taydenna(ol[k], v); if (r.lisatty) uusi[k] = r.tulos; eroaa += r.eroaa; }
      else if (kanon(ol[k]) !== kanon(v)) eroaa++;
    });
    if (Object.keys(uusi).length) puuttuvaHis[j.avain] = Object.assign(puuttuvaHis[j.avain] || {}, uusi);
  });
  if (!onA) return { luokka: 'ei_a', jaksofokus: {}, historia: {}, ilmanAvainta: 0, eroaa: 0, vanhentunut: vanhentunut ? 1 : 0, data: null };   // vanhentunut sisainen jää (skripti ei poista) → raportoidaan
  const nJf = Object.keys(puuttuvaJf).length, nHis = Object.keys(puuttuvaHis).length, vanh = vanhentunut ? 1 : 0;
  if (!nJf && !nHis) return { luokka: ilmanAvainta ? 'ilman_avainta' : 'jo_siirretty', jaksofokus: {}, historia: {}, ilmanAvainta, eroaa, vanhentunut: vanh, data: null };   // ei mitään kopioitavaa (kaikki jo sisainen:ssä tai rivit vailla alkoi/konsepti_avain-avainta)
  const data = { seuraId: sid, paivitetty: nytISO };
  if (nJf) { data.jaksofokus_sisainen = Object.assign({}, sj, puuttuvaJf); if (ja && (korvaa || !onArvo(sj0.jakso_avain))) data.jaksofokus_sisainen.jakso_avain = ja; }   // kirjoitetaan koko kartta (olemassa olevat arvot mukana → merge ei kadota mitään); leima = nykyinen jakso
  if (nHis) { data.historia_sisainen = Object.assign({}, sh); Object.keys(puuttuvaHis).forEach((a) => { data.historia_sisainen[a] = Object.assign({}, sh[a] || {}, puuttuvaHis[a]); }); }
  const ulos = { luokka: 'kopioi', jaksofokus: puuttuvaJf, historia: puuttuvaHis, ilmanAvainta, eroaa, vanhentunut: vanh, data };
  if (korvaa) ulos.mergeFields = ['seuraId', 'paivitetty', 'jaksofokus_sisainen'].concat(Object.keys(puuttuvaHis).map((a) => 'historia_sisainen.' + a));   // korvaus: jaksofokus_sisainen kokonaan, historiarivit riveittäin (ei muuta koskettu)
  return ulos;
}

/* Ajo injektoidulla db:llä (testattavissa fake-Firestorella). deps: { db, kirjoita, seura, nytISO, loki(fn), BATCH } → yhteenveto */
async function aja(deps) {
  const db = deps.db, loki = deps.loki || (() => {}), BATCH = deps.BATCH || 400, nytISO = deps.nytISO || new Date().toISOString();
  const seurat = deps.seura ? [deps.seura] : (await db.collection('seurat').get()).docs.map((d) => d.id);
  const yht = { seuraa: seurat.length, pelaajia: 0, ei_a: 0, jo_siirretty: 0, ilman_avainta: 0, kopioi: 0, jaksofokus_kenttia: 0, historia_rivia: 0, rivia_ilman_avainta: 0, eroaa: 0, vanhentunut: 0, kirjoitettu: 0 };
  const kirj = [];
  for (const sid of seurat) {
    const snap = await db.collection('seurat').doc(sid).collection('pelaajat').get();
    const r = { ei_a: 0, jo_siirretty: 0, ilman_avainta: 0, kopioi: 0, jf: 0, his: 0, ilman: 0, eroaa: 0, vanh: 0 };
    for (const d of snap.docs) {
      const sref = d.ref.collection('sisainen').doc('tiedot'), ss = await sref.get();
      const pl = suunnittele(d.data() || {}, ss.exists ? ss.data() : null, sid, nytISO);
      r[pl.luokka]++; r.jf += Object.keys(pl.jaksofokus).length; r.his += Object.keys(pl.historia).length; r.ilman += pl.ilmanAvainta; r.eroaa += pl.eroaa;
      r.vanh += pl.vanhentunut; if (pl.luokka === 'kopioi') kirj.push({ ref: sref, data: pl.data, mergeFields: pl.mergeFields });
    }
    yht.pelaajia += snap.docs.length; yht.ei_a += r.ei_a; yht.jo_siirretty += r.jo_siirretty; yht.ilman_avainta += r.ilman_avainta; yht.kopioi += r.kopioi; yht.jaksofokus_kenttia += r.jf; yht.historia_rivia += r.his; yht.rivia_ilman_avainta += r.ilman; yht.eroaa += r.eroaa; yht.vanhentunut += r.vanh;
    loki('[' + sid + '] pelaajia ' + snap.docs.length + ' · ei jaksofokus-A-dataa ' + r.ei_a + ' · jo siirretty ' + r.jo_siirretty + ' · vain avaimettomia rivejä ' + r.ilman_avainta + ' · kopioitavia ' + r.kopioi + ' (jaksofokus-kenttiä ' + r.jf + ', historiarivejä ' + r.his + ') · rivejä ilman avainta ' + r.ilman + ' · eroaa sisainen:sta ' + r.eroaa + ' · vanhentunut sisainen (eri jakso) ' + r.vanh);
  }
  if (deps.kirjoita) {
    for (let i = 0; i < kirj.length; i += BATCH) {
      const b = db.batch();
      kirj.slice(i, i + BATCH).forEach((k) => b.set(k.ref, k.data, k.mergeFields ? { mergeFields: k.mergeFields } : { merge: true }));   // mergeFields vain vanhentuneen jaksofokus_sisainen:n korvaukseen
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
  console.log('=== Jaksofokuksen A-osat → sisainen/tiedot · ' + (KIRJOITA ? 'KIRJOITUS (vaatii vahvistuksen)' : 'DRY-RUN (ei kirjoita)') + ' ===');
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
else if (!(typeof process !== 'undefined' && process.env && process.env.VITEST)) throw new Error('scripts/migroi_sisainen_jaksofokus.js käsittelee tuotantodataa — aja suoraan: node scripts/migroi_sisainen_jaksofokus.js (ei require/import)');
module.exports = { suunnittele, aja };
