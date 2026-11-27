/**
 * Vartija (GDPR, D11): alaikäisten IP-osoitteet eivät saa mennä Googlelle → pelaajille ja huoltajille näkyvät
 * sivut + niiden service workerit eivät saa viitata fonts.googleapis.com / fonts.gstatic.com -osoitteisiin.
 * Lista saa vain KASVAA: uusi pelaaja-/huoltajasivu lisätään tänne; sivua ei poisteta listalta (alarajatesti).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');

export const VARTIOITU = [
  'TalentMaster_Pelaaja_v7.html',
  'TalentMaster_Vanhempi_v2.html',
  'TalentMaster_Player_Home.html',
  'sw_pelaaja.js',
  'sw_vanhempi.js',
  // Pelaajille/huoltajille näkyvät lomake- ja kyselysivut (fonttien itse-isännöinti, 2. PR)
  'TalentMaster_Rekisterointi_Suostumus.html',
  'TalentMaster_Kysely_v2.html',
  'TalentMaster_Solo_Koti.html',
  'TalentMaster_Solo_Profiili.html',
];
const ALARAJA = 9;   // #1333: 5, fonttien 2. PR: 9. Nosta, kun lisäät sivuja; älä koskaan laske.
const KIELLETTY = /fonts\.(googleapis|gstatic)\.com/;

describe('ei Google Fontsia pelaaja-/huoltajasivuilla', () => {
  it('lista ei ole kutistunut (vain kasvaa)', () => {
    expect(VARTIOITU.length).toBeGreaterThanOrEqual(ALARAJA);
    expect(new Set(VARTIOITU).size).toBe(VARTIOITU.length);
  });
  for (const f of VARTIOITU) {
    it(f + ' ei viittaa fonts.googleapis.com / fonts.gstatic.com', () => {
      expect(existsSync(join(juuri, f))).toBe(true);
      expect(readFileSync(join(juuri, f), 'utf8')).not.toMatch(KIELLETTY);
    });
  }
  it('vartijan lista sisältää aiempien PR:ien perustason', () => {
    for (const f of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html', 'TalentMaster_Player_Home.html', 'sw_pelaaja.js', 'sw_vanhempi.js', 'TalentMaster_Rekisterointi_Suostumus.html', 'TalentMaster_Kysely_v2.html', 'TalentMaster_Solo_Koti.html', 'TalentMaster_Solo_Profiili.html']) expect(VARTIOITU).toContain(f);
  });
});
