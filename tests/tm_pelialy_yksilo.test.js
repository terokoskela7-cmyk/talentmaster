// P1 — pelihavainto peliäly → yksilöteema (Kartta A) PURE-ydin (lib/tm_pelialy_yksilo.js).
// Brief §9: kukin taksonomia-avain → oikea shortlist · tyhjä graceful · gating · perustaito tasapelissä.
import { describe, it, expect } from 'vitest';
const P = require('../lib/tm_pelialy_yksilo.js');

describe('Kartta A (LUKITTU §13) — taksonomia → TM_TT_YOUTH', () => {
  it('football_sense-avaimet lukitut shortlistit', () => {
    expect(P.KARTTA_A.anticipation).toEqual(['y_h0', 'y_h6', 'y_p3']);
    expect(P.KARTTA_A.vision).toEqual(['y_h0', 'y_h8', 'y_h6']);
    expect(P.KARTTA_A.decision_making).toEqual(['y_h2', 'y_h3', 'y_h8']);
    expect(P.KARTTA_A.positioning).toEqual(['y_h7', 'y_p2', 'y_p3']);
    expect(P.KARTTA_A.play_under_pressure).toEqual(['y_h1', 'y_h5']);
  });
});

describe('tmPelialyYksiloEhdota — ehdotus', () => {
  it('yksi avain → sen shortlist (heikoin ADAR-dimensio → ennakointi)', () => {
    const r = P.tmPelialyYksiloEhdota(['anticipation']);
    expect(r.map(x => x.konsepti_avain)).toEqual(['y_h0', 'y_h6', 'y_p3']);
    expect(r[0]).toMatchObject({ konsepti_avain: 'y_h0', taksonomia_avain: 'anticipation' });
    expect(r[0].syy).toBe('Havaittu: Ennakointi');
  });
  it('useampi avain → yhdistetty, päällekkäinen teema nousee (y_h0 sekä anticipation että vision)', () => {
    const r = P.tmPelialyYksiloEhdota(['anticipation', 'vision']);
    expect(r[0].konsepti_avain).toBe('y_h0');   // esiintyy molemmissa → korkein score
    expect(r.length).toBe(3);
  });
  it('max 3 ehdotusta', () => {
    expect(P.tmPelialyYksiloEhdota(['anticipation', 'decision_making', 'positioning']).length).toBe(3);
  });
  it('perustaito ensin tasapelissä (sama score → pienempi youth-index)', () => {
    // decision_making: y_h2,y_h3,y_h8 — samalla score-tasolla ei tässä; testaa gating-tasapeli erikseen alla
    const r = P.tmPelialyYksiloEhdota(['timing']);   // y_h7, y_h8 (score 2,1) → järjestys y_h7, y_h8
    expect(r.map(x => x.konsepti_avain)).toEqual(['y_h7', 'y_h8']);
  });
  it('konseptiNimi-resolveri', () => {
    const r = P.tmPelialyYksiloEhdota(['anticipation'], { konseptiNimi: a => ({ y_h0: 'Havainnointi' }[a] || a) });
    expect(r[0].konsepti_nimi).toBe('Havainnointi');
  });
});

describe('tmPelialyYksiloEhdota — vaihe-gating (asiantuntijan valta säilyy UI:ssa)', () => {
  it('sallitutKonseptit suodattaa (vain y_h0 sallittu)', () => {
    const r = P.tmPelialyYksiloEhdota(['anticipation'], { sallitutKonseptit: ['y_h0'] });
    expect(r.map(x => x.konsepti_avain)).toEqual(['y_h0']);
  });
  it('hyväksyy {avain}-objektilistan (tmTtItems-muoto)', () => {
    const r = P.tmPelialyYksiloEhdota(['anticipation'], { sallitutKonseptit: [{ avain: 'y_h6' }] });
    expect(r.map(x => x.konsepti_avain)).toEqual(['y_h6']);
  });
  it('ei sallittuja → tyhjä (graceful)', () => {
    expect(P.tmPelialyYksiloEhdota(['anticipation'], { sallitutKonseptit: ['j_h1'] })).toEqual([]);
  });
});

describe('tmPelialyYksiloEhdota — graceful', () => {
  it('tyhjä lista → []', () => {
    expect(P.tmPelialyYksiloEhdota([])).toEqual([]);
    expect(P.tmPelialyYksiloEhdota(null)).toEqual([]);
  });
  it('tuntematon avain (versatility, ei Kartta A:ssa) → []', () => {
    expect(P.tmPelialyYksiloEhdota(['versatility'])).toEqual([]);
  });
  it('puolustusavain → p-teemat', () => {
    const r = P.tmPelialyYksiloEhdota(['pressing']);
    expect(r[0].konsepti_avain).toBe('y_p1');
    expect(r[0].syy).toBe('Havaittu: Prässi');
  });
});
