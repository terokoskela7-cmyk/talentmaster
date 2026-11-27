/**
 * B1 (2.11.2026) + Q3 (27.11.2026): käytettävyys on terveystieto → EI listalla (ei saraketta, ei listarivin dataa), vain pelaajakortilla (pkd-kaytettavyys) ja luetaan yhden pelaajan dokumenteista.
 *  - _renderKaytettavyys (kortin solu): klikattava nappi → avaaKaytettavyysModal (sama S4-kirjoituspolku tmTerveysKirjoita); asettamaton → "—"-nappi (ei oleteta aktiiviseksi).
 *  - Terveystieto (Rules v3.70): SA, VP ja UTJ näkevät ja muokkaavat; seurasihteeri ei näe eikä avaa muokkausta.
 *  - Lista (pelaajaRivi): kaikille rooleille sama 7 saraketta, vaikka dokumentissa olisi kaytettavyys-kenttä.
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
    'this.pelaajaRivi = pelaajaRivi; this.kaytettavyysNakyy = kaytettavyysNakyy; this.renderKaytettavyys = _renderKaytettavyys;',
  ].join('\n'), ctx);
  return ctx;
}
const P = (x) => Object.assign({ id: 'p1', etunimi: 'Testi', sukunimi: 'Pelaaja', suostumusTila: 'pilotti' }, x);

describe('B1/Q3 käytettävyys: pelaajakortin solu, ei listaa', () => {
  for (const rooli of ['vp', 'urheilutoimenjohtaja', 'superadmin', 'super_admin']) {
    it(rooli + ': kortin solu on klikattava nappi → avaaKaytettavyysModal', () => {
      const s = sivu(rooli);
      const h = s.renderKaytettavyys(P({ kaytettavyys: 'loukkaantunut', loukkaantuminen_alue: 'Polvi' }));
      expect(h).toContain('avaaKaytettavyysModal(\'p1\')');
      expect(h).toMatch(/<button type="button" class="kaytNappi"/);
      expect(h).toContain('Loukkaantunut · Polvi');
      expect(h).not.toContain('>loukkaantunut<');   // ei raakaa avainta
    });
  }

  it('asettamaton → "—"-nappi, ei "Aktiivinen"-oletusta', () => {
    const h = sivu('vp').renderKaytettavyys(P({}));
    expect(h).toContain('avaaKaytettavyysModal(\'p1\')');
    expect(h).toContain('>—</button>');
    expect(h).not.toContain('Aktiivinen');
  });

  it('seurasihteeri: ei näe eikä avaa (terveystieto)', () => {
    expect(sivu('seurasihteeri').kaytettavyysNakyy()).toBe(false);
    for (const r of ['vp', 'urheilutoimenjohtaja', 'superadmin']) expect(sivu(r).kaytettavyysNakyy(), r).toBe(true);
  });

  it('Q3: lista (pelaajaRivi) ei sisällä käytettävyyttä millekään roolille — vaikka dokumentissa olisi kaytettavyys-kenttä', () => {
    for (const rooli of ['vp', 'urheilutoimenjohtaja', 'superadmin', 'super_admin', 'seurasihteeri']) {
      const h = sivu(rooli).pelaajaRivi(P({ kaytettavyys: 'loukkaantunut', loukkaantuminen_alue: 'Polvi' }));
      expect(h, rooli).not.toContain('avaaKaytettavyysModal'); expect(h, rooli).not.toMatch(/oukkaantunut|Polvi|kaytNappi/);
      expect((h.match(/<td/g) || []).length, rooli).toBe(7);   // valinta, nimi, joukkue, synt., PalloID, tila, toiminnot
    }
  });

  it('otsikkorivi ja vanha alkurenderöinti ilman käytettävyyssaraketta; kortti näyttää solun vain oikeutetuille; kirjoituspolku ennallaan', () => {
    expect(SEURA).not.toContain("<th>Käytettävyys</th>"); expect(SEURA).not.toMatch(/<td>' \+ _renderKaytettavyys\(p\)/); expect(SEURA).not.toContain("'<td>' + _renderKaytettavyys(p)");
    expect(SEURA).toMatch(/\$\{kaytettavyysNakyy\(\) \? `\s*<div[^`]*pkd-kaytettavyys-\$\{pelaajaId\}/);
    expect(pura('async function avaaKaytettavyysModal(')).toContain('if (!kaytettavyysNakyy()) return;');
    expect(pura('async function tallennakKaytettavyys(')).toContain('if (!kaytettavyysNakyy()) return;');
    expect(pura('async function tallennakKaytettavyys(')).toContain('tmTerveysKirjoita');   // sama S4-kirjoituspolku, ei uutta kirjoituspolkua
    expect(pura('async function tallennakKaytettavyys(')).not.toMatch(/_pelaajatKaikki/);       // Q3: terveystieto ei jää listan muistiin
  });
});
