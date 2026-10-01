/**
 * Vaihe 0 / PR 3 · Callable-funktiot: pelkkä context.auth EI riitä.
 * Anonyymi kirjautuminen onnistuu Authissa niin kauan kuin Anonymous-provider on päällä, joten
 * jokainen callable, joka tarkisti vain `if (!context.auth)`, on käyty läpi.
 *
 * functions/index.js alustaa admin SDK:n moduulitasolla → ei importattavissa. CF:n runko puretaan
 * lähteestä ja AJETAAN vm-hiekkalaatikossa; tyngät nimetty kuten tuotannon muuttujat (db, admin,
 * tarkistaOikeus …), jotta väärä nimi kaatuu ReferenceErroriin eikä näytä vihreältä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';
import { lisaaPaikkamerkki, onPaikkamerkkiOsoite } from './_paikkamerkkiCtx.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const CF = readFileSync(join(ROOT, 'functions', 'index.js'), 'utf8');
const { tunnisteTyyppi, kuittausPaatos } = require_(join(ROOT, 'functions', 'authz_paatos.js'));

function cfRunko(nimi) {
  const i = CF.indexOf('exports.' + nimi + ' = functions');
  if (i < 0) throw new Error('ei löydy: ' + nimi);
  const j = CF.indexOf('\n  });', i);
  return CF.slice(i, j + 6);
}

class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
function ajaCf(nimi, ymp) {
  const ketju = { region() { return ketju; }, runWith() { return ketju; }, https: { onCall: (f) => f, HttpsError } };
  const ctx = Object.assign({
    functions: ketju, exports: {}, console: { log() {}, warn() {}, error() {} },
    kuittausPaatos, tunnisteTyyppi, encodeURIComponent, String, Object, Array,
  }, ymp);
  vm.createContext(ctx); lisaaPaikkamerkki(ctx);
  vm.runInContext(cfRunko(nimi), ctx);
  return ctx.exports[nimi];
}

const ANON = { uid: 'anon-1', token: { firebase: { sign_in_provider: 'anonymous' } } };
const SOLO = { uid: 'solo_x', token: { rooli: 'solo_lapsi', soloPlayerId: 'p1', firebase: { sign_in_provider: 'custom' } } };
const PEL = { uid: 'pel_fcl_p1', token: { rooli: 'pelaaja', pelaajaSeuraId: 'fcl', pelaajaId: 'p1', firebase: { sign_in_provider: 'custom' } } };
const VP = { uid: 'vp-1', token: { seuraId: 'fcl', rooli: 'vp', email: 'vp@tm-testi.fi', firebase: { sign_in_provider: 'password' } } };

describe('authz_paatos · tunnisteTyyppi / kuittausPaatos (puhdas)', () => {
  it('tunnistetyypit', () => {
    expect(tunnisteTyyppi(null)).toBe(null);
    expect(tunnisteTyyppi(ANON)).toBe('anonyymi');
    expect(tunnisteTyyppi(PEL)).toBe('pelaaja');
    expect(tunnisteTyyppi(SOLO)).toBe('solo_lapsi');
    expect(tunnisteTyyppi(VP)).toBe('kayttaja');
    // anonyymi-provider voittaa väärennetyn roolin (claimeja ei voi asettaa anonyymille, mutta varmuuden vuoksi)
    expect(tunnisteTyyppi({ token: { rooli: 'pelaaja', firebase: { sign_in_provider: 'anonymous' } } })).toBe('anonyymi');
  });
  it('kuittaus: anonyymi ja Solo-lapsi evätään, pelaaja vain oma, muut → henkilökuntatarkistus', () => {
    expect(kuittausPaatos(null, 'fcl', 'p1')).toBe('evatty');
    expect(kuittausPaatos(ANON, 'fcl', 'p1')).toBe('evatty');
    expect(kuittausPaatos(SOLO, 'fcl', 'p1')).toBe('evatty');
    expect(kuittausPaatos(PEL, 'fcl', 'p1')).toBe('ok');
    expect(kuittausPaatos(PEL, 'fcl', 'p2')).toBe('evatty');
    expect(kuittausPaatos(PEL, 'kpv', 'p1')).toBe('evatty');
    expect(kuittausPaatos(VP, 'fcl', 'p1')).toBe('henkilokunta');
  });
});

describe('kuittaaKaavioYmmarretty (ajettu)', () => {
  function aja(auth, data, { oikeus = false } = {}) {
    const loki = { update: [], oikeus: [] };
    const doc = (snap) => ({ get: async () => snap, update: async (u) => { loki.update.push(u); } });
    const db = {
      collection: () => ({ doc: () => ({ collection: (c) => ({ doc: () => (c === 'kaaviot'
        ? doc({ exists: true, data: () => ({ review: { status: 'hyvaksytty' } }) })
        : doc({ exists: true, data: () => ({ joukkueet: ['a'] }) })) }) }) }),
    };
    const fn = ajaCf('kuittaaKaavioYmmarretty', {
      db,
      admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } },
      tarkistaOikeus: async (uid, sid) => { loki.oikeus.push([uid, sid]); return { sallittu: oikeus }; },
      kaavioKohdistuuServer: () => true,
    });
    return { loki, ajo: fn(data, { auth }) };
  }
  const D = { seuraId: 'fcl', kaavioId: 'k1', pelaajaId: 'p1' };

  it('anonyymi → permission-denied, ei kirjoitusta', async () => {
    const t = aja(ANON, D);
    await expect(t.ajo).rejects.toMatchObject({ code: 'permission-denied' });
    expect(t.loki.update).toEqual([]);
  });
  it('Solo-lapsi → permission-denied', async () => {
    const t = aja(SOLO, D);
    await expect(t.ajo).rejects.toMatchObject({ code: 'permission-denied' });
    expect(t.loki.update).toEqual([]);
  });
  it('pelaaja omalla kaaviollaan → ok, kirjoitus tasan omaan avaimeen', async () => {
    const t = aja(PEL, D);
    await expect(t.ajo).resolves.toEqual({ ok: true });
    expect(t.loki.update).toEqual([{ 'review.ymmarretty.p1': 'TS' }]);
    expect(t.loki.oikeus).toEqual([]);
  });
  it('pelaaja toisen puolesta → permission-denied', async () => {
    const t = aja(PEL, { seuraId: 'fcl', kaavioId: 'k1', pelaajaId: 'p2' });
    await expect(t.ajo).rejects.toMatchObject({ code: 'permission-denied' });
    expect(t.loki.update).toEqual([]);
  });
  it('henkilökunta: tarkistaOikeus ratkaisee', async () => {
    const ok = aja(VP, D, { oikeus: true });
    await expect(ok.ajo).resolves.toEqual({ ok: true });
    expect(ok.loki.oikeus).toEqual([['vp-1', 'fcl']]);
    const ei = aja(VP, D, { oikeus: false });
    await expect(ei.ajo).rejects.toMatchObject({ code: 'permission-denied' });
    expect(ei.loki.update).toEqual([]);
  });
});

describe('lahetaPelaajaSivuLinkki (ajettu) — ei enää auki kenellekään, ei palauta reset-linkkiä', () => {
  function aja(auth, { oikeus = false, tallennettu = 'huoltaja@tm-testi.fi' } = {}) {
    const loki = { reset: 0, luotu: 0, sposti: 0 };
    const fn = ajaCf('lahetaPelaajaSivuLinkki', {
      db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({
        get: async () => { const d = { huoltajaEmail: tallennettu, pin: '482915', tunniste: '12345678' }; return { exists: true, get: (k) => d[k], data: () => d }; },
        update: () => Promise.resolve(),
      }) }) }) }) },
      admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } },
      auth: { generatePasswordResetLink: async () => { loki.reset++; return 'https://reset/SALAINEN'; } },
      tarkistaOikeus: async () => ({ sallittu: oikeus }),
      haeJoukkueNimi: async () => 'U12',
      haeOrLuoHuoltajaAuth: async () => { loki.luotu++; },
      lahetaSahkoposti: async (m) => { loki.sposti++; loki.viesti = m; },
      pohjaPelaajaSivu: (o) => JSON.stringify(o),
      pelaajakirjautuminen: require_('../functions/pelaajakirjautuminen.js'),
      TM_BASE_URL: 'https://tm',
    });
    const data = { hEmail: 'Huoltaja@tm-testi.fi', pelaajaId: 'p1', seuraId: 'fcl', etunimi: 'A' };
    return { loki, ajo: fn(data, { auth }) };
  }
  it('ei kirjautumista → unauthenticated, ei tiliä eikä linkkiä', async () => {
    const t = aja(undefined);
    await expect(t.ajo).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(t.loki).toEqual({ reset: 0, luotu: 0, sposti: 0 });
  });
  it('anonyymi → permission-denied (tarkistaOikeus), ei tiliä eikä linkkiä', async () => {
    const t = aja(ANON);
    await expect(t.ajo).rejects.toMatchObject({ code: 'permission-denied' });
    expect(t.loki).toEqual({ reset: 0, luotu: 0, sposti: 0 });
  });
  it('henkilökunta, mutta sähköposti ≠ pelaajan huoltajaEmail → failed-precondition', async () => {
    const t = aja(VP, { oikeus: true, tallennettu: 'joku.muu@tm-testi.fi' });
    await expect(t.ajo).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(t.loki).toEqual({ reset: 0, luotu: 0, sposti: 0 });
  });
  it('henkilökunta + täsmäävä sähköposti → lähetetään, mutta reset-linkkiä EI palauteta kutsujalle', async () => {
    const t = aja(VP, { oikeus: true });
    const r = await t.ajo;
    expect(t.loki.sposti).toBe(1);
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r)).not.toContain('SALAINEN');
    expect(r).not.toHaveProperty('salasanaLinkki');
  });
});

describe('muut callablet: henkilökuntatarkistus lähteessä', () => {
  it('lahetaRekisteriKutsu ja lahetaHuoltajaKutsu vaativat tarkistaOikeuden', () => {
    for (const n of ['lahetaRekisteriKutsu', 'lahetaHuoltajaKutsu']) {
      const r = cfRunko(n);
      const iOik = r.indexOf('tarkistaOikeus(context.auth.uid, seuraId)');
      expect(iOik, n).toBeGreaterThan(0);
      expect(iOik, n + ': tarkistus ennen lähetystä/kirjoitusta').toBeLessThan(
        Math.min(...['lahetaSahkoposti(', ".collection('kutsut')"].map((k) => r.indexOf(k)).filter((x) => x > 0)));
    }
  });
  it('lahetaRekisteriKutsu (ajettu): anonyymi → permission-denied, ei sähköpostia', async () => {
    let sposti = 0;
    const fn = ajaCf('lahetaRekisteriKutsu', {
      db: { collection: () => ({ add: () => Promise.resolve() }) },
      admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } },
      tarkistaOikeus: async () => ({ sallittu: false }),
      haeJoukkueNimi: async () => 'U12', lahetaSahkoposti: async () => { sposti++; }, pohjaRekisteriKutsu: () => '',
    });
    await expect(fn({ hEmail: 'uhri@tm-testi.fi', linkki: 'https://phish', seuraId: 'fcl' }, { auth: ANON }))
      .rejects.toMatchObject({ code: 'permission-denied' });
    await expect(fn({ hEmail: 'uhri@tm-testi.fi', linkki: 'https://phish' }, { auth: ANON }))
      .rejects.toMatchObject({ code: 'permission-denied' });
    expect(sposti).toBe(0);
  });
  it('aiProxy hylkää muut kuin henkilökunnan tokenit heti verifyIdTokenin jälkeen', () => {
    const i = CF.indexOf('exports.aiProxy');
    const r = CF.slice(i, CF.indexOf('_checkRateLimit(uid, task)', i));
    expect(r).toMatch(/verifyIdToken\(token\)[\s\S]*tunnisteTyyppi\(\{ token: decoded \}\) !== 'kayttaja'[\s\S]*status\(403\)/);
  });
});

/* PR 3b · vahvistaSuostumus: toimii ilman kirjautumista (suostumuslomake), joten vastaus EI saa
   sisältää salasanalinkkiä eikä PIN:iä — ne menevät vain tallennettuun huoltajaEmailiin. */
describe('vahvistaSuostumus (ajettu) — tunnukset vain sähköpostiin', () => {
  function aja({ tallennettu = 'huoltaja@tm-testi.fi', pin = '4821', sposti = 'ok' } = {}) {
    const loki = { sposti: [], reset: 0 };
    const DATA = { huoltajaEmail: tallennettu, pin, etunimi: 'Aa', sukunimi: 'Bb', suostumusTila: 'odottaa' };
    const snap = { exists: true, empty: true, docs: [], get: (k) => DATA[k], data: () => DATA };
    // Yleistynkä: mikä tahansa ketju (collection/doc/where/limit/batch…) → sama tynkä; päätteet palauttavat lupauksen.
    const tynka = new Proxy(function () {}, {
      get: (_t, k) => {
        if (k === 'then') return undefined;
        if (k === 'get') return async () => snap;
        if (['update', 'set', 'add', 'commit', 'delete'].includes(k)) return () => Promise.resolve();
        return () => tynka;
      },
      apply: () => tynka,
    });
    const fn = ajaCf('vahvistaSuostumus', {
      db: tynka,
      admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS', arrayUnion: () => 'AU', delete: () => 'DEL' }, Timestamp: { fromDate: () => 'T', now: () => 'T' } } },
      auth: { generatePasswordResetLink: async () => { loki.reset++; return 'https://reset/SALAINEN'; } },
      haeOrLuoHuoltajaAuth: async () => ({}),
      lahetaSahkoposti: async (m) => { if (sposti !== 'ok') throw new Error('sendgrid'); loki.sposti.push(m); },
      pohjaSuostumusLinkki: (o) => JSON.stringify(o),
      TM_BASE_URL: 'https://tm', Date, Math, JSON, Number, isNaN, parseInt, parseFloat,
      suostumusTarkistus: require_('../functions/suostumus_tarkistus.js'),
    });
    const data = { seuraId: 'fcl', pelaajaId: 'p1', hEmail: 'Huoltaja@tm-testi.fi', suostumusTeksti: 'x', antaja: 'A', kutsuId: null,
      suostumukset: [], suostumusMap: {}, antajaRooli: 'huoltaja', aikaleima: '2026-10-01' };
    return { loki, ajo: fn(data, {}) };
  }
  it('onnistuminen: vastauksessa EI linkkiä eikä PIN:iä; sähköpostissa on molemmat', async () => {
    const t = aja();
    const r = await t.ajo;
    expect(r).toEqual({ ok: true, emailLahetetty: true, emailVirhe: null });
    expect(JSON.stringify(r)).not.toMatch(/SALAINEN|4821/);
    expect(t.loki.sposti).toHaveLength(1);
    expect(t.loki.sposti[0].to).toBe('huoltaja@tm-testi.fi');
    expect(t.loki.sposti[0].html).toContain('SALAINEN');
    expect(t.loki.sposti[0].html).toContain('4821');
  });
  it('sähköposti epäonnistuu: emailLahetetty:false, ei linkkiä/PIN:iä vastauksessa', async () => {
    const r = await aja({ sposti: 'virhe' }).ajo;
    expect(r.emailLahetetty).toBe(false);
    expect(JSON.stringify(r)).not.toMatch(/SALAINEN|4821/);
  });
  it('hEmail ≠ tallennettu huoltajaEmail → permission-denied, ei linkkiä eikä sähköpostia', async () => {
    const t = aja({ tallennettu: 'oikea@tm-testi.fi' });
    await expect(t.ajo).rejects.toMatchObject({ code: 'permission-denied' });
    expect(t.loki.reset).toBe(0);
    expect(t.loki.sposti).toEqual([]);
  });
});

describe('Rekisterointi_Suostumus · ei QR:ää, kopiointia eikä PIN:iä sivulla', () => {
  const S = readFileSync(join(ROOT, 'TalentMaster_Rekisterointi_Suostumus.html'), 'utf8');
  it('sivu ei lue eikä näytä linkkiä/PIN:iä', () => {
    expect(S).not.toMatch(/passwordResetLink|res\.data\.pin|_suostumusResetLinkki|_suostumusPin|qrserver/);
    expect(S).toContain('Tunnukset l&auml;hetetty s&auml;hk&ouml;postiisi');
    expect(S).toContain('Pyyd&auml; seuraa l&auml;hett&auml;m&auml;&auml;n tunnukset uudelleen');
  });
});
