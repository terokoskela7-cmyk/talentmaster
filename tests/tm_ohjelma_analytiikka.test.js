// Vaihe 7.2b — per-ohjelma-analytiikka (lib/tm_ohjelma_analytiikka.js). Brief: docs/CODE_BRIEF_VAIHE7_2b_ANALYTIIKKA.md §1/§4.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { tmOhjelmaKooste } = require('../lib/tm_ohjelma_analytiikka.js');

// Apuri: rakenna historiarivi (suljettu jakso) ohjelmalla.
const rivi = (ohjelmaId, opts = {}) => Object.assign({
  ohjelma: ohjelmaId ? { ohjelma_id: ohjelmaId, ohjelma_versio: opts.versio || 1 } : null,
  delta_mitattu: opts.delta != null ? { muutos: opts.delta } : null,
  lasnaolo: opts.paikalla != null ? { paikalla: opts.paikalla, yhteensa: opts.yhteensa, tiedossa: opts.yhteensa } : null,
  tulos: opts.tulos || null, suljettu: '2026-06-01T00:00:00Z'
}, {});
const pelaaja = (phv, rivit) => ({ phv_tila: phv, jaksofokus_historia: rivit });

describe('tmOhjelmaKooste — perusteet', () => {
  it('0-pelaajaa / tuntematon ohjelma → siisti tyhjä', () => {
    expect(tmOhjelmaKooste('X', [])).toEqual({ n: 0, ka_delta: null, toteuma_pct: null,
      tulosjakauma: { parani: 0, ennallaan: 0, vaihda: 0 }, phv_erittely: {}, mitattu_n: 0, yhteensa_n: 0 });
    expect(tmOhjelmaKooste(null, [pelaaja('PRE', [rivi('A', { delta: 5 })])]).n).toBe(0);
    expect(tmOhjelmaKooste('EI_OLE', [pelaaja('PRE', [rivi('A', { delta: 5 })])]).n).toBe(0);
  });
  it('n = suljettujen jaksojen määrä ohjelma_id:llä (yli pelaajien)', () => {
    const k = tmOhjelmaKooste('A', [
      pelaaja('PRE', [rivi('A', { delta: 4 }), rivi('B', { delta: 9 })]),   // B ei lasketa
      pelaaja('PH', [rivi('A', { delta: 2 })])
    ]);
    expect(k.n).toBe(2);
    expect(k.yhteensa_n).toBe(2);
  });
});

describe('§29 — ka_delta VAIN mitatuista (prosessirehellisyys)', () => {
  it('ka_delta laskee vain delta_mitattu-riveiltä; mitattu_n/yhteensa_n erottelee', () => {
    const k = tmOhjelmaKooste('A', [
      pelaaja('PRE', [rivi('A', { delta: 4 }), rivi('A', {})]),   // 1 mitattu (4), 1 mittaamaton
      pelaaja('PRE', [rivi('A', { delta: 6 })])                    // 1 mitattu (6)
    ]);
    expect(k.n).toBe(3);
    expect(k.mitattu_n).toBe(2);
    expect(k.yhteensa_n).toBe(3);
    expect(k.ka_delta).toBe(5);   // (4+6)/2 — mittaamaton EI vedä keskiarvoa alas
  });
  it('kaikki mittaamattomia → ka_delta null, mitattu_n 0 (ei keksitä deltaa)', () => {
    const k = tmOhjelmaKooste('A', [pelaaja('PRE', [rivi('A', {}), rivi('A', {})])]);
    expect(k.ka_delta).toBeNull();
    expect(k.mitattu_n).toBe(0);
    expect(k.yhteensa_n).toBe(2);
  });
});

describe('toteuma-% + tulosjakauma', () => {
  it('toteuma_pct = ka(paikalla/yhteensa), vain läsnäolo-riveiltä', () => {
    const k = tmOhjelmaKooste('A', [
      pelaaja('PRE', [rivi('A', { paikalla: 8, yhteensa: 10 }), rivi('A', { paikalla: 6, yhteensa: 10 })]),  // 80%, 60%
      pelaaja('PRE', [rivi('A', {})])   // ei läsnäolodataa → ei mukana toteumassa
    ]);
    expect(k.toteuma_pct).toBe(70);   // (80+60)/2
  });
  it('tulosjakauma laskee parani/ennallaan/vaihda', () => {
    const k = tmOhjelmaKooste('A', [pelaaja('PRE', [
      rivi('A', { tulos: 'parani' }), rivi('A', { tulos: 'parani' }), rivi('A', { tulos: 'ennallaan' }), rivi('A', { tulos: 'vaihda' })
    ])]);
    expect(k.tulosjakauma).toEqual({ parani: 2, ennallaan: 1, vaihda: 1 });
  });
});

describe('PHV-erittely (mikä ohjelma toimii kenelle)', () => {
  it('ryhmittää PHV-vaiheittain pelaajan phv_tila:sta; ka_delta per vaihe vain mitatuista', () => {
    const k = tmOhjelmaKooste('A', [
      pelaaja('PRE', [rivi('A', { delta: 6 }), rivi('A', { delta: 4 })]),   // PRE: ka 5
      pelaaja('PH', [rivi('A', { delta: 1 }), rivi('A', {})])                // PH: ka 1, mitattu_n 1/2
    ]);
    expect(k.phv_erittely.PRE).toEqual({ n: 2, ka_delta: 5, mitattu_n: 2 });
    expect(k.phv_erittely.PH).toEqual({ n: 2, ka_delta: 1, mitattu_n: 1 });
  });
  it('phv_tila puuttuu → "tuntematon"-ryhmä (rivin oma phv_tila voittaa pelaajan)', () => {
    const k = tmOhjelmaKooste('A', [
      { jaksofokus_historia: [rivi('A', { delta: 3 })] },                         // ei phv_tila → tuntematon
      pelaaja('POST', [Object.assign(rivi('A', { delta: 2 }), { phv_tila: 'AN' })]) // rivin phv_tila AN voittaa pelaajan POST
    ]);
    expect(k.phv_erittely.tuntematon.n).toBe(1);
    expect(k.phv_erittely.AN.n).toBe(1);
    expect(k.phv_erittely.POST).toBeUndefined();
  });
});

describe('versiointi — ryhmittyy ohjelma_id:llä (ei versiolla)', () => {
  it('sama ohjelma_id eri versioilla lasketaan yhteen', () => {
    const k = tmOhjelmaKooste('A', [pelaaja('PRE', [
      rivi('A', { delta: 4, versio: 1 }), rivi('A', { delta: 6, versio: 2 })
    ])]);
    expect(k.n).toBe(2);
    expect(k.ka_delta).toBe(5);
  });
});
