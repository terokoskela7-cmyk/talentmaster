/**
 * Vaihe 0 / PR 1 · Pelaaja_v7 kirjautuu palvelimen kautta (PalloID + PIN → pelaajaKirjaudu → custom token).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIVU = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const KOODI = SIVU.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
function pura(tunniste) {
  const alku = KOODI.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let d = 0;
  for (let j = KOODI.indexOf('{', alku); j < KOODI.length; j++) {
    if (KOODI[j] === '{') d++; else if (KOODI[j] === '}') { d--; if (!d) return KOODI.slice(alku, j + 1); }
  }
  throw new Error('sulkeet');
}

describe('PR 1 · Pelaaja_v7 palvelinkirjautuminen', () => {
  it('functions-SDK ladataan samalla versiolla kuin muut (9.22.1)', () => {
    expect(SIVU).toContain('firebasejs/9.22.1/firebase-functions-compat.js');
  });
  it('PIN-näppäimistö kutsuu uutta polkua; PalloID-kenttä PIN-näkymässä', () => {
    expect(KOODI).toContain('setTimeout(()=>_kirjaudu(_pin),280)');
    expect(SIVU).toContain('id="pinTunnus"');
  });
  it('kutsu: europe-west1 + pelaajaKirjaudu + { liittoTunnus, pin } → signInWithCustomToken', () => {
    const f = pura('async function _kirjaudu(pin) {');
    expect(f).toContain("firebase.app().functions('europe-west1').httpsCallable('pelaajaKirjaudu')");
    expect(f).toContain('fn({ liittoTunnus: tunnus, pin: pin })');
    expect(f).toContain('signInWithCustomToken(d.token)');
    expect(f).toContain('localStorage.setItem(_TUNNUS_LS, tunnus)');
  });
  it('tunnus- tai PIN-virhe EI pudota vanhaan anonyymiin polkuun; vain palvelinhäiriö pudottaa', () => {
    const f = pura('async function _kirjaudu(pin) {');
    const iVanha = f.indexOf('await _kirjauduPinilla(pin)');
    expect(f.lastIndexOf("koodi === 'resource-exhausted'", iVanha)).toBeGreaterThan(0);
    expect(f.lastIndexOf('viesti === _PK_VIRHE_TUNNISTUS', iVanha)).toBeGreaterThan(0);
  });
  it('uudelleenlataus: pelaajatoken (rooli + pelaajaSeuraId + pelaajaId) ladataan ennen muita polkuja', () => {
    const f = pura('async function _lataaFirebasePelaaja(auth, db, user) {');
    const iPel = f.indexOf("claims.rooli === 'pelaaja' && claims.pelaajaSeuraId && claims.pelaajaId");
    expect(iPel).toBeGreaterThan(0);
    expect(iPel).toBeLessThan(f.indexOf('claims.super_admin || claims.superAdmin'));
    expect(f).toContain('_lataaOmaPelaaja(db, claims.pelaajaSeuraId, claims.pelaajaId)');
  });
  it('oma pelaaja ladataan tokenin tunnisteilla (ei listahakua)', () => {
    const f = pura('async function _lataaOmaPelaaja(db, seuraId, pelaajaId) {');
    expect(f).toContain(".collection('pelaajat').doc(pelaajaId).get()");
    expect(f).not.toContain('.where(');
  });
});
