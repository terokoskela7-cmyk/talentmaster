/** lib/tm_kielletyt.js on SAMA lista kuin tm_jakso_malli.KIELLETYT (drift-vartija) ja Pelaaja_v7 ei lataa tm_jakso_malli.js:ää. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const KV = require('../lib/tm_kielletyt.js'), JM = require('../lib/tm_jakso_malli.js');
describe('tm_kielletyt', () => {
  it('lista identtinen tm_jakso_malli.js:n kanssa (lähdekoodista) — muutos vain molempiin', () => {
    const src = readFileSync(new URL('../lib/tm_jakso_malli.js', import.meta.url), 'utf8'), m = /var KIELLETYT = (\/.+\/[a-z]*);/.exec(src); expect(m).not.toBeNull();
    expect(String(KV.KIELLETYT)).toBe(m[1]);
    for (const s of ['heikkous', 'Heikkoudet', 'rajoite', 'rajoittaa', 'kriittinen', 'kriittisesti', 'hyvä peli', '', null, undefined]) expect(KV.tmJaksoTekstiKelpaa(s), String(s)).toEqual(JM.tmJaksoTekstiKelpaa(s));
  });
  it('Pelaaja_v7 lataa vain tm_kielletyt.js, ei tm_jakso_malli.js:ää', () => { const h = readFileSync(new URL('../TalentMaster_Pelaaja_v7.html', import.meta.url), 'utf8'); expect(h).toContain('lib/tm_kielletyt.js?v=1'); expect(h).not.toMatch(/tm_jakso_malli|TM_JAKSO_MALLI/); });
});
