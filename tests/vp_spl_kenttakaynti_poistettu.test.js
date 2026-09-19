/**
 * SPL-KENTTÄKÄYNTI ON POISTETTU — EIKÄ SIILO SAA PALATA.
 *
 * MIKSI: SPL-kenttäkäynnin 7 kriteeriä olivat TÄSMÄLLEEN samat Palloliitto-
 * kriteerit kuin mallin A "+ Arvioi harjoitus". Ero oli vain siilossa: SPL
 * kirjoitti `mentoroinnit`-kokoelmaan (`tyyppi:'kenttäkäynti'`), joten se EI
 * ruokkinut Harjoituslaatu(A):ta vaan sekoittui mentorointihistoriaan. Kaksi
 * nappia, sama arviointi, kaksi eri lukua.
 *
 * Olennaisin portti on KIRJOITUSKIELTO, ei UI:n poissaolo: lomakkeen voi
 * poistaa ja silti jättää kirjoituspolun, jolloin siilo palaa huomaamatta.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');

const TUNNISTEET = [
  'tallennaSplArvio', 'toggleSplArvio', 'splToggleBtn',
  'splArvio', 'spl-score', 'splKriteerit', 'splJaaValmentajalle',
];

describe('SPL-kenttäkäynti · poistettu', () => {
  it('EI VACUOUS: korvaava pinta on olemassa (+ Arvioi harjoitus säilyy)', () => {
    /* Ilman tätä portti olisi vihreä myös jos koko valmentajakortti katoaisi. */
    expect(VP, 'korvaava arviointipolku puuttuu').toContain('vpAvaaHarjoitusarviointi');
    expect(VP).toContain('+ Arvioi harjoitus');
  });

  it('SPL-tunnisteita ei esiinny lähteessä', () => {
    const jaljella = TUNNISTEET.filter((t) => VP.includes(t));
    expect(jaljella, 'SPL-pinta palasi: ' + jaljella.join(', ')).toEqual([]);
  });

  it('SPL-napin tekstiä ei esiinny', () => {
    expect(VP).not.toContain('Lisää kenttäkäynti-arviointi');
  });

  it('KIRJOITUSKIELTO: mikään add() ei aseta tyyppi:kenttäkäynti', () => {
    /* Tämä on portin ydin. Poimi jokainen mentoroinnit/viestit-lisäys ja
       varmista ettei se kirjoita kenttäkäynti-tyyppiä. */
    const vuodot = [];
    for (const kokoelma of ['mentoroinnit', 'viestit']) {
      const merkki = ".collection('" + kokoelma + "').add(";
      let i = VP.indexOf(merkki);
      while (i >= 0) {
        const lohko = VP.slice(i, i + 1200);
        if (/tyyppi:\s*'kenttäkäynti'/.test(lohko)) vuodot.push(kokoelma + ' @ ' + i);
        i = VP.indexOf(merkki, i + 1);
      }
    }
    expect(vuodot, 'kenttäkäynti-kirjoitus palasi: ' + vuodot.join(', ')).toEqual([]);
  });

  it('EI VACUOUS: add()-kutsuja löytyy skannattavaksi', () => {
    /* Jos kirjoituskutsut katoaisivat kokonaan, yllä oleva portti tarkastaisi
       tyhjän joukon ja olisi aina vihreä. */
    expect(VP, 'mentorointikirjoitus puuttuu').toContain(".collection('mentoroinnit').add(");
    expect(VP, 'viestikirjoitus puuttuu').toContain(".collection('viestit').add(");
  });

  it('vanha kenttäkäynti-data pysyy LUETTAVISSA (ei migraatiota)', () => {
    /* Poisto koskee kirjoittamista ja UI:ta. Vanhat dokumentit putoavat yleiseen
       teksti-kuplaan mentorointihistoriassa — historian pitää yhä renderöityä. */
    expect(VP, 'mentorointihistorian renderöinti katosi').toContain('_lataaCoachHistoria');
    expect(VP).toContain('msg-bubble');
  });
});
