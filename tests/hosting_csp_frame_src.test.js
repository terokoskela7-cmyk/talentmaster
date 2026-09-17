/**
 * CSP `frame-src` KATTAA JOKAISEN TARJOILTAVAN IFRAMEN.
 *
 * MIKSI: `frame-src` on määritelty firebase.jsonissa, joten `default-src 'self'` EI toimi sille
 * fallbackina — direktiivi korvaa sen kokonaan. Listasta puuttui `'self'`, joten Masterin
 * Pelihavainto-modaalin OMA same-origin-iframe (ADAR-pikakortti) torjuttiin Firebase Hostingissa:
 * modaali aukesi tyhjänä, keskellä rikkoutuneen kehyksen kuvake. Oire on hiljainen — Pages EI
 * sovella firebase.jsonin headereita, joten github.io-testi näyttää vihreää ja vika tulee esiin
 * vasta live-hostissa (web.app / talentmasterid.com).
 *
 * Portti johtaa kohdejoukon DATASTA: tarjoiltavat juuren HTML:t (juuri − hosting.ignore), niistä
 * jokainen iframe-lähde (staattinen `<iframe src>` + dynaaminen `el.src =`, myös yhden muuttujan
 * läpi). Uusi iframe tuo itsensä vartioinnin piiriin automaattisesti.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const HOSTING = JSON.parse(lue('firebase.json')).hosting;

const CSP = HOSTING.headers
  .flatMap((h) => h.headers)
  .find((h) => h.key === 'Content-Security-Policy').value;

const direktiivi = (nimi) => {
  const osa = CSP.split(';').map((s) => s.trim()).find((s) => s === nimi || s.startsWith(nimi + ' '));
  return osa ? osa.slice(nimi.length).trim().split(/\s+/).filter(Boolean) : null;
};
const FRAME_SRC = direktiivi('frame-src');

/* Tarjoiltavat juuren HTML:t = juuren .html − hosting.ignore (sama periaate kuin
   hosting_served_suljettu: ignore-lista on totuus siitä mitä Hosting julkaisee). */
const IGNORE = new Set(HOSTING.ignore.filter((g) => g.endsWith('.html')));
const TARJOILLAAN = readdirSync(juuri).filter((f) => f.endsWith('.html') && !IGNORE.has(f));

/**
 * Iframe-lähteet yhdestä tiedostosta.
 *  1) staattinen  <iframe ... src="…">
 *  2) dynaaminen  var ifr = document.createElement('iframe'); ifr.src = '…' | ifr.src = muuttuja
 *     (muuttuja ratkaistaan yhden tason syvyydeltä: var muuttuja = '…')
 */
function iframeLahteet(sisalto) {
  const ulos = [];
  for (const m of sisalto.matchAll(/<iframe\b[^>]*?\ssrc\s*=\s*["'`]([^"'`]+)["'`]/gi)) ulos.push(m[1]);

  const elementit = [...sisalto.matchAll(/\b(?:var|let|const)\s+(\w+)\s*=\s*document\.createElement\(\s*['"`]iframe['"`]/g)]
    .map((m) => m[1]);
  for (const el of elementit) {
    for (const m of sisalto.matchAll(new RegExp('\\b' + el + '\\.src\\s*=\\s*([^;]+);', 'g'))) {
      const oikea = m[1].trim();
      const literaali = oikea.match(/^["'`]([^"'`]+)["'`]/);
      if (literaali) { ulos.push(literaali[1]); continue; }
      const nimi = oikea.match(/^(\w+)$/);
      if (!nimi) continue;
      const maar = sisalto.match(new RegExp('\\b(?:var|let|const)\\s+' + nimi[1] + '\\s*=\\s*["\'`]([^"\'`]+)'));
      if (maar) ulos.push(maar[1]);
    }
  }
  return ulos;
}

/* Sama origin = suhteellinen polku (ei skeemaa, ei protokollatonta //-alkua). */
const sameOrigin = (src) => !/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(src) && !/^(?:data|blob|about|javascript):/i.test(src);

const sallittu = (origin) =>
  FRAME_SRC.some((s) => s === origin || (s.startsWith('https://*.') && origin.endsWith(s.slice('https://*.'.length))));

describe('CSP frame-src (firebase.json)', () => {
  it('frame-src on ylipäätään määritelty → default-src ei toimi sille fallbackina', () => {
    expect(FRAME_SRC).not.toBeNull();
    expect(direktiivi('default-src')).toEqual(["'self'"]);
  });

  it("sisältää 'self' — muuten tarjoiltavan sivun oma same-origin-iframe torjutaan", () => {
    expect(FRAME_SRC).toContain("'self'");
  });

  it('sallii yhä Firebase Authin ja App Check / reCAPTCHAn kehykset (regressio)', () => {
    expect(FRAME_SRC).toContain('https://*.firebaseapp.com');
    expect(FRAME_SRC).toContain('https://www.google.com');
  });

  it('ei löysää muita direktiivejä', () => {
    expect(direktiivi('object-src')).toEqual(["'none'"]);
    expect(direktiivi('base-uri')).toEqual(["'self'"]);
  });

  it('jokainen tarjoiltavan sivun same-origin-iframe on sallittu', () => {
    const loydetyt = [];
    for (const tiedosto of TARJOILLAAN) {
      for (const src of iframeLahteet(lue(tiedosto))) {
        if (sameOrigin(src)) loydetyt.push(`${tiedosto} → ${src}`);
      }
    }
    // Ei-tyhjyys: Masterin Pelihavainto-iframe on juuri se tapaus jonka tämä portti vartioi.
    expect(loydetyt.some((r) => r.includes('TalentMaster_ADAR_Pikakortti.html'))).toBe(true);
    if (loydetyt.length) expect(FRAME_SRC).toContain("'self'");
  });

  /**
   * Ulkoiset kehykset: uusi ulkopuolinen upotus EI saa livahtaa läpi hiljaisena 404:na
   * live-hostissa. Tunnetut kattamattomat ovat tässä nimettyinä — punainen testi pakottaa
   * tietoisen päätöksen (lisätäänkö origin frame-srciin) uuden upotuksen yhteydessä.
   *
   * KNOWN GAP: www.youtube.com — tm_videopankki_admin.html + TM_LiikehallintaMatrix_v2.html
   * upottavat YouTube-soittimen, eikä origin ole frame-srcissä → soitin ei lataudu live-hostissa.
   * Kumpaankaan appiin ei linkitä yksikään tarjoiltava sivu (suora URL), joten ei pilotin polulla.
   */
  it('ulkoiset iframe-originit: vain nimetyt tunnetut puuttuvat frame-srcistä', () => {
    const TUNNETUT_PUUTTUVAT = ['https://www.youtube.com'];
    const puuttuvat = new Set();
    for (const tiedosto of TARJOILLAAN) {
      for (const src of iframeLahteet(lue(tiedosto))) {
        if (sameOrigin(src)) continue;
        const origin = new URL(src.replace(/^\/\//, 'https://')).origin;
        if (!sallittu(origin)) puuttuvat.add(origin);
      }
    }
    expect([...puuttuvat].sort()).toEqual(TUNNETUT_PUUTTUVAT);
  });
});
