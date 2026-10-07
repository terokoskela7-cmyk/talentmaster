/**
 * R6.1b — Master_v16:n jaksofokus-adapterit kutsuvat lib/tm_kehityssilmukka.js:ää: M1–M4 (asetus/vaihto) → tmAsetaJaksofokus, M5 (_msTallenna, sulku) → tmSuljeJakso.
 * Kaikki viisi kirjoittavat YHDELLÄ update():lla (jaksofokus + jaksofokus_historia arrayUnion(...rivit)); päättelyä ei ole adapterissa (ei rinnakkaista logiikkaa).
 * LINKKI (tavoite_alue / valitavoite_idx / poikkeama) on adapterin vastuu: kulkee läpi, säilyy saman jakson uudelleenasetuksessa, EI vuoda eri jaksolle;
 * sulussa tavoite_alue periytyy uuteen jaksoon, valitavoite_idx/poikkeama eivät. Käytös = #781 (r6_0b_jaksoarkistointi.test.js pysyy vihreänä).
 * Fixturet: vain KPV U13 -testipelaajat; kirjoituspolku tasan seurat/kpv/pelaajat/<pid>. Funktiot puretaan lähteestä ja ajetaan vm:ssä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const MASTER = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'TalentMaster_Master_v16.html'), 'utf8');
const J = require('../lib/tm_jaksokooste.js');
const KS = require('../lib/tm_kehityssilmukka.js');
function pura(tunniste) {
  const i = MASTER.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = MASTER.indexOf('{', i); k < MASTER.length; k++) { if (MASTER[k] === '{') syv++; else if (MASTER[k] === '}') { syv--; if (!syv) return MASTER.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const PID = 'm93GBdOaGCUuenMiCL0I';   // KPV U13 -testipelaaja (Topias)
const POLKU = 'seurat/kpv/pelaajat/' + PID;
const ALKOI = '2026-09-01T08:00:00.000Z';

function ymp({ kaada = false, demo = false, offline = false, pelaaja = {}, vt, ehdotus = null } = {}) {
  const p = Object.assign({ id: PID, joukkue: 'KPV U13', etunimi: 'Topias' }, pelaaja);
  p._mIdpTavoite = vt || { valitavoitteet: [{ nimi: 'Vaihtotavoite', konsepti_avain: 'y_vt', kesto_vk: 5 }], aikaraami: { kesto_vk: 6 }, fokus: { alue: 'syotto' } };
  const kirj = [], log = { toastit: [], setit: 0, suljetut: [], warn: [] };
  const doc = (path) => ({ update: async (d) => { if (kaada) throw Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }); kirj.push({ path, data: d }); }, set: async () => { log.setit++; } });
  const _db = { collection: (c) => ({ doc: (a) => ({ collection: (c2) => ({ doc: (b) => doc(c + '/' + a + '/' + c2 + '/' + b) }) }) }) };
  const sb = {
    window: { TM_JAKSOKOOSTE: J, TM_KEHITYSSILMUKKA: KS, _ohjKirjasto: [{ id: 'o1', tyyppi: 'plyo', nimi: 'Plyo', versio: 1 }],
      TM_FYYSTEEMAT_LIB: { tmFyysTeema: (a) => (a ? { avain: a, nimi: 'Teema ' + a, testit: ['lin30m'] } : null), tmOhjelmaTemplaatti: (t) => ({ nimi: 'Pohja ' + t, kuvaus: 'k' }) } },
    _ttPelaaja: () => p, _pelaajatData: [p], _mIdpP: () => p, _mIdpReRender() {}, _mIdpTallennaDok() {}, _renderPinfoFirestore() {},
    _mTtItems: () => [{ avain: 'y_h2', nimi: 'SYÖTTÄMINEN', koodi: 'H2' }, { avain: 'y_h3', nimi: 'PELINLUKU', koodi: 'H3' }], _devIkaSp: () => ({ ika: 12 }), _ttNormPositio: () => 'KK', _mTtEhdotus: () => ehdotus,
    _msSiltaKonsepti: (a) => ({ nimi: 'Silta ' + a, koodi: 'S1' }), document: { getElementById: (id) => (/Modal$/.test(id) ? { remove() { log.suljetut.push(id); } } : null) }, _uid: 'valm-uid', _rooli: 'valmentaja', tmPhvKoodi: () => 'PRE',
    firebase: { auth: () => ({ currentUser: { uid: 'valm-uid' } }), firestore: { FieldValue: { arrayUnion: (...a) => ({ __arrayUnion: a }) } } },
    _mTuoreToken: async () => {}, _mVerkkoEnnenSulkua: () => !offline, _demo: demo, _seuraId: 'kpv', _db,
    toast: (t, k) => log.toastit.push([t, k]), masterT: (x) => x, console: { warn: (...a) => log.warn.push(a) }, TM_VIRHEKOODI: require('../lib/tm_virhekoodi.js'), Date, Object, Array, Promise, Math, confirm: () => true,
  };
  vm.createContext(sb);
  vm.runInContext([pura('function _mJaksoVaihto('), pura('async function _mKirjoitaJaksofokus('), pura('window._ttVieTreeniin = async function'), pura('window._msAsetaFyysFokus = async function'),
    pura('window._ohjKaytaOhjelma = async function'), pura('window._mIdpVtAktivoi = async function'), pura('window._msTallenna = async function')].join(';\n') + ';', sb);
  return { sb, p, kirj, log };
}
const SULKU = (p, o = {}) => ({ p, jf: p.jaksofokus, alkoi: ALKOI, loppu: '2026-10-04T10:00:00.000Z', harjoituksia: 5, lasnaolo: { paikalla: 4, yhteensa: 5, tiedossa: 5 }, arvioItse: 4, arvioAikuis: 3, tulos: 'parani', deltaMitattu: null, ...o });

describe('adapterit kutsuvat libiä — ei rinnakkaista päättelyä', () => {
  it('_mJaksoVaihto → tmAsetaJaksofokus; _msTallenna → tmSuljeJakso; ei suoraa tmJaksonVaihto/tmHistoriaEntry-kutsua adaptereissa', () => {
    expect(pura('function _mJaksoVaihto(')).toMatch(/TM_KEHITYSSILMUKKA\.tmAsetaJaksofokus\(/);
    const sulku = pura('window._msTallenna = async function');
    expect(sulku).toMatch(/TM_KEHITYSSILMUKKA\.tmSuljeJakso\(/); expect(sulku).not.toMatch(/tmHistoriaEntry|tmJaksonVaihto|jaksofokus_historia: hist/);
    ['_ttVieTreeniin', '_msAsetaFyysFokus', '_ohjKaytaOhjelma', '_mIdpVtAktivoi'].forEach((n) => expect(pura('window.' + n + ' = async function'), n).not.toMatch(/tmHistoriaEntry|tmJaksonVaihto|tmSamaJakso/));
  });
  it('kaikki 5 kirjoittavat _mKirjoitaJaksofokus:lla (update + arrayUnion); Master lataa tm_kehityssilmukka.js', () => {
    expect((MASTER.match(/await _mKirjoitaJaksofokus\(/g) || []).length).toBe(5);
    expect(pura('async function _mKirjoitaJaksofokus(')).toMatch(/\.update\(upd\)/); expect(MASTER).toContain('lib/tm_kehityssilmukka.js?v=2');
    expect(MASTER.indexOf('tm_jaksokooste.js')).toBeLessThan(MASTER.indexOf('tm_kehityssilmukka.js'));
  });
});

describe('M1 _ttVieTreeniin — linkki: tavoite_alue + poikkeama', () => {
  const PELAAJA = { idp_fokus: { alue: 'syotto' } };
  it('uusi jakso: tavoite_alue (idp_fokus.alue) ja poikkeama (ehdotus ≠ valinta) kirjoitetaan jaksofokukseen', async () => {
    const e = ymp({ pelaaja: Object.assign({ jaksofokus: null }, PELAAJA), ehdotus: { tyyppi: 'teknis_taktinen', konsepti_avain: 'y_h3' } });
    await e.sb.window._ttVieTreeniin(PID, 'y_h2');
    expect(e.kirj.length).toBe(1); expect(e.kirj[0].path).toBe(POLKU);
    expect(e.kirj[0].data.jaksofokus).toMatchObject({ konsepti_avain: 'y_h2', tavoite_alue: 'syotto', poikkeama: true, lahde: 'valmentaja' });
  });
  it('ei poikkeamaa kun valinta = ehdotus; ei idp_fokusta → ei tavoite_alue-kenttää', async () => {
    const a = ymp({ pelaaja: Object.assign({ jaksofokus: null }, PELAAJA), ehdotus: { tyyppi: 'teknis_taktinen', konsepti_avain: 'y_h2' } });
    await a.sb.window._ttVieTreeniin(PID, 'y_h2'); expect(a.kirj[0].data.jaksofokus.poikkeama).toBeUndefined(); expect(a.kirj[0].data.jaksofokus.tavoite_alue).toBe('syotto');
    const b = ymp({ pelaaja: { jaksofokus: null } }); await b.sb.window._ttVieTreeniin(PID, 'y_h2'); expect('tavoite_alue' in b.kirj[0].data.jaksofokus).toBe(false);
  });
  it('SAMA jakso uudelleen: alkoi + aiempi valitavoite_idx SÄILYVÄT (vanha ⊕ uusi), ei arkistoa', async () => {
    const e = ymp({ pelaaja: Object.assign({ jaksofokus: { konsepti_avain: 'y_h2', konsepti_nimi: 'SYÖTTÄMINEN', alkoi: ALKOI, kesto_vk: 6, lahde: 'valmentaja', valitavoite_idx: 1, tavoite_alue: 'vanha' } }, PELAAJA) });
    await e.sb.window._ttVieTreeniin(PID, 'y_h2');
    const jf = e.kirj[0].data.jaksofokus; expect(jf.alkoi).toBe(ALKOI); expect(jf.valitavoite_idx).toBe(1); expect(jf.tavoite_alue).toBe('syotto'); expect(Object.keys(e.kirj[0].data)).toEqual(['jaksofokus']);
  });
  it('ERI jakso: edellisen jakson linkki (valitavoite_idx/poikkeama) EI vuoda uuteen; edellinen arkistoon', async () => {
    const e = ymp({ pelaaja: { jaksofokus: { konsepti_avain: 'y_vanha', konsepti_nimi: 'Vanha', alkoi: ALKOI, lahde: 'valmentaja', valitavoite_idx: 2, poikkeama: true, tavoite_alue: 'vanha' } } });
    await e.sb.window._ttVieTreeniin(PID, 'y_h2');
    const d = e.kirj[0].data; expect(d.jaksofokus.valitavoite_idx).toBeUndefined(); expect(d.jaksofokus.poikkeama).toBeUndefined(); expect(d.jaksofokus.tavoite_alue).toBeUndefined();
    expect(d.jaksofokus_historia.__arrayUnion[0]).toMatchObject({ konsepti_avain: 'y_vanha', alkoi: ALKOI, sulkutapa: 'korvattu', tulos: null });
  });
});

describe('M2 _msAsetaFyysFokus ja M3 _ohjKaytaOhjelma — linkki', () => {
  it('M2: eri jakso → vanha tavoite_alue ei vuoda fyysiselle jaksolle; arkistorivissä vanha jakso', async () => {
    const e = ymp({ pelaaja: { jaksofokus: { konsepti_avain: 'y_vanha', konsepti_nimi: 'Vanha', alkoi: ALKOI, tavoite_alue: 'syotto', valitavoite_idx: 0 } } });
    await e.sb.window._msAsetaFyysFokus(PID, 'fy_nopeus');
    expect(e.kirj[0].data.jaksofokus).toMatchObject({ konsepti_avain: 'fy_nopeus', domeeni: 'fyysinen' }); expect(e.kirj[0].data.jaksofokus.tavoite_alue).toBeUndefined();
    expect(e.kirj[0].data.jaksofokus_historia.__arrayUnion[0]).toMatchObject({ konsepti_avain: 'y_vanha', sulkutapa: 'korvattu' });
  });
  it('M3: ohjelma liitetään käynnissä olevaan fyysiseen jaksoon → alkoi + tavoite_alue + valitavoite_idx SÄILYVÄT, ei arkistoa', async () => {
    const e = ymp({ pelaaja: { jaksofokus: { konsepti_avain: 'fy_nopeus', konsepti_nimi: 'Nopeus', domeeni: 'fyysinen', alkoi: ALKOI, kesto_vk: 4, lahde: 'silta_d1', tavoite_alue: 'nopeus', valitavoite_idx: 1 } } });
    await e.sb.window._ohjKaytaOhjelma(PID, 'fy_nopeus', 'o1');
    const jf = e.kirj[0].data.jaksofokus; expect(jf).toMatchObject({ alkoi: ALKOI, tavoite_alue: 'nopeus', valitavoite_idx: 1 }); expect(jf.ohjelma.ohjelma_id).toBe('o1');
    expect(Object.keys(e.kirj[0].data)).toEqual(['jaksofokus']);
  });
  it('M3: edellinen teknis-taktinen jakso → uusi fyysinen jakso + arkisto; vanha linkki ei vuoda', async () => {
    const e = ymp({ pelaaja: { jaksofokus: { konsepti_avain: 'y_vanha', konsepti_nimi: 'Vanha', alkoi: ALKOI, tavoite_alue: 'syotto' } } });
    await e.sb.window._ohjKaytaOhjelma(PID, 'fy_nopeus', 'o1');
    expect(e.kirj[0].data.jaksofokus.tavoite_alue).toBeUndefined(); expect(e.kirj[0].data.jaksofokus_historia.__arrayUnion[0]).toMatchObject({ konsepti_avain: 'y_vanha' });
  });
});

describe('M4 _mIdpVtAktivoi — linkki: tavoite_alue + valitavoite_idx', () => {
  it('välitavoitteesta jakso: tavoite_alue (fokus.alue) + valitavoite_idx (i) kirjoitetaan', async () => {
    const e = ymp({ pelaaja: { jaksofokus: null } });
    await e.sb.window._mIdpVtAktivoi(PID, 0);
    expect(e.kirj.length).toBe(1); expect(e.kirj[0].path).toBe(POLKU);
    expect(e.kirj[0].data.jaksofokus).toMatchObject({ konsepti_avain: 'y_vt', konsepti_nimi: 'Vaihtotavoite', tavoite_alue: 'syotto', valitavoite_idx: 0, lahde: 'valmentaja', kesto_vk: 5 });
  });
  it('SAMA välitavoite uudelleen: alkoi säilyy; ERI jakso: edellinen arkistoon, vanha valitavoite_idx ei vuoda', async () => {
    const sama = ymp({ pelaaja: { jaksofokus: { konsepti_avain: 'y_vt', konsepti_nimi: 'Vaihtotavoite', alkoi: ALKOI, kesto_vk: 5, lahde: 'valmentaja', valitavoite_idx: 0, tavoite_alue: 'syotto' } } });
    await sama.sb.window._mIdpVtAktivoi(PID, 0); expect(sama.kirj[0].data.jaksofokus.alkoi).toBe(ALKOI); expect(Object.keys(sama.kirj[0].data)).toEqual(['jaksofokus']);
    const eri = ymp({ pelaaja: { jaksofokus: { konsepti_avain: 'y_muu', konsepti_nimi: 'Muu', alkoi: ALKOI, lahde: 'valmentaja', valitavoite_idx: 7, tavoite_alue: 'muu' } } });
    await eri.sb.window._mIdpVtAktivoi(PID, 0);
    expect(eri.kirj[0].data.jaksofokus.valitavoite_idx).toBe(0); expect(eri.kirj[0].data.jaksofokus_historia.__arrayUnion[0]).toMatchObject({ konsepti_avain: 'y_muu', alkoi: ALKOI });
  });
});

describe('M5 _msTallenna (sulku) — tmSuljeJakso + yksi update', () => {
  const JF = { konsepti_avain: 'y_h2', konsepti_nimi: 'SYÖTTÄMINEN', alkoi: ALKOI, kesto_vk: 6, lahde: 'valmentaja', tavoite_alue: 'syotto', valitavoite_idx: 2, poikkeama: true };
  const aja = async (e, uusiAvain) => { e.sb.window._msSulkuTila = SULKU(e.p); await e.sb.window._msTallenna(uusiAvain); };
  it('ilman uutta jaksoa: YKSI update {jaksofokus:null, jaksofokus_historia:arrayUnion(sulkurivi)}; rivi sulkutapa "suljettu", arviot, kalibraatio, ISO; ei set', async () => {
    const e = ymp({ pelaaja: { jaksofokus: JF } }); await aja(e, null);
    expect(e.kirj.length).toBe(1); expect(e.log.setit).toBe(0); expect(e.kirj[0].path).toBe(POLKU);
    expect(Object.keys(e.kirj[0].data).sort()).toEqual(['jaksofokus', 'jaksofokus_historia']); expect(e.kirj[0].data.jaksofokus).toBeNull();
    const r = e.kirj[0].data.jaksofokus_historia.__arrayUnion; expect(r.length).toBe(1);
    expect(r[0]).toMatchObject({ konsepti_avain: 'y_h2', domeeni: 'teknis_taktinen', alkoi: ALKOI, paattyi: '2026-10-04T10:00:00.000Z', sulkutapa: 'suljettu', harjoituksia: 5, arvio_itse: 4, arvio_valmentaja: 3, arvioija_rooli: 'valmentaja', tulos: 'parani', lahde_seuraava: null, kalibraatio_ero: J.tmKalibraatio(4, 3) });
    expect(new Date(r[0].suljettu).toISOString()).toBe(r[0].suljettu);
    expect(e.p.jaksofokus).toBeNull(); expect(e.p.jaksofokus_historia.length).toBe(1);
  });
  it('uusi jakso (teknis): lahde_seuraava "silta"; tavoite_alue PERIYTYY, valitavoite_idx/poikkeama EIVÄT; uusi alkoi = nyt', async () => {
    const e = ymp({ pelaaja: { jaksofokus: JF } }); await aja(e, 'y_h3');
    const d = e.kirj[0].data;
    expect(d.jaksofokus).toMatchObject({ konsepti_avain: 'y_h3', konsepti_nimi: 'Silta y_h3', domeeni: 'teknis_taktinen', lahde: 'silta', tavoite_alue: 'syotto', kesto_vk: 4 });
    expect(d.jaksofokus.valitavoite_idx).toBeUndefined(); expect(d.jaksofokus.poikkeama).toBeUndefined(); expect(d.jaksofokus.alkoi).not.toBe(ALKOI);
    expect(d.jaksofokus_historia.__arrayUnion[0]).toMatchObject({ lahde_seuraava: 'silta', sulkutapa: 'suljettu' });
  });
  it('R6.1c: tavoite_alue periytyy (periytaLinkki; sääntö + oma-arvo-voittaa lib-testeissä); suljetun tyhjä alue ei periydy; valitavoite_idx/poikkeama ei koskaan', async () => {
    const jf = (o) => Object.assign({}, JF, o);
    const aja2 = async (jaksofokus, uusiLisa) => {
      const e = ymp({ pelaaja: { jaksofokus } });
      e.sb._msSiltaKonsepti = (a) => Object.assign({ nimi: 'Silta ' + a, koodi: 'S1' }, uusiLisa);   // uuden jakson oma kenttä (esim. tavoite_alue) välittyy
      await aja(e, 'y_h3'); return e.kirj[0].data.jaksofokus;
    };
    expect((await aja2(jf({ tavoite_alue: 'syotto' }), {})).tavoite_alue).toBe('syotto');   // puuttuu → periytyy
    expect(pura('window._msTallenna = async function')).toMatch(/periytaLinkki: true/);
    const tyhja = await aja2(jf({ tavoite_alue: '' }), {}); expect('tavoite_alue' in tyhja).toBe(false);   // suljetun '' ei periydy
    const eiAlue = await aja2({ konsepti_avain: 'y_h2', konsepti_nimi: 'X', alkoi: ALKOI }, {}); expect('tavoite_alue' in eiAlue).toBe(false);
    const j = await aja2(jf({ tavoite_alue: 'syotto', valitavoite_idx: 4, poikkeama: true }), {}); expect(j.valitavoite_idx).toBeUndefined(); expect(j.poikkeama).toBeUndefined();
  });
  it('fyysinen sulku: uusi fyysinen jakso, lahde_seuraava "silta_d1"; ei tavoite_alue-kenttää jos suljetulla ei ollut', async () => {
    const e = ymp({ pelaaja: { jaksofokus: { konsepti_avain: 'fy_nopeus', konsepti_nimi: 'Nopeus', domeeni: 'fyysinen', alkoi: ALKOI, lahde: 'silta_d1', ohjelma: { ohjelma_id: 'o1', tyyppi: 'plyo' } } } }); await aja(e, 'fy_voima');
    const d = e.kirj[0].data; expect(d.jaksofokus).toMatchObject({ konsepti_avain: 'fy_voima', domeeni: 'fyysinen', lahde: 'silta_d1' }); expect('tavoite_alue' in d.jaksofokus).toBe(false);
    expect(d.jaksofokus_historia.__arrayUnion[0]).toMatchObject({ domeeni: 'fyysinen', lahde_seuraava: 'silta_d1', ohjelma: { ohjelma_id: 'o1', tyyppi: 'plyo' }, sulkutapa: 'suljettu' });
  });
  it('D53 · fysiikkajakson asetus: permission-denied → toast + koodi, konsoli, modaali (_msFyysModal) AUKI, jaksofokus ennallaan; onnistuessa modaali sulkeutuu', async () => {
    const e = ymp({ kaada: true, pelaaja: { jaksofokus: { konsepti_avain: 'y_vanha', konsepti_nimi: 'Vanha', alkoi: ALKOI } } }); const ennen = JSON.stringify(e.p.jaksofokus);
    await e.sb.window._msAsetaFyysFokus(PID, 'fy_nopeus');
    expect(e.log.toastit).toEqual([['Tallennus epäonnistui (permission-denied)', 'error']]); expect(e.log.warn.some((a) => a[0] === '[msAsetaFyysFokus]')).toBe(true); expect(e.log.suljetut).toEqual([]); expect(JSON.stringify(e.p.jaksofokus)).toBe(ennen);
    const ok = ymp({ pelaaja: { jaksofokus: { konsepti_avain: 'y_vanha', konsepti_nimi: 'Vanha', alkoi: ALKOI } } }); await ok.sb.window._msAsetaFyysFokus(PID, 'fy_nopeus'); expect(ok.log.suljetut).toEqual(['_msFyysModal']); expect(ok.p.jaksofokus.konsepti_avain).toBe('fy_nopeus');
  });
  it('kirjoitus epäonnistuu: virheilmoitus, lokaali historia ei päivity; offline: ei mitään (lomake jää auki); demo: ei kirjoitusta, lokaali rivi', async () => {
    const f = ymp({ kaada: true, pelaaja: { jaksofokus: JF } }); await aja(f, null);
    expect(f.kirj).toEqual([]); expect(f.p.jaksofokus_historia).toBeUndefined(); expect(f.log.toastit.some(([, k]) => k === 'error')).toBe(true);
    // D53: virhe näkyy aina (toast + koodi + konsoli); sulkulomake jää auki (ei suljeta, tila ja syötetty data säilyvät), jaksofokus ei muutu
    expect(f.log.toastit).toEqual([['Tallennus epäonnistui (permission-denied)', 'error']]); expect(f.log.warn.some((a) => a[0] === '[msTallenna]')).toBe(true);
    expect(f.log.suljetut).toEqual([]); expect(f.sb.window._msSulkuTila).not.toBeNull(); expect(f.p.jaksofokus).toEqual(JF);
    const ok = ymp({ pelaaja: { jaksofokus: JF } }); await aja(ok, null); expect(ok.log.suljetut).toEqual(['_msSulkuModal']); expect(ok.sb.window._msSulkuTila).toBeNull();   // onnistuessa modaali sulkeutuu
    const o = ymp({ offline: true, pelaaja: { jaksofokus: JF } }); await aja(o, 'y_h3');
    expect(o.kirj).toEqual([]); expect(o.p.jaksofokus).toEqual(JF); expect(o.p.jaksofokus_historia).toBeUndefined(); expect(o.sb.window._msSulkuTila).not.toBeNull();
    const d = ymp({ demo: true, pelaaja: { jaksofokus: JF } }); await aja(d, null);
    expect(d.kirj).toEqual([]); expect(d.p.jaksofokus_historia.length).toBe(1);
  });
});

describe('kaikki viisi: kirjoituspolku tasan KPV U13 -pelaajan dokki, update (ei set)', () => {
  const PELAAJA = { idp_fokus: { alue: 'syotto' }, jaksofokus: { konsepti_avain: 'y_vanha', konsepti_nimi: 'Vanha', alkoi: ALKOI, lahde: 'valmentaja' } };
  it('M1–M5', async () => {
    const kaikki = [];
    for (const kutsu of [(e) => e.sb.window._ttVieTreeniin(PID, 'y_h2'), (e) => e.sb.window._msAsetaFyysFokus(PID, 'fy_nopeus'), (e) => e.sb.window._ohjKaytaOhjelma(PID, 'fy_nopeus', 'o1'), (e) => e.sb.window._mIdpVtAktivoi(PID, 0),
      async (e) => { e.sb.window._msSulkuTila = SULKU(e.p); await e.sb.window._msTallenna('y_h3'); }]) {
      const e = ymp({ pelaaja: JSON.parse(JSON.stringify(PELAAJA)) }); await kutsu(e); kaikki.push(e);
    }
    kaikki.forEach((e, i) => { expect(e.kirj.length, 'M' + (i + 1)).toBe(1); expect(e.kirj[0].path).toBe(POLKU); expect(e.log.setit).toBe(0); expect(e.kirj[0].data.jaksofokus_historia.__arrayUnion.length).toBe(1); });
  });
});
