/**
 * V2 P0.4 PR 1 (client): kalenteri näyttää tapahtuman päättymiseen asti + ilmoitus renderöi päivän suhteellisena.
 *  · päättyminen: paattyy; kellonajaton (koko_paiva / pelkkä pvm / alkaa 00:00 ilman päättymistä) → PAIKALLISEN päivän loppu (§7.26)
 *  · ilmoituksen päivä: tapahtuma_alkaa → tapahtuma linkin kautta → muistutukselle luotu + 1 pv; päättyneen muistutus/muutos piiloon
 * Lib ajetaan vm:ssä kiinteällä kellolla + paikallisilla getttereillä UTC+3 (TZ-riippumaton); sovelluksen oikeat funktiot vm:ssä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { PEL_APU } from './helpers/pelaaja_t.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(ROOT, f), 'utf8');
const LIB = lue('lib/tm_kalenteri_ilmoitus.js');
const LANG = require('../lib/tm_lang.js');
function pura(src, tunniste) {
  const i = src.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') syv++; else if (src[k] === '}') { syv--; if (!syv) return src.slice(i, k + 1); } }
  throw new Error('sulkeet');
}

/* Paikallinen aika = UTC+3 (EEST), kiinteä "nyt". Date-argumentit: new Date(y,m,d,h,...) tulkitaan PAIKALLISENA (UTC+3) kuten selaimessa Suomessa. */
const OFF = 3 * 3600000;
function kello(nytLokaali /* [y,m,d,h,mi] paikallista */) {
  const nytMs = Date.UTC(nytLokaali[0], nytLokaali[1], nytLokaali[2], nytLokaali[3] || 0, nytLokaali[4] || 0) - OFF;
  class FD extends Date {
    constructor(...a) {
      if (a.length === 0) super(nytMs);
      else if (a.length >= 2 && typeof a[0] === 'number') super(Date.UTC(a[0], a[1], a[2] || 1, a[3] || 0, a[4] || 0, a[5] || 0, a[6] || 0) - OFF);
      else if (a.length === 1 && typeof a[0] === 'string' && /^\d{4}-\d{2}-\d{2}T00:00:00$/.test(a[0])) super(Date.parse(a[0] + 'Z') - OFF);   // pelkkä pvm = paikallinen keskiyö
      else super(...a);
    }
    _l() { return new Date(this.getTime() + OFF); }
    getFullYear() { return this._l().getUTCFullYear(); } getMonth() { return this._l().getUTCMonth(); } getDate() { return this._l().getUTCDate(); }
    getHours() { return this._l().getUTCHours(); } getMinutes() { return this._l().getUTCMinutes(); } getSeconds() { return this._l().getUTCSeconds(); } getMilliseconds() { return this._l().getUTCMilliseconds(); }
  }
  FD.UTC = Date.UTC; FD.parse = Date.parse;
  return FD;
}
const paik = (FD, y, m, d, h = 0, mi = 0, s = 0) => new FD(y, m, d, h, mi, s);   // paikallinen hetki
function lib(nytLok) {
  const FD = kello(nytLok); const sb = { Date: FD, window: {}, String, Array, Object, Number, isNaN, Math, RegExp };
  vm.createContext(sb); vm.runInContext(LIB, sb);
  return { K: sb.window.TM_KALENTERI_ILM, FD, nyt: new FD() };
}
const ts = (d) => ({ toDate: () => d });   // Firestore Timestamp -tynkä

describe('tmEvPaattyy / tmEvPaattynyt — näkyy päättymiseensä asti', () => {
  it('koko_paiva: näkyy koko päivän (00:30 → 23:59:59), katoaa vasta seuraavana päivänä', () => {
    const ev = (FD) => ({ koko_paiva: true, alkaa: ts(paik(FD, 2026, 9, 5)) });
    expect(lib([2026, 9, 5, 0, 30]).K.tmEvPaattynyt(ev(kello([2026, 9, 5])), lib([2026, 9, 5, 0, 30]).nyt)).toBe(false);
    [[2026, 9, 5, 0, 30], [2026, 9, 5, 12, 0], [2026, 9, 5, 23, 59]].forEach((n) => { const L = lib(n); expect(L.K.tmEvPaattynyt(ev(L.FD), L.nyt), n.join()).toBe(false); });
    const L = lib([2026, 9, 6, 0, 30]); expect(L.K.tmEvPaattynyt(ev(L.FD), L.nyt)).toBe(true);
  });
  it('pelkkä pvm (ei alkaa-kenttää) = koko päivä', () => {
    const L = lib([2026, 9, 5, 15, 0]); expect(L.K.tmEvPaattynyt({ pvm: '2026-10-05' }, L.nyt)).toBe(false);
    const M = lib([2026, 9, 6, 0, 5]); expect(M.K.tmEvPaattynyt({ pvm: '2026-10-05' }, M.nyt)).toBe(true);
  });
  it('alkaa 00:00 ilman päättymistä (Master tallentaa tyhjän ajan näin) = koko päivä; sama päättymisellä > alku = kellonajallinen', () => {
    const L = lib([2026, 9, 5, 14, 0]);
    expect(L.K.tmEvOnKellonaika({ alkaa: ts(paik(L.FD, 2026, 9, 5)), paattyy: ts(paik(L.FD, 2026, 9, 5)) })).toBe(false);
    expect(L.K.tmEvPaattynyt({ alkaa: ts(paik(L.FD, 2026, 9, 5)), paattyy: ts(paik(L.FD, 2026, 9, 5)) }, L.nyt)).toBe(false);
    expect(L.K.tmEvOnKellonaika({ alkaa: ts(paik(L.FD, 2026, 9, 5)), paattyy: ts(paik(L.FD, 2026, 9, 5, 18)) })).toBe(true);
  });
  it('kesken oleva tapahtuma (alkoi 17:00, päättyy 19:00): näkyy kesken, katoaa päättymisen jälkeen', () => {
    const mk = (FD) => ({ alkaa: ts(paik(FD, 2026, 9, 5, 17)), paattyy: ts(paik(FD, 2026, 9, 5, 19)) });
    let L = lib([2026, 9, 5, 18, 0]); expect(L.K.tmEvPaattynyt(mk(L.FD), L.nyt)).toBe(false);   // ennen: d < now → katosi 17:00
    L = lib([2026, 9, 5, 19, 1]); expect(L.K.tmEvPaattynyt(mk(L.FD), L.nyt)).toBe(true);
  });
  it('kellonaika mutta ei kelvollista päättymistä → päättyy alkuhetkeen (ei keksitä kestoa)', () => {
    const L = lib([2026, 9, 5, 17, 30]); const ev = { alkaa: ts(paik(L.FD, 2026, 9, 5, 17)) };
    expect(L.K.tmEvPaattyy(ev).getTime()).toBe(paik(L.FD, 2026, 9, 5, 17).getTime()); expect(L.K.tmEvPaattynyt(ev, L.nyt)).toBe(true);
  });
  it('monipäiväinen koko_paiva: päättyy paattyy-päivän loppuun', () => {
    const mk = (FD) => ({ koko_paiva: true, alkaa: ts(paik(FD, 2026, 9, 5)), paattyy: ts(paik(FD, 2026, 9, 7)) });
    let L = lib([2026, 9, 7, 22, 0]); expect(L.K.tmEvPaattynyt(mk(L.FD), L.nyt)).toBe(false);
    L = lib([2026, 9, 8, 0, 10]); expect(L.K.tmEvPaattynyt(mk(L.FD), L.nyt)).toBe(true);
  });
  it('klo 00–03-raja (paikallinen päivä, ei UTC): 6.10. klo 00:30 paikallista (UTC 5.10. 21:30) → 5.10.:n koko päivän tapahtuma on jo päättynyt', () => {
    const L = lib([2026, 9, 6, 0, 30]); expect(L.nyt.toISOString().slice(0, 10)).toBe('2026-10-05');   // UTC-päivä on vielä 5.10.
    expect(L.K.tmEvPaattynyt({ pvm: '2026-10-05' }, L.nyt)).toBe(true);
    const M = lib([2026, 9, 5, 0, 30]); expect(M.K.tmEvPaattynyt({ pvm: '2026-10-05' }, M.nyt)).toBe(false);   // 5.10. 00:30 paikallista: päivä alkoi, UTC-päivä 4.10.
  });
  it('merkkijono-alkaa ja puuttuvat/rikkinäiset kentät eivät kaada', () => {
    const L = lib([2026, 9, 5, 12, 0]);
    expect(L.K.tmEvPaattynyt({ alkaa: '2026-10-05T18:00:00+03:00', paattyy: '2026-10-05T19:00:00+03:00' }, L.nyt)).toBe(false);
    expect(L.K.tmEvPaattynyt({}, L.nyt)).toBe(false); expect(L.K.tmEvPaattynyt(null, L.nyt)).toBe(false); expect(L.K.tmEvPaattyy({ alkaa: 'ei pvm' })).toBeNull();
  });
});

describe('ilmoituksen päivä + näkyvyys', () => {
  const muist = (FD, lisa) => Object.assign({ id: 'n1', tyyppi: 'muistutus', teksti: 'Huomenna: Joukkueharjoitus klo 18:00 · Keskuskenttä', linkki: 'kalenteri:e1', luotu: ts(paik(FD, 2026, 9, 3, 17, 0)), luettu: false }, lisa || {});
  it('1) tapahtuma_alkaa voittaa; 2) tapahtuma linkin kautta; 3) muistutukselle luotu + 1 pv; muulle tyypille ei luotu-varapolkua', () => {
    const L = lib([2026, 9, 4, 10, 0]);
    expect(L.K.tmIlmoitusPaiva(muist(L.FD, { tapahtuma_alkaa: ts(paik(L.FD, 2026, 9, 9, 18)) }), []).lahde).toBe('tapahtuma_alkaa');
    expect(L.K.tmIlmoitusPaiva(muist(L.FD, { tapahtuma_alkaa: ts(paik(L.FD, 2026, 9, 9, 18)) }), []).pvm).toBe('2026-10-09');
    const p2 = L.K.tmIlmoitusPaiva(muist(L.FD), [{ id: 'e1', alkaa: ts(paik(L.FD, 2026, 9, 8, 18)) }]); expect(p2).toEqual({ pvm: '2026-10-08', lahde: 'tapahtuma' });
    expect(L.K.tmIlmoitusPaiva(muist(L.FD), [])).toEqual({ pvm: '2026-10-04', lahde: 'luotu' });   // luotu 3.10. 17:00 → tapahtuma 4.10.
    expect(L.K.tmIlmoitusPaiva(muist(L.FD, { tyyppi: 'muutos' }), [])).toBeNull();
    expect(L.K.tmIlmoitusPaiva({ tyyppi: 'muistutus', teksti: 'x' }, [])).toBeNull();
  });
  it('VANHA ilmoitus ilman tapahtuma_alkaa: "Huomenna" ei vanhene — tapahtumapäivänä "Tänään", sen jälkeen piilossa', () => {
    let L = lib([2026, 9, 3, 18, 0]); let r = L.K.tmIlmoitusRivi(muist(L.FD), [], L.nyt);   // kirjoitusiltana: Huomenna
    expect(r.nakyvissa).toBe(true); expect(r.paiva.tyyppi).toBe('huomenna'); expect(r.runko).toBe('Joukkueharjoitus klo 18:00 · Keskuskenttä');
    L = lib([2026, 9, 4, 10, 0]); r = L.K.tmIlmoitusRivi(muist(L.FD), [], L.nyt);          // tapahtumapäivänä aamulla
    expect(r.nakyvissa).toBe(true); expect(r.paiva.tyyppi).toBe('tanaan');
    L = lib([2026, 9, 4, 23, 30]); expect(L.K.tmIlmoitusRivi(muist(L.FD), [], L.nyt).nakyvissa).toBe(true);   // koko tapahtumapäivän
    L = lib([2026, 9, 5, 0, 5]); expect(L.K.tmIlmoitusRivi(muist(L.FD), [], L.nyt).nakyvissa).toBe(false);    // seuraavana päivänä pois
  });
  it('päivä myöhemmin → päivämäärä "9.10."', () => {
    const L = lib([2026, 9, 4, 10, 0]);
    const r = L.K.tmIlmoitusRivi(muist(L.FD, { tapahtuma_alkaa: ts(paik(L.FD, 2026, 9, 9, 18)) }), [], L.nyt);
    expect(r.paiva).toEqual({ tyyppi: 'myohemmin', pvmTxt: '9.10.' });
  });
  it('tapahtuma löytyy kalenterista ja on kesken → muistutus/muutos näkyy, vaikka alkuhetki on mennyt; päättynyt (ei kalenterissa, päivä mennyt) → piilossa', () => {
    const L = lib([2026, 9, 5, 18, 0]);
    const ev = { id: 'e1', alkaa: ts(paik(L.FD, 2026, 9, 5, 17)), paattyy: ts(paik(L.FD, 2026, 9, 5, 19)) };
    expect(L.K.tmIlmoitusNakyvissa(muist(L.FD, { luotu: ts(paik(L.FD, 2026, 9, 4, 17)) }), [ev], L.nyt)).toBe(true);
    expect(L.K.tmIlmoitusNakyvissa({ id: 'm', tyyppi: 'muutos', teksti: 'Muutos: X → klo 17:00', linkki: 'kalenteri:e1', tapahtuma_alkaa: ts(paik(L.FD, 2026, 9, 5, 17)) }, [ev], L.nyt)).toBe(true);
    const M = lib([2026, 9, 6, 9, 0]);
    expect(M.K.tmIlmoitusNakyvissa({ id: 'm', tyyppi: 'muutos', teksti: 'Muutos: X', linkki: 'kalenteri:e1', tapahtuma_alkaa: ts(paik(M.FD, 2026, 9, 5, 17)) }, [], M.nyt)).toBe(false);
  });
  it('tapahtuma päättynyt kalenterissa (paattyy mennyt) → muutosilmoitus piiloon heti, vaikka päivä on vielä tänään', () => {
    const L = lib([2026, 9, 5, 20, 0]);
    const ev = { id: 'e1', alkaa: ts(paik(L.FD, 2026, 9, 5, 17)), paattyy: ts(paik(L.FD, 2026, 9, 5, 19)) };
    expect(L.K.tmIlmoitusNakyvissa({ id: 'm', tyyppi: 'muutos', teksti: 'Muutos: X', linkki: 'kalenteri:e1' }, [ev], L.nyt)).toBe(false);
  });
  it('peruttu pysyy näkyvissä; päivätön muutos/muistutus (ei tietoa) näkyy ennallaan', () => {
    const L = lib([2026, 9, 20, 10, 0]);
    expect(L.K.tmIlmoitusNakyvissa({ id: 'p', tyyppi: 'peruttu', teksti: 'Peruttu: X', linkki: 'kalenteri:e9', tapahtuma_alkaa: ts(paik(L.FD, 2026, 9, 5, 17)) }, [], L.nyt)).toBe(true);
    expect(L.K.tmIlmoitusNakyvissa({ id: 'x', tyyppi: 'muutos', teksti: 'Muutos: X' }, [], L.nyt)).toBe(true);
    expect(L.K.tmIlmoitusRivi({ id: 'x', tyyppi: 'muistutus', teksti: 'Huomenna: Y' }, [], L.nyt)).toEqual({ nakyvissa: true, runko: 'Huomenna: Y', paiva: null });
  });
  it('tmIlmoitusEvId', () => { const L = lib([2026, 9, 5, 12, 0]); expect(L.K.tmIlmoitusEvId({ linkki: 'kalenteri:abc123' })).toBe('abc123'); expect(L.K.tmIlmoitusEvId({ linkki: 'x' })).toBeNull(); expect(L.K.tmIlmoitusEvId(null)).toBeNull(); });
});

/* ─── Sovellusten kytkentä: oikeat funktiot vm:ssä ─── */
describe('Pelaaja_v7 — kalenterin suodatus + ilmoituslista', () => {
  const P7 = lue('TalentMaster_Pelaaja_v7.html');
  function sovellus(nytLok, { kal = [], notif = [] } = {}) {
    const FD = kello(nytLok);
    const docs = kal.map((e, i) => ({ id: 'ev' + i, data: () => e(FD) }));
    const snapshot = { exists: false, forEach(cb) { docs.forEach(cb); } };
    const chain = { collection: () => chain, doc: () => chain, get: async () => snapshot };
    const sb = { Date: FD, String, Array, Object, Number, isNaN, Promise, Math, RegExp, console: { warn() {} },
      window: { _db: chain, _auth: { currentUser: {} }, _p7Notif: notif.map((f) => f(FD)), _p7Kalenteri: null }, _isDemoUser: false, _pelaaja: { id: 'P', seuraId: 'S' },
      _ladattu: {}, _tab: 'mina', _sc: 'main', draw() {}, t: LANG.t, _thEsc: (x) => String(x), _p7EvKuuluu: () => true };
    Object.assign(sb, PEL_APU); vm.createContext(sb); vm.runInContext(LIB, sb);
    vm.runInContext([pura(P7, 'function _p7EvPvm('), pura(P7, 'async function _p7LataaKalenteri('), pura(P7, 'function _p7NotifHTML(')].join('\n')
      + '\nthis.lataa = _p7LataaKalenteri; this.html = _p7NotifHTML; var _P7_NOTIF_IKO = {muistutus:"🔔"};', sb);
    return { sb, FD };
  }
  it('kalenteri: koko päivän (pvm), kesken oleva ja tuleva näkyvät; tänään päättynyt ei; aamulla 00:30 koko päivän tapahtuma näkyy', async () => {
    const { sb } = sovellus([2026, 9, 5, 0, 30], { kal: [
      () => ({ nimi: 'Koko päivän leiri', pvm: '2026-10-05' }),
      (FD) => ({ nimi: 'Kesken', alkaa: ts(paik(FD, 2026, 9, 5, 0, 10)), paattyy: ts(paik(FD, 2026, 9, 5, 2, 0)) }),
      (FD) => ({ nimi: 'Mennyt', alkaa: ts(paik(FD, 2026, 9, 4, 17)), paattyy: ts(paik(FD, 2026, 9, 4, 19)) }),
      (FD) => ({ nimi: 'Tuleva', alkaa: ts(paik(FD, 2026, 9, 6, 18)), paattyy: ts(paik(FD, 2026, 9, 6, 19)) }),
      () => ({ nimi: 'Poistettu', pvm: '2026-10-05', poistettu: true }),
    ] });
    await sb.lataa();
    expect(sb.window._p7Kalenteri.map((e) => e.nimi)).toEqual(['Koko päivän leiri', 'Kesken', 'Tuleva']);
  });
  it('kalenteri: koko päivän tapahtuma katoaa vasta seuraavana päivänä', async () => {
    const a = sovellus([2026, 9, 5, 23, 50], { kal: [() => ({ nimi: 'Leiri', pvm: '2026-10-05' })] }); await a.sb.lataa();
    expect(a.sb.window._p7Kalenteri.length).toBe(1);
    const b = sovellus([2026, 9, 6, 0, 10], { kal: [() => ({ nimi: 'Leiri', pvm: '2026-10-05' })] }); await b.sb.lataa();
    expect(b.sb.window._p7Kalenteri.length).toBe(0);
  });
  it('ilmoituslista: vanha muistutus (ei tapahtuma_alkaa) tapahtumapäivänä "Tänään: …" (ei vanhentunutta "Huomenna"), seuraavana päivänä piilossa', () => {
    const muist = (FD) => ({ id: 'n1', tyyppi: 'muistutus', teksti: 'Huomenna: Joukkueharjoitus klo 18:00', linkki: 'kalenteri:evX', luotu: ts(paik(FD, 2026, 9, 3, 17)), luettu: false });
    const a = sovellus([2026, 9, 4, 9, 0], { notif: [muist] }).sb.html();
    expect(a).toContain('Tänään: Joukkueharjoitus klo 18:00'); expect(a).not.toContain('Huomenna: Joukkueharjoitus');
    expect(sovellus([2026, 9, 3, 18, 0], { notif: [muist] }).sb.html()).toContain('Huomenna: Joukkueharjoitus klo 18:00');
    expect(sovellus([2026, 9, 5, 9, 0], { notif: [muist] }).sb.html()).toBe('');
  });
  it('ilmoituslista: peruttu näkyy, päättyneen muutos ei; lukemattomien määrä lasketaan vain näkyvistä', () => {
    const peruttu = () => ({ id: 'p', tyyppi: 'peruttu', teksti: 'Peruttu: Nopeustestit', linkki: 'kalenteri:e9', luettu: false });
    const muutos = (FD) => ({ id: 'm', tyyppi: 'muutos', teksti: 'Muutos: Harjoitus → klo 17:00', linkki: 'kalenteri:e1', tapahtuma_alkaa: ts(paik(FD, 2026, 9, 1, 17)), luettu: false });
    const h = sovellus([2026, 9, 5, 9, 0], { notif: [peruttu, muutos] }).sb.html();
    expect(h).toContain('Peruttu: Nopeustestit'); expect(h).not.toContain('Muutos: Harjoitus'); expect(h).toMatch(/Ilmoitukset[^<]*<span[^>]*>1</);
  });
  it('lähde: lib ladataan + SW cachettaa sen (offline)', () => {
    expect(P7).toContain('lib/tm_kalenteri_ilmoitus.js?v=1');
    expect(lue('sw_pelaaja.js')).toContain("/lib/tm_kalenteri_ilmoitus.js");
  });
});

describe('Vanhempi_v2 — sama suodatus + ilmoituslista', () => {
  const V2 = lue('TalentMaster_Vanhempi_v2.html');
  it('lähde: lib ladataan, kalenterisuodatin käyttää tmEvPaattynyt:tä (ei `d < now`), SW cachettaa libin', () => {
    expect(V2).toContain('lib/tm_kalenteri_ilmoitus.js?v=1');
    expect(pura(V2, 'async function _vanhLataaKalenteri(')).toMatch(/TM_KALENTERI_ILM \? window\.TM_KALENTERI_ILM\.tmEvPaattynyt\(ev, now\) : d < now/);
    expect(lue('sw_vanhempi.js')).toContain("/lib/tm_kalenteri_ilmoitus.js");
  });
  it('ilmoituslista: muistutus tapahtumapäivänä "Tänään: …", päättyneen muutos piilossa, peruttu näkyy', () => {
    const FD = kello([2026, 9, 5, 9, 0]);
    const sb = { Date: FD, String, Array, Object, RegExp, console: { warn() {} }, t: LANG.t, draw() {}, _VANH_NOTIF_IKO: {},
      window: { _vanhNotif: [
        { id: 'a', tyyppi: 'muistutus', teksti: 'Huomenna: Peli klo 12:00', linkki: 'kalenteri:q', luotu: ts(paik(FD, 2026, 9, 4, 17)), luettu: false },
        { id: 'b', tyyppi: 'muutos', teksti: 'Muutos: Vanha', linkki: 'kalenteri:z', tapahtuma_alkaa: ts(paik(FD, 2026, 9, 1, 12)), luettu: false },
        { id: 'c', tyyppi: 'peruttu', teksti: 'Peruttu: Testi', linkki: 'kalenteri:y', luettu: true }], _vanhKalenteri: null }, _vanhNotifLadattu: true };
    Object.assign(sb, PEL_APU); vm.createContext(sb); vm.runInContext(LIB, sb);
    vm.runInContext(pura(V2, 'function _vanhNotifHTML(') + '\nthis.html = _vanhNotifHTML;', sb);
    const h = sb.html();
    expect(h).toContain('Tänään: Peli klo 12:00'); expect(h).not.toContain('Muutos: Vanha'); expect(h).toContain('Peruttu: Testi');
  });
});

describe('tm_lang: uudet avaimet fi + en + sv (Gemini-erä 8.10.2026)', () => {
  const avaimet = [['pelaaja', 'ilm_tanaan'], ['pelaaja', 'ilm_huomenna'], ['vanhempi', 'ilm_tanaan'], ['vanhempi', 'ilm_huomenna']];
  it('fi + en + sv olemassa', () => {
    avaimet.forEach(([ns, k]) => { expect(LANG.TM_LANG.fi[ns][k], ns + k).toBeTruthy(); expect(LANG.TM_LANG.en[ns][k], ns + k).toBeTruthy(); expect((LANG.TM_LANG.sv[ns] || {})[k], ns + k).toBeTruthy(); });
  });
  it('ei odotuslistalla', () => { const l = require('./tm_lang_sv_odotuslista.cjs'); avaimet.forEach(([ns, k]) => expect(l).not.toContain(ns + '.' + k)); });
});
