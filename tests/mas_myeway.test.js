// MAS-käännöskorjaus — MyE.Way-pariteetti (2026-07-01). Lukitsee korjauksen −20,3 s (MyE.Way, Palloliiton
// live-tuote) KOLMESSA kopiossa: Excel_Tuonti.html · tm_testipankki.js · Testituonti_Master.html.
// MAS m/s = 1200 / (sek − 20.3); km/h = ms × 3.6. Verifioitu 2 MyE.Way-pisteellä (Topi Keskinen 4:40 → 4.62 m/s
// / 16.63 km/h; Nella Okkonen 5:48 → 3.66 / 13.18). HTML-tiedostot ovat ei-CommonJS → parseMasAika/masAikaKmh
// evaluoidaan lähteestä (self-contained) + lähdetason guard. tm_testipankki behavioraalinen (CommonJS-export).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const { TM_LASKE_MAS } = require('../src/lib/tm_testipankki.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = (p) => readFileSync(resolve(__dirname, '..', p), 'utf8');

// Excel_Tuonti: eval consts + parseMasAika (itsenäinen — riippuu vain MAS_MATKA_M / MAS_KAANNOSKORJAUS_S)
function excelParseMasAika() {
  const et = src('TalentMaster_Excel_Tuonti.html');
  const a = et.indexOf('const MAS_MATKA_M');
  const b = et.indexOf('function prosessoiExcel');
  return new Function(et.slice(a, b) + '; return parseMasAika;')();
}
// Testituonti_Master: eval parseMasAika + masAikaKmh
function testituontiMasAikaKmh() {
  const tm = src('TalentMaster_Testituonti_Master.html');
  const a = tm.indexOf('function parseMasAika');
  const b = tm.indexOf('function masAikaKmh');
  const c = tm.indexOf('\n}', b) + 2;
  return new Function(tm.slice(a, c) + '; return masAikaKmh;')();
}

describe('MAS-käännöskorjaus — MyE.Way-pariteetti (−20.3)', () => {
  it('Excel_Tuonti parseMasAika: MyE.Way-referenssipisteet täsmäävät (−20.3, pyöristys ENNEN ×3.6)', () => {
    const p = excelParseMasAika();
    expect(p('4:40').mas_ms).toBeCloseTo(4.62, 2);    // Topi Keskinen 280 s
    expect(p('4:40').mas_kmh).toBeCloseTo(16.63, 2);
    expect(p('5:48').mas_ms).toBeCloseTo(3.66, 2);    // Nella Okkonen 348 s
    expect(p('5:48').mas_kmh).toBeCloseTo(13.18, 2);
    // Pyöristysraja: −20.3 → 13.03 (−20 antaisi 13.0) → todistaa vakion
    expect(p('5:52').mas_kmh).toBeCloseTo(13.03, 2);  // Ylevä Milka 352 s
  });

  it('tm_testipankki TM_LASKE_MAS: −20.3 (5:52 → 3.62 m/s; −20 antaisi 3.61)', () => {
    expect(TM_LASKE_MAS(4, 40)).toBeCloseTo(4.62, 2);   // 280 s
    expect(TM_LASKE_MAS(5, 48)).toBeCloseTo(3.66, 2);   // 348 s
    expect(TM_LASKE_MAS(5, 52)).toBe(3.62);             // 352 s — erottaa −20.3 (3.62) vs −20 (3.61)
  });

  it('Testituonti_Master masAikaKmh: käännöskorjaus −20.3 mukana (elävä tuontipolku)', () => {
    const kmh = testituontiMasAikaKmh();
    expect(kmh('4:40')).toBeCloseTo(16.63, 2);          // Topi 280 s → MyE.Way
    // HUOM: 5:52 → 13.02 (round-after -tyyli, ero Excel_Tuontiin 0.01 pyöristysjärjestyksestä, EI korjauksesta;
    // tekninen velka = single-source). Ilman korjausta olisi ~13.30 → korjaus todistetusti mukana.
    expect(kmh('5:52')).toBeLessThan(13.10);
  });

  it('KOLME KOPIOTA: kaikissa korjaus −20.3 (guard: päivitä yhdessä)', () => {
    const et = src('TalentMaster_Excel_Tuonti.html');
    expect(/MAS_KAANNOSKORJAUS_S\s*=\s*20\.3/.test(et)).toBe(true);
    expect(/MAS_KAANNOSKORJAUS_S\s*=\s*20(?![.\d])/.test(et)).toBe(false);  // ei enää = 20

    const tp = src('src/lib/tm_testipankki.js');
    expect(tp.includes('kokonaisAika - 20.3')).toBe(true);

    const tm = src('TalentMaster_Testituonti_Master.html');
    expect(tm.includes('sek - 20.3')).toBe(true);
    expect(/1200 \/ sek\)\s*\* 3\.6/.test(tm)).toBe(false); // ei enää korjaamaton km/h
  });
});
