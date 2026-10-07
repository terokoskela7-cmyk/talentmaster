/**
 * R6.1c — VP_v25:n KAIKKI 8 jaksofokus-kirjoituspistettä lib/tm_kehityssilmukka.js:n kautta.
 *  V1 _vpAsetaFyysFokus · V2 _vpOhjKaytaOhjelma · V3 _vpValitavoiteAktivoi · V4 _vpTtVieTreeniin · V5 _vpJfAsetaKehitysFokus  → tmAsetaJaksofokus (arkistointi avainsäännöllä tmSamaJakso)
 *  V6 _vpJfTavoitteetTallenna · V7 _vpJfOsaArvioSet                                                                         → tmPaivitaJaksofokus (dot-polut, POISTA → FieldValue.delete())
 *  V8 _vpSulkuTallenna                                                                                                       → tmSuljeJakso + arrayUnion (ei koko taulukon kirjoitusta)
 * Poistettu: _vpJfArkistoiVaihdossa (rinnakkainen arkistointi) ja _vpJfAlkoiJatka. VP:n rivit: tulos:'vaihdettu', lahde_seuraava = uuden jakson domeeni, sitoumus-/d3-snapshotit säilyvät + sulkutapa.
 * Fixturet: vain KPV U13 -testipelaajat; kirjoituspolku tasan seurat/kpv/pelaajat/<pid>; update() (ei set). Funktiot puretaan lähteestä ja ajetaan vm:ssä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const VP = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'TalentMaster_VP_v25.html'), 'utf8');
const J = require('../lib/tm_jaksokooste.js');
const KS = require('../lib/tm_kehityssilmukka.js');
function pura(tunniste) {
  const i = VP.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) { if (VP[k] === '{') syv++; else if (VP[k] === '}') { syv--; if (!syv) return VP.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const PID = 'm93GBdOaGCUuenMiCL0I';   // KPV U13 -testipelaaja (Topias)
const POLKU = 'seurat/kpv/pelaajat/' + PID;
const ALKOI = '2026-09-01T08:00:00.000Z';
const DELETE = { __delete: true };

function ymp({ kaada = false, demo = false, pelaaja = {}, mergeLisa = null } = {}) {
  const p = Object.assign({ id: PID, joukkue: 'KPV U13', etunimi: 'Topias' }, pelaaja);
  p._idpTavoite = { valitavoitteet: [{ nimi: 'Vaihtotavoite', konsepti_avain: 'y_vt', kesto_vk: 5 }], aikaraami: { kesto_vk: 6 }, fokus: { alue: 'syotto' } };
  const kirj = [], log = { toastit: [], setit: 0, renderit: 0, suljetut: [], warn: [] };
  const doc = (path) => ({ update: async (d) => { if (kaada) throw Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }); kirj.push({ path, data: d }); }, set: async () => { log.setit++; } });
  const db = { collection: (c) => ({ doc: (a) => ({ collection: (c2) => ({ doc: (b) => doc(c + '/' + a + '/' + c2 + '/' + b) }) }) }) };
  const sb = {
    db, _seuraId: 'kpv', _isDemoMode: demo, _uid: 'vp-uid', vpT: (x) => x, toast: (t, k) => log.toastit.push([t, k]), console: { warn: (...a) => log.warn.push(a) }, TM_VIRHEKOODI: require('../lib/tm_virhekoodi.js'), Date, Object, Array, Promise, Math, JSON, String, Number,
    firebase: { auth: () => ({ currentUser: { uid: 'vp-uid', getIdToken: async () => 't' } }), firestore: { FieldValue: { arrayUnion: (...a) => ({ __arrayUnion: a }), delete: () => DELETE } } },
    window: { TM_JAKSOKOOSTE: J, TM_KEHITYSSILMUKKA: KS, TM_VIIKKOKATSAUS: require('../lib/tm_viikkokatsaus.js'), _vpTtLahde: 'vp', _vpOhjKirjasto: [{ id: 'o1', tyyppi: 'plyo', nimi: 'Plyo', versio: 1, laatija_uid: 'u', laatija_rooli: 'vp' }],
      TM_FYYSTEEMAT_LIB: { tmFyysTeema: (a) => (a ? { avain: a, nimi: 'Teema ' + a, testit: ['lin30m'] } : null), tmOhjelmaTemplaatti: (t) => ({ nimi: 'Pohja ' + t, kuvaus: 'k' }) },
      TM_JAKSOFOKUS: { tmJfKonsepti: (d, a) => ({ avain: a, nimi: 'Konsepti ' + a, koodi: 'K1' }) } },
    _vpTtPelaaja: () => p, _pelaajat: [p], _vpIdpPelaaja: () => p, _vpKausitavoiteReRender() {}, _vpTallennaIdpDok: async () => true, _vpAloitusReRender() { log.renderit++; }, _vpArvReRender() {}, renderJaksofokus() {},
    _currentWs: 'x', _jfSulje: () => false, _vpJfMergeLisakentat: (jf) => { if (mergeLisa) mergeLisa(jf); return jf; }, _vpJfInlineReRender() {}, _vpKehAskelReRender() { log.renderit++; },
    _dimIkaSp: () => ({ ika: 12 }), _vpTtNormPositio: () => 'KK', _ttItems: () => [{ avain: 'y_h2', koodi: 'H2' }], _vpJfKanonNimi: (a) => 'Nimi ' + a, _vpJfKestoNyt: () => 6, _vpTtEhdotus: () => null,
    _vpSiltaKonsepti: (a) => ({ nimi: 'Silta ' + a, koodi: 'S1' }), tmPhvKoodi: () => 'PRE', document: { getElementById: (id) => (/Modal$/.test(id) ? { remove() { log.suljetut.push(id); } } : null) },
  };
  vm.createContext(sb);
  vm.runInContext([pura('function _vpJfSnapshotit('), pura('function _vpJaksoVaihto('), pura('async function _vpJfKirjoita('), pura('async function _vpKirjoitaJaksofokus('), pura('function _vpJfPolut('),
    pura('window._vpAsetaFyysFokus = async function'), pura('window._vpOhjKaytaOhjelma = async function'), pura('window._vpValitavoiteAktivoi = function'), pura('window._vpTtVieTreeniin = async function'),
    pura('window._vpJfAsetaKehitysFokus = async function'), pura('window._vpJfTavoitteetTallenna = async function'), pura('window._vpJfOsaArvioSet = function'), pura('window._vpSulkuTallenna = async function')].join(';\n') + ';', sb);
  return { sb, p, kirj, log };
}
const lopeta = () => new Promise((r) => setTimeout(r, 0));

describe('V1–V5: asetus/vaihto → tmAsetaJaksofokus (avainsääntö), update + arrayUnion', () => {
  const POLUT = {
    _vpAsetaFyysFokus: { kutsu: (w) => w._vpAsetaFyysFokus(PID, 'fy_nopeus'), uusiAvain: 'fy_nopeus', domeeni: 'fyysinen', sama: { konsepti_avain: 'fy_nopeus', konsepti_nimi: 'Teema fy_nopeus', domeeni: 'fyysinen', alkoi: ALKOI, kesto_vk: 4, lahde: 'silta_d1' }, eri: { domeeni: 'fyysinen' } },
    _vpOhjKaytaOhjelma: { kutsu: (w) => w._vpOhjKaytaOhjelma(PID, 'fy_nopeus', 'o1'), uusiAvain: 'fy_nopeus', domeeni: 'fyysinen', sama: { konsepti_avain: 'fy_nopeus', konsepti_nimi: 'Teema fy_nopeus', domeeni: 'fyysinen', alkoi: ALKOI, kesto_vk: 4, lahde: 'silta_d1' }, eri: {} },
    _vpValitavoiteAktivoi: { kutsu: async (w) => { w._vpValitavoiteAktivoi(PID, 0); await lopeta(); }, uusiAvain: 'y_vt', domeeni: 'teknis_taktinen', sama: { konsepti_avain: 'y_vt', konsepti_nimi: 'Vaihtotavoite', alkoi: ALKOI, kesto_vk: 5, lahde: 'vp', valitavoite_idx: 0 }, eri: {} },
    _vpTtVieTreeniin: { kutsu: (w) => w._vpTtVieTreeniin(PID, 'y_h2'), uusiAvain: 'y_h2', domeeni: 'teknis_taktinen', sama: { konsepti_avain: 'y_h2', konsepti_nimi: 'Nimi y_h2', alkoi: ALKOI, kesto_vk: 6, lahde: 'vp' }, eri: {} },
    _vpJfAsetaKehitysFokus: { kutsu: (w) => w._vpJfAsetaKehitysFokus(PID, 'henkinen', 'h_x'), uusiAvain: 'h_x', domeeni: 'henkinen', sama: { konsepti_avain: 'h_x', konsepti_nimi: 'Konsepti h_x', domeeni: 'henkinen', alkoi: ALKOI, kesto_vk: 6, lahde: 'vp' }, eri: { domeeni: 'henkinen' } },
  };
  const EDELLINEN = (o) => Object.assign({ konsepti_avain: 'y_edellinen', konsepti_nimi: 'Edellinen', alkoi: ALKOI, kesto_vk: 6, lahde: 'vp', valitavoite_idx: 3, poikkeama: true, tavoite_alue: 'vanha' }, o);
  Object.keys(POLUT).forEach((n) => {
    const P = POLUT[n];
    describe('polku ' + n, () => {
      it('ERI jakso: YKSI update samaan KPV U13 -pelaajadokkiin: uusi jaksofokus (vanhat jäänteet pois) + jaksofokus_historia arrayUnion(VP-rivi); ei set', async () => {
        const e = ymp({ pelaaja: { jaksofokus: EDELLINEN(P.eri), _idpSitoumus: { itsearvio: { q1: 'a', q2: 'b', q3: 'c' }, sitoumus_pvm: '2026-09-02', jakso_alkoi: ALKOI }, d3_viimeisin: { pisteet: { a: 3 } } } });
        await P.kutsu(e.sb.window); await lopeta();
        expect(e.kirj.length).toBe(1); expect(e.log.setit).toBe(0); expect(e.kirj[0].path).toBe(POLKU);
        const d = e.kirj[0].data; expect(Object.keys(d).sort()).toEqual(['jaksofokus', 'jaksofokus_historia']);
        expect(d.jaksofokus.konsepti_avain).toBe(P.uusiAvain); expect(d.jaksofokus.poikkeama).toBeUndefined(); expect(d.jaksofokus.valitavoite_idx === 3).toBe(false); expect(d.jaksofokus.tavoite_alue).not.toBe('vanha');
        expect(d.jaksofokus_historia.__arrayUnion.length).toBe(1);
        const r = d.jaksofokus_historia.__arrayUnion[0];
        expect(r).toMatchObject({ konsepti_avain: 'y_edellinen', alkoi: ALKOI, tulos: 'vaihdettu', sulkutapa: 'korvattu', lahde_seuraava: P.domeeni });   // VP:n rivi: tulos + lahde_seuraava = uusi domeeni + additiivinen sulkutapa
        expect(r.sitoumus_snapshot).toMatchObject({ q1: 'a', q2: 'b', q3: 'c', sitoumus_pvm: '2026-09-02' }); expect(r.d3_snapshot).toEqual({ a: 3 });   // snapshotit säilyvät
        expect(new Date(r.paattyi).toISOString()).toBe(r.paattyi); expect(r.suljettu).toBe(r.paattyi);
        expect(e.p.jaksofokus_historia.length).toBe(1);   // lokaali vasta onnistumisen jälkeen
      });
      it('SAMA jakso (avainsääntö): alkoi säilyy, EI arkistoriviä (update vain jaksofokus)', async () => {
        const e = ymp({ pelaaja: { jaksofokus: Object.assign({}, P.sama) } });
        await P.kutsu(e.sb.window); await lopeta();
        expect(e.kirj.length).toBe(1); expect(Object.keys(e.kirj[0].data)).toEqual(['jaksofokus']); expect(e.kirj[0].data.jaksofokus.alkoi).toBe(ALKOI); expect(e.p.jaksofokus_historia).toBeUndefined();
      });
      it('EI edellistä jaksoa: ei arkistoa; kirjoitus tasan tämän pelaajan dokkiin', async () => {
        const e = ymp({ pelaaja: { jaksofokus: null } }); await P.kutsu(e.sb.window); await lopeta();
        expect(e.kirj.length).toBe(1); expect(e.kirj[0].path).toBe(POLKU); expect(Object.keys(e.kirj[0].data)).toEqual(['jaksofokus']);
      });
      it('kirjoitus epäonnistuu: virheilmoitus, lokaali jaksofokus_historia EI päivity', async () => {
        const e = ymp({ kaada: true, pelaaja: { jaksofokus: EDELLINEN(P.eri) } }); await P.kutsu(e.sb.window); await lopeta();
        expect(e.kirj).toEqual([]); expect(e.p.jaksofokus_historia).toBeUndefined(); expect(e.log.toastit.some(([, k]) => k === 'error')).toBe(true);
      });
      it('demo: ei kirjoitusta; lokaali historia päivittyy (ei virhettä)', async () => {
        const e = ymp({ demo: true, pelaaja: { jaksofokus: EDELLINEN(P.eri) } }); await P.kutsu(e.sb.window); await lopeta();
        expect(e.kirj).toEqual([]); expect(e.p.jaksofokus_historia.length).toBe(1); expect(e.log.toastit.some(([, k]) => k === 'error')).toBe(false);
      });
    });
  });
  it('V2 (fyysinen, ei konsepti_avainta): sama ohjelma_id → sama jakso (alkoi säilyy, ei arkistoa); eri ohjelma-tunniste → arkistoidaan', async () => {
    const sama = ymp({ pelaaja: { jaksofokus: { domeeni: 'fyysinen', konsepti_nimi: 'Fyysinen', alkoi: ALKOI, kesto_vk: 4, lahde: 'silta_d1', ohjelma: { ohjelma_id: 'o1', tyyppi: 'plyo' } } } });
    await sama.sb.window._vpOhjKaytaOhjelma(PID, 'fy_nopeus', 'o1');
    expect(Object.keys(sama.kirj[0].data)).toEqual(['jaksofokus']); expect(sama.kirj[0].data.jaksofokus.alkoi).toBe(ALKOI);
    const eri = ymp({ pelaaja: { jaksofokus: { domeeni: 'fyysinen', konsepti_nimi: 'Fyysinen', alkoi: ALKOI, ohjelma: { ohjelma_id: null, tyyppi: 'voima' } } } });
    await eri.sb.window._vpAsetaFyysFokus(PID, 'fy_nopeus');
    expect(eri.kirj[0].data.jaksofokus_historia.__arrayUnion[0]).toMatchObject({ domeeni: 'fyysinen', alkoi: ALKOI, ohjelma: { tyyppi: 'voima' }, sulkutapa: 'korvattu' });
  });
  it('linkki (V3): tavoite_alue + valitavoite_idx kirjoitetaan; V4: poikkeama/tavoite_alue idp_fokus:sta', async () => {
    const a = ymp({ pelaaja: { jaksofokus: null } }); await a.sb.window._vpValitavoiteAktivoi(PID, 0); await lopeta();
    expect(a.kirj[0].data.jaksofokus).toMatchObject({ konsepti_avain: 'y_vt', tavoite_alue: 'syotto', valitavoite_idx: 0, domeeni: 'teknis_taktinen' });
    const b = ymp({ pelaaja: { jaksofokus: null, idp_fokus: { alue: 'syotto' } } }); b.sb._vpTtEhdotus = () => ({ tyyppi: 'teknis_taktinen', konsepti_avain: 'y_muu' });
    await b.sb.window._vpTtVieTreeniin(PID, 'y_h2');
    expect(b.kirj[0].data.jaksofokus).toMatchObject({ tavoite_alue: 'syotto', poikkeama: true });
  });
});

describe('V6 _vpJfTavoitteetTallenna — dot-path, ei jakson vaihtoa', () => {
  const JF = { konsepti_avain: 'y_h2', konsepti_nimi: 'SYÖTTÄMINEN', alkoi: ALKOI, kesto_vk: 6, linkitetyt: [{ domeeni: 'fyysinen', konsepti_avain: 'fy_nopeus' }], osa_arviot: { y_h2: { a: 2 } }, onnistumiskriteeri: 'vanha' };
  it('muuttuneet osakentät dot-poluilla (vain ne); identiteetti/alkoi/historia koskemattomia; poistettu kenttä → FieldValue.delete()', async () => {
    const e = ymp({ pelaaja: { jaksofokus: JSON.parse(JSON.stringify(JF)) }, mergeLisa: (jf) => { jf.tavoite_tarkenteet = { 'teknis_taktinen::y_h2': { kriteeri: 'x' } }; delete jf.linkitetyt; jf.onnistumiskriteeri = 'uusi'; } });
    await e.sb.window._vpJfTavoitteetTallenna(PID);
    expect(e.kirj.length).toBe(1); expect(e.log.setit).toBe(0); expect(e.kirj[0].path).toBe(POLKU);
    expect(e.kirj[0].data).toEqual({ 'jaksofokus.tavoite_tarkenteet': { 'teknis_taktinen::y_h2': { kriteeri: 'x' } }, 'jaksofokus.linkitetyt': DELETE, 'jaksofokus.onnistumiskriteeri': 'uusi' });
    expect(Object.keys(e.kirj[0].data).some((k) => /konsepti|alkoi|domeeni|historia/.test(k))).toBe(false);
    expect(e.p.jaksofokus.alkoi).toBe(ALKOI); expect(e.p.jaksofokus_historia).toBeUndefined();
  });
  it('ei muutoksia → EI kirjoitusta (toast silti)', async () => {
    const e = ymp({ pelaaja: { jaksofokus: JSON.parse(JSON.stringify(JF)) } }); await e.sb.window._vpJfTavoitteetTallenna(PID);
    expect(e.kirj).toEqual([]); expect(e.log.toastit.some(([t]) => /Jakso tallennettu/.test(t))).toBe(true);
  });
  it('ei jaksoa → ei mitään; kirjoitus epäonnistuu → virheilmoitus', async () => {
    const a = ymp({ pelaaja: { jaksofokus: null } }); await a.sb.window._vpJfTavoitteetTallenna(PID); expect(a.kirj).toEqual([]);
    const b = ymp({ kaada: true, pelaaja: { jaksofokus: JSON.parse(JSON.stringify(JF)) }, mergeLisa: (jf) => { jf.onnistumiskriteeri = 'uusi'; } }); await b.sb.window._vpJfTavoitteetTallenna(PID);
    expect(b.log.toastit.some(([, k]) => k === 'error')).toBe(true);
  });
});

describe('V7 _vpJfOsaArvioSet — dot-polku jaksofokus.osa_arviot.<konsepti>', () => {
  const JF = { konsepti_avain: 'y_h2', konsepti_nimi: 'SYÖTTÄMINEN', alkoi: ALKOI, osa_arviot: { y_h2: { a: 2 } } };
  it('päivittää VAIN konseptin osa-arviot dot-polulla (ei koko jaksofokus-karttaa, ei syvämergeä); lokaali + Aloitus-näyttö päivittyvät', async () => {
    const e = ymp({ pelaaja: { jaksofokus: JSON.parse(JSON.stringify(JF)) } });
    e.sb.window._vpJfOsaArvioSet(PID, 'y_h2', 'b', 3); await lopeta();
    expect(e.kirj.length).toBe(1); expect(e.kirj[0].path).toBe(POLKU); expect(e.kirj[0].data).toEqual({ 'jaksofokus.osa_arviot.y_h2': { a: 2, b: 3 } });
    expect(e.p.jaksofokus.osa_arviot.y_h2).toEqual({ a: 2, b: 3 }); expect(e.log.renderit).toBeGreaterThan(0);
  });
  it('uusi konsepti: oma alipolku; avain jossa piste → koko osa_arviot-kartta (dot-polku ei hajoa)', async () => {
    const a = ymp({ pelaaja: { jaksofokus: JSON.parse(JSON.stringify(JF)) } }); a.sb.window._vpJfOsaArvioSet(PID, 'y_h3', 'a', 1); await lopeta();
    expect(Object.keys(a.kirj[0].data)).toEqual(['jaksofokus.osa_arviot.y_h3']);
    const b = ymp({ pelaaja: { jaksofokus: JSON.parse(JSON.stringify(JF)) } }); b.sb.window._vpJfOsaArvioSet(PID, 'y.h3', 'a', 1); await lopeta();
    expect(Object.keys(b.kirj[0].data)).toEqual(['jaksofokus.osa_arviot']); expect(b.kirj[0].data['jaksofokus.osa_arviot']).toMatchObject({ 'y.h3': { a: 1 } });
  });
  it('ei jaksofokusta → ei kirjoitusta (arvio jää editointitilaan)', async () => {
    const e = ymp({ pelaaja: { jaksofokus: null } }); e.sb.window._vpJfOsaArvioSet(PID, 'y_h2', 'a', 2); await lopeta(); expect(e.kirj).toEqual([]);
  });
});

describe('V8 _vpSulkuTallenna — tmSuljeJakso + arrayUnion', () => {
  const JF = { konsepti_avain: 'y_h2', konsepti_nimi: 'SYÖTTÄMINEN', alkoi: ALKOI, kesto_vk: 6, lahde: 'vp', tavoite_alue: 'syotto', valitavoite_idx: 2, poikkeama: true };
  const aja = async (e, uusiAvain, S = {}) => { e.sb.window._vpSulkuTila = Object.assign({ p: e.p, jf: e.p.jaksofokus, alkoi: ALKOI, loppu: '2026-10-04T10:00:00.000Z', harjoituksia: 5, lasnaolo: { paikalla: 4, yhteensa: 5, tiedossa: 5 }, arvioItse: 4, arvioAikuis: 3, tulos: 'parani', deltaMitattu: null }, S); await e.sb.window._vpSulkuTallenna(uusiAvain); await lopeta(); };
  it('ilman uutta jaksoa: YKSI update {jaksofokus:null, jaksofokus_historia: arrayUnion(sulkurivi)}; rivi sulkutapa "suljettu", arvio_vp, arvioija_rooli vp, kalibraatio', async () => {
    const e = ymp({ pelaaja: { jaksofokus: JF } }); await aja(e, null);
    expect(e.kirj.length).toBe(1); expect(e.log.setit).toBe(0); expect(e.kirj[0].path).toBe(POLKU);
    expect(Object.keys(e.kirj[0].data).sort()).toEqual(['jaksofokus', 'jaksofokus_historia']); expect(e.kirj[0].data.jaksofokus).toBeNull();
    const r = e.kirj[0].data.jaksofokus_historia.__arrayUnion; expect(r.length).toBe(1);
    expect(r[0]).toMatchObject({ konsepti_avain: 'y_h2', alkoi: ALKOI, paattyi: '2026-10-04T10:00:00.000Z', sulkutapa: 'suljettu', harjoituksia: 5, arvio_itse: 4, arvio_vp: 3, arvio_valmentaja: null, arvioija_rooli: 'vp', tulos: 'parani', lahde_seuraava: null, kalibraatio_ero: J.tmKalibraatio(4, 3) });
    expect(e.p.jaksofokus).toBeNull(); expect(e.p.jaksofokus_historia.length).toBe(1);
  });
  it('uusi jakso: lahde_seuraava "silta"; tavoite_alue periytyy kun uudella ei ole omaa; valitavoite_idx/poikkeama EIVÄT', async () => {
    const e = ymp({ pelaaja: { jaksofokus: JF } }); await aja(e, 'y_h3');
    const j = e.kirj[0].data.jaksofokus; expect(j).toMatchObject({ konsepti_avain: 'y_h3', tavoite_alue: 'syotto', domeeni: 'teknis_taktinen' });
    expect(j.valitavoite_idx).toBeUndefined(); expect(j.poikkeama).toBeUndefined(); expect(e.kirj[0].data.jaksofokus_historia.__arrayUnion[0].lahde_seuraava).toMatch(/^silta/);
  });
  it('fyysinen sulku: uusi fyysinen jakso, lahde_seuraava "silta_d1", ohjelma kopioituu riville', async () => {
    const e = ymp({ pelaaja: { jaksofokus: { konsepti_avain: 'fy_nopeus', konsepti_nimi: 'Nopeus', domeeni: 'fyysinen', alkoi: ALKOI, ohjelma: { ohjelma_id: 'o1', tyyppi: 'plyo' } } } }); await aja(e, 'fy_voima');
    expect(e.kirj[0].data.jaksofokus).toMatchObject({ konsepti_avain: 'fy_voima', domeeni: 'fyysinen', lahde: 'silta_d1' }); expect('tavoite_alue' in e.kirj[0].data.jaksofokus).toBe(false);
    expect(e.kirj[0].data.jaksofokus_historia.__arrayUnion[0]).toMatchObject({ domeeni: 'fyysinen', lahde_seuraava: 'silta_d1', ohjelma: { ohjelma_id: 'o1', tyyppi: 'plyo' }, sulkutapa: 'suljettu' });
  });
  it('kirjoitus epäonnistuu: virheilmoitus, lokaali historia ei päivity; demo: ei kirjoitusta, lokaali rivi', async () => {
    const f = ymp({ kaada: true, pelaaja: { jaksofokus: JF } }); await aja(f, null, { lause: 'Hyvä jakso, jatka näin', k4: true });
    expect(f.kirj).toEqual([]); expect(f.p.jaksofokus_historia).toBeUndefined(); expect(f.log.toastit.some(([, k]) => k === 'error')).toBe(true);
    // virhe näkyy aina (toast + koodi + konsoli); sulkulomake jää auki, syötetty lause tallessa, p.jaksofokus ennallaan
    expect(f.log.toastit).toEqual([['Tallennus epäonnistui (permission-denied)', 'error']]); expect(f.log.warn.some((a) => a[0] === '[vpJf]')).toBe(true);
    expect(f.log.suljetut).toEqual([]); expect(f.sb.window._vpSulkuTila).not.toBeNull(); expect(f.sb.window._vpSulkuTila.lause).toBe('Hyvä jakso, jatka näin'); expect(f.p.jaksofokus).toEqual(JF);
    const ok = ymp({ pelaaja: { jaksofokus: JF } }); await aja(ok, null); expect(ok.log.suljetut).toEqual(['_vpSulkuModal']); expect(ok.sb.window._vpSulkuTila).toBeNull(); expect(ok.p.jaksofokus).toBeNull();   // onnistuessa modaali sulkeutuu
    const d = ymp({ demo: true, pelaaja: { jaksofokus: JF } }); await aja(d, null); expect(d.kirj).toEqual([]); expect(d.p.jaksofokus_historia.length).toBe(1);
  });
});

describe('lähdevartijat: rinnakkainen logiikka pois', () => {
  it('_vpJfArkistoiVaihdossa / _vpJfAlkoiJatka / _jfArk poistettu; kaikki kirjoitukset lib:n kautta', () => {
    expect(VP).not.toMatch(/function _vpJfArkistoiVaihdossa|function _vpJfAlkoiJatka|_jfArk\b|_vpJfAlkoiJatka\(/);
    expect((VP.match(/const _v = _vpJaksoVaihto\(p, /g) || []).length).toBe(5);   // V1–V5
    expect(pura('window._vpSulkuTallenna = async function')).toMatch(/TM_KEHITYSSILMUKKA\.tmSuljeJakso\(/);
    expect(pura('window._vpJfTavoitteetTallenna = async function')).toMatch(/tmPaivitaJaksofokus/); expect(pura('window._vpJfOsaArvioSet = function')).toMatch(/tmPaivitaJaksofokus/);
    ['_vpAsetaFyysFokus', '_vpOhjKaytaOhjelma', '_vpValitavoiteAktivoi', '_vpTtVieTreeniin', '_vpJfAsetaKehitysFokus', '_vpJfTavoitteetTallenna', '_vpJfOsaArvioSet', '_vpSulkuTallenna'].forEach((n) =>
      expect(pura('window.' + n + ' = ' + (n === '_vpValitavoiteAktivoi' || n === '_vpJfOsaArvioSet' ? '' : 'async ') + 'function'), n).not.toMatch(/tmHistoriaEntry|tmJaksonVaihto|tmSamaJakso|_vpTtKirjoita\(|set\(\{ jaksofokus|jaksofokus_historia: hist/));
  });
  it('yhteiset kirjoittajat: update() (ei set-merge), arrayUnion.apply(null, rivit), POISTA → FieldValue.delete(); lib ?v=2', () => {
    const w = pura('async function _vpJfKirjoita(') + pura('async function _vpKirjoitaJaksofokus(');
    expect(w).toMatch(/\.update\(upd\)/); expect(w).toMatch(/arrayUnion\.apply\(null, rivit\)/); expect(w).not.toMatch(/\.set\(|serverTimestamp/);
    expect(pura('function _vpJfPolut(')).toMatch(/FieldValue\.delete\(\)/); expect(VP).toContain('lib/tm_kehityssilmukka.js?v=2');
  });
  it('_vpTtKirjoita jäi vain pelipaikkakirjoituksille (tt_positio_*)', () => {
    expect((VP.match(/_vpTtKirjoita\(pid, \{ tt_positio_/g) || []).length).toBe(2); expect(VP).not.toMatch(/_vpTtKirjoita\([^)]*jaksofokus/);
  });
});
