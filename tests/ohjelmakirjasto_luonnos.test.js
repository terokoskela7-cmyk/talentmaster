/**
 * Ohjelmakirjaston lukijat (VP_v25 + Master_v16): tuonnin LUONNOS-ohjelma (tila:'luonnos') ei ole käytettävissä eikä päädy jakso-snapshotiin; hyväksytty ja tilaton (vanha) kelpaavat.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8'), MA = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
function pura(H, t) { const i = H.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0; for (let k = H.indexOf('{', i); k < H.length; k++) { if (H[k] === '{') d++; else if (H[k] === '}' && !--d) return H.slice(i, k + 1); } throw new Error('sulkeet'); }
const DOCS = [['a', { nimi: 'Vanha ilman tilaa' }], ['b', { nimi: 'Hyväksytty', tila: 'hyvaksytty' }], ['c', { nimi: 'Luonnos', tila: 'luonnos' }]];
const snap = { docs: DOCS.map(([id, d]) => ({ id, data: () => d })) };
const db = { collection: () => ({ doc: () => ({ collection: () => ({ get: async () => snap }) }) }) };
describe('ohjelmakirjasto ei näytä luonnoksia', () => {
  it('VP_v25 _vpOhjLataaKirjasto: luonnos pois, hyväksytty + tilaton mukana', async () => {
    const c = { window: {}, _isDemoMode: false, _seuraId: 'sjk', db, console: { warn() {} }, _vpOhjLaskeN: async () => {}, Object, Promise };
    c.window = c; vm.createContext(c); vm.runInContext(pura(VP, 'async function _vpOhjLataaKirjasto(') + ';', c);
    const r = await c._vpOhjLataaKirjasto(true); expect(r.map((o) => o.id)).toEqual(['a', 'b']);
  });
  it('Master_v16 _ohjLataaKirjasto: sama', async () => {
    const c = { window: {}, _demo: false, _seuraId: 'sjk', _db: db, console: { warn() {} }, _ohjLaskeN: async () => {}, Object, Promise };
    c.window = c; vm.createContext(c); vm.runInContext(pura(MA, 'async function _ohjLataaKirjasto(') + ';', c);
    const r = await c._ohjLataaKirjasto(true); expect(r.map((o) => o.id)).toEqual(['a', 'b']);
  });
});
