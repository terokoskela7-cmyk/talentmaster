/* Pelaajakortin kielivuodot (16.10.): unelma-rivin hahmonimet/teemat lib-kartan kautta (_p7K1T), pelipaikkakoodit POS-kartan kautta. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const P = readFileSync(new URL('../TalentMaster_Pelaaja_v7.html', import.meta.url), 'utf8');
const L = require('../lib/tm_lang.js').TM_LANG, MC = (() => { require('../lib/tm-microcycles.js'); const m = require('../lib/tm-microcycles.js'); return (m.TM && m.TM.microcycles) || (globalThis.TM && globalThis.TM.microcycles) || {}; })();
const E59 = JSON.parse(readFileSync(new URL('../docs/i18n/sv_kaannoserae_59_gemini.json', import.meta.url), 'utf8')).osiot;
const pura = (tunniste) => { const a = P.indexOf(tunniste); let d = 0; for (let j = P.indexOf('{', a); j < P.length; j++) { if (P[j] === '{') d++; else if (P[j] === '}' && !--d) return P.slice(a, j + 1); } throw new Error(tunniste); };
const avainOsa = P.slice(P.indexOf('const _P7_POS_AVAIN'), P.indexOf('const _P7_POS_AVAIN') + 400).split('\n')[0];
function paikka(kieli) {
  const T = (k) => L[kieli].pelaaja[k];
  // eslint-disable-next-line no-new-func
  return new Function('T', 'window', '_p7Kieli', avainOsa + '\n' + pura('function _p7PosKartta()') + '\n' + pura('function _p7PaikkaNimi(v)') + '\nreturn _p7PaikkaNimi;')(T, { TM_LANG: L }, () => kieli);
}
describe('pelipaikka: POS-kartta, kielen mukainen kokonimi', () => {
  it('lyhenne ja suomenkielinen kokonimi (tallennusmuoto) → sv-nimi sv-tilassa; fi-tilassa arvo sellaisenaan (fi-ulkoasu ennallaan)', () => {
    const sv = paikka('sv'), fi = paikka('fi');
    expect(sv('KH')).toBe('Centerforward'); expect(sv('Laitahyökkääjä')).toBe('Ytter'); expect(sv('MV')).toBe('Målvakt'); expect(sv('LP')).toBe('Ytterback');
    expect(fi('KH')).toBe('KH'); expect(fi('Laitahyökkääjä')).toBe('Laitahyökkääjä'); expect(fi('LP')).toBe('LP');   // fi: arvo kuten ennen
    expect(sv('')).toBe(''); expect(sv('Joku Outo')).toBe('Joku Outo');   // tuntematon sellaisenaan
  });
  it('kaikilla yhdeksällä lyhenteellä sv-arvo (tm_lang), ei suomea', () => {
    const sv = paikka('sv');
    for (const k of ['KH', 'H', 'HM', 'KK', 'KP', 'LP', 'LH', 'MV', 'P']) { expect(sv(k), k).toBeTruthy(); expect(sv(k), k).not.toBe(L.fi.pelaaja[{ KH:'keskushyokkaaja', H:'hyokkaaja', HM:'hyokkaava_keskik', KK:'keskikentta', KP:'keskuspuolustaja', LP:'laitapuolustaja', LH:'laitahyokkaaja', MV:'maalivahti', P:'puolustaja' }[k]]); }
  });
  it('kortin pelipaikkatekstit eivät tulosta p.pelipaikka raakana: pill, namesub, kokoelmakortti, Kortti-välilehti; POS käyttää yhteistä karttaa', () => {
    expect(P).toMatch(/<div class="fc-pill">⚡ ' \+ _thEsc\(_p7PaikkaNimi\(p\.pelipaikka\)\)/);
    expect(P).toMatch(/naytaPaikka \? _thEsc\(_p7PaikkaNimi\(p\.pelipaikka\)\) : T\('pelaa_joka_paikassa'\)/);
    expect(P).toMatch(/'⚡ ' \+ esc\(_p7PaikkaNimi\(p\.pelipaikka\)\)/);
    expect(P).toMatch(/const paikka = _thEsc\(_p7PaikkaNimi\(p\?\.pelipaikka \|\| ''\)\)/);
    expect(P).toContain('const POS = _p7PosKartta();');
    expect(P).not.toMatch(/'⚡ ' \+ (esc\()?p\.pelipaikka|naytaPaikka \? p\.pelipaikka/);
  });
});
describe('unelma-rivi: IDOLIT-nimet + NIMIKKO_VIIKOT-teemat lib-kartan kautta', () => {
  it('Pelaaja_v7 reitittää idolin ja teeman _p7K1T:llä (kortti + PIN-näkymä)', () => {
    expect(P).toMatch(/idoli = _p7K1T\(idoli\); idolTeema = _p7K1T\(idolTeema\);/); expect(P).toMatch(/idolNimi = _p7K1T\(idolNimi\); idolTeema = _p7K1T\(idolTeema\);/);
  });
  it('erä 59 kattaa jokaisen koodin suomenkielisen hahmonimen ja teeman; hahmonimet Maestro/Shadowstep/Railgun/Titan eivät ole erässä', () => {
    const rivit = E59['lib.pelaajakortti_unelma'].rivit, fi = new Set(Object.keys(rivit));
    const nimet = new Set(Object.values(MC.IDOLIT || {}).map((i) => (i.etunimi + ' ' + (i.sukunimi || '')).trim()));
    const teemat = new Set((MC.NIMIKKO_VIIKOT || []).map((v) => v.teema));
    expect(nimet.size).toBeGreaterThan(5); expect(teemat.size).toBe(8);
    for (const t of teemat) expect(fi.has(t), 'teema ' + t).toBe(true);
    for (const n of ['Viimeistelijä', 'Velho', 'Arkkitehti']) { expect(nimet.has(n), n).toBe(true); expect(fi.has(n), n).toBe(true); }
    for (const n of ['Maestro', 'Shadowstep', 'Railgun', 'Titan']) expect(fi.has(n), n).toBe(false);
    for (const [k, r] of Object.entries(rivit)) { expect(r.fi, k).toBe(k); expect(r.sv, k).toBe(''); }
  });
});
