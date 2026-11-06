/**
 * B1 (2.11.2026): käytettävyyden muokkaus nykyisessä Seura-pelaajalistassa.
 *  - Nykyinen lista (pelaajaRivi) näyttää klikattavan käytettävyyden → avaaKaytettavyysModal (sama S4-kirjoituspolku tmTerveysKirjoita).
 *  - Asettamaton → "—"-nappi (ei oleteta aktiiviseksi).
 *  - Terveystieto (Rules v3.70): Seura-sivulla SA, VP ja UTJ näkevät ja muokkaavat; seurasihteeri ei näe saraketta eikä avaa muokkausta.
 * Ajetaan oikeat funktiot vm-hiekkalaatikossa (ei regexiä HTML:stä).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { createRequire as _kuoriReq } from 'module';
const { lueKuori } = _kuoriReq(import.meta.url)('../scripts/kuoren_lahde.js');   // Seura.html + seura/-osat (rivikattojen purku)

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEURA = lueKuori('TalentMaster_Seura.html');
const pura = (t) => { const a = SEURA.indexOf(t); if (a < 0) throw new Error(t); let d = 0; for (let j = SEURA.indexOf(') {', a) + 2; j < SEURA.length; j++) { if (SEURA[j] === '{') d++; else if (SEURA[j] === '}') { d--; if (!d) return SEURA.slice(a, j + 1); } } throw new Error(t); };
const rivi = (t) => { const a = SEURA.indexOf(t); if (a < 0) throw new Error(t); return SEURA.slice(a, SEURA.indexOf('\n', a)); };

function sivu(rooli) {
  const ctx = { tila: { rooli, joukkueet: [] }, tmHT: (s) => s, String, Object, Array, console };
  vm.createContext(ctx);
  vm.runInContext([
    rivi('var HENKILO_NIMETON'), rivi('var HENKILO_EI_EMAILIA'), pura('function henkiloNimi('),
    rivi('const KAYTETTAVYYS_ROOLIT'), pura('function kaytettavyysNakyy('),
    pura('function _renderKaytettavyys('), pura('function _suostumusPeruttu('), pura('function _suostumusAnnettu('), pura('function pelaajaRivi('),
    'this.pelaajaRivi = pelaajaRivi; this.kaytettavyysNakyy = kaytettavyysNakyy;',
  ].join('\n'), ctx);
  return ctx;
}
const P = (x) => Object.assign({ id: 'p1', etunimi: 'Testi', sukunimi: 'Pelaaja', suostumusTila: 'pilotti' }, x);

describe('B1 käytettävyys nykyisessä listassa', () => {
  for (const rooli of ['vp', 'urheilutoimenjohtaja', 'superadmin', 'super_admin']) {
    it(rooli + ': badge on klikattava nappi → avaaKaytettavyysModal', () => {
      const s = sivu(rooli);
      const h = s.pelaajaRivi(P({ kaytettavyys: 'loukkaantunut', loukkaantuminen_alue: 'Polvi' }));
      expect(h).toContain('avaaKaytettavyysModal(\'p1\')');
      expect(h).toMatch(/<button type="button" class="kaytNappi"/);
      expect(h).toContain('Loukkaantunut · Polvi');
      expect(h).not.toContain('>loukkaantunut<');   // ei raakaa avainta
    });
  }

  it('asettamaton → "—"-nappi, ei "Aktiivinen"-oletusta', () => {
    const h = sivu('vp').pelaajaRivi(P({}));
    expect(h).toContain('avaaKaytettavyysModal(\'p1\')');
    expect(h).toContain('>—</button>');
    expect(h).not.toContain('Aktiivinen');
  });

  it('seurasihteeri: ei saraketta eikä muokkausta (terveystieto)', () => {
    const s = sivu('seurasihteeri');
    expect(s.kaytettavyysNakyy()).toBe(false);
    const h = s.pelaajaRivi(P({ kaytettavyys: 'loukkaantunut' }));
    expect(h).not.toContain('avaaKaytettavyysModal');
    expect(h).not.toMatch(/oukkaantunut/);
    expect((h.match(/<td/g) || []).length).toBe(7);   // valinta, nimi, joukkue, synt., PalloID, tila, toiminnot
    expect((sivu('vp').pelaajaRivi(P({})).match(/<td/g) || []).length).toBe(8);
  });

  it('otsikkorivi ja vanha alkurenderöinti noudattavat samaa roolisääntöä', () => {
    expect(SEURA).toContain("${kaytettavyysNakyy() ? '<th>Käytettävyys</th>' : ''}");
    expect(SEURA).toContain("${kaytettavyysNakyy() ? '<td>' + _renderKaytettavyys(p) + '</td>' : ''}");
    expect(pura('async function avaaKaytettavyysModal(')).toContain('if (!kaytettavyysNakyy()) return;');
    expect(pura('async function tallennakKaytettavyys(')).toContain('if (!kaytettavyysNakyy()) return;');
    expect(pura('async function tallennakKaytettavyys(')).toContain('tmTerveysKirjoita');   // sama S4-polku, ei uutta kirjoituspolkua
  });
});
