/* §7.22 — pelaajalle ja huoltajalle EI tasoon tai tieriin sidottua väriä (punainen/amber/teal ei kerro tasoa); tila kerrotaan sanoin; tmTasoVari vain henkilökunnalle. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const PEL = lue('TalentMaster_Pelaaja_v7.html'), VAN = lue('TalentMaster_Vanhempi_v2.html');
const pura = (s, tunniste) => { const i = s.indexOf(tunniste); let d = 0; for (let k = s.indexOf('{', i); k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}' && !--d) return s.slice(i, k + 1); } throw new Error('ei löydy ' + tunniste); };

describe('Pelaaja_v7 / Vanhempi_v2: ei tasoon sidottuja värejä', () => {
  it('_valmiusTila: sanat eri tiloille, väri AINA sama (ei punaista/amberia/tealia tason mukaan)', () => {
    const ctx = vm.createContext({ _tMittari: (k) => k }); vm.runInContext(pura(PEL, 'function _valmiusTila(') + '\nthis.f = _valmiusTila;', ctx);
    const r = [0, 10, 39, 40, 69, 70, 99].map((v) => ctx.f(v)); expect(new Set(r.map((x) => x.vari)).size).toBe(1); expect(r[0].vari).not.toMatch(/#|--red|--amber|--teal/);
    expect(new Set(r.map((x) => x.sana)).size).toBe(4);   // ei dataa · huolto · kehittyy · valmis — tila SANOIN
  });
  it('ei tier-/tasoväriä: _minaTierVari vakio; kehon valmiuden ketjupalkit samanväriset; osapalkit yksi väri; tm-profile ilman ampelia', () => {
    const ctx = vm.createContext({}); vm.runInContext(pura(PEL, 'function _minaTierVari(') + '\nthis.f = _minaTierVari;', ctx); expect(new Set(['elite', 'sharp', 'starter', 'x'].map((t) => ctx.f(t))).size).toBe(1);
    expect(PEL).not.toMatch(/c\.koodi===heikoin\.koodi\?'#E8A020'/); expect(PEL).not.toMatch(/o\.val >= 2 \? '#28B090' : '#E0A653'/); expect(PEL).not.toMatch(/F\.tier === 'elite' \? 'rgba\(224/);
    expect(lue('lib/tm-profile.js')).not.toMatch(/ampeli\s*[=:;]|'punainen'|'keltainen'/); const win = {}, c2 = vm.createContext({ window: win, self: win, globalThis: win }); vm.runInContext(lue('lib/tm-profile.js'), c2); const r = (win.TM || c2.TM).profile.laskeFLEIKokonaisindeksi({ flei: { kokonaisindeksi: 50 } }); expect(r).toEqual({ arvo: 50, lahde: 'flei' });
  });
  it('tmTasoVari / tmTasoCss / hhTasoVari / tkiVari / tmLuokkaCss eivät esiinny eikä libiä ladata (pelaaja + huoltaja)', () => {
    [['Pelaaja_v7', PEL], ['Vanhempi_v2', VAN]].forEach(([n, s]) => { expect(s, n).not.toContain('tm_tasovari.js'); expect(s, n).not.toMatch(/\btmTasoVari\b|\btmTasoCss\b|\bhhTasoVari\b|\btkiVari\b|\btmLuokkaCss\b|\btmTkiBandi\b/); });
  });
  it('Vanhempi_v2: ei tasoon sidottua väriä (hh_taso/tki/flei/valmius → teal/amber/red); mitalin väri (kulta/hopea/pronssi) on ansaittu merkki, ei tasoväri', () => {
    expect(VAN).not.toMatch(/(hh_taso|tki_viimeisin|flei_viimeisin)[^\n;]{0,80}\?\s*['"`]?(#[0-9A-Fa-f]{6}|var\(--(teal|amber|red))/);
    expect(VAN).toMatch(/merkkiVari = \{ kulta/);
  });
});
