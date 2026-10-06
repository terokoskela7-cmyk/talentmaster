/** lib/tm_koti_oletus.js on generoitu harjoitelogiikka_v4.js:stä (scripts/gen_koti_oletus.js) — ajautumisvartija. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const GEN = require('../scripts/gen_koti_oletus.js');
const DATA = require('../lib/tm_koti_oletus.js');
describe('tm_koti_oletus', () => {
  it('tiedosto vastaa generoitua täsmälleen (ei käsin muokattu, ei ajautunut harjoitelogiikka_v4:stä)', () => {
    expect(readFileSync(join(juuri, 'lib', 'tm_koti_oletus.js'), 'utf8')).toBe(GEN.sisalto());
  });
  it('kohteet ja muoto: nimi + vähintään yksi ikävaiheen ohje; kohteet = pallonhallinta, koordinaatio, syotto, ponnauttelu, nopeus; ei kaksoiskappaleita', () => {
    expect(Object.keys(DATA).sort()).toEqual(['koordinaatio', 'nopeus', 'pallonhallinta', 'ponnauttelu', 'syotto']);
    Object.keys(DATA).forEach((k) => { const nimet = DATA[k].map((h) => h.nimi); expect(new Set(nimet).size).toBe(nimet.length); DATA[k].forEach((h) => { expect(typeof h.nimi).toBe('string'); expect(!!(h.ohje_leikkija || h.ohje_rakentaja || h.ohje_showcase)).toBe(true); }); });
  });
  it('ei ketjunimiä eikä kiellettyjä sanoja pelaajalle menevässä sisällössä', () => {
    const t = JSON.stringify(DATA); expect(/(?<![A-Za-zÅÄÖåäö])(SBL|SFL|LL|DIAG|DFL)(?![A-Za-zÅÄÖåäö])/.test(t)).toBe(false);   // (\b ei kelpaa: 'YLHÄÄLLÄ' sisältää LL) expect(require('../lib/tm_jakso_malli.js').tmJaksoTekstiKelpaa(t).ok).toBe(true);
  });
});
