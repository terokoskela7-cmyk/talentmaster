/* PR A: lib/tm_paivan_harjoite.js — viikon osan kirjain, lähde aina mukana, turvallinen normalisointi. Lisäksi: valintalogiikka ei lue Firebasea (pure) ja kaikki kutsupaikat ovat tiedossa (vartija: uusi valitsePaivanHarjoite-kutsu → päivitä lista tietoisesti). */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const L = require('../lib/tm_paivan_harjoite.js'), VO = require('../lib/tm_viikon_osa.js');

describe('tmPaivanHarjoiteOsa', () => {
  const raaka = [{ k: 'a', koodi: 'KA' }, { k: 'b', koodi: 'KB' }, { k: 'c', koodi: 'KC' }];
  it('ensimmäinen ei-itsenäinen osa; valmentajan valinta voittaa saman ISO-viikon sisällä; ei jaksoa → null', () => {
    const jf = { konsepti_avain: 'y_h2', osa_arviot: { y_h2: { KA: 3 } } };
    expect(L.tmPaivanHarjoiteOsa(jf, raaka, '2026-11-20')).toBe('b');
    expect(L.tmPaivanHarjoiteOsa(Object.assign({}, jf, { viikon_osa: { koodi: 'KC', pvm: '2026-11-18' } }), raaka, '2026-11-20')).toBe('c');
    expect(L.tmPaivanHarjoiteOsa(Object.assign({}, jf, { viikon_osa: { koodi: 'KC', pvm: '2026-11-10' } }), raaka, '2026-11-20')).toBe('b');   // vanhentunut valinta
    expect(L.tmPaivanHarjoiteOsa(null, raaka, '2026-11-20')).toBeNull(); expect(L.tmPaivanHarjoiteOsa({}, raaka, '2026-11-20')).toBeNull();
    expect(L.tmPaivanHarjoiteOsa({ konsepti_avain: 'y_h2', osa_arviot: { y_h2: { KA: 3, KB: 3, KC: 3 } } }, raaka, '2026-11-20')).toBeNull();   // kaikki hallussa
  });
});
describe('tmPaivanHarjoiteLahde / Nayta', () => {
  it('lähde aina: puuttuva lahde = tm; seura → seuran nimi; tm → ei nimeä', () => {
    expect(L.tmPaivanHarjoiteLahde({ nimi: 'x' })).toBe('tm'); expect(L.tmPaivanHarjoiteLahde({ nimi: 'x', lahde: 'seura' })).toBe('seura'); expect(L.tmPaivanHarjoiteLahde(null)).toBe('tm');
    expect(L.tmPaivanHarjoiteNayta({ nimi: 'Pomppulaskuri', ohje: 'o', kesto: '10 min' }, { seuranNimi: 'KPV' })).toMatchObject({ lahde: 'tm', lahdeNimi: null, osa: null, jaksosta: false });
    expect(L.tmPaivanHarjoiteNayta({ nimi: 'S', lahde: 'seura', jaksosta: true, osa: 'b' }, { seuranNimi: ' KPV ' })).toMatchObject({ lahde: 'seura', lahdeNimi: 'KPV', osa: 'b', jaksosta: true });
    expect(L.tmPaivanHarjoiteNayta({ nimi: 'S', lahde: 'seura' }, {})).toMatchObject({ lahde: 'seura', lahdeNimi: null });   // nimi puuttuu → UI:n "Seuran harjoite"
  });
  it('tyhjä/nimetön → null; video vain http(s)', () => {
    expect(L.tmPaivanHarjoiteNayta(null)).toBeNull(); expect(L.tmPaivanHarjoiteNayta({ nimi: '  ' })).toBeNull();
    expect(L.tmPaivanHarjoiteNayta({ nimi: 'x', video_url: 'javascript:alert(1)' }).video_url).toBeNull(); expect(L.tmPaivanHarjoiteNayta({ nimi: 'x', video_url: 'https://a.b/c' }).video_url).toBe('https://a.b/c');
  });
});
describe('vartija: valitsePaivanHarjoite-kutsupaikat', () => {
  it('seuraPankin kanssa kutsuvat vain tunnetut paikat (muut kutsut ilman pankkia = vanha polku)', () => {
    const tied = readdirSync('.').filter((n) => /^TalentMaster_.*\.html$/.test(n)), kutsut = {};
    for (const n of tied) { const m = readFileSync(n, 'utf8').match(/valitsePaivanHarjoite\([^)\n]*\)/g) || []; m.forEach((x) => { if (x.split(',').length >= 4) kutsut[n] = (kutsut[n] || 0) + 1; }); }
    expect(kutsut).toEqual({ 'TalentMaster_Pelaaja_v7.html': 1 });   // vain Kenttä-kutsu antaa seuraPankin; C/D/E-PR:t lisäävät tähän tietoisesti
    expect(VO).toBeTruthy();
  });
});
