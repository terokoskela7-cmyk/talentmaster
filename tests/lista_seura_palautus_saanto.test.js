/* PM 27.11.2026 (#1337): Arkistoidut-näkymän palautussääntö. poistettu===true: näytetään, mutta palautus vain SA:lle, ei lainkaan jos suostumus peruttu. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import vm from 'vm';
const src = readFileSync(new URL('../seura/seura_lista.js', import.meta.url), 'utf8');
const ph = readFileSync(new URL('../seura/seura_pelaajahallinta.js', import.meta.url), 'utf8');
const ota = (s, alku) => { const a = s.indexOf(alku); const b = s.indexOf('\n}\n', a); return a < 0 ? '' : s.slice(a, b + 3); };
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(ph.split('\n').find((r) => r.startsWith('function _suostumusPeruttu(')) + '\n' + ota(src, 'function _palautusSalli('), ctx);
const salli = (x, r) => ctx._palautusSalli(x, r);

describe('Arkistoidut — palautussääntö', () => {
  it('arkistoitu / aktiivinen:false → palautus johdolle', () => {
    for (const r of ['vp', 'urheilutoimenjohtaja', 'seurasihteeri', 'super_admin']) {
      expect(salli({ arkistoitu: true }, r).sallittu, r).toBe(true); expect(salli({ aktiivinen: false }, r).sallittu, r).toBe(true);
    }
  });
  it('poistettu: vain SA', () => {
    expect(salli({ poistettu: true }, 'super_admin').sallittu).toBe(true);
    for (const r of ['vp', 'urheilutoimenjohtaja', 'seurasihteeri']) { const t = salli({ poistettu: true }, r); expect(t.sallittu, r).toBe(false); expect(t.syy).toMatch(/Super Admin/); }
  });
  it('poistettu + suostumus peruttu: ei kukaan, SA:kaan', () => {
    for (const x of [{ poistettu: true, suostumusTila: 'peruttu' }, { poistettu: true, suostumus: { peruttu: true } }]) {
      for (const r of ['super_admin', 'vp']) expect(salli(x, r).sallittu, r).toBe(false);
    }
  });
  it('arkistoitu + peruttu suostumus ei estä (vain poistettu on arkaluonteinen)', () => {
    expect(salli({ arkistoitu: true, suostumusTila: 'peruttu' }, 'vp').sallittu).toBe(true);
  });
  it('palautaArkistoitu: sääntö myös funktiossa, getIdToken(true) ennen kirjoitusta, id ei raakana onclickiin', () => {
    const f = ota(src, 'async function palautaArkistoitu(');
    expect(f).toContain('_palautusSalli(x, tila.rooli)');
    expect(f.indexOf('getIdToken(true)')).toBeGreaterThan(0); expect(f.indexOf('getIdToken(true)')).toBeLessThan(f.indexOf('ref.update('));
    expect(src).not.toMatch(/palautaArkistoitu\(\\'' \+ r\.id/); expect(src).toContain('data-pid="');
  });
});
