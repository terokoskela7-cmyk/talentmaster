/**
 * §26 pari-invariantti — lähdedokumentti + pelaajan pikakentät ATOMISESTI (yksi batch: kaikki tai ei mitään).
 *   · lib/tm_pikakirjaus.js `_tallennaPelaajanTulokset`: testitulokset/{pvm}_{proto} + pelaajan pikakentät
 *   · TalentMaster_VP_v25.html `_vpKirjoitaReview`: reviewit/{pvm} + review_viimeisin_pvm/-tyyppi (MDT-review + bulk)
 * Mock-Firestore: batch kerää operaatiot ja soveltaa ne VAIN commitissa; epäonnistuva commit → mitään ei tallennu.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');

function mockDb({ kaada = false, alku = {} } = {}) {
  const docs = JSON.parse(JSON.stringify(alku));   // polku → data
  const erilliset = [];                            // kirjoitukset OHI batchin (ei saa olla)
  const ref = (polku) => ({
    path: polku,
    collection: (n) => ({ doc: (id) => ref(polku + '/' + n + '/' + id) }),
    get: async () => ({ exists: polku in docs, data: () => docs[polku] }),
    set: async (d) => { erilliset.push(['set', polku]); docs[polku] = d; },
    update: async (d) => { erilliset.push(['update', polku]); docs[polku] = Object.assign({}, docs[polku], d); },
  });
  const db = {
    collection: (n) => ({ doc: (id) => ref(n + '/' + id) }),
    batch: () => {
      const ops = [];
      return {
        set: (r, d, o) => ops.push(['set', r.path, d, o]),
        update: (r, d) => ops.push(['update', r.path, d]),
        commit: async () => {
          if (kaada) throw Object.assign(new Error('commit epäonnistui'), { code: 'unavailable' });
          ops.forEach(([t, p, d, o]) => { docs[p] = (t === 'update' || (o && o.merge)) ? Object.assign({}, docs[p], d) : d; });
          db.viimeisinBatch = ops.map(([t, p]) => t + ' ' + p);
        },
      };
    },
  };
  return { db, docs, erilliset };
}

const PEL = 'seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I';

describe('tm_pikakirjaus · testitulos + pikakentät yhdessä batchissa', () => {
  beforeAll(() => {
    globalThis.TM_TESTIKATALOGI = require('../lib/tm_testikatalogi.js');
    globalThis.TM_PIKAKENTAT = require('../lib/tm_pikakentat.js');
    const H = require('../lib/tm_historia.js');
    globalThis.tmHhSnapshot = H.tmHhSnapshot; globalThis.tmTkiSnapshot = H.tmTkiSnapshot; globalThis.tmHistoriaLisaa = H.tmHistoriaLisaa;
  });
  const F = () => require('../lib/tm_pikakirjaus.js');
  const tulokset = { lin30m: 4.62, hyppy_cj: 33.5, mas: 14.8 };
  const pvm = '2026-10-03';

  it('batch kirjoittaa testituloksen JA pikakenttäparin (hh_viimeisin + hh_pvm samasta tuloksesta); ei erillisiä kirjoituksia', async () => {
    const m = mockDb({ alku: { [PEL]: { syntymaVuosi: 2013, sukupuoli: 'M' } } });
    const payload = F()._testitulosPayload(tulokset, pvm, 'vp-uid', null, '2026-10-03T10:00:00.000Z');
    const upd = await F()._tallennaPelaajanTulokset(m.db, 'kpv', 'm93GBdOaGCUuenMiCL0I', payload, tulokset, pvm);
    expect(m.erilliset).toEqual([]);
    expect(m.db.viimeisinBatch).toEqual([`set ${PEL}/testitulokset/${F()._docId(pvm)}`, `update ${PEL}`]);
    expect(m.docs[`${PEL}/testitulokset/${F()._docId(pvm)}`]).toBeTruthy();
    expect(upd.hh_pvm).toBe(pvm);
    expect(m.docs[PEL].hh_pvm).toBe(pvm);
    expect(m.docs[PEL].hh_viimeisin).toEqual(upd.hh_viimeisin);   // pari: arvo + pvm samasta tuloksesta
    expect(upd.hh_viimeisin).toMatchObject({ cmj: 33.5, mas: 14.8 });
  });
  it('commit epäonnistuu → testitulos EI eikä pikakentät tallennu (ei puolikasta tilaa)', async () => {
    const m = mockDb({ kaada: true, alku: { [PEL]: { syntymaVuosi: 2013, sukupuoli: 'M', hh_pvm: '2026-04-01' } } });
    const payload = F()._testitulosPayload(tulokset, pvm, 'vp-uid', null, '2026-10-03T10:00:00.000Z');
    await expect(F()._tallennaPelaajanTulokset(m.db, 'kpv', 'm93GBdOaGCUuenMiCL0I', payload, tulokset, pvm)).rejects.toThrow('commit epäonnistui');
    expect(Object.keys(m.docs)).toEqual([PEL]);
    expect(m.docs[PEL].hh_pvm).toBe('2026-04-01');
    expect(m.erilliset).toEqual([]);
  });
  it('pikakenttälaskenta ennallaan: sama tulos kuin tmLaskePikakentat suoraan (ei muutoksia laskentaan)', async () => {
    const d0 = { syntymaVuosi: 2013, sukupuoli: 'M' };
    const m = mockDb({ alku: { [PEL]: d0 } });
    const upd = await F()._tallennaPelaajanTulokset(m.db, 'kpv', 'm93GBdOaGCUuenMiCL0I', {}, tulokset, pvm);
    const odotus = globalThis.TM_PIKAKENTAT.tmLaskePikakentat(d0, tulokset, pvm);
    F()._lisaaHistoria(odotus, d0, tulokset, pvm);
    F()._lisaaEnnatykset(odotus, d0, tulokset, undefined, pvm);   // KORTTI 1c: omat ennätykset samaan upd:iin
    expect(upd).toEqual(odotus);
    expect(upd.ennatykset).toMatchObject({ lin30m: { paras: 4.62, pvm }, cmj: { paras: 33.5 } });
  });
  it('lomakkeen _tallenna kutsuu atomista apuria (ei enää erillisiä set + update -kutsuja)', () => {
    const s = readFileSync(join(juuri, 'lib/tm_pikakirjaus.js'), 'utf8');
    const t = s.slice(s.indexOf('async function _tallenna()'), s.indexOf('var panel = document.createElement'));
    expect(t).toContain('await _tallennaPelaajanTulokset(ctx.db, ctx.seuraId, pid, payload, tulokset, state.pvm);');
    expect(t).not.toMatch(/\.set\(payload|pelRef\.update\(/);
  });
});

describe('VP_v25 · review + review_viimeisin_pvm yhdessä batchissa', () => {
  const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
  function runko(t) {
    const i = VP.indexOf(t); expect(i, t).toBeGreaterThan(-1);
    let syv = 0; for (let k = VP.indexOf('{', i); k < VP.length; k++) { if (VP[k] === '{') syv++; else if (VP[k] === '}') { syv--; if (syv === 0) return VP.slice(i, k + 1); } }
  }
  // R6.2a: kirjoittaja käyttää tmKirjaaKatselmus:ta (window.TM_KEHITYSSILMUKKA)
  function aja(m) { const ctx = { db: m.db, _seuraId: 'kpv', window: { TM_KEHITYSSILMUKKA: require('../lib/tm_kehityssilmukka.js') }, Object, Array }; vm.createContext(ctx); vm.runInContext(runko('async function _vpKirjoitaReview(') + '\nthis.f = _vpKirjoitaReview;', ctx); return ctx.f; }
  const review = { tyyppi: 'mdr', pvm: '2026-10-03', tekija_uid: 'vp-uid', tekija_rooli: 'vp', paatos: '', idp_paivitetty: false };

  it('batch kirjoittaa reviewit/{pvm} JA pikakentät; muut pelaajadokin kentät säilyvät (merge)', async () => {
    const m = mockDb({ alku: { [PEL]: { etunimi: 'Topias' } } });
    await aja(m)('m93GBdOaGCUuenMiCL0I', '2026-10-03', review);
    expect(m.erilliset).toEqual([]);
    expect(m.db.viimeisinBatch).toEqual([`set ${PEL}/reviewit/2026-10-03`, `set ${PEL}`]);
    expect(m.docs[`${PEL}/reviewit/2026-10-03`]).toEqual(review);
    expect(m.docs[PEL]).toEqual({ etunimi: 'Topias', review_viimeisin_pvm: '2026-10-03', review_viimeisin_tyyppi: 'mdr' });
  });
  it('commit epäonnistuu → review EI eikä pikakenttä tallennu', async () => {
    const m = mockDb({ kaada: true, alku: { [PEL]: { etunimi: 'Topias' } } });
    await expect(aja(m)('m93GBdOaGCUuenMiCL0I', '2026-10-03', review)).rejects.toThrow();
    expect(m.docs).toEqual({ [PEL]: { etunimi: 'Topias' } });
  });
  it('MDT-review ja bulk-merkintä käyttävät molemmat atomista apuria (ei erillisiä kirjoituksia)', () => {
    for (const f of ['window._mdtMerkitseReview = async function', 'window._vpCockpitBulkMerkitse = async function']) {
      const r = runko(f);
      expect(r, f).toMatch(/await _vpKirjoitaReview\(/);
      expect(r, f).not.toMatch(/collection\('reviewit'\)|review_viimeisin_pvm: pvm, review_viimeisin_tyyppi/);
    }
  });
});

describe('Testaus_v9 · PHV-kasvumittaus: biologinen_ika/{pvm} + PHV-pikakentät yhdessä batchissa', () => {
  const T = readFileSync(join(juuri, 'TalentMaster_Testaus_v9.html'), 'utf8');
  const i = T.indexOf('const ops = window.TM_BioIka.bioIkaTallennusOperaatiot(');
  const f = T.slice(i, T.indexOf('/* ── VAIHE 7', i));
  it('historia + pikakentät samassa batchissa, yksi commit; ei erillisiä set/update-kutsuja', () => {
    expect(f).toContain('const b = baseRef.firestore.batch();');
    expect(f).toContain("b.set(baseRef.collection('biologinen_ika').doc(ops.mittausPvmId), ops.dokumentti);");
    expect(f).toMatch(/b\.update\(baseRef, \{\s*biologinenIka_viimeisin: ops\.dokumentti,\s*phv_tila: ops\.dokumentti\.phv_tila_koodi/);
    expect((f.match(/await b\.commit\(\)/g) || []).length).toBe(1);
    expect(f).not.toMatch(/await baseRef\.(update|collection)/);
  });
  it('lib/tm_bioika.js:n käyttöohje neuvoo saman batch-mallin', () => {
    const lib = readFileSync(join(juuri, 'lib/tm_bioika.js'), 'utf8');
    expect(lib).toContain('const b = baseRef.firestore.batch();');
    expect(lib).not.toMatch(/await baseRef\.update\(/);
  });
});
