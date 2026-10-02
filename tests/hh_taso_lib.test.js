/**
 * Tasolaskenta (laskeHHTaso) siirrettiin TalentMaster_Excel_Tuonti.html:stä lib/tm_eerikkila_normit.js:ään 2.10.2026.
 * Vertailutesti: vanha Excel-koodi (tallennettu sellaisenaan fixtureen ennen siirtoa) ja kirjaston funktio antavat saman
 * tuloksen koko syöteruudukolle, myös tasan rajalla, objektiarvoilla {paras}, merkkijonoilla ja puuttuvilla.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIB = createRequire(import.meta.url)('../lib/tm_eerikkila_normit.js');
const VANHA_LAHDE = readFileSync(join(ROOT, 'tests/fixtures/hh_taso_excel_ennen_siirtoa.js.txt'), 'utf8');
const ctx = { Math, Set, parseFloat, isNaN }; vm.createContext(ctx);
vm.runInContext(VANHA_LAHDE + '\nthis.vanha = laskeHHTaso; this.N = HH_NORMIT_PIKA;', ctx);

function ruudukko() {
  const out = [];
  const ikat = [null, 7, 9, 10, 10.4, 10.6, 12, 13.5, 14, 16, 19, 19.6, 21];
  const spt = ['M', 'N', 'P', 'T', '', null, 'X'];
  // arvot: normirajat ±0.001 + tasan rajalla (kaikki testit, iät, sukupuolet)
  const raja = { lin30m: [], hyppy_cj: [], mas: [] };
  for (const sp of ['P', 'T']) for (const [t, k] of [['30m', 'lin30m'], ['cmj', 'hyppy_cj'], ['mas', 'mas']]) {
    for (const r of Object.values(ctx.N[sp][t])) for (const v of r) raja[k].push(v, v - 0.001, v + 0.001);
  }
  for (const ika of ikat) for (const sp of spt) {
    for (let i = 0; i < raja.lin30m.length; i += 7) {
      out.push([{ lin30m: raja.lin30m[i], hyppy_cj: raja.hyppy_cj[i % raja.hyppy_cj.length], mas: raja.mas[i % raja.mas.length] }, ika, sp]);
      out.push([{ lin30m: raja.lin30m[i] }, ika, sp]);
      out.push([{ hyppy_cj: { paras: raja.hyppy_cj[i % raja.hyppy_cj.length] } }, ika, sp]);
      out.push([{ mas: String(raja.mas[i % raja.mas.length]) }, ika, sp]);
    }
    out.push([{}, ika, sp], [null, ika, sp], [{ lin30m: null, hyppy_cj: { paras: null }, mas: 'x' }, ika, sp]);
  }
  return out;
}

describe('laskeHHTaso: kirjasto = vanha Excel_Tuonti-toteutus', () => {
  it('identtinen tulos koko ruudukolle', () => {
    const r = ruudukko();
    expect(r.length).toBeGreaterThan(2000);
    let eroja = 0;
    for (const [t, ika, sp] of r) { if (!Object.is(LIB.laskeHHTaso(t, ika, sp), ctx.vanha(t, ika, sp))) eroja++; }
    expect(eroja).toBe(0);
  });
  it('esimerkki: P14 30m 4,30 + CMJ 33 + MAS 16 km/h → 3', () => {
    expect(LIB.laskeHHTaso({ lin30m: 4.3, hyppy_cj: 33, mas: 16 }, 14, 'M')).toBe(3);
  });
});

describe('vartijat', () => {
  const EX = readFileSync(join(ROOT, 'TalentMaster_Excel_Tuonti.html'), 'utf8');
  const L = readFileSync(join(ROOT, 'lib/tm_eerikkila_normit.js'), 'utf8');
  it('Excel_Tuonti ei enää määrittele omaa laskeHHTaso/HH_NORMIT_PIKA-kopiota, mutta käyttää funktiota', () => {
    expect(EX).not.toMatch(/function laskeHHTaso\(|const HH_NORMIT_PIKA|function hhLaskeTaso\(/);
    expect(EX).toMatch(/laskeHHTaso\(/);
  });
  it('kirjasto ei vuoda HH_NORMIT_PIKA/hhLaskeTaso-nimiä globaaliksi (VP_v25 määrittelee ne const-kopiona)', () => {
    const g = {}; vm.createContext(g); vm.runInContext(L, g);
    expect(typeof g.laskeHHTaso).toBe('function');
    expect(g.HH_NORMIT_PIKA).toBeUndefined(); expect(g.hhLaskeTaso).toBeUndefined();
    // VP:n const-kopio + lib samassa globaalissa → ei SyntaxErroria
    const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
    const vpKopio = VP.slice(VP.indexOf('const HH_NORMIT_PIKA = {'), VP.indexOf('function hhLaskeTaso('));
    const g2 = {}; vm.createContext(g2);
    expect(() => { vm.runInContext(L, g2); vm.runInContext(vpKopio, g2); }).not.toThrow();
  });
});
