/* K35-1 vartija (D186): kalenterin tapahtumatyypeillä on YKSI rekisteri, lib/tm_kalenteri_tyypit.js.
   Uutta tyyppikarttaa (objekti tai lista, jossa tyyppi 'ottelu' on avaimena tai id:nä) ei lisätä TalentMaster_*.html-tiedostoihin.
   Nykyiset kartat ovat sallitulla listalla kattoinaan; lista saa vain PIENENTYÄ, kun sovellukset siirtyvät rekisteriin (K35-2, K35-6, R1). */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const KUVIO = /(?:\b|['"])ottelu['"]?\s*:\s*[{'"]|\bid\s*:\s*['"]ottelu['"]/g;
const SALLITTU = {
  'TalentMaster_VP_v25.html': 1,          // KALENTERI_TYYPIT
  'TalentMaster_Master_v16.html': 1,      // `tyypit`-lista luontimodaalissa (_calEvtTyyli on switch, ei karttaa)
  'TalentMaster_Pelaaja_v7.html': 1,      // _P7_TT
  'TalentMaster_Vanhempi_v2.html': 1,     // _VANH_TT
  'TalentMaster_Pelihavainto_Kentta.html': 1   // pelitapahtumien kartta (ei kalenteri) — vanha, ei saa kasvaa
};
const laske = () => Object.fromEntries(readdirSync(juuri).filter((f) => /^TalentMaster_.*\.html$/.test(f)).map((f) => [f, (readFileSync(join(juuri, f), 'utf8').match(KUVIO) || []).length]).filter(([, n]) => n > 0));

describe('vartija: yksi kalenterin tyyppirekisteri (D186)', () => {
  const nyt = laske();
  it('tyyppikarttoja ei lisätä HTML:ään (käytä TM_KALENTERI_TYYPIT)', () => {
    const yli = Object.keys(nyt).filter((f) => nyt[f] > (SALLITTU[f] || 0)).map((f) => f + ' ' + (SALLITTU[f] || 0) + ' → ' + nyt[f]);
    expect(yli, 'lue tyypit lib/tm_kalenteri_tyypit.js:stä').toEqual([]);
  });
  it('sallittu lista ei ole vanhentunut: kun kartta poistuu sovelluksesta, poista rivi listalta', () => {
    expect(Object.keys(SALLITTU).filter((f) => (nyt[f] || 0) < SALLITTU[f])).toEqual([]);
  });
  it('vartija ei ole tyhjä: kuvio löytää nykyiset kartat', () => { expect(Object.values(nyt).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(4); });
});
