/**
 * BUNDLATUN APIN RESURSSIT LATAUTUVAT CSP:N LÄPI (blob:).
 *
 * MIKSI: ADAR-pikakortti on bundler-appi (§15) — fontit ja Firebase-SDK ovat inline base64/gzip,
 * ja lataaja purkaa ne ajonaikaisesti `URL.createObjectURL()`:lla ja kirjoittaa ne dokumenttiin
 * `blob:`-URL:eina. `script-src`/`font-src` eivät sisältäneet `blob:`:ia → Firebase-SDK:n neljä
 * skriptiä torjuttiin ja ADAR kaatui `ReferenceError: firebase is not defined` heti `_fbInit`issä.
 *
 * Oire oli näkymätön ennen Hosting-cutoveria: GitHub Pages ei palauta CSP:tä lainkaan, joten sama
 * sivu toimii github.io:ssa ja kaatuu live-hostissa. Todennettu kontrollikokeella: Pages
 * `typeof firebase === 'object'` / 0 rikettä · Hosting `'undefined'` / 29 rikettä.
 *
 * Portti johtaa vaatimuksen bundlen OMASTA manifestista: jokainen bundlattu mime-tyyppi kertoo
 * mitä CSP-direktiiviä se tarvitsee. Uusi bundlattu resurssityyppi (esim. text/css) nostaa
 * vaatimuksen automaattisesti — ei kovakoodattua listaa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const HOSTING = JSON.parse(lue('firebase.json')).hosting;
const CSP = HOSTING.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy').value;

const direktiivi = (nimi) => {
  const osa = CSP.split(';').map((s) => s.trim()).find((s) => s === nimi || s.startsWith(nimi + ' '));
  return osa ? osa.slice(nimi.length).trim().split(/\s+/).filter(Boolean) : null;
};

const IGNORE = new Set(HOSTING.ignore.filter((g) => g.endsWith('.html')));
const TARJOILLAAN = readdirSync(juuri).filter((f) => f.endsWith('.html') && !IGNORE.has(f));

/** mime → CSP-direktiivi joka päättää saako resurssin ladata. */
function direktiiviMimelle(mime) {
  const t = String(mime).toLowerCase();
  if (/^(text|application)\/(java|ecma)script/.test(t)) return 'script-src';
  if (t.startsWith('font/') || t === 'application/font-woff2') return 'font-src';
  if (t.startsWith('image/')) return 'img-src';
  if (t === 'text/css') return 'style-src';
  return 'default-src';
}

/** Bundlatut appit + niiden manifestin mime-tyypit (sama rakenne kuin lataaja lukee). */
function bundlatut() {
  const ulos = [];
  for (const tiedosto of TARJOILLAAN) {
    const s = lue(tiedosto);
    if (!s.includes('__bundler/manifest')) continue;
    let manifest = null;
    for (const m of s.matchAll(/<script[^>]*type="__bundler\/manifest"[^>]*>([\s\S]*?)<\/script>/g)) {
      try { manifest = JSON.parse(m[1]); break; } catch { /* template sisältää saman merkkijonon escapattuna */ }
    }
    if (manifest) ulos.push({ tiedosto, mimet: [...new Set(Object.values(manifest).map((e) => e.mime))].sort() });
  }
  return ulos;
}

const BUNDLATUT = bundlatut();

describe('CSP + bundler-appit (blob:)', () => {
  /**
   * TILANNE 2026-09-18: bundlattuja appeja EI ENÄÄ OLE. ADAR — ainoa tällainen — purettiin
   * tavalliseksi apiksi (ulkoiset SDK-tagit + sw_adar.js + Firestoren offline-persistenssi).
   *
   * Porttia EI silti poisteta: se on ehdollinen ja herää itsestään jos joku tuo bundlatun apin
   * takaisin. Silloin `script-src`/`font-src` on jälleen sallittava `blob:` tai appi kaatuu
   * hiljaa vain live-hostissa (Pages ei palauta CSP:tä) — tämä maksoi jo yhden pilottihavainnon.
   */
  it('ei bundlattuja appeja — ADAR purettiin tavalliseksi apiksi', () => {
    expect(BUNDLATUT).toEqual([]);
    const s = lue('TalentMaster_ADAR_Pikakortti.html');
    expect(s).not.toContain('__bundler/');
    /* HUOM: pelkkä `createObjectURL`-merkkijono EI enää ole bundlerin merkki.
       ADAR käyttää sitä kuvan esikatseluun (`<img>`), mikä on CSP:ssä
       nimenomaisesti sallittu (`img-src … blob:`) ja korvasi base64-dataURL:n
       muistipaineen vuoksi. Bundleri tunnistetaan sen omista jäljistä
       (`__bundler/`, `DecompressionStream`) ja blob-skriptin/-fontin kuviot
       tarkistetaan erikseen `tests/csp_blob_hygienia.test.js`:n
       BLOB_SKRIPTI_KUVIOT-listalla — se on se turvaominaisuus, ei merkkijono. */
  });

  it('JOS bundlattu appi palaa, sen jokainen mime-tyyppi sallii blob:n', () => {
    for (const { tiedosto, mimet } of BUNDLATUT) {
      for (const mime of mimet) {
        const d = direktiiviMimelle(mime);
        expect(direktiivi(d), `${tiedosto}: ${mime} → ${d}`).toContain('blob:');
      }
    }
    // Ei-vacuous silloinkin kun bundleja ei ole: mime→direktiivi-kartan on pysyttävä ehjänä.
    expect(direktiiviMimelle('text/javascript')).toBe('script-src');
    expect(direktiiviMimelle('font/woff2')).toBe('font-src');
  });
});
