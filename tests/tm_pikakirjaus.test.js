/**
 * TalentMaster™ — tm_testikatalogi.js + tm_pikakirjaus.js (P2.1)
 * Jaettu testikatalogi + Pikakirjaus-lomakkeen PUHTAAT osat (tulokset-rakennus, testitulos-payload, upsert-doc-id,
 * testipäivä → normiIka/*_pvm, historia). Modaali-DOM ei tässä (live-verifiointi selaimessa).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const K = require('../lib/tm_testikatalogi.js');
// tm_pikakirjaus lukee TM_TESTIKATALOGI + TM_PIKAKENTAT + tm_historia globaaleina → aseta ne.
beforeAll(() => {
  globalThis.TM_TESTIKATALOGI = K;
  globalThis.TM_PIKAKENTAT = require('../lib/tm_pikakentat.js');
  const H = require('../lib/tm_historia.js');
  globalThis.tmHhSnapshot = H.tmHhSnapshot; globalThis.tmTkiSnapshot = H.tmTkiSnapshot; globalThis.tmHistoriaLisaa = H.tmHistoriaLisaa;
});
const F = () => require('../lib/tm_pikakirjaus.js');

describe('tm_testikatalogi — jaettu katalogi', () => {
  it('esitäytöt kattavat oikeat testId:t (pohjaSarakkeet-pariteetti)', () => {
    expect(K.tmProtoEsitaytto('hh_suppea')).toEqual(['lin30m', 'hyppy_cj', 'mas', 'sm_juoksu', 'sm_pallo']);
    expect(K.tmProtoEsitaytto('tekniikkakilpailu')).toContain('kuljetus_laukaus');
    expect(K.tmProtoEsitaytto('tuntematon')).toEqual([]);
  });
  it('libInputKey: vain lin-splitit eroavat (Excel-id → Testaus_v9 field-id)', () => {
    expect(K.tmLibInputKey('lin30m')).toBe('lin_30m');
    expect(K.tmLibInputKey('lin5m')).toBe('lin_5m');
    expect(K.tmLibInputKey('hyppy_cj')).toBe('hyppy_cj');
    expect(K.tmLibInputKey('kuljetus_laukaus')).toBe('kuljetus_laukaus');
  });
  it('alustaherkkä-suodatus (§22)', () => {
    expect(K.tmOnkoAlustaherkka(['lin30m'])).toBe(true);
    expect(K.tmOnkoAlustaherkka(['hyppy_sj', 'hyppy_cj'])).toBe(false);
  });
});

describe('tm_pikakirjaus — tulokset + payload + upsert-doc-id', () => {
  it('_tuloksetRivista: catalog-id → lib-avain, tyhjät/ei-numerot pois', () => {
    const t = F()._tuloksetRivista({ lin30m: '5.0', hyppy_cj: '', mas: 'x', kuljetus_laukaus: '14' }, ['lin30m', 'hyppy_cj', 'mas', 'kuljetus_laukaus']);
    expect(t).toEqual({ lin_30m: 5.0, kuljetus_laukaus: 14 });
  });
  it('_docId: sama pvm → sama doc → upsert (ei duplikaattia)', () => {
    expect(F()._docId('2026-05-02')).toBe('2026-05-02_pikakirjaus');
    expect(F()._docId('2026-05-02')).toBe(F()._docId('2026-05-02'));
  });
  it('_testitulosPayload: §22 Moodi B -muoto', () => {
    const p = F()._testitulosPayload({ lin_30m: 5 }, '2026-05-02', 'uid1', null, '2026-06-01T00:00:00Z');
    expect(p).toMatchObject({ protokolla: 'pikakirjaus', lahde: 'pikakirjaus', testauspvm: '2026-05-02', tuojaUid: 'uid1', testit: { lin_30m: 5 } });
  });
});

describe('tm_pikakirjaus — testipäivä ohjaa normiIka + *_pvm (koko ketju)', () => {
  it('backdatattu testipäivä → hh_pvm = testipäivä (ei tänään) + ikä testipäivästä', () => {
    const tulokset = F()._tuloksetRivista({ lin30m: '5.0' }, ['lin30m']);
    // syntymaVuosi 2013, testipäivä 2024-04-01 → normiIka = 2024−2013 = 11 (ei nykyvuosi)
    const upd = globalThis.TM_PIKAKENTAT.tmLaskePikakentat({ syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'KPV U13' }, tulokset, '2024-04-01');
    expect(upd.hh_viimeisin).toEqual({ lin30m: 5.0 });
    expect(upd.hh_pvm).toBe('2024-04-01');           // testipäivä, EI Date.now
    expect(upd.d1_pvm).toBe('2024-04-01');
  });

  it('viimeisin-vartija hoituu libissä: backdatattu tulos ei ylikirjoita uudempaa hh_viimeisin/hh_taso', () => {
    const tulokset = F()._tuloksetRivista({ lin30m: '5.9' }, ['lin30m']);
    const doc = { syntymaVuosi: 2013, sukupuoli: 'M', hh_pvm: '2026-06-01', hh_viimeisin: { lin30m: 4.9 } };
    const upd = globalThis.TM_PIKAKENTAT.tmLaskePikakentat(doc, tulokset, '2026-05-01');   // vanhempi kuin hh_pvm
    expect(upd.hh_viimeisin).toBeUndefined();
    expect(upd.hh_pvm).toBeUndefined();
  });

  it('_lisaaHistoria: hh_historia snapshot testipäivän pvm:llä', () => {
    const tulokset = F()._tuloksetRivista({ lin30m: '5.0' }, ['lin30m']);
    const upd = globalThis.TM_PIKAKENTAT.tmLaskePikakentat({ syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'KPV U13' }, tulokset, '2024-04-01');
    F()._lisaaHistoria(upd, {}, tulokset, '2024-04-01');
    expect(Array.isArray(upd.hh_historia)).toBe(true);
    expect(upd.hh_historia[0].pvm).toBe('2024-04-01');
  });
});

describe('tm_pikakirjaus — monen pelaajan erä (kukin oma tulokset)', () => {
  it('eri pelaajien rivit tuottavat erilliset tulokset', () => {
    const grid = { pA: { lin30m: '4.5' }, pB: { lin30m: '5.2' } };
    const tA = F()._tuloksetRivista(grid.pA, ['lin30m']);
    const tB = F()._tuloksetRivista(grid.pB, ['lin30m']);
    expect(tA).toEqual({ lin_30m: 4.5 });
    expect(tB).toEqual({ lin_30m: 5.2 });
  });
});
