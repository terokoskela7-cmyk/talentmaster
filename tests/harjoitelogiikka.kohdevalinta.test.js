/* PR 4 (K14) — laskeTekninenKehityskohde: kohdevalinnan ketju. Tämä tiedosto pinnaa kohdevalinnan; "ENNEN"-lohko (TSI-sekuntirajat, tallennettu hh_taso) oli voimassa ennen PR 4:ää. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lib = require('../harjoitelogiikka_v4.js');
const kk = (p) => lib.laskeTekninenKehityskohde(p);

describe('ENNEN (pinnaus): TSI-sekuntiraja ja tallennettu hh_taso', () => {
  it('P1: tki_kehityskohde voittaa kaiken', () => { expect(kk({ tki_kehityskohde: 'syotto', tsi_viimeisin: 2, hh_taso: 1 })).toMatchObject({ kohde: 'syotto', lahde: 'tki' }); });
  it('P2: TSI > 1,5 → pallonhallinta; 0,8–1,5 → koordinaatio; < 0,8 → nopeus (rajat 1,5 ja 0,8)', () => {
    expect(kk({ tsi_viimeisin: 1.51 })).toMatchObject({ kohde: 'pallonhallinta', lahde: 'tsi', varmuus: 'kohtalainen' }); expect(kk({ tsi_viimeisin: 1.5 }).kohde).toBe('koordinaatio'); expect(kk({ tsi_viimeisin: 0.8 }).kohde).toBe('koordinaatio'); expect(kk({ tsi_viimeisin: 0.79 }).kohde).toBe('nopeus');
  });
  it('P3: hh_taso < 2,0 → koordinaatio, muuten nopeus (varmuus matala)', () => { expect(kk({ hh_taso: 1.9 })).toMatchObject({ kohde: 'koordinaatio', lahde: 'hh', varmuus: 'matala' }); expect(kk({ hh_taso: 2 }).kohde).toBe('nopeus'); });
  it('P4: ei dataa → pallonhallinta (ikavaihe, oletus)', () => { expect(kk({})).toMatchObject({ kohde: 'pallonhallinta', lahde: 'ikavaihe', varmuus: 'oletus' }); });
});
