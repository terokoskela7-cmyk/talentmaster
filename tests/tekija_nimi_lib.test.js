/* lib/tm_tekija_nimi.js — YKSI paikka tekijän nimelle: tallennus (ei sähköpostia, puuttuva = null) + näyttö (käännetty oletus).
 * Kolme kirjoituspistettä (Pikakortti, tmViestiNimi, patch) ja kolme lukijaa (Pelaaja, VP/Master-historia) käyttävät samaa sääntöä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TN = require('../lib/tm_tekija_nimi.js');
const HH = require('../lib/tm_havaintohistoria.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

describe('tmTekijaNimiTalletus', () => {
  it('ensimmäinen ei-tyhjä ei-sähköposti; muuten null (ei "Valmentaja")', () => {
    expect(TN.tmTekijaNimiTalletus(['Tero Koskela'])).toBe('Tero Koskela');
    expect(TN.tmTekijaNimiTalletus(['x@y.fi', '  ', 'Valle V.'])).toBe('Valle V.');
    for (const v of [[], [null], [undefined], [''], ['  '], ['talentmasterid@gmail.com'], null, undefined, 'a@b.fi']) expect(TN.tmTekijaNimiTalletus(v), JSON.stringify(v)).toBeNull();
    expect(TN.tmTekijaNimiTalletus('Yksi')).toBe('Yksi');
  });
});
describe('tmTekijaNimiNaytto', () => {
  it('puuttuva / vanha kovakoodattu Valmentaja / sähköposti → annettu (käännetty) oletus; oikea nimi sellaisenaan', () => {
    for (const v of [null, undefined, '', ' ', 'Valmentaja', 'a@b.fi']) expect(TN.tmTekijaNimiNaytto(v, 'Tränare'), JSON.stringify(v)).toBe('Tränare');
    expect(TN.tmTekijaNimiNaytto('Valle V.', 'Tränare')).toBe('Valle V.');
  });
});
describe('VP/Master-historia (tmHhHTML) näyttää oletuksen kääntäjällä', () => {
  const docs = [{ id: 'a', teksti: 'x', tekija_nimi: null, nakyvyys: 'pelaaja' }, { id: 'b', teksti: 'y', tekija_nimi: 'Valmentaja', nakyvyys: 'pelaaja' }, { id: 'c', teksti: 'z', tekija_nimi: 'talentmasterid@gmail.com', valmentajaNimi: 'Valle V.', nakyvyys: 'pelaaja' }];
  it('sv-kääntäjä: null ja vanha Valmentaja → Tränare; sähköposti ohitetaan, valmentajaNimi käyttöön; sähköposti ei vuoda', () => {
    const html = HH.tmHhHTML(HH.tmHhRivit(docs), { t: (k) => (k === 'Valmentaja' ? 'Tränare' : k) });
    expect((html.match(/Tränare/g) || []).length).toBe(2);
    expect(html).toContain('Valle V.'); expect(html).not.toContain('@');
  });
});
describe('ei kopioita: kaikki käyttäjät reitittävät jaetun libin kautta', () => {
  it('Pikakortti, tmViestiNimi, patch ja Pelaaja eivät sisällä omaa @-tarkistusta tai Valmentaja-oletusta', () => {
    expect(lue('TalentMaster_ADAR_Pikakortti.html')).toContain('window.tmTekijaNimiTalletus([user && user.displayName');
    expect(lue('lib/tm_valmentajaviesti.js')).toContain('TN.tmTekijaNimiTalletus(ehdokkaat)');
    const p = lue('src/lib/tm_master_firebase_patch.js');
    expect(p).not.toMatch(/tekija_nimi:[^\n]*(auth\.user\.email|'Valmentaja')/);
    expect(lue('TalentMaster_Pelaaja_v7.html')).toContain('window.tmTekijaNimiNaytto(n, T(\'valmentaja\'))');
  });
  it('sivut lataavat libin ENNEN käyttäjiään', () => {
    for (const [f, kayttaja] of [['TalentMaster_Pelaaja_v7.html', 'tm_havaintohistoria.js'], ['TalentMaster_Master_v16.html', 'tm_havaintohistoria.js'], ['TalentMaster_VP_v25.html', 'tm_havaintohistoria.js'], ['TalentMaster_Master_v16.html', 'tm_valmentajaviesti.js'], ['TalentMaster_VP_v25.html', 'tm_valmentajaviesti.js']]) {
      const s = lue(f); const a = s.indexOf('lib/tm_tekija_nimi.js'), b = s.indexOf('lib/' + kayttaja);
      expect(a, f).toBeGreaterThan(-1); expect(a, f + ' ' + kayttaja).toBeLessThan(b);
    }
  });
});
