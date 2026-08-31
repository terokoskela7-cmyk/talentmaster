/**
 * TalentMaster - i18n Vaihe 5 (henkilöstö) · VP_v25 · Vaihe 0: infra + aina-näkyvä chrome.
 * String-avainkartta (fi → sv) lib/tm_vp_i18n.js (Kim-muisti, sanktioitu) + vpT()/vpLokalisoi(data-i18n).
 * Chrome (nav/topbar/page-titlet/login) tagattu data-i18n:llä; kielivalitsin + Osa B (seura.kieli) kytketty.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

afterEach(() => { delete global.tmNykyinenKieli; });

describe('lib/tm_vp_i18n.js — string-avainkartta + vpT', () => {
  const M = require('../lib/tm_vp_i18n.js');
  it('sv-kartta iso (Kim-muisti, >=2000 paria)', () => {
    expect(Object.keys(M.TM_VP_I18N.sv).length).toBeGreaterThanOrEqual(2000);
  });
  it('vpT: sv chrome-käännökset (fi-avain → sv)', () => {
    global.tmNykyinenKieli = () => 'sv';
    ['Pelaajat:Spelare', 'Kalenteri:Kalender', 'Tilanne:Läge', 'Valmentajat:Tränare',
      'Raportointi:Rapportering', 'Asetukset:Inställningar', 'Kirjaudu ulos:Logga ut',
      'Koti:Hem', 'Joukkueet:Lag', 'Raportit:Rapporter', 'Testit:Tester', 'Lisää:Mer',
      'Kirjaa ja tuo testituloksia:Registrera och importera testresultat'].forEach((p) => {
      const [fi, sv] = p.split(':');
      expect(M.vpT(fi)).toBe(sv);
    });
  });
  it('fi ei rikkoudu: ei kieltä → fi; puuttuva avain → fi', () => {
    expect(M.vpT('Pelaajat')).toBe('Pelaajat');   // ei globaalia → fi
    global.tmNykyinenKieli = () => 'sv';
    expect(M.vpT('EI OLE KARTASSA XYZ')).toBe('EI OLE KARTASSA XYZ');
    expect(M.vpT(null)).toBe(null);
  });
});

describe('VP_v25 infra kytketty', () => {
  it('lataa tm_lang ?v=9 (ei stale ?v=1) + tm_vp_i18n', () => {
    expect(VP).toMatch(/lib\/tm_lang\.js\?v=([9]|\d\d)/);
    expect(VP).toContain('lib/tm_vp_i18n.js');
    expect(VP).not.toContain('lib/tm_lang.js?v=1"');
  });
  it('kielivalitsin kytketty (FI/SV/EN → vpVaihdaKieli, ei staattinen)', () => {
    expect(VP).toContain("vpVaihdaKieli('fi')");
    expect(VP).toContain("vpVaihdaKieli('sv')");
    expect(VP).toContain("vpVaihdaKieli('en')");
    expect(VP).toContain('function vpVaihdaKieli(lang)');
    expect(VP).toContain('function vpPaivitaKielivalitsin()');
  });
  it('Osa B: seura.kieli → tmKieliInitSeura (VP autentikoitu → lukee seura-dokin) + vpLokalisoi kutsuttu', () => {
    expect(VP).toContain('tmKieliInitSeura');
    expect(VP).toContain("collection('seurat').doc(_seuraId).get()");
    expect(VP).toContain('vpLokalisoi()');
  });
});

describe('VP_v25 chrome tagattu data-i18n:llä', () => {
  it('nav-tabit data-i18n (6)', () => {
    ['Koti', 'Joukkueet', 'Valmentajat', 'Raportit', 'Testit', 'Lisää'].forEach((t) =>
      expect(VP).toContain('<span class="tb-lbl" data-i18n="' + t + '">' + t + '</span>'));
  });
  it('page-titlet data-i18n (8)', () => {
    ['Asetukset', 'Kalenteri', 'Pelaajat', 'Raportointi', 'Seuranta', 'Valmentajat'].forEach((t) =>
      expect(VP).toContain('<div class="page-title" data-i18n="' + t + '">' + t + '</div>'));
  });
  it('login + topbar tagattu (data-i18n / -ph / -title)', () => {
    expect(VP).toContain('data-i18n="Valmennuspäällikkö"');
    expect(VP).toContain('data-i18n="Kirjaudu sisään"');
    expect(VP).toContain('data-i18n-ph="Salasana"');
    expect(VP).toContain('data-i18n-title="Kirjaudu ulos"');
    expect(VP).toContain('data-i18n="Ilmoitukset"');
  });
});
