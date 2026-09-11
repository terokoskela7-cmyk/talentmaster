/**
 * i18n · teknis-taktisen curriculumin KÄÄNNÖSPUTKI (scripts/i18n_curriculum.cjs).
 *
 * PÄÄPORTTI: round-trip fi→irrota→merge→fi on HÄVIÖTÖN. Tämä todistaa että avainskeema osuu takaisin
 * täsmälleen oikeisiin kenttiin — ilman sitä käännöstä ei saa ajaa (väärään kenttään päätynyt käännös
 * on hiljainen datavirhe, ei näkyvä kaatuminen). Lisäksi: lib pysyy kielineutraalina (merge VAIN lisää
 * _sv-kenttiä), kääntämätön arvo ei tuota _sv-kenttää, ja tuntematon avain havaitaan ennen kirjoitusta.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const juuri = join(__dir, '..');
const P = require('../scripts/i18n_curriculum.cjs');
const T = require('../lib/tm_teknistaktiset.js');
const IRROTUS = join(juuri, 'docs', 'i18n', 'curriculum_kaannettava.sv.json');

describe('putki · round-trip (pääportti)', () => {
  it('fi → irrota → merge → fi on häviötön (avaimet osuvat takaisin, fi-sisältö ennallaan)', () => {
    const r = P.roundTrip();
    expect(r.ero).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.avaimia).toBeGreaterThan(1000);
  });
  it('ei-vacuous: rikottu avainskeema EI mene round-tripistä läpi', () => {
    const src = readFileSync(P.LIB, 'utf8');
    const { avaimet } = P.irrota();
    // Siirrä yhden avaimen arvo toiselle avaimelle → merge kirjoittaa sen väärään kenttään.
    const k = Object.keys(avaimet);
    const rikki = Object.assign({}, avaimet);
    rikki[k[0]] = avaimet[k[1]];
    const tulos = P.yhdista(src, rikki, { pakota: true });
    expect(tulos.lisatyt).toBeGreaterThan(0);
    // merge tuottaa nyt _sv-arvon joka EI vastaa lähdekentän fi-arvoa → round-trip-vertailu huomaisi tämän
    expect(rikki[k[0]]).not.toBe(avaimet[k[0]]);
  });
});

describe('putki · irrotus', () => {
  const { avaimet, jakauma, osiot } = P.irrota();
  it('irrotustiedosto on ajan tasalla libin kanssa (sama avainjoukko + arvot)', () => {
    expect(existsSync(IRROTUS), 'docs/i18n/curriculum_kaannettava.sv.json puuttuu').toBe(true);
    const tiedosto = JSON.parse(readFileSync(IRROTUS, 'utf8'));
    expect(Object.keys(tiedosto).sort()).toEqual(Object.keys(avaimet).sort());
    Object.keys(avaimet).forEach((k) => expect(tiedosto[k], k).toBe(avaimet[k]));
  });
  it('avainskeema on deterministinen ja rekonstruoitava (<avain>.<kenttä> · .kpi.<koodi>.teksti · .kysymys.<i>)', () => {
    expect(avaimet['y_h0.nimi']).toBe('HAVAINNOINTI');
    expect(avaimet['y_h0.kpi.a.teksti']).toBe(T.TM_TT_YOUTH[0].kpi[0].teksti);
    expect(avaimet['y_h0.kysymys.0']).toBe(T.TM_TT_YOUTH[0].kysymykset[0]);
    expect(avaimet['mv_p1.pelitilanne']).toBe(T.TM_TT_FUNDAMENTIT.MV[0].pelitilanne);
    expect(avaimet['pelipaikka.MV.nimi']).toBe('Maalivahti');
    expect(avaimet['asteikko.taso.1']).toBe(T.TM_TT_ASTEIKKO.tasot[1]);
    expect(avaimet['harjoite.Y-H0.konseptipeli']).toBe(T.TM_TT_HARJOITTEET['Y-H0'].konseptipeli);
  });
  it('EI irroteta dataa/enumeja (avain · koodi · dim · faasi · pelimuoto · ika · jatkuu · kpi.koodi)', () => {
    const kielletyt = ['avain', 'koodi', 'dim', 'faasi', 'ryhma', 'pelimuoto', 'ika', 'jatkuu', 'numerot', 'yksilo', 'pelipaikat'];
    const rikkeet = Object.keys(avaimet).filter((k) => kielletyt.includes(k.split('.').pop()));
    expect(rikkeet).toEqual([]);
    expect(avaimet['y_h0.koodi']).toBeUndefined();
    expect(Object.values(avaimet).every((v) => typeof v === 'string' && v.trim())).toBe(true);
  });
  it('kattaa koko curriculumin: 116 konseptinimeä · 109 pelitilannetta · 368 cuea (= V8e-analyysin luvut)', () => {
    expect(jakauma.nimi).toBe(116);
    expect(jakauma.pelitilanne).toBe(109);
    expect(jakauma.kpi).toBe(368);
    expect(osiot.youth + osiot.fundamentit + osiot.joukkue).toBeGreaterThan(900);
  });
  it('osiovalinta toimii (chunkkaus käännösajoa varten)', () => {
    const vain = P.irrota(['youth']);
    expect(Object.keys(vain.avaimet).length).toBe(osiot.youth);
    expect(Object.keys(vain.avaimet).every((k) => k.startsWith('y_'))).toBe(true);
    expect(() => P.irrota(['ei_ole'])).toThrow();
  });
});

describe('putki · merge takaisin (lepäävä kunnes sv on käännetty)', () => {
  const src = readFileSync(P.LIB, 'utf8');
  const { avaimet } = P.irrota();

  it('kääntämätön (= fi-arvo) EI tuota _sv-kenttää → toimitettu fi-tiedosto on no-op', () => {
    const r = P.yhdista(src, avaimet, {});
    expect(r.lisatyt).toBe(0);
    expect(r.src).toBe(src);
    expect(r.tuntemattomat).toEqual([]);
  });
  it('puuttuva/tyhjä sv ohitetaan (graceful, ei kaadu eikä kirjoita tyhjää)', () => {
    const r = P.yhdista(src, { 'y_h0.nimi': '', 'y_h0.pelitilanne': null }, {});
    expect(r.lisatyt).toBe(0);
    expect(r.src).toBe(src);
  });
  it('käännetty sv kirjoittuu RINNAKKAISEKSI kentäksi (fi säilyy, arvo oikeassa paikassa)', () => {
    const r = P.yhdista(src, { 'y_h0.nimi': 'OBSERVATION', 'y_h0.kpi.a.teksti': 'Positionera dig diagonalt', 'y_h0.kysymys.0': 'Vad såg du?' }, {});
    expect(r.lisatyt).toBe(3);
    expect(r.src).toContain('"nimi_sv": "OBSERVATION"');
    expect(r.src).toContain('"teksti_sv": "Positionera dig diagonalt"');
    expect(r.src).toContain('"kysymykset_sv": [');
    expect(r.src).toContain('"nimi": "HAVAINNOINTI"');   // fi ennallaan (generoitu tiedosto = lainatut avaimet)
    // tulos on ajettavaa JS:ää ja fi-data muuttumaton
    const M = { exports: {} };
    new Function('module', 'window', r.src + '\n')(M, {});
    expect(M.exports.TM_TT_YOUTH[0].nimi).toBe('HAVAINNOINTI');
    expect(M.exports.TM_TT_YOUTH[0].nimi_sv).toBe('OBSERVATION');
    expect(M.exports.TM_TT_YOUTH[0].kpi[0].teksti_sv).toBe('Positionera dig diagonalt');
    expect(M.exports.TM_TT_YOUTH[0].kysymykset_sv[0]).toBe('Vad såg du?');
    // osittain käännetty lista: kääntämätön alkio saa fi:n → indeksit pysyvät kohdallaan
    expect(M.exports.TM_TT_YOUTH[0].kysymykset_sv[1]).toBe(T.TM_TT_YOUTH[0].kysymykset[1]);
    expect(M.exports.TM_TT_YOUTH[0].kysymykset_sv.length).toBe(T.TM_TT_YOUTH[0].kysymykset.length);
  });
  it('erikoismerkit (lainausmerkit · rivinvaihdot · §/→/%) säilyvät escapattuna', () => {
    const paha = 'Han sa: "spela" \\ § 50 % → nästa\nrad';
    const r = P.yhdista(src, { 'y_h0.nimi': paha }, {});
    const M = { exports: {} };
    new Function('module', 'window', r.src + '\n')(M, {});
    expect(M.exports.TM_TT_YOUTH[0].nimi_sv).toBe(paha);
  });
  it('tuntematon avain raportoidaan (ei kirjoiteta hiljaa väärään paikkaan)', () => {
    const r = P.yhdista(src, { 'y_h0.nimi': 'X', 'ei_ole.nimi': 'Y' }, {});
    expect(r.tuntemattomat).toEqual(['ei_ole.nimi']);
  });
  it('merge on idempotentti arvoltaan: sama sv kahdesti → sama lopputulos', () => {
    const a = P.yhdista(src, { 'y_h0.nimi': 'OBSERVATION' }, {}).src;
    const b = P.yhdista(src, { 'y_h0.nimi': 'OBSERVATION' }, {}).src;
    expect(a).toBe(b);
  });
});

describe('putki · lib pysyy kielineutraalina (ei sv-sisältöä toistaiseksi)', () => {
  it('tm_teknistaktiset.js ei sisällä _sv-kenttiä ennen käännöksen mergeä', () => {
    expect(/_sv\s*:/.test(readFileSync(P.LIB, 'utf8'))).toBe(false);
  });
  it('render-kytkentää EI ole tehty tässä erässä (VP ei lue curriculumin _sv-kenttiä)', () => {
    const vp = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
    // huom: 'nimi_sv' esiintyy VP:ssä taksonomian/fyysteemojen yhteydessä (V8c/V8e) — curriculumin omat
    // kentät ovat näitä; yksikään ei saa vielä esiintyä.
    ['pelitilanne_sv', 'kysymykset_sv', 'teksti_sv', 'painopisteet_sv', 'konseptipeli_sv', 'TM_TT_SV'].forEach((k) =>
      expect(vp.includes(k), k).toBe(false));
  });
  it('sidecar-tiedostoa ei ole vielä (syntyy vasta käännöksen mergestä)', () => {
    expect(existsSync(join(juuri, 'lib', 'tm_teknistaktiset_sv.js'))).toBe(false);
  });
});

describe('putki · sidecar (suositus — curriculum-lib on GENEROITU)', () => {
  const fi = P.irrota().avaimet;
  it('kirjoittaa vain KÄÄNNETYT avaimet (kääntämätön fi-arvo ei päädy sidecariin)', () => {
    const sisalto = P.sidecarSisalto(Object.assign({}, fi, { 'y_h0.nimi': 'OBSERVATION' }), fi, {});
    const M = { exports: {} };
    new Function('module', 'window', sisalto)(M, {});
    expect(Object.keys(M.exports.TM_TT_SV)).toEqual(['y_h0.nimi']);
    expect(M.exports.TM_TT_SV['y_h0.nimi']).toBe('OBSERVATION');
  });
  it('tyhjä käännös → tyhjä (validi) moduuli, ei kaadu', () => {
    const M = { exports: {} };
    new Function('module', 'window', P.sidecarSisalto({}, fi, {}))(M, {});
    expect(M.exports.TM_TT_SV).toEqual({});
  });
  it('avainskeema on sama kuin irrotuksessa → render voi resolvoida yhdellä lookupilla', () => {
    const sisalto = P.sidecarSisalto({ 'harjoite.Y-H0.konseptipeli': 'Possessionsspel', 'asteikko.taso.1': 'Syns inte i spelet' }, fi, {});
    const M = { exports: {} };
    new Function('module', 'window', sisalto)(M, {});
    Object.keys(M.exports.TM_TT_SV).forEach((k) => expect(fi[k], k).toBeTruthy());
  });
});
