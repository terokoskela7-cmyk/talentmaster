/**
 * Paikkamerkkidomainien esto (1.10.2026). Paikkamerkkitilit siivottiin 1.10. (scripts/paikkamerkkitilit_siivous.js),
 * mutta luoKayttaja ja haeOrLuoHuoltajaAuth loivat Auth-tilin mille tahansa osoitteelle.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';
import { ESTA_LAHDE, lisaaPaikkamerkki } from './_paikkamerkkiCtx.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const CFM = require_(join(ROOT, 'functions', 'paikkamerkki.js'));
const LIB = require_(join(ROOT, 'lib', 'tm_paikkamerkki.js'));
const CF = readFileSync(join(ROOT, 'functions', 'index.js'), 'utf8');
const SEURA = readFileSync(join(ROOT, 'TalentMaster_Seura.html'), 'utf8');

describe('domainlista ja tunnistus', () => {
  it('functions- ja lib-lista ovat samat ja sisältävät briefin domainit', () => {
    expect(LIB.PAIKKAMERKKI_DOMAINIT).toEqual(CFM.PAIKKAMERKKI_DOMAINIT);
    expect([...CFM.PAIKKAMERKKI_DOMAINIT].sort()).toEqual(['b.fi', 'demo.kpv.fi', 'email.fi', 'example.com', 'example.fi', 'example.test',
      'osoite.fi', 'seura.fi', 'talentmaster.fi', 'talentmaster.local', 'test.fi', 'x.fi', 'y.fi', 'z.fi']);
  });
  it.each([
    ['huoltaja@example.com', true], ['VP.FCL@TalentMaster.fi', true], [' a@demo.kpv.fi ', true], ['a@mail.example.fi', true],
    ['a@x.fi', true], ['a@kpv.fi', false], ['a@xx.fi', false], ['a@gmail.com', false], ['talentmasterid@gmail.com', false],
    ['a@example.company', false], ['', false], [null, false], ['ei-at-merkkia', false],
  ])('%s → %s (sama tulos palvelimella ja selaimessa)', (email, odotus) => {
    expect(CFM.onPaikkamerkkiOsoite(email)).toBe(odotus);
    expect(LIB.tmOnPaikkamerkkiOsoite(email)).toBe(odotus);
  });
});

class HttpsError extends Error { constructor(c, m, d) { super(m); this.code = c; this.details = d; } }
describe('haeOrLuoHuoltajaAuth (ajettu)', () => {
  const ymp = () => {
    const kutsut = [];
    const ctx = {
      functions: { https: { HttpsError } }, onPaikkamerkkiOsoite: CFM.onPaikkamerkkiOsoite, console: { log() {} },
      auth: { getUserByEmail: async (e) => { kutsut.push('get'); throw Object.assign(new Error('nf'), { errorInfo: { code: 'auth/user-not-found' } }); },
        createUser: async () => { kutsut.push('create'); return { uid: 'u' }; } },
      uusiValiaikainenSalasana: () => 'TM_x',
    };
    vm.createContext(ctx);
    const i = CF.indexOf('async function haeOrLuoHuoltajaAuth(');
    vm.runInContext(ESTA_LAHDE + CF.slice(i, CF.indexOf('\n}\n', i) + 3), ctx);
    return { ctx, kutsut };
  };
  it('paikkamerkkiosoite → failed-precondition paikkamerkki_osoite ennen kuin Authia kysytään', async () => {
    const { ctx, kutsut } = ymp();
    await expect(ctx.haeOrLuoHuoltajaAuth('huoltaja@example.com', 'A', 'B')).rejects.toMatchObject({ code: 'failed-precondition', details: { syy: 'paikkamerkki_osoite' } });
    expect(kutsut).toEqual([]);
  });
  it('oikea osoite → tili luodaan kuten ennen', async () => {
    const { ctx, kutsut } = ymp();
    await ctx.haeOrLuoHuoltajaAuth('vanhempi@gmail.com', 'A', 'B');
    expect(kutsut).toEqual(['get', 'create']);
  });
});

describe('palvelimen kutsukohdat', () => {
  const runko = (nimi) => { const i = CF.indexOf('exports.' + nimi + ' = functions'); return CF.slice(i, CF.indexOf('\n  });', i)); };
  it('luoKayttaja tarkistaa ennen tarkistaOikeutta ja Auth-hakua', () => {
    const r = runko('luoKayttaja');
    expect(r.indexOf('estaPaikkamerkkiOsoite(email);')).toBeGreaterThan(-1);
    expect(r.indexOf('estaPaikkamerkkiOsoite(email);')).toBeLessThan(r.indexOf('getUserByEmail'));
    expect(r.indexOf('estaPaikkamerkkiOsoite(email);')).toBeLessThan(r.indexOf('tarkistaOikeus('));
  });
  it('lahetaPelaajaSivuLinkki tarkistaa ennen sähköpostia (haeOrLuoHuoltajaAuth-virhe niellään siellä)', () => {
    const r = runko('lahetaPelaajaSivuLinkki');
    expect(r.indexOf('estaPaikkamerkkiOsoite(hEmail);')).toBeGreaterThan(-1);
    expect(r.indexOf('estaPaikkamerkkiOsoite(hEmail);')).toBeLessThan(r.indexOf('lahetaSahkoposti('));
  });
});

describe('Seura-sivu', () => {
  it('lataa kirjaston ja tarkistaa rekisteröinnissä, lähetyksessä ja muokkauksessa', () => {
    expect(SEURA).toContain('<script src="lib/tm_paikkamerkki.js?v=1"></script>');
    expect(SEURA).toContain("if (tmOnPaikkamerkkiOsoite(hEmail)) { naytaModalVirhe('rekisteriVirhe', PAIKKAMERKKI_SYY + '.'); return; }");
    expect(SEURA).toContain("if (tmOnPaikkamerkkiOsoite(hEmail)) { naytaToast(PAIKKAMERKKI_SYY + '.', 'virhe'); return; }");
    expect(SEURA).toContain('if (hEmail && tmOnPaikkamerkkiOsoite(hEmail)) {');
  });
  it('Excel-tuonti: rivi merkitään hylätyksi syineen, ohitetaan tuonnissa ja lasketaan yhteenvetoon', () => {
    expect(SEURA).toContain('_hylatty: (r.huoltajaEmail && tmOnPaikkamerkkiOsoite(r.huoltajaEmail)) ? PAIKKAMERKKI_SYY : null');
    expect(SEURA).toContain("const status    = p._hylatty ? '⛔ ' + p._hylatty");
    expect(SEURA).toContain('if (p._hylatty) { hylatty++; continue; }');
    expect(SEURA).toContain('hylätty (esimerkkiosoite – korvaa huoltajan oikealla sähköpostilla)');
  });
  it('Excel-pohjan esimerkkirivi säilyy, mutta sen osoite on paikkamerkki (tuonti hylkää sen)', () => {
    expect(SEURA).toContain("'huoltaja@example.com'");
    expect(LIB.tmOnPaikkamerkkiOsoite('huoltaja@example.com')).toBe(true);
  });
  it('syyteksti on briefin mukainen', () => {
    expect(LIB.PAIKKAMERKKI_SYY).toBe('Esimerkkiosoite – korvaa huoltajan oikealla sähköpostilla');
  });
});

/* Kutsufunktiot ajettuna (oikea lähde): paikkamerkkiosoite hylätään oikeustarkistuksen JÄLKEEN (anonyymi saa yhä
   permission-denied, ei tietoa osoitteesta) ja ENNEN sähköpostia, kutsudokumenttia tai audit-riviä. */
describe('lahetaRekisteriKutsu / lahetaHuoltajaKutsu (ajettu)', () => {
  const runko = (nimi) => { const i = CF.indexOf('exports.' + nimi + ' = functions'); return CF.slice(i, CF.indexOf('\n  });', i) + 6); };
  const VP = { uid: 'vp-1', token: { seuraId: 'kpv', rooli: 'vp', email: 'vp@tm-testi.fi' } };
  function aja(nimi, sallittu = true) {
    const loki = { sposti: 0, kirjoitukset: 0 };
    const ketju = { region() { return ketju; }, runWith() { return ketju; }, https: { onCall: (f) => f, HttpsError } };
    const kokoelma = () => ({ add: async () => { loki.kirjoitukset++; return { id: 'k1' }; }, doc: () => ({ collection: kokoelma, update: async () => { loki.kirjoitukset++; } }) });
    const ctx = {
      functions: ketju, exports: {}, console: { log() {}, warn() {}, error() {} }, String, Object, Array, URL, encodeURIComponent,
      db: { collection: kokoelma }, admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } },
      tarkistaOikeus: async () => ({ sallittu }), haeJoukkueNimi: async () => 'U12',
      lahetaSahkoposti: async () => { loki.sposti++; }, pohjaRekisteriKutsu: () => '', TM_BASE_URL: 'https://tm',
    };
    vm.createContext(ctx); lisaaPaikkamerkki(ctx);
    vm.runInContext(runko(nimi), ctx);
    return { fn: ctx.exports[nimi], loki };
  }
  it('lahetaRekisteriKutsu: example.com → paikkamerkki_osoite, ei sähköpostia eikä kirjoituksia', async () => {
    const { fn, loki } = aja('lahetaRekisteriKutsu');
    await expect(fn({ hEmail: 'huoltaja@example.com', linkki: 'https://tm/x?pelaajaId=p1', seuraId: 'kpv' }, { auth: VP }))
      .rejects.toMatchObject({ code: 'failed-precondition', details: { syy: 'paikkamerkki_osoite' } });
    expect(loki).toEqual({ sposti: 0, kirjoitukset: 0 });
  });
  it('lahetaHuoltajaKutsu: talentmaster.fi → paikkamerkki_osoite, ei kutsudokumenttia', async () => {
    const { fn, loki } = aja('lahetaHuoltajaKutsu');
    await expect(fn({ huoltajaEmail: 'h.fcl@talentmaster.fi', pelaajaId: 'p1', seuraId: 'kpv' }, { auth: VP }))
      .rejects.toMatchObject({ code: 'failed-precondition', details: { syy: 'paikkamerkki_osoite' } });
    expect(loki).toEqual({ sposti: 0, kirjoitukset: 0 });
  });
  it('oikeustarkistus ensin: ilman oikeutta → permission-denied myös paikkamerkkiosoitteella', async () => {
    for (const [nimi, data] of [['lahetaRekisteriKutsu', { hEmail: 'a@example.com', linkki: 'https://tm/x', seuraId: 'kpv' }],
      ['lahetaHuoltajaKutsu', { huoltajaEmail: 'a@example.com', pelaajaId: 'p1', seuraId: 'kpv' }]]) {
      const { fn } = aja(nimi, false);
      await expect(fn(data, { auth: VP })).rejects.toMatchObject({ code: 'permission-denied' });
    }
  });
  it('oikea osoite → kutsu etenee kuten ennen', async () => {
    const r = aja('lahetaHuoltajaKutsu');
    await r.fn({ huoltajaEmail: 'vanhempi@gmail.com', pelaajaId: 'p1', seuraId: 'kpv' }, { auth: VP });
    expect(r.loki.kirjoitukset).toBeGreaterThan(0);
  });
});
