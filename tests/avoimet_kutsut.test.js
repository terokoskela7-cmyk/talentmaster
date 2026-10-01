/**
 * Avoimet kutsut (1.10.2026): käytetty tai korvattu kutsu ei saa ylikirjoittaa suostumusta; vanha tunnisteeton
 * linkki hylätään, jos suostumus on jo annettu; onnistunut suostumus korvaa saman pelaajan muut avoimet kutsut.
 * vahvistaSuostumus ajetaan CF-rungosta vm:ssä muistinvaraista Firestorea vasten.
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
class HttpsError extends Error { constructor(c, m, d) { super(m); this.code = c; this.details = d; } }
const P = 'seurat/kpv/pelaajat/m93';
const K = (id) => 'seurat/kpv/kutsut/' + id;

function vahvista(alku) {
  const CF = lue('functions/index.js');
  const i = CF.indexOf('exports.vahvistaSuostumus = functions');
  const f = fakeDb(alku);
  const ketju = { region() { return ketju; }, runWith() { return ketju; }, https: { onCall: (fn) => fn, HttpsError } };
  const ctx = {
    functions: ketju, exports: {}, db: f.db, console: { log() {}, warn() {}, error() {} }, String, Object, Array, JSON, Date, encodeURIComponent, parseFloat, isFinite,
    admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS' }, Timestamp: { fromDate: (d) => d } } },
    auth: { generatePasswordResetLink: async () => 'r' }, haeOrLuoHuoltajaAuth: async () => ({}), lahetaSahkoposti: async () => {}, pohjaSuostumusLinkki: () => '',
    TM_BASE_URL: 'https://tm', suostumusTarkistus: require_(join(ROOT, 'functions', 'suostumus_tarkistus.js')), suostumusAnnettu: require_(join(ROOT, 'functions', 'suostumus.js')).suostumusAnnettu, pelaajapin: require_(join(ROOT, 'functions', 'pelaajapin.js')),
  };
  vm.createContext(ctx);
  vm.runInContext(CF.slice(i, CF.indexOf('\n  });', i) + 6), ctx);
  const audit = () => [...f.D.entries()].filter(([k]) => k.startsWith('audit/')).map(([, v]) => v);
  return { f, fn: ctx.exports.vahvistaSuostumus, audit };
}
const PELAAJA = (o) => Object.assign({ etunimi: 'Topias', sukunimi: 'K', huoltajaEmail: 'h@x.fi', syntymaVuosi: 2013, pin: '591217', suostumusTila: 'odottaa' }, o);
const ANNETTU = () => PELAAJA({ suostumusTila: 'annettu', suostumus: { annettu: 'vanha-aika', antaja: 'Ensimmäinen Antaja', hyvaksytyt: { rekisteri: true, anon_data: true } } });
const L = (o) => Object.assign({ seuraId: 'kpv', pelaajaId: 'm93', hEmail: 'h@x.fi', antaja: 'Uusi Antaja', antajaRooli: 'huoltaja', etunimi: 'Topias', syntyma: '2013-03-15',
  suostumukset: ['rekisteri'], suostumusMap: { rekisteri: true, anon_data: false }, aikaleima: 'x' }, o);

describe('vahvistaSuostumus · avoimet kutsut (ajettu)', () => {
  it.each([['hyvaksytty'], ['korvattu']])('käytetty kutsu (tila %s) → kutsu_kaytetty; annettua suostumusta EI ylikirjoiteta', async (tila) => {
    const v = vahvista({ [P]: ANNETTU(), [K('eYlb')]: { pelaajaId: 'm93', tila } });
    const ennen = JSON.stringify(v.f.D.get(P));
    await expect(v.fn(L({ kutsuId: 'eYlb' }), {})).rejects.toMatchObject({ code: 'failed-precondition', message: 'kutsu_kaytetty', details: { syy: 'kutsu_kaytetty' } });
    expect(JSON.stringify(v.f.D.get(P))).toBe(ennen);
    expect(v.audit()).toEqual([expect.objectContaining({ toiminto: 'suostumus_estetty_kutsu_kaytetty', severity: 'warn', kutsun_tila: tila })]);
  });
  it('käytetty kutsu hylätään myös, vaikka suostumusta ei vielä olisi annettu', async () => {
    const v = vahvista({ [P]: PELAAJA(), [K('k1')]: { pelaajaId: 'm93', tila: 'korvattu' } });
    await expect(v.fn(L({ kutsuId: 'k1' }), {})).rejects.toMatchObject({ message: 'kutsu_kaytetty' });
    expect(v.f.D.get(P).suostumusTila).toBe('odottaa');
  });
  it('vanha linkki ilman kutsuId:tä + suostumus jo annettu → suostumus_jo_annettu, ei kirjoituksia', async () => {
    const v = vahvista({ [P]: ANNETTU() });
    const ennen = JSON.stringify(v.f.D.get(P));
    await expect(v.fn(L({ kutsuId: null }), {})).rejects.toMatchObject({ code: 'failed-precondition', message: 'suostumus_jo_annettu' });
    expect(JSON.stringify(v.f.D.get(P))).toBe(ennen);
    expect(v.audit()).toEqual([expect.objectContaining({ toiminto: 'suostumus_estetty_jo_annettu', kutsuId_annettu: false })]);
  });
  it('kutsuId jota ei ole (poistettu kutsu) + annettu → käsitellään tunnisteettomana → suostumus_jo_annettu', async () => {
    const v = vahvista({ [P]: ANNETTU() });
    await expect(v.fn(L({ kutsuId: 'ei-ole' }), {})).rejects.toMatchObject({ message: 'suostumus_jo_annettu' });
  });
  it('vanha linkki ilman kutsuId:tä, suostumusta EI vielä annettu → toimii kuten ennen', async () => {
    const v = vahvista({ [P]: PELAAJA() });
    await v.fn(L({ kutsuId: null }), {});
    expect(v.f.D.get(P).suostumusTila).toBe('annettu');
  });
  it('kutsu toiselle pelaajalle → kutsu_ristiriita, ei kirjoituksia', async () => {
    const v = vahvista({ [P]: PELAAJA(), [K('k2')]: { pelaajaId: 'sisarus', tila: 'odottaa' } });
    await expect(v.fn(L({ kutsuId: 'k2' }), {})).rejects.toMatchObject({ message: 'kutsu_ristiriita' });
    expect(v.f.D.get(P).suostumusTila).toBe('odottaa');
  });
  it('UUSI avoin kutsu ("Lähetä uudelleen") + annettu → uusi suostumus sallitaan; kutsu hyväksytyksi; muut avoimet korvatuiksi', async () => {
    const v = vahvista({ [P]: ANNETTU(),
      [K('CEEV')]: { pelaajaId: 'm93', tila: 'odottaa' }, [K('eYlb')]: { pelaajaId: 'm93', tila: 'odottaa' },
      [K('vanha')]: { pelaajaId: 'm93', tila: 'lahetetty' }, [K('kaytetty')]: { pelaajaId: 'm93', tila: 'hyvaksytty' },
      [K('sisar')]: { pelaajaId: 'sisarus', tila: 'odottaa' } });
    await v.fn(L({ kutsuId: 'CEEV' }), {});
    expect(v.f.D.get(P).suostumus).toMatchObject({ antaja: 'Uusi Antaja', hyvaksytyt: { rekisteri: true, anon_data: false } });
    expect(v.f.D.get(K('CEEV')).tila).toBe('hyvaksytty');
    expect(v.f.D.get(K('eYlb'))).toMatchObject({ tila: 'korvattu', korvattu_kutsulla: 'CEEV' });
    expect(v.f.D.get(K('vanha')).tila).toBe('korvattu');
    expect(v.f.D.get(K('kaytetty')).tila).toBe('hyvaksytty');
    expect(v.f.D.get(K('sisar')).tila).toBe('odottaa');
    // korvattu eYlb ei enää kelpaa
    await expect(v.fn(L({ kutsuId: 'eYlb' }), {})).rejects.toMatchObject({ message: 'kutsu_kaytetty' });
  });
});

describe('suostumuslomake · selkokielinen viesti hylkäyksistä', () => {
  it('kutsu_kaytetty / suostumus_jo_annettu / kutsu_ristiriita näytetään ilmoituksena, ei raakana koodina', () => {
    const S = lue('TalentMaster_Rekisterointi_Suostumus.html');
    for (const k of ['kutsu_kaytetty', 'suostumus_jo_annettu', 'kutsu_ristiriita']) expect(S).toMatch(new RegExp(k + ": '"));
  });
});
