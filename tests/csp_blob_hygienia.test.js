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
 * blob: SÄILYY `img-src`issä — kuvablobit ovat käytössä eikä niitä olla poistamassa.
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

  it('ADARissa ei ole bundler-koneistoa (blob-sallinnan alkuperäinen syy)', () => {
    const s = lue('TalentMaster_ADAR_Pikakortti.html');
    expect(s).not.toContain('__bundler/');
    expect(s).not.toContain('DecompressionStream');
    expect(s).not.toContain('createObjectURL');
  });
});
