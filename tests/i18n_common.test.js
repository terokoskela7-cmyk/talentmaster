/**
 * TalentMaster - i18n Vaihe 0: jaettu lib/tm_i18n_common.js (glossaari-SSOT + jaetut stringit).
 * Konsistenssiportit: (1) ei avainpäällekkäisyyttä sivukarttojen kanssa · (2) glossaari-konformi tm_lang.js:ään ·
 * (3) drift-vartija (0 kiellettyä Kehon valmius -varianttia) · (4) resolvi-semantiikka (common voittaa → sivukartta → fi).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const C = require('../lib/tm_i18n_common.js');
const VP = require('../lib/tm_vp_i18n.js');
const L = require('../lib/tm_lang.js');
const libDir = join(__dir, '..', 'lib');

afterEach(() => { delete global.tmNykyinenKieli; });

describe('C1 — ei avainpäällekkäisyyttä sivukartan kanssa (dedupe pakotettu)', () => {
  it('keys(TM_VP_I18N.sv) ∩ keys(TM_I18N_COMMON.sv) === ∅', () => {
    const overlap = Object.keys(VP.TM_VP_I18N.sv).filter((k) => C.TM_I18N_COMMON.sv[k] !== undefined);
    expect(overlap).toEqual([]);
  });
  it('keys(TM_VP_I18N.en) ∩ keys(TM_I18N_COMMON.en) === ∅', () => {
    const overlap = Object.keys(VP.TM_VP_I18N.en).filter((k) => C.TM_I18N_COMMON.en[k] !== undefined);
    expect(overlap).toEqual([]);
  });
});

describe('C2 — glossaari-konformi tm_lang.js:ään', () => {
  it('Kehon valmius = tm_lang mittarit.kehon_valmius (Kroppslig beredskap)', () => {
    expect(C.TM_I18N_COMMON.sv['Kehon valmius']).toBe(L.TM_LANG.sv.mittarit.kehon_valmius);
    expect(C.TM_I18N_COMMON.sv['Kehon valmius']).toBe('Kroppslig beredskap');
  });
  it('keskeiset napit = tm_lang yleiset.*', () => {
    const y = L.TM_LANG.sv.yleiset;
    [['Tallenna', y.tallenna], ['Peruuta', y.peruuta], ['Sulje', y.sulje], ['Poista', y.poista],
      ['Muokkaa', y.muokkaa], ['Takaisin', y.takaisin]].forEach(([fi, sv]) => {
      expect(C.TM_I18N_COMMON.sv[fi]).toBe(sv);
    });
  });
});

describe('C3 — drift-vartija: 0 kiellettyä Kehon valmius -varianttia i18n-libeissä', () => {
  it('lib/tm_i18n_common.js + lib/tm_vp_i18n.js → /kroppens beredskap|kroppsberedskap/i = 0', () => {
    const rx = /kroppens beredskap|kroppsberedskap/i;
    ['tm_i18n_common.js', 'tm_vp_i18n.js'].forEach((f) => {
      const src = readFileSync(join(libDir, f), 'utf8');
      expect(rx.test(src)).toBe(false);
    });
  });
});

describe('C4 — resolvi-semantiikka (tmI18nResolve)', () => {
  it('fi-tila → fi; sv → common; tuntematon → fi', () => {
    global.tmNykyinenKieli = () => 'fi';
    expect(C.tmI18nResolve('Tallenna', {})).toBe('Tallenna');
    global.tmNykyinenKieli = () => 'sv';
    expect(C.tmI18nResolve('Tallenna', {})).toBe('Spara');
    expect(C.tmI18nResolve('EI OLE ZZZ', {})).toBe('EI OLE ZZZ');
    expect(C.tmI18nResolve(null, {})).toBe(null);
  });
  it('common VOITTAA sivukartan; sivukartta vain kun common ei määrittele', () => {
    global.tmNykyinenKieli = () => 'sv';
    const page = { sv: { 'Tallenna': 'EI-TÄTÄ', 'VP-oma': 'VP-svenska' } };
    expect(C.tmI18nResolve('Tallenna', page)).toBe('Spara');   // common voittaa
    expect(C.tmI18nResolve('VP-oma', page)).toBe('VP-svenska');   // vain sivukartassa → sieltä
  });
  it('VP.vpT delegoi: yhteinen (Logga ut) commonista, VP-spesifi (Åtgärder) sivukartasta, glossaari korjattu', () => {
    global.tmNykyinenKieli = () => 'sv';
    expect(VP.vpT('Kirjaudu ulos')).toBe('Logga ut');   // common
    expect(VP.vpT('Toimenpiteet')).toBe('Åtgärder');    // VP-sivukartta
    expect(VP.vpT('Kehon valmius')).toBe('Kroppslig beredskap');   // drift korjattu (common)
    expect(VP.vpT('Pujottelu')).toBe('Slalom');         // Kim-virhe korjattu (common)
  });
});
