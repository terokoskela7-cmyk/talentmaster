/**
 * laskeD2Joustava — prioriteetti LAJIKOHTAINEN ENSIN (Teron päätös 8.10.2026): d2_taso → H-H → TKI/20 viimeisenä varana.
 * Tämä tiedosto kirjattiin ensin CHARACTERIZATION-testinä nykyiselle käytökselle (TKI → H-H → d2_taso; edellinen commit) ja päivitettiin sitten uuteen järjestykseen (git-historia näyttää eron).
 * Fixtuurit A–G; kaikki kutsukohdat kulkevat tämän funktion läpi: Master (8597, 9527, 9545, 9555, 9598, 9646, 9651), VP (13408, 13619 _pLvl, 15987, _d2Lahde), normit _tasoLvl
 * (→ valitseKohortti, laskeTaso3Osuus, isUnderdog).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const N = require('../lib/tm_eerikkila_normit.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const HH = { syotto: 40, pujottelu: 40 };   // t3 2 ja 1 → (3+1)/2 = H-H-D2 2.0
const base = { joukkue: 'Testi P10', sukupuoli: 'M' };
const FIX = {
  A: Object.assign({}, base, { d2_taso: 3.6, d2_lahde: 'sm', tki_viimeisin: 54 }),                                  // P10-tyyppi
  B: Object.assign({}, base, { tki_viimeisin: 54 }),                                                                 // vain TKI
  C: Object.assign({}, base, { hh_viimeisin: HH }),                                                                  // vain H-H
  D: Object.assign({}, base, { d2_taso: 3.6, d2_lahde: 'sm', tki_viimeisin: 54, hh_viimeisin: HH }),                 // kaikki kolme
  E: Object.assign({}, base, { d2_taso: 2.0, d2_lahde: 'tk', tki_viimeisin: 90 }),                                   // lajitaso matala, TKI korkea
  G: Object.assign({}, base, { tki_viimeisin: 54, hh_viimeisin: HH }),                                               // TKI + H-H, ei d2_taso
};
const j = (p) => N.laskeD2Joustava(p, 10, 'M');

describe('laskeD2Joustava — UUSI prioriteetti d2_taso → H-H → TKI/20 (viimeisenä)', () => {
  it.each([
    ['A', 3.6, 'sm'], ['B', 2.7, 'tki'], ['C', 2, 'hh'], ['D', 3.6, 'sm'], ['E', 2, 'tk'], ['G', 2, 'hh'],
  ])('fixtuuri %s → taso %s, lähde %s', (k, taso, lahde) => { expect(j(FIX[k])).toMatchObject({ taso, lahde }); });
  it('tyhjä / null → null; d2_taso ilman muita → d2_taso (lähde d2_lahde, oletus sm)', () => {
    expect(j({})).toBeNull(); expect(N.laskeD2Joustava(null, 10, 'M')).toBeNull();
    expect(j({ d2_taso: 2.5, d2_lahde: 'sm' })).toMatchObject({ taso: 2.5, lahde: 'sm' }); expect(j({ d2_taso: 4 })).toMatchObject({ taso: 4, lahde: 'sm' });
  });
  it('H-H tarvitsee iän ja sukupuolen: ilman niitä H-H-haara ohitetaan', () => { expect(N.laskeD2Joustava(FIX.C, null, 'M')).toBeNull(); expect(N.laskeD2Joustava(FIX.C, 10, null)).toBeNull(); });
});

describe('kutsukohdat johdettuna funktion paluuarvosta (sama kaava kuin sovelluksissa)', () => {
  const r = (k) => j(FIX[k]);
  const komposiitti = (p) => { const d = N.laskeD2Joustava(p, 10, 'M'); const a = [p.d1_taso, p.hh_taso, p.d2_taso, d ? d.taso : null].filter((v) => v != null); return a.length ? Math.max(...a) : null; };   // Master _lvl / 9598, normit _tasoLvl
  const pLvlD2 = (p) => { const d = N.laskeD2Joustava(p, 10, 'M'); if (!d) return null; return d.lahde === 'tki' && p.tki_viimeisin != null ? (p.tki_viimeisin >= 60 ? 3.5 : p.tki_viimeisin / 20) : d.taso; };   // VP _pLvl
  const kauha = (p) => { const d = N.laskeD2Joustava(p, 10, 'M'); return !d ? '—' : (d.lahde === 'tki' && p.tki_viimeisin != null ? 'teknTki' : 'teknTaso'); };   // VP 13408
  it('komposiitti max(d1,hh,d2_taso,joustava): E = 2.0 (lajitaso; TKI/20 4.5 ei enää voita)', () => { expect(['A', 'B', 'C', 'D', 'E', 'G'].map((k) => komposiitti(FIX[k]))).toEqual([3.6, 2.7, 2, 3.6, 2, 2]); });
  it('pelaajan D2 (Master dim=d2, histogrammi, kehityskaaren piste): A = 3.6 (d2_taso), ei enää TKI/20 2.7', () => { expect(['A', 'B', 'C', 'D', 'E', 'G'].map((k) => r(k).taso)).toEqual([3.6, 2.7, 2, 3.6, 2, 2]); });
  it('alaviite "¹ TKI-pohjainen" (Master 9651): näkyy VAIN kun lähde = tki (vain TKI-pelaaja B)', () => { expect(['A', 'B', 'C', 'D', 'E', 'G'].map((k) => r(k).lahde === 'tki')).toEqual([false, true, false, false, false, false]); });
  it('VP Tavoitetaso/Tekniikka-kauha: TKI-asteikkoon (teknTki) VAIN kun lähde tki (B); muut tasoon', () => { expect(['A', 'B', 'C', 'D', 'E', 'G'].map((k) => kauha(FIX[k]))).toEqual(['teknTaso', 'teknTki', 'teknTaso', 'teknTaso', 'teknTaso', 'teknTaso']); });
  it('_pLvl: TKI ≥ 60 → 3.5 -kartoitus säilyy TKI-varalle (vain lähde tki): 59→2.95, 60→3.5, 80→3.5, 90→3.5', () => { expect([59, 60, 65, 80, 90].map((t) => pLvlD2({ tki_viimeisin: t }))).toEqual([2.95, 3.5, 3.5, 3.5, 3.5]); expect(pLvlD2(FIX.E)).toBe(2); expect(pLvlD2(FIX.A)).toBe(3.6); });   // 3.5-kartoitus jää TKI-VARALLE (lähde tki); lajitasolliselle pelaajalle d2_taso
});

describe('normit-konsumentit (_tasoLvl): valitseKohortti, laskeTaso3Osuus, isUnderdog', () => {
  const X = { id: 'x', joukkue: 'Testi P10', sukupuoli: 'M', d2_taso: 2.0, d2_lahde: 'tk', tki_viimeisin: 90, rae_kvartaali: 'Q4' };   // lajitaso 2.0, TKI 90
  const Y = { id: 'y', joukkue: 'Testi P10', sukupuoli: 'M', d2_taso: 3.5, d2_lahde: 'sm', rae_kvartaali: 'Q4' };
  it('valitseKohortti(paras): Y (lajitaso 3.5) voittaa X:n (lajitaso 2.0; TKI/20 4.5 ei enää nosta)', () => { expect(N.valitseKohortti([Y, X], 'paras').map((p) => p.id)).toEqual(['y']); });
  it('laskeTaso3Osuus: vain Y ≥3 (X lajitaso 2.0)', () => { expect(N.laskeTaso3Osuus([X, Y])).toMatchObject({ n_arvioidut: 2, n_taso3: 1 }); });
  it('isUnderdog: X (Q4, lajitaso 2.0) EI ole underdog TKI:n takia; Y on; "vain TKI 65" on yhä underdog (65/20 = 3.3, TKI-varalle)', () => { expect(N.isUnderdog(X)).toBe(false); expect(N.isUnderdog(Y)).toBe(true); expect(N.isUnderdog({ rae_kvartaali: 'Q4', tki_viimeisin: 65, joukkue: 'Testi P10' })).toBe(true); });
});

describe('kutsukohdat lähdekoodissa (muutoksen vartija): 10 kutsua + normit', () => {
  const lasku = (src) => (src.match(/laskeD2Joustava\(/g) || []).length;
  it('Master 0 suoraa kutsua (yksi totuus: D2-kortti/ponnahdus lasketaan libeistä tm_nakyma_ryhmat → tm_tekniikka; komposiitit _lvl/lvl käyttävät d2KomposiittiTaso:a, 4 → 0) + 1 tasoFns-viittaus; VP 2 suoraa + 1 tasoFns-viittaus; normit _tasoLvl 1', () => {
    const MA = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html'), NO = lue('lib/tm_eerikkila_normit.js');
    expect(lasku(MA)).toBe(0); expect((MA.match(/_ksTasoFn\(laskeD2Joustava\)/g) || []).length).toBe(1);
    expect(lasku(VP)).toBe(2); expect((VP.match(/_ksTasoFn\(laskeD2Joustava\)/g) || []).length).toBe(1);
    expect(NO).toContain('d2KomposiittiTaso(p, isp.ika, isp.sp)'); expect(NO).toMatch(/function d2KomposiittiTaso[\s\S]{0,400}laskeD2Joustava\(/);   // PR 3: _tasoLvl → d2KomposiittiTaso (joka kutsuu laskeD2Joustavaa)
  });
});

describe('yksi lähde: laskeD2Taso = laskeD2Joustava(...).taso; laskeD2Tulos; lähde-label täsmää lukuun', () => {
  const M = require('../lib/tm_mittarit.js');
  const AVAIMET = ['A', 'B', 'C', 'D', 'E', 'G'];
  it('laskeD2Taso(p, ika, sp) === laskeD2Joustava(p, ika, sp).taso kaikille fixtuureille (iällä+sukupuolella ja ilman)', () => {
    for (const k of AVAIMET) {
      const p = FIX[k]; const a = N.laskeD2Joustava(p, 10, 'M'), b = N.laskeD2Joustava(p, null, null);
      expect(M.laskeD2Taso(p, 10, 'M'), k).toBe(a ? a.taso : null); expect(M.laskeD2Taso(p), k).toBe(b ? b.taso : null); expect(M.laskeD2Tulos(p, 10, 'M')).toEqual(a);
    }
  });
  it('ilman ikää/sukupuolta H-H-haara ohitetaan (d2_taso → TKI): C → null, G → 2.7; laskeD2Taso pitää nykyisen käytöksen kutsujille jotka eivät anna ikää', () => { expect(M.laskeD2Taso(FIX.C)).toBeNull(); expect(M.laskeD2Taso(FIX.G)).toBe(2.7); expect(M.laskeD2Taso(FIX.B)).toBe(2.7); expect(M.laskeD2Taso(FIX.A)).toBe(3.6); });
  it('`.map(laskeD2Taso)` (indeksi, taulukko lisäargumentteina) ei vuoda H-H-haaraan', () => { expect([FIX.C, FIX.G, FIX.A].map(M.laskeD2Taso)).toEqual([null, 2.7, 3.6]); });
  it('null / tyhjä → null; ei heitä', () => { expect(M.laskeD2Taso(null)).toBeNull(); expect(M.laskeD2Taso({})).toBeNull(); expect(M.laskeD2Tulos(undefined)).toBeNull(); });
  it('VP _d2Lahde(p) käyttää samaa resolveria: P10-tyyppi (A, D) lähde sm — EI "tki" vaikka luku on d2_taso (aiempi virhemerkintä); B tki; C hh (iällä)', () => {
    const VP = lue('TalentMaster_VP_v25.html'), i = VP.indexOf('function _d2Lahde('), rivi = VP.slice(i, VP.indexOf('\n', i));
    const sb = { laskeD2Tulos: M.laskeD2Tulos }; require('vm').createContext(sb); require('vm').runInContext(rivi + '\nthis.f=_d2Lahde;', sb);
    expect(['A', 'D', 'E', 'B', 'G'].map((k) => sb.f(FIX[k]))).toEqual(['sm', 'sm', 'tk', 'tki', 'tki']);   // G ilman ikää → TKI (H-H-haara vaatii iän)
    expect(sb.f({ d2_taso: 3, d2_lahde: 'sm_pallo' })).toBe('sm'); expect(sb.f({})).toBeNull();
  });
  it('tmJoukkueD2: lähde laskeD2Tuloksesta (sm_pallo säilyy, tki vain varalle)', () => { expect(M.tmJoukkueD2([{ d2_taso: 3, d2_lahde: 'sm_pallo' }, { d2_taso: 3, d2_lahde: 'sm_pallo' }, { tki_viimeisin: 60 }])).toMatchObject({ lahde: 'sm_pallo', n: 3 }); });
});
