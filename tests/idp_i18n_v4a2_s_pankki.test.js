/**
 * TalentMaster - i18n V4-A2: Pelaaja_v7:n inline S-pankki (HARJOITEPANKKI v5) + D-kortti-fallback sv.
 * S-kortti ("KOHDENNETTU KEHITYS", heikoin FLEI-ketju) + D-fallback hakevat sisältönsä Pelaaja_v7:ään
 * kovakoodatusta pankista + tm_why_lauseet.js:stä, EI harjoitelogiikasta → jäivät suomeksi sv-tilassa.
 * Käännös reititetään V4-A:n _hT-getterillä (HARJOITE_I18N.sv.pelaaja-alikartta).
 * INVARIANTIT: sv taydellinen reachable-joukolle - ei orpoja avaimia - fi ei rikkoudu - V4-A sisalto ehja.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const H = require('../harjoitelogiikka_v4.js');
const WL = require('../tm_why_lauseet.js').WHY_LAUSEET;
const PEL = readFileSync(join(__dir, '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');

// Extract window.PANKKI (S-pankki) from Pelaaja_v7.html + enumerate reachable player-visible strings.
function reachableS() {
  const lines = PEL.split('\n');
  let s = -1, e = -1;
  for (let i = 0; i < lines.length; i++) { if (lines[i].trim() === 'window.PANKKI = {') { s = i; break; } }
  for (let i = s; i < lines.length; i++) { if (lines[i].trim() === '};') { e = i; break; } }
  const block = lines.slice(s, e + 1).join('\n');
  const win = {};
  new Function('window', block)(win);
  const set = new Set();
  const push = (v) => { if (typeof v === 'string' && v.trim()) set.add(v); };
  Object.keys(win.PANKKI).forEach((ketju) => Object.keys(win.PANKKI[ketju]).forEach((stage) =>
    (win.PANKKI[ketju][stage] || []).forEach((h) => { push(h.nimi); push(h.kuvaus); })));
  // WHY_LAUSEET S (perustelu) + D (D-fallback)
  Object.keys(WL).forEach((ketju) => ['S', 'D'].forEach((ty) =>
    Object.keys(WL[ketju][ty]).forEach((st) => push(WL[ketju][ty][st]))));
  // S-kortin staattiset labelit
  ['Kohdennettu kehitys', 'Harjoite päivittyy'].forEach(push);
  // V4-A3: Bola Siempre (getTHarjoiteWhy TEHTAVAT, 21) — sama pelaaja-alikartta (jaettu namespace)
  const wlSrc = readFileSync(join(__dir, '..', 'tm_why_lauseet.js'), 'utf8').split('\n');
  const ts = wlSrc.findIndex((l) => l.trim().startsWith('const TEHTAVAT'));
  const te = wlSrc.findIndex((l, i) => i > ts && l.trim() === '};');
  const teh = eval('(' + wlSrc.slice(ts, te + 1).join('\n').replace(/^\s*const TEHTAVAT\s*=\s*/, '').replace(/;\s*$/, '') + ')');
  Object.keys(teh).forEach((st) => teh[st].forEach(push));
  return set;
}

function withLang(lang, fn) {
  const prev = global.tmNykyinenKieli;
  global.tmNykyinenKieli = () => lang;
  try { return fn(); } finally {
    if (prev === undefined) delete global.tmNykyinenKieli; else global.tmNykyinenKieli = prev;
  }
}

describe('HARJOITE_I18N.sv.pelaaja - S-pankki + D-fallback kattaa reachable-joukon', () => {
  const reachable = reachableS();
  it('reachable-joukko on odotetun kokoinen (130 pankki + 30 why + 2 labelia + 21 Bola Siempre = 183)', () => {
    expect(reachable.size).toBe(183);
  });
  it('sv.pelaaja: jokainen reachable fi-merkkijono on kaannetty (0 puuttuvaa)', () => {
    const map = H.HARJOITE_I18N.sv.pelaaja;
    const puuttuu = [];
    reachable.forEach((fi) => { if (typeof map[fi] !== 'string' || !map[fi].trim()) puuttuu.push(fi.slice(0, 40)); });
    expect(puuttuu).toEqual([]);
  });
  it('sv.pelaaja: ei orpoja avaimia (kaikki avaimet reachable-joukosta)', () => {
    const orvot = Object.keys(H.HARJOITE_I18N.sv.pelaaja).filter((k) => !reachable.has(k));
    expect(orvot).toEqual([]);
  });
});

describe('_hT reitittaa S-pankin (fi ei rikkoudu, sv lokalisoituu, molemmat kartat)', () => {
  it('fi (ei kielta) -> lahdeteksti', () => {
    expect(H._hT('Naruhypyt')).toBe('Naruhypyt');
    expect(H._hT('Kohdennettu kehitys')).toBe('Kohdennettu kehitys');
  });
  it('sv -> S-pankin nimi/kuvaus + why-S + why-D + label lokalisoituu', () => {
    withLang('sv', () => {
      expect(H._hT('Naruhypyt')).toBe('Hopprep');
      expect(H._hT('Vahva takapää juoksee pisimpään. Loppupeli on sen aikaa.'))
        .toBe('En stark bakdel springer längst. Slutet av matchen är dess tid.');
      expect(H._hT('Syvät lihakset pitävät ryhdin koko päivän.'))
        .toBe('De djupa musklerna håller hållningen hela dagen.');
      expect(H._hT('Kohdennettu kehitys')).toBe('Riktad utveckling');
      expect(H._hT('Harjoite päivittyy')).toBe('Övningen uppdateras');
    });
  });
  it('sv: V4-A sisalto (T-pankki) toimii yha samalla getterilla (ristikuormitus)', () => {
    withLang('sv', () => { expect(H._hT('Maestro — Pysäytys sisäterällä')).toBe('Maestro — Stopp med insidan'); });
  });
  it('sv: puuttuva avain -> fi', () => {
    withLang('sv', () => { expect(H._hT('EI OLE KARTASSA')).toBe('EI OLE KARTASSA'); });
  });
});

describe('V4-A invariantti ehja: sv.sisalto (harjoitelogiikan T-pankki) ei sisalla S-pankkia', () => {
  it('S-pankin nimi ei ole sisalto-kartassa (erilliset namespacet)', () => {
    expect(H.HARJOITE_I18N.sv.sisalto['Naruhypyt']).toBeUndefined();
    expect(H.HARJOITE_I18N.sv.pelaaja['Maestro — Pysäytys sisäterällä']).toBeUndefined();
  });
});

describe('Pelaaja_v7 kytkenta + cache-bust', () => {
  it('S-kortti kayttaa _L/_hT (nimi/kuvaus/lause/label)', () => {
    expect(PEL).toContain('const _L = (s)=> (typeof _hT === \'function\') ? _hT(s) : s;');
    expect(PEL).toContain('const sNimi = _L(ohj.sHarjoite?.nimi');
    expect(PEL).toContain("${_L('Kohdennettu kehitys')}");
    expect(PEL).toContain('+ _L(ohj.sHarjoite.kuvaus) +');
    expect(PEL).toContain('+ _L(sw.lause) +');
  });
  it('D-kortti-fallback kayttaa _L (nimi/dWhy/kuvaus)', () => {
    expect(PEL).toContain('_dKortti(ohj.tKetju, _L(ohj.tHarjoite.nimi), _L(dWhy), _L(ohj.tHarjoite.kuvaus || null))');
  });
  it('harjoitelogiikka_v4.js ?v>=11 + SW-cache >= v17', () => {
    expect(PEL).toMatch(/harjoitelogiikka_v4\.js\?v=(1[1-9]|[2-9]\d)/);
    expect(readFileSync(join(__dir, '..', 'sw_pelaaja.js'), 'utf8')).toMatch(/const CACHE = 'tm-pelaaja-v(1[7-9]|[2-9]\d)'/);
  });
});
