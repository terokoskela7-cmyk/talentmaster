/**
 * V2 App Check · päätös A — archive/ ei kuulu julkiseen jakeluun.
 *
 * MIKSI PORTTI EIKÄ KERTALUONTEINEN GREP: App Check -enforce on PROJEKTINLAAJUINEN per palvelu.
 * Jos arkistoitu appi on Pagesissa ja koskee Firestoreen ilman App Check -SDK:ta, se rikkoutuu
 * enforcessa. Rajaus on siis turvarajan osa, ei siivousta — ja se pitää kestää tulevat commitit:
 *  (1) deploy-workflow POISTAA archive/:n ennen artifaktin uploadia,
 *  (2) yksikään ELÄVÄ tiedosto ei linkitä arkistoon (muuten rajaus tekisi 404:n käyttäjälle).
 * Ehto (2) on se, jonka rikkoutuminen olisi hiljaista: linkki toimii repossa mutta 404 tuotannossa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const WF = join(juuri, '.github/workflows/deploy-pages.yml');

/* Elävä = mikä tahansa html/js/css juuressa tai lib/:ssä. EI docs/ (proosaa, ei tarjoiltuja linkkejä),
   EI archive/ (sisäiset linkit ovat odotettuja), EI node_modules, EI src/ (kuollut puu, §33 A6). */
function elavatTiedostot() {
  const ohita = new Set(['node_modules', 'archive', 'docs', 'src', '.git', 'tests', 'assets', 'functions', 'scripts']);
  const ulos = [];
  (function kavele(d, syvyys) {
    for (const nimi of readdirSync(d)) {
      if (nimi.startsWith('.') || ohita.has(nimi)) continue;
      const p = join(d, nimi);
      if (statSync(p).isDirectory()) { if (syvyys < 2) kavele(p, syvyys + 1); }
      else if (/\.(html|js|css)$/.test(nimi)) ulos.push(p);
    }
  })(juuri, 0);
  return ulos;
}

function arkistoidutNimet() {
  const ulos = [];
  (function kavele(d) {
    for (const nimi of readdirSync(d)) {
      const p = join(d, nimi);
      if (statSync(p).isDirectory()) kavele(p); else ulos.push(nimi);
    }
  })(join(juuri, 'archive'));
  return [...new Set(ulos)];
}

describe('deploy-pages.yml · archive/ rajattu pois julkaisusta', () => {
  const wf = readFileSync(WF, 'utf8');

  it('workflow poistaa archive/:n', () => {
    expect(wf).toMatch(/rm -rf archive\b/);
  });

  it('poisto tapahtuu ENNEN upload-pages-artifactia (muuten se ei vaikuta mihinkään)', () => {
    const iPoisto = wf.indexOf('rm -rf archive');
    const iUpload = wf.indexOf('upload-pages-artifact');
    expect(iPoisto).toBeGreaterThan(-1);
    expect(iUpload).toBeGreaterThan(-1);
    expect(iPoisto).toBeLessThan(iUpload);
  });

  it('firebase.json pitää saman rajauksen (Pages ja Hosting eivät saa erota)', () => {
    const h = JSON.parse(readFileSync(join(juuri, 'firebase.json'), 'utf8')).hosting;
    expect(h.ignore).toContain('archive/**');
  });
});

describe('archive/ · 0 elävää inbound-linkkiä (rajaus ei saa tuottaa 404:ää)', () => {
  const nimet = arkistoidutNimet();
  const elavat = elavatTiedostot();

  it('arkisto ja elävä joukko löytyivät (EI VACUOUS)', () => {
    expect(nimet.length).toBeGreaterThan(20);
    expect(elavat.length).toBeGreaterThan(20);
  });

  it('yksikään elävä tiedosto ei linkitä arkistoituun tiedostoon eikä archive/-polkuun', () => {
    const vuodot = [];
    for (const f of elavat) {
      const s = readFileSync(f, 'utf8');
      const rel = relative(juuri, f);
      // a) suora archive/-polku linkki-/latauskontekstissa
      const polku = /(?:href|src|action)\s*=\s*["'][^"']*archive\/|(?:import|fetch|window\.open)\s*\(\s*["'`][^"'`]*archive\//g;
      for (const m of s.matchAll(polku)) vuodot.push(`${rel}: ${m[0].trim()}`);
      // b) arkistoitu tiedostonimi navigointikohteena (juuripolkuna → 404 rajauksen jälkeen)
      for (const n of nimet) {
        if (!/\.(html|js)$/.test(n)) continue;
        const re = new RegExp(`(?:href|src)\\s*=\\s*["'][^"']*${n.replace(/\./g, '\\.')}|(?:import|fetch|window\\.open)\\s*\\(\\s*["'\`][^"'\`]*${n.replace(/\./g, '\\.')}`, 'g');
        for (const m of s.matchAll(re)) vuodot.push(`${rel}: ${m[0].trim()}`);
      }
    }
    expect(vuodot, 'elävä linkki arkistoon → 404 tuotannossa').toEqual([]);
  });
});

/* CSP · reCAPTCHA v3 (App Check). Portti tässä tiedostossa koska molemmat ovat saman
   V2-päätöksen osia. Enforce-riski: jos CSP estää reCAPTCHAn, App Check ei saa tokenia →
   enforcen jälkeen KAIKKI kutsut hylätään. Siksi origin-vaatimus lukitaan testiin, ei
   pelkkään deploy-hetken curliin (joka todistaa vain sen hetken). */
describe('firebase.json CSP · reCAPTCHA v3 -originit', () => {
  const h = JSON.parse(readFileSync(join(juuri, 'firebase.json'), 'utf8')).hosting;
  const csp = h.headers
    .flatMap((e) => e.headers)
    .filter((x) => x.key === 'Content-Security-Policy')
    .map((x) => x.value);

  it('CSP-header on olemassa (EI VACUOUS)', () => expect(csp.length).toBe(1));

  const direktiivi = (nimi) =>
    csp[0].split(';').map((d) => d.trim()).find((d) => d.startsWith(nimi + ' ')) || '';

  it("script-src sallii reCAPTCHAn: www.google.com + www.gstatic.com", () => {
    const d = direktiivi('script-src');
    expect(d).toContain('https://www.google.com');
    expect(d).toContain('https://www.gstatic.com');   // gstatic /recaptcha/releases
  });
  it('frame-src sallii reCAPTCHA-challenge-kehyksen', () => {
    expect(direktiivi('frame-src')).toContain('https://www.google.com');
  });
  it('connect-src kattaa App Check -tokenvaihdon (firebaseappcheck.googleapis.com)', () => {
    const d = direktiivi('connect-src');
    expect(d).toMatch(/https:\/\/(\*\.googleapis\.com|firebaseappcheck\.googleapis\.com)/);
  });
  /* Löytyi vasta AJETUSTA staging-todennuksesta: grecaptcha.enterprise tekee oman XHR:n
     www.google.com/recaptcha/enterprise/clr -päätepisteeseen. Token myönnettiin siitä huolimatta,
     mutta kutsu hylättiin CSP:ssä → estetty haaste-/telemetriapolku olisi jäänyt piiloon. */
  it('connect-src sallii reCAPTCHA Enterprisen oman XHR:n (www.google.com)', () => {
    expect(direktiivi('connect-src')).toContain('https://www.google.com');
  });
  /* Sama ajo paljasti ENNESTÄÄN OLEVAN aukon: VP_v25 lataa tabler-icons-tyylin jsdelivristä,
     joka oli script-src:ssä mutta ei style-src:ssä → ikonifontti ei latautunut stagingissa. */
  it('style-src JA font-src kattavat jsdelivrin (tabler-icons + sen woff2/ttf)', () => {
    // Kaskadi: style-src:n avaaminen paljasti että myös fonttitiedostot estyivät (font-src).
    expect(direktiivi('style-src')).toContain('https://cdn.jsdelivr.net');
    expect(direktiivi('font-src')).toContain('https://cdn.jsdelivr.net');
  });
});
