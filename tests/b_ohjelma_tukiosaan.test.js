/**
 * B 2/3 — seuran HYVÄKSYTTY ohjelma → pelaajan jakson tukiosa (snapshot-kopio kotiin sopivista liikkeistä). Vain tila 'hyvaksytty'; kaytto 'joukkue' ja ei-kotiin-sopivat liikkeet eivät koskaan pelaajalle.
 * Master: "Liitä jakson kotiharjoitteiksi" (ei luo tukiosaa tyhjästä — perustelu sidotaan ydinvahvuuteen, D-3). Fixture: KPV U13 -testipelaaja.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const require = createRequire(import.meta.url);
const JM = require('../lib/tm_jakso_malli.js'), K = require('../lib/tm_kehityssilmukka.js');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..'), MA = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
const PID = 'm93GBdOaGCUuenMiCL0I';
const LIIKE = (n, lisa) => Object.assign({ jarjestys: n, liike: 'Liike ' + n, toistot: '10', palautus: '30s', pelaajan_ohje: 'Tee näin ' + n, kesto_min: 2, kotiin_sopiva: true, video_url: null, kuva_url: null }, lisa || {});
const OHJ = (lisa) => Object.assign({ id: 'ohjelmat_97_1', nimi: 'Lihaskestävyys 1', tila: 'hyvaksytty', lahde: 'seura', versio: 3, liikkeet: [LIIKE(1, { video_url: 'https://example.org/v.mp4' }), LIIKE(2, { kotiin_sopiva: false }), LIIKE(3, { kuva_url: 'https://example.org/k.png' }), LIIKE(4, { kaytto: 'joukkue' })] }, lisa || {});
const TUKI = { alue: 'kestävyys', perustelu: 'Ydinvahvuus: syöttö — tukee jaksamista', harjoitteet: [{ id: 'vanha1', nimi: 'Vanha', lahde: 'tm' }] };

describe('tmOhjelmaTukiosaan / tmHarjoiteTukiosaan (pure)', () => {
  it('vain hyväksytty: luonnos, tilaton, muu tila → heittää; vain kotiin sopivat (kotiin_sopiva === true) ja ei-joukkue-liikkeet mukaan; snapshot-kentät + ohjelma_id/versio', () => {
    for (const tila of ['luonnos', undefined, '', 'odottaa']) { const o = OHJ({ tila }); if (tila === undefined) delete o.tila; expect(() => JM.tmOhjelmaTukiosaan(o), String(tila)).toThrow(/hyväksy/); }
    const r = JM.tmOhjelmaTukiosaan(OHJ());
    expect(r.map((x) => x.id)).toEqual(['ohjelmat_97_1#1', 'ohjelmat_97_1#3']);   // 2 = ei kotiin, 4 = joukkue
    expect(r[0]).toEqual({ id: 'ohjelmat_97_1#1', nimi: 'Liike 1', lahde: 'seura', liike: 'Liike 1', toistot: '10', palautus: '30s', pelaajan_ohje: 'Tee näin 1', kesto_min: 2, jarjestys: 1, ohjelma_id: 'ohjelmat_97_1', ohjelma_versio: 3, video_url: 'https://example.org/v.mp4' });
    expect(r[1].kuva_url).toBe('https://example.org/k.png'); expect(r[1]).not.toHaveProperty('video_url');
    expect(() => JM.tmOhjelmaTukiosaan(OHJ({ liikkeet: [LIIKE(1, { kotiin_sopiva: false }), LIIKE(2, { kotiin_sopiva: 'kyllä' })] }))).toThrow(/kotiin sopivia/);   // vain tosi boolean
    expect(() => JM.tmOhjelmaTukiosaan(OHJ({ liikkeet: [] }))).toThrow(/kotiin sopivia/); expect(() => JM.tmOhjelmaTukiosaan(null)).toThrow();
  });
  it('harjoitepankki-rivi: hyväksytty + kaytto != joukkue → kotiharjoite; joukkue/luonnos hylätään; "koti" ja tilaton kaytto kelpaavat', () => {
    const h = (l) => Object.assign({ id: 'rutiinit_113_1', nimi: 'Venyttely', ohje: 'Rauhassa', kesto_min: 10, tila: 'hyvaksytty', kaytto: 'koti', lahde: 'seura', video_url: null, kuva_url: null }, l || {});
    expect(JM.tmHarjoiteTukiosaan(h())).toEqual({ id: 'rutiinit_113_1', nimi: 'Venyttely', lahde: 'seura', liike: 'Venyttely', pelaajan_ohje: 'Rauhassa', kesto_min: 10 });
    expect(() => JM.tmHarjoiteTukiosaan(h({ kaytto: 'joukkue' }))).toThrow(/joukkue/); expect(() => JM.tmHarjoiteTukiosaan(h({ tila: 'luonnos' }))).toThrow(/hyväksy/);
    const ilman = h(); delete ilman.kaytto; expect(JM.tmHarjoiteTukiosaan(ilman).id).toBe('rutiinit_113_1');
  });
  it('tmLiitaTukiosaan: vaatii olemassa olevan tukiosan (alue + perustelu); sama id korvataan, muut säilyvät; validoi tmTukiosa:lla (GDPR-sanat, linkit http(s), numerot)', () => {
    const uudet = JM.tmOhjelmaTukiosaan(OHJ()), r = JM.tmLiitaTukiosaan(TUKI, uudet);
    expect(r.map((x) => x.id)).toEqual(['vanha1', 'ohjelmat_97_1#1', 'ohjelmat_97_1#3']);
    expect(JM.tmLiitaTukiosaan(Object.assign({}, TUKI, { harjoitteet: r }), uudet).length).toBe(3);   // uudelleenliitos ei tuplaa
    for (const huono of [null, undefined, {}, { alue: 'x' }, { perustelu: 'y' }]) expect(() => JM.tmLiitaTukiosaan(huono, uudet), JSON.stringify(huono)).toThrow(/tukiosaa/);
    expect(() => JM.tmLiitaTukiosaan(TUKI, [Object.assign({}, uudet[0], { pelaajan_ohje: 'Tämä on heikkous' })])).toThrow(/kielletyn sanan/);
    expect(() => JM.tmLiitaTukiosaan(TUKI, [Object.assign({}, uudet[0], { video_url: 'javascript:alert(1)' })])).toThrow(/http/); expect(() => JM.tmLiitaTukiosaan(TUKI, [Object.assign({}, uudet[0], { kesto_min: 'x' })])).toThrow(/luku/);
    expect(JM.tmTarkistaJaksoData({ tukiosa: { harjoitteet: r } })).toEqual([]);   // kenttänimet neutraaleja
  });
  it('tmTukiosa ennallaan ilman lisäkenttiä (vanha muoto {id,nimi,lahde}) ja tila-vartija pysyy', () => {
    expect(JM.tmTukiosa({ alue: 'a', perustelu: 'b', harjoitteet: [{ id: '1', nimi: 'N', lahde: 'tm' }] }).harjoitteet).toEqual([{ id: '1', nimi: 'N', lahde: 'tm' }]);
    expect(() => JM.tmTukiosa({ alue: 'a', perustelu: 'b', harjoitteet: [{ id: '1', nimi: 'N', lahde: 'tm', tila: 'luonnos' }] })).toThrow(/luonnos/);
  });
});

function pura(t) { const i = MA.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0; for (let k = MA.indexOf('{', i); k < MA.length; k++) { if (MA[k] === '{') d++; else if (MA[k] === '}' && !--d) return MA.slice(i, k + 1); } throw new Error('sulkeet'); }
function ymp({ jaksofokus, ohjelma = OHJ(), demo = false, kaada = false } = {}) {
  const log = { upd: [], toastit: [], renderit: 0 }, p = { id: PID, joukkue: 'KPV U13', jaksofokus };
  const dok = { update: async (d) => { if (kaada) throw new Error('permission-denied'); log.upd.push(d); } };
  const c = { _pelaajatData: [p], _ttPelaaja: () => p, window: {}, _ohjKirjasto: [ohjelma], masterT: (x) => x, toast: (t, k) => log.toastit.push([t, k]), console: { warn() {} }, _demo: demo, _seuraId: 'kpv', _mVerkkoEnnenSulkua: () => true, _mTuoreToken: async () => {},
    firebase: { auth: () => ({ currentUser: {} }) }, _db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => dok }) }) }) }, _renderPinfoFirestore: () => { log.renderit++; }, document: { getElementById: () => null }, Promise, Object, Array, JSON };
  c.window = c; c.window.TM_JAKSO_MALLI = JM; c.window.TM_KEHITYSSILMUKKA = K; c.window._ohjKirjasto = [ohjelma]; vm.createContext(c);
  vm.runInContext(pura('window._ohjLiitaTukiosaan = async function') + ';', c); return { c, p, log };
}
const JAKSO = (tukiosa) => ({ konsepti_avain: 'y_h2', konsepti_nimi: 'Syöttö', alkoi: '2026-10-05T10:00:00.000Z', kesto_vk: 4, domeeni: 'teknis_taktinen', tukiosa });
describe('Master: _ohjLiitaTukiosaan', () => {
  it('liittää kotiin sopivat liikkeet OLEMASSA OLEVAAN tukiosaan: YKSI update dot-polulla jaksofokus.tukiosa.harjoitteet; paikallinen vasta onnistumisen jälkeen; tukiosan alue/perustelu säilyvät', async () => {
    const e = ymp({ jaksofokus: JAKSO(TUKI) }); await e.c.window._ohjLiitaTukiosaan(PID, 'ohjelmat_97_1');
    expect(e.log.upd.length).toBe(1); expect(Object.keys(e.log.upd[0])).toEqual(['jaksofokus.tukiosa.harjoitteet']);
    expect(e.log.upd[0]['jaksofokus.tukiosa.harjoitteet'].map((x) => x.id)).toEqual(['vanha1', 'ohjelmat_97_1#1', 'ohjelmat_97_1#3']);
    expect(e.p.jaksofokus.tukiosa).toMatchObject({ alue: 'kestävyys', perustelu: TUKI.perustelu }); expect(e.p.jaksofokus.tukiosa.harjoitteet.length).toBe(3); expect(e.log.toastit.at(-1)[1]).toBe('ok');
  });
  it('EI kirjoita kun: jaksolla ei tukiosaa / ei jaksoa; ohjelma luonnos/tilaton; ei kotiin sopivia → ohjeellinen virhe-toast, ei update, paikallinen ennallaan', async () => {
    for (const asetus of [{ jaksofokus: JAKSO(undefined) }, { jaksofokus: undefined }, { jaksofokus: JAKSO(TUKI), ohjelma: OHJ({ tila: 'luonnos' }) }, { jaksofokus: JAKSO(TUKI), ohjelma: OHJ({ liikkeet: [LIIKE(1, { kotiin_sopiva: false })] }) }]) {
      const e = ymp(asetus), ennen = JSON.stringify(e.p.jaksofokus); await e.c.window._ohjLiitaTukiosaan(PID, 'ohjelmat_97_1');
      expect(e.log.upd).toEqual([]); expect(JSON.stringify(e.p.jaksofokus)).toBe(ennen); expect(e.log.toastit.at(-1)[1]).toBe('error'); expect(e.log.toastit.at(-1)[0]).toMatch(/tukiosa|ei löytynyt/i);
    }
  });
  it('kirjoitus epäonnistuu → virhe-toast eikä paikallista muutosta; demo → ei kirjoitusta, paikallinen päivittyy', async () => {
    const k = ymp({ jaksofokus: JAKSO(TUKI), kaada: true }); await k.c.window._ohjLiitaTukiosaan(PID, 'ohjelmat_97_1'); expect(k.p.jaksofokus.tukiosa.harjoitteet.length).toBe(1); expect(k.log.toastit.at(-1)[1]).toBe('error');
    const d = ymp({ jaksofokus: JAKSO(TUKI), demo: true }); await d.c.window._ohjLiitaTukiosaan(PID, 'ohjelmat_97_1'); expect(d.log.upd).toEqual([]); expect(d.p.jaksofokus.tukiosa.harjoitteet.length).toBe(3);
  });
  it('lähde: nappi vain hyväksytyille ja pid:lle; Master lataa tm_jakso_malli.js; ohjelmat-kirjastoa ei kirjoiteta tässä', () => {
    expect(MA).toContain('lib/tm_jakso_malli.js?v=1'); const m = pura('window._ohjLiitaTukiosaan = async function'); expect(m).not.toContain("collection('ohjelmat')");
    expect(MA).toMatch(/pid && !o\.arkistoitu && o\.tila === 'hyvaksytty'\) h \+= '<button onclick="_ohjLiitaTukiosaan/);
  });
});
