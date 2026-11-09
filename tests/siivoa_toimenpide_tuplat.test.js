/** PR B3 — siivousskriptin puhdas ydin: uusin säilyy, muut korvataan; require.main-vartija (import ei koske tuotantoon). */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const S = require('../scripts/siivoa_toimenpide_tuplat.js');
describe('siivoa_toimenpide_tuplat', () => {
  it('uusin per signaali+joukkue säilyy, muut korvataan; eri parit erillään', () => {
    const r = S.suunnittele([
      { id: 'a', signaali: 's1', joukkue: 'J1', luotuMs: 100 }, { id: 'b', signaali: 's1', joukkue: 'J1', luotuMs: 300 }, { id: 'c', signaali: 's1', joukkue: 'J1', luotuMs: 200 },
      { id: 'd', signaali: 's1', joukkue: 'J2', luotuMs: 100 }, { id: 'e', signaali: 's2', joukkue: 'J1', luotuMs: 100 },
    ]);
    expect(r.korvattavat.sort()).toEqual(['a', 'c']);
    expect(r.ryhmat['s1 | J1']).toEqual({ yht: 3, korvattavat: ['c', 'a'] });
    expect(r.ryhmat['s1 | J2'].korvattavat).toEqual([]);
  });
  it('deterministinen tasatilanteessa ja tyhjä syöte', () => {
    const a = S.suunnittele([{ id: 'x', signaali: 's', joukkue: 'J', luotuMs: 0 }, { id: 'y', signaali: 's', joukkue: 'J', luotuMs: 0 }]);
    const b = S.suunnittele([{ id: 'y', signaali: 's', joukkue: 'J', luotuMs: 0 }, { id: 'x', signaali: 's', joukkue: 'J', luotuMs: 0 }]);
    expect(a.korvattavat).toEqual(b.korvattavat); expect(S.suunnittele([]).korvattavat).toEqual([]);
  });
  it('luotuMs: Timestamp / {seconds} / puuttuva', () => {
    expect(S.luotuMs({ toMillis: () => 5 })).toBe(5); expect(S.luotuMs({ seconds: 2 })).toBe(2000); expect(S.luotuMs(null)).toBe(0);
  });
  it('lähde: vain automaattinen+ehdotus, ei delete(), dry-run oletus, require.main-vartija', () => {
    const s = readFileSync(new URL('../scripts/siivoa_toimenpide_tuplat.js', import.meta.url), 'utf8');
    expect(s).toMatch(/tyyppi === 'automaattinen'/); expect(s).toMatch(/where\('tila', '==', 'ehdotus'\)/);
    expect(s).not.toMatch(/\.delete\(/); expect(s).toMatch(/argv\.indexOf\('--aja'\)/); expect(s).toMatch(/require\.main === module/);
  });
});
