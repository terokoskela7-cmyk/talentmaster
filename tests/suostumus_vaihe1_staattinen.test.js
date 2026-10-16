/**
 * Sibbo 1.11. · suostumuslomake vaihe 1 — staattinen markup tm_lang-reitille (suostumus.rek_*).
 * Lähde: TalentMaster_Rekisterointi_Suostumus.html:n runko oli kovakoodattua suomea, jota JS-skanneri ei lue → sv-tilassa sekakielinen ensinäkymä.
 * INVARIANTIT: (1) fi-pariteetti: rungon HTML ILMAN data-i18n*-attribuutteja on tavutarkasti sama kuin ennen reititystä (SHA-256 origin/main-versiosta)
 *   + jokaisen reititetyn elementin markup-teksti = fi-avaimen arvo (renderöity fi ei muutu) · (2) staattinen markup-skanneri: 0 reitittämätöntä näkyvää tekstiä ·
 *   (3) uudet avaimet fi+en+sv (sv = Geminin erä 55, vienti i18n_era55_vienti.test.js); lähetetty erä 55 pysyy sv tyhjänä, ei toistoa erien 53/54 kanssa · (4) skanneri purkaa negatiivitestillä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import { parse } from 'parse5';
import { skannaaMarkup } from '../tools/i18n/sv_staattinen_markup.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const log = console.log; console.log = (...a) => { if (!String(a[0]).startsWith('[TM Lang]')) log(...a); };
const L = require('../lib/tm_lang.js').TM_LANG;
console.log = log;
const ODOTUS = require('./tm_lang_sv_odotuslista.cjs');
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_Rekisterointi_Suostumus.html'), 'utf8');
const ERA55 = JSON.parse(readFileSync(join(__dir, '..', 'docs/i18n/sv_kaannoserae_55_gemini.json'), 'utf8'));

/* Rungon hajautus: <body> … viimeistä edeltävä inline-<script>, data-i18n*-attribuutit poistettuna. Vertailuarvo = origin/main (388c96f4) ennen reititystä. */
const RUNKO_FI_SHA256 = 'f988264399149be414ad34f59d4c0cf0add03942749be52be3d8b94a16e8deaf';
const runko = (src) => {
  const a = src.indexOf('<body>'), b = src.indexOf('<script>\nvar firebaseConfig');
  return muutokset(src.slice(a, b).replace(/ data-i18n(?:-tn|-pl|-al|-ti)?="[^"]*"/g, ''));
};
/* Sibbo-viimeistely 16.10.: tietosuojaikkunan KOLME tarkoituksellista fi-muutosta (Teron brief: väärä "ei siirretä EU:n ulkopuolelle" korjattu Liite 1:n mukaiseksi,
   90 pv:n poisto, tietosuojaselosteen osoite). Ne puretaan takaisin ennen hajautusta → todistaa ettei MIKÄÄN MUU sivun fi-teksti muuttunut. */
const SIJ_UUSI = 'Tiedot tallennetaan EU:ssa (Google Cloud, europe-west1). Tekoälyavustaja toimii EU:ssa (AWS, Tukholma). Sähköposti-ilmoitukset lähetetään SendGrid-palvelun kautta, jolloin vastaanottajan sähköpostiosoite käsitellään Yhdysvalloissa EU:n vakiosopimuslausekkeiden ja EU–US Data Privacy Frameworkin perusteella.';
const SIJ_VANHA = 'Google Firebase (EU-alue). Tietoja ei siirretä EU:n ulkopuolelle.';
function muutokset(h) {
  const poistot = [[' <span>Suostumuksen peruutuksen jälkeen tiedot poistetaan 90 päivän kuluessa.</span>', ''],
    ['\n      <p style="margin-top:8px"><strong style="color:var(--text)">Koko tietosuojaseloste:</strong> <span id="pm_tietosuoja_email" style="color:var(--teal)"></span></p>', ''], [SIJ_UUSI, SIJ_VANHA]];
  for (const [a, b] of poistot) { expect(h.split(a).length - 1, 'odotettu tarkoituksellinen muutos puuttuu: ' + a.slice(0, 50)).toBe(1); h = h.replace(a, b); }
  return h;
}
const sha = (s) => createHash('sha256').update(s).digest('hex');

const attr = (n, k) => (n.attrs || []).find((a) => a.name === k);
function reititetyt() {
  const ulos = [];
  (function kavele(n) {
    for (const [a, tyyppi] of [['data-i18n', 'koko'], ['data-i18n-tn', 'tn'], ['data-i18n-pl', 'placeholder'], ['data-i18n-al', 'aria-label']]) {
      const x = attr(n, a); if (!x) continue;
      let teksti;
      if (tyyppi === 'placeholder' || tyyppi === 'aria-label') teksti = attr(n, tyyppi).value;
      else if (tyyppi === 'tn') teksti = n.childNodes.find((c) => c.nodeName === '#text' && c.value.trim()).value.trim();
      else {
        expect(n.childNodes.filter((c) => c.nodeName !== '#text' && c.nodeName !== '#comment'), 'data-i18n-elementti ei saa sisältää lapsielementtejä (textContent tuhoaisi ne): ' + x.value).toEqual([]);
        teksti = n.childNodes.map((c) => c.value || '').join('').trim();
      }
      ulos.push({ avain: x.value, tyyppi, teksti });
    }
    (n.childNodes || []).forEach(kavele);
  })(parse(HTML));
  return ulos;
}
const REK = Object.keys(L.fi.suostumus).filter((k) => k.startsWith('rek_'));
const ERA56 = Object.keys(JSON.parse(readFileSync(join(__dir, '..', 'docs/i18n/sv_kaannoserae_56_gemini.json'), 'utf8')).osiot.tm_lang.rivit).map((k) => k.slice(10));   // Sibbo-viimeistely: tietosuojaikkunan muuttunut + uudet avaimet, sv vielä Teron tarkistuksessa

describe('fi-pariteetti — suomenkielinen sivu ei muutu sanaakaan', () => {
  it('rungon HTML (data-i18n* poistettuna, tietosuojaikkunan 3 tarkoituksellista muutosta purettuna) on tavutarkasti sama kuin origin/main ennen reititystä', () => {
    expect(sha(runko(HTML))).toBe(RUNKO_FI_SHA256);
  });
  it('jokaisen reititetyn elementin markup-teksti = fi-avaimen arvo (renderöity fi = lähde)', () => {
    const r = reititetyt(); expect(r.length).toBeGreaterThan(80);
    const eroaa = r.filter((x) => L.fi.suostumus[x.avain.replace(/^suostumus\./, '')] !== x.teksti).map((x) => x.avain + ' | ' + x.teksti);
    expect(eroaa).toEqual([]);
  });
  it('_rekKaanna käsittelee kaikki neljä reittiä (data-i18n, -tn, -pl, -al)', () => {
    for (const a of ['[data-i18n]', '[data-i18n-tn]', '[data-i18n-pl]', '[data-i18n-al]']) expect(HTML).toContain("querySelectorAll('" + a + "')");
  });
});

describe('staattinen markup-skanneri', () => {
  it('Rekisterointi_Suostumus.html: 0 reitittämätöntä näkyvää tekstiä (tekstisolmut, placeholder, aria-label, title)', () => {
    expect(skannaaMarkup(HTML)).toEqual([]);
  });
  it('skanneri nappaa reitittämättömän: teksti, placeholder, aria-label, <title>; hyväksyy reititetyn ja brändin', () => {
    const f = (b, h = '') => skannaaMarkup('<!DOCTYPE html><html><head>' + h + '</head><body>' + b + '</body></html>').map((x) => x.tyyppi + ':' + x.teksti);
    expect(f('<div>Seuraava</div>')).toEqual(['teksti:Seuraava']);
    expect(f('<input placeholder="esim. Pekka">')).toEqual(['placeholder:esim. Pekka']);
    expect(f('<select aria-label="Päivä"></select>')).toEqual(['aria-label:Päivä']);
    expect(f('', '<title>Rekisteröinti</title>')).toEqual(['teksti:Rekisteröinti']);
    expect(f('<div data-i18n="a.b">Seuraava</div><input placeholder="x y" data-i18n-pl="a.c"><label data-i18n-tn="a.d">Etunimi <span>*</span></label><div>TalentMaster™</div>')).toEqual([]);
    expect(f('<label data-i18n-tn="a.d">Etunimi <b>Lisäteksti</b></label>')).toEqual(['teksti:Lisäteksti']);   // -tn kattaa vain 1. tekstisolmun
  });
});

describe('avaimet fi+en+sv (erä 55 viety)', () => {
  it(REK.length + ' uutta suostumus.rek_*-avainta: fi ja en ei-tyhjinä, sv viety erästä 55 (Geminin palautus)', () => {
    expect(REK.length).toBe(61);   // 59 (vaihe 1) + 2 uutta (erä 56)
    for (const k of REK) { expect(L.fi.suostumus[k], k).toBeTruthy(); expect(L.en.suostumus[k], k).toBeTruthy(); expect(typeof L.sv.suostumus[k], 'sv ' + k).toBe('string'); }   // erät 55 + 56 viety
  });
  it('erä 55 palasi: yksikään rek_*-avain ei ole enää sv-odotuslistalla', () => {
    expect(REK.filter((k) => ODOTUS.includes('suostumus.' + k) && !ERA56.includes(k))).toEqual([]);
    expect(ERA56.filter((k) => ODOTUS.includes('suostumus.' + k))).toEqual([]);   // erä 56 palasi ja vietiin
  });
  it('lähetetty erä 55: rivit = rek_*-avaimet, sv tyhjä (lähetystiedosto säilyy sellaisenaan), konteksti + huom jokaisella rivillä', () => {
    const r = ERA55.osiot.tm_lang.rivit;
    expect(Object.keys(r).sort()).toEqual(REK.filter((k) => k !== 'rek_ts_sailytysaika_90pv' && k !== 'rek_ts_koko_otsikko').map((k) => 'suostumus.' + k).sort());   // erän 55 lähetys ennallaan; 2 avainta tullut vasta erässä 56
    for (const [k, x] of Object.entries(r)) { expect(x.sv, k).toBe(''); if (!ERA56.includes(k.slice(10))) { expect(x.fi, k).toBe(L.fi.suostumus[k.slice(10)]); expect(x.en, k).toBe(L.en.suostumus[k.slice(10)]); } expect(x.huom.length, k).toBeGreaterThan(15); }
    expect(ERA55._rivit_yhteensa).toBe(59); expect(ERA55.osiot.tm_lang._konteksti).toMatch(/huoltajan ensimmäinen näkymä/);
  });
  it('erä 55 ei toista erien 53 ja 54 rivejä', () => {
    const aiemmat = new Set();
    for (const f of ['sv_kaannoserae_53_gemini.json', 'sv_kaannoserae_54_gemini.json']) for (const o of Object.values(JSON.parse(readFileSync(join(__dir, '..', 'docs/i18n', f), 'utf8')).osiot)) for (const k of Object.keys(o.rivit)) aiemmat.add(k);
    expect(Object.keys(ERA55.osiot.tm_lang.rivit).filter((k) => aiemmat.has(k))).toEqual([]);
  });
});
