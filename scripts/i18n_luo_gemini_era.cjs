#!/usr/bin/env node
/* Gemini-erän 2 pohja (sv-läpiajo; docs/CODE_BRIEF_I18N_SV_LAPIAJO.md kohta 4). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Lähde: tests/tm_lang_sv_odotuslista.cjs (uudet fi+en-avaimet) → osio "tm_lang" (fi/en tm_lang.js:stä). Ohje + termistö kopioidaan 8.10. erästä sellaisenaan.
   Idempotentti: jo täytetty sv (aiempi ajo + Geminin paluu) säilyy; vain puuttuvat rivit lisätään; poistuneet (ei enää odotuslistalla) pudotetaan jos sv tyhjä.
   Ajo: node scripts/i18n_luo_gemini_era.cjs [--tiedosto=docs/i18n/sv_kaannoserae_2.json] */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = path.join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_2.json'));
const E1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/i18n/sv_kaannoserae_2026-10-08.json'), 'utf8'));
const L = require('../lib/tm_lang.js').TM_LANG;
const ODOTTAA = require('../tests/tm_lang_sv_odotuslista.cjs');
const hae = (kieli, polku) => polku.split('.').reduce((o, k) => (o == null ? undefined : o[k]), L[kieli]);

let nyk = null; try { nyk = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanhat = (nyk && nyk.osiot && nyk.osiot.tm_lang && nyk.osiot.tm_lang.rivit) || {};
const rivit = {}; let uusia = 0;
for (const p of ODOTTAA) {
  const fi = hae('fi', p), en = hae('en', p);
  if (typeof fi !== 'string') throw new Error('odotuslistan avain puuttuu fi:stä: ' + p);
  const sv = (vanhat[p] && typeof vanhat[p].sv === 'string') ? vanhat[p].sv : '';
  if (!vanhat[p]) uusia++;
  rivit[p] = { fi, en: typeof en === 'string' ? en : '', sv };
}
const osiot = Object.assign({}, nyk && nyk.osiot ? nyk.osiot : {});
osiot.tm_lang = {
  _konteksti: 'Pelaaja-app (lapsen kieli, U8–19), huoltajan app (Vanhempi), yleiset (ilmoitusrivit). Avain = pisteytetty polku tm_lang.js:ssä. en-arvo on apuna. Muuttujat {n}, {nimi}, {aika}, {pvm}, {jakso}, {alueet}, {sovellus}, {idoli}, {teema}, {a}, {b}, {pv} säilytetään täsmälleen. HTML (<b>…</b>) säilytetään sellaisenaan. Osa riveistä on lauseen paloja (esim. "kehittyy", "tänä jaksona — {alueet}. …") jotka liitetään muuhun tekstiin — säilytä alun/lopun välilyönnit ja välimerkit.',
  rivit,
};
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 2 Geminille',
  _pvm: (nyk && nyk._pvm) || new Date().toISOString().slice(0, 10),
  _tila: 'KESKEN — täydentyy sv-läpiajon PR-vaiheittain: PR 2 (perheet: Pelaaja_v7 + Vanhempi_v2 + ilmoitusrivit + ADAR-nimikanoni) ja PR 3 (Master: osio master_kartta) ovat mukana; PR 4 (VP, Seura, ADAR Pikakortti, Pelihavainto) lisäävät osioita. #892:n jäännökset (ts_otsikko, Klubb→Förening, "Kehityskaari (kausifokus)", VP×Master 110 yhtenäistettävää riviä) lisätään PR 3–4:ssä. Takaraja Gemini-erälle 20.10.2026.',
  _pohja: (nyk && nyk._pohja) || 'origin/main + feat/i18n-sv-perheet-pr2',
  _rivit_yhteensa: Object.values(osiot).reduce((s, o) => s + Object.keys(o.rivit || {}).length, 0),
  ohje_geminille: E1.ohje_geminille,
  termisto: E1.termisto,
  osiot,
  lib_adar_nimet: {
    _konteksti: 'ADAR-nimikanoni (PELAAJA/valmentaja) — kirjaston FI-avaimet (lib/tm_pelialy_yksilo.js tmAdarNimet). SAMA teksti kuin tm_lang.pelaaja.adar_nimi_pelaaja_* (käännä identtisesti). Pelaajan nimet näkyvät lapselle ja huoltajalle; valmentajan nimet VP/Master/pikakortti (PR 3–4). Käytä termistön ADAR-käännöksiä.',
    rivit: {
      adar_nimi_pelaaja_a: { fi: 'Havainnointi', sv: '' }, adar_nimi_pelaaja_d: { fi: 'Päätöksenteko', sv: '' }, adar_nimi_pelaaja_ac: { fi: 'Toteutus', sv: '' }, adar_nimi_pelaaja_r: { fi: 'Palautuminen', sv: '' },
      adar_nimi_valmentaja_a: { fi: 'Havainnointi', sv: '' }, adar_nimi_valmentaja_d: { fi: 'Päätös', sv: '' }, adar_nimi_valmentaja_ac: { fi: 'Toteutus', sv: '' }, adar_nimi_valmentaja_r: { fi: 'Palautuminen', sv: '' },
    },
  },
};
if (nyk && nyk.osiot && nyk.osiot.lib_adar_nimet) ulos.lib_adar_nimet = nyk.osiot.lib_adar_nimet;
// lib.rubriikit: kortin tasokuvaukset (Pelaaja_v7 _p7RubT → tmLibT, avain = fi-teksti sellaisenaan). Lähde: lib/tm_adar_rubriikki.js + lib/tm_kortti_rubriikit.js.
{
  const A = require('../lib/tm_adar_rubriikki.js'), K = require('../lib/tm_kortti_rubriikit.js');
  const tekstit = [];
  for (let t = 1; t <= 5; t++) { const a = A.alyTaso(t), f = K.fysTaso(t), p = K.psyTaso(t, null); [a, f, p].forEach((r) => { tekstit.push(r.nyt, r.askel); }); }
  ['inner_drive', 'coachability', 'resilience', 'focus', 'emotional_control'].forEach((k) => { const o = {}; o[k] = 3; tekstit.push(K.psyTaso(1, o).vahvuus); });
  const vanhatR = (nyk && nyk.osiot && nyk.osiot['lib.rubriikit'] && nyk.osiot['lib.rubriikit'].rivit) || {}, r = {};
  tekstit.forEach((fi) => { r[fi] = { fi, sv: (vanhatR[fi] && typeof vanhatR[fi].sv === 'string') ? vanhatR[fi].sv : '' }; });
  ulos.osiot['lib.rubriikit'] = { _konteksti: 'PELAAJA (lapsen kieli, U8–19): kortin tason kuvaukset ("Nyt" + "Seuraava askel") ja mielen vahvuuksien nimet. Avain = suomenkielinen teksti sellaisenaan (kirjasto tm_adar_rubriikki / tm_kortti_rubriikit). Emojit säilytetään. Lämmin, kannustava; ei tasolukuja, vertailua tai menettämisen kieltä.', rivit: r };
}
// lib.tm_kentta: Kenttä-komponentin kääntämättömät avaimet (t('fi-teksti') ilman karttariviä) — Pelaaja_v7 välittää _p7K1T:n; sv libikartasta.
{
  const src = fs.readFileSync(path.join(ROOT, 'lib/tm_kentta.js'), 'utf8');
  const avaimet = new Set();
  for (const m of src.matchAll(/\bt\('([^']+)'\)/g)) avaimet.add(m[1]);
  for (const k of ['ydinvahvuus', 'sinun vahvuutesi']) { if (!src.includes("'" + k + "'")) throw new Error('tm_kentta: avain poistunut lähteestä: ' + k); avaimet.add(k); }   // t(opts.rooli === 'henkilokunta' ? 'ydinvahvuus' : 'sinun vahvuutesi')
  const ot = src.match(/var OSA_TILA = \{([^}]*)\}/); if (ot) for (const m of ot[1].matchAll(/:\s*'([^']+)'/g)) avaimet.add(m[1]);
  const vanhatK = (nyk && nyk.osiot && nyk.osiot['lib.tm_kentta'] && nyk.osiot['lib.tm_kentta'].rivit) || {}, r = {};
  [...avaimet].forEach((fi) => { r[fi] = { fi, sv: (vanhatK[fi] && typeof vanhatK[fi].sv === 'string') ? vanhatK[fi].sv : '' }; });
  ulos.osiot['lib.tm_kentta'] = { _konteksti: 'PELAAJA + henkilökunta — Kenttä-komponentin tagit ja aria-label (pelikenttä = jalkapallokenttä, sv "plan"). Avain = suomenkielinen teksti sellaisenaan; lyhyet pienellä kirjoitetut tilasanat ("nyt", "ei vielä") ovat tag-tekstejä.', rivit: r };
}
// master_kartta (sv-läpiajo PR 3): Masterin masterT-avaimet ilman sv-riviä (avain = fi-teksti sellaisenaan → TM_MASTER_I18N.sv; vienti: scripts/i18n_vie_sv_era.cjs master_kartta).
{
  const { masterAvaimet } = require('../tools/i18n/master_avaimet.cjs');
  const vanhatM = (nyk && nyk.osiot && nyk.osiot.master_kartta && nyk.osiot.master_kartta.rivit) || {}, r = {};
  masterAvaimet(ROOT).puuttuu.forEach((fi) => { r[fi] = { fi, sv: (vanhatM[fi] && typeof vanhatM[fi].sv === 'string') ? vanhatM[fi].sv : '' }; });
  ulos.osiot.master_kartta = { _konteksti: 'HENKILÖKUNTA (Master = valmentajan työpöytä): käyttöliittymän tekstit, toastit, demosisältö (Tänään/Kalenteri/Kausi/Testit), jakson tilakoneen napit ja tilat. Avain = suomenkielinen teksti sellaisenaan (myös alku-/loppuvälilyönnit: osa on lauseen paloja, esim. " pelaajaa vahvistettu", "Seuraava fokus (" — käännä pala niin, että koodin liittämä jatko ("0)" , nimi, luku) toimii). {nimi}/{n}/{kirjain}/{yht} säilyvät täsmälleen. Asiallinen valmennuskieli; termistö kuten muissa osioissa.', rivit: r };
}
// lib_adar_nimet osioksi (samaan muotoon kuin muut osiot): osiot-objektiin
ulos.osiot.lib_adar_nimet = ulos.lib_adar_nimet; delete ulos.lib_adar_nimet;
ulos._rivit_yhteensa = Object.values(ulos.osiot).reduce((s, o) => s + Object.keys(o.rivit || {}).length, 0);
fs.writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n');
console.log('kirjoitettu ' + path.relative(ROOT, OUT) + ': tm_lang ' + Object.keys(rivit).length + ' riviä (uusia ' + uusia + '), yhteensä ' + ulos._rivit_yhteensa);
