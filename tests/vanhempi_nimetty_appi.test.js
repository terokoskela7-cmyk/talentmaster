/**
 * Vaihe 0 / PR 2 · Vanhempi_v2: nimetty appi 'tm-vanhempi', ei anonyymiä istuntoa.
 * Juurisyy: sivu kutsui jokaisella latauksella ehdoitta signInAnonymously() oletusappiin, mikä
 * korvasi saman selaimen henkilökunnan (Master/VP) istunnon kaikissa välilehdissä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIVU = readFileSync(join(juuri, 'TalentMaster_Vanhempi_v2.html'), 'utf8');
const KOODI = SIVU.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

describe('Vanhempi_v2 · nimetty appi, ei anonyymiä', () => {
  it('ei signInAnonymously-kutsua', () => {
    expect(KOODI).not.toContain('signInAnonymously');
  });
  it('VARTIJA: ei oletusappikutsuja (firebase.auth()/firestore()/functions()/app())', () => {
    expect(KOODI.match(/firebase\.(auth|firestore|functions|storage)\(\)/g) || []).toEqual([]);
    expect(KOODI.match(/firebase\.app\(\)/g) || []).toEqual([]);
  });
  it("alustus: nimetty 'tm-vanhempi' → App Check samaan appiin ennen palveluja", () => {
    const i = KOODI.indexOf("firebase.initializeApp(_fbCfg, 'tm-vanhempi')");
    const a = KOODI.indexOf('tmAppCheckAktivoi(_vApp)');
    expect(i).toBeGreaterThan(0);
    expect(a).toBeGreaterThan(i);
    expect(a).toBeLessThan(KOODI.indexOf('_vApp.auth()'));
    expect(SIVU).toContain('lib/tm_appcheck.js?v=2');
  });
  it('huoltajan funktio (haeLapsiHuoltajalle) nimetystä appista', () => {
    expect(KOODI).toContain("window._fbApp.functions('europe-west1').httpsCallable('haeLapsiHuoltajalle')");
  });
  it('data haetaan vasta tunnistetulle käyttäjälle (ei anonyymiä esikyselyä)', () => {
    const i = KOODI.indexOf('_auth.onAuthStateChanged(async (user) => {');
    const b = KOODI.slice(i, i + 900);
    expect(b).toContain('if (user && !user.isAnonymous) {');
    expect(b.indexOf('await _haeViimeisinKirjaus()')).toBeGreaterThan(b.indexOf('if (user && !user.isAnonymous) {'));
  });
});
