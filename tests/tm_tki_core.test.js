/**
 * TalentMaster™ — tm_tki_core.js (P2.1: VP-TKI pariteetti)
 * BYTE-uskollisuus docs/testit_indeksit.js:ään + tmLaskePikakentat identtinen VP- ja Master-riippuvuuksilla.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const CORE = require('../lib/tm_tki_core.js');
const CANON = require('../docs/testit_indeksit.js');   // kanoninen lähde

describe('tm_tki_core — pariteetti docs/testit_indeksit.js kanssa', () => {
  it('TK_KOKONAISRAJAT identtinen', () => {
    expect(CORE.TK_KOKONAISRAJAT).toEqual(CANON.TK_KOKONAISRAJAT);
  });

  it('tkPituuspotkuBonus identtinen (matriisi)', () => {
    [0, -3, 25, 40, 55, 80, 100, 120, null, NaN].forEach(m => {
      expect(CORE.tkPituuspotkuBonus(m)).toBe(CANON.tkPituuspotkuBonus(m));
    });
  });

  it('laskeKokonaistulos / tkLaskeTKI / tkLaskeMerkki identtiset (ikä 8–13 × P/T × lajiyhdistelmät)', () => {
    const yhdistelmat = [
      { ponnauttelu: 10, syotto: 14, pujottelu: 12, kuljetus_laukaus: 14 },
      { ponnauttelu: 10, syotto: 14, pujottelu: 12, kuljetus_laukaus: 14, pituuspotku: 30 },   // bonus vain ika>=12
      { ponnauttelu: 20, syotto: 30, pujottelu: 28, kuljetus_laukaus: 26, pituuspotku: 50 },
      { syotto: 45, pujottelu: 33 },                                                            // vajaa
      { ponnauttelu: 5, syotto: 8, pujottelu: 9, kuljetus_laukaus: 6, pituuspotku: 100 },       // huippu (kulta-vyöhyke)
      {},                                                                                       // tyhjä → null
    ];
    let vertailuja = 0;
    ['P', 'T'].forEach(sp => {
      for (let ika = 8; ika <= 13; ika++) {
        yhdistelmat.forEach(testit => {
          const ktCore = CORE.laskeKokonaistulos(testit, ika, sp);
          const ktCanon = CANON.laskeKokonaistulos(testit, ika, sp);
          expect(ktCore).toBe(ktCanon);
          expect(CORE.tkLaskeTKI(ktCore, ika, sp)).toBe(CANON.tkLaskeTKI(ktCanon, ika, sp));
          expect(CORE.tkLaskeMerkki(ktCore, ika, sp)).toBe(CANON.tkLaskeMerkki(ktCanon, ika, sp));
          vertailuja++;
        });
      }
    });
    expect(vertailuja).toBe(2 * 6 * yhdistelmat.length);
  });

  it('täydentää TM_TESTIT-nimiavaruuden EIKÄ ylikirjoita olemassa olevaa', () => {
    const oma = function () { return 'olemassa'; };
    const g = { TM_TESTIT: { laskeKokonaistulos: oma } };
    // simuloi lataus järjestyksessä testit_indeksit (oma) → tm_tki_core (ei saa ylikirjoittaa)
    g.TM_TESTIT.tkLaskeTKI = g.TM_TESTIT.tkLaskeTKI || CORE.tkLaskeTKI;
    ['laskeKokonaistulos', 'tkLaskeTKI', 'tkLaskeMerkki', 'tkPituuspotkuBonus'].forEach(function (k) {
      if (typeof g.TM_TESTIT[k] !== 'function') g.TM_TESTIT[k] = CORE[k];
    });
    expect(g.TM_TESTIT.laskeKokonaistulos).toBe(oma);        // ei ylikirjoitettu
    expect(typeof g.TM_TESTIT.tkPituuspotkuBonus).toBe('function');   // puuttuva täydennetty
  });
});

describe('tmLaskePikakentat — täysi upd identtinen VP-depeillä (tm_tki_core) ja Master-depeillä (testit_indeksit)', () => {
  const { tmLaskePikakentat } = require('../lib/tm_pikakentat.js');
  const E = require('../lib/tm_eerikkila_normit.js');
  const eer = { normiIka: E.normiIka, normSukupuoliMN: E.normSukupuoliMN, eerikkilaTaso: E.eerikkilaTaso, laskeD1Joustava: E.laskeD1Joustava, laskeD2HH: E.laskeD2HH };
  const depsVP = Object.assign({}, eer, { laskeKokonaistulos: CORE.laskeKokonaistulos, tkLaskeTKI: CORE.tkLaskeTKI, tkLaskeMerkki: CORE.tkLaskeMerkki, tkPituuspotkuBonus: CORE.tkPituuspotkuBonus });
  const depsMaster = Object.assign({}, eer, { laskeKokonaistulos: CANON.laskeKokonaistulos, tkLaskeTKI: CANON.tkLaskeTKI, tkLaskeMerkki: CANON.tkLaskeMerkki, tkPituuspotkuBonus: CANON.tkPituuspotkuBonus });

  const cases = [
    { d: { syntymaVuosi: 2014, sukupuoli: 'P', joukkue: 'HJK P12' }, tul: { ponnauttelu: { paras: 10 }, syotto: { paras: 14 }, pujottelu: { paras: 12 }, kuljetus_laukaus: { raaka: 20, rangaistukset: [5, 1] }, pituuspotku: { paras: 30 } }, pvm: '2026-06-01' },
    { d: { syntymaVuosi: 2016, sukupuoli: 'T', joukkue: 'SJK T10' }, tul: { ponnauttelu: { paras: 12 }, syotto: { paras: 20 }, pujottelu: { paras: 18 } }, pvm: '2026-05-02' },
    { d: { syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'KPV U13', hh_viimeisin: { cmj: 34 } }, tul: { lin_30m: { paras: 5.0 }, ponnauttelu: { paras: 9 }, syotto: { paras: 11 }, pujottelu: { paras: 10 } }, pvm: '2026-06-15' },
  ];

  it('tki_viimeisin / tki_merkki / tk_lajit_viimeisin / tk_kokonaistulos_viimeisin + koko upd identtinen', () => {
    cases.forEach(c => {
      const updVP = tmLaskePikakentat(c.d, c.tul, c.pvm, depsVP);
      const updMaster = tmLaskePikakentat(c.d, c.tul, c.pvm, depsMaster);
      expect(updVP).toEqual(updMaster);
      // ja TKI TODELLA laskettiin (ei tyhjä)
      expect(updVP.tki_viimeisin).toEqual(expect.any(Number));
      expect(updVP.tk_lajit_viimeisin).toBeTruthy();
    });
  });
});
