/**
 * Ennätysjuhla myös taustalta palatessa (Pelaaja_v7): visibilitychange → kevyt .get() pelaajadokista
 * (throttle 60 s, ei onSnapshotia) → _pelaaja päivittyy → _naytaUusiEnnatys(). Funktio PURETAAN LÄHTEESTÄ ja AJETAAN (vm);
 * tynkien nimet = tuotannon nimet (_pelaaja, _isDemoUser, window._db), jotta ReferenceError ei peity.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
function pura(tunniste) {
  const i = HTML.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = HTML.indexOf('{', i); k < HTML.length; k++) { if (HTML[k] === '{') syv++; else if (HTML[k] === '}') { syv--; if (!syv) return HTML.slice(i, k + 1); } }
  throw new Error('sulkeet');
}

function ymp({ demo = false, pelaaja, dokki, overlay = false, ids = { seuraId: 'S', pelaajaId: 'P' }, heita = false } = {}) {
  const lokit = { juhla: 0, get: 0, polut: [] };
  const sandbox = {
    Date, Object, Promise,
    _isDemoUser: demo, _pelaaja: pelaaja === undefined ? { id: 'P', seuraId: 'S', ennatykset: {} } : pelaaja,
    _ennTaustaAika: 0, _ENN_TAUSTA_MS: 60000,
    _naytaUusiEnnatys() { lokit.juhla++; },
    document: { getElementById: (id) => (overlay && id === 'ennatysOv' ? {} : null) },
    window: {
      _p7Pelaaja: ids,
      _db: { collection: (a) => ({ doc: (b) => ({ collection: (c) => ({ doc: (d) => ({
        get: async () => { lokit.get++; lokit.polut.push([a, b, c, d].join('/')); if (heita) throw new Error('offline'); return { exists: !!dokki, data: () => dokki }; } }) }) }) }) },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(pura('async function _ennatysTaustaltaPalatessa') + '\nthis.aja = _ennatysTaustaltaPalatessa;', sandbox);
  return { sandbox, lokit };
}

describe('Ennätysjuhla taustalta palatessa', () => {
  it('lähde: visibilitychange-kuuntelija kutsuu päivitystä vain näkyväksi tullessa; ei onSnapshotia', () => {
    expect(HTML).toMatch(/addEventListener\('visibilitychange',.*visibilityState === 'visible'\) _ennatysTaustaltaPalatessa\(\)/);
    expect(pura('async function _ennatysTaustaltaPalatessa')).not.toMatch(/onSnapshot/);
  });
  it('lukee oman pelaajadokin, päivittää _pelaaja ja juhlii', async () => {
    const { sandbox, lokit } = ymp({ dokki: { ennatykset: { sprintti: { paras: 4.0, edellinen: 5.9, pvm: '2026-10-04' } } } });
    await sandbox.aja();
    expect(lokit.polut).toEqual(['seurat/S/pelaajat/P']);
    expect(sandbox._pelaaja.id).toBe('P'); expect(sandbox._pelaaja.seuraId).toBe('S');
    expect(sandbox._pelaaja.ennatykset.sprintti.paras).toBe(4.0);
    expect(lokit.juhla).toBe(1);
  });
  it('throttle 60 s: toinen palaus heti → ei uutta lukua', async () => {
    const { sandbox, lokit } = ymp({ dokki: { ennatykset: {} } });
    await sandbox.aja(); await sandbox.aja();
    expect(lokit.get).toBe(1);
    sandbox._ennTaustaAika -= 61000; await sandbox.aja();
    expect(lokit.get).toBe(2);
  });
  it('demo / super_admin_view / ei pelaajaa / ei tunnisteita / overlay auki → ei lukua', async () => {
    for (const o of [{ demo: true }, { pelaaja: { id: 'super_admin_view' } }, { pelaaja: null }, { ids: null }, { overlay: true }]) {
      const { sandbox, lokit } = ymp({ dokki: { ennatykset: {} }, ...o });
      await sandbox.aja();
      expect(lokit.get, JSON.stringify(Object.keys(o))).toBe(0); expect(lokit.juhla).toBe(0);
    }
  });
  it('lukuvirhe ei kaada eikä juhli; puuttuva dokki ei juhli', async () => {
    const a = ymp({ heita: true, dokki: {} }); await a.sandbox.aja(); expect(a.lokit.juhla).toBe(0);
    const b = ymp({ dokki: null }); await b.sandbox.aja(); expect(b.lokit.juhla).toBe(0);
  });
  it('pelaaja vaihtui kesken luvun → ei kosketa uuteen pelaajaan', async () => {
    const { sandbox, lokit } = ymp({ dokki: { ennatykset: { x: 1 } } });
    const vanha = sandbox._pelaaja; const p = sandbox.aja(); sandbox._pelaaja = { id: 'Q' };
    await p; expect(lokit.juhla).toBe(0); expect(vanha.ennatykset.x).toBeUndefined();
  });
  it('demo aktivoitui kesken luvun → ei juhlaa', async () => {
    const { sandbox, lokit } = ymp({ dokki: { ennatykset: { x: 1 } } });
    const p = sandbox.aja(); sandbox._isDemoUser = true;
    await p; expect(lokit.juhla).toBe(0);
  });
});
