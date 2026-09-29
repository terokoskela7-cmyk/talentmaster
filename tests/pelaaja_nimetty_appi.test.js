/**
 * Pelaaja_v7 · NIMETTY Firebase-appi 'tm-pelaaja' (30.9.2026).
 * Juurisyy: saman originin apit jakoivat oletusapin Auth-istunnon; pelaajan signInWithCustomToken
 * korvasi sen, Master/VP kutsuivat signOut() → kaikki välilehdet ulos. Nimetty appi = oma istunto.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIVU = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const KOODI = SIVU.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
function pura(tunniste) {
  const alku = KOODI.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let d = 0;
  for (let j = KOODI.indexOf('{', alku); j < KOODI.length; j++) {
    if (KOODI[j] === '{') d++; else if (KOODI[j] === '}') { d--; if (!d) return KOODI.slice(alku, j + 1); }
  }
  throw new Error('sulkeet');
}

describe('Pelaaja_v7 · nimetty appi', () => {
  it('VARTIJA: ei yhtään firebase.auth()/firestore()/functions()/storage()/app()-kutsua oletusappiin', () => {
    expect(KOODI.match(/firebase\.(auth|firestore|functions|storage)\(\)/g) || []).toEqual([]);
    expect(KOODI.match(/firebase\.app\(\)/g) || []).toEqual([]);
  });
  it('EI VACUOUS: vartija nappaisi vanhan muodon', () => {
    expect('var cu = firebase.auth().currentUser;').toMatch(/firebase\.(auth|firestore|functions|storage)\(\)/);
    expect("firebase.app().functions('europe-west1')").toMatch(/firebase\.app\(\)/);
  });
  it("alustus: initializeApp(_fbCfg, 'tm-pelaaja') → App Check samaan appiin → auth/db appista", () => {
    const f = pura('function _initFirebase() {');
    const iInit = f.indexOf("firebase.initializeApp(_fbCfg, 'tm-pelaaja')");
    const iAc = f.indexOf('tmAppCheckAktivoi(app)');
    expect(iInit).toBeGreaterThan(0);
    expect(iAc).toBeGreaterThan(iInit);
    expect(iAc).toBeLessThan(f.indexOf('app.auth()'));
    expect(f).toContain('window._fbApp = app');
    expect(f).toContain('const db   = app.firestore()');
    expect((KOODI.match(/initializeApp\(/g) || []).length, 'vain yksi (nimetty) alustus').toBe(1);
  });
  it('tm_appcheck ladataan versiolla, joka tukee nimettyä appia', () => {
    expect(SIVU).toContain('lib/tm_appcheck.js?v=2');
  });
  it('funktiot (pelaajaKirjaudu, kuittaaKaavioYmmarretty) nimetystä appista', () => {
    expect(KOODI).toContain("window._fbApp.functions('europe-west1').httpsCallable('pelaajaKirjaudu')");
    expect(KOODI).toContain("window._fbApp.functions('europe-west1').httpsCallable('kuittaaKaavioYmmarretty')");
  });
});

describe('Pelaaja_v7 · latausnäkymä ja PIN-syyt', () => {
  it("käynnistys alkaa latausnäkymästä (ei PIN-välähdystä)", () => {
    expect(KOODI).toContain("let _sc='lataa'");
    expect(pura('function draw(){')).toContain("if(_sc==='lataa')      html=rLataa();");
    expect(pura('function rLataa(){')).toContain("t('yleiset.latautuu')");
  });
  it('auth-kuuntelija merkitsee tilan selvinneeksi heti', () => {
    const i = KOODI.indexOf('auth.onAuthStateChanged(async user => {');
    expect(KOODI.slice(i, i + 120)).toContain('_authTilaSelvilla = true;');
  });
  it("jokainen PIN-reitti kulkee _goPin(syy):n kautta (vain _goPin itse kutsuu go('pin'))", () => {
    const skripti = KOODI.slice(KOODI.indexOf('<script'));
    /* Kehitysnavigaation onclick="go('pin')" -nappi ei ole kirjautumisreitti → rajataan pois. */
    const kaikki = skripti.match(/(?<!onclick=")go\('pin'\)/g) || [];
    expect(kaikki.length).toBe(1);
    expect(pura('function _goPin(syy) {')).toContain("console.warn('[pin] ' + syy)");
    expect((KOODI.match(/_goPin\('/g) || []).length).toBeGreaterThanOrEqual(7);
  });
  it('latausnäkymä ei jää ikuiseksi: varaverkko 15 s → PIN syyn kanssa', () => {
    const i = KOODI.indexOf("document.addEventListener('DOMContentLoaded', () => {");
    const b = KOODI.slice(i, i + 700);
    expect(b).toContain("if (_sc === 'lataa') _goPin(");
    expect(b).toContain('15000');
  });
});

describe('lib/tm_appcheck.js · aktivointi per appi', () => {
  it('nimetty appi aktivoidaan omaan appCheckiinsä; oletusappi ennallaan; idempotentti per appi', () => {
    const req = createRequire(import.meta.url);
    const kutsut = [];
    const tee = (nimi) => ({ activate: () => kutsut.push(nimi) });
    globalThis.firebase = { appCheck: Object.assign(() => tee('[DEFAULT]'), { ReCaptchaEnterpriseProvider: function () {} }) };
    globalThis.console = console;
    delete req.cache[req.resolve('../lib/tm_appcheck.js')];
    const A = req('../lib/tm_appcheck.js');
    const nimetty = { name: 'tm-pelaaja', appCheck: () => tee('tm-pelaaja') };
    expect(A.tmAppCheckAktivoi(nimetty)).toBe(true);
    expect(A.tmAppCheckAktivoi(nimetty)).toBe(true);
    expect(A.tmAppCheckAktivoi()).toBe(true);
    expect(kutsut).toEqual(['tm-pelaaja', '[DEFAULT]']);
    delete globalThis.firebase;
  });
});
