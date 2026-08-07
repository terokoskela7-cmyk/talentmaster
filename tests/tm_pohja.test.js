/**
 * TalentMaster™ — tm_pohja.js (P1.2)
 * Itsekuvaava Excel-tuontipohja: sarakegenerointi mielivaltaisesta testilistasta + Meta-lehti (round-trip).
 * Kanoninen id-muoto = Excel PROTOKOLLAT (lin30m…). Katalogi/alustaherkkä-suodatus = Excel_Tuonti-inline (ei tässä).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { sarakkeetTestista, sarakkeetTesteista, metaLehtiAoa, lueMetaLehti, META_MARKER } = require('../lib/tm_pohja.js');

describe('sarakkeetTesteista — sarakegenerointi mielivaltaisesta testit[]:sta', () => {
  it('geneerinen aikatesti → N suoritussaraketta (arvo, yritys 1..N)', () => {
    const sar = sarakkeetTestista({ id: 'lin30m', nimi: 'Lineaarinopeus 30m', yksikko: 's', yritykset: 3 });
    expect(sar.map(s => s.header)).toEqual(['Lineaarinopeus30m_s_1', 'Lineaarinopeus30m_s_2', 'Lineaarinopeus30m_s_3']);
    expect(sar.every(s => s.testId === 'lin30m' && s.kind === 'arvo')).toBe(true);
    expect(sar.map(s => s.yritys)).toEqual([1, 2, 3]);
  });

  it('MAS → yksi sarake MAS_aika_(min,sek), kind arvo', () => {
    const sar = sarakkeetTestista({ id: 'mas', nimi: 'MAS-juoksutesti', yksikko: 'km/h', yritykset: 1 });
    expect(sar).toHaveLength(1);
    expect(sar[0]).toMatchObject({ header: 'MAS_aika_(min,sek)', testId: 'mas', kind: 'arvo', yritys: 1 });
  });

  it('kuljetus_laukaus → kl_raaka + kl_vahennys per suoritus', () => {
    const sar = sarakkeetTestista({ id: 'kuljetus_laukaus', nimi: 'Kuljetus-laukaus', yksikko: 's', yritykset: 2, lajiLogiikka: 'kuljetus_laukaus' });
    expect(sar.map(s => s.kind)).toEqual(['kl_raaka', 'kl_vahennys', 'kl_raaka', 'kl_vahennys']);
    expect(sar.every(s => s.testId === 'kuljetus_laukaus')).toBe(true);
  });

  it('pituuspotku → oikea + vasen (2+2)', () => {
    const sar = sarakkeetTestista({ id: 'pituuspotku', nimi: 'Pituuspotku', yksikko: 'm', yritykset: 4, lajiLogiikka: 'pituuspotku' });
    expect(sar.map(s => s.kind)).toEqual(['pp_oikea', 'pp_oikea', 'pp_vasen', 'pp_vasen']);
    expect(sar.map(s => s.header)).toEqual([
      'Pituuspotku_oikea_m_1', 'Pituuspotku_oikea_m_2', 'Pituuspotku_vasen_m_1', 'Pituuspotku_vasen_m_2'
    ]);
  });

  it('1-3p-yksikkö → _p-suffiksi', () => {
    const sar = sarakkeetTestista({ id: 'valakyykky', nimi: 'Valakyykky', yksikko: '1-3p', yritykset: 1 });
    expect(sar[0].header).toBe('Valakyykky_p_1');
  });

  it('tyhjä/virheellinen → []', () => {
    expect(sarakkeetTesteista([])).toEqual([]);
    expect(sarakkeetTestista(null)).toEqual([]);
    expect(sarakkeetTestista({ nimi: 'ei id:tä' })).toEqual([]);
  });

  it('koostaa useasta testistä generointijärjestyksessä', () => {
    const sar = sarakkeetTesteista([
      { id: 'lin30m', nimi: 'Lineaarinopeus 30m', yksikko: 's', yritykset: 2 },
      { id: 'mas', nimi: 'MAS-juoksutesti', yksikko: 'km/h', yritykset: 1 }
    ]);
    expect(sar.map(s => s.testId)).toEqual(['lin30m', 'lin30m', 'mas']);
  });
});

describe('Meta-lehti — round-trip (generointi ↔ luku)', () => {
  const testit = [
    { id: 'lin30m', nimi: 'Lineaarinopeus 30m', yksikko: 's', yritykset: 3 },
    { id: 'kuljetus_laukaus', nimi: 'Kuljetus-laukaus', yksikko: 's', yritykset: 2, lajiLogiikka: 'kuljetus_laukaus' },
    { id: 'mas', nimi: 'MAS-juoksutesti', yksikko: 'km/h', yritykset: 1 }
  ];

  it('metaLehtiAoa: marker + otsikkorivi + yksi rivi per sarake', () => {
    const sar = sarakkeetTesteista(testit);
    const aoa = metaLehtiAoa(sar, { lin30m: 's', kuljetus_laukaus: 's', mas: 'km/h' });
    expect(aoa[0][0]).toBe(META_MARKER);
    expect(aoa[1]).toEqual(['testId', 'header', 'kind', 'yritys', 'yksikko']);
    expect(aoa.length).toBe(2 + sar.length);
  });

  it('round-trip: jokainen generoitu otsikko palautuu samalle testId/kind/yritys:lle', () => {
    const sar = sarakkeetTesteista(testit);
    const back = lueMetaLehti(metaLehtiAoa(sar, {}));
    expect(Object.keys(back)).toHaveLength(sar.length);
    sar.forEach(s => {
      const m = back[s.header.toLowerCase()];
      expect(m).toBeTruthy();
      expect(m.testId).toBe(s.testId);
      expect(m.kind).toBe(s.kind);
      expect(m.yritys).toBe(s.yritys);
    });
  });

  it('lueMetaLehti: ei-TM-metalehti → null (vanhat pohjat → fallback vanhaan lukuun)', () => {
    expect(lueMetaLehti([['PalloID', 'Etunimi'], ['12345', 'Matti']])).toBeNull();
    expect(lueMetaLehti([])).toBeNull();
    expect(lueMetaLehti(null)).toBeNull();
  });

  it('lueMetaLehti: yksikkö säilyy + puuttuva yritys → 1', () => {
    const back = lueMetaLehti([
      [META_MARKER, 'v1'],
      ['testId', 'header', 'kind', 'yritys', 'yksikko'],
      ['mas', 'MAS_aika_(min,sek)', 'arvo', '', 'km/h']
    ]);
    expect(back['mas_aika_(min,sek)']).toMatchObject({ testId: 'mas', yritys: 1, yksikko: 'km/h' });
  });
});
