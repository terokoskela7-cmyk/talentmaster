/**
 * TalentMaster - i18n Vaihe 5 · Raita B: Valmentaja (Master_v16) sv-wiraus commonin päälle.
 * B1 = infra + kieli-init + aina-näkyvä chrome (navi/topbar/login/ws-tabit/tabbar). Sivukartta
 * lib/tm_master_i18n.js (Kim), delegoi tm_i18n_common.js:ään (masterT/masterLokalisoi). C1: Master∩common=∅.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const MA = require('../lib/tm_master_i18n.js');
const C = require('../lib/tm_i18n_common.js');
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_Master_v16.html'), 'utf8');

afterEach(() => { delete global.tmNykyinenKieli; });

describe('Master-kartta + masterT (delegoi commoniin)', () => {
  it('sv-kartta iso (Kim, >=1000 avainta) + en tyhjä (fi-fallback)', () => {
    expect(Object.keys(MA.TM_MASTER_I18N.sv).length).toBeGreaterThanOrEqual(1000);
  });
  it('masterT: Master-avaimet sv + common voittaa (glossaari/roolit kanonissa)', () => {
    global.tmNykyinenKieli = () => 'sv';
    [['Havainnot', 'Observationer'], ['Pulssi', 'Puls'], ['Kehitys', 'Utveckling'], ['Valikko', 'Meny'],
      ['Kuorma & fiilis', 'Belastning & känsla'], ['Komennot', 'Kommandon']].forEach(([fi, sv]) =>
      expect(MA.masterT(fi)).toBe(sv));
    // common voittaa (ei sivukartassa): glossaari + roolit kanonisina
    expect(MA.masterT('Kehon valmius')).toBe('Kroppslig beredskap');
    expect(MA.masterT('Pelaajat')).toBe('Spelare');            // common
    expect(MA.masterT('Talenttivalmentaja')).toBe('Talangtränare');   // common (ei Kimin Talenttränare)
    expect(MA.masterT('Fysiikkavalmentaja')).toBe('Fystränare');
  });
  it('fi-fallback: ei kieltä → fi; puuttuva avain → fi', () => {
    expect(MA.masterT('Havainnot')).toBe('Havainnot');   // ei globaalia → fi
    global.tmNykyinenKieli = () => 'sv';
    expect(MA.masterT('EI OLE KARTASSA ZZZ')).toBe('EI OLE KARTASSA ZZZ');
  });
});

describe('Master B1 infra + chrome wiring', () => {
  it('latausjärjestys: tm_lang → tm_i18n_common?v=2 → tm_master_i18n?v=1', () => {
    expect(HTML).toContain('lib/tm_i18n_common.js?v=2');
    expect(HTML).toContain('lib/tm_master_i18n.js?v=1');
    const iC = HTML.indexOf('tm_i18n_common.js'), iM = HTML.indexOf('tm_master_i18n.js');
    expect(iC).toBeGreaterThan(0); expect(iM).toBeGreaterThan(iC);   // common ENNEN sivukarttaa
  });
  it('kieli-init (Osa B: seura.kieli → tmKieliInitSeura) + masterLokalisoi + kielivalitsin', () => {
    expect(HTML).toContain('tmKieliInitSeura');
    expect(HTML).toContain("collection('seurat').doc(_seuraId).get()");
    expect(HTML).toContain('masterLokalisoi()');
    expect(HTML).toContain('function masterVaihdaKieli(lang)');
    expect(HTML).toContain("masterVaihdaKieli('sv')");
  });
  it('aina-näkyvä chrome data-i18n:llä (sidebar/ws-tabit/tabbar/login)', () => {
    ['Havainnot', 'Pulssi', 'Kausi', 'Testit', 'Valikko', 'Työkalut', 'Kehitys',
      'Kirjaudu sisään', 'Valmentajan näkymä · v16'].forEach((t) =>
      expect(HTML).toContain('data-i18n="' + t + '"'));
    expect(HTML).toContain('data-i18n-ph="Sähköposti"');
    expect(HTML).toContain('data-i18n-title="Vaihda teema"');
  });
});
