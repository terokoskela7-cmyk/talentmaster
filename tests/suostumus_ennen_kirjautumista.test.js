/**
 * Suostumus ennen kirjautumista (PR A, 1.10.2026). Laskenta 1.10.: 34 pelaajalla PIN ilman suostumusta, ei yhtään
 * kirjautumista 30 pv → esto ei katkaise kenenkään käyttöä, mutta on tehtävä ennen korttien jakoa.
 * Oikeat moduulit (functions/pelaajakirjautuminen.js, pelaajapin.js, suostumus.js) saman Firestore-tyngän päällä.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { fakeDb } from './_fakeFirestore.mjs';
import { PEL_APU } from './helpers/pelaaja_t.mjs';

const require_ = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = require_('../functions/pelaajakirjautuminen.js');
const P = require_('../functions/pelaajapin.js');
const { suostumusAnnettu } = require_('../functions/suostumus.js');
const CF = readFileSync(join(ROOT, 'functions', 'index.js'), 'utf8');
const lue = (f) => readFileSync(join(ROOT, f), 'utf8');

class HttpsError extends Error { constructor(code, msg, details) { super(msg); this.code = code; this.details = details; } }
const FieldValue = { serverTimestamp: () => 'TS', increment: (n) => ({ __inc: n }) };
const ctxIp = { rawRequest: { ip: '1.2.3.4' } };
const VP = { auth: { uid: 'vp-kpv', token: { seuraId: 'kpv', rooli: 'vp', firebase: { sign_in_provider: 'password' } } } };

function data() {
  return {
    'seurat/kpv/pelaajat/ok': { etunimi: 'Topias', tunniste: '12345678', pin: '482915', joukkueet: ['kpv_u13'], suostumusTila: 'annettu' },
    'seurat/kpv/pelaajat/ei': { etunimi: 'Testi', tunniste: '87654321', pin: '135790', joukkueet: ['kpv_u13'], suostumusTila: 'odottaa' },
    'seurat/kpv/pelaajat/pilotti': { etunimi: 'Tuotu', tunniste: '11112222', joukkueet: ['kpv_u13'], suostumusTila: 'pilotti' },
    'seurat/kpv/pelaajat/uusi': { etunimi: 'Uusi', tunniste: '33334444', joukkueet: ['kpv_u13'], suostumus: { annettu: 'TS' } },
  };
}
function ymp(alku) {
  const f = fakeDb(alku || data());
  const audit = [];
  const deps = { db: f.db, HttpsError, FieldValue, tarkistaOikeus: async (uid) => ({ sallittu: uid === 'vp-kpv' }), audit: async (t, x) => audit.push([t, x]) };
  const kirjaudu = K.luoKasittelija({ db: f.db, auth: { createCustomToken: async (uid) => 'TOKEN:' + uid }, HttpsError, FieldValue, nyt: () => 1_000_000,
    audit: async (t, x) => audit.push([t, x]) });
  return { f, audit, kirjaudu, aseta: P.luoAsetaPelaajanPin(deps), luo: P.luoLuoPinitSeuralle(deps) };
}

describe('kanoninen ehto (functions/suostumus.js)', () => {
  it.each([
    [{ suostumusTila: 'annettu' }, true], [{ suostumus: { annettu: 'TS' } }, true],
    [{ suostumusTila: 'odottaa' }, false], [{ suostumusTila: 'pilotti' }, false], [{}, false], [null, false],
  ])('%j → %s', (p, odotus) => expect(suostumusAnnettu(p)).toBe(odotus));
  it('palvelin käyttää sitä kaikkialla (ei omia inline-ehtoja)', () => {
    expect(CF).toContain('const joAnnettu = suostumusAnnettu(snap.data());');
    expect(CF).not.toMatch(/snap\.get\('suostumusTila'\) === 'annettu'/);
    expect(lue('functions/pelaajakirjautuminen.js')).toContain("require('./suostumus')");
    expect(lue('functions/pelaajapin.js')).toContain("require('./suostumus')");
  });
});

describe('pelaajaKirjaudu', () => {
  it('ilman suostumusta OIKEA PIN → failed-precondition suostumus_puuttuu, ei tokenia, audit info', async () => {
    const y = ymp();
    for (const syote of [{ liittoTunnus: '87654321', pin: '135790' }, { seuraId: 'kpv', pelaajaId: 'ei', pin: '135790' }]) {
      await expect(y.kirjaudu(syote, ctxIp)).rejects.toMatchObject({ code: 'failed-precondition', details: { syy: 'suostumus_puuttuu' },
        message: 'Huoltajasi ei ole vielä antanut lupaa. Pyydä vanhempaasi skannaamaan kortin QR-koodi.' });
    }
    const estot = y.audit.filter(([t]) => t === 'pelaaja_kirjautuminen_estetty_suostumus');
    expect(estot.length).toBe(2);
    expect(estot[0][1]).toMatchObject({ severity: 'info', seuraId: 'kpv', pelaajaId: 'ei' });
    expect(JSON.stringify(estot)).not.toMatch(/135790|87654321|Testi/);   // ei PIN:iä, PalloID:tä eikä nimeä
  });
  it('ilman suostumusta VÄÄRÄ PIN → sama virhe kuin ennen (ei paljasta suostumustilaa)', async () => {
    const y = ymp();
    await expect(y.kirjaudu({ liittoTunnus: '87654321', pin: '000000' }, ctxIp)).rejects.toMatchObject({ code: 'unauthenticated', message: K.VIRHE_TUNNISTUS });
    await expect(y.kirjaudu({ liittoTunnus: '12345678', pin: '000000' }, ctxIp)).rejects.toMatchObject({ code: 'unauthenticated', message: K.VIRHE_TUNNISTUS });
    expect(y.audit.filter(([t]) => t === 'pelaaja_kirjautuminen_estetty_suostumus')).toEqual([]);
  });
  it('suostumuksen kanssa kirjautuminen onnistuu (molemmat suostumusmuodot)', async () => {
    const y = ymp();
    await expect(y.kirjaudu({ liittoTunnus: '12345678', pin: '482915' }, ctxIp)).resolves.toMatchObject({ token: 'TOKEN:pel_kpv_ok' });
    y.f.D.set('seurat/kpv/pelaajat/uusi', Object.assign({}, y.f.D.get('seurat/kpv/pelaajat/uusi'), { pin: '246813' }));
    await expect(y.kirjaudu({ seuraId: 'kpv', pelaajaId: 'uusi', pin: '246813' }, ctxIp)).resolves.toMatchObject({ token: 'TOKEN:pel_kpv_uusi' });
  });
  it('Solo-lapsen kirjautumiseen ei lisätty seuran suostumusehtoa', () => {
    const src = lue('functions/pelaajakirjautuminen.js');
    const solo = src.slice(src.indexOf('function luoSoloKasittelija'), src.indexOf('module.exports'));
    expect(solo).not.toContain('suostumusOk');
  });
});

describe('PIN vain suostumuksen jälkeen', () => {
  it('asetaPelaajanPin ilman suostumusta → failed-precondition suostumus_puuttuu, ei kirjoituksia', async () => {
    const y = ymp();
    await expect(y.aseta({ seuraId: 'kpv', pelaajaId: 'pilotti' }, VP)).rejects.toMatchObject({ code: 'failed-precondition', details: { syy: 'suostumus_puuttuu' },
      message: 'Huoltajan suostumus puuttuu – PIN luodaan suostumuksen jälkeen.' });
    expect(y.f.D.get('seurat/kpv/pelaajat/pilotti').pin).toBeUndefined();
    expect(y.f.D.has('_pelaajaPin/kpv_pilotti')).toBe(false);
  });
  it('luoPinitSeuralle ohittaa ilman suostumusta; luvut: luotu / ohitettu (ei suostumusta) / oli jo', async () => {
    const y = ymp();
    const esi = await y.luo({ seuraId: 'kpv', kuivaAjo: true }, VP);
    expect(esi).toMatchObject({ luotaisiin: 1, ohitettuSuostumus: 2, oliJo: 1 });
    const r = await y.luo({ seuraId: 'kpv' }, VP);
    expect(r).toMatchObject({ luotu: 1, ohitettuSuostumus: 2, oliJo: 1 });
    expect(y.f.D.get('seurat/kpv/pelaajat/uusi').pin).toMatch(/^\d{6}$/);
    expect(y.f.D.get('seurat/kpv/pelaajat/pilotti').pin).toBeUndefined();
    expect(y.f.D.get('seurat/kpv/pelaajat/ei').pin).toBe('135790');   // olemassa olevaa EI poisteta (esto riittää)
    expect(y.audit.find(([t]) => t === 'pinit_luotu')[1]).toMatchObject({ luotu: 1, ohitettuSuostumus: 2, oliJo: 1 });
  });
});

describe('vahvistaSuostumus luo PIN:n (best-effort) ja säilyttää olemassa olevan', () => {
  const i = CF.indexOf('exports.vahvistaSuostumus');
  const runko = CF.slice(i, CF.indexOf('\n  });', i));
  it('PIN luodaan suostumuksen tallennuksen JÄLKEEN vain jos puuttuu, samalla apurilla kuin luoPinitSeuralle; virhe ei kaada', () => {
    const tallennus = runko.indexOf('await pelRef.update(paivitys);');
    const pinLuonti = runko.indexOf("pelaajapin.lisaaPinKirjoitukset(db, b, { seuraId, pelaajaId, data: snap.data() || {}, pin: uusi, lahde: 'vahvistaSuostumus', TS });");
    expect(tallennus).toBeGreaterThan(-1);
    expect(pinLuonti).toBeGreaterThan(tallennus);
    expect(runko).toMatch(/let pin = \(snap\.get\('pin'\) && \/\^\(\\d\{4\}\|\\d\{6\}\)\$\/\.test/);   // olemassa oleva säilyy
    expect(runko.slice(pinLuonti - 300, pinLuonti)).toContain('if (!pin) {');
    expect(runko.slice(pinLuonti, pinLuonti + 400)).toMatch(/catch \(e\) \{\s*pin = null;/);
  });
});

describe('Seura / Pelaaja / Vanhempi', () => {
  const SEURA = lue('TalentMaster_Seura.html');
  it('Seura: sama ehto, PIN-luonti / kortit / tunnukset vain suostumuksella; uusi pelaaja ei kutsu asetaPelaajanPin', () => {
    expect(SEURA).toContain("function _suostumusAnnettu(p) { return !!p && (p.suostumusTila === 'annettu' || !!(p.suostumus && p.suostumus.annettu)); }");
    expect(SEURA).toContain("const PIN_SUOSTUMUS_PUUTTUU = 'Huoltajan suostumus puuttuu – PIN luodaan suostumuksen jälkeen.';");
    expect(SEURA).toContain('const pelaajat = k.lista.filter((p) => _suostumusAnnettu(p) && p.pin).sort(jarj);');   // PR B: pelaajakortti vain suostumuksella
    expect(SEURA).toContain('const kohteet = k.lista.filter((p) => p.huoltajaEmail && p.pin && _suostumusAnnettu(p));');
    expect(SEURA).toContain("PIN luodaan automaattisesti, kun huoltaja antaa suostumuksen");
    expect(SEURA).toContain("${esc(_suostumusAnnettu(p) ? (p.pin || '—') : '—')}");
  });
  it('Pelaaja_v7 näyttää suostumusviestin; Vanhempi ei näytä PIN:iä ilman suostumusta', () => {
    const PEL = lue('TalentMaster_Pelaaja_v7.html');
    expect(PEL).toContain("if (koodi === 'failed-precondition' && e && e.details && e.details.syy === 'suostumus_puuttuu') { _pinVirhe(T('huoltajasi_ei_ole_viela_antanut')); return; }");
    expect(lue('TalentMaster_Vanhempi_v2.html')).toContain("const pin = (_suostumusOk && L.pin != null");
  });
  it('lahetaPelaajaSivuLinkki: ilman suostumusta PIN ei mene sähköpostiin', () => {
    expect(CF).toContain("const pinNyt = (suostumusAnnettu(pd) && pd.pin != null");
  });
});

/* Seura-sivun tunnustyökalut ajettuna: ilman suostumusta ei PIN:iä, ei korttia, ei tunnuksia. */
describe('Seura · tunnustyökalut ilman suostumusta (ajettu)', () => {
  const SEURA = lue('TalentMaster_Seura.html');
  const pura = (t) => { const a = SEURA.indexOf(t); let d = 0; for (let j = SEURA.indexOf(') {', a) + 2; j < SEURA.length; j++) { if (SEURA[j] === '{') d++; else if (SEURA[j] === '}') { d--; if (!d) return SEURA.slice(a, j + 1); } } throw new Error(t); };
  function aja(pelaajat, valitut) {
    const loki = { kutsut: [], toast: [], confirm: [] };
    const ctx = {
      window: { _pelaajatKaikki: pelaajat, _aktiiviJoukkue: '' },
      document: { querySelectorAll: () => (valitut || []).map((v) => ({ value: v })), getElementById: () => null },
      location: { href: 'https://tm/TalentMaster_Seura.html' }, URL, encodeURIComponent, String, Object, Array, Promise, console: { warn() {} },
      tila: { seuraId: 'kpv', seuraNimi: 'KPV' }, naytaToast: (t, l) => loki.toast.push([t, l]),
      confirm: (t) => { loki.confirm.push(t); return true; }, renderPelaajat: () => Promise.resolve(), setTimeout: () => {},
      firebase: { app: () => ({ functions: () => ({ httpsCallable: (nimi) => async (d) => { loki.kutsut.push([nimi, d]); return { data: { pin: '700123', ok: true } }; } }) }) },
    };
    ctx.tmHT = ctx.tmHT || function (s) { return s; }; vm.createContext(ctx);
    vm.runInContext(SEURA.match(/const PIN_SUOSTUMUS_PUUTTUU = '[^']*';/)[0].replace('const', 'var') + '\n'
      + ['function _suostumusAnnettu(p) {', 'function _pinFn(nimi) {', 'function _pinVirheTeksti(e) {', 'function _paivitaPinPaikallisesti(pelaajaId, pin) {',
        'function _tunnusKohde() {', 'function _tunnusTila(t) {', 'async function luoPuuttuvatPinit() {', 'async function lahetaTunnuksetHuoltajille() {'].map(pura).join('\n')
      + '\nthis.luo = luoPuuttuvatPinit; this.laheta = lahetaTunnuksetHuoltajille; this.virhe = _pinVirheTeksti;', ctx);
    return { ctx, loki };
  }
  const P3 = () => [
    { id: 'a', huoltajaEmail: 'a@tm-testi.fi', pin: '482915', suostumusTila: 'annettu' },
    { id: 'b', huoltajaEmail: 'b@tm-testi.fi', pin: '135790', suostumusTila: 'odottaa' },
    { id: 'c', huoltajaEmail: 'c@tm-testi.fi', suostumusTila: 'pilotti' },
  ];
  it('Lähetä tunnukset: vain suostumuksen antaneille; ilman suostumusta lasketaan ja ohjataan suostumuskutsuun', async () => {
    const { ctx, loki } = aja(P3());
    await ctx.laheta();
    expect(loki.kutsut.map(([, d]) => d.pelaajaId)).toEqual(['a']);
    expect(loki.confirm[0]).toContain('2 ohitetaan: huoltajan suostumus puuttuu');
    expect(loki.toast[0][0]).toContain('2 ilman suostumusta – lähetä heille suostumuskutsu');
  });
  it('valitut: PIN vain suostumuksen antaneelle; muut lasketaan', async () => {
    const { ctx, loki } = aja(P3().concat([{ id: 'd', suostumusTila: 'annettu' }]), ['b', 'c', 'd']);
    await ctx.luo();
    expect(loki.kutsut.map(([n, d]) => n + ':' + d.pelaajaId)).toEqual(['asetaPelaajanPin:d']);
    expect(loki.confirm[0]).toContain('1 ohitetaan: huoltajan suostumus puuttuu');
  });
  it('palvelimen suostumus_puuttuu → selkokielinen viesti', () => {
    const { ctx } = aja([]);
    expect(ctx.virhe({ code: 'functions/failed-precondition', message: 'x', details: { syy: 'suostumus_puuttuu' } }))
      .toBe('Huoltajan suostumus puuttuu – PIN luodaan suostumuksen jälkeen.');
  });
});
