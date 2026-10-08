/**
 * laskeD2Joustava — CHARACTERIZATION (8.10.2026): nykyinen käytös ENNEN prioriteettimuutosta (TKI → H-H → d2_taso). Kirjattu ennen muutosta (Teron päätös: lajikohtainen ensin).
 * Fixtuurit A–G, kaikki kutsukohdat kulkevat tämän funktion läpi: Master (8597, 9527, 9545, 9555, 9598, 9646, 9651), VP (13408, 13619 _pLvl, 15987), normit _tasoLvl
 * (→ valitseKohortti, laskeTaso3Osuus, isUnderdog). Muutoksessa tämän tiedoston odotusarvot päivitetään uuteen järjestykseen (git-historia näyttää eron).
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

describe('laskeD2Joustava — NYKYINEN prioriteetti TKI → H-H → d2_taso', () => {
  it.each([
    ['A', 2.7, 'tki'], ['B', 2.7, 'tki'], ['C', 2, 'hh'], ['D', 2.7, 'tki'], ['E', 4.5, 'tki'], ['G', 2.7, 'tki'],
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
  it('komposiitti max(d1,hh,d2_taso,joustava): E = 4.5 (TKI/20 voittaa lajitason 2.0)', () => { expect(['A', 'B', 'C', 'D', 'E', 'G'].map((k) => komposiitti(FIX[k]))).toEqual([3.6, 2.7, 2, 3.6, 4.5, 2.7]); });
  it('pelaajan D2 (Master dim=d2, histogrammi, kehityskaaren piste): A = 2.7 vaikka d2_taso 3.6', () => { expect(['A', 'B', 'C', 'D', 'E', 'G'].map((k) => r(k).taso)).toEqual([2.7, 2.7, 2, 2.7, 4.5, 2.7]); });
  it('alaviite "¹ TKI-pohjainen" (Master 9651): näkyy kun lähde = tki', () => { expect(['A', 'B', 'C', 'D', 'E', 'G'].map((k) => r(k).lahde === 'tki')).toEqual([true, true, false, true, true, true]); });
  it('VP Tavoitetaso/Tekniikka-kauha: TKI-asteikkoon (teknTki) kun lähde tki', () => { expect(['A', 'B', 'C', 'D', 'E', 'G'].map((k) => kauha(FIX[k]))).toEqual(['teknTki', 'teknTki', 'teknTaso', 'teknTki', 'teknTki', 'teknTki']); });
  it('_pLvl: TKI ≥ 60 → 3.5 -kartoitus (vain lähde tki): 59→2.95, 60→3.5, 80→3.5, 90→3.5', () => { expect([59, 60, 65, 80, 90].map((t) => pLvlD2({ tki_viimeisin: t }))).toEqual([2.95, 3.5, 3.5, 3.5, 3.5]); expect(pLvlD2(FIX.E)).toBe(3.5); });
});

describe('normit-konsumentit (_tasoLvl): valitseKohortti, laskeTaso3Osuus, isUnderdog', () => {
  const X = { id: 'x', joukkue: 'Testi P10', sukupuoli: 'M', d2_taso: 2.0, d2_lahde: 'tk', tki_viimeisin: 90, rae_kvartaali: 'Q4' };   // lajitaso 2.0, TKI 90
  const Y = { id: 'y', joukkue: 'Testi P10', sukupuoli: 'M', d2_taso: 3.5, d2_lahde: 'sm', rae_kvartaali: 'Q4' };
  it('valitseKohortti(paras): X (TKI/20 = 4.5) ohittaa Y:n (3.5)', () => { expect(N.valitseKohortti([Y, X], 'paras').map((p) => p.id)).toEqual(['x']); });
  it('laskeTaso3Osuus: molemmat ≥3 (X TKI:n takia)', () => { expect(N.laskeTaso3Osuus([X, Y])).toMatchObject({ n_arvioidut: 2, n_taso3: 2 }); });
  it('isUnderdog: X (Q4) on underdog TKI:n takia; "vain TKI 65" on underdog (65/20 = 3.3)', () => { expect(N.isUnderdog(X)).toBe(true); expect(N.isUnderdog({ rae_kvartaali: 'Q4', tki_viimeisin: 65, joukkue: 'Testi P10' })).toBe(true); });
});

describe('kutsukohdat lähdekoodissa (muutoksen vartija): 10 kutsua + normit', () => {
  const lasku = (src) => (src.match(/laskeD2Joustava\(/g) || []).length;
  it('Master 6 suoraa kutsua + 1 tasoFns-viittaus; VP 2 suoraa + 1 tasoFns-viittaus; normit _tasoLvl 1', () => {
    const MA = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html'), NO = lue('lib/tm_eerikkila_normit.js');
    expect(lasku(MA)).toBe(6); expect((MA.match(/_ksTasoFn\(laskeD2Joustava\)/g) || []).length).toBe(1);
    expect(lasku(VP)).toBe(2); expect((VP.match(/_ksTasoFn\(laskeD2Joustava\)/g) || []).length).toBe(1);
    expect(NO).toContain('laskeD2Joustava(p, isp.ika, isp.sp)');
  });
});
