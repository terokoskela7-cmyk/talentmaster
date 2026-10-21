/* Palvelin: lahetaRekisteriKutsu hylkää osoitteen jossa on monta @:ia / välilyönti / erotin (CODE_BRIEF_SEURA_TUONTI_OLEMASSA kohta 2, 21.10.2026). Ajetaan OIKEA lähde vm:ssä.
   Hylkäys tulee oikeustarkistuksen JÄLKEEN (ei tietoa ulkopuoliselle) ja ENNEN sähköpostia, kutsudokumenttia ja audit-riviä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';
import { lisaaPaikkamerkki } from './_paikkamerkkiCtx.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(import.meta.url);
const CF = readFileSync(join(ROOT, 'functions', 'index.js'), 'utf8');
const { onYksiOsoite } = req(join(ROOT, 'functions', 'sahkoposti_turva.js'));
class HttpsError extends Error { constructor(code, msg, details) { super(msg); this.code = code; this.details = details; } }
const VP = { uid: 'vp-1', token: { seuraId: 'sibbo', rooli: 'vp', email: 'vp@tm-testi.fi' } };

function aja(sallittu = true) {
  const loki = { sposti: [], kirjoitukset: 0 };
  const ketju = { region() { return ketju; }, runWith() { return ketju; }, https: { onCall: (f) => f, HttpsError } };
  const kokoelma = () => ({ add: async () => { loki.kirjoitukset++; return { id: 'k1' }; }, doc: () => ({ collection: kokoelma, get: async () => ({ exists: false }), update: async () => { loki.kirjoitukset++; } }) });
  const i = CF.indexOf('exports.lahetaRekisteriKutsu = functions'), runko = CF.slice(i, CF.indexOf('\n  });', i) + 6);
  const ctx = { functions: ketju, exports: {}, console: { log() {}, warn() {}, error() {} }, String, Object, Array, URL, encodeURIComponent,
    db: { collection: kokoelma }, admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } }, tarkistaOikeus: async () => ({ sallittu }), haeJoukkueNimi: async () => 'P10', haeSeuraNimi: async () => 'Sibbo',
    lahetaSahkoposti: async (m) => { loki.sposti.push(m.to); }, pohjaRekisteriKutsu: () => '', TM_BASE_URL: 'https://tm', rakennaKutsuLinkki: (l) => l, suostumusTilaKutsunJalkeen: () => null };
  vm.createContext(ctx); lisaaPaikkamerkki(ctx); vm.runInContext(runko, ctx);
  return { fn: ctx.exports.lahetaRekisteriKutsu, loki };
}
const data = (hEmail) => ({ hEmail, linkki: 'https://tm/x?pelaajaId=p1', seuraId: 'sibbo', etunimi: 'A', sukunimi: 'B', joukkue: 'p10' });

describe('onYksiOsoite (puhdas)', () => {
  it('yksi kelvollinen osoite ok; monta @, välilyönti, erotin, puuttuva piste/paikka → ei', () => {
    ['a@x.fi', ' a.b+c@sub.x.fi '].forEach((e) => expect(onYksiOsoite(e), e).toBe(true));
    ['a@x.fi; b@y.fi', 'a@x.fi, b@y.fi', 'a@x.fi b@y.fi', 'a@x.fi\nb@y.fi', 'a@@x.fi', 'a@b@x.fi', 'a @x.fi', '@x.fi', 'a@x', 'a@.fi', 'a@x.', '', null, undefined, 42].forEach((e) => expect(onYksiOsoite(e), String(e)).toBe(false));
  });
});
describe('lahetaRekisteriKutsu — yksi osoite (ajettu)', () => {
  it('kaksi @:ia / välilyönti → invalid-argument, ei sähköpostia eikä kirjoituksia', async () => {
    for (const e of ['a@x.fi; b@y.fi', 'a@x.fi b@y.fi', 'a@@x.fi', 'a@x.fi,b@y.fi']) {
      const { fn, loki } = aja(); await expect(fn(data(e), { auth: VP }), e).rejects.toMatchObject({ code: 'invalid-argument' }); expect(loki).toEqual({ sposti: [], kirjoitukset: 0 });
    }
  });
  it('yksi osoite → lähtee', async () => { const { fn, loki } = aja(); const r = await fn(data('huoltaja@tm-testi.fi'), { auth: VP }); expect(r.ok).toBe(true); expect(loki.sposti).toEqual(['huoltaja@tm-testi.fi']); });
  it('oikeustarkistus ensin: ilman oikeutta permission-denied myös useammalla osoitteella (ei vuoda validointitietoa)', async () => {
    const { fn } = aja(false); await expect(fn(data('a@x.fi; b@y.fi'), { auth: VP })).rejects.toMatchObject({ code: 'permission-denied' });
  });
});
