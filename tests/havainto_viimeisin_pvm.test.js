/**
 * havainto_viimeisin_pvm — pikakenttä havaintorytmille (lib/tm_seuraava_askel.js, sääntö 9).
 * ADAR-pikakortin _phKirjoitaHavaintoJaPikakentat kirjoittaa KAIKISTA henkilökunnan havainnoista (myös ilman pisteitä; adar_pvm kattaa vain pisteelliset)
 * havainnon päivän samaan pikakenttäsettiin kuin adar_*; ei koskaan taaksepäin. Pilotin väärät hälytykset: havainto tehty, mutta rytmi ei nollautunut.
 * Funktio PURETAAN LÄHTEESTÄ ja AJETAAN (vm); stubien nimet = tuotannon nimet.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const ADAR = readFileSync(join(juuri, 'TalentMaster_ADAR_Pikakortti.html'), 'utf8');
const L = require('../lib/tm_seuraava_askel.js');
function pura(t) {
  const i = ADAR.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0;
  for (let k = ADAR.indexOf('{', i); k < ADAR.length; k++) { if (ADAR[k] === '{') d++; else if (ADAR[k] === '}') { d--; if (!d) return ADAR.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
function aja({ data, vanha = {}, kentat = { adar_pvm: 'x', adar_havaintoja: 1 }, hylkaa = false }) {
  const kirj = [];
  const pRef = { id: 'm93GBdOaGCUuenMiCL0I', collection: () => ({ get: async () => ({ docs: [] }) }), get: async () => ({ exists: true, data: () => vanha }),
    set: async (d, o) => { if (hylkaa) throw Object.assign(new Error('denied'), { code: 'permission-denied' }); kirj.push({ d, o }); } };
  const havRef = { id: 'h1', set: async () => {} };
  const map = { m93GBdOaGCUuenMiCL0I: {} };
  const ctx = { _PH_DB: {}, _phPelaajaRef: () => pRef, _phIka: () => 13, console: { warn() {} }, window: { _pelaajaMap: map }, Date, Object, Promise, tmAdarPikakentat: () => kentat };
  vm.createContext(ctx);
  vm.runInContext(pura('async function _phKirjoitaHavaintoJaPikakentat(') + '\nthis.f = _phKirjoitaHavaintoJaPikakentat;', ctx);
  return { p: ctx.f(havRef, data, 'kpv', 'm93GBdOaGCUuenMiCL0I', 1, false), kirj, map };
}

describe('havainto_viimeisin_pvm kirjoitus (ADAR-pikakortti, KPV U13 -testipelaaja)', () => {
  it('havainnon päivä kirjoitetaan SAMAAN pikakenttäsettiin kuin adar_* (yksi set, merge)', async () => {
    const r = aja({ data: { pisteet: { A: 2 }, pvm: '2026-10-05' } });
    expect(await r.p).toEqual({ ok: true });
    expect(r.kirj.length).toBe(1); expect(r.kirj[0].o).toEqual({ merge: true });
    expect(r.kirj[0].d).toMatchObject({ adar_pvm: 'x', adar_havaintoja: 1, havainto_viimeisin_pvm: '2026-10-05' });
    expect(r.map.m93GBdOaGCUuenMiCL0I.havainto_viimeisin_pvm).toBe('2026-10-05');
  });
  it('havainto ILMAN pisteitä (laskenta ei tuota adar-kenttiä) → havainto_viimeisin_pvm silti kirjoitetaan; tulos pysyy {ok:false, code:laskenta}', async () => {
    const r = aja({ data: { narratiivi: 'hyvä', pvm: '2026-10-05' }, kentat: null });
    expect(await r.p).toEqual({ ok: false, code: 'laskenta' });
    expect(r.kirj.length).toBe(1); expect(r.kirj[0].d).toEqual({ havainto_viimeisin_pvm: '2026-10-05' });
  });
  it('ei koskaan taaksepäin: offline-synkka tuo vanhemman päivän → uudempi säilyy; uudempi voittaa vanhan', async () => {
    const a = aja({ data: { pisteet: {}, pvm: '2026-09-20' }, vanha: { havainto_viimeisin_pvm: '2026-10-01' } }); await a.p;
    expect(a.kirj[0].d.havainto_viimeisin_pvm).toBe('2026-10-01');
    const b = aja({ data: { pisteet: {}, pvm: '2026-10-05' }, vanha: { havainto_viimeisin_pvm: '2026-10-01' } }); await b.p;
    expect(b.kirj[0].d.havainto_viimeisin_pvm).toBe('2026-10-05');
  });
  it('virheellinen / puuttuva pvm → kenttää ei kirjoiteta (ei roskaa; ei Timestamp-objektia)', async () => {
    for (const pvm of [undefined, null, '', '5.10.2026', '2026-10-05T10:00:00Z', 20261005, { toDate() {} }]) {
      const r = aja({ data: { pisteet: {}, pvm } }); await r.p;
      expect('havainto_viimeisin_pvm' in r.kirj[0].d, String(pvm)).toBe(false);
    }
  });
  it('pikakenttäkirjoitus hylätään → tulos {ok:false, code}; havainto itse ei kaadu', async () => {
    const r = aja({ data: { pisteet: {}, pvm: '2026-10-05' }, hylkaa: true });
    expect(await r.p).toEqual({ ok: false, code: 'permission-denied' });
  });
  it('lähde: molemmat kirjoituspolut (online _phTallenna + offline-synkka) kulkevat tämän funktion kautta; sw_adar-cache nostettu', () => {
    expect((ADAR.match(/_phKirjoitaHavaintoJaPikakentat\(/g) || []).length).toBeGreaterThanOrEqual(3);   // määrittely + 2 kutsua
    expect(readFileSync(join(juuri, 'sw_adar.js'), 'utf8')).toMatch(/const CACHE = 'tm-adar-v9'/);
  });
});

describe('lukija: havaintorytmi käyttää kenttää (sääntö 9) — tuore kenttä nollaa hälytyksen', () => {
  const PV = 86400000, NYT = new Date('2026-10-05T12:00:00Z').getTime(), iso = (d) => new Date(NYT - d * PV).toISOString().slice(0, 10);
  const p = (lisa) => Object.assign({ syntymaVuosi: 2010, jaksofokus: { konsepti_nimi: 'X', konsepti_avain: 'y_h2', alkoi: iso(30), kesto_vk: 8, domeeni: 'teknis_taktinen' } }, lisa);
  const deps = { laskeReviewKadenssi: () => null, idpJumissa: () => false, jaksoUmpeutunut: () => false, sitoumusOdottaa: () => false };
  it('ilman kenttää (ei muita lähteitä) → havainto 30 pv; kentän kanssa tuoreella päivällä → ei hälytystä, lähde "havainto"', () => {
    expect(L.tmSeuraavaAskel(p(), { nyt: NYT, deps }).peruste).toMatchObject({ paivia: 30, lahde: 'jakso_alku' });
    expect(L.tmSeuraavaAskel(p({ havainto_viimeisin_pvm: iso(2) }), { nyt: NYT, deps }).avain).toBe('yllapito');
    expect(L.tmSeuraavaAskel(p({ havainto_viimeisin_pvm: iso(20) }), { nyt: NYT, deps }).peruste).toMatchObject({ paivia: 20, lahde: 'havainto' });
  });
});
