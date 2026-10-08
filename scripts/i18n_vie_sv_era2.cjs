#!/usr/bin/env node
/* sv-käännöserän 2 vienti koodiin (sv-läpiajo PR 5; Kaista: Tero). Lähde: docs/i18n/sv_kaannoserae_2.json (Gemini, PM tarkisti).
   Code EI kirjoita eikä muokkaa ruotsia (CLAUDE.md §0): jokainen sv-arvo kopioidaan JSONista merkki merkiltä; vienti VERIFIOIDAAN lataamalla kartat ja vertaamalla (ei vain kirjoittamalla).
   Ajo: node scripts/i18n_vie_sv_era2.cjs [--kuiva] [--era=polku]      Idempotentti: jo viety rivi (sama sv) ohitetaan; olemassa oleva ERI sv uudelle avaimelle → ei ylikirjoiteta, listataan.
   Osiot → kohde:
     tm_lang                       → lib/tm_lang.js sv-lohko (ryhmä.avain)
     lib_adar_nimet, lib.*         → lib/tm_lib_i18n.js sv (avain sellaisenaan; kirjaston FI-avain tai fi-teksti)
     vp_kartta / master_kartta     → lib/tm_vp_i18n.js / lib/tm_master_i18n.js sv (avain = fi-teksti)
     henkilosto_kartta             → lib/tm_henkilosto_i18n.js sv (avain = fi-teksti)
     jaannos.seura_forening        → KORVAA olemassa olevan sv:n (kohde tm_lang | vp | master | common) — vain jos nykyinen arvo = rivin nykyinen_sv
     jaannos.kausifokus            → KORVAA vp/master-kartan arvon (sama ehto)
     jaannos.vp_master             → KORVAA saman fi-avaimen sv:n sekä VP- että Master-kartassa (ehto: nykyiset = sv_vp / sv_master)
     termisto                      → docs/i18n/termisto.fi-sv.json: uudet termit tilalla "sovittu"
   Rivi joka ei sovi koodiin (paikkamerkit/HTML-tagit eroavat fi:stä, kohdetta tai nykyistä arvoa ei löydy, avain törmää eri sv:hen) EI mene karttaan: fi-fallback jää, rivi kirjataan
   docs/i18n/sv_era2_palautetaan.json:iin (→ PR:n kohta "palautetaan Geminille"). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const KUIVA = process.argv.includes('--kuiva');
const ERA = path.join(ROOT, arg('era', 'docs/i18n/sv_kaannoserae_2.json'));
const PALAUTUS = path.join(ROOT, 'docs/i18n/sv_era2_palautetaan.json');
const J = JSON.parse(fs.readFileSync(ERA, 'utf8'));
const lue = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const tallenna = {};   // tiedosto → uusi sisältö (kirjoitetaan lopuksi)
const src = (f) => (f in tallenna ? tallenna[f] : lue(f));
const aseta = (f, s) => { tallenna[f] = s; };
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028').replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029') + "'";
const R = { lisatty: {}, ohitettuJoViety: {}, korvattu: {}, palautetaan: [] };
const lisaa = (k, o, v) => { (R[k][o] = R[k][o] || []).push(v); };
const palauta = (osio, avain, syy) => R.palautetaan.push({ osio, avain, syy });
const rivit = (osio) => { const o = J.osiot[osio]; if (!o) throw new Error('osio puuttuu: ' + osio); return o.rivit; };

/* ── validointi: sv saa muuttaa vain sanat — paikkamerkit ja tagit pysyvät ── */
const joukko = (s, re) => (String(s).match(re) || []).sort().join('|');
const PAIKKA = /\{[A-Za-z0-9_]+\}/g, TAGI = /<\/?[a-zA-Z][a-zA-Z0-9]*/g;
function sopii(fi, sv) {
  if (typeof sv !== 'string' || !sv.trim()) return 'sv tyhjä';
  if (joukko(fi, PAIKKA) !== joukko(sv, PAIKKA)) return 'paikkamerkit eroavat (fi: ' + joukko(fi, PAIKKA) + ' ≠ sv: ' + joukko(sv, PAIKKA) + ')';
  if (joukko(fi, TAGI) !== joukko(sv, TAGI)) return 'HTML-tagit eroavat';
  return null;
}

/* ── kartan lataus (nykyinen sv-sisältö) vm:llä ── */
function lataaSvKartta(tiedosto, nimi) {
  const sb = { module: { exports: {} }, console, window: undefined };
  vm.createContext(sb);
  vm.runInContext(src(tiedosto) + '\n;this.__m = (typeof ' + nimi + ' !== "undefined") ? ' + nimi + ' : null;', sb);
  return (sb.__m && sb.__m.sv) || {};
}
const svLohko = (s) => { const a = s.indexOf('\n  sv: {'); const b = s.indexOf('\n  en: {', a); return [a, b]; };

/* ── 1. tm_lang ── */
function vieTmLang() {
  const f = 'lib/tm_lang.js'; let s = src(f);
  const Lsv = (() => { const sb = { module: { exports: {} }, console, window: undefined, localStorage: undefined, document: undefined }; vm.createContext(sb); vm.runInContext(s + '\n;this.__m = (typeof TM_LANG !== "undefined") ? TM_LANG : (module.exports.TM_LANG || null);', sb); return (sb.__m || {}).sv || {}; })();
  const [a, b] = svLohko(s); if (a < 0 || b < 0) throw new Error('tm_lang sv/en-lohkoa ei löydy');
  let sv = s.slice(a, b); const ryhmat = {};
  for (const [polku, r] of Object.entries(rivit('tm_lang'))) {
    const syy = sopii(r.fi, r.sv); if (syy) { palauta('tm_lang', polku, syy); continue; }
    const [g, k] = polku.split('.'); const ol = Lsv[g] && Lsv[g][k];
    if (typeof ol === 'string') { if (ol === r.sv) lisaa('ohitettuJoViety', 'tm_lang', polku); else palauta('tm_lang', polku, 'avain on jo koodissa eri sv:llä: "' + ol + '"'); continue; }
    (ryhmat[g] = ryhmat[g] || []).push([k, r.sv]);
  }
  for (const [g, lista] of Object.entries(ryhmat)) {
    const rs = lista.map(([k, x]) => '      ' + k + ': ' + q(x) + ',');
    const alku = sv.indexOf('\n    ' + g + ': {');
    if (alku >= 0) { const loppu = sv.indexOf('\n    },', alku); if (loppu < 0) throw new Error('ryhmän loppua ei löydy: ' + g); sv = sv.slice(0, loppu) + '\n' + rs.join('\n') + sv.slice(loppu); }
    else { const ennen = sv.indexOf('\n    pelaaja: {'); if (ennen < 0) throw new Error('pelaaja-ryhmää ei löydy'); sv = sv.slice(0, ennen) + '\n    ' + g + ': {\n' + rs.join('\n') + '\n    },\n' + sv.slice(ennen); }
    lista.forEach(([k]) => lisaa('lisatty', 'tm_lang', g + '.' + k));
  }
  aseta(f, s.slice(0, a) + sv + s.slice(b));
}

/* ── 2. lib/tm_lib_i18n.js (lisäys ennen mv_pohjat-lohkoa) ── */
const LIB_OSIOT = ['lib_adar_nimet', 'lib.rubriikit', 'lib.tm_kentta', 'lib.tm_adar_tekstit', 'lib.tm_pelihavainto_valinta', 'lib.tm_havaintohistoria', 'lib.tm_tanaan_signaali'];
function vieLib() {
  const f = 'lib/tm_lib_i18n.js'; let s = src(f);
  const ol = lataaSvKartta(f, 'TM_LIB_I18N'); const uudet = {}; const lahde = {};
  for (const osio of LIB_OSIOT) {
    for (const [avain, r] of Object.entries(rivit(osio))) {
      const syy = sopii(r.fi, r.sv); if (syy) { palauta(osio, avain, syy); continue; }
      if (typeof ol[avain] === 'string') { if (ol[avain] === r.sv) lisaa('ohitettuJoViety', 'lib', osio + ' :: ' + avain); else palauta(osio, avain, 'lib-avain on jo koodissa eri sv:llä'); continue; }
      if (avain in uudet) { if (uudet[avain] === r.sv) continue; palauta(osio, avain, 'lib-avain törmää osioon ' + lahde[avain] + ' eri sv:llä (' + uudet[avain] + ' ≠ ' + r.sv + ')'); continue; }
      uudet[avain] = r.sv; lahde[avain] = osio;
    }
  }
  const mark = '      // ── tm_mediaviesti.kysymyspohjat'; const i = s.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy tm_lib_i18n.js:stä');
  let blokki = '      // ── sv-käännöserä 2 (Gemini; docs/i18n/sv_kaannoserae_2.json; vienti scripts/i18n_vie_sv_era2.cjs) ──\n';
  for (const osio of LIB_OSIOT) { const ks = Object.keys(uudet).filter((k) => lahde[k] === osio); if (!ks.length) continue; blokki += '      // ' + osio + '\n' + ks.map((k) => '      ' + q(k) + ': ' + q(uudet[k]) + ',').join('\n') + '\n'; ks.forEach((k) => lisaa('lisatty', 'lib/tm_lib_i18n.js', osio + ' :: ' + k)); }
  aseta(f, s.slice(0, i) + blokki + s.slice(i));
}

/* ── 3. merkkijonokartat (avain = fi-teksti) ── */
function vieKartta(tiedosto, nimi, osio) {
  const common = lataaSvKartta('lib/tm_i18n_common.js', 'TM_I18N_COMMON'); const ol = lataaSvKartta(tiedosto, nimi); const lisattavat = [];
  for (const [fi, r] of Object.entries(rivit(osio))) {
    const syy = sopii(fi, r.sv); if (syy) { palauta(osio, fi, syy); continue; }
    if (typeof ol[fi] === 'string') { if (ol[fi] === r.sv) lisaa('ohitettuJoViety', osio, fi); else palauta(osio, fi, 'avain on jo kartassa eri sv:llä'); continue; }
    if (typeof common[fi] === 'string') { palauta(osio, fi, 'avain on lukitussa yhteisessä glossaarissa (common voittaa) — ei viedä'); continue; }
    lisattavat.push([fi, r.sv]);
  }
  let s = src(tiedosto); const [a, b] = svLohko(s); if (a < 0 || b < 0) throw new Error('sv/en-lohkoa ei löydy: ' + tiedosto);
  const loppu = s.lastIndexOf('\n  },', b); if (loppu < a) throw new Error('sv-lohkon loppua ei löydy: ' + tiedosto);
  const blokki = '\n    // ── sv-käännöserä 2 (Gemini; docs/i18n/sv_kaannoserae_2.json; osio ' + osio + '; vienti scripts/i18n_vie_sv_era2.cjs) ──\n' + lisattavat.map(([x, y]) => '    ' + q(x) + ': ' + q(y) + ',').join('\n');
  // jos sv-lohko on tyhjä ("sv: {\n  }") blokki menee suoraan sisään; muuten edellinen rivi päättyy pilkkuun (kartan konventio)
  aseta(tiedosto, s.slice(0, loppu) + blokki + s.slice(loppu));
  lisattavat.forEach(([x]) => lisaa('lisatty', tiedosto, osio + ' :: ' + x));
}

/* Lukitut sv-päätökset (tests/i18n_vaihe2_sv_kytkenta.test.js LUKITUT): aiemmin HYLÄTTYÄ muotoa ei palauteta kartaan, vaikka erän yhtenäistys sitä ehdottaisi → rivi palautetaan Geminille. */
const PURETUT_PAATOKSET = [{ fi: 'Mitattu', kielletty: 'Mätt' }, { fi: 'Viim. kirjaus', kielletty: 'Senaste anteckning' }, { fi: 'Lapsuus', kielletty: 'Barndom' }, { fi: 'Nuoruus', kielletty: 'Ungdom' }, { fi: '✓ Tulossa', kielletty: '✓ Kommer' }];
const rikkooLukituksen = (fi, sv) => PURETUT_PAATOKSET.find((x) => x.fi === fi && x.kielletty === sv);

/* ── 4. korvaukset (jaannos.*) ── */
const KARTTA_TIEDOSTO = { vp: ['lib/tm_vp_i18n.js', 'TM_VP_I18N'], master: ['lib/tm_master_i18n.js', 'TM_MASTER_I18N'], common: ['lib/tm_i18n_common.js', 'TM_I18N_COMMON'] };
function korvaaKartassa(kohde, fi, vanha, uusi, osio, avain) {
  const [f, nimi] = KARTTA_TIEDOSTO[kohde]; const ol = lataaSvKartta(f, nimi);
  if (ol[fi] === uusi) { lisaa('ohitettuJoViety', osio, avain + ' [' + kohde + ']'); return true; }
  if (ol[fi] !== vanha) { palauta(osio, avain, kohde + '-kartan nykyinen arvo ei vastaa erän viitettä (koodissa: ' + JSON.stringify(ol[fi]) + ')'); return false; }
  const s = src(f); const [a, b] = svLohko(s); const rivi = q(fi) + ': ' + q(vanha);
  const lohko = s.slice(a, b); const n = lohko.split(rivi).length - 1;
  if (n !== 1) { palauta(osio, avain, kohde + ': rivin lähdemuoto ei löydy täsmälleen kerran (' + n + ' osumaa) — korvaus jätetty tekemättä'); return false; }
  aseta(f, s.slice(0, a) + lohko.replace(rivi, () => q(fi) + ': ' + q(uusi)) + s.slice(b));
  lisaa('korvattu', osio, avain + ' [' + kohde + ']'); return true;
}
function korvaaTmLang(polku, vanha, uusi, osio, avain) {
  const f = 'lib/tm_lang.js'; const s = src(f); const [a, b] = svLohko(s); const osat = polku.split('.'); const g = osat[0], k = osat[osat.length - 1];
  const lohko = s.slice(a, b); const ga = lohko.indexOf('\n    ' + g + ': {'); const gb = ga < 0 ? -1 : lohko.indexOf('\n    },', ga);
  if (ga < 0 || gb < 0) { palauta(osio, avain, 'tm_lang-ryhmää ei löydy: ' + g); return false; }
  const ryhma = lohko.slice(ga, gb); const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reVanha = new RegExp('(\\n\\s+' + esc(k) + ':\\s*)' + esc(q(vanha)) + '(,)', 'g'), reUusi = new RegExp('(\\n\\s+' + esc(k) + ':\\s*)' + esc(q(uusi)) + '(,)', 'g');
  if ((ryhma.match(reUusi) || []).length === 1 && !(ryhma.match(reVanha) || []).length) { lisaa('ohitettuJoViety', osio, avain); return true; }
  const n = (ryhma.match(reVanha) || []).length;
  if (n !== 1) { palauta(osio, avain, 'tm_lang: rivin lähdemuoto ei löydy täsmälleen kerran (' + n + ' osumaa) — korvaus jätetty tekemättä'); return false; }
  aseta(f, s.slice(0, a) + lohko.slice(0, ga) + ryhma.replace(reVanha, (m, p1, p2) => p1 + q(uusi) + p2) + lohko.slice(gb) + s.slice(b));
  lisaa('korvattu', osio, avain); return true;
}
function vieJaannokset() {
  for (const osio of ['jaannos.seura_forening', 'jaannos.kausifokus']) {
    for (const [avain, r] of Object.entries(rivit(osio))) {
      const syy = sopii(r.fi, r.sv); if (syy) { palauta(osio, avain, syy); continue; }
      if (r.kohde === 'tm_lang') korvaaTmLang(r.polku, r.nykyinen_sv, r.sv, osio, avain);
      else if (KARTTA_TIEDOSTO[r.kohde]) korvaaKartassa(r.kohde, r.fi, r.nykyinen_sv, r.sv, osio, avain);
      else palauta(osio, avain, 'tuntematon kohde: ' + r.kohde);
    }
  }
  for (const [fi, r] of Object.entries(rivit('jaannos.vp_master'))) {
    const syy = sopii(fi, r.sv); if (syy) { palauta('jaannos.vp_master', fi, syy); continue; }
    if (rikkooLukituksen(fi, r.sv)) { palauta('jaannos.vp_master', fi, 'erän yhtenäistys ("' + r.sv + '") palauttaisi aiemmin hylätyn muodon — rikkoo lukitun päätöksen (tests/i18n_vaihe2_sv_kytkenta); VP/Master jäävät ennalleen'); continue; }
    korvaaKartassa('vp', fi, r.sv_vp, r.sv, 'jaannos.vp_master', fi);
    korvaaKartassa('master', fi, r.sv_master, r.sv, 'jaannos.vp_master', fi);
  }
}

/* ── 5. termistö ── */
function vieTermisto() {
  const f = 'docs/i18n/termisto.fi-sv.json'; const T = JSON.parse(src(f));
  const termit = Array.isArray(T.termit) ? T.termit : Object.values(T.termit);
  const olemassa = new Map(termit.map((t) => [t.fi, t]));
  const eraTermit = Object.entries(J.termisto.kaannettava || {}).filter(([fi]) => ['Havainnointi', 'Päätös / Päätöksenteko', 'Toteutus', 'Palautuminen', 'Pelihavainto', 'Otteluhavainnointi', 'Ottelutarkkailu'].includes(fi));
  for (const [fi, x] of eraTermit) {
    if (!x.sv) { palauta('termisto', fi, 'sv tyhjä'); continue; }
    const ol = olemassa.get(fi);
    if (ol) { if (ol.kaannokset && ol.kaannokset.sv === x.sv) { if (ol.tila !== 'sovittu') ol.tila = 'sovittu'; lisaa('ohitettuJoViety', 'termisto', fi); } else palauta('termisto', fi, 'termi on jo eri sv:llä'); continue; }
    const uusi = { fi, kaannokset: { sv: x.sv }, tila: 'sovittu', lahteet: ['sv_kaannoserae_2'] };
    if (x._huom) uusi.huom = x._huom;
    if (Array.isArray(T.termit)) T.termit.push(uusi); else T.termit[String(Object.keys(T.termit).length)] = uusi;
    lisaa('lisatty', 'termisto', fi);
  }
  T.paivitetty = (J._pvm || T.paivitetty);
  aseta(f, JSON.stringify(T, null, 1) + '\n');
}

vieTmLang();
vieLib();
vieKartta('lib/tm_vp_i18n.js', 'TM_VP_I18N', 'vp_kartta');
vieKartta('lib/tm_master_i18n.js', 'TM_MASTER_I18N', 'master_kartta');
vieKartta('lib/tm_henkilosto_i18n.js', 'TM_HENKILOSTO_I18N', 'henkilosto_kartta');
vieJaannokset();
vieTermisto();

if (!KUIVA) {
  for (const [f, s] of Object.entries(tallenna)) fs.writeFileSync(path.join(ROOT, f), s);
  fs.writeFileSync(PALAUTUS, JSON.stringify({ _kuvaus: 'Rivit jotka eivät sovi koodiin (scripts/i18n_vie_sv_era2.cjs): EI viety karttaan, fi-fallback jää. Palautetaan Geminille.', _era: path.relative(ROOT, ERA), rivit: R.palautetaan }, null, 1) + '\n');
}
if (KUIVA) console.error(JSON.stringify(R.palautetaan,null,1));
const tiiv = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.length]));
console.log(JSON.stringify({ kuiva: KUIVA, lisatty: tiiv(R.lisatty), korvattu: tiiv(R.korvattu), ohitettuJoViety: tiiv(R.ohitettuJoViety), palautetaan: R.palautetaan.length, muutetutTiedostot: Object.keys(tallenna) }, null, 1));
if (R.palautetaan.length) console.error('PALAUTETAAN GEMINILLE: ' + R.palautetaan.length + ' riviä → ' + path.relative(ROOT, PALAUTUS));
