/**
 * VARTIJA · Vaihe 0 / PR 0 (CODE_BRIEF_PELAAJAN_TUNNISTUS v2): Pelaaja_v7 EI kirjaa ketään sisään
 * pelkillä URL-parametreilla (?pelaajaId=&seuraId=). Reitti teki anonyymin kirjautumisen ja avasi
 * minkä tahansa pelaajan profiilin ilman PIN:iä. SA:n esikatselu säilyy, koska se kulkee
 * sähköposti/Google-kirjautumisen ja SA-claimin kautta (_lataaFirebasePelaaja).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIVU = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const KOODI = SIVU.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

function pura(lahde, tunniste) {
  const alku = lahde.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let syvyys = 0;
  for (let j = lahde.indexOf('{', alku); j < lahde.length; j++) {
    if (lahde[j] === '{') syvyys++;
    else if (lahde[j] === '}') { syvyys--; if (!syvyys) return lahde.slice(alku, j + 1); }
  }
  throw new Error('sulkeet eivät täsmää');
}

describe('Vaihe 0 · Pelaaja_v7: ei kirjautumista URL-parametreilla', () => {
  const kuuntelija = pura(KOODI, 'auth.onAuthStateChanged(async user => {');

  it('auth-kuuntelija ei lue URL:n pelaajaId/seuraId:tä eikä tee anonyymiä kirjautumista', () => {
    expect(kuuntelija).not.toContain('_URL.pelaajaId');
    expect(kuuntelija).not.toContain('_URL.seuraId');
    expect(kuuntelija).not.toContain('signInAnonymously');
  });

  it('anonyymi käyttäjä ohjataan PIN-näkymään', () => {
    expect(kuuntelija).toMatch(/if \(user\.isAnonymous\) \{\s*_vanhaPinSessioOhjaus\(\);\s*go\('pin'\);\s*return;\s*\}/);
  });

  it('URL-reitin apufunktio on poistettu', () => {
    expect(KOODI).not.toContain('_lataaProfiiliFirestore');
  });

  it('SA-esikatselu vaatii SA-claimin ja kulkee vain ei-anonyymin kirjautumisen kautta', () => {
    const f = pura(KOODI, 'async function _lataaFirebasePelaaja(auth, db, user) {');
    expect(f).toContain('if (claims.super_admin || claims.superAdmin) {');
    const iSa = f.indexOf('if (claims.super_admin || claims.superAdmin) {');
    expect(f.indexOf('_URL.pelaajaId'), 'SA-haara lukee URL:n vasta claim-tarkistuksen jälkeen').toBeGreaterThan(iSa);
    /* Kuuntelija kutsuu _lataaFirebasePelaaja:a vasta anonyymi-haaran JÄLKEEN. */
    expect(kuuntelija.indexOf('_lataaFirebasePelaaja(')).toBeGreaterThan(kuuntelija.indexOf('user.isAnonymous'));
  });

  /* PR 1: vanha anonyymi PIN-istunto EI enää jatku — se ohjataan KERRAN uuteen kirjautumiseen
     (PalloID + PIN palvelimella), eikä istuntoa avata anonyymisti. */
  it('vanha PIN-istunto (tm_pin_sessio) ohjataan uuteen kirjautumiseen, ei jatketa anonyymisti', () => {
    expect(kuuntelija).toContain('await _tarkistaPinSessio(auth, db)');
    const f = pura(KOODI, 'function _vanhaPinSessioOhjaus() {');
    expect(f).toContain("localStorage.removeItem('tm_pin_sessio')");
    expect(f).toContain("_pinIlmoitus = 'Kirjaudu kerran uudelleen'");
    const t = pura(KOODI, 'async function _tarkistaPinSessio(auth, db) {');
    expect(t).not.toContain('signInAnonymously');
    expect(t).toContain('return false');
  });
});
