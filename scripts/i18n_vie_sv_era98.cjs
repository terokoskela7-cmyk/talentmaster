#!/usr/bin/env node
/* sv-erä 98 (B12, PM 8.11.2026): Seurahallinnan 61 tekstiä → VIENTI koodiin. Kohde lib/tm_henkilosto_i18n.js (tmHT, avain = fi-teksti tai -malli).
   Lähde: docs/i18n/sv_kaannoserae_98_palautus.json (PM) ↔ docs/i18n/sv_kaannoserae_98_gemini.json (lähetetty erä, #1225). Kaista: Tero.
   Code EI kirjoita ruotsia (§0): jokainen kartan sv on PM:n rivi tai sen osa merkki merkiltä. Lukuja/nimiä sisältävät rivit viedään malleina:
   esimerkkiarvot (luvut, joukkueet, päivämäärät) korvataan paikkamerkeillä SAMOISSA kohdissa fi:ssä ja PM:n sv:ssä, ja malli tarkistetaan
   täyttämällä se takaisin: täytetty fi = rivin fi ja täytetty sv = PM:n sv. Jokaisen avaimen on löydyttävä koodista lainausmerkeissä (reititys).
   Idempotentti; virhe → mitään ei kirjoiteta. Ajo: node scripts/i18n_vie_sv_era98.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, lisaaKarttaan } = require('./i18n_vie_sv_era53_19.cjs');
const { lueKuori } = require('./kuoren_lahde.js');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_98_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_98_gemini.json';
const KARTTA = 'lib/tm_henkilosto_i18n.js', NIMI = 'TM_HENKILOSTO_I18N';
const LAHTEET = ['TalentMaster_Seura.html', 'lib/tm_kehitystilanne.js'];   // reititystarkistus (Seura = kuori + seura/-osat)
const OTSAKE = 'sv-käännöserä 98 (B12, PM 8.11.2026; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era98.cjs) — Seurahallinta';

/* Rivit, joita EI viedä suoraan (avain = rivin fi). Muut rivit: avain = fi, sv = PM:n sv. */
const ERIKOIS = {
  '4/4 pelaajaa': { malli: '{a}/{b} pelaajaa' },
  '4 pelaajaa ilman PalloID:tä': { malli: '{n} pelaajaa ilman PalloID:tä' },
  '🟡 Basprogram — 2 pelaajaa': { malli: '{otsikko} — {n} pelaajaa' },
  '0 / 0 tavoitetta raiteilla.': { malli: '{a} / {b} tavoitetta raiteilla.' },
  '0 / 0 tavoitetta raiteilla:': { malli: '{a} / {b} tavoitetta raiteilla:' },
  '0 / 0 tavoitetta raiteilla. 6 % pelaajista kehittyy fyysisesti.': { etu: '0 / 0 tavoitetta raiteilla.', malli: '{p} pelaajista kehittyy fyysisesti.' },
  'Kirjaa testikierros joukkueille QG P11 ja QG T15 – fyysisen kehityksen luku tarkentuu.': { malli: 'Kirjaa testikierros joukkueille {lista} ja {viim} – fyysisen kehityksen luku tarkentuu.' },
  'Kehitystilanne · koko vuosi 2026 · päivitetty 14.10.2026': { jako: ' · ', osat: [{}, { malli: 'koko vuosi {v}' }, { malli: 'päivitetty {pvm}' }] },
  '📨 Tuo pelaajat Excelistä': { tmLang: 'seura.tuo_pelaajat_excelista', etuliite: '📨 ' },   // _tk-reitti (tm_lang:n sv jo olemassa)
  'Jo Strand': { eiKaanneta: true },   // PM: testihenkilön nimi
  'PERUS': { koodissa: 'tmHT(taso.toUpperCase())' },   // talenttiTaso 'perus' isoilla (Talentit); avain tulee datasta, ei literaalina
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tayta = (t, v) => t.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
/* fi-malli + fi-rivi → arvot; arvot etsitään PM:n sv:stä samassa järjestyksessä → sv-malli. */
function johda(malli, fi, sv) {
  const nimet = [...malli.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const re = new RegExp('^' + esc(malli).replace(/\\\{(\w+)\\\}/g, '(.+?)') + '$'), m = re.exec(fi);
  if (!m) return { virhe: 'fi-malli ei vastaa riviä' };
  const v = {}; nimet.forEach((n, i) => { v[n] = m[i + 1]; });
  let svm = '', pos = 0;
  for (const n of nimet) { const i = sv.indexOf(v[n], pos); if (i < 0) return { virhe: 'arvoa "' + v[n] + '" ei löydy PM:n sv:stä' }; svm += sv.slice(pos, i) + '{' + n + '}'; pos = i + v[n].length; }
  svm += sv.slice(pos);
  if (tayta(malli, v) !== fi || tayta(svm, v) !== sv) return { virhe: 'malli ei täyty takaisin riviksi' };
  return { avain: malli, sv: svm };
}

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [], tmLang = [], eiKaanneta = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot, G = JSON.parse(lue(LAHETYS)).osiot;
  if (JSON.stringify(Object.keys(P)) !== '["seura"]' || JSON.stringify(Object.keys(G)) !== '["seura"]') return { virheet: ['osiot ≠ [seura]'], lisatty: 0, ohitettu, kirjoitettu: false };
  const PR = P.seura.rivit, GR = G.seura.rivit;
  if (JSON.stringify(Object.keys(PR).sort()) !== JSON.stringify(Object.keys(GR).sort())) virheet.push('avaimet ≠ lähetetty erä');
  const src = lue(KARTTA), ol = lataaSv(src, NIMI), common = lataaSv(lue('lib/tm_i18n_common.js'), 'TM_I18N_COMMON');
  const L = (() => { const sb = { window: {}, console: { log() {}, warn() {} }, localStorage: { getItem() { return null; }, setItem() {} }, navigator: { language: 'fi' }, document: { documentElement: {} } }; require('vm').createContext(sb); require('vm').runInContext(lue('lib/tm_lang.js'), sb); return sb.window.TM_LANG; })();
  const koodi = LAHTEET.map((f) => (f.endsWith('.html') ? lueKuori(f, juuri) : lue(f))).join('\n');
  const parit = [];
  for (const [k, r] of Object.entries(PR)) {
    const g = GR[k] || {}; if (r.fi !== k || g.fi !== k || g.sv !== '') { virheet.push(k + ': fi ≠ lähetetty erä'); continue; }
    const e = ERIKOIS[k] || {};
    if (e.eiKaanneta) { if (r.sv !== r.fi) virheet.push(k + ': "ei käännetä" mutta sv ≠ fi'); else eiKaanneta.push(k); continue; }
    if (e.tmLang) { const s = e.tmLang.split('.').reduce((o, x) => o && o[x], L.sv); if (e.etuliite + s !== r.sv) virheet.push(k + ': tm_lang ' + e.tmLang + ' ≠ PM:n sv'); else tmLang.push(k); continue; }
    if (e.jako) {
      const fo = k.split(e.jako), so = r.sv.split(e.jako); if (fo.length !== e.osat.length || so.length !== fo.length) { virheet.push(k + ': osien määrä eroaa'); continue; }
      fo.forEach((f, i) => { const o = e.osat[i]; if (o.malli) { const d = johda(o.malli, f, so[i]); if (d.virhe) virheet.push(k + ' [' + i + ']: ' + d.virhe); else parit.push([d.avain, d.sv, k]); } else parit.push([f, so[i], k]); });
      continue;
    }
    let fi = k, sv = r.sv;
    if (e.etu) {
      const etuSv = PR[e.etu] && PR[e.etu].sv; if (!fi.startsWith(e.etu + ' ') || !etuSv || !sv.startsWith(etuSv + ' ')) { virheet.push(k + ': etuosa ei täsmää riviin "' + e.etu + '"'); continue; }
      fi = fi.slice(e.etu.length + 1); sv = sv.slice(etuSv.length + 1);
    }
    if (e.malli) { const d = johda(e.malli, fi, sv); if (d.virhe) { virheet.push(k + ': ' + d.virhe); continue; } parit.push([d.avain, d.sv, k]); } else parit.push([fi, sv, k, e.koodissa]);
  }
  const uudet = [];
  for (const [avain, sv, rivi, kd] of parit) {
    const syy = sopii(avain, sv); if (syy) { virheet.push(rivi + ': ' + syy); continue; }
    if (kd ? !koodi.includes(kd) : (!koodi.includes("'" + avain + "'") && !koodi.includes('"' + avain + '"'))) { virheet.push(rivi + ': avainta "' + avain + '" ei reititetty koodissa'); continue; }
    if (typeof common[avain] === 'string') { if (common[avain] === sv) ohitettu.push(avain); else virheet.push(rivi + ': yhteinen kartta antaa eri sv:n (' + common[avain] + ')'); continue; }
    if (typeof ol[avain] === 'string') { if (ol[avain] === sv) ohitettu.push(avain); else virheet.push(rivi + ': jo kartassa eri sv:llä (' + ol[avain] + ')'); continue; }
    const sama = uudet.find(([x]) => x === avain); if (sama) { if (sama[1] !== sv) virheet.push(avain + ': kaksi eri sv:tä'); continue; }
    uudet.push([avain, sv]);
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  const uusi = uudet.length ? lisaaKarttaan(src, uudet, OTSAKE) : src, V = lataaSv(uusi, NIMI);
  for (const [k, sv] of uudet) if (V[k] !== sv) virheet.push('verifiointi: ' + k);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  const kirjoita = !!(opts.kirjoita && uudet.length); if (kirjoita) fs.writeFileSync(path.join(juuri, KARTTA), uusi);
  return { virheet, lisatty: uudet.length, ohitettu, tmLang, eiKaanneta, kirjoitettu: kirjoita, parit: parit.map(([a, s]) => [a, s]) };
}
module.exports = { vie, johda, tayta, ERIKOIS, PALAUTUS, LAHETYS };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify({ lisatty: t.lisatty, ohitettu: t.ohitettu, tmLang: t.tmLang, eiKaanneta: t.eiKaanneta, kirjoitettu: t.kirjoitettu }));
}
