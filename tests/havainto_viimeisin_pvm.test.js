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
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
function pura(t) {
  const i = ADAR.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0;
  for (let k = ADAR.indexOf('{', i); k < ADAR.length; k++) { if (ADAR[k] === '{') d++; else if (ADAR[k] === '}') { d--; if (!d) return ADAR.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
/* Ympäristö: _PH_DB.batch() tallentaa operaatiot ja "kirjaa" ne vasta commitissa (atomisesti); pRef.set = erillinen kirjoitus (adar_*-pikakentät). */
function aja({ data, vanha = {}, kentat = { adar_pvm: 'x', adar_havaintoja: 1 }, hylkaaPelaajaOp = false, hylkaaHavainto = false }) {
  const kirjattu = [];      // todella kirjatut: { kohde:'havainto'|'pelaaja', d, o, kautta:'batch'|'set' }
  const havRef = { id: 'h1' };
  const pRef = { id: 'm93GBdOaGCUuenMiCL0I', collection: () => ({ get: async () => ({ docs: [] }) }), get: async () => ({ exists: true, data: () => vanha }),
    set: async (d, o) => { if (hylkaaPelaajaOp) throw Object.assign(new Error('denied'), { code: 'permission-denied' }); kirjattu.push({ kohde: 'pelaaja', d, o, kautta: 'set' }); } };
  const _PH_DB = { batch: () => {
    const ops = [];
    return { set: (ref, d, o) => { ops.push({ ref, d, o }); },
      commit: async () => {   // atomisuus: jos yksikin op hylätään, mitään ei kirjata
        if (ops.some((x) => (x.ref === havRef && hylkaaHavainto) || (x.ref === pRef && hylkaaPelaajaOp))) throw Object.assign(new Error('denied'), { code: 'permission-denied' });
        ops.forEach((x) => kirjattu.push({ kohde: x.ref === havRef ? 'havainto' : 'pelaaja', d: x.d, o: x.o, kautta: 'batch' }));
      } };
  } };
  const map = { m93GBdOaGCUuenMiCL0I: {} };
  const ctx = { _PH_DB, _phPelaajaRef: () => pRef, _phIka: () => 13, console: { warn() {} }, window: { _pelaajaMap: map }, Date, Object, Promise, tmAdarPikakentat: () => kentat };
  vm.createContext(ctx);
  vm.runInContext(pura('async function _phKirjoitaHavaintoJaPikakentat(') + '\nthis.f = _phKirjoitaHavaintoJaPikakentat;', ctx);
  return { p: ctx.f(havRef, data, 'kpv', 'm93GBdOaGCUuenMiCL0I', 1, false), kirjattu, map };
}
const batchPelaaja = (r) => r.kirjattu.find((k) => k.kohde === 'pelaaja' && k.kautta === 'batch');

describe('havainto_viimeisin_pvm kirjoitus (ADAR-pikakortti, KPV U13 -testipelaaja)', () => {
  it('SAMASSA BATCHISSA: havainto + havainto_viimeisin_pvm (merge) atomisesti; adar_* erillisenä setinä', async () => {
    const r = aja({ data: { pisteet: { A: 2 }, pvm: '2026-10-05' } });
    expect(await r.p).toEqual({ ok: true });
    expect(r.kirjattu.filter((k) => k.kautta === 'batch').map((k) => k.kohde)).toEqual(['havainto', 'pelaaja']);
    expect(batchPelaaja(r)).toMatchObject({ d: { havainto_viimeisin_pvm: '2026-10-05' }, o: { merge: true } });
    expect(Object.keys(batchPelaaja(r).d)).toEqual(['havainto_viimeisin_pvm']);   // batchissa VAIN rytmikenttä (johdetut adar_* eivät uhkaa havaintoa)
    expect(r.kirjattu.find((k) => k.kautta === 'set').d).toMatchObject({ adar_pvm: 'x', adar_havaintoja: 1 });
    expect(r.kirjattu.find((k) => k.kautta === 'set').d).not.toHaveProperty('havainto_viimeisin_pvm');   // rytmikenttä VAIN batchissa (ei kahta kirjoituspolkua)
    expect(r.map.m93GBdOaGCUuenMiCL0I.havainto_viimeisin_pvm).toBe('2026-10-05');
  });
  it('havainto ILMAN pisteitä (laskenta ei tuota adar-kenttiä) → havainto_viimeisin_pvm silti batchissa; tulos {ok:false, code:laskenta}', async () => {
    const r = aja({ data: { narratiivi: 'hyvä', pvm: '2026-10-05' }, kentat: null });
    expect(await r.p).toEqual({ ok: false, code: 'laskenta' });
    expect(r.kirjattu.map((k) => k.kohde + ':' + k.kautta)).toEqual(['havainto:batch', 'pelaaja:batch']);
  });
  it('ATOMISUUS: batch hylätään → ei havaintoa EIKÄ rytmikenttää (ei "havainto tehty mutta rytmi ei nollautunut"); virhe palautuu kutsujalle (luonnos säilyy)', async () => {
    const r = aja({ data: { pisteet: { A: 2 }, pvm: '2026-10-05' }, hylkaaHavainto: true });
    await expect(r.p).rejects.toMatchObject({ code: 'permission-denied' });
    expect(r.kirjattu.filter((k) => k.kautta === 'batch')).toEqual([]);
    const q = aja({ data: { pisteet: { A: 2 }, pvm: '2026-10-05' }, hylkaaPelaajaOp: true });
    await expect(q.p).rejects.toMatchObject({ code: 'permission-denied' });
    expect(q.kirjattu).toEqual([]);   // pelaajadokin op hylätty → batch kokonaan pois (ja adar-set hylätään sekin) — Rules-pariteetti estää tämän käytännössä
  });
  it('myöhempi päivämäärä SÄILYY: offline-synkka tuo vanhemman päivän → uudempi kirjataan; uudempi voittaa vanhan', async () => {
    const a = aja({ data: { pisteet: {}, pvm: '2026-09-20' }, vanha: { havainto_viimeisin_pvm: '2026-10-01' } }); await a.p;
    expect(batchPelaaja(a).d.havainto_viimeisin_pvm).toBe('2026-10-01');
    const b = aja({ data: { pisteet: {}, pvm: '2026-10-05' }, vanha: { havainto_viimeisin_pvm: '2026-10-01' } }); await b.p;
    expect(batchPelaaja(b).d.havainto_viimeisin_pvm).toBe('2026-10-05');
    const c = aja({ data: { pisteet: {}, pvm: '2026-10-05' }, vanha: { havainto_viimeisin_pvm: '2026-10-05' } }); await c.p;
    expect(batchPelaaja(c).d.havainto_viimeisin_pvm).toBe('2026-10-05');   // sama päivä
  });
  it('virheellinen / puuttuva pvm → kenttää ei kirjoiteta (batchissa vain havainto); ei Timestamp-objektia', async () => {
    for (const pvm of [undefined, null, '', '5.10.2026', '2026-10-05T10:00:00Z', 20261005, { toDate() {} }]) {
      const r = aja({ data: { pisteet: {}, pvm } }); await r.p;
      expect(batchPelaaja(r), String(pvm)).toBeUndefined(); expect(r.kirjattu.some((k) => k.kohde === 'havainto' && k.kautta === 'batch')).toBe(true);
    }
  });
  it('adar_*-pikakenttien (erillinen set) epäonnistuminen EI hävitä havaintoa eikä rytmikenttää → tulos {ok:false, code}', async () => {
    const r = aja({ data: { pisteet: {}, pvm: '2026-10-05' } });   // perustapaus: ok
    expect(await r.p).toEqual({ ok: true });
    // erillinen set hylätään, batch ei sisällä pelaajaoppia kun pvm puuttuu → havainto silti tallessa
    const q = aja({ data: { pisteet: {} }, hylkaaPelaajaOp: true });
    expect(await q.p).toEqual({ ok: false, code: 'permission-denied' }); expect(q.kirjattu.map((k) => k.kohde)).toEqual(['havainto']);
  });
  it('lähde: molemmat kirjoituspolut (online _phTallenna + offline-synkka) kulkevat tämän funktion kautta; sw_adar-cache nostettu; ei suoraa havRef.set(data) -kirjoitusta', () => {
    expect((ADAR.match(/_phKirjoitaHavaintoJaPikakentat\(/g) || []).length).toBeGreaterThanOrEqual(3);   // määrittely + 2 kutsua
    expect(readFileSync(join(juuri, 'sw_adar.js'), 'utf8')).toMatch(/const CACHE = 'tm-adar-v1\d'/);
    expect(pura('async function _phKirjoitaHavaintoJaPikakentat(')).not.toMatch(/havRef\.set\(/);
    expect(pura('async function _phKirjoitaHavaintoJaPikakentat(')).toMatch(/_PH_DB\.batch\(\)[\s\S]*batch\.set\(havRef, data\)[\s\S]*havainto_viimeisin_pvm/);
  });
});

/* KARTOITUS: kaikki havainnot-alikokoelmaan kirjoittavat polut koko koodikannassa. Uusi luokittelematon kirjoituspolku kaataa testin. */
describe('KARTOITUS · havainnot-alikokoelman kirjoituspolut', () => {
  const SOVELLUKSET = ['TalentMaster_ADAR_Pikakortti.html', 'TalentMaster_Master_v16.html', 'TalentMaster_VP_v25.html', 'TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html', 'TalentMaster_Admin.html', 'TalentMaster_Valmennusapuri.html'];
  const kirjoittavat = (h) => {   // rivit joilla 'havainnot'-viittaus JA seuraavan 4 rivin sisällä kirjoitusoperaatio (set/update/add/delete/batch)
    const rivit = h.split('\n'), out = [];
    rivit.forEach((l, i) => { if (/collection\('havainnot'\)/.test(l) && /\.doc\(\)|\.doc\([^)]*\)\.(set|update|delete)|\.add\(/.test(rivit.slice(i, i + 3).join(' '))) out.push(i + 1); });
    return out;
  };
  it('ADAR-pikakortti: kaksi luontipolkua (online _phTallenna + offline-synkka), molemmat → _phKirjoitaHavaintoJaPikakentat (→ batch + havainto_viimeisin_pvm)', () => {
    const h = lue('TalentMaster_ADAR_Pikakortti.html');
    expect((h.match(/collection\('havainnot'\)\.doc\(\)/g) || []).length).toBe(2);
    expect(h).toMatch(/var ref = _phPelaajaRef\(seuraId, pelaajaId\)\.collection\('havainnot'\)\.doc\(\);[\s\S]{0,1500}_phKirjoitaHavaintoJaPikakentat\(ref, data/);
    expect(h).toMatch(/var havRef = _phPelaajaRef\(m\.seura_id, m\.pelaaja_id\)\.collection\('havainnot'\)\.doc\(\);[\s\S]{0,200}_phKirjoitaHavaintoJaPikakentat\(havRef/);
  });
  it('muut kirjoittajat luokiteltu: Master (vain luku + kertamigraatio pisteet-merge, ei uutta havaintoa), VP (peruminen: update tila/peruttu — ei uusi havainto, päivä ei muutu), Pelaaja (pelaaja_lukenut), Vanhempi (vain luku)', () => {
    const ma = lue('TalentMaster_Master_v16.html'), vp = lue('TalentMaster_VP_v25.html'), pe = lue('TalentMaster_Pelaaja_v7.html'), vh = lue('TalentMaster_Vanhempi_v2.html');
    expect(ma).toMatch(/_migratoiAdar13[\s\S]{0,1200}col\.doc\(d\.id\)\.set\(\{ pisteet: uusi \}, \{ merge: true \}\)/);   // kertamigraatio: muokkaa vain pisteet, ei luo havaintoa
    expect(vp).toMatch(/\.collection\('havainnot'\)\.doc\(havId\)\.update\(\{\s*tila: 'peruttu'/); expect((vp.match(/\.collection\('havainnot'\)\.doc\(/g) || []).length).toBe(1);
    expect(pe).toMatch(/collection\('havainnot'\)\.doc\(havId\)[\s\S]{0,200}pelaaja_lukenut/); expect(vh).not.toMatch(/collection\('havainnot'\)[^\n]*\.(set|add|update)\(/);
    // uusi luokittelematon luontipolku (.add / .doc().set tms.) missään sovelluksessa ADARin ulkopuolella → testi kaatuu
    SOVELLUKSET.filter((f) => !/ADAR_Pikakortti/.test(f)).forEach((f) => { const h = lue(f); expect(kirjoittavat(h).filter((n) => !/(_vpHhPeru|migratoiAdar13|pelaaja_lukenut)/.test(h.split('\n').slice(Math.max(0, n - 40), n + 12).join('\n'))), f).toEqual([]); });
  });
  it('seurataso /seurat/{sid}/havainnot: ei kirjoittajia sovelluksissa (vain luku); Cloud Functions: ei havaintojen luontia', () => {
    SOVELLUKSET.forEach((f) => expect(lue(f), f).not.toMatch(/doc\(_seuraId\)\.collection\('havainnot'\)\.(add|doc)\(/));
    expect(lue('functions/index.js')).not.toMatch(/collection\('havainnot'\)\.(add|doc\([^)]*\)\.set)/);
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
