/**
 * Verkkokatkon käsittely kirjautumisessa (1.10.2026). Sentry 1.10. 13.23 UTC: "pelaajaKirjaudu epäonnistui: internal",
 * fetch ilman HTTP-statusta eikä funktion lokissa kutsua → pyyntö katkesi verkkotasolla (CI-deploy).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';
import { lisaaVerkko } from './_verkkoCtx.mjs';
import { lisaaP7Offline } from './_p7OfflineCtx.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const V = require_(join(ROOT, 'lib', 'tm_verkko.js'));
const lue = (f) => readFileSync(join(ROOT, f), 'utf8');

describe('tmOnVerkkokatko — erottaa verkkokatkon palvelimen virheestä', () => {
  it.each([
    ['fetch kaatui (SDK: status 0, ei runkoa)', { code: 'functions/internal', message: 'internal' }, true],
    ['503 ilman runkoa', { code: 'functions/unavailable', message: 'unavailable' }, true],
    ['SDK-aikakatkaisu', { code: 'functions/deadline-exceeded', message: 'deadline-exceeded' }, true],
    ['Auth: verkko', { code: 'auth/network-request-failed', message: 'Firebase: Error (auth/network-request-failed).' }, true],
    ['palvelimen kaatuminen (runko INTERNAL)', { code: 'functions/internal', message: 'INTERNAL' }, false],
    ['palvelimen oma HttpsError', { code: 'functions/internal', message: 'Lähetys epäonnistui: x' }, false],
    ['palvelin palautti details', { code: 'functions/internal', message: 'internal', details: { syy: 'x' } }, false],
    ['tyhjä viesti', { code: 'functions/unavailable', message: '' }, false],
    ['väärä PIN', { code: 'functions/invalid-argument', message: 'Tunnus tai PIN on väärin.' }, false],
    ['ei tokenia (sivun oma)', { code: 'internal', message: 'ei tokenia' }, false],
    ['ei virhettä', null, false],
  ])('%s → %s', (_n, e, odotus) => { expect(V.tmOnVerkkokatko(e)).toBe(odotus); });

  it('SDK:n oma koodi: verkkokatko = FunctionsError(code, code) ilman details (lukittu, jos SDK muuttuu)', () => {
    const sdk = lue('node_modules/@firebase/functions/dist/esm/index.esm.js');
    expect(sdk).toMatch(/case 0:\s*\/\/ This can happen if the server returns 500\.\s*return 'internal';/);
    expect(sdk).toContain("let description = code;");
    expect(sdk).toContain("reject(new FunctionsError('deadline-exceeded', 'deadline-exceeded'))");
  });
});

describe('tmYritaUudelleenVerkkokatkossa', () => {
  const katko = () => Object.assign(new Error('internal'), { code: 'functions/internal' });
  it('katko → odottaa 2 s ja yrittää kerran uudelleen → onnistuu', async () => {
    let n = 0; const odotukset = [];
    const r = await V.tmYritaUudelleenVerkkokatkossa(async () => { n++; if (n === 1) throw katko(); return 'ok'; }, { odota: async (ms) => odotukset.push(ms) });
    expect(r).toBe('ok'); expect(n).toBe(2); expect(odotukset).toEqual([2000]);
  });
  it('kaksi katkoa → toinen virhe heitetään, yrityksiä tasan 2', async () => {
    let n = 0;
    await expect(V.tmYritaUudelleenVerkkokatkossa(async () => { n++; throw katko(); }, { odota: async () => {} })).rejects.toMatchObject({ code: 'functions/internal' });
    expect(n).toBe(2);
  });
  it('palvelimen virhe / väärä PIN → ei uudelleenyritystä', async () => {
    let n = 0;
    await expect(V.tmYritaUudelleenVerkkokatkossa(async () => { n++; throw { code: 'functions/invalid-argument', message: 'x' }; }, { odota: async () => {} })).rejects.toBeTruthy();
    expect(n).toBe(1);
  });
  it('viesti fi/en; sv (Gemini odottaa) → en', () => {
    expect(V.tmVerkkoViesti('fi')).toBe('Yhteyskatko – yritä hetken kuluttua uudelleen');
    expect(V.tmVerkkoViesti('en')).toBe('Connection lost – please try again in a moment');
    expect(V.tmVerkkoViesti('sv')).toBe(V.TM_VERKKO_VIESTIT.en);
  });
});

/* Pelaaja_v7 _kirjaudu ajettuna: oikeat funktiot sivulta + oikea lib, tyngät nimetty kuten tuotannossa. */
const SIVU = lue('TalentMaster_Pelaaja_v7.html');
function puraRaaka(t) {
  const a = SIVU.indexOf(t); let d = 0;
  for (let j = SIVU.indexOf('{', a); j < SIVU.length; j++) { if (SIVU[j] === '{') d++; else if (SIVU[j] === '}') { d--; if (!d) return SIVU.slice(a, j + 1); } }
  throw new Error('sulkeet');
}
function pelaaja(virheet) {
  const loki = { kutsut: 0, custom: 0, sentry: [], virhe: [], lataa: 0 };
  const ctx = {
    console: { error() {}, warn() {} },
    document: { getElementById: (id) => (id === 'pinTunnus' ? { value: '1234567' } : null) },
    localStorage: { setItem() {}, removeItem() {} },
    setTimeout: (f) => f(),   // 2 s:n odotus heti (ajotesti)
    window: {
      _auth: { signInWithCustomToken: async () => { loki.custom++; } }, _db: {},
      _fbApp: { functions: () => ({ httpsCallable: () => async () => { const v = virheet[loki.kutsut++]; if (v) throw v; return { data: { token: 't', seuraId: 's', pelaajaId: 'p' } }; } }) },
      Sentry: { captureMessage: (m, o) => loki.sentry.push([m, o.level, o.tags]) },
    },
    _pin: '1234', draw() {}, _kirjautuminenKesken: false, _pinIlmoitus: '',
    _URL: { pelaajaId: null, seuraId: null }, _pinPalloIdTila: false, _TUNNUS_LS: 'tm_pelaaja_tunnus',
    _PK_VIRHE_TUNNISTUS: 'Tunnus tai PIN on väärin.', _PK_VIRHE_INFRA: 'Kirjautuminen ei juuri nyt onnistu. Yritä hetken päästä uudelleen.',
    _pinVirhe: (t) => loki.virhe.push(t), _lataaOmaPelaaja: async () => { loki.lataa++; return true; },
  };
  vm.createContext(ctx); lisaaVerkko(ctx); lisaaP7Offline(ctx);
  vm.runInContext([puraRaaka('function _infraVirheenSyy(koodi, viesti) {'), puraRaaka('function _raportoiKirjautumisvirhe(syy) {'),
    puraRaaka('function _linkkiKirjautuminen() {'), puraRaaka('async function _kirjaudu(pin) {')].join('\n') + '\nthis._kirjaudu = _kirjaudu;', ctx);
  return { loki, ajo: ctx._kirjaudu('1234') };
}
const KATKO = { code: 'functions/internal', message: 'internal' };

describe('Pelaaja_v7 · verkkokatko kirjautumisessa (ajettu)', () => {
  it('yksi katko → automaattinen uusi yritys onnistuu, ei virhettä eikä Sentryä', async () => {
    const { loki, ajo } = pelaaja([KATKO]);
    await ajo;
    expect(loki.kutsut).toBe(2); expect(loki.custom).toBe(1); expect(loki.lataa).toBe(1);
    expect(loki.virhe).toEqual([]); expect(loki.sentry).toEqual([]);
  });
  it('kaksi katkoa → "Yhteyskatko" + Sentry warning tm_virhetyyppi=verkko (ei error)', async () => {
    const { loki, ajo } = pelaaja([KATKO, KATKO]);
    await ajo;
    expect(loki.kutsut).toBe(2);
    expect(loki.virhe).toEqual(['Yhteyskatko – yritä hetken kuluttua uudelleen']);
    expect(loki.sentry).toEqual([['pelaajaKirjaudu: verkkokatko', 'warning', { tm_virhetyyppi: 'verkko', tm_kohde: 'pelaajaKirjaudu' }]]);
  });
  it('palvelimen internal (runko) → ei uudelleenyritystä, yleinen virhe + Sentry error kuten ennen', async () => {
    const { loki, ajo } = pelaaja([{ code: 'functions/internal', message: 'INTERNAL' }]);
    await ajo;
    expect(loki.kutsut).toBe(1);
    expect(loki.virhe).toEqual(['Kirjautuminen ei juuri nyt onnistu. Yritä hetken päästä uudelleen.']);
    expect(loki.sentry.map((s) => s[1])).toEqual(['error']);
  });
});

describe('kytkentä kirjautumissivuilla', () => {
  it.each([
    ['TalentMaster_Pelaaja_v7.html', 'tmYritaUudelleenVerkkokatkossa(kutsuAikarajalla)', "tmRaportoiVerkkokatko('pelaajaKirjaudu')"],
    ['TalentMaster_Player_Home.html', 'tmYritaUudelleenVerkkokatkossa(function(){ return _soloFn(', "tmRaportoiVerkkokatko('soloLapsiKirjaudu')"],
    ['TalentMaster_Vanhempi_v2.html', 'tmYritaUudelleenVerkkokatkossa(() => _auth.signInWithEmailAndPassword(email, pass))', "tmRaportoiVerkkokatko('vanhempiKirjautuminen')"],
    ['TalentMaster_Seura.html', 'tmYritaUudelleenVerkkokatkossa(() => auth.signInWithEmailAndPassword(email, salasana))', "tmRaportoiVerkkokatko('seuraKirjautuminen')"],
    ['TalentMaster_VP_v25.html', 'tmYritaUudelleenVerkkokatkossa(() => auth.signInWithEmailAndPassword(email, pass))', "tmRaportoiVerkkokatko('vpKirjautuminen')"],
  ])('%s: lib ladattu, uudelleenyritys ja raportointi kytketty', (f, kutsu, raportti) => {
    const s = lue(f);
    expect(s).toContain('<script src="lib/tm_verkko.js?v=1"></script>');
    expect(s).toContain(kutsu); expect(s).toContain(raportti);
  });
  it('Pelaaja- ja Vanhempi-SW: lib allowlistissa (offline-PWA ei kaadu ReferenceErroriin)', () => {
    for (const f of ['sw_pelaaja.js', 'sw_vanhempi.js']) expect(lue(f)).toContain("url.indexOf('/lib/tm_verkko.js') !== -1");
  });
});
