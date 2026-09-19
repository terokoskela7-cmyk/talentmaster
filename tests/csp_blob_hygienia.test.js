/**
 * CSP · blob: VAIN SIELLÄ MISSÄ SITÄ TARVITAAN.
 *
 * TAUSTA: `blob:` lisättiin `script-src`iin ja `font-src`iin #544:ssä ADARin selainbundlea varten —
 * se purki SDK:t ja fontit ajonaikaisesti blob-URL:eiksi. ADAR de-bundlattiin #551:ssä, joten
 * blob-skripti/-fonttikoneistoa ei enää ole missään. Jäljelle jäänyt sallinta oli pelkkää
 * hyökkäyspintaa: blob-URL-injektio olisi ohittanut `'self'`-rajan.
 *
 * Portilla on KAKSI puolta, ja ne on pidettävä yhdessä:
 *   1. CSP ei salli blob-skriptiä/-fonttia
 *   2. yksikään tarjoiltava appi ei YRITÄ ladata sellaista
 * Jos vain CSP:tä valvottaisiin, joku voisi lisätä blob-skriptin joka hajoaa vasta live-hostissa
 * (Pages ei palauta CSP:tä → paikallisesti ja Pagesissa se näyttäisi toimivan). Jos vain koodia
 * valvottaisiin, CSP voisi löystyä huomaamatta. Yhdessä ne pakottavat tietoisen päätöksen
 * molempiin paikkoihin yhtä aikaa.
 *
 * blob: SÄILYY `img-src`issä (kuvablobit) JA `media-src`issä (äänireflektio).
 *
 * MEDIA oli oma löydöksensä: `<audio>` ei kulje `img-src`in läpi vaan `media-src`in, jota EI OLLUT
 * CSP:ssä lainkaan → se putosi `default-src 'self'`:iin ja valmentajan äänireflektio oli rikki
 * Hosting-cutoverista asti. Rikki oli KOKO ketju, ei vain esikuuntelu: nauhoituksen blob-preview
 * JA myöhempi toisto Firebase Storagen download-URL:sta. Todennettu livenä ennen korjausta —
 * blob, firebasestorage.googleapis.com ja …firebasestorage.app kaikki estettyinä, oma origin ei.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { tarjoiltavatAppit } = require('../scripts/tarjoiltavat_appit.js');

const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const CSP = JSON.parse(lue('firebase.json')).hosting.headers
  .flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy').value;

const direktiivi = (nimi) => {
  const osa = CSP.split(';').map((s) => s.trim()).find((s) => s === nimi || s.startsWith(nimi + ' '));
  return osa ? osa.slice(nimi.length).trim().split(/\s+/).filter(Boolean) : null;
};

/* Blob-skriptin/-fontin lataustavat. Latausblobit (`a.href = …` + `download`) EIVÄT ole näitä:
   ne eivät kulje script-src/font-srcin läpi, ja ne ovat edelleen sallittuja. */
const BLOB_SKRIPTI_TAI_FONTTI = [
  /new\s+Worker\s*\(/,
  /importScripts\s*\(/,
  /<script[^>]*\bsrc\s*=\s*["']?blob:/i,
  /@font-face[^}]*url\(\s*["']?blob:/i,
  /new\s+FontFace\s*\([^)]*blob/i,
  /\.src\s*=\s*[^;\n]*createObjectURL/,          // script.src = URL.createObjectURL(...)
];

describe('CSP · blob-sallinta on rajattu', () => {
  it('script-src EI salli blob:ia', () => {
    expect(direktiivi('script-src')).not.toContain('blob:');
  });

  it('font-src EI salli blob:ia', () => {
    expect(direktiivi('font-src')).not.toContain('blob:');
  });

  it('img-src SALLII blob:in (kuvablobit ovat käytössä)', () => {
    expect(direktiivi('img-src')).toContain('blob:');
  });

  it('media-src SALLII blob:in ja Firebase Storagen (äänireflektio)', () => {
    const m = direktiivi('media-src');
    expect(m, 'media-src puuttuu → <audio> putoaa default-srciin ja estyy').not.toBeNull();
    expect(m).toContain("'self'");
    expect(m).toContain('blob:');                                   // nauhoituksen esikuuntelu
    expect(m).toContain('https://firebasestorage.googleapis.com');  // tallennetun toisto
  });

  it('EI VACUOUS: direktiivit on oikeasti määritelty eikä muu policy löystynyt', () => {
    expect(direktiivi('script-src')).toContain("'self'");
    expect(direktiivi('font-src')).toContain("'self'");
    expect(direktiivi('object-src')).toEqual(["'none'"]);
    expect(direktiivi('base-uri')).toEqual(["'self'"]);
  });
});

describe('CSP · tarjoiltavat apit eivät lataa blobia skriptinä tai fonttina', () => {
  const appit = tarjoiltavatAppit(juuri);

  it('EI VACUOUS: kohdejoukko on tarjoiltava joukko', () => {
    expect(appit.length).toBeGreaterThan(20);
    expect(appit).toContain('TalentMaster_Master_v16.html');
    expect(appit).toContain('TalentMaster_ADAR_Pikakortti.html');
  });

  it('yksikään appi ei lataa blobia skriptinä/fonttina/workerina', () => {
    const vuodot = [];
    for (const appi of appit) {
      const s = lue(appi);
      for (const kuvio of BLOB_SKRIPTI_TAI_FONTTI) {
        if (kuvio.test(s)) vuodot.push(`${appi}: ${kuvio}`);
      }
    }
    expect(
      vuodot,
      'blob-skripti/-fontti vaatisi CSP-sallinnan takaisin (ja hajoaisi VAIN live-hostissa):\n'
        + vuodot.join('\n'),
    ).toEqual([]);
  });

  it('media-elementtejä käyttävän apin lähteet ovat media-srcissä', () => {
    /* Kaksipuolisuus myös medialle: jos appi soittaa ääntä, CSP:n on katettava se — muuten
       ominaisuus on rikki VAIN live-hostilla (Pages ei palauta CSP:tä). Juuri niin kävi. */
    const mediaApit = appit.filter((a) => /<audio|<video|new Audio\(/.test(lue(a)));
    expect(mediaApit, 'EI VACUOUS: media-appeja pitää olla').toContain('TalentMaster_Master_v16.html');
    const m = direktiivi('media-src');
    for (const appi of mediaApit) {
      const s2 = lue(appi);
      if (/createObjectURL/.test(s2)) expect(m, `${appi}: blob-media ilman sallintaa`).toContain('blob:');
      if (/getDownloadURL/.test(s2)) {
        expect(m.some((x) => /firebasestorage/.test(x)), `${appi}: Storage-media ilman sallintaa`).toBe(true);
      }
    }
  });

  it('ADARissa ei ole bundler-koneistoa (blob-sallinnan alkuperäinen syy)', () => {
    const s = lue('TalentMaster_ADAR_Pikakortti.html');
    expect(s).not.toContain('__bundler/');
    expect(s).not.toContain('DecompressionStream');
    expect(s).not.toContain('createObjectURL');
  });
});
