/**
 * Vaihe 0 / PR 1 · Pelaaja_v7 kirjautuu palvelimen kautta (PalloID + PIN → pelaajaKirjaudu → custom token).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { lisaaVerkko } from './_verkkoCtx.mjs';
import { lisaaP7Offline } from './_p7OfflineCtx.mjs';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIVU = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const KOODI = SIVU.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
function pura(tunniste) {
  const alku = KOODI.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let d = 0;
  for (let j = KOODI.indexOf('{', alku); j < KOODI.length; j++) {
    if (KOODI[j] === '{') d++; else if (KOODI[j] === '}') { d--; if (!d) return KOODI.slice(alku, j + 1); }
  }
  throw new Error('sulkeet');
}

describe('PR 1 · Pelaaja_v7 palvelinkirjautuminen', () => {
  it('functions-SDK ladataan samalla versiolla kuin muut (9.22.1)', () => {
    expect(SIVU).toContain('firebasejs/9.22.1/firebase-functions-compat.js');
  });
  it('PIN-näppäimistö kutsuu uutta polkua; PalloID-kenttä PIN-näkymässä', () => {
    expect(KOODI).toContain('setTimeout(()=>_kirjaudu(_pin),280)');
    expect(SIVU).toContain('id="pinTunnus"');
  });
  it('kutsu: europe-west1 + pelaajaKirjaudu + { liittoTunnus, pin } → signInWithCustomToken', () => {
    const f = pura('async function _kirjaudu(pin) {');
    expect(f).toContain("window._fbApp.functions('europe-west1').httpsCallable('pelaajaKirjaudu')");
    expect(f).toContain('{ liittoTunnus: tunnus, pin: pin }');
    expect(f).toContain('{ seuraId: linkki.seuraId, pelaajaId: linkki.pelaajaId, pin: pin }');   // Kirjautumisen helpotus
    expect(f).toContain('signInWithCustomToken(d.token)');
    expect(f).toContain('localStorage.setItem(_TUNNUS_LS, muista)');
  });
  it('PR 3: vanha anonyymi PIN-polku on poistettu kokonaan', () => {
    expect(KOODI).not.toContain('_kirjauduPinilla');
    expect(KOODI).not.toContain('signInAnonymously');
    expect(KOODI).not.toContain('varapolku');
  });
  it('uudelleenlataus: pelaajatoken (rooli + pelaajaSeuraId + pelaajaId) ladataan ennen muita polkuja', () => {
    const f = pura('async function _lataaFirebasePelaaja(auth, db, user) {');
    const iPel = f.indexOf("claims.rooli === 'pelaaja' && claims.pelaajaSeuraId && claims.pelaajaId");
    expect(iPel).toBeGreaterThan(0);
    expect(iPel).toBeLessThan(f.indexOf('claims.super_admin || claims.superAdmin'));
    expect(f).toContain('_lataaOmaPelaaja(db, claims.pelaajaSeuraId, claims.pelaajaId)');
  });
  it('oma pelaaja ladataan tokenin tunnisteilla (ei listahakua)', () => {
    const f = pura('async function _lataaOmaPelaaja(db, seuraId, pelaajaId) {');
    expect(f).toContain(".collection('pelaajat').doc(pelaajaId).get()");
    expect(f).not.toContain('.where(');
  });
  it('palvelinvirhe raportoidaan Sentryyn VIRHEENÄ syykoodilla (ei PII:tä)', () => {
    const r = pura('function _raportoiKirjautumisvirhe(syy) {');
    expect(r).toContain("captureMessage('pelaajaKirjaudu epäonnistui: ' + syy");
    expect(r).toContain("level: 'error'");
    expect(r).not.toMatch(/tunnus|pin\b/i);
  });
  it('syykoodit: app-check · internal · unavailable · not-found', () => {
    const f = pura('function _infraVirheenSyy(koodi, viesti) {');
    // eslint-disable-next-line no-new-func
    const syy = new Function('_PK_VIRHE_TUNNISTUS', f + '; return _infraVirheenSyy;')('Tunnus tai PIN on väärin.');
    expect(syy('unauthenticated', 'Unauthenticated')).toBe('app-check');
    expect(syy('failed-precondition', 'App Check token is invalid')).toBe('app-check');
    expect(syy('internal', 'INTERNAL')).toBe('internal');
    expect(syy('unavailable', '')).toBe('unavailable');
    expect(syy('not-found', '')).toBe('not-found');
  });
});

/* PR 3 · AJOTESTI (vm): oikeat funktiot sivulta, tyngät nimetty kuten tuotannon muuttujat.
   Raaka lähde (ei kommenttisiivousta): siivous rikkoisi regexin /^functions\//. */
function puraRaaka(tunniste) {
  const alku = SIVU.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let d = 0;
  for (let j = SIVU.indexOf('{', alku); j < SIVU.length; j++) {
    if (SIVU[j] === '{') d++; else if (SIVU[j] === '}') { d--; if (!d) return SIVU.slice(alku, j + 1); }
  }
  throw new Error('sulkeet');
}
function ajaKirjaudu(virhe) {
  const loki = { anon: 0, custom: 0, sentry: [], virhe: [], lataa: 0 };
  const auth = {
    signInAnonymously: async () => { loki.anon++; },
    signInWithCustomToken: async () => { loki.custom++; },
  };
  const ctx = {
    console: { error() {}, warn() {} },
    document: { getElementById: (id) => (id === 'pinTunnus' ? { value: '1234567' } : null) },
    localStorage: { setItem() {}, removeItem() {} },
    window: {
      _auth: auth, _db: {},
      _fbApp: { functions: () => ({ httpsCallable: () => async () => { if (virhe) throw virhe; return { data: { token: 't', seuraId: 's', pelaajaId: 'p' } }; } }) },
      Sentry: { captureMessage: (m, o) => loki.sentry.push([m, o.level, o.tags.tm_kirjautumisvirhe]) },
    },
    _pin: '1234', draw() {}, _kirjautuminenKesken: false, _pinIlmoitus: '',
    _URL: { pelaajaId: null, seuraId: null }, _pinPalloIdTila: false,   // PalloID-reitti (linkkireitti: tests/kirjautumisen_helpotus.test.js)
    _TUNNUS_LS: 'tm_pelaaja_tunnus',
    _PK_VIRHE_TUNNISTUS: 'Tunnus tai PIN on väärin.',
    _PK_VIRHE_INFRA: 'Kirjautuminen ei juuri nyt onnistu. Yritä hetken päästä uudelleen.',
    _pinVirhe: (t) => loki.virhe.push(t),
    _lataaOmaPelaaja: async () => { loki.lataa++; return true; },
  };
  vm.createContext(ctx); lisaaVerkko(ctx); lisaaP7Offline(ctx);
  vm.runInContext([puraRaaka('function _infraVirheenSyy(koodi, viesti) {'), puraRaaka('function _raportoiKirjautumisvirhe(syy) {'),
    puraRaaka('function _linkkiKirjautuminen() {'), puraRaaka('async function _kirjaudu(pin) {')].join('\n') + '\nthis._kirjaudu = _kirjaudu;', ctx);
  return { loki, ajo: ctx._kirjaudu('1234') };
}

describe('PR 3 · Pelaaja_v7 _kirjaudu ajona', () => {
  it.each([
    ['App Check', { code: 'functions/unauthenticated', message: 'App Check token is invalid' }, 'app-check'],
    ['internal', { code: 'functions/internal', message: 'INTERNAL' }, 'internal'],
    ['unavailable', { code: 'functions/unavailable', message: '' }, 'unavailable'],
  ])('infravirhe (%s) → selkeä virhe + Sentry error, EI signInAnonymously', async (_n, virhe, syy) => {
    const { loki, ajo } = ajaKirjaudu(virhe);
    await ajo;
    expect(loki.anon).toBe(0);
    expect(loki.custom).toBe(0);
    expect(loki.virhe).toEqual(['Kirjautuminen ei juuri nyt onnistu. Yritä hetken päästä uudelleen.']);
    expect(loki.sentry).toEqual([['pelaajaKirjaudu epäonnistui: ' + syy, 'error', syy]]);
  });
  it('väärä tunnus/PIN → tunnistevirhe, ei Sentryä, ei anonyymiä', async () => {
    const { loki, ajo } = ajaKirjaudu({ code: 'functions/invalid-argument', message: 'Tunnus tai PIN on väärin.' });
    await ajo;
    expect(loki.virhe).toEqual(['Tunnus tai PIN on väärin.']);
    expect(loki.sentry).toEqual([]);
    expect(loki.anon).toBe(0);
  });
  it('onnistuminen → custom token + oma pelaaja ladataan', async () => {
    const { loki, ajo } = ajaKirjaudu(null);
    await ajo;
    expect(loki.custom).toBe(1);
    expect(loki.lataa).toBe(1);
    expect(loki.virhe).toEqual([]);
  });
});

describe('PR 3 · Pelaaja_v7 auth-kuuntelija: anonyymi istunto kirjataan ulos', () => {
  const alku = KOODI.indexOf('auth.onAuthStateChanged(async user => {');
  const runko = (() => {
    const i = KOODI.indexOf('async user => {', alku);
    let d = 0;
    for (let j = KOODI.indexOf('{', i); j < KOODI.length; j++) {
      if (KOODI[j] === '{') d++; else if (KOODI[j] === '}') { d--; if (!d) return KOODI.slice(i, j + 1); }
    }
    throw new Error('sulkeet');
  })();
  function aja(user) {
    const loki = { ulos: 0, pin: [], lataa: 0 };
    const ctx = {
      console: { warn() {} },
      auth: { signOut: async () => { loki.ulos++; } }, db: {},
      _authTilaSelvilla: false, _kirjautuminenKesken: false, _uloskirjautunut: false, _user: null,
      _isDemoUser: false, _pinIlmoitus: '',
      _vanhaPinSessioOhjaus: () => false,
      _goPin: (s) => loki.pin.push(s),
      _lataaFirebasePelaaja: async () => { loki.lataa++; },
      _tarkistaPinSessio: async () => false,
    };
    vm.createContext(ctx);
    vm.runInContext('this.kuuntelija = ' + runko, ctx);
    return { loki, ctx, ajo: ctx.kuuntelija(user) };
  }
  it('anonyymi → signOut + PIN-näkymä + ilmoitus, EI datan latausta', async () => {
    const { loki, ctx, ajo } = aja({ uid: 'a', isAnonymous: true });
    await ajo;
    expect(loki.ulos).toBe(1);
    expect(loki.pin).toHaveLength(1);
    expect(loki.lataa).toBe(0);
    expect(ctx._pinIlmoitus).toBe('Kirjaudu kerran uudelleen');
  });
  it('pelaajatoken (ei-anonyymi) → ei uloskirjausta, lataus jatkuu', async () => {
    const { loki, ajo } = aja({ uid: 'pel_x', isAnonymous: false });
    await ajo;
    expect(loki.ulos).toBe(0);
    expect(loki.lataa).toBe(1);
  });
});

