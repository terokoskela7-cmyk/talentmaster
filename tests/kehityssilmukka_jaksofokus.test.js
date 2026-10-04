/**
 * R6.1a — lib/tm_kehityssilmukka.js: jaksofokuksen YHTEINEN kirjoitusydin (pure): tmAsetaJaksofokus · tmSuljeJakso · tmPaivitaJaksofokus.
 * Periaate: arkistointi VAIN tmJaksonVaihto:n kautta (ei rinnakkaista logiikkaa) → pariteettitesti; kaikki aikaleimat ISO; ydin ei koske Firestoreen.
 * Fixturet: vain KPV U13 -testipelaajat (Topias K.). Ei sovelluskytkentöjä tässä PR:ssä (adapterit R6.1b/R6.1c).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const K = require('../lib/tm_kehityssilmukka.js');
const J = require('../lib/tm_jaksokooste.js');
const LIB = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'tm_kehityssilmukka.js'), 'utf8');
const NYT = '2026-10-05T12:00:00.000Z';
const ALKOI = '2026-09-01T08:00:00.000Z';
const topias = (jf) => ({ id: 'm93GBdOaGCUuenMiCL0I', joukkue: 'KPV U13', etunimi: 'Topias', jaksofokus: jf });
const VANHA = { konsepti_avain: 'y_h2', konsepti_nimi: 'SYÖTTÄMINEN', alkoi: ALKOI, kesto_vk: 6, lahde: 'valmentaja', poikkeama: true, tavoite_alue: 'syotto' };
const UUSI = { konsepti_avain: 'y_h3', konsepti_nimi: 'PELINLUKU', alkoi: NYT, kesto_vk: 4, lahde: 'valmentaja' };

describe('tmAsetaJaksofokus — arkistointi VAIN tmJaksonVaihto:n kautta', () => {
  it('PARITEETTI: tulos = tmJaksonVaihto (jaksofokus + arkistorivi + sama) kaikilla tapauksilla — ei rinnakkaista logiikkaa', () => {
    const tapaukset = [
      [VANHA, UUSI], [VANHA, Object.assign({}, VANHA, { alkoi: NYT, kesto_vk: 4 })], [null, UUSI], [undefined, UUSI], [{}, UUSI],
      [{ konsepti_nimi: 'Nimetön', alkoi: ALKOI }, UUSI],
      [{ domeeni: 'fyysinen', ohjelma: { ohjelma_id: 'o1', tyyppi: 'plyo' }, alkoi: ALKOI }, { domeeni: 'fyysinen', ohjelma: { ohjelma_id: 'o1' }, alkoi: NYT }],
      [{ domeeni: 'fyysinen', ohjelma: { ohjelma_id: 'o1' }, alkoi: ALKOI }, { domeeni: 'fyysinen', ohjelma: { ohjelma_id: 'o2' }, alkoi: NYT }],
      [{ konsepti_avain: 'x', domeeni: 'fyysinen', alkoi: ALKOI }, { konsepti_avain: 'x', alkoi: NYT }],
    ];
    tapaukset.forEach(([vanha, uusi], i) => {
      const odotettu = J.tmJaksonVaihto(vanha, uusi, NYT);
      const r = K.tmAsetaJaksofokus(topias(vanha), uusi, { nytISO: NYT });
      expect(r.jaksofokus, 'jaksofokus #' + i).toEqual(odotettu.jaksofokus); expect(r.sama, 'sama #' + i).toBe(odotettu.sama);
      expect(r.historiaLisays, 'arkisto #' + i).toEqual(odotettu.arkisto ? [odotettu.arkisto] : []);
      expect(r.arkisto).toEqual(odotettu.arkisto);
    });
  });
  it('lähde: kutsuu tmJaksonVaihto:a eikä toteuta omaa "sama jakso" -vertailua', () => {
    expect(LIB).toMatch(/\.tmJaksonVaihto\(/); const koodi = LIB.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    expect(koodi).not.toMatch(/tmSamaJakso|tmJaksonAvain/); expect(koodi).not.toMatch(/konsepti_avain\s*===|===\s*[a-z]+\.konsepti_avain/);
  });
  it('eri jakso: YKSI historiarivi edellisestä (alkoi säilyy, ISO), uusi korvaa kokonaan; sama jakso: alkoi säilyy, ei riviä', () => {
    const r = K.tmAsetaJaksofokus(topias(VANHA), UUSI, { nytISO: NYT });
    expect(r.sama).toBe(false); expect(r.historiaLisays.length).toBe(1);
    expect(r.historiaLisays[0]).toMatchObject({ konsepti_avain: 'y_h2', alkoi: ALKOI, paattyi: NYT, suljettu: NYT, sulkutapa: 'korvattu' });
    expect(r.jaksofokus).toEqual(UUSI); expect(r.jaksofokus.poikkeama).toBeUndefined();
    const s = K.tmAsetaJaksofokus(topias(VANHA), Object.assign({}, VANHA, { alkoi: NYT, kesto_vk: 4 }), { nytISO: NYT });
    expect(s.sama).toBe(true); expect(s.historiaLisays).toEqual([]); expect(s.jaksofokus.alkoi).toBe(ALKOI); expect(s.jaksofokus.kesto_vk).toBe(4);
  });
  it('opts.tulos ("vaihdettu" VP:lle) ja lisakentat (sitoumus-/d3-snapshot) lisätään riville; ydinkenttiä ei voi ylikirjoittaa; oletus tulos null', () => {
    const r = K.tmAsetaJaksofokus(topias(VANHA), UUSI, { nytISO: NYT, tulos: 'vaihdettu', lisakentat: { sitoumus_snapshot: { q1: 'a' }, d3_snapshot: { x: 1 }, konsepti_avain: 'HAKKEROITU', sulkutapa: 'x', alkoi: 'x' } });
    expect(r.historiaLisays[0]).toMatchObject({ tulos: 'vaihdettu', sitoumus_snapshot: { q1: 'a' }, d3_snapshot: { x: 1 }, konsepti_avain: 'y_h2', sulkutapa: 'korvattu', alkoi: ALKOI });
    expect(K.tmAsetaJaksofokus(topias(VANHA), UUSI, { nytISO: NYT }).historiaLisays[0].tulos).toBeNull();
  });
  it('linkki: tavoite_alue / valitavoite_idx / oma_jakso kirjataan uuteen jaksofokukseen (additiivinen); ilman linkkiä ei lisäkenttiä', () => {
    const r = K.tmAsetaJaksofokus(topias(null), UUSI, { nytISO: NYT, linkki: { tavoite_alue: 'syotto', valitavoite_idx: 2 } });
    expect(r.jaksofokus).toMatchObject({ konsepti_avain: 'y_h3', tavoite_alue: 'syotto', valitavoite_idx: 2 }); expect(r.jaksofokus.oma_jakso).toBeUndefined();
    expect(K.tmAsetaJaksofokus(topias(null), UUSI, { nytISO: NYT, linkki: { oma_jakso: true } }).jaksofokus.oma_jakso).toBe(true);
    expect(K.tmAsetaJaksofokus(topias(null), UUSI, { nytISO: NYT }).jaksofokus).toEqual(UUSI);
  });
  it('ISO-aikaleimat (ei serverTimestamp/Timestamp); oletus-nyt on ISO; syötteitä ei mutatoida', () => {
    const v = JSON.parse(JSON.stringify(VANHA)), u = JSON.parse(JSON.stringify(UUSI));
    const r = K.tmAsetaJaksofokus(topias(v), u, {});
    ['paattyi', 'suljettu', 'alkoi'].forEach((k) => { expect(typeof r.historiaLisays[0][k]).toBe('string'); expect(new Date(r.historiaLisays[0][k]).toISOString()).toBe(r.historiaLisays[0][k]); });
    expect(v).toEqual(VANHA); expect(u).toEqual(UUSI);
  });
  it('puuttuva pelaaja / jaksofokus ei kaada: ensimmäinen jakso → ei arkistoa', () => {
    expect(K.tmAsetaJaksofokus(null, UUSI, { nytISO: NYT })).toMatchObject({ historiaLisays: [], sama: false, jaksofokus: UUSI });
    expect(K.tmAsetaJaksofokus({}, UUSI, { nytISO: NYT }).historiaLisays).toEqual([]);
  });
});

describe('tmSuljeJakso — arvioitu sulku', () => {
  const SULKU = { harjoituksia: 5, lasnaolo: { paikalla: 4, yhteensa: 5, tiedossa: 5 }, arvio_itse: 4, arvio_valmentaja: 3, arvioija_rooli: 'valmentaja', kalibraatio_ero: 1, delta_mitattu: { ennen: 6, jalkeen: 5.5, muutos: -0.5 }, tulos: 'parani', loppu: '2026-10-04T10:00:00.000Z' };
  it('rivi: sulkutapa "suljettu", arviot/kalibraatio/delta/tulos, alkoi = jaksofokuksen alkoi, paattyi = sulku.loppu, suljettu = nyt (ISO)', () => {
    const r = K.tmSuljeJakso(topias(VANHA), SULKU, { nytISO: NYT });
    expect(r.historiaLisays.length).toBe(1);
    expect(r.historiaLisays[0]).toMatchObject({ konsepti_avain: 'y_h2', domeeni: 'teknis_taktinen', alkoi: ALKOI, paattyi: '2026-10-04T10:00:00.000Z', suljettu: NYT, sulkutapa: 'suljettu',
      harjoituksia: 5, arvio_itse: 4, arvio_valmentaja: 3, arvioija_rooli: 'valmentaja', kalibraatio_ero: 1, tulos: 'parani', lasnaolo: { paikalla: 4, yhteensa: 5, tiedossa: 5 }, delta_mitattu: { ennen: 6, jalkeen: 5.5, muutos: -0.5 } });
    expect(r.jaksofokus).toBeNull();
  });
  it('uusi jakso annettu: jaksofokus = uusi, lahde_seuraava riville; EI kaksoisarkistointia (vain sulkurivi)', () => {
    const r = K.tmSuljeJakso(topias(VANHA), Object.assign({}, SULKU, { uusi: UUSI }), { nytISO: NYT });
    expect(r.jaksofokus).toEqual(UUSI); expect(r.historiaLisays.length).toBe(1); expect(r.historiaLisays[0].lahde_seuraava).toBe('valmentaja'); expect(r.historiaLisays[0].sulkutapa).toBe('suljettu');
  });
  it('fyysinen jakso: domeeni + ohjelma kopioituu riville (annos–vaste); sulku.alkoi voittaa jaksofokuksen alkoi', () => {
    const f = { konsepti_avain: 'fy_nopeus', konsepti_nimi: 'Nopeus', domeeni: 'fyysinen', alkoi: ALKOI, ohjelma: { ohjelma_id: 'o1', tyyppi: 'plyo' } };
    const r = K.tmSuljeJakso(topias(f), { alkoi: '2026-09-02T00:00:00.000Z', tulos: 'parani' }, { nytISO: NYT });
    expect(r.historiaLisays[0]).toMatchObject({ domeeni: 'fyysinen', ohjelma: { ohjelma_id: 'o1', tyyppi: 'plyo' }, alkoi: '2026-09-02T00:00:00.000Z' });
  });
  it('lisakentat (snapshotit) lisätään, ydin ei ylikirjoitu; paattyi oletuksena nyt', () => {
    const r = K.tmSuljeJakso(topias(VANHA), { tulos: 'parani' }, { nytISO: NYT, lisakentat: { sitoumus_snapshot: { q1: 'a' }, sulkutapa: 'x', konsepti_avain: 'HAKKEROITU' } });
    expect(r.historiaLisays[0]).toMatchObject({ sitoumus_snapshot: { q1: 'a' }, sulkutapa: 'suljettu', konsepti_avain: 'y_h2', paattyi: NYT });
  });
  it('ei aktiivista jaksoa → heittää (ei fabrikoida suljettua jaksoa)', () => {
    [null, {}, topias(null), topias({}), topias({ kesto_vk: 4 })].forEach((p) => expect(() => K.tmSuljeJakso(p, SULKU, { nytISO: NYT })).toThrow(/ei aktiivista jaksoa/));
  });
});

describe('tmPaivitaJaksofokus — saman jakson osamuutos dot-polulla', () => {
  const JF = { konsepti_avain: 'y_h2', konsepti_nimi: 'SYÖTTÄMINEN', alkoi: ALKOI, kesto_vk: 6, osa_arviot: { a: 2, b: 3 }, tavoitteet: [{ nimi: 'X' }] };
  it('palauttaa dot-polut (jaksofokus.<kenttä>) + paikallisen kopion; muut kentät koskemattomia (ei syvämergeä)', () => {
    const r = K.tmPaivitaJaksofokus(topias(JF), { osa_arviot: { a: 2, b: 3, c: 1 } });
    expect(r.polut).toEqual({ 'jaksofokus.osa_arviot': { a: 2, b: 3, c: 1 } });
    expect(r.jaksofokus).toEqual(Object.assign({}, JF, { osa_arviot: { a: 2, b: 3, c: 1 } }));
    expect(Object.keys(r.polut).every((k) => k.indexOf('jaksofokus.') === 0)).toBe(true);
  });
  it('sisäkkäinen dot-avain: vain yksi alikenttä (osa_arviot.c), muut osa-arviot säilyvät paikallisessakin kopiossa', () => {
    const r = K.tmPaivitaJaksofokus(topias(JF), { 'osa_arviot.c': 1 });
    expect(r.polut).toEqual({ 'jaksofokus.osa_arviot.c': 1 }); expect(r.jaksofokus.osa_arviot).toEqual({ a: 2, b: 3, c: 1 });
    const t = K.tmPaivitaJaksofokus(topias({ konsepti_avain: 'k', alkoi: ALKOI }), { 'osa_arviot.c': 1 });   // osa_arviot puuttuu → luodaan
    expect(t.jaksofokus.osa_arviot).toEqual({ c: 1 });
  });
  it('tavoitteet (taulukko) ja useita kenttiä kerralla', () => {
    const r = K.tmPaivitaJaksofokus(topias(JF), { tavoitteet: [{ nimi: 'Y' }], kesto_vk: 5 });
    expect(r.polut).toEqual({ 'jaksofokus.tavoitteet': [{ nimi: 'Y' }], 'jaksofokus.kesto_vk': 5 }); expect(r.jaksofokus.kesto_vk).toBe(5);
  });
  it('IDENTITEETTI kielletty (konsepti_avain/nimi/koodi, domeeni, alkoi, ohjelma; myös dot-muodossa) → heittää; jakson vaihto = tmAsetaJaksofokus', () => {
    ['konsepti_avain', 'konsepti_nimi', 'konsepti_koodi', 'domeeni', 'alkoi', 'ohjelma', 'ohjelma.nimi'].forEach((k) => expect(() => K.tmPaivitaJaksofokus(topias(JF), { [k]: 'x' }), k).toThrow(/identiteettikenttää/));
  });
  it('ei aktiivista jaksoa → heittää (ei haamujaksoa)', () => {
    [null, {}, topias(null), topias({ kesto_vk: 3 })].forEach((p) => expect(() => K.tmPaivitaJaksofokus(p, { osa_arviot: { a: 1 } })).toThrow(/ei aktiivista jaksoa/));
  });
  it('ei mutatoi alkuperäistä pelaajaa; tyhjä osa → tyhjät polut', () => {
    const p = topias(JSON.parse(JSON.stringify(JF))); K.tmPaivitaJaksofokus(p, { osa_arviot: { z: 9 } }); expect(p.jaksofokus).toEqual(JF);
    expect(K.tmPaivitaJaksofokus(p, {}).polut).toEqual({});
  });
});

describe('R6.1a-korjaukset (katselmointi)', () => {
  it('tmAsetaJaksofokus: uudelta jaksolta puuttuu alkoi → alkoi = nytISO (myös ilman edellistä jaksoa ja eri jaksolla)', () => {
    const { alkoi, ...ilmanAlkoi } = UUSI; void alkoi;
    expect(K.tmAsetaJaksofokus(topias(null), ilmanAlkoi, { nytISO: NYT }).jaksofokus.alkoi).toBe(NYT);
    expect(K.tmAsetaJaksofokus(topias(VANHA), ilmanAlkoi, { nytISO: NYT }).jaksofokus.alkoi).toBe(NYT);
    expect(K.tmAsetaJaksofokus({}, { konsepti_avain: 'n' }, { nytISO: NYT }).jaksofokus).toEqual({ konsepti_avain: 'n', alkoi: NYT });
    expect(K.tmAsetaJaksofokus(topias(VANHA), Object.assign({}, ilmanAlkoi, { alkoi: '' }), { nytISO: NYT }).jaksofokus.alkoi).toBe(NYT);   // tyhjä merkkijono = puuttuu
  });
  it('tmAsetaJaksofokus: alkoi annettu → säilyy; SAMA jakso ilman alkoi:ta → vanha alkoi säilyy (ei nyt)', () => {
    expect(K.tmAsetaJaksofokus(topias(null), UUSI, { nytISO: 'EI-TÄMÄ' }).jaksofokus.alkoi).toBe(NYT);
    const { alkoi, ...samaIlmanAlkoi } = VANHA; void alkoi;
    const r = K.tmAsetaJaksofokus(topias(VANHA), samaIlmanAlkoi, { nytISO: NYT });
    expect(r.sama).toBe(true); expect(r.jaksofokus.alkoi).toBe(ALKOI); expect(r.historiaLisays).toEqual([]);
  });
  it('tmAsetaJaksofokus ei mutatoi syötettä alkoi:ta lisätessään', () => {
    const { alkoi, ...ilmanAlkoi } = UUSI; void alkoi; const kopio = JSON.parse(JSON.stringify(ilmanAlkoi));
    K.tmAsetaJaksofokus(topias(null), ilmanAlkoi, { nytISO: NYT }); expect(ilmanAlkoi).toEqual(kopio);
  });
  it('tmSuljeJakso: uudelta jaksolta puuttuu alkoi → alkoi = nytISO; annettu alkoi säilyy; ei mutatoi syötettä', () => {
    const { alkoi, ...ilmanAlkoi } = UUSI; void alkoi; const kopio = JSON.parse(JSON.stringify(ilmanAlkoi));
    expect(K.tmSuljeJakso(topias(VANHA), { tulos: 'parani', uusi: ilmanAlkoi }, { nytISO: NYT }).jaksofokus.alkoi).toBe(NYT);
    expect(ilmanAlkoi).toEqual(kopio);
    expect(K.tmSuljeJakso(topias(VANHA), { tulos: 'parani', uusi: Object.assign({}, UUSI, { alkoi: '2026-10-06T00:00:00.000Z' }) }, { nytISO: NYT }).jaksofokus.alkoi).toBe('2026-10-06T00:00:00.000Z');
    expect(K.tmSuljeJakso(topias(VANHA), { tulos: 'parani' }, { nytISO: NYT }).jaksofokus).toBeNull();   // ei uutta → null (ei fabrikoida alkoi:ta)
  });
  const JF = { konsepti_avain: 'y_h2', konsepti_nimi: 'SYÖTTÄMINEN', alkoi: ALKOI };
  it('tmPaivitaJaksofokus hylkää undefined-arvot (Firestore update kaatuu niihin) — myös sisäkkäiset objektit ja taulukot', () => {
    [{ osa_arviot: undefined }, { osa_arviot: { a: undefined } }, { tavoitteet: [1, undefined] }, { tavoitteet: [{ nimi: undefined }] }, { 'osa_arviot.c': undefined }]
      .forEach((o) => expect(() => K.tmPaivitaJaksofokus(topias(JF), o), JSON.stringify(Object.keys(o))).toThrow(/undefined/));
    expect(K.tmPaivitaJaksofokus(topias(JF), { osa_arviot: { a: null, b: 0, c: '' } }).polut['jaksofokus.osa_arviot']).toEqual({ a: null, b: 0, c: '' });   // null/0/'' ovat kelvollisia
  });
  it('tmPaivitaJaksofokus hylkää __proto__ / constructor / prototype avaimen jokaisessa dot-polun osassa ja sisäkkäisissä arvoissa; paikallinen kopio ei saastu', () => {
    ['__proto__', 'constructor', 'prototype', 'osa_arviot.__proto__', 'osa_arviot.constructor.x', 'a.prototype.b'].forEach((k) => expect(() => K.tmPaivitaJaksofokus(topias(JF), JSON.parse('{' + JSON.stringify(k) + ':1}')), k).toThrow(/kielletty avain/));
    expect(() => K.tmPaivitaJaksofokus(topias(JF), { osa_arviot: JSON.parse('{"__proto__":{"saastunut":true}}') })).toThrow(/kielletyn avaimen/);
    expect(() => K.tmPaivitaJaksofokus(topias(JF), { x: { y: JSON.parse('{"constructor":{"prototype":{"s":1}}}') } })).toThrow(/kielletyn avaimen/);
    expect({}.saastunut).toBeUndefined(); expect({}.s).toBeUndefined();   // Object.prototype ei saastunut
  });
});

describe('ydin on PURE', () => {
  it('ei Firestore/DOM/verkko-viittauksia (adapterit kirjoittavat) eikä serverTimestamp()', () => {
    const koodi = LIB.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');   // ilman kommentteja
    expect(koodi).not.toMatch(/firebase|firestore|\bdb\b|collection\(|\.set\(|\.update\(|\.add\(|batch|document\.|fetch\(|serverTimestamp|localStorage/);
  });
  it('API: kolme funktiota', () => { expect(Object.keys(K).sort()).toEqual(['tmAsetaJaksofokus', 'tmPaivitaJaksofokus', 'tmSuljeJakso']); });
});
