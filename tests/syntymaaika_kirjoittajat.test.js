/**
 * VARTIJA: `syntymaaika`-kentän kirjoittajat muodostavat arvon Date.UTC(y, m-1, d):llä (CLAUDE.md §7 #11) — UTC-keskiyö.
 * Syntymäaika on KALENTERIPÄIVÄ, ei hetki: nykykäytäntö 111/111 Timestampia = tasan UTC-keskiyö (diag 2.10.2026).
 * Paikallinen keskiyö (new Date(y, m-1, d)) tai new Date('YYYY-MM-DD…') + paikallinen luku siirtäisi päivää (21/22 UTC edellisenä päivänä).
 *  1) skanneri: jokainen koodikohta, joka kirjoittaa syntymaaika-kentän, käyttää Date.UTC:tä (tai on rekisteröity kirjoittaja,
 *     jonka lähdefunktio käyttää Date.UTC:tä); new Date(string/…) / paikallinen keskiyö / Timestamp.fromDate(new Date(…)) / now() → FAIL
 *  2) negatiivitesti: skanneri tunnistaa väärät muodot
 *  3) yksikkötesti: tallennettava Timestamp on UTC-keskiyö (h=m=s=ms=0), myös TZ=Europe/Helsinki-prosessissa
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const lue = (p) => readFileSync(join(juuri, p), 'utf8');

/* Kirjoitus = sijoitus `….syntymaaika = …` tai olioavain `syntymaaika: …`, jonka ARVO rakentaa päivän/aikaleiman. */
const KIRJOITUS = /(\.syntymaaika\s*=(?!=)|\bsyntymaaika\s*:)\s*(.*)$/;
const RAKENTAA = /new Date\(|Timestamp\.(fromDate|fromMillis|now)\(|Date\.UTC\(|Date\.now\(|serverTimestamp/;
function luokittele(rivi) {
  if (/^\s*(\/\/|\*|\/\*)/.test(rivi)) return null;
  const m = KIRJOITUS.exec(rivi.replace(/\/\/.*$/, ''));
  if (!m) return null;
  const arvo = m[2];
  if (!RAKENTAA.test(arvo)) return null;                       // pelkkä viittaus (lukija/argumentti), ei kirjoitus
  if (/Date\.UTC\(/.test(arvo)) return /new Date\(/.test(arvo.replace(/new Date\(Date\.UTC\(/g, '')) ? 'VAARA' : 'OK';
  return 'VAARA';                                              // rakentaa päivän ilman Date.UTC:tä
}
/* Rekisteröidyt poikkeukset: arvo tulee apufunktiosta, jonka lähde varmennetaan erikseen (UTC-keskiyö). */
const REKISTEROIDYT = [
  { tiedosto: 'functions/index.js', rivi: 'paivitys.syntymaaika = admin.firestore.Timestamp.fromDate(tt.syntymaPaiva);', lahde: 'functions/suostumus_tarkistus.js', funktio: 'function lomakePaiva(' },
];

const KOHTEET = [
  ...readdirSync(juuri).filter((f) => /\.(html|js)$/.test(f) && !/^(eslint|vitest)\.config\.js$/.test(f)),
  ...readdirSync(join(juuri, 'lib')).filter((f) => f.endsWith('.js')).map((f) => 'lib/' + f),
  ...readdirSync(join(juuri, 'functions')).filter((f) => f.endsWith('.js')).map((f) => 'functions/' + f),
];

describe('syntymaaika-kirjoittajien skanneri', () => {
  const osumat = [];
  for (const f of KOHTEET) lue(f).split('\n').forEach((r, i) => { const k = luokittele(r); if (k) osumat.push({ f, n: i + 1, k, r: r.trim() }); });
  it('EI VACUOUS: löytää tunnetut kirjoittajat (Seura-lomake, vahvistaSuostumus, IDP-demo)', () => {
    expect(osumat.some((o) => o.f === 'TalentMaster_Seura.html' && /Date\.UTC/.test(o.r))).toBe(true);
    expect(osumat.some((o) => o.f === 'functions/index.js' && /syntymaPaiva/.test(o.r))).toBe(true);
    expect(KOHTEET.length).toBeGreaterThan(60);
  });
  it('jokainen kirjoittaja käyttää Date.UTC:tä tai on rekisteröity (arvo → apufunktio joka käyttää Date.UTC:tä)', () => {
    const luvattomat = osumat.filter((o) => o.k !== 'OK' && !REKISTEROIDYT.some((r) => r.tiedosto === o.f && o.r.includes(r.rivi)));
    expect(luvattomat.map((o) => o.f + ':' + o.n + '  ' + o.r.slice(0, 120)), 'syntymaaika = new Date(Date.UTC(y, m-1, d)) — EI new Date(string) eikä paikallinen keskiyö').toEqual([]);
  });
  it('rekisteröidyt kirjoittajat ovat olemassa (lista ei vanhene) ja niiden lähdefunktio käyttää Date.UTC:tä eikä new Date(string/paikallinen)', () => {
    for (const r of REKISTEROIDYT) {
      expect(lue(r.tiedosto)).toContain(r.rivi);
      const s = lue(r.lahde); const i = s.indexOf(r.funktio); expect(i, r.funktio).toBeGreaterThan(-1);
      const runko = s.slice(i, s.indexOf('\n}\n', i));
      expect(runko).toMatch(/new Date\(Date\.UTC\(/);
      expect(runko.replace(/new Date\(Date\.UTC\(/g, '')).not.toMatch(/new Date\(/);
    }
  });
  it('negatiivitesti: väärät muodot tunnistetaan', () => {
    const vaarat = [
      "paivitys.syntymaaika = new Date('2013-05-02');", 'paivitys.syntymaaika = new Date(y, m - 1, d);', 'paivitys.syntymaaika = new Date(str);',
      "syntymaaika: new Date(`${y}-${m}-${d}`),", 'paivitys.syntymaaika = firebase.firestore.Timestamp.fromDate(new Date(y, m-1, d));',
      'paivitys.syntymaaika = admin.firestore.Timestamp.now();', 'paivitys.syntymaaika = new Date(Date.UTC(y, m-1, d), 5) || new Date(str);',
    ];
    for (const v of vaarat) expect(luokittele(v), v).toBe('VAARA');
  });
  it('positiivitesti: oikeat muodot ja pelkät viittaukset eivät laukaise', () => {
    expect(luokittele('paivitys.syntymaaika  = new Date(Date.UTC(y, m-1, d));')).toBe('OK');
    expect(luokittele('syntymaaika:{seconds:Date.UTC(2010,3,15)/1000},pituus_cm:168,')).toBe('OK');
    expect(luokittele('var k1bArg = { syntymaaika: p.syntymaaika, bioDocs: bio[p.id] };')).toBeNull();
    expect(luokittele('  // paivitys.syntymaaika = new Date(str);')).toBeNull();
    expect(luokittele('const syntVuosi = p.syntymaaika ? new Date(p.syntymaaika.seconds*1000).getFullYear() : 0;')).toBeNull();
  });
});

describe('tallennettava syntymäaika-Timestamp on UTC-keskiyö (h=m=s=ms=0)', () => {
  const ajaTz = (koodi, tz) => execFileSync(process.execPath, ['-e', koodi], { env: { ...process.env, TZ: tz }, encoding: 'utf8' }).trim();
  const keskiyo = (d) => d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
  it('functions: lomakePaiva(YYYY-MM-DD).date = UTC-keskiyö; päivä säilyy (UTC-päivä = syötetty)', () => {
    const { lomakePaiva } = require('../functions/suostumus_tarkistus.js');
    for (const s of ['2013-05-02', '2010-01-01', '2012-12-31', '2011-03-29', '2011-10-25']) {
      const r = lomakePaiva(s); expect(r, s).not.toBeNull();
      expect(keskiyo(r.date), s).toBe(true);
      expect(r.iso).toBe(s);
    }
    expect(lomakePaiva('2013-02-31')).toBeNull();   // virheellinen päivä hylätään
  });
  it('Seura-lomake: oikea koodilohko tuottaa UTC-keskiyön myös TZ=Europe/Helsinki ja America/New_York', () => {
    const S = lue('TalentMaster_Seura.html');
    const i = S.indexOf('const [y, m, d] = syntymaaika_str.split'); expect(i).toBeGreaterThan(-1);
    const alku = S.lastIndexOf('if (syntymaaika_str) {', i);
    const lohko = S.slice(alku, S.indexOf('}', S.indexOf('paivitys.syntymaVuosi', i)) + 1);
    for (const tz of ['Europe/Helsinki', 'America/New_York', 'UTC']) {
      for (const syote of ['2013-05-02', '2011-03-29', '2011-10-25']) {
        const koodi = `const paivitys={};const syntymaaika_str=${JSON.stringify(syote)};${lohko};const d=paivitys.syntymaaika;
          console.log([d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds(),d.getUTCMilliseconds(),d.toISOString().slice(0,10),paivitys.syntymaVuosi].join(','))`;
        expect(ajaTz(koodi, tz), tz + ' ' + syote).toBe(`0,0,0,0,${syote},${Number(syote.slice(0, 4))}`);
      }
    }
  });
  it('vertailu (EI VACUOUS): paikallinen keskiyö EI olisi UTC-keskiyö Helsingissä', () => {
    expect(ajaTz("const d=new Date(2013,4,2);console.log([d.getUTCHours(),d.toISOString().slice(0,10)].join(','))", 'Europe/Helsinki')).toBe('21,2013-05-01');
  });
});
