/**
 * TalentMaster - i18n Vaihe 5 · VP_v25 · Vaihe 2: Pelaajat-näkymä + 5 dynaamista pintaa
 * (Kehityslohko/Talentit/Poikkeamat/Pelaajataulukko/IDP-jono). Staattinen chrome → data-i18n;
 * dynaaminen render → vpT; glossaari commonista; tuotetermit verbatim.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const M = require('../lib/tm_vp_i18n.js');
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

afterEach(() => { delete global.tmNykyinenKieli; });

describe('V2 avainkattavuus (Pelaajat + 5 korttia)', () => {
  it('V2-avaimet resolvoituvat sv:ksi (≠ fi)', () => {
    global.tmNykyinenKieli = () => 'sv';
    [['Talentti-IDP', 'Talang-IDP'], ['Ehdota', 'Föreslå'], ['Ikäluokka → Kehitysvaihe', 'Åldersklass → Utvecklingsfas'],
      ['Ei pelaajia tässä kategoriassa', 'Inga spelare i denna kategori'], ['Ei odottavia IDP-ehdotuksia', 'Inga väntande IDP-förslag'],
      ['Kiihdytys', 'Acceleration'], ['Datapuute', 'Databrist'], ['Harkitse talenttiohjelmaan', 'Överväg talangprogrammet'],
      ['Vauhti', 'Takt'], ['Jkl', 'Lag'], ['Ikävaihe-odotetut (ei kiireellisiä)', 'Åldersfas-förväntade (ej brådskande)']].forEach(([fi, sv]) =>
      expect(M.vpT(fi)).toBe(sv));
  });
  it('glossaari commonista: kehon valmius kanoni + laji-nimet (Pujottelu→Slalom) ilman driftiä', () => {
    global.tmNykyinenKieli = () => 'sv';
    expect(M.vpT('Kehon valmius -profiili')).toBe('Kroppslig beredskap-profil');   // VP-avain, drift korjattu
    expect(M.vpT('Pujottelu')).toBe('Slalom');   // _talenttiHuomio käyttää vpT(_TAL_LAJINIMI[kk]) → commonista
    expect(/kroppens/i.test(M.vpT('Hidden Gem · X-Factor · IDP-jono · Kehon valmius -jakauma'))).toBe(false);
  });
  it('tuotetermit verbatim (TKI/H-H/PHV/Hidden Gem säilyvät sv-arvoissa)', () => {
    global.tmNykyinenKieli = () => 'sv';
    expect(M.vpT('Korkea tekniikka + matala fysiikka (Hidden Gem, §28) — ei vielä talenttiohjelmassa')).toContain('Hidden Gem');
    expect(M.vpT('muu lähde (SM/TSI, H-H syöttö/pujottelu tai TK-lajit). Kehon valmius ja H-H samalla 1–5-asteikolla.')).toContain('H-H');
  });
});

describe('V2 wiring: staattinen chrome data-i18n + dynaaminen render vpT', () => {
  it('staattiset filtterit + taulukko-otsikot data-i18n:llä', () => {
    ['⚠ Kehityskohde', '◉ PHV-vaihe', '★ Talenttisuositus', '⭐ Underdog', 'Kaikki pelaajat', 'Kehitysfokus'].forEach((t) =>
      expect(VP).toContain('data-i18n="' + t + '"'));
    // footer jaettu span+sup (data-i18n-html ei; sup säilyy)
    expect(VP).toContain('<sup>1</sup>');
  });
  it('dynaamiset render-funktiot käyttävät vpT():tä', () => {
    expect(VP).toContain("vpT('Ei talentteja merkitty')");
    expect(VP).toContain("vpT('Talentit — extra-valmennuksen kohteet')");
    expect(VP).toContain("vpT('Ei poikkeamia — kaikki joukkueet odotetulla tasolla.')");
    expect(VP).toContain("vpT('Ei odottavia IDP-ehdotuksia')");
    expect(VP).toContain('vpT(k.nimi)');    // Kehityskortti label render-siteillä
    expect(VP).toContain('vpT(_TAL_LAJINIMI[kk] || kk)');   // laji-nimi commonista
  });
  it('cache-bust tm_vp_i18n.js?v=8', () => {
    expect(VP).toMatch(/tm_vp_i18n\.js\?v=([89]|\d\d)/);
  });
});
