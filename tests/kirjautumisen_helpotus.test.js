/**
 * Kirjautumisen helpotus (30.9.2026): henkilökohtainen linkki + pelkkä PIN (Pelaaja_v7) ja
 * "Pelaajan kirjautuminen" -kortti (Vanhempi_v2). Funktiot AJETAAN vm:ssä oikeasta lähteestä;
 * tyngät nimetty kuten tuotannon muuttujat. Palvelinpuoli: tests/pelaajakirjautuminen.test.js.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';
import { lisaaVerkko } from './_verkkoCtx.mjs';
import { lisaaP7Offline } from './_p7OfflineCtx.mjs';
import { PEL_APU } from './helpers/pelaaja_t.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const PEL = readFileSync(join(ROOT, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const VAN = readFileSync(join(ROOT, 'TalentMaster_Vanhempi_v2.html'), 'utf8');
const LANG = require_(join(ROOT, 'lib', 'tm_lang.js'));

function pura(S, tunniste) {
  const alku = S.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let d = 0;
  for (let j = S.indexOf(') {', alku) + 2; j < S.length; j++) {
    if (S[j] === '{') d++; else if (S[j] === '}') { d--; if (!d) return S.slice(alku, j + 1); }
  }
  throw new Error('sulkeet');
}

/* ── Pelaaja_v7 ── */
function ajaPelaaja({ url, kentta = '', vastaus }) {
  const loki = { kutsu: null, ls: {}, db: 0, virhe: [], lataa: null, draw: 0 };
  const ctx = {
    ...PEL_APU, console: { warn() {}, error() {} },
    _URL: url, _pin: '9278', _pinIlmoitus: '', _kirjautuminenKesken: false, _pinPalloIdTila: false,
    _TUNNUS_LS: 'tm_pelaaja_tunnus', _PK_VIRHE_TUNNISTUS: 'Tunnus tai PIN on väärin.',
    draw: () => { loki.draw++; }, _pinVirhe: (t) => loki.virhe.push(t),
    document: { getElementById: (id) => (id === 'pinTunnus' ? { value: kentta } : null) },
    localStorage: { setItem: (k, v) => { loki.ls[k] = v; }, removeItem() {} },
    _lataaOmaPelaaja: async (_db, sid, pid) => { loki.lataa = [sid, pid]; },
    _varapolunSyy: () => 'x', _raportoiVarapolku() {}, _kirjauduPinilla: async () => {},
    _infraVirheenSyy: () => 'x', _raportoiKirjautumisvirhe() {}, _PK_VIRHE_INFRA: 'infra',
    window: {
      _db: new Proxy({}, { get: () => { loki.db++; return () => {}; } }),   // mikä tahansa Firestore-kosketus lasketaan
      _auth: { signInWithCustomToken: async () => {} },
      _fbApp: { functions: () => ({ httpsCallable: () => async (data) => { loki.kutsu = data; return { data: vastaus }; } }) },
    },
  };
  vm.createContext(ctx); lisaaVerkko(ctx); lisaaP7Offline(ctx);
  vm.runInContext([
    pura(PEL, 'function _linkkiKirjautuminen() {'),
    pura(PEL, 'function _naytaPalloIdKentta() {'),
    pura(PEL, 'async function _kirjaudu(pin) {'),
  ].join('\n') + '\nthis.k = _kirjaudu; this.l = _linkkiKirjautuminen; this.n = _naytaPalloIdKentta;', ctx);
  return { loki, ctx };
}
const TOK = { token: 'T', seuraId: 'kpv', pelaajaId: 'm93', palloId: '12345678' };

describe('Pelaaja_v7 · linkki + pelkkä PIN (ajettu)', () => {
  it('linkillä (?p=&seura=): kutsu { seuraId, pelaajaId, pin } — ei PalloID-kenttää, ei Firestore-lukua ennen PIN:iä', async () => {
    const { loki, ctx } = ajaPelaaja({ url: { pelaajaId: 'm93', seuraId: 'kpv' }, vastaus: TOK });
    expect(ctx.l()).toEqual({ seuraId: 'kpv', pelaajaId: 'm93' });
    expect(loki.db).toBe(0);
    await ctx.k('9278');
    expect(loki.kutsu).toEqual({ seuraId: 'kpv', pelaajaId: 'm93', pin: '9278' });
    expect(loki.db).toBe(0);   // pelaaja ladataan vasta tokenin jälkeen (_lataaOmaPelaaja, tokenin tunnisteilla)
    expect(loki.lataa).toEqual(['kpv', 'm93']);
    expect(loki.ls.tm_pelaaja_tunnus).toBe('12345678');   // palvelimen palauttama PalloID muistetaan
  });
  it('"Kirjaudu PalloID:llä" palauttaa PalloID-reitin', async () => {
    const { loki, ctx } = ajaPelaaja({ url: { pelaajaId: 'm93', seuraId: 'kpv' }, kentta: '1234 5678', vastaus: TOK });
    ctx.n();
    expect(ctx.l()).toBe(null);
    expect(loki.draw).toBe(1);
    ctx._pin = '9278';
    await ctx.k('9278');
    expect(loki.kutsu).toEqual({ liittoTunnus: '12345678', pin: '9278' });
  });
  it('ilman linkkiä: PalloID vaaditaan (tyhjä kenttä → ohje, ei kutsua)', async () => {
    const { loki, ctx } = ajaPelaaja({ url: { pelaajaId: null, seuraId: null }, vastaus: TOK });
    expect(ctx.l()).toBe(null);
    await ctx.k('9278');
    expect(loki.kutsu).toBe(null);
    expect(loki.virhe).toEqual(['Kirjoita ensin PalloID.']);
  });
  it('pelkkä ?p= ilman seuraa ei ole linkkitila', () => {
    expect(ajaPelaaja({ url: { pelaajaId: 'm93', seuraId: null } }).ctx.l()).toBe(null);
  });
  it('rPin: PalloID-kenttä ja "Kirjaudu PalloID:llä" -linkki riippuvat linkkitilasta', () => {
    const r = PEL.slice(PEL.indexOf('function rPin(){'), PEL.indexOf('function _toggleEmailLogin()'));
    expect(r).toMatch(/\$\{_linkkiKirjautuminen\(\) \? '' : `<input id="pinTunnus"/);
    expect(r).toMatch(/\$\{_linkkiKirjautuminen\(\) \? `<button id="pinPalloIdLinkki" onclick="_naytaPalloIdKentta\(\)"/);
    expect(r).toContain("_linkkiKirjautuminen() ? t('pelaaja.syota_pin_koodisi') : t('pelaaja.syota_pin')");
  });
  it('URL ei kirjaa sisään: auth-kuuntelija ei lue _URL:ia eikä kutsu kirjautumista', () => {
    const i = PEL.indexOf('auth.onAuthStateChanged(async user => {');
    const kuuntelija = PEL.slice(i, PEL.indexOf('\n  });', i));
    expect(kuuntelija).not.toMatch(/_URL|_linkkiKirjautuminen|pelaajaKirjaudu/);
  });
});

/* ── Vanhempi_v2 ── */
function ajaVanhempi({ L, tunnisteet, share = true }) {
  LANG.tmAsetaKieli('fi', false);
  const loki = { jaettu: null, leike: null, toast: [] };
  const ctx = {
    t: LANG.t, window: { _lapsi: L, _lapsiTunnisteet: tunnisteet },
    location: { href: 'https://tm.example/talentmaster/TalentMaster_Vanhempi_v2.html?uid=x' },
    URL, encodeURIComponent, String,
    IKA: { u15: { nimi: 'Topias' } }, _age: 'u15',
    navigator: share
      ? { share: (o) => { loki.jaettu = o; return Promise.resolve(); } }
      : { clipboard: { writeText: (x) => { loki.leike = x; return Promise.resolve(); } } },
    _toast: (x) => loki.toast.push(x),
  };
  vm.createContext(ctx); lisaaVerkko(ctx); lisaaP7Offline(ctx);
  vm.runInContext([
    VAN.slice(VAN.indexOf('function _genetiivi(nimi) {'), VAN.indexOf('\n}\n', VAN.indexOf('function _genetiivi(nimi) {')) + 2),
    VAN.slice(VAN.indexOf('function _vEsc(s){'), VAN.indexOf('\n', VAN.indexOf('function _vEsc(s){'))),
    pura(VAN, 'function _lapsenPalloId(L) {'),
    pura(VAN, 'function _pelaajanLinkki() {'),
    pura(VAN, 'function _pelaajanKirjautuminenHTML(nimi, palloId, pin) {'),
    pura(VAN, 'function _jaaPelaajanLinkki() {'),
    pura(VAN, 'function _kopioiTeksti(teksti, ilmoitus) {'),
    pura(VAN, 'function _ikavaiheTeksti(a) {'),
  ].join('\n') + '\nthis.html = _pelaajanKirjautuminenHTML; this.jaa = _jaaPelaajanLinkki; this.pid = _lapsenPalloId; this.ika = _ikavaiheTeksti;', ctx);
  return { loki, ctx };
}
const TT = { seuraId: 'kpv', pelaajaId: 'm93GBdOaGCUuenMiCL0I' };

describe('Vanhempi_v2 · Pelaajan kirjautuminen -kortti (ajettu)', () => {
  it('näyttää PalloID:n ja PIN:n kopioitavina + jaa/avaa-linkin', () => {
    const { ctx } = ajaVanhempi({ L: { tunniste: '12345678', pin: '9278' }, tunnisteet: TT });
    const h = ctx.html('Topias', ctx.pid({ tunniste: '12345678' }), '9278');
    expect(h).toContain('Topias kirjautuu omaan näkymäänsä PalloID:llä ja PIN-koodilla.');
    expect(h).toContain('12345678');
    expect(h).toContain('9278');
    expect(h).toContain("_kopioiTeksti('12345678')");
    expect(h).toContain("_kopioiPin('9278')");
    expect(h).toContain('_jaaPelaajanLinkki()');
    expect(h).toContain('TalentMaster_Pelaaja_v7.html?p=m93GBdOaGCUuenMiCL0I&amp;seura=kpv');
    expect(h).toContain('Avaa pelaajan sivu');
  });
  it('PalloID puuttuu → himmennetty ohje, PIN ja linkki silti', () => {
    const { ctx } = ajaVanhempi({ L: { pin: '9278' }, tunnisteet: TT });
    const h = ctx.html('Topias', ctx.pid({ pin: '9278' }), '9278');
    expect(h).toContain('PalloID puuttuu, pyydä seuraa lisäämään se.');
    expect(h).toContain('9278');
    expect(h).toContain('_jaaPelaajanLinkki()');
  });
  it('PIN puuttuu → nykyinen ohje, EI nappeja eikä linkkiä', () => {
    const { ctx } = ajaVanhempi({ L: { tunniste: '12345678' }, tunnisteet: TT });
    const h = ctx.html('Topias', '12345678', null);
    expect(h).toContain('PIN-koodia ei ole vielä asetettu');
    expect(h).not.toMatch(/_jaaPelaajanLinkki|_kopioi|Pelaaja_v7/);
  });
  it('jako: teksti EI sisällä PIN:iä; linkki kertoo pelaajan ja seuran', () => {
    const { loki, ctx } = ajaVanhempi({ L: { etunimi: 'Topias', pin: '9278', tunniste: '12345678' }, tunnisteet: TT });
    ctx.jaa();
    expect(loki.jaettu.text).toBe('Topiaksen TalentMaster: avaa linkki ja syötä PIN-koodisi.');
    expect(loki.jaettu.url).toBe('https://tm.example/talentmaster/TalentMaster_Pelaaja_v7.html?p=m93GBdOaGCUuenMiCL0I&seura=kpv');
    expect(JSON.stringify(loki.jaettu)).not.toContain('9278');
  });
  it('ilman Web Share API:a → linkki + teksti leikepöydälle (ei PIN:iä)', async () => {
    const { loki, ctx } = ajaVanhempi({ L: { pin: '9278' }, tunnisteet: TT, share: false });
    ctx.jaa();
    await Promise.resolve();
    expect(loki.leike).toContain('TalentMaster_Pelaaja_v7.html?p=m93GBdOaGCUuenMiCL0I&seura=kpv');
    expect(loki.leike).not.toContain('9278');
  });
  it('ikävaihe näytetään vuosina, ei joukkueen näköisenä (U15 → 13–15 v)', () => {
    const { ctx } = ajaVanhempi({ L: {}, tunnisteet: TT });
    expect([ctx.ika('u12'), ctx.ika('u15'), ctx.ika('u19')]).toEqual(['10–12 v', '13–15 v', '16–19 v']);
    expect(VAN).not.toContain('${_age.toUpperCase()}');
  });
});
