/**
 * lib/tm_polun_tila.js — Polun tila + kolme kysymystä (VP Tänään). Honest-empty: tiedon puuttuessa "ei_tietoa", ei arvausta.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { tmPolunTila } = require('../lib/tm_polun_tila.js');
const JF = (o) => Object.assign({ konsepti_avain: 'y_h2', konsepti_nimi: 'X' }, o || {});
const kys = (t, a) => t.kysymykset.find((q) => q.avain === a);

describe('tmPolunTila', () => {
  it('tila: ei jaksoa eikä askelta → ei_tietoa; jakso → etenee; toimenpide → huomio; katselmus → katselmus', () => {
    expect(tmPolunTila({}, {}).tila).toBe('ei_tietoa');
    expect(tmPolunTila({ jaksofokus: JF() }, {}).tila).toBe('etenee');
    expect(tmPolunTila({ jaksofokus: JF() }, { askel: { avain: 'sitoumus', tila: 'toimenpide' } }).tila).toBe('huomio');
    expect(tmPolunTila({ jaksofokus: JF() }, { askel: { avain: 'review_myohassa', tila: 'toimenpide' } }).tila).toBe('katselmus');
    expect(tmPolunTila({ jaksofokus: JF() }, { askel: { avain: 'review_eraantymassa', tila: 'toimenpide' } }).tila).toBe('katselmus');
    expect(tmPolunTila({ jaksofokus: JF() }, { askel: { avain: 'yllapito', tila: 'hiljainen' } }).tila).toBe('etenee');
  });
  it('kolme kysymystä aina samassa järjestyksessä; ilman dataa kaikki "ei_tietoa" (ei keksittyjä lukuja)', () => {
    const t = tmPolunTila({ jaksofokus: JF() }, {});
    expect(t.kysymykset.map((q) => q.avain)).toEqual(['nakyyko_fokus', 'treenataanko', 'onko_mukana']);
    expect(t.kysymykset.every((q) => q.tieto === false && q.vastaus === 'ei_tietoa')).toBe(true);
  });
  it('Näkyykö fokus: vain jakson OMAN taidon osa-arviot; 3 = itsenäisesti', () => {
    const p = { jaksofokus: JF({ osa_arviot: { y_h2: { a: 3, b: 2, c: 3 }, muu: { x: 3 } } }) };
    expect(kys(tmPolunTila(p, {}), 'nakyyko_fokus')).toMatchObject({ tieto: true, n: 2, yht: 3 });
    expect(kys(tmPolunTila({ jaksofokus: JF({ osa_arviot: { muu: { x: 3 } } }) }, {}), 'nakyyko_fokus').tieto).toBe(false);
  });
  it('Treenataanko: blokit tehty/suunniteltu; suunniteltu 0 tai puuttuva → ei tietoa', () => {
    expect(kys(tmPolunTila({}, { blokit: { tehty: 2, suunniteltu: 5 } }), 'treenataanko')).toMatchObject({ tieto: true, n: 2, yht: 5 });
    expect(kys(tmPolunTila({}, { blokit: { tehty: 0, suunniteltu: 0 } }), 'treenataanko').tieto).toBe(false);
    expect(kys(tmPolunTila({}, { blokit: { tehty: '2' } }), 'treenataanko').tieto).toBe(false);
  });
  it('Onko mukana: sitoumus odottaa / vahvistettu (vain jos pvm olemassa) / muuten ei tietoa', () => {
    expect(kys(tmPolunTila({}, { sitoumusOdottaa: true }), 'onko_mukana').vastaus).toBe('sitoumus_odottaa');
    expect(kys(tmPolunTila({ idp_sitoumus_pvm: '2026-10-02' }, { sitoumusOdottaa: false }), 'onko_mukana')).toMatchObject({ vastaus: 'sitoumus_vahvistettu', pvm: '2026-10-02' });
    expect(kys(tmPolunTila({}, { sitoumusOdottaa: false }), 'onko_mukana').tieto).toBe(false);
    expect(kys(tmPolunTila({}, {}), 'onko_mukana').tieto).toBe(false);
  });
});
