/* B4 — pelaajan ja huoltajan kalenteri palvelimelta (docs/CODE_BRIEF_B4_PELAAJAN_KALENTERI.md). Palvelinpuoli: functions/test/pelaajan_kalenteri.test.js; tässä lib + selainkytkentä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const S = require('../lib/tm_kalenteri_pelaajalle.js');
const K = require('../lib/tm_kalenteri_ilmoitus.js');
const pura = (src, alku) => { const i = src.indexOf(alku); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) break; } } return src.slice(i, j + 1); };
const PE = lue('TalentMaster_Pelaaja_v7.html'), VA = lue('TalentMaster_Vanhempi_v2.html');

describe('lib/tm_kalenteri_pelaajalle.js — sallittulista ja rajaus', () => {
  it('projektio: vain sallitut kentät, logistiikasta vain 4 kenttää; kielletyt eivät läpäise', () => {
    const o = S.tmProjisoi({ id: 'a', nimi: 'N', tyyppi: 'ottelu', alkaa: new Date(0), luoja_uid: 'x', pelaajat_id: ['p'], lasnaolo_kooste: {}, valmentaja_rpe: 5, muistiinpanot: 'm', osallistujat_uid: ['u'], logistiikka: { saapumisaika: '1', sisainen: 'x' } }, 'tulossa');
    expect(Object.keys(o).sort()).toEqual(['alkaa', 'id', 'logistiikka', 'nimi', 'omaSaatavuus', 'tyyppi']);
    expect(Object.keys(o.logistiikka)).toEqual(['saapumisaika']);
    for (const k of ['luoja_uid', 'muokkaaja_uid', 'osallistujat_uid', 'pelaajat_id', 'lasnaolo_kooste', 'valmentaja_rpe', 'valmentaja_rpe_pvm', 'muistiinpanot', 'mentoroitava_uid', 'mentoroitava_nimi']) expect(S.NAKYVAT_KENTAT.concat(S.AJAT)).not.toContain(k);
  });
  it('jäsenyys: nimi-vertailu ei lisää jäsenyyttä (§7.18); tunniste ratkeaa id → normalisoitu id → nimi', () => {
    const docs = [{ id: 'sibbo_p12', nimi: '2014' }, { id: 'sibbo_bl', nimi: '2014 Blå' }];
    const bl = { id: 'x', joukkue: '2014', joukkueet: ['sibbo_bl'] };
    expect(S.tmKuuluuPelaajalle({ tyyppi: 'harjoitus', joukkue: 'sibbo_p12' }, bl, docs)).toBe(false);
    expect(S.tmKuuluuPelaajalle({ tyyppi: 'harjoitus', joukkueet: ['sibbo_bl'] }, bl, docs)).toBe(true);
    expect(S.tmTunnisteDocIdksi('Sibbo BL', docs)).toBe('sibbo_bl'); expect(S.tmTunnisteDocIdksi('2014 Blå', docs)).toBe('sibbo_bl'); expect(S.tmTunnisteDocIdksi('tuntematon', docs)).toBeNull();
  });
  it('functions/-kopio on tavu tavulta sama (sync) ja manifestissa', () => {
    const M = JSON.parse(lue('functions/jaettu_lib.json')); expect(M.tiedostot).toEqual(expect.arrayContaining(['tm_kalenteri_pelaajalle.js', 'tm_ryhmat.js', 'tm_joukkue.js']));
    expect(lue('functions/tm_kalenteri_pelaajalle.js')).toBe(lue('lib/tm_kalenteri_pelaajalle.js'));
  });
});

describe('lib/tm_kalenteri_ilmoitus.js — selaimen osuus (tmKalenteriKoosta, muisti)', () => {
  const nyt = new Date(2026, 9, 20, 12, 0);
  it('päättyneet pois, aikajärjestys, _d asetettu; vastauksen kentät säilyvät', () => {
    const r = K.tmKalenteriKoosta({ tapahtumat: [
      { id: 'b', nimi: 'B', alkaa: new Date(2026, 9, 22, 18, 0).toISOString(), paattyy: new Date(2026, 9, 22, 19, 0).toISOString(), omaSaatavuus: 'tulossa' },
      { id: 'mennyt', nimi: 'M', alkaa: new Date(2026, 9, 20, 8, 0).toISOString(), paattyy: new Date(2026, 9, 20, 9, 0).toISOString() },
      { id: 'a', nimi: 'A', alkaa: new Date(2026, 9, 21, 18, 0).toISOString(), paattyy: new Date(2026, 9, 21, 19, 0).toISOString() },
      { id: 'leiri', nimi: 'L', alkaa: new Date(2026, 9, 18, 9, 0).toISOString(), paattyy: new Date(2026, 9, 21, 15, 0).toISOString() }] }, nyt);
    expect(r.map((e) => e.id)).toEqual(['leiri', 'a', 'b']); expect(r[2].omaSaatavuus).toBe('tulossa'); expect(r[0]._d instanceof Date).toBe(true);
    expect(K.tmKalenteriKoosta(null, nyt)).toEqual([]);
  });
  it('muisti: talleta/lue, virhe nielaistaan (storage heittää → null / false)', () => {
    const mem = {}; const st = { setItem: (k, v) => { mem[k] = v; }, getItem: (k) => mem[k] || null };
    expect(K.tmKalenteriTalleta(st, 'kpv', 'p1', { tapahtumat: [{ id: 'a' }], laskettu: 'x' })).toBe(true);
    expect(K.tmKalenteriMuistista(st, 'kpv', 'p1')).toEqual({ tapahtumat: [{ id: 'a' }], laskettu: 'x' }); expect(K.tmKalenteriMuistista(st, 'kpv', 'p2')).toBeNull();
    const rikki = { setItem() { throw new Error('x'); }, getItem() { throw new Error('x'); } };
    expect(K.tmKalenteriTalleta(rikki, 'a', 'b', { tapahtumat: [] })).toBe(false); expect(K.tmKalenteriMuistista(rikki, 'a', 'b')).toBeNull();
  });
});

describe('Selainkytkentä: callable, ei suoraa kalenterilukua', () => {
  it('Pelaaja_v7 ja Vanhempi_v2 eivät lue kalenteri-kokoelmaa suoraan (ei .collection(\'kalenteri\').get() / .where) eivätkä kalenteridokumenttia (.doc(x).get()); vain lasnaolijat', () => {
    for (const [nimi, src] of [['Pelaaja_v7', PE], ['Vanhempi_v2', VA]]) {
      const n = src.replace(/\s+/g, ' ');
      expect(n, nimi).not.toMatch(/collection\('kalenteri'\)\s*\.(get|where|orderBy|onSnapshot)\(/);
      expect(n, nimi).not.toMatch(/collection\('kalenteri'\)\s*\.doc\([^)]*\)\s*\.(get|onSnapshot)\(/);
      expect(n, nimi).toContain("httpsCallable('haePelaajanKalenteri')");
    }
  });
  function ymp(kutsuTulos, muisti) {
    const mem = {}; if (muisti) mem[K.tmKalenteriMuistiAvain ? '' : ''] = '';
    const loki = { kutsut: [] };
    const store = { _a: null }; const ls = { setItem: (k, v) => { mem[k] = v; }, getItem: (k) => mem[k] || null };
    if (muisti) ls.setItem('tm_kalenteri_kpv_p1', JSON.stringify(muisti));
    const fbApp = { functions: (r) => { loki.region = r; return { httpsCallable: (n) => async (d) => { loki.kutsut.push([n, d]); if (kutsuTulos instanceof Error) throw kutsuTulos; return { data: kutsuTulos }; } }; } };
    return { loki, ctx: { console: { warn() {} }, Date, Object, String, Array, window: { _db: {}, _fbApp: fbApp, _auth: { currentUser: {} }, localStorage: ls, TM_KALENTERI_ILM: K, _p7Kalenteri: null, _vanhKalenteri: null, _lapsi: null }, _isDemoUser: false, _pelaaja: { id: 'p1', seuraId: 'kpv' }, _ladattu: {}, _tab: 'mina', _sc: 'main', draw() {}, location: { search: '' }, URLSearchParams, _p7DemoKalenteri: () => [] } };
  }
  const tulevaisuus = () => ({ tapahtumat: [{ id: 'a', nimi: 'Treeni', alkaa: new Date(Date.now() + 86400000).toISOString(), paattyy: new Date(Date.now() + 90000000).toISOString() }], laskettu: 'x' });
  it('Pelaaja_v7: kutsuu callablea (europe-west1, seuraId + pelaajaId), tallentaa muistiin; virhe → muistista; ei muistia → tyhjä', async () => {
    const a = ymp(tulevaisuus()); vm.createContext(a.ctx); vm.runInContext(pura(PE, 'async function _p7LataaKalenteri(') + '\nthis.lataa=_p7LataaKalenteri;', a.ctx); await a.ctx.lataa();
    expect(a.loki.region).toBe('europe-west1'); expect(a.loki.kutsut).toEqual([['haePelaajanKalenteri', { seuraId: 'kpv', pelaajaId: 'p1' }]]); expect(a.ctx.window._p7Kalenteri.map((e) => e.id)).toEqual(['a']);
    expect(a.ctx.window.localStorage.getItem('tm_kalenteri_kpv_p1')).toContain('Treeni');
    const b = ymp(new Error('offline'), tulevaisuus()); vm.createContext(b.ctx); vm.runInContext(pura(PE, 'async function _p7LataaKalenteri(') + '\nthis.lataa=_p7LataaKalenteri;', b.ctx); await b.ctx.lataa();
    expect(b.ctx.window._p7Kalenteri.map((e) => e.id)).toEqual(['a']);
    const c = ymp(new Error('offline')); vm.createContext(c.ctx); vm.runInContext(pura(PE, 'async function _p7LataaKalenteri(') + '\nthis.lataa=_p7LataaKalenteri;', c.ctx); await c.ctx.lataa();
    expect(c.ctx.window._p7Kalenteri).toEqual([]);
  });
  it('Vanhempi_v2: kutsuu callablea lapsen tunnisteilla; lapsi vaihtui kesken haun → ei piirretä; RSVP-rooli on "huoltaja" (Rules v3.55)', async () => {
    const a = ymp(tulevaisuus()); const L = { id: 'p1', seuraId: 'kpv' }; a.ctx.window._lapsi = L; a.ctx.window._vanhKalLadattu = false; a.ctx._auth = { currentUser: {} }; a.ctx._db = {};
    vm.createContext(a.ctx); vm.runInContext(pura(VA, 'async function _vanhLataaKalenteri(') + '\nthis.lataa=_vanhLataaKalenteri;', a.ctx); await a.ctx.lataa();
    expect(a.loki.kutsut).toEqual([['haePelaajanKalenteri', { seuraId: 'kpv', pelaajaId: 'p1' }]]); expect(a.ctx.window._vanhKalenteri.map((e) => e.id)).toEqual(['a']);
    expect(pura(VA, 'async function _vanhMerkitseLasna(')).toContain("rooli: 'huoltaja'"); expect(pura(VA, 'async function _vanhMerkitseLasna(')).not.toContain("rooli: 'vanhempi'");
  });
  it('SW: cache-versiot nostettu ja tm_kalenteri_ilmoitus ?v=3 molemmissa', () => {
    expect(lue('sw_pelaaja.js')).toMatch(/const CACHE = 'tm-pelaaja-v(8[6-9]|9\d)'/); expect(lue('sw_vanhempi.js')).toMatch(/const CACHE = 'tm-vanhempi-v(5[7-9]|[6-9]\d)'/);
    expect(PE).toContain('tm_kalenteri_ilmoitus.js?v=3'); expect(VA).toContain('tm_kalenteri_ilmoitus.js?v=3');
  });
});
