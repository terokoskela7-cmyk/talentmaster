/**
 * FIREBASE-GLOBAALIA KÄYTTÄVÄ TARJOILTAVA APPI TARJOAA MYÖS SDK:N.
 *
 * MIKSI: appi joka kutsuu `firebase.*`:ia mutta ei tarjoa SDK:ta kaatuu heti ensimmäiseen
 * viittaukseen (`ReferenceError: firebase is not defined`) — hiljainen, koko sivun tappava vika
 * joka näkyy vasta ajettaessa. Tämä portti vaatii että jokainen käytetty palvelu on myös
 * saatavilla.
 *
 * KAKSI LAILLISTA TAPAA tarjota SDK — portti hyväksyy molemmat:
 *   1. ulkoinen <script src=".../firebase-<palvelu>-compat.js">  (Master, VP, Pelaaja, …)
 *   2. bundlattu manifestiin (ADAR-pikakortti, §15 offline-ensin: SDK inline base64/gzip)
 * ADAR EI siis tarvitse ulkoisia SDK-tageja — sen neljä compat-SDK:ta ovat bundlessa. Tämän
 * sekoittaminen johti väärään diagnoosiin kerran jo: `grep '<script src='` ei näe bundlattua
 * appia, koska sen tagit ovat JSON-enkoodatussa templatessa muodossa src=\"…\".
 *
 * Kohdejoukko datasta: juuren .html − hosting.ignore, ja niistä vain KOKONAISET DOKUMENTIT
 * (doctype/<html>). Fragmentit (Seura.html:ään liitettäväksi tarkoitetut pätkät) eivät ole
 * appeja eivätkä alusta omaa firebaseaan.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
/* Yksi johtamispiste (git ls-files − hosting.ignore): versionhallitsemattomat scratch-tiedostot
   eivät vuoda kohdejoukkoon, kuten readdirSync-pohjaisessa johtamisessa tapahtui. */
const { tarjoiltavatAppit } = createRequire(import.meta.url)('../scripts/tarjoiltavat_appit.js');
const TARJOILLAAN = tarjoiltavatAppit(juuri);

/** firebase.<api>() → SDK-paketin nimi jonka on oltava ladattuna. */
const PALVELU_SDK = {
  firestore: 'firestore',
  auth: 'auth',
  functions: 'functions',
  storage: 'storage',
  appCheck: 'app-check',
};

const kokonainenDokumentti = (s) => /<html|<!doctype/i.test(s.slice(0, 600));

/** Bundlatut JS-resurssit (mime text/javascript) — ADARin polku. */
function bundlattuJs(s) {
  if (!s.includes('__bundler/manifest')) return 0;
  for (const m of s.matchAll(/<script[^>]*type="__bundler\/manifest"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const man = JSON.parse(m[1]);
      return Object.values(man).filter((e) => /^(text|application)\/(java|ecma)script/i.test(e.mime || '')).length;
    } catch { /* template sisältää saman merkkijonon escapattuna — kokeile seuraavaa */ }
  }
  return 0;
}

/** Appit = tarjoiltavat kokonaiset dokumentit jotka koskevat firebase-globaaliin. */
const APIT = TARJOILLAAN
  .map((tiedosto) => ({ tiedosto, s: lue(tiedosto) }))
  .filter(({ s }) => kokonainenDokumentti(s) && /\bfirebase\s*\.\s*\w/.test(s));

describe('Firebase-SDK:n kytkentä tarjoiltavissa appeissa', () => {
  it('kohdejoukko ei ole tyhjä eikä rappeutunut', () => {
    const nimet = APIT.map((a) => a.tiedosto);
    expect(nimet).toContain('TalentMaster_Master_v16.html');
    expect(nimet).toContain('TalentMaster_ADAR_Pikakortti.html');
    expect(nimet.length).toBeGreaterThan(10);
  });

  it('jokainen firebase-globaalia käyttävä appi tarjoaa app-SDK:n (ulkoisena TAI bundlattuna)', () => {
    for (const { tiedosto, s } of APIT) {
      const ulkoinen = /<script[^>]*src=["'][^"']*firebase-app(?:-compat)?\.js/i.test(s);
      const bundlattu = bundlattuJs(s) > 0;
      expect(ulkoinen || bundlattu, `${tiedosto}: ei firebase-app-SDK:ta eikä bundlattua JS:ää`).toBe(true);
    }
  });

  it('jokainen käytetty firebase-palvelu on myös ladattu', () => {
    for (const { tiedosto, s } of APIT) {
      if (bundlattuJs(s) > 0) continue; // bundlen sisältöä ei voi tarkistaa tagihaulla — ks. oma testi alla
      for (const [api, sdk] of Object.entries(PALVELU_SDK)) {
        if (!new RegExp(`\\bfirebase\\s*\\.\\s*${api}\\s*\\(`).test(s)) continue;
        const ladattu = new RegExp(`firebase-${sdk}(?:-compat)?\\.js`, 'i').test(s);
        expect(ladattu, `${tiedosto}: käyttää firebase.${api}() mutta ei lataa firebase-${sdk}-SDK:ta`).toBe(true);
      }
    }
  });

  /**
   * ADAR oli aiemmin yhden tiedoston selainbundle (gzip-blobit + DecompressionStream + blob:-URLit).
   * Se toimi Chromessa mutta oli hauras vanhemmilla selaimilla/webvieweilla ja raskas yllapitaa →
   * purettu tavalliseksi apiksi. Offline-kenttakaytto (§15) EI poistunut: se tulee nyt
   * sw_adar.js:n precachesta + Firestoren IndexedDB-persistenssista.
   *
   * Portti seuraa arkkitehtuuria: se vaatii ULKOISEN muodon ja kieltaa bundlerin paluun.
   */
  it('ADAR-pikakortti on tavallinen appi: ulkoiset SDK-tagit, ei bundleria', () => {
    const s = lue('TalentMaster_ADAR_Pikakortti.html');
    expect(bundlattuJs(s)).toBe(0);
    expect(s).not.toContain('__bundler/');
    expect(s).not.toContain('DecompressionStream');
    expect(s).not.toContain('createObjectURL');
    for (const sdk of ['app', 'app-check', 'auth', 'firestore', 'storage']) {
      expect(s, `firebase-${sdk}-compat puuttuu`).toContain(`firebase-${sdk}-compat.js`);
    }
    expect(s).toContain('lib/tm_appcheck.js');
  });

  it('ADARin offline-kyky (§15) sailyy de-bundlen jalkeen', () => {
    const s = lue('TalentMaster_ADAR_Pikakortti.html');
    expect(s, 'Firestoren offline-jono').toContain('enablePersistence');
    expect(s, 'SW-rekisterointi').toContain("navigator.serviceWorker.register('sw_adar.js");
    const sw = lue('sw_adar.js');
    expect(sw, 'versioitu cache').toMatch(/const CACHE = 'tm-adar-v\d+'/);
    expect(sw, 'uusi deploy syrjayttaa vanhan').toContain('skipWaiting');
    expect(sw).toContain('clients.claim');
    // Allowlist-periaate (§27.4): SW ei saa cachettaa muiden appien sivuja.
    expect(sw).toContain('SALLITUT_ISANNAT');
    expect(sw).toContain('OMAT_POLUT');
  });
});
