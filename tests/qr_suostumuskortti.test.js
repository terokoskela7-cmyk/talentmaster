/**
 * QR-suostumuskortti (PR B, 1.10.2026). Kutsu palvelimella (luoSuostumusKortit), QR:ssä vain kutsuId + seuraId +
 * pelaajaId, suostumuskortissa ei PIN:iä eikä PalloID:tä, uusintatulostus käyttää samaa avointa kutsua, väärä sähköposti
 * hylätään selkeällä syykoodilla ja oikea tallentaa suostumuksen + luo PIN:n (PR A).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';
import { fakeDb } from './_fakeFirestore.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const lue = (n) => readFileSync(join(ROOT, n), 'utf8');
const SK = require_('../functions/suostumuskortit.js');
class HttpsError extends Error { constructor(c, m, d) { super(m); this.code = c; this.details = d; } }
const FieldValue = { serverTimestamp: () => 'TS' };
const VP = { auth: { uid: 'vp-kpv', token: { seuraId: 'kpv', rooli: 'vp', firebase: { sign_in_provider: 'password' } } } };
const VALM15 = { auth: { uid: 'valm-u15', token: { seuraId: 'kpv', rooli: 'valmentaja', firebase: { sign_in_provider: 'password' } } } };
const ANON = { auth: { uid: 'anon', token: { firebase: { sign_in_provider: 'anonymous' } } } };

function data() {
  return {
    'seurat/kpv/pelaajat/ok': { etunimi: 'Topias', joukkueet: ['kpv_u13'], huoltajaEmail: 'h1@tm-testi.fi', suostumusTila: 'annettu', pin: '482915' },
    'seurat/kpv/pelaajat/uusi': { etunimi: 'Uusi', joukkueet: ['kpv_u13'], huoltajaEmail: 'h2@tm-testi.fi', suostumusTila: 'pilotti' },
    'seurat/kpv/pelaajat/kutsuttu': { etunimi: 'Kutsuttu', joukkueet: ['kpv_u13'], huoltajaEmail: 'h3@tm-testi.fi', suostumusTila: 'odottaa' },
    'seurat/kpv/pelaajat/eiemail': { etunimi: 'Ilman', joukkueet: ['kpv_u13'], suostumusTila: 'pilotti' },
    'seurat/kpv/kutsut/vanhaAvoin': { pelaajaId: 'kutsuttu', tila: 'lahetetty', tyyppi: 'huoltaja_suostumus' },
    'seurat/kpv/kutsut/kaytetty': { pelaajaId: 'uusi', tila: 'hyvaksytty' },
    'seurat/kpv/kayttajat/valm-u15': { rooli: 'valmentaja', joukkueet: ['kpv_u15'] },
  };
}
function ymp(alku) {
  const f = fakeDb(alku || data());
  const audit = [];
  const fn = SK.luoKasittelija({ db: f.db, HttpsError, FieldValue, tarkistaOikeus: async (uid) => ({ sallittu: uid === 'vp-kpv' }), audit: async (t, x) => audit.push([t, x]) });
  const kutsut = () => [...f.D.entries()].filter(([k]) => k.startsWith('seurat/kpv/kutsut/')).map(([k, v]) => [k.split('/').pop(), v]);
  return { f, fn, audit, kutsut };
}
const IDS = ['ok', 'uusi', 'kutsuttu', 'eiemail'];

describe('luoSuostumusKortit (ajettu)', () => {
  it('tyypit: suostumus → pelaajakortti; puuttuu + email → suostumuskortti; ilman emailia → ei korttia', async () => {
    const y = ymp();
    const r = await y.fn({ seuraId: 'kpv', pelaajaIds: IDS }, VP);
    const t = Object.fromEntries(r.kortit.map((k) => [k.pelaajaId, k.tyyppi]));
    expect(t).toEqual({ ok: 'pelaajakortti', uusi: 'suostumuskortti', kutsuttu: 'suostumuskortti', eiemail: 'ei_emailia' });
    expect(r.kortit.find((k) => k.pelaajaId === 'ok').kutsuId).toBeUndefined();
  });
  it('uusi kutsu palvelimella: tyyppi qr_kortti, tila luotu, ei nimiä eikä sähköpostia; pelaajan tila → odottaa', async () => {
    const y = ymp();
    const r = await y.fn({ seuraId: 'kpv', pelaajaIds: ['uusi'] }, VP);
    const id = r.kortit[0].kutsuId;
    const k = y.f.D.get('seurat/kpv/kutsut/' + id);
    expect(k).toEqual({ tyyppi: 'qr_kortti', tila: 'luotu', pelaajaId: 'uusi', luotu: 'TS', luoja_uid: 'vp-kpv' });
    expect(y.f.D.get('seurat/kpv/pelaajat/uusi').suostumusTila).toBe('odottaa');
    expect(r).toMatchObject({ luotu: 1, uudelleen: 0 });
  });
  it('olemassa oleva AVOIN kutsu käytetään uudelleen; käytettyä (hyvaksytty) ei', async () => {
    const y = ymp();
    const r = await y.fn({ seuraId: 'kpv', pelaajaIds: ['kutsuttu', 'uusi'] }, VP);
    expect(r.kortit.find((k) => k.pelaajaId === 'kutsuttu').kutsuId).toBe('vanhaAvoin');
    expect(r.kortit.find((k) => k.pelaajaId === 'uusi').kutsuId).not.toBe('kaytetty');
  });
  it('uusintatulostus: sama kutsuId, ei uutta kutsua (juuri jaettu kortti ei mitätöidy)', async () => {
    const y = ymp();
    const a = await y.fn({ seuraId: 'kpv', pelaajaIds: ['uusi'] }, VP);
    const maara = y.kutsut().length;
    const b = await y.fn({ seuraId: 'kpv', pelaajaIds: ['uusi'] }, VP);
    expect(b.kortit[0].kutsuId).toBe(a.kortit[0].kutsuId);
    expect(y.kutsut().length).toBe(maara);
    expect(b).toMatchObject({ luotu: 0, uudelleen: 1 });
  });
  it('oikeudet: valmentaja vain oma joukkue; anonyymi ja kirjautumaton torjutaan', async () => {
    const y = ymp();
    const r = await y.fn({ seuraId: 'kpv', pelaajaIds: ['uusi'] }, VALM15);
    expect(r.kortit[0].tyyppi).toBe('ei_oikeutta');
    expect(y.kutsut().length).toBe(2);
    await expect(y.fn({ seuraId: 'kpv', pelaajaIds: ['uusi'] }, ANON)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(y.fn({ seuraId: 'kpv', pelaajaIds: ['uusi'] }, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });
  it('audit ilman PII:tä', async () => {
    const y = ymp();
    await y.fn({ seuraId: 'kpv', pelaajaIds: IDS }, VP);
    expect(y.audit).toEqual([['suostumuskortit_luotu', expect.objectContaining({ seuraId: 'kpv', pelaajia: 4, kutsuja_luotu: 1, kutsuja_uudelleen: 1, severity: 'info' })]]);
    expect(JSON.stringify(y.audit)).not.toMatch(/tm-testi|Topias|Uusi|Kutsuttu/);
  });
});

/* Seura: QR-linkki, kortit ja tulostus ajettuna. */
const SEURA = lue('TalentMaster_Seura.html');
const pura = (t) => { const a = SEURA.indexOf(t); if (a < 0) throw new Error(t); let d = 0; for (let j = SEURA.indexOf(') {', a) + 2; j < SEURA.length; j++) { if (SEURA[j] === '{') d++; else if (SEURA[j] === '}') { d--; if (!d) return SEURA.slice(a, j + 1); } } throw new Error(t); };
function seuraYmp(pelaajat, palvelin) {
  const loki = { kutsut: [], toast: [], confirm: [], html: '' };
  const w = { document: { open() {}, write: (h) => { loki.html += h; }, close() {} }, close() {} };
  const ctx = {
    window: Object.assign({ _pelaajatKaikki: pelaajat, _aktiiviJoukkue: '', open: () => w }, {}),
    document: { querySelectorAll: () => [], getElementById: () => null },
    location: { href: 'https://tm.example/talentmaster/TalentMaster_Seura.html' }, URL, encodeURIComponent, String, Object, Array, Promise, RegExp,
    console: { warn() {} }, tila: { seuraId: 'kpv', seuraNimi: 'KPV' }, naytaToast: (t, l) => loki.toast.push([t, l]),
    confirm: (t) => { loki.confirm.push(t); return true; }, renderPelaajat: () => Promise.resolve(), setTimeout: () => {},
    _lataaQrKirjasto: async () => {}, _qrDataUrl: (teksti) => 'QR:' + teksti,
    firebase: { app: () => ({ functions: () => ({ httpsCallable: (nimi) => async (d) => { loki.kutsut.push([nimi, d]); return palvelin(nimi, d); } }) }) },
  };
  ctx.open = ctx.window.open;
  vm.createContext(ctx);
  vm.runInContext(SEURA.match(/const PIN_SUOSTUMUS_PUUTTUU = '[^']*';/)[0].replace('const', 'var') + '\n'
    + ['function _tk(avain, fi, muuttujat) {', 'function _suostumusAnnettu(p) {', 'function _pinFn(nimi) {', 'function _pinVirheTeksti(e) {',
      'function _tunnusKohde() {', 'function _tunnusTila(t) {', 'function _pelaajaLinkki(p) {', 'function _pinPalloId(p) {',
      'function _suostumusLinkki(pelaajaId, kutsuId) {', 'function _pinKortitHtml(kortit) {', 'async function tulostaKortit() {'].map(pura).join('\n')
    + '\nthis.linkki = _suostumusLinkki; this.html = _pinKortitHtml; this.tulosta = tulostaKortit;', ctx);
  return { ctx, loki };
}

describe('Seura · QR-linkki ja kortit (ajettu)', () => {
  it('VARTIJA: QR-URL sisältää VAIN kutsuId, seuraId ja pelaajaId — ei nimiä, sähköpostia eikä PalloID:tä', () => {
    const { ctx } = seuraYmp([], () => ({}));
    const u = new URL(ctx.linkki('p1', 'k1'));
    expect(u.pathname).toMatch(/TalentMaster_Rekisterointi_Suostumus\.html$/);
    expect([...u.searchParams.keys()].sort()).toEqual(['kutsuId', 'pelaajaId', 'seuraId']);
    expect(Object.fromEntries(u.searchParams)).toEqual({ kutsuId: 'k1', seuraId: 'kpv', pelaajaId: 'p1' });
    const runko = pura('function _suostumusLinkki(pelaajaId, kutsuId) {');
    expect(runko).not.toMatch(/hEmail|etunimi|sukunimi|palloid|joukkue/i);
  });
  it('suostumuskortissa EI PIN:iä eikä PalloID:tä, vaikka data sisältäisi ne; pelaajakortissa on', () => {
    const { ctx } = seuraYmp([], () => ({}));
    const s = ctx.html([{ tyyppi: 'suostumus', etunimi: 'Uusi', joukkue: 'KPV U13', qr: 'QR:x', pin: '999999', palloId: '55554444' }]);
    expect(s).toContain('Näytä tämä vanhemmallesi. Kun huoltaja on antanut luvan (2 min), TalentMaster aukeaa.');
    expect(s).not.toMatch(/999999|55554444|>PIN<|PalloID/);
    const p = ctx.html([{ tyyppi: 'pelaaja', nimi: 'Topias K', joukkue: 'KPV U13', qr: 'QR:y', pin: '482915', palloId: '12345678' }]);
    expect(p).toContain('482915'); expect(p).toContain('12345678');
  });
  it('Tulosta kortit: yhteenveto ennen tulostusta, palvelin vain suostumuskorteille, molemmat korttityypit samaan tulosteeseen', async () => {
    const pelaajat = [
      { id: 'ok', etunimi: 'Topias', sukunimi: 'K', joukkueNimi: 'KPV U13', pin: '482915', tunniste: '12345678', huoltajaEmail: 'h1@tm-testi.fi', suostumusTila: 'annettu' },
      { id: 'uusi', etunimi: 'Uusi', sukunimi: 'P', joukkueNimi: 'KPV U13', huoltajaEmail: 'h2@tm-testi.fi', suostumusTila: 'pilotti', pin: '135790' },
      { id: 'eiemail', etunimi: 'Ilman', sukunimi: 'E', joukkueNimi: 'KPV U13', suostumusTila: 'pilotti' },
    ];
    const { ctx, loki } = seuraYmp(pelaajat, (nimi, d) => ({ data: { kortit: d.pelaajaIds.map((p) => ({ pelaajaId: p, tyyppi: 'suostumuskortti', kutsuId: 'K-' + p })) } }));
    await ctx.tulosta();
    expect(loki.confirm[0]).toContain('1 pelaajakorttia, 1 suostumuskorttia, 1 ilman huoltajan sähköpostia.');
    expect(loki.confirm[0]).toContain('1 pelaajalta puuttuu huoltajan sähköposti – lisää se pelaajakortille.');
    expect(loki.kutsut).toEqual([['luoSuostumusKortit', { seuraId: 'kpv', pelaajaIds: ['uusi'] }]]);
    expect(loki.html).toContain('482915');                                         // pelaajakortti
    expect(loki.html).toContain('QR:https://tm.example/talentmaster/TalentMaster_Rekisterointi_Suostumus.html?kutsuId=K-uusi&amp;seuraId=kpv&amp;pelaajaId=uusi'.replace(/&amp;/g, '&'));
    expect(loki.html).not.toContain('135790');                                     // suostumuskortti EI näytä (vanhaa) PIN:iä
    expect(loki.html).not.toContain('Ilman');                                      // ilman sähköpostia → ei korttia
  });
  it('nimi: "Tulosta kortit" (ei "Tulosta PIN-kortit")', () => {
    expect(SEURA).toContain('🖨️ Tulosta kortit');
    expect(SEURA).not.toContain('Tulosta PIN-kortit');
    expect(SEURA).toContain('onclick="tulostaKortit()"');
  });
});

/* vahvistaSuostumus: väärä sähköposti hylätään syykoodilla, oikea tallentaa (lahde qr_kortti) + PIN syntyy. */
function vahvista(alku) {
  const CF = lue('functions/index.js');
  const i = CF.indexOf('exports.vahvistaSuostumus = functions');
  const f = fakeDb(alku);
  const ketju = { region() { return ketju; }, runWith() { return ketju; }, https: { onCall: (fn) => fn, HttpsError } };
  const ctx = {
    functions: ketju, exports: {}, db: f.db, console: { log() {}, warn() {}, error() {} }, String, Object, Array, JSON, Date, encodeURIComponent, parseFloat, isFinite,
    admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS' }, Timestamp: { fromDate: (d) => d } } },
    auth: { generatePasswordResetLink: async () => 'r' }, haeOrLuoHuoltajaAuth: async () => ({}), lahetaSahkoposti: async () => {}, pohjaSuostumusLinkki: () => '',
    TM_BASE_URL: 'https://tm', suostumusTarkistus: require_('../functions/suostumus_tarkistus.js'), suostumusAnnettu: require_('../functions/suostumus.js').suostumusAnnettu,
    pelaajapin: require_('../functions/pelaajapin.js'),
  };
  vm.createContext(ctx);
  vm.runInContext(CF.slice(i, CF.indexOf('\n  });', i) + 6), ctx);
  const audit = () => [...f.D.entries()].filter(([k]) => k.startsWith('audit/')).map(([, v]) => v);
  return { f, fn: ctx.exports.vahvistaSuostumus, audit };
}
const PEL = 'seurat/kpv/pelaajat/uusi';
const LOMAKE = (o) => Object.assign({ seuraId: 'kpv', pelaajaId: 'uusi', kutsuId: 'qr1', hEmail: 'h2@tm-testi.fi', antaja: 'Huoltaja Testi', antajaRooli: 'huoltaja',
  etunimi: 'Uusi', syntyma: '2014-05-01', suostumukset: ['rekisteri'], suostumusMap: { rekisteri: true }, aikaleima: 'x' }, o);

describe('vahvistaSuostumus · QR-kortin kutsu (ajettu)', () => {
  const alku = () => ({ [PEL]: { etunimi: 'Uusi', sukunimi: 'P', huoltajaEmail: 'h2@tm-testi.fi', syntymaVuosi: 2014, suostumusTila: 'odottaa' },
    'seurat/kpv/kutsut/qr1': { tyyppi: 'qr_kortti', tila: 'luotu', pelaajaId: 'uusi' } });
  it('väärä sähköposti → permission-denied syy email_ristiriita; ei kirjoituksia; viesti ei paljasta tallennettua osoitetta', async () => {
    const v = vahvista(alku());
    await expect(v.fn(LOMAKE({ hEmail: 'vaara@tm-testi.fi' }), {})).rejects.toMatchObject({ code: 'permission-denied', details: { syy: 'email_ristiriita' } });
    expect(v.f.D.get(PEL).suostumusTila).toBe('odottaa');
    const e = await v.fn(LOMAKE({ hEmail: 'vaara@tm-testi.fi' }), {}).catch((x) => x);
    expect(e.message).not.toContain('h2@tm-testi.fi');
  });
  it('oikea sähköposti → suostumus tallentuu (lahde qr_kortti), kutsu hyväksytyksi, PIN syntyy (PR A)', async () => {
    const v = vahvista(alku());
    await v.fn(LOMAKE(), {});
    const p = v.f.D.get(PEL);
    expect(p.suostumusTila).toBe('annettu');
    expect(p.suostumus.lahde).toBe('qr_kortti');
    expect(p.pin).toMatch(/^\d{6}$/);
    expect(v.f.D.get('seurat/kpv/kutsut/qr1').tila).toBe('hyvaksytty');
    expect(v.audit().find((a) => a.toiminto === 'suostumus_annettu')).toMatchObject({ lahde: 'qr_kortti' });
  });
});

describe('suostumuslomake', () => {
  const LOM = lue('TalentMaster_Rekisterointi_Suostumus.html');
  it('toimii pelkillä kutsuId + seuraId + pelaajaId -parametreilla; esitäyttö on valinnainen', () => {
    expect(LOM).toContain("_kutsuId   = _urlParams.kutsuId   || null;");
    expect(LOM).toContain("_seuraId   = _urlParams.seuraId   || null;");
    expect(LOM).toContain("_pelaajaId = _urlParams.pelaajaId || null;");
    expect(LOM).toContain('var _esitaytetty = !!(_urlParams.etunimi || _urlParams.hEmail || _urlParams.seura);');
    expect(LOM).not.toMatch(/innerHTML = '<div class="info-t">Kutsu ' \+ \(_urlParams\.seura/);   // ei URL-parametria innerHTML:ään
  });
  it('sähköpostiristiriita → selkeä ohje, nappi pysyy käytössä', () => {
    expect(LOM).toContain("'Sähköposti ei vastaa seuran tietoja. Käytä osoitetta, jonka annoit seuralle, tai ota yhteys joukkueenjohtajaan.'");
    expect(LOM).toContain("if (_syy === 'email_ristiriita') {");
  });
  it('tekstit tm_langissa fi + en, sv odotuslistalla', () => {
    global.window = {};
    require_(join(ROOT, 'lib', 'tm_lang.js'));
    const L = global.window.TM_LANG;
    const SV = require_(join(ROOT, 'tests', 'tm_lang_sv_odotuslista.cjs'));
    for (const [ns, k] of [['suostumus', 'email_ristiriita'], ['suostumus', 'qr_info_teksti'], ['seura', 'suostumuskortti_teksti'], ['seura', 'kortit_yhteenveto']]) {
      expect(L.fi[ns][k], ns + '.' + k).toBeTruthy(); expect(L.en[ns][k], ns + '.' + k).toBeTruthy();
      expect(L.sv[ns][k]).toBeUndefined(); expect(SV).toContain(ns + '.' + k);
    }
    delete global.window;
  });
});
