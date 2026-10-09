/* Kehitystyöpöytä 22 · A6 — PHV vain lib/tm_phv_tila.js:n kautta (tmPhvTila / tmPhvKoodi). Portti: VP_v25 ja Master_v16 eivät lue `.phv_tila`-kenttää suoraan (sallittu lista TYHJÄ).
   Kirjoitus (`o.phv_tila = tmPhvKoodi(o)` latauksessa) ja objektiliteraalin avain (`phv_tila: tmPhvKoodi(p)`) eivät ole luku-kohtia. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const SOVELLUKSET = ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html'];
const LUKU = /\b[A-Za-z_$][\w$]*\.phv_tila\b(?!\s*=[^=])/g;   // jokin.phv_tila (ei sijoitusta); ei phv_tila_koodi / phv_tila_alussa

describe('A6 · PHV-portti', () => {
  for (const f of SOVELLUKSET) {
    it(f + ': ei suoria `.phv_tila`-lukuja (sallittu lista tyhjä)', () => {
      const lahde = lue(f), osumat = [];
      lahde.split('\n').forEach((rivi, i) => { const m = rivi.match(LUKU); if (m) osumat.push((i + 1) + ': ' + m.join(', ')); });
      expect(osumat, 'käytä tmPhvKoodi(p) / tmPhvTila(p) (lib/tm_phv_tila.js)').toEqual([]);
    });
    it(f + ': lataa lib/tm_phv_tila.js ennen ensimmäistä tmPhvKoodi-käyttöä', () => {
      const lahde = lue(f), a = lahde.indexOf('lib/tm_phv_tila.js'), b = lahde.indexOf('tmPhvKoodi(');
      expect(a).toBeGreaterThan(0); expect(a).toBeLessThan(b);
    });
  }
  it('portti on elävä: tunnistaa luvun, ohittaa sijoituksen, objektiavaimen ja phv_tila_koodi:n', () => {
    expect('x.phv_tila === "PH"'.match(LUKU)).toBeTruthy(); expect('p.phv_tila || null'.match(LUKU)).toBeTruthy();
    expect('o.phv_tila = tmPhvKoodi(o);'.match(LUKU)).toBeNull(); expect('{ phv_tila: tmPhvKoodi(p) }'.match(LUKU)).toBeNull(); expect('b.phv_tila_koodi'.match(LUKU)).toBeNull(); expect('p.phv_tila == "x"'.match(LUKU)).toBeTruthy();
  });
  it('lukusääntö: mittaus voittaa, mittaamaton → null (tuntematon); pelkkä lomakkeen/tuonnin phv_tila ei kelpaa', () => {
    const { tmPhvKoodi, tmPhvTila } = require('../lib/tm_phv_tila.js');
    expect(tmPhvKoodi({ phv_tila: 'PH' })).toBeNull(); expect(tmPhvTila({ phv_tila: 'PH' })).toBe('tuntematon');
    expect(tmPhvKoodi({ phv_tila: 'PRE', biologinenIka_viimeisin: { phv_tila_koodi: 'POST' } })).toBe('POST');
  });
});
