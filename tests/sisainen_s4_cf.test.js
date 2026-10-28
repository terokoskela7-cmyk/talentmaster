/* Vaihe 1 / PR 1e-2 (S4, CF-kirjoittajat): arviointikertaOnWrite + vahvistaSuostumus kirjoittavat S4-kentät myös sisainen/tiedot:iin, kun RYHMAT.s4.kirjoitus on päällä (oletus POIS → täsmälleen kuten ennen).
   AJETTU vm-sandboxissa oikealla functions/index.js-lähteellä ja oikeilla moduuleilla (tm_sisainen, sisainen_luku) fake-Firestoren päällä — ei pelkkää tekstigreppiä.
   Sandboxin nimet = tuotannon muuttujat (tmSisainen, sisainenLuku) → puuttuva import näkyy ReferenceErrorina. Terveyskentät (sisainen/terveys) eivät kuulu CF-kirjoittajiin (ei CF-kirjoittajaa). */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';
import { fakeDb } from './_fakeFirestore.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const CF = readFileSync(join(ROOT, 'functions', 'index.js'), 'utf8');
const TS4 = require_(join(ROOT, 'functions', 'tm_sisainen.js')), LUKU = require_(join(ROOT, 'functions', 'sisainen_luku.js')), AH = require_(join(ROOT, 'functions', 'tm_arviointi_historia.js'));
afterEach(() => { TS4.RYHMAT.s4.kirjoitus = false; });

class HttpsError extends Error { constructor(c, m, d) { super(m); this.code = c; this.details = d; } }
const PEL = 'seurat/kpv/pelaajat/m93', SIS = PEL + '/sisainen/tiedot';

/* ── arviointikertaOnWrite ── */
/* fakeDb:n kyselytulos on { docs } ilman forEach:ia (Admin SDK:n QuerySnapshot'ssa on) → kääri ketju: get()-tulokseen lisätään forEach. Vain testitynkä; tuotantokoodi ennallaan. */
function adminTapaan(x) {
  return new Proxy(x, { get(t, k) {
    const v = t[k]; if (typeof v !== 'function') return v;
    return (...args) => { const r = v.apply(t, args); if (r && typeof r.then === 'function') return r.then((u) => (u && Array.isArray(u.docs) && !u.forEach ? Object.assign({}, u, { forEach: (fn) => u.docs.forEach(fn) }) : u)); return (r && typeof r === 'object') ? adminTapaan(r) : r; };
  } });
}
function ajaArviointi() {
  const f = fakeDb({ [PEL]: { etunimi: 'Topias', arviointi_kooste: { vanha: 1 } } });
  const ketju = { region() { return ketju; }, runWith() { return ketju; }, firestore: { document() { return { onWrite: (fn) => fn }; } } };
  const ctx = { functions: ketju, exports: {}, console: { log() {}, warn() {}, error(...a) { if (process.env.CF_DEBUG) console.log(...a); } }, Date, AH, admin: { firestore: () => adminTapaan(f.db) }, tmSisainen: TS4, String, Object, Array };
  vm.createContext(ctx);
  const i = CF.indexOf('exports.arviointikertaOnWrite = functions');
  vm.runInContext(CF.slice(i, CF.indexOf('\n  });', i) + 6), ctx);
  return { f, kaynnista: () => ctx.exports.arviointikertaOnWrite({}, { params: { seuraId: 'kpv', pelaajaId: 'm93' } }) };
}
describe('arviointikertaOnWrite (ajettu) — S4 dual-write', () => {
  it('lippu POIS (peruutus): vain pelaajadokumentti, koostekentät korvataan; sisainen/tiedot-dokumenttia EI synny', async () => {
    TS4.RYHMAT.s4.kirjoitus = false;
    const a = ajaArviointi(); await a.kaynnista();
    const p = a.f.D.get(PEL); expect(p).toHaveProperty('arviointi_kooste'); expect(p).toHaveProperty('arviointi_kooste_pvm'); expect(p.arviointi_kooste).not.toEqual({ vanha: 1 }); expect(p.etunimi).toBe('Topias');
    expect(a.f.D.has(SIS)).toBe(false);
  });
  it('lippu PÄÄLLÄ: sama arvo pelaajadokumenttiin JA sisainen/tiedot:iin (seuraId + paivitetty + vain arviointi-kentät) YHDESSÄ batchissa', async () => {
    TS4.RYHMAT.s4.kirjoitus = true;
    const a = ajaArviointi(); await a.kaynnista();
    const p = a.f.D.get(PEL), s = a.f.D.get(SIS);
    expect(s).toBeDefined(); expect(s.seuraId).toBe('kpv'); expect(typeof s.paivitetty).toBe('string'); expect(s.arviointi_kooste_pvm).toBe(p.arviointi_kooste_pvm);
    expect(s.arviointi_kooste).toEqual(p.arviointi_kooste); expect(a.f.loki.commits).toBe(1);   // kooste ei jää pelaajalle vanhaksi ilman sisainen-kopiota (yksi commit)
    Object.keys(s).forEach((k) => expect(['seuraId', 'paivitetty', 'arviointi_kooste', 'potentiaali_kooste', 'arviointi_kooste_pvm'], k).toContain(k));
    expect(p.etunimi).toBe('Topias');   // muu pelaajadoc koskematon
  });
  it('virhe ei kaada triggeriä (console.error, palauttaa null) — kuten ennen', async () => {
    TS4.RYHMAT.s4.kirjoitus = true; const a = ajaArviointi(); a.f.db.batch = () => { throw new Error('boom'); };
    await expect(a.kaynnista()).resolves.toBeNull();
  });
});

/* ── vahvistaSuostumus ── */
function ajaVahvistus(alku) {
  const i = CF.indexOf('exports.vahvistaSuostumus = functions');
  const f = fakeDb(Object.assign({ [PEL]: { etunimi: 'Topias', sukunimi: 'K', huoltajaEmail: 'h@x.fi', syntymaVuosi: 2013, suostumusTila: 'odottaa', pin: '591217' } }, alku || {}));
  const ketju = { region() { return ketju; }, runWith() { return ketju; }, https: { onCall: (fn) => fn, HttpsError } };
  const ctx = {
    functions: ketju, exports: {}, db: f.db, console: { log() {}, warn() {}, error() {} }, String, Object, Array, JSON, Date, encodeURIComponent, parseFloat, isFinite,
    admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS' }, Timestamp: { fromDate: (d) => d } } },
    auth: { generatePasswordResetLink: async () => 'r' }, haeOrLuoHuoltajaAuth: async () => ({}), lahetaSahkoposti: async () => {}, pohjaSuostumusLinkki: () => '',
    TM_BASE_URL: 'https://tm', sisainenLuku: LUKU, tmSisainen: TS4, suostumusTarkistus: require_(join(ROOT, 'functions', 'suostumus_tarkistus.js')), suostumusAnnettu: require_(join(ROOT, 'functions', 'suostumus.js')).suostumusAnnettu,
    pelaajapin: require_(join(ROOT, 'functions', 'pelaajapin.js')),
  };
  ctx.tmHT = function (s) { return s; }; vm.createContext(ctx);
  vm.runInContext(CF.slice(i, CF.indexOf('\n  });', i) + 6), ctx);
  return { f, fn: ctx.exports.vahvistaSuostumus };
}
const L = (o) => Object.assign({ seuraId: 'kpv', pelaajaId: 'm93', hEmail: 'h@x.fi', antaja: 'Tero Koskela', antajaRooli: 'huoltaja', etunimi: 'Topias', syntyma: '2013-03-15', suostumukset: ['rekisteri'], suostumusMap: { rekisteri: true }, aikaleima: '1.10.2026' }, o);
describe('vahvistaSuostumus (ajettu) — vanhempien pituudet → sisainen/tiedot (S4)', () => {
  it('lippu POIS (peruutus): pituudet vain pelaajadokumenttiin; sisainen/tiedot ei synny', async () => {
    TS4.RYHMAT.s4.kirjoitus = false;
    const v = ajaVahvistus(); await v.fn(L({ bioPituudet: { isa_pituus_cm: 181, aiti_pituus_cm: 169, vanhempi_pituus_pvm: '2026-10-25' } }), {});
    expect(v.f.D.get(PEL)).toMatchObject({ isa_pituus_cm: 181, aiti_pituus_cm: 169, vanhempi_pituus_pvm: '2026-10-25', vanhempi_pituus_puuttuu: false, suostumusTila: 'annettu' }); expect(v.f.D.has(SIS)).toBe(false);
  });
  it('lippu PÄÄLLÄ: pituudet + puuttuu-lippu + pvm myös sisainen/tiedot:iin; suostumuskentät (suostumus, suostumusTila, huoltajaEmail …) EIVÄT; pelaajadokumentti kuten ennen (dual-write)', async () => {
    TS4.RYHMAT.s4.kirjoitus = true;
    const v = ajaVahvistus(); await v.fn(L({ bioPituudet: { isa_pituus_cm: 181, aiti_pituus_cm: 169, vanhempi_pituus_pvm: '2026-10-25' } }), {});
    const s = v.f.D.get(SIS); expect(s).toMatchObject({ seuraId: 'kpv', isa_pituus_cm: 181, aiti_pituus_cm: 169, vanhempi_pituus_pvm: '2026-10-25', vanhempi_pituus_puuttuu: false });
    Object.keys(s).forEach((k) => expect(['seuraId', 'paivitetty', 'isa_pituus_cm', 'aiti_pituus_cm', 'vanhempi_pituus_pvm', 'vanhempi_pituus_puuttuu'], k).toContain(k));
    expect(v.f.D.get(PEL)).toMatchObject({ isa_pituus_cm: 181, aiti_pituus_cm: 169, suostumusTila: 'annettu' });
  });
  it('lippu päällä, ei pituuksia lomakkeella: sisainen/tiedot:iin ei kirjoiteta mitään (ei tyhjää dokumenttia)', async () => {
    TS4.RYHMAT.s4.kirjoitus = true; const v = ajaVahvistus(); await v.fn(L({}), {});
    expect(v.f.D.has(SIS)).toBe(false); expect(v.f.D.get(PEL).suostumusTila).toBe('annettu');
  });
  it('DUAL-READ: lippu päällä, tallennettu isän pituus vain sisainen/tiedot:issa → puuttuu-lippu lasketaan sen perusteella (sisainen voittaa)', async () => {
    TS4.RYHMAT.s4.kirjoitus = true;
    const v = ajaVahvistus({ [SIS]: { seuraId: 'kpv', isa_pituus_cm: 182 } }); await v.fn(L({ bioPituudet: { aiti_pituus_cm: 170, vanhempi_pituus_pvm: '2026-10-25' } }), {});
    expect(v.f.D.get(PEL).vanhempi_pituus_puuttuu).toBe(false); expect(v.f.D.get(SIS)).toMatchObject({ isa_pituus_cm: 182, aiti_pituus_cm: 170, vanhempi_pituus_puuttuu: false });   // isa säilyy (mergeFields ei koske)
  });
  it('lippu POIS: tallennettu pituus luetaan pelaajadokumentista kuten ennen (ei sisainen-lukua)', async () => {
    const v = ajaVahvistus({ [PEL]: { etunimi: 'Topias', sukunimi: 'K', huoltajaEmail: 'h@x.fi', syntymaVuosi: 2013, suostumusTila: 'odottaa', pin: '591217', isa_pituus_cm: 182 } });
    await v.fn(L({ bioPituudet: { aiti_pituus_cm: 170 } }), {}); expect(v.f.D.get(PEL).vanhempi_pituus_puuttuu).toBe(false); expect(v.f.D.has(SIS)).toBe(false);
  });
  it('sisainen-kirjoitus epäonnistuu → koko suostumus EI tallennu puoliksi (batch kaikki tai ei mitään) → internal', async () => {
    TS4.RYHMAT.s4.kirjoitus = true; const v = ajaVahvistus();
    const b0 = v.f.db.batch.bind(v.f.db); v.f.db.batch = () => { const b = b0(); return { set: (r, d, o) => b.set(r, d, o), update: (r, d) => b.update(r, d), delete: b.delete, commit: async () => { throw new Error('sisainen kaatui'); } }; };
    await expect(v.fn(L({ bioPituudet: { isa_pituus_cm: 181 } }), {})).rejects.toMatchObject({ code: 'internal' }); expect(v.f.D.get(PEL).suostumusTila).toBe('odottaa');
  });
});

describe('CF-kirjoittajien rajaus (PR 1e-2)', () => {
  it('functions/index.js tuo tm_sisainen:n ja käyttää tmS4Lisaa:a VAIN arviointikertaOnWrite:ssa ja vahvistaSuostumus:ssa; terveyskirjoittajia (tmTerveys*) CF:ssä ei ole', () => {
    expect(CF).toContain("const tmSisainen = require('./tm_sisainen');"); expect((CF.match(/tmSisainen\.tmS4Lisaa\(/g) || []).length).toBe(2); expect(CF).not.toMatch(/tmTerveys/);
    const i = CF.indexOf('exports.arviointikertaOnWrite'); expect(CF.slice(i, CF.indexOf('\n  });', i))).toContain('tmSisainen.tmS4Lisaa(batch');
    const j = CF.indexOf('exports.vahvistaSuostumus'); expect(CF.slice(j, CF.indexOf('\n  });', j))).toContain('tmSisainen.tmS4Lisaa(kirjBatch');
  });
  it('CF-lippu oletuksena PÄÄLLÄ (lähde) ja sisainen_luku.liputPaalla seuraa s4:ää (ei omaa vakiota)', () => {
    expect(readFileSync(join(ROOT, 'functions', 'tm_sisainen.js'), 'utf8')).toMatch(/s4: \{ kytketty: false, kirjoitus: true,/); TS4.RYHMAT.s4.kirjoitus = false; const _m = ['jaksofokus_sisainen', 'henkilokunta'], _v = _m.map((n) => TS4.RYHMAT[n].kirjoitus); _m.forEach((n) => { TS4.RYHMAT[n].kirjoitus = false; }); expect(LUKU.liputPaalla()).toBe(false); TS4.RYHMAT.s4.kirjoitus = true; expect(LUKU.liputPaalla()).toBe(true); _m.forEach((n, i) => { TS4.RYHMAT[n].kirjoitus = _v[i]; });
  });
  it('functions/tm_sisainen.js on tavu tavulta lib (deploy pakkaa vain functions/)', () => {
    expect(readFileSync(join(ROOT, 'functions', 'tm_sisainen.js'), 'utf8')).toBe(readFileSync(join(ROOT, 'lib', 'tm_sisainen.js'), 'utf8'));
  });
});
