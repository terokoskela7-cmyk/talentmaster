/**
 * TalentMaster™ — E2.2.1: _vpMittausSuodataPoistetut (TalentMaster_VP_v25.html)
 * Datahukka-fix: primitiivin `poistetut` sisältää pikakenttiä joita rebuild ei näe (tulivat muualta kuin
 * testitulokset-arkistosta). Suodatin suojaa kentät joiden domain (hh/tki) ei ole edustettuna arkistossa.
 * Funktiot ovat VP_v25.html:ssä inline → poimitaan lähteestä (puhtaita, ei DOM/Firestore).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dir = dirname(fileURLToPath(import.meta.url));
const { tmRakennaPikakentatArkistosta } = require('../lib/tm_pikakentat.js');

let _vpMittausSuodataPoistetut, _vpMittausKenttaDomain, _vpMittausRebuildMerkinnat;
beforeAll(() => {
  const lines = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8').split('\n');
  const grab = (startNeedle, endNeedle) => {
    const s = lines.findIndex(l => l.includes(startNeedle));
    let e = s; while (e < lines.length && !lines[e].includes(endNeedle)) e++;
    if (s < 0 || e >= lines.length) throw new Error('lohkoa ei löytynyt: ' + startNeedle);
    return lines.slice(s, e + 1).join('\n');
  };
  const merkBlock = grab('var _VPM_KEYNORM', 'window._vpMittausRebuildMerkinnat = _vpMittausRebuildMerkinnat;');
  const suodBlock = grab('function _vpMittausKenttaDomain', 'window._vpMittausSuodataPoistetut = _vpMittausSuodataPoistetut;');
  const api = eval('(function(){ var window = {};\n' + merkBlock + '\n' + suodBlock + '\n return { _vpMittausSuodataPoistetut, _vpMittausKenttaDomain, _vpMittausRebuildMerkinnat }; })()');
  _vpMittausSuodataPoistetut = api._vpMittausSuodataPoistetut;
  _vpMittausKenttaDomain = api._vpMittausKenttaDomain;
  _vpMittausRebuildMerkinnat = api._vpMittausRebuildMerkinnat;
});

// Topias-kaltainen: pelaajalla H-H-pikakentät (muualta, esim. recalcHH) mutta testitulokset = pelkkä TKI.
const TOPIAS = { syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'KPV U13', hh_taso: 2.5, d1_taso: 2.5, d1_lahde: 'hh', d1_pvm: '2026-01-01', hh_viimeisin: { lin30m: 5.0 }, hh_pvm: '2026-01-01' };
const tkiCache = [{ __id: '2026-05-01_pikakirjaus', data: { testauspvm: '2026-05-01', protokolla: 'pikakirjaus', testit: { ponnauttelu: 10, syotto: 14, pujottelu: 12 }, mitatoidut: {} } }];

describe('E2.2.1 juurisyy — primitiivin poistetut sisältää rakentumattomia hh_* (repro)', () => {
  it('TKI-only-arkisto → primitiivi listaa hh_* poistetuiksi (BUG jos ne poistetaan)', () => {
    const res = tmRakennaPikakentatArkistosta(TOPIAS, _vpMittausRebuildMerkinnat(tkiCache));
    // tämä on juurisyy: rebuild ei näe H-H:ta → poistaisi H-H-pikakentät
    expect(res.poistetut).toEqual(expect.arrayContaining(['hh_viimeisin', 'hh_pvm', 'hh_taso', 'd1_taso']));
  });
});

describe('_vpMittausKenttaDomain — luokitin (kattaa primitiivin kenttäperheet)', () => {
  it('hh / tki / kartoittamaton', () => {
    ['hh_viimeisin', 'hh_pvm', 'hh_taso', 'd1_taso', 'd1_lahde', 'd2_taso', 'd2_lahde', 'hh_historia'].forEach(f => expect(_vpMittausKenttaDomain(f)).toBe('hh'));
    ['tki_viimeisin', 'tki_pvm', 'tki_merkki', 'tk_lajit_viimeisin', 'tk_kokonaistulos_viimeisin', 'tki_historia'].forEach(f => expect(_vpMittausKenttaDomain(f)).toBe('tki'));
    ['flei_viimeisin', 'phv_tila', 'adar_pvm'].forEach(f => expect(_vpMittausKenttaDomain(f)).toBeNull());
  });
});

describe('_vpMittausSuodataPoistetut — datahukka-fix', () => {
  it('T1 (ydin): TKI-only-arkisto → hh_* suojataan (ei jää poistetuiksi)', () => {
    const raaka = tmRakennaPikakentatArkistosta(TOPIAS, _vpMittausRebuildMerkinnat(tkiCache)).poistetut;
    const suod = _vpMittausSuodataPoistetut(raaka, tkiCache);
    expect(suod.filter(f => _vpMittausKenttaDomain(f) === 'hh')).toEqual([]);   // H-H-kenttiä ei poisteta
  });

  it('T2 (kriittinen regressio): H-H arkistossa (myös mitätöity) → viimeisen mitätöinti poistaa hh_* yhä', () => {
    // Pelaajalla H-H-mittaus arkistossa, mitätöity → hh domain edustettu (raaka testit-avain on olemassa)
    const cache = [{ __id: 'hh_evt', data: { testauspvm: '2026-03-01', protokolla: 'hh_laaja', testit: { lin30m: 4.5 }, mitatoidut: { lin30m: { kuka: 'u', milloin: 'x' } } } }];
    const doc = { syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'KPV U13', hh_viimeisin: { lin30m: 4.5 }, hh_pvm: '2026-03-01', hh_taso: 3, d1_taso: 3 };
    const raaka = tmRakennaPikakentatArkistosta(doc, _vpMittausRebuildMerkinnat(cache)).poistetut;
    const suod = _vpMittausSuodataPoistetut(raaka, cache);
    expect(suod).toEqual(expect.arrayContaining(['hh_viimeisin', 'hh_pvm', 'hh_taso', 'd1_taso']));   // domain edustettu → poistuu
  });

  it('T3: edustettu TKI-domain → tki_* poistuvat normaalisti (represented domain toimii)', () => {
    // pelaajalla tki_* pikakentät, TKI arkistossa (mitätöity) → tki domain edustettu → tki_* poistuu
    const cache = [{ __id: 'tk', data: { testauspvm: '2026-05-01', protokolla: 'pikakirjaus', testit: { ponnauttelu: 10, syotto: 14, pujottelu: 12 }, mitatoidut: { ponnauttelu: { kuka: 'u', milloin: 'x' }, syotto: { kuka: 'u', milloin: 'x' }, pujottelu: { kuka: 'u', milloin: 'x' } } } }];
    const doc = { syntymaVuosi: 2014, sukupuoli: 'P', joukkue: 'HJK P12', tki_viimeisin: 60, tki_pvm: '2026-05-01', tki_merkki: 'hopea', tk_kokonaistulos_viimeisin: 90 };
    const raaka = tmRakennaPikakentatArkistosta(doc, _vpMittausRebuildMerkinnat(cache)).poistetut;
    const suod = _vpMittausSuodataPoistetut(raaka, cache);
    expect(suod).toEqual(expect.arrayContaining(['tki_viimeisin', 'tki_pvm', 'tki_merkki']));
  });

  it('T4 (fail-safe): kartoittamaton kenttä suojataan; tyhjä/null → []', () => {
    expect(_vpMittausSuodataPoistetut(['flei_viimeisin', 'hh_taso'], tkiCache)).toEqual([]);   // molemmat suojassa (flei kartoittamaton, hh ei edustettu)
    expect(_vpMittausSuodataPoistetut([], tkiCache)).toEqual([]);
    expect(_vpMittausSuodataPoistetut(null, tkiCache)).toEqual([]);
  });

  it('sekamittari-arkisto: hh edustettu + tki edustettu → molemmat sallitaan; hh-only arkisto suojaa tki:n', () => {
    const hhOnly = [{ __id: 'h', data: { testauspvm: '2026-03-01', testit: { lin30m: 4.5 } } }];
    expect(_vpMittausSuodataPoistetut(['hh_taso', 'tki_viimeisin'], hhOnly)).toEqual(['hh_taso']);   // tki ei edustettu → suojassa
  });
});
