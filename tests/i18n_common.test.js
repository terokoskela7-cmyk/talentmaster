/**
 * TalentMaster - i18n Vaihe 0: jaettu lib/tm_i18n_common.js (glossaari-SSOT + jaetut stringit).
 * Konsistenssiportit: (1) ei avainpäällekkäisyyttä sivukarttojen kanssa · (2) glossaari-konformi tm_lang.js:ään ·
 * (3) drift-vartija (0 kiellettyä Kehon valmius -varianttia) · (4) resolvi-semantiikka (common voittaa → sivukartta → fi).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const C = require('../lib/tm_i18n_common.js');
const VP = require('../lib/tm_vp_i18n.js');
const MA = require('../lib/tm_master_i18n.js');
const L = require('../lib/tm_lang.js');

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
  it('keys(TM_MASTER_I18N.sv) ∩ keys(TM_I18N_COMMON.sv) === ∅ (Raita B)', () => {
    const overlap = Object.keys(MA.TM_MASTER_I18N.sv).filter((k) => C.TM_I18N_COMMON.sv[k] !== undefined);
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
  it('roolikanoni (V0.1): Valmennuspäällikkö → Utvecklingsansvarig', () => {
    expect(C.TM_I18N_COMMON.sv['Valmennuspäällikkö']).toBe('Utvecklingsansvarig');
  });
});

describe('C3 — drift-vartija (laajennettu V0.1): 0 kiellettyä variantti AKTIIVISENA ARVONA', () => {
  // Skannaa parsitut objektiarvot (EI lähdetekstiä) → kommentit/avaimet eivät laukaise väärää failia.
  // Aja jokaiselle uudelle sivukartalle (Master/Seura) kun ne tulevat.
  const MAPS = [['common', C.TM_I18N_COMMON], ['VP', VP.TM_VP_I18N], ['Master', MA.TM_MASTER_I18N]];
  const KIELLETYT = [
    { rx: /kroppens beredskap|kroppsberedskap/i, kanoni: 'Kroppslig beredskap' },
    { rx: /Långspark/, kanoni: 'Längdspark' },
    { rx: /Framdrift-skott/, kanoni: 'Föring och skott' },
    { rx: /\bDribbling\b/, kanoni: 'Slalom' },   // laji-NIMI (iso alkukirjain, itsenäinen); jalkapallo-verbi "dribblingar" OK
    { rx: /Träningsansvarig/, kanoni: 'Utvecklingsansvarig' },
  ];
  it('yksikään aktiivinen sv/en-arvo ei sisällä kiellettyä glossaari/laji/rooli-varianttia', () => {
    const osumat = [];
    MAPS.forEach(([n, o]) => ['sv', 'en'].forEach((l) => {
      const m = o[l] || {};
      Object.keys(m).forEach((k) => KIELLETYT.forEach((f) => {
        if (typeof m[k] === 'string' && f.rx.test(m[k])) osumat.push(n + '.' + l + ' [' + k.slice(0, 30) + '] (kanoni: ' + f.kanoni + ')');
      }));
    }));
    expect(osumat).toEqual([]);
  });
  it('Utkast sallittu (Luonnos→Utkast) paitsi Ponnauttelu-avaimen arvona (kanoni Jonglering)', () => {
    const osumat = [];
    MAPS.forEach(([n, o]) => ['sv', 'en'].forEach((l) => {
      const v = (o[l] || {})['Ponnauttelu'];
      if (v && /Utkast/.test(v)) osumat.push(n + '.' + l);
    }));
    expect(osumat).toEqual([]);
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
    expect(VP.vpT('Valmennuspäällikkö')).toBe('Utvecklingsansvarig');   // V0.1 roolikanoni (commonista)
    expect(VP.vpT('Pituuspotku (bonus)')).toBe('Längdspark (bonus)');   // V0.1 laji-jäänne korjattu (VP-sivukartta)
  });
});
