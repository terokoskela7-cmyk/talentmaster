/**
 * lib/tm_phv_tila.js — PHV-tilan YKSI lukusääntö (PR C, 4.10.2026).
 * Kanoninen Mirwald-sanasto PRE/LAH/PH/POST/AN; tila voimassa vain mittauslähteestä (biologinenIka_viimeisin),
 * muuten 'tuntematon'. Kirjoittajien tuontimuunnos ei tulkitse moniselitteistä AN-solua hiljaa.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const L = require('../lib/tm_phv_tila.js');
const juuri = join(__dirname, '..');

const mitattu = (koodi, extra) => Object.assign({ phv_tila: koodi, biologinenIka_viimeisin: { phv_tila_koodi: koodi, mittauspaiva: '2026-09-01' } }, extra || {});

describe('tmPhvTila — sääntö 3', () => {
  it('Topias: AN, 13 v, EI biologinenIka_viimeisin → tuntematon (ei jälki-PHV, ei pre-PHV)', () => {
    expect(L.tmPhvTila({ phv_tila: 'AN', syntymaVuosi: 2013 })).toBe('tuntematon');
    expect(L.tmPhvKoodi({ phv_tila: 'AN', syntymaVuosi: 2013 })).toBe(null);
  });

  it('Mirwald-mitattu AN → AN (jälki-PHV)', () => {
    expect(L.tmPhvTila(mitattu('AN'))).toBe('AN');
  });

  it('kaikki kanoniset koodit kulkevat mittauksesta läpi', () => {
    for (const k of ['PRE', 'LAH', 'PH', 'POST', 'AN']) expect(L.tmPhvTila(mitattu(k))).toBe(k);
  });

  it('puuttuva / tyhjä / null-dokki → tuntematon', () => {
    expect(L.tmPhvTila(null)).toBe('tuntematon');
    expect(L.tmPhvTila({})).toBe('tuntematon');
    expect(L.tmPhvTila({ phv_tila: '' })).toBe('tuntematon');
  });

  it('mittaus voittaa: lomake kirjoitti phv_tila:n mittauksen päälle → mittauksen koodi', () => {
    expect(L.tmPhvTila({ phv_tila: 'PRE', biologinenIka_viimeisin: { phv_tila_koodi: 'POST' } })).toBe('POST');
  });

  it('vanha mittausdokki ilman koodia → pikakentän kanoninen koodi', () => {
    expect(L.tmPhvTila({ phv_tila: 'LAH', biologinenIka_viimeisin: { mittauspaiva: '2026-01-01' } })).toBe('LAH');
  });

  it('vanhaa sanastoa EI tueta lukijassa (huippu/PHV/VA) — ei edes mittauksen kanssa', () => {
    expect(L.tmPhvTila({ phv_tila: 'huippu', biologinenIka_viimeisin: {} })).toBe('tuntematon');
    expect(L.tmPhvTila({ phv_tila: 'VA', biologinenIka_viimeisin: {} })).toBe('tuntematon');
    expect(L.tmPhvTila({ phv_tila: 'PHV' })).toBe('tuntematon');
  });
});

describe('kuormasuoja + henkilökunnan ilmoitettu PH', () => {
  it('tuntematon ja PH → varovainen; mitattu PRE/POST/AN → ei', () => {
    expect(L.tmPhvKuormaVarovainen({})).toBe(true);
    expect(L.tmPhvKuormaVarovainen({ phv_tila: 'AN' })).toBe(true);
    expect(L.tmPhvKuormaVarovainen(mitattu('PH'))).toBe(true);
    expect(L.tmPhvKuormaVarovainen(mitattu('AN'))).toBe(false);
    expect(L.tmPhvKuormaVarovainen(mitattu('PRE'))).toBe(false);
  });

  it('tmPhvIlmoitettuPH: PH ilman mittausta → true; mitattu PH tai muu → false', () => {
    expect(L.tmPhvIlmoitettuPH({ phv_tila: 'PH' })).toBe(true);
    expect(L.tmPhvIlmoitettuPH(mitattu('PH'))).toBe(false);
    expect(L.tmPhvIlmoitettuPH({ phv_tila: 'AN' })).toBe(false);
    expect(L.tmPhvIlmoitettuPH(null)).toBe(false);
  });
});

describe('tmPhvTuontiKoodi — kirjoittajat kirjoittavat VAIN kanonisia koodeja', () => {
  it('selkokieliset valinnat → koodi', () => {
    expect(L.tmPhvTuontiKoodi('Ennen kasvupyrähdystä').koodi).toBe('PRE');
    expect(L.tmPhvTuontiKoodi('  kasvupyrähdyksessä ').koodi).toBe('PH');
    expect(L.tmPhvTuontiKoodi('Kasvupyrähdyksen jälkeen').koodi).toBe('POST');
    expect(L.tmPhvTuontiKoodi('Lähestyy kasvupyrähdystä').koodi).toBe('LAH');
    expect(L.tmPhvTuontiKoodi('Yli vuosi kasvupyrähdyksen jälkeen').koodi).toBe('AN');
  });

  it('kanoniset koodit (paitsi AN) hyväksytään sellaisenaan, myös pienellä', () => {
    for (const k of ['PRE', 'LAH', 'PH', 'POST']) expect(L.tmPhvTuontiKoodi(k.toLowerCase()).koodi).toBe(k);
  });

  it('AN-solu on moniselitteinen → EI koodia, ongelma raportoidaan (ei hiljaista tulkintaa)', () => {
    const r = L.tmPhvTuontiKoodi('AN');
    expect(r.koodi).toBe(null);
    expect(r.ongelma).toBe('moniselitteinen');
    expect(L.tmPhvTuontiKoodi(' an ').ongelma).toBe('moniselitteinen');
  });

  it("vanha 'VA' → POST (hyväksytty muunnos) huomautuksen kanssa", () => {
    const r = L.tmPhvTuontiKoodi('VA');
    expect(r.koodi).toBe('POST');
    expect(r.huom).toMatch(/POST/);
  });

  it('tyhjä → ei koodia, ei ongelmaa; tuntematon teksti → ongelma', () => {
    expect(L.tmPhvTuontiKoodi('')).toEqual({ koodi: null, ongelma: null, huom: null });
    expect(L.tmPhvTuontiKoodi(null).ongelma).toBe(null);
    expect(L.tmPhvTuontiKoodi('huippu').ongelma).toBe('tuntematon');
    expect(L.tmPhvTuontiKoodi('Ennen kasvua').ongelma).toBe('tuntematon');   // vanha "📍 Ennen kasvua" ei ole valinta
  });

  it('VARTIJA: mikään syöte ei tuota ei-kanonista koodia', () => {
    const syotteet = ['AN', 'PH', 'VA', 'PRE', 'POST', 'LAH', 'huippu', 'PHV', 'pre-PHV', 'x', '', null, undefined, 3,
      'Ennen kasvupyrähdystä', 'Kasvupyrähdyksessä', 'Kasvupyrähdyksen jälkeen', '📍 Ennen kasvua', 'tuntematon'];
    for (const s of syotteet) {
      const k = L.tmPhvTuontiKoodi(s).koodi;
      expect(k === null || L.PHV_KANONISET.includes(k)).toBe(true);
      expect(k).not.toBe('tuntematon');
    }
  });

  it('PHV_VALINNAT (lomake/Excel) muuntuvat koodeiksi', () => {
    for (const v of L.PHV_VALINNAT) expect(L.tmPhvTuontiKoodi(v.teksti).koodi).toBe(v.koodi);
  });
});

describe('jakelu', () => {
  it('functions/tm_phv_tila.js on identtinen kopio (deploy pakkaa vain functions/)', () => {
    expect(readFileSync(join(juuri, 'functions/tm_phv_tila.js'), 'utf8')).toBe(readFileSync(join(juuri, 'lib/tm_phv_tila.js'), 'utf8'));
  });
});
