/**
 * Pelaaja-app V2 · Vaihe 0 · P0.5: putki (streak)
 *  1) "tänään" = PAIKALLINEN päivä (§7.26), ei UTC-päivä: yöllä 0–3 (EET/EEST) UTC-päivä on eilinen → vastakirjattu treeni ei laskenut / putki katkesi
 *  2) pelkkä fiilis ei kasvata putkea: päivädokumentti lasketaan treenipäiväksi vain jos siinä on treeni (tehty / tyyppi / sessiot)
 * Oikeat funktiot (_laskeStreak, _kirjausOnTreeni, _treeniPaivaIdt, _lataaCStreak) vm:ssä; kello kiinnitetty (Date-tynkä, paikallinen = UTC+3).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');
function pura(tunniste) {
  const i = HTML.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = HTML.indexOf('{', i); k < HTML.length; k++) { if (HTML[k] === '{') syv++; else if (HTML[k] === '}') { syv--; if (!syv) return HTML.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
/* Kiinteä "nyt" (UTC-hetki) + paikalliset getterit = UTC+3 (EEST). Argumentilliset Date:t käyttäytyvät normaalisti. */
function kello(utcMs) {
  const OFF = 3 * 3600000;
  class FD extends Date {
    constructor(...a) { if (a.length === 0) super(utcMs); else super(...a); }
    getFullYear() { return new Date(this.getTime() + OFF).getUTCFullYear(); }
    getMonth() { return new Date(this.getTime() + OFF).getUTCMonth(); }
    getDate() { return new Date(this.getTime() + OFF).getUTCDate(); }
  }
  FD.UTC = Date.UTC;
  return FD;
}
// 5.10.2026 00:30 paikallista (= 4.10. 21:30 UTC)
const YO = Date.UTC(2026, 9, 4, 21, 30);
// 4.10.2026 14:00 paikallista (= 11:00 UTC) — päivällä UTC- ja paikallinen päivä samat
const PAIVA = Date.UTC(2026, 9, 4, 11, 0);
const ymp = (utcMs, extra = {}) => {
  const sb = Object.assign({ Date: kello(utcMs), String, Array, Object, RegExp, Math, Promise, console: { warn() {} }, _streak: 0, _streakLastDate: null, draw() {} }, extra);
  vm.createContext(sb);
  vm.runInContext([pura('function _laskeStreak('), pura('function _kirjausOnTreeni('), pura('function _treeniPaivaIdt('), pura('function _paivaIso('), pura('async function _lataaCStreak(')].join('\n')
    + '\nthis.laske = _laskeStreak; this.treeni = _kirjausOnTreeni; this.idt = _treeniPaivaIdt; this.cstreak = _lataaCStreak; this.pi = _paivaIso;', sb);
  return sb;
};

describe('P0.5.1 putki käyttää paikallista päivää', () => {
  it('kello 00:30 (paikallinen 5.10., UTC 4.10.): treeni kirjattu 5.10. + 4.10. → putki 2 (UTC-päivä antoi 1)', () => {
    expect(ymp(YO).laske(['2026-10-05', '2026-10-04'])).toBe(2);
  });
  it('00:30: vain tämän päivän (5.10.) kirjaus → putki 1 (UTC-päivä antoi 0)', () => {
    expect(ymp(YO).laske(['2026-10-05'])).toBe(1);
  });
  it('00:30: eilinen (4.10.) kirjattu, tänään kesken → putki elossa (1); ei eilistä eikä tänään → 0', () => {
    expect(ymp(YO).laske(['2026-10-04'])).toBe(1);
    expect(ymp(YO).laske(['2026-10-03'])).toBe(0);
  });
  it('päivällä käytös ennallaan; kuukauden/vuoden vaihde', () => {
    expect(ymp(PAIVA).laske(['2026-10-04', '2026-10-03', '2026-10-02'])).toBe(3);
    expect(ymp(PAIVA).laske(['2026-10-03'])).toBe(1);   // tänään kesken, eilinen kirjattu
    expect(ymp(Date.UTC(2027, 0, 1, 0, 30) - 3 * 3600000).laske(['2027-01-01', '2026-12-31', '2026-12-30'])).toBe(3);
  });
  it('_paivaIso paikallinen (00:30 → 2026-10-05)', () => { expect(ymp(YO).pi()).toBe('2026-10-05'); });
});

describe('P0.5.2 fiilis ei kasvata putkea', () => {
  it('_kirjausOnTreeni: tehty / tyyppi / sessiot = treeni; pelkkä fiilinki(+lahde/luotu) ei', () => {
    const sb = ymp(PAIVA);
    expect(sb.treeni({ tehty: true, tyyppi: 'T' })).toBe(true);
    expect(sb.treeni({ tyyppi: 'D' })).toBe(true);
    expect(sb.treeni({ sessiot: [{ sk: 'valmentaja' }] })).toBe(true);
    expect(sb.treeni({ fiilinki: 4, lahde: 'pelaaja', luotu: 'x', paivitetty: 'y' })).toBe(false);
    expect(sb.treeni({ sessiot: [] })).toBe(false); expect(sb.treeni({})).toBe(false); expect(sb.treeni(null)).toBe(false);
  });
  const snap = (rivit) => ({ docs: rivit.map(([id, data]) => ({ id, data: () => data })) });
  it('_treeniPaivaIdt jättää fiilis-päivät pois', () => {
    const sb = ymp(PAIVA);
    expect(sb.idt(snap([['2026-10-04', { tehty: true, tyyppi: 'T' }], ['2026-10-03', { fiilinki: 5 }], ['2026-10-02', { sessiot: [{ x: 1 }] }]]))).toEqual(['2026-10-04', '2026-10-02']);
  });
  it('putki: treeni 4.10., PELKKÄ fiilis 3.10., treeni 2.10. → putki 1 (fiilispäivä katkaisee, ei jatka)', () => {
    const sb = ymp(PAIVA);
    expect(sb.laske(sb.idt(snap([['2026-10-04', { tehty: true }], ['2026-10-03', { fiilinki: 5 }], ['2026-10-02', { tehty: true }]])))).toBe(1);
  });
  it('tänään vain fiilis + eilen treeni → putki 1 (eilinen pitää elossa, fiilis ei lisää)', () => {
    const sb = ymp(PAIVA);
    expect(sb.laske(sb.idt(snap([['2026-10-04', { fiilinki: 3 }], ['2026-10-03', { tehty: true }]])))).toBe(1);
  });
  it('_lataaCStreak (treenin kirjauksen jälkeinen päivitys) käyttää samaa suodatusta', async () => {
    const docs = [['2026-10-04', { tehty: true }], ['2026-10-03', { fiilinki: 5 }], ['2026-10-02', { tehty: true }]];
    const sb = ymp(PAIVA, {
      _pelaaja: { id: 'P', seuraId: 'S' }, window: { _db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ collection: () => ({ orderBy: () => ({ limit: () => ({ get: async () => snap(docs) }) }) }) }) }) }) }) } },
    });
    await sb.cstreak();
    vm.runInContext('this.tulos = _streak;', sb);
    expect(sb.tulos).toBe(1);
  });
  it('_alustaOmatoimi (sovelluksen käynnistys) laskee putken samoin: fiilis-päivä ei jatka putkea, paikallinen päivä', async () => {
    const docs = [['2026-10-05', { tehty: true }], ['2026-10-04', { fiilinki: 5 }], ['2026-10-03', { tehty: true }]];
    const sb = ymp(YO, {
      _pelaaja: { id: 'P', seuraId: 'S' }, window: { _db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ collection: () => ({ orderBy: () => ({ limit: () => ({ get: async () => Object.assign(snap(docs), { size: 3 }) }) }) }) }) }) }) }) } },
    });
    vm.runInContext(pura('async function _alustaOmatoimi(') + '\nthis.omatoimi = _alustaOmatoimi;', sb);
    await sb.omatoimi();
    vm.runInContext('this.tulos = _streak; this.viim = _streakLastDate;', sb);
    expect(sb.tulos).toBe(1);            // vain 5.10. (00:30 paikallista); 4.10. oli pelkkä fiilis → putki katkeaa
    expect(sb.viim).toBe('2026-10-05');
  });
  it('lähde: tmFiilinki ei kirjoita streak/tehty-kenttiä (vain fiilinki via _tmKirjaa)', () => {
    expect(pura('async function tmFiilinki(')).toContain("_tmKirjaa('fiilinki'");
    expect(pura('async function tmFiilinki(')).not.toMatch(/streak|tehty/);
  });
});
