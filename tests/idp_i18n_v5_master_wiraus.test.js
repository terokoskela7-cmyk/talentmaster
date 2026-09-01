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
    expect(HTML).toMatch(/lib\/tm_master_i18n\.js\?v=[1-9]/);
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

describe('Master B2a: koti-klusteri (hero/greeting/date/Aloita tästä/signaalit) masterT', () => {
  it('koti-avaimet + koti-spesifit fragmentit resolvoituvat sv:ksi', () => {
    global.tmNykyinenKieli = () => 'sv';
    [['Mitä sinun pitää tehdä', 'Vad du behöver göra'], ['Havainnoi', 'Observera'], ['Lähetä klinikkaan', 'Skicka till klinik'],
      [' pelaajaa ilman tuoretta havaintoa (30 pv)', ' spelare utan färsk observation (30 dgr)'],
      ['aktiivista/vko', 'aktiva/vecka'], ['Katso oman joukkueesi pelaajat', 'Se ditt lags spelare'],
      ['Hyvää iltaa', 'God kväll'], ['tiistai', 'tisdag'], ['syyskuuta', 'september'], ['VIIKKO', 'VECKA']].forEach(([fi, sv]) =>
      expect(MA.masterT(fi)).toBe(sv));
  });
  it('koti-render + coach-kortti kutsuvat masterT:tä; B1-jäänteet korjattu', () => {
    expect(HTML).toContain("masterT(' pelaajaa kehon valmius alle 40 (klinikkalähetys)')");
    expect(HTML).toContain("masterT('Mitä sinun pitää tehdä')");
    expect(HTML).toContain("masterT('Katso oman joukkueesi pelaajat')");
    expect(HTML).toContain('masterT(pv)');   // _setDate viikonpäivä
    // B1-jäänteet: ws-tab Inbox → Viestit(Meddelanden); tabbar Lisää → Valikko(Meny)
    expect(HTML).toContain('<span data-i18n="Viestit">Viestit</span>');
    expect(HTML).toContain('<span class="tb-lbl" data-i18n="Valikko">Valikko</span>');
    expect(HTML).not.toContain('data-i18n="Inbox"');
  });
  it('cache-bust tm_master_i18n.js?v=2+', () => {
    expect(HTML).toMatch(/tm_master_i18n\.js\?v=([2-9]|\d\d)/);
  });
});

describe('Master B2b: ws-view STAATTINEN runko (data-i18n) — laajennettu gate (ei vain render-funktiot)', () => {
  // Skannaa ws-view-skeletonin (section-otsikot + pika-linkit) staattisen HTML:n; demo-preview (§3) sallittu fi.
  it('ws-view-lohkossa (r~1471-1770) 0 reitittämätöntä näkyvää fi-tekstiä (pl. demo-preview §3)', () => {
    const lines = HTML.split('\n');
    const DEMO = ['pelaajaa kirjannut', 'per pelaaja. Suurin', 'joukkuekaverien välistä', 'seinäsyötöt', 'Viikko 17 ·',
      'Kausi 25/26 · 17', 'vs 3', '1 vs'];   // §3 demo-preview-captionit + kovakoodatut demo-arvot
    const orphan = [];
    for (let i = 1470; i < 1770 && i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('data-i18n')) continue;
      const re = />([^<>{}]+)</g; let m;
      while ((m = re.exec(line))) {
        const t = m[1].trim();
        if ((t.match(/[A-Za-zÀ-ÿ]/g) || []).length < 3) continue;
        if (DEMO.some((d) => t.includes(d))) continue;
        if (/[äöåÄÖÅ]/.test(t) || (/[a-zäöå]{3}/i.test(t) && t.includes(' '))) orphan.push(t.slice(0, 40));
      }
    }
    expect(orphan).toEqual([]);
  });
  it('ws-view chrome resolvoituu (Master + common); Inbox-otsikko→Meddelanden, filtteri→Inkorg', () => {
    global.tmNykyinenKieli = () => 'sv';
    expect(MA.masterT('Viimeiset havainnot')).toBe('Senaste observationer');
    expect(MA.masterT('+ Uusi havainto')).toBe('+ Ny observation');
    expect(MA.masterT('Live · Joukkueen pulssi')).toBe('Live · Lagets puls');
    expect(MA.masterT('Inbox')).toBe('Inkorg');             // filtteri-tab
    expect(MA.masterT('Viestit')).toBe('Meddelanden');      // otsikko (common)
    // staattiset elementit tagattu
    expect(HTML).toContain('data-i18n="Viimeiset havainnot"');
    expect(HTML).toContain('<h1 class="inbox-h1" data-i18n="Viestit">');
  });
});
