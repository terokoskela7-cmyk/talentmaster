/* sv-läpiajo PR 2 (perheet) + PR 3 (Master) — STAATTINEN PORTTI: Pelaaja_v7, Vanhempi_v2 ja Master_v16 eivät saa sisältää reitittämätöntä kovakoodattua suomenkielistä käyttäjätekstiä,
 * eivätkä reititinkutsut (T/t) saa osua paikalliseen T/t-muuttujaan (varjostus → TypeError/TDZ, jonka yksikkötestit helposti missaavat).
 * Skanneri: tools/i18n/sv_staattinen.mjs (acorn; sovelluksen inline-skriptit). Poikkeukset: tools/i18n/sv_staattinen_sallitut.json (perusteltu; demo/kuollut koodi/diagnostiikka).
 * Uusi suomi-merkkijono → reititä T()/t():n kautta (uusi avain tm_lang.js:ään fi+en, sv odotuslistalle → Gemini) TAI lisää sallittuihin perustelulla. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { skannaaHtml, varjostetutKutsut, lataaSallitut, onSallittu } from '../tools/i18n/sv_staattinen.mjs';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIVUT = ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html', 'TalentMaster_Master_v16.html'];   // PR 3: + Master (masterT-reititin)
const S = lataaSallitut();

describe.each(SIVUT)('%s — staattinen reititysportti', (sivu) => {
  const src = readFileSync(join(juuri, sivu), 'utf8');
  const { loydot, virheet } = skannaaHtml(src, sivu);
  it('inline-skriptit jäsentyvät (parse-virhe = skannaus sokea)', () => { expect(virheet).toEqual([]); });
  it('ei reitittämätöntä suomenkielistä käyttäjätekstiä (sallitut poislukien)', () => {
    const jaljella = loydot.filter((f) => !onSallittu(f, S)).map((f) => f.rivi + ' ' + f.renderoija + ' · ' + f.teksti.slice(0, 80));
    expect(jaljella, 'reitittämätöntä suomea — reititä T()/t():llä tai lisää tools/i18n/sv_staattinen_sallitut.json perustelulla').toEqual([]);
  });
  it('reititinkutsu ei osu paikalliseen T/t-muuttujaan (käytä aliaksia _pT/_pt)', () => {
    expect(varjostetutKutsut(src)).toEqual([]);
  });
  it('EI VACUOUS: skanneri löytää allowlistattuja (demo/kuollut koodi) tekstejä → portti todella lukee lähdettä', () => {
    expect(loydot.length).toBeGreaterThan(2);
    expect(loydot.some((f) => onSallittu(f, S))).toBe(true);
  });
});

describe('skanneri — negatiivitestit (portti punaisena kun sen kuuluu)', () => {
  const html = (js) => '<html><body><script>' + js + '</script></body></html>';
  it('reitittämätön suomi löytyy; sama teksti T():n sisällä ei', () => {
    const a = skannaaHtml(html("function r() { return '<div>Tallenna harjoitus tänään</div>'; }"), 'x.html').loydot;
    expect(a.length).toBeGreaterThan(0);
    const b = skannaaHtml(html("function r() { return '<div>' + T('tallenna') + '</div>'; }"), 'x.html').loydot;
    expect(b).toEqual([]);
  });
  it('varjostus: const T = … + T(\'avain\') samassa funktiossa löytyy; _pT ei', () => {
    expect(varjostetutKutsut(html("function f() { const T = window.TM_TESTIT; return T('avain'); }")).length).toBe(1);
    expect(varjostetutKutsut(html("function f() { const T = window.TM_TESTIT; return _pT('avain'); }")).length).toBe(0);
    expect(varjostetutKutsut(html("function f() { function g() { var t = 1; } return t('avain'); }")).length).toBe(0);   // sisäkkäisen funktion t ei varjosta ulompaa
  });
});
