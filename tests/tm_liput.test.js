/** K1 osa 2: lib/tm_liput.js — liput/julkiset on yksi totuus, vanha seurat.liput.kentta fallback K7:ään. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const L = require('../lib/tm_liput.js');
describe('tmKenttaLippu', () => {
  it('uusi dokumentti voittaa kun kentta on boolean (true/false) — myös vanhaa vastaan', () => {
    expect(L.tmKenttaLippu({ kentta: true }, null)).toBe(true); expect(L.tmKenttaLippu({ kentta: true }, { liput: { kentta: false } })).toBe(true);
    expect(L.tmKenttaLippu({ kentta: false }, { liput: { kentta: true } })).toBe(false);
  });
  it('ei boolean-arvoa (puuttuu, {}, "true", 1, null) → vanha fallback: vain täsmälleen true', () => {
    for (const j of [undefined, null, {}, { muu: 1 }, { kentta: 'true' }, { kentta: 1 }]) { expect(L.tmKenttaLippu(j, { liput: { kentta: true } })).toBe(true); expect(L.tmKenttaLippu(j, { liput: { kentta: 'true' } })).toBe(false); expect(L.tmKenttaLippu(j, { liput: {} })).toBe(false); expect(L.tmKenttaLippu(j, null)).toBe(false); expect(L.tmKenttaLippu(j, {})).toBe(false); }
  });
  it('tmLiput: vanhat liput säilyvät, uudet päällekirjoittavat, kentta aina boolean', () => {
    expect(L.tmLiput({ kentta: true, uusi: 1 }, { liput: { kentta: false, vanha: 2 } })).toEqual({ vanha: 2, uusi: 1, kentta: true }); expect(L.tmLiput(null, null)).toEqual({ kentta: false }); expect(L.tmLiput(undefined, { liput: { kentta: true } })).toEqual({ kentta: true });
    expect(L.tmLiput({ kentta: 'x' }, { liput: { kentta: true } }).kentta).toBe(true);
  });
  it('lähdetaso: Master ja VP lataavat tm_liput.js ja lukevat liput/julkiset-dokumentin; ei muita luku-/kirjoituspolkuja liput-dokumenttiin', () => {
    for (const nimi of ['TalentMaster_Master_v16.html', 'TalentMaster_VP_v25.html']) { const s = readFileSync(new URL('../' + nimi, import.meta.url), 'utf8'); expect(s, nimi).toContain('<script src="lib/tm_liput.js?v=1"></script>'); expect(s, nimi).toContain("collection('liput').doc('julkiset').get()"); expect((s.match(/collection\('liput'\)/g) || []).length, nimi).toBe(1); }
  });
});
