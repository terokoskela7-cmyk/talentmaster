/**
 * Pelaaja_v7: sähköpostikirjautumisen virheviestikartta käsittelee myös `auth/invalid-credential`
 * (Auth SDK 10.x palauttaa sen väärälle salasanalle; ennen vain wrong-password). Sama viesti kuin wrong-password.
 * Ajetaan oikea _kirjauduEmaililla() vm:ssä; ei muita viestimuutoksia.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { PEL_APU } from './helpers/pelaaja_t.mjs';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');

function poimi(alku) {
  const i = SRC.indexOf(alku);
  if (i < 0) throw new Error('ei löydy: ' + alku);
  let sy = 0;
  for (let j = SRC.indexOf('{', i); j < SRC.length; j++) {
    if (SRC[j] === '{') sy++;
    else if (SRC[j] === '}') { sy--; if (!sy) return SRC.slice(i, j + 1); }
  }
  throw new Error('sulkeet');
}

async function kirjaudu(koodi) {
  const el = { err: { textContent: '', style: {} }, btn: { textContent: '' } };
  const kentat = { pinEmail: { value: 'huoltaja@tm-testi.fi' }, pinPassword: { value: 'x' }, emailLoginErr: el.err };
  const ctx = {
    ...PEL_APU, document: { getElementById: (id) => kentat[id] || null, querySelector: () => el.btn },
    window: { _auth: { signInWithEmailAndPassword: () => Promise.reject(Object.assign(new Error('x'), { code: koodi })) } },
  };
  vm.createContext(ctx);
  vm.runInContext(poimi('async function _kirjauduEmaililla()'), ctx);
  await vm.runInContext('_kirjauduEmaililla()', ctx);
  return { viesti: el.err.textContent, nakyvissa: el.err.style.display === 'block', nappi: el.btn.textContent };
}

describe('Pelaaja_v7 · sähköpostikirjautumisen virheviestit', () => {
  it('auth/invalid-credential → "Väärä salasana." (sama viesti kuin wrong-password), virhe näkyvissä, nappi palautuu', async () => {
    const r = await kirjaudu('auth/invalid-credential');
    expect(r).toEqual({ viesti: 'Väärä salasana.', nakyvissa: true, nappi: 'KIRJAUDU SISÄÄN' });
  });
  it('auth/wrong-password ennallaan', async () => {
    expect((await kirjaudu('auth/wrong-password')).viesti).toBe('Väärä salasana.');
  });
  it('muut koodit ennallaan (user-not-found, invalid-email, tuntematon)', async () => {
    expect((await kirjaudu('auth/user-not-found')).viesti).toBe('Sähköpostia ei löydy.');
    expect((await kirjaudu('auth/invalid-email')).viesti).toBe('Tarkista sähköposti.');
    expect((await kirjaudu('auth/network-request-failed')).viesti).toBe('Kirjautuminen epäonnistui.');
  });
  it('EI VACUOUS: lähteessä on molemmat koodit samassa ehdossa', () => {
    expect(SRC).toContain("(e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') ? 'Väärä salasana.'");
  });
});
