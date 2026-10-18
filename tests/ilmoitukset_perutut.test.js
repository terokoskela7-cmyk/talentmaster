/* B (18.10.2026): perutut tapahtumat eivät jää ilmoituksiin — "Peruttu" näkyy kunnes tapahtuman alkuhetki on mennyt;
   rivin napautus / ✕ kuittaa laitteelle (localStorage) eikä palaa. Ei Firestore-kenttää, ei Rules-muutosta.
   Ajoajan aikavyöhyke ei vaikuta: kaikki hetket rakennetaan paikallisina (new Date(y, m, d, h, mi)) ja lib käyttää paikallisia getttereitä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const K = require('../lib/tm_kalenteri_ilmoitus.js');
const LANG = require('../lib/tm_lang.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const ts = (d) => ({ toDate: () => d });
const D = (y, m, d, h = 0, mi = 0) => new Date(y, m, d, h, mi);
const NYT = D(2026, 9, 20, 10, 0);   // ma 20.10.2026 10:00
const peruttu = (extra) => Object.assign({ id: 'peruttu_e1', tyyppi: 'peruttu', teksti: 'Peruttu: Harjoitus — Nopeus', linkki: 'kalenteri:e1', luotu: ts(D(2026, 9, 18, 12, 0)), luettu: false }, extra);
const muisti = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m }; };

describe('B1 · peruttu näkyy vain kunnes alkuhetki on mennyt', () => {
  it('mennyt tapahtuma → ei riviä; tuleva → rivi', () => {
    expect(K.tmIlmoitusNakyvissa(peruttu({ tapahtuma_alkaa: ts(D(2026, 9, 19, 17)) }), [], NYT)).toBe(false);
    expect(K.tmIlmoitusNakyvissa(peruttu({ tapahtuma_alkaa: ts(D(2026, 9, 21, 17)) }), [], NYT)).toBe(true);
  });
  it('raja on alkuhetki: samana päivänä ennen alkua näkyy, alun jälkeen ei', () => {
    const n = peruttu({ tapahtuma_alkaa: ts(D(2026, 9, 20, 17)) });
    expect(K.tmIlmoitusNakyvissa(n, [], D(2026, 9, 20, 16, 59))).toBe(true);
    expect(K.tmIlmoitusNakyvissa(n, [], D(2026, 9, 20, 17, 1))).toBe(false);
  });
  it('kellonajaton (keskiyö) tapahtuma näkyy päivän loppuun, ei katoa päivän alussa', () => {
    const n = peruttu({ tapahtuma_alkaa: ts(D(2026, 9, 20)) });
    expect(K.tmIlmoitusNakyvissa(n, [], D(2026, 9, 20, 0, 30))).toBe(true);
    expect(K.tmIlmoitusNakyvissa(n, [], D(2026, 9, 20, 23, 50))).toBe(true);
    expect(K.tmIlmoitusNakyvissa(n, [], D(2026, 9, 21, 0, 5))).toBe(false);
  });
  it('ei tapahtuma_alkaa → alku linkitetystä tapahtumasta', () => {
    const ev = { id: 'e1', alkaa: ts(D(2026, 9, 19, 17)), paattyy: ts(D(2026, 9, 19, 18)) };
    expect(K.tmIlmoitusNakyvissa(peruttu(), [ev], NYT)).toBe(false);
    expect(K.tmIlmoitusNakyvissa(peruttu(), [Object.assign({}, ev, { alkaa: ts(D(2026, 9, 22, 17)) })], NYT)).toBe(true);
  });
  it('alkua ei saada (vanha dokumentti, tapahtuma ei listalla) → luotu + 7 vrk', () => {
    expect(K.tmIlmoitusNakyvissa(peruttu({ luotu: ts(D(2026, 9, 18, 12)) }), [], NYT)).toBe(true);
    expect(K.tmIlmoitusNakyvissa(peruttu({ luotu: ts(D(2026, 9, 10, 12)) }), [], NYT)).toBe(false);
  });
  it('muistutus ja muutos käyttäytyvät ennallaan', () => {
    expect(K.tmIlmoitusNakyvissa({ id: 'm', tyyppi: 'muutos', teksti: 'Muutos: X' }, [], NYT)).toBe(true);
    expect(K.tmIlmoitusNakyvissa({ id: 'm', tyyppi: 'muutos', teksti: 'Muutos: X', tapahtuma_alkaa: ts(D(2026, 9, 19, 17)) }, [], NYT)).toBe(false);
  });
});

describe('B · perutun tapahtuman päivä (lib)', () => {
  const ev = { id: 'e1', alkaa: ts(D(2026, 9, 23, 17)), paattyy: ts(D(2026, 9, 23, 18)) };
  it('pvm = tapahtuma_alkaa, muuten linkitetty tapahtuma, muuten ei kenttää; muu tyyppi ei saa pvm:ää', () => {
    expect(K.tmIlmoitusRivi(peruttu({ tapahtuma_alkaa: ts(D(2026, 9, 21, 17)) }), [], NYT).pvm.getDate()).toBe(21);
    expect(K.tmIlmoitusRivi(peruttu(), [ev], NYT).pvm.getDate()).toBe(23);
    expect('pvm' in K.tmIlmoitusRivi(peruttu(), [], NYT)).toBe(false);
    expect('pvm' in K.tmIlmoitusRivi({ id: 'm', tyyppi: 'muutos', teksti: 'Muutos: X', tapahtuma_alkaa: ts(D(2026, 9, 21, 17)) }, [], NYT)).toBe(false);
  });
  it('kellonajaton (keskiyö) tapahtuma pysyy omalla päivällään', () => { expect(K.tmIlmoitusRivi(peruttu({ tapahtuma_alkaa: ts(D(2026, 9, 21)) }), [], NYT).pvm.getDate()).toBe(21); });
});

describe('B2 · kuittaus laitteelle', () => {
  const tul = () => peruttu({ tapahtuma_alkaa: ts(D(2026, 9, 21, 17)) });
  it('kuitattu ei näy uudelleenlatauksen (uuden lukukerran) jälkeen', () => {
    const S = muisti(); expect(K.tmIlmoitusKuittaa(S, 'seura/pel', tul())).toBe(true);
    expect(K.tmIlmoitusRivi(tul(), [], NYT, null, K.tmIlmoitusKuitatut(S, 'seura/pel')).nakyvissa).toBe(false);   // uusi muistinluku = "lataus"
    expect(K.tmIlmoitusRivi(tul(), [], NYT, null, K.tmIlmoitusKuitatut(S, 'seura/toinen')).nakyvissa).toBe(true);   // toisen pelaajan/lapsen kuittaus erillään
  });
  it('uusi peruminen samalle tapahtumalle (luotu muuttuu) näkyy uudelleen', () => {
    const S = muisti(); K.tmIlmoitusKuittaa(S, 'p', tul());
    const uusi = peruttu({ tapahtuma_alkaa: ts(D(2026, 9, 21, 17)), luotu: ts(D(2026, 9, 19, 9)) });
    expect(K.tmIlmoitusNakyvissa(uusi, [], NYT, K.tmIlmoitusKuitatut(S, 'p'))).toBe(true);
  });
  it('kuittaus koskee vain peruttua; rikkinäinen / puuttuva muisti ei kaada', () => {
    const S = muisti(); K.tmIlmoitusKuittaa(S, 'p', { id: 'm', tyyppi: 'muutos', luotu: ts(D(2026, 9, 18)) });
    expect(K.tmIlmoitusNakyvissa({ id: 'm', tyyppi: 'muutos', teksti: 'Muutos: X', luotu: ts(D(2026, 9, 18)) }, [], NYT, K.tmIlmoitusKuitatut(S, 'p'))).toBe(true);
    expect(K.tmIlmoitusKuitatut({ getItem: () => '{rikki' }, 'p')).toEqual([]);
    expect(K.tmIlmoitusKuittaa({ getItem: () => null, setItem: () => { throw new Error('täynnä'); } }, 'p', tul())).toBe(false);
    expect(K.tmIlmoitusKuitatut(null, 'p')).toEqual([]);
  });
  it('lista rajataan 100 kuittaukseen', () => {
    const S = muisti(); for (let i = 0; i < 130; i++) K.tmIlmoitusKuittaa(S, 'p', { id: 'x' + i, luotu: ts(D(2026, 9, 1)) });
    expect(K.tmIlmoitusKuitatut(S, 'p').length).toBe(100);
  });
});

/* ── Sovellusten renderöinti: HTML-funktiot ajetaan vm-hiekkalaatikossa (muistin tynkä nimetty kuten tuotannossa: window.localStorage) ── */
function pura(src, tunniste) {
  const i = src.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') syv++; else if (src[k] === '}') { syv--; if (!syv) return src.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
class FD extends Date { constructor(...a) { if (a.length === 0) super(NYT.getTime()); else super(...a); } }
const LIB = lue('lib/tm_kalenteri_ilmoitus.js');
function app(nimi, notifit, storage) {
  const pel = nimi === 'pelaaja';
  const src = lue(pel ? 'TalentMaster_Pelaaja_v7.html' : 'TalentMaster_Vanhempi_v2.html');
  const win = pel ? { _p7Notif: notifit, _p7Kalenteri: [], localStorage: storage } : { _vanhNotif: notifit, _vanhKalenteri: [], _lapsi: { seuraId: 's1', id: 'p1' }, localStorage: storage };
  const sb = { Date: FD, String, Array, Object, RegExp, JSON, console: { warn() {} }, setTimeout() {}, document: { querySelectorAll: () => [] }, t: LANG.t, T: (k) => (k === 'ilmoitukset' ? 'Ilmoitukset' : LANG.t(k)), draw() {}, window: win, _ladattu: { notif: true }, _vanhNotifLadattu: true, _P7_NOTIF_IKO: {}, _VANH_NOTIF_IKO: {}, _thEsc: (s) => s, _pelaaja: { seuraId: 's1', id: 'p1' }, _isDemoUser: false };
  vm.createContext(sb); vm.runInContext(LIB, sb);
  vm.runInContext(pel ? "var _P7_VKOPV = ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La'];" : "var _VANH_VKOPV = ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La'];", sb);
  const f = pel ? ['function _p7Vkopv(', 'function _p7KuittausTunniste(', 'function _p7Kuitatut(', 'function _p7NotifHTML(', 'function _p7NotifKuittaa(', 'function _p7NotifTap('] : ['function _vanhVkopv(', 'function _vanhKuittausTunniste(', 'function _vanhKuitatut(', 'function _vanhNotifHTML(', 'function _vanhNotifKuittaa(', 'function _vanhNotifTap('];
  vm.runInContext(f.map((x) => pura(src, x)).join('\n') + '\nthis.html = ' + (pel ? '_p7NotifHTML' : '_vanhNotifHTML') + '; this.kuittaa = ' + (pel ? '_p7NotifKuittaa' : '_vanhNotifKuittaa') + '; this.tap = ' + (pel ? '_p7NotifTap' : '_vanhNotifTap') + ';\nthis._p7MerkitseLuettu = this._vanhMerkitseLuettu = function () {};', sb);
  return sb;
}
describe.each(['pelaaja', 'vanhempi'])('%s-sovellus · perutut ilmoituksissa', (nimi) => {
  const lista = () => [
    peruttu({ id: 'a', teksti: 'Peruttu: Mennyt', tapahtuma_alkaa: ts(D(2026, 9, 19, 17)) }),
    peruttu({ id: 'b', teksti: 'Peruttu: Tuleva', tapahtuma_alkaa: ts(D(2026, 9, 21, 17)) }),
    peruttu({ id: 'c', teksti: 'Peruttu: Toinen tuleva', tapahtuma_alkaa: ts(D(2026, 9, 22, 17)) }),
  ];
  it('mennyt → ei riviä; tuleva → rivi ✕-kuittauksella; lukemattomien määrä vain näkyvistä', () => {
    const h = app(nimi, lista(), muisti()).html();
    expect(h).not.toContain('Peruttu: Mennyt'); expect(h).toContain('Peruttu: Tuleva'); expect(h).toContain('data-ilm-kuittaa'); expect(h).toContain('✕');
    expect(h).toMatch(/Ilmoitukset[^<]*<span[^>]*>2</);
  });
  it('rivillä on tapahtuman päivä (tapahtuma_alkaa), muoto kuten tapahtumalistassa; ei päivää → rivi ennallaan', () => {
    const h = app(nimi, lista(), muisti()).html();
    expect(h).toContain('Peruttu: Tuleva · Ke 21.10.'); expect(h).toContain('Peruttu: Toinen tuleva · To 22.10.');   // 18.10.2026 on sunnuntai → 21.10. keskiviikko
    const ilman = app(nimi, [peruttu({ id: 'z', teksti: 'Peruttu: Päiväämätön', luotu: ts(D(2026, 9, 19, 12)) })], muisti()).html();
    expect(ilman).toContain('Peruttu: Päiväämätön<'); expect(ilman).not.toContain('Peruttu: Päiväämätön ·');
  });
  it('kuittaus (✕) poistaa rivin ja pysyy poissa uudelleenlatauksen jälkeen (uusi sovellusinstanssi, sama muisti)', () => {
    const S = muisti(), a = app(nimi, lista(), S); a.kuittaa('b');
    const h = a.html(); expect(h).not.toContain('Peruttu: Tuleva'); expect(h).toContain('Peruttu: Toinen tuleva');
    expect(app(nimi, lista(), S).html()).not.toContain('Peruttu: Tuleva');
    expect(S._m['tm_ilm_kuitattu:s1/p1']).toBeTruthy();
  });
  it('rivin napautus kuittaa myös', () => {
    const S = muisti(), a = app(nimi, lista(), S); a.tap('c', 'kalenteri:e1');
    expect(a.html()).not.toContain('Peruttu: Toinen tuleva');
  });
  it('kaikki kuitattu → ei ilmoituslohkoa lainkaan', () => {
    const S = muisti(), a = app(nimi, lista(), S); a.kuittaa('b'); a.kuittaa('c'); expect(a.html()).toBe('');
  });
  it('✕-painikkeella on saavutettava nimi (yleiset.sulje) ja sivu lataa libin', () => {
    expect(app(nimi, lista(), muisti()).html()).toContain('aria-label="Sulje"');
  });
});
