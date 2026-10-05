/**
 * R6.0b — jaksofokuksen arkistointi Master_v16:n NELJÄSSÄ asetuspolussa (_ttVieTreeniin · _msAsetaFyysFokus · _ohjKaytaOhjelma · _mIdpVtAktivoi).
 * Ennen: jokainen korvasi p.jaksofokus:n ilman arkistointia (edellinen jakso katosi, set-merge jätti vanhoja kenttiä) ja nollasi alkoi-päivän vaikka jakso oli sama.
 * Nyt: yksi yhteinen vaihto (lib/tm_jaksokooste.js tmJaksonVaihto) + YKSI update() samaan pelaajadokkiin: jaksofokus (korvaa) + jaksofokus_historia arrayUnion.
 * "SAMA JAKSO" -sääntö (kirjattu tähän): molemmat jaksoja · sama domeeni (oletus teknis_taktinen) · sama jakson avain = konsepti_avain; PUUTTUESSA ohjelma_id
 *   (kirjasto) tai ohjelma.tyyppi (fyysinen polku). Avain puuttuu → EI sama (turvallinen: edellinen arkistoidaan).
 * Fixturet: vain KPV U13 -testipelaajat (seura 'kpv'); kirjoituspolku tasan seurat/kpv/pelaajat/<pid>. Funktiot puretaan lähteestä ja ajetaan vm:ssä.
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
const KS = require('../lib/tm_kehityssilmukka.js');   // R6.1b: Master-adapterit kutsuvat tmAsetaJaksofokus/tmSuljeJakso (window.TM_KEHITYSSILMUKKA)
function pura(tunniste, lahde = MASTER) {
  const i = lahde.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = lahde.indexOf('{', i); k < lahde.length; k++) { if (lahde[k] === '{') syv++; else if (lahde[k] === '}') { syv--; if (!syv) return lahde.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const NYT = '2026-10-05T12:00:00.000Z';
const ALKOI_VANHA = '2026-09-01T08:00:00.000Z';

describe('"sama jakso" -sääntö (tmSamaJakso / tmJaksonAvain)', () => {
  it('sama domeeni + sama konsepti_avain = sama; eri avain tai eri domeeni = eri', () => {
    expect(J.tmSamaJakso({ konsepti_avain: 'y_h2' }, { konsepti_avain: 'y_h2', kesto_vk: 4 })).toBe(true);
    expect(J.tmSamaJakso({ konsepti_avain: 'y_h2' }, { konsepti_avain: 'y_h3' })).toBe(false);
    expect(J.tmSamaJakso({ konsepti_avain: 'x', domeeni: 'fyysinen' }, { konsepti_avain: 'x', domeeni: 'teknis_taktinen' })).toBe(false);
    expect(J.tmSamaJakso({ konsepti_avain: 'x' }, { konsepti_avain: 'x', domeeni: 'teknis_taktinen' })).toBe(true);   // oletusdomeeni = teknis_taktinen
  });
  it('FYYSINEN polku ilman konsepti_avainta: domeeni + ohjelman tunniste (ohjelma_id ensin, sitten tyyppi)', () => {
    const f = (o) => ({ domeeni: 'fyysinen', ohjelma: o });
    expect(J.tmSamaJakso(f({ ohjelma_id: 'o1' }), f({ ohjelma_id: 'o1', ohjelma_versio: 2 }))).toBe(true);
    expect(J.tmSamaJakso(f({ ohjelma_id: 'o1' }), f({ ohjelma_id: 'o2' }))).toBe(false);
    expect(J.tmSamaJakso(f({ ohjelma_id: null, tyyppi: 'plyo' }), f({ ohjelma_id: null, tyyppi: 'plyo' }))).toBe(true);
    expect(J.tmSamaJakso(f({ ohjelma_id: null, tyyppi: 'plyo' }), f({ ohjelma_id: null, tyyppi: 'voima' }))).toBe(false);
    expect(J.tmSamaJakso(f({ ohjelma_id: 'o1', tyyppi: 'plyo' }), f({ ohjelma_id: null, tyyppi: 'plyo' }))).toBe(false);   // id vs pelkkä tyyppi → eri (id voittaa)
    expect(J.tmSamaJakso({ domeeni: 'fyysinen', ohjelma: { tyyppi: 'plyo' } }, { domeeni: 'teknis_taktinen', ohjelma: { tyyppi: 'plyo' } })).toBe(false);
  });
  it('avain puuttuu / ei jaksoa → EI sama (turvallinen: arkistoidaan); tyhjät eivät ole jaksoja', () => {
    expect(J.tmSamaJakso({ konsepti_nimi: 'A' }, { konsepti_nimi: 'A' })).toBe(false);
    expect(J.tmSamaJakso({ domeeni: 'fyysinen', ohjelma: {} }, { domeeni: 'fyysinen', ohjelma: {} })).toBe(false);
    expect(J.tmSamaJakso(null, { konsepti_avain: 'x' })).toBe(false); expect(J.tmSamaJakso({}, { konsepti_avain: 'x' })).toBe(false); expect(J.tmSamaJakso({ konsepti_avain: 'x' }, null)).toBe(false);
    expect(J.tmJaksonAvain({ konsepti_avain: 'k', ohjelma: { ohjelma_id: 'o' } })).toBe('k'); expect(J.tmJaksonAvain({})).toBeNull(); expect(J.tmJaksonAvain(null)).toBeNull();
  });
});

describe('tmJaksonVaihto', () => {
  const vanha = { konsepti_avain: 'y_old', konsepti_nimi: 'Vanha', alkoi: ALKOI_VANHA, kesto_vk: 6, lahde: 'valmentaja', poikkeama: true, tavoite_alue: 'syotto', ohjelma: { tyyppi: 'plyo', nimi: 'Plyo' } };
  it('eri jakso: uusi korvaa KOKONAAN (jäänteet pois), arkistorivi edellisestä: alkoi säilyy, paattyi/suljettu = nyt (ISO), ohjelma kopioitu, sulkutapa korvattu', () => {
    const uusi = { konsepti_avain: 'y_new', konsepti_nimi: 'Uusi', alkoi: NYT, kesto_vk: 4, lahde: 'valmentaja' };
    const r = J.tmJaksonVaihto(vanha, uusi, NYT);
    expect(r.sama).toBe(false); expect(r.jaksofokus).toEqual(uusi); expect(r.jaksofokus.poikkeama).toBeUndefined(); expect(r.jaksofokus.ohjelma).toBeUndefined();
    expect(r.arkisto).toMatchObject({ konsepti_avain: 'y_old', konsepti_nimi: 'Vanha', domeeni: 'teknis_taktinen', alkoi: ALKOI_VANHA, paattyi: NYT, suljettu: NYT, ohjelma: vanha.ohjelma, tulos: null, sulkutapa: 'korvattu', lahde_seuraava: 'valmentaja' });
    expect(typeof r.arkisto.paattyi).toBe('string'); expect(typeof r.arkisto.suljettu).toBe('string'); expect(typeof r.arkisto.alkoi).toBe('string');   // ISO, ei Timestamp/serverTimestamp
  });
  it('sama jakso: alkoi SÄILYY (vanha), ei arkistoa; kentät vanha ⊕ uusi (uusi voittaa) kuten aiempi merge', () => {
    const r = J.tmJaksonVaihto(vanha, { konsepti_avain: 'y_old', konsepti_nimi: 'Vanha', alkoi: NYT, kesto_vk: 4, lahde: 'valmentaja' }, NYT);
    expect(r.sama).toBe(true); expect(r.arkisto).toBeNull();
    expect(r.jaksofokus.alkoi).toBe(ALKOI_VANHA); expect(r.jaksofokus.kesto_vk).toBe(4); expect(r.jaksofokus.poikkeama).toBe(true);
  });
  it('sama jakso mutta vanhalla ei alkoi-päivää → uuden alkoi käytetään', () => {
    expect(J.tmJaksonVaihto({ konsepti_avain: 'a' }, { konsepti_avain: 'a', alkoi: NYT }, NYT).jaksofokus.alkoi).toBe(NYT);
  });
  it('ei edellistä jaksoa (null / undefined / tyhjä) → ei arkistoa, uusi sellaisenaan', () => {
    [null, undefined, {}].forEach((v) => { const r = J.tmJaksonVaihto(v, { konsepti_avain: 'n', alkoi: NYT }, NYT); expect(r.arkisto).toBeNull(); expect(r.jaksofokus).toEqual({ konsepti_avain: 'n', alkoi: NYT }); });
  });
  it('edellinen ilman avainta (vain nimi) arkistoidaan (mitään ei katoa)', () => {
    const r = J.tmJaksonVaihto({ konsepti_nimi: 'Nimetön', alkoi: ALKOI_VANHA }, { konsepti_avain: 'n' }, NYT);
    expect(r.arkisto).toMatchObject({ konsepti_nimi: 'Nimetön', konsepti_avain: null, alkoi: ALKOI_VANHA, sulkutapa: 'korvattu' });
  });
  it('lib ei muuta syötteitä (pure)', () => {
    const v = JSON.parse(JSON.stringify(vanha)); J.tmJaksonVaihto(v, { konsepti_avain: 'z' }, NYT); expect(v).toEqual(vanha);
  });
});

/* ── Master-polut vm:ssä ── */
const PID = 'm93GBdOaGCUuenMiCL0I';   // KPV U13 -testipelaaja (Topias)
const POLKU = 'seurat/kpv/pelaajat/' + PID;
function ymp({ kaada = false, pelaaja = {}, vt } = {}) {
  const p = Object.assign({ id: PID, joukkue: 'KPV U13', etunimi: 'Topias' }, pelaaja);
  const kirj = [], log = { toastit: [], setit: 0 };
  const doc = (path) => ({ update: async (d) => { if (kaada) throw new Error('permission-denied'); kirj.push({ path, data: d }); }, set: async () => { log.setit++; } });
  const _db = { collection: (c) => ({ doc: (a) => ({ collection: (c2) => ({ doc: (b) => doc(c + '/' + a + '/' + c2 + '/' + b) }) }) }) };
  const tavoite = vt || { valitavoitteet: [{ nimi: 'Vaihtotavoite', konsepti_avain: 'y_vt', kesto_vk: 5 }], aikaraami: { kesto_vk: 6 }, fokus: { alue: 'syotto' } };
  p._mIdpTavoite = tavoite;
  const sb = {
    window: { TM_JAKSOKOOSTE: J, TM_KEHITYSSILMUKKA: KS, _ohjKirjasto: [{ id: 'o1', tyyppi: 'plyo', nimi: 'Plyo', versio: 1, laatija_uid: 'u', laatija_rooli: 'vp' }],
      TM_FYYSTEEMAT_LIB: { tmFyysTeema: (a) => (a ? { avain: a, nimi: 'Teema ' + a, testit: ['lin30m'] } : null), tmOhjelmaTemplaatti: (t) => ({ nimi: 'Mallipohja ' + t, kuvaus: 'k' }) } },
    _ttPelaaja: () => p, _pelaajatData: [p], _mIdpP: () => p, _mIdpReRender() {}, _mIdpTallennaDok() {}, _renderPinfoFirestore() {},
    _mTtItems: () => [{ avain: 'y_h2', nimi: 'SYÖTTÄMINEN', koodi: 'H2' }, { avain: 'y_h3', nimi: 'PELINLUKU', koodi: 'H3' }], _devIkaSp: () => ({ ika: 12 }), _ttNormPositio: () => 'KK', _mTtEhdotus: () => null,
    document: { getElementById: () => null }, _uid: 'valm-uid', _rooli: 'valmentaja', tmPhvKoodi: () => 'PRE',
    firebase: { auth: () => ({ currentUser: { uid: 'valm-uid' } }), firestore: { FieldValue: { arrayUnion: (...a) => ({ __arrayUnion: a }) } } },
    _mTuoreToken: async () => {}, _mVerkkoEnnenSulkua: () => true, _demo: false, _seuraId: 'kpv', _db,
    toast: (t, tyyppi) => log.toastit.push([t, tyyppi]), masterT: (x) => x, console: { warn() {} }, Date, Object, Array, Promise, Math, confirm: () => true,
  };
  vm.createContext(sb);
  const koodi = [pura('function _mJaksoVaihto('), pura('async function _mKirjoitaJaksofokus('),
    pura('window._ttVieTreeniin = async function'), pura('window._msAsetaFyysFokus = async function'), pura('window._ohjKaytaOhjelma = async function'), pura('window._mIdpVtAktivoi = async function')].join(';\n') + ';';
  vm.runInContext(koodi, sb);
  return { sb, p, kirj, log };
}
// polku → kutsu
const POLUT = {
  '_ttVieTreeniin': (sb) => sb.window._ttVieTreeniin(PID, 'y_h2'),
  '_msAsetaFyysFokus': (sb) => sb.window._msAsetaFyysFokus(PID, 'fy_nopeus'),
  '_ohjKaytaOhjelma': (sb) => sb.window._ohjKaytaOhjelma(PID, 'fy_nopeus', 'o1'),
  '_mIdpVtAktivoi': (sb) => sb.window._mIdpVtAktivoi(PID, 0),
};
// "eri jakso" -edellinen kullekin polulle (uuden avain: y_h2 / fy_nopeus / fy_nopeus / y_vt)
const EDELLINEN_ERI = { konsepti_avain: 'y_edellinen', konsepti_nimi: 'Edellinen', alkoi: ALKOI_VANHA, kesto_vk: 6, lahde: 'valmentaja', poikkeama: true, tavoite_alue: 'vanha_alue' };
const EDELLINEN_SAMA = {
  _ttVieTreeniin: { konsepti_avain: 'y_h2', konsepti_nimi: 'SYÖTTÄMINEN', alkoi: ALKOI_VANHA, kesto_vk: 6, lahde: 'valmentaja' },
  _msAsetaFyysFokus: { konsepti_avain: 'fy_nopeus', konsepti_nimi: 'Teema fy_nopeus', domeeni: 'fyysinen', alkoi: ALKOI_VANHA, kesto_vk: 4, lahde: 'silta_d1' },
  _ohjKaytaOhjelma: { konsepti_avain: 'fy_nopeus', konsepti_nimi: 'Teema fy_nopeus', domeeni: 'fyysinen', alkoi: ALKOI_VANHA, kesto_vk: 4, lahde: 'silta_d1' },
  _mIdpVtAktivoi: { konsepti_avain: 'y_vt', konsepti_nimi: 'Vaihtotavoite', alkoi: ALKOI_VANHA, kesto_vk: 5, lahde: 'valmentaja' },
};
// _ohjKaytaOhjelma SÄILYTTÄÄ olemassa olevan fyysisen jakson (suunnittelu: ohjelma liitetään käynnissä olevaan jaksoon) → "eri jakso" siinä = edellinen on
// teknis-taktinen (eri domeeni → uusi fyysinen jakso); _msAsetaFyysFokus: edellinen fyysinen eri teemalla.
const fyysEdellinenEri = (polku) => (polku === '_msAsetaFyysFokus') ? Object.assign({}, EDELLINEN_ERI, { domeeni: 'fyysinen', lahde: 'silta_d1' }) : EDELLINEN_ERI;

Object.keys(POLUT).forEach((polku) => {
  describe('polku ' + polku, () => {
    it('ERI jakso: YKSI update samaan pelaajadokkiin: uusi jaksofokus + jaksofokus_historia arrayUnion(edellisen jakson rivi, alkoi säilyy) — ei set-mergeä', async () => {
      const e = ymp({ pelaaja: { jaksofokus: Object.assign({}, fyysEdellinenEri(polku)) } });
      await POLUT[polku](e.sb);
      expect(e.kirj.length).toBe(1); expect(e.log.setit).toBe(0);
      expect(e.kirj[0].path).toBe(POLKU);   // vain tämä KPV U13 -testipelaaja
      const d = e.kirj[0].data;
      expect(Object.keys(d).sort()).toEqual(['jaksofokus', 'jaksofokus_historia']);   // fokus + historia SAMASSA kirjoituksessa
      expect(d.jaksofokus.alkoi).not.toBe(ALKOI_VANHA);
      expect(d.jaksofokus.poikkeama).toBeUndefined();   // edellisen jakson jäänne ei vuoda (update korvaa kartan)
      const rivi = d.jaksofokus_historia.__arrayUnion[0];
      expect(d.jaksofokus_historia.__arrayUnion.length).toBe(1);
      expect(rivi).toMatchObject({ konsepti_avain: 'y_edellinen', alkoi: ALKOI_VANHA, sulkutapa: 'korvattu', tulos: null });
      expect(typeof rivi.paattyi).toBe('string'); expect(rivi.paattyi).toBe(rivi.suljettu); expect(new Date(rivi.paattyi).toISOString()).toBe(rivi.paattyi);
      expect(e.p.jaksofokus_historia.length).toBe(1);   // lokaali päivittyi onnistumisen jälkeen
    });
    it('SAMA jakso: alkoi säilyy, EI arkistoriviä (update sisältää vain jaksofokuksen)', async () => {
      const e = ymp({ pelaaja: { jaksofokus: Object.assign({}, EDELLINEN_SAMA[polku]) } });
      await POLUT[polku](e.sb);
      expect(e.kirj.length).toBe(1); expect(e.kirj[0].path).toBe(POLKU);
      expect(Object.keys(e.kirj[0].data)).toEqual(['jaksofokus']);
      expect(e.kirj[0].data.jaksofokus.alkoi).toBe(ALKOI_VANHA);
      expect(e.p.jaksofokus_historia).toBeUndefined();
    });
    it('EI edellistä jaksoa: ei arkistoa; ensimmäinen jakso kirjoitetaan', async () => {
      const e = ymp({ pelaaja: { jaksofokus: null } });
      await POLUT[polku](e.sb);
      expect(e.kirj.length).toBe(1); expect(Object.keys(e.kirj[0].data)).toEqual(['jaksofokus']); expect(e.kirj[0].data.jaksofokus.konsepti_avain).toBeTruthy();
    });
    it('kirjoitus epäonnistuu: lokaali jaksofokus_historia EI päivity (arkistoriviä ei näytetä tallennettuna)', async () => {
      const e = ymp({ kaada: true, pelaaja: { jaksofokus: Object.assign({}, fyysEdellinenEri(polku)) } });
      await POLUT[polku](e.sb);
      expect(e.kirj).toEqual([]); expect(e.p.jaksofokus_historia).toBeUndefined();
      if (polku !== '_mIdpVtAktivoi') expect(e.log.toastit.some(([t, k]) => k === 'error')).toBe(true);
    });
  });
});

describe('fyysinen polku: sama jakso ilman konsepti_avainta (domeeni + ohjelman tunniste)', () => {
  it('_ohjKaytaOhjelma: vanha fyysinen jakso ilman konsepti_avainta + sama ohjelma_id → sama jakso (alkoi säilyy, ei arkistoa)', async () => {
    const vanha = { domeeni: 'fyysinen', konsepti_nimi: 'Fyysinen', alkoi: ALKOI_VANHA, kesto_vk: 4, lahde: 'silta_d1', ohjelma: { ohjelma_id: 'o1', tyyppi: 'plyo', nimi: 'Plyo' } };
    const e = ymp({ pelaaja: { jaksofokus: vanha } });
    await POLUT._ohjKaytaOhjelma(e.sb);
    expect(Object.keys(e.kirj[0].data)).toEqual(['jaksofokus']); expect(e.kirj[0].data.jaksofokus.alkoi).toBe(ALKOI_VANHA); expect(e.kirj[0].data.jaksofokus.ohjelma.ohjelma_id).toBe('o1');
  });
  it('vanha fyysinen jakso ilman konsepti_avainta, eri ohjelma-tunniste (tyyppi) → arkistoidaan', async () => {
    const e = ymp({ pelaaja: { jaksofokus: { domeeni: 'fyysinen', konsepti_nimi: 'Fyysinen', alkoi: ALKOI_VANHA, ohjelma: { ohjelma_id: null, tyyppi: 'voima' } } } });
    await POLUT._ohjKaytaOhjelma(e.sb);
    expect(e.kirj[0].data.jaksofokus_historia.__arrayUnion[0]).toMatchObject({ domeeni: 'fyysinen', alkoi: ALKOI_VANHA, sulkutapa: 'korvattu', ohjelma: { tyyppi: 'voima' } });
  });
});

describe('_ohjKaytaOhjelma säilyttää olemassa olevan fyysisen jakson (suunnitelma pinnattu)', () => {
  it('vanha fyysinen jakso eri avaimella → ohjelma liitetään siihen: sama jakso, alkoi säilyy, ei arkistoa', async () => {
    const e = ymp({ pelaaja: { jaksofokus: { konsepti_avain: 'fy_voima', konsepti_nimi: 'Voima', domeeni: 'fyysinen', alkoi: ALKOI_VANHA, kesto_vk: 4, lahde: 'silta_d1' } } });
    await POLUT._ohjKaytaOhjelma(e.sb);
    expect(Object.keys(e.kirj[0].data)).toEqual(['jaksofokus']); expect(e.kirj[0].data.jaksofokus.konsepti_avain).toBe('fy_voima'); expect(e.kirj[0].data.jaksofokus.alkoi).toBe(ALKOI_VANHA);
  });
});

describe('_msTallenna (jakson sulku): vain LISÄÄ rivin → arrayUnion', () => {
  it('kirjoittaa jaksofokus_historia: arrayUnion(entry) (ei koko paikallista taulukkoa); muu logiikka ennallaan', async () => {
    const asetukset = [];
    const p = { id: PID, joukkue: 'KPV U13', jaksofokus_historia: [{ konsepti_avain: 'vanhempi_rivi', alkoi: '2026-05-01T00:00:00.000Z' }], jaksofokus: { konsepti_avain: 'y_h2', konsepti_nimi: 'SYÖTTÄMINEN', alkoi: ALKOI_VANHA } };
    const sb = { window: { TM_JAKSOKOOSTE: J, TM_KEHITYSSILMUKKA: KS, _msSulkuTila: { p, jf: p.jaksofokus, alkoi: ALKOI_VANHA, loppu: NYT, harjoituksia: 5, lasnaolo: null, arvioItse: 4, arvioAikuis: 3, tulos: 'parani', deltaMitattu: null } },
      _rooli: 'valmentaja', _mVerkkoEnnenSulkua: () => true, _mTuoreToken: async () => {}, _renderPinfoFirestore() {}, _demo: false, _seuraId: 'kpv',
      _db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: (id) => ({ update: async (d) => asetukset.push({ id, d, o: 'update' }), set: async () => asetukset.push({ id, o: 'SET-EI-SALLITTU' }) }) }) }) }) },
      firebase: { auth: () => ({ currentUser: {} }), firestore: { FieldValue: { arrayUnion: (...a) => ({ __arrayUnion: a }) } } },
      document: { getElementById: () => null }, toast() {}, masterT: (x) => x, console: { warn() {} }, Date, Object, Array };
    vm.createContext(sb); vm.runInContext(pura('async function _mKirjoitaJaksofokus(') + ';\n' + pura('window._msTallenna = async function') + ';', sb);
    await sb.window._msTallenna(null);
    expect(asetukset.length).toBe(1); expect(asetukset[0].id).toBe(PID); expect(asetukset[0].o).toBe('update');   // R6.1b: update() (ei set-merge)
    expect(Array.isArray(asetukset[0].d.jaksofokus_historia)).toBe(false);
    expect(asetukset[0].d.jaksofokus_historia.__arrayUnion.length).toBe(1);
    expect(asetukset[0].d.jaksofokus_historia.__arrayUnion[0]).toMatchObject({ konsepti_avain: 'y_h2', alkoi: ALKOI_VANHA, paattyi: NYT, arvio_itse: 4, arvio_valmentaja: 3, tulos: 'parani' });
    expect(asetukset[0].d.jaksofokus).toBeNull();
    expect(p.jaksofokus_historia.length).toBe(2);   // lokaali ennallaan (push)
  });
});

describe('lähdevartijat', () => {
  it('kaikki neljä polkua kutsuvat _mJaksoVaihto + _mKirjoitaJaksofokus; ei enää set({ jaksofokus: … }, { merge }) ilman historiaa', () => {
    ['window._ttVieTreeniin = async function', 'window._msAsetaFyysFokus = async function', 'window._ohjKaytaOhjelma = async function', 'window._mIdpVtAktivoi = async function'].forEach((t) => {
      const r = pura(t); expect(r, t).toMatch(/_mJaksoVaihto\(p, /); expect(r, t).toMatch(/await _mKirjoitaJaksofokus\(p, _v, /); expect(r, t).not.toMatch(/set\(\{ jaksofokus: (jf|jaksofokus) \}/);
    });
    expect(MASTER).not.toMatch(/set\(\{ jaksofokus: (jf|jaksofokus) \}, \{ merge: true \}\)/);
    expect((MASTER.match(/await _mKirjoitaJaksofokus\(/g) || []).length).toBe(5);   // 4 asetuspolkua + sulku (R6.1b)
  });
  it('yhteinen kirjoittaja: update() (ei set-merge) + arrayUnion + ISO-aikaleimat (ei serverTimestamp taulukossa)', () => {
    const w = pura('async function _mKirjoitaJaksofokus(');
    expect(w).toMatch(/\.update\(upd\)/); expect(w).toMatch(/arrayUnion\.apply\(null, rivit\)/);   // R6.1b: v.historiaLisays[] → arrayUnion(...rivit) expect(w).not.toMatch(/serverTimestamp|\.set\(/);
  });
  it('lib ?v nostettu (Master + VP lataavat tm_jaksokooste.js?v=2)', () => {
    expect(MASTER).toContain('lib/tm_jaksokooste.js?v=2'); expect(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'TalentMaster_VP_v25.html'), 'utf8')).toContain('lib/tm_jaksokooste.js?v=2');
  });
});
