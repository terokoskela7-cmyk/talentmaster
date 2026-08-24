/**
 * TalentMaster™ — i18n V1-A: Pelaaja_v7 konsolidointi + ydinpinta.
 * Rinnakkainen STR/loc/tm_loc-järjestelmä konsolidoitu jaettuun lib/tm_lang.js:ään (periaate #1: yksi käännöslähde).
 * T() delegoi t():hen · yksi kielitila tm_kieli (tm_loc poistettu + kertamigraatio de→fi) · DE pudotettu · xpHint EI migroitu (§7.22).
 * INVARIANTIT: fi ei rikkoudu (fallback) · sv/en täydelliset migroiduille avaimille · ei STR-taulukkoa · ei DE-nappia.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const L = require('../lib/tm_lang.js');
const PEL = readFileSync(join(__dir, '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');

const MIGR = { // migroidut STR-avaimet → tm_lang-polut
  'nav.tanaan': ['Tänään', 'Idag', 'Today'], 'nav.mina': ['Minä', 'Jag', 'Me'], 'nav.meista': ['Meistä', 'Om oss', 'About us'],
  'yleiset.takaisin': ['Takaisin', 'Tillbaka', 'Back'], 'yleiset.aloita': ['Aloita', 'Starta', 'Start'],
  'yleiset.valmistaudu': ['Valmistaudu', 'Gör dig redo', 'Get ready'], 'yleiset.tauko': ['Tauko', 'Paus', 'Pause'],
  'yleiset.jatka': ['Jatka', 'Fortsätt', 'Resume'], 'yleiset.takaisin_kotiin': ['Takaisin kotiin', 'Till startsidan', 'Back home'],
  'yleiset.valmis': ['Valmis', 'Klar', 'Done'],
  'pelaaja.tervetuloa_takaisin': ['Tervetuloa takaisin', 'Välkommen tillbaka', 'Welcome back'],
  'pelaaja.streak': ['🔥 Aloita putki tänään.', '🔥 Börja din serie idag.', '🔥 Start your streak today.'],
  'pelaaja.aloita_5min': ['Aloita · 5 min', 'Starta · 5 min', 'Start · 5 min'],
  'pelaaja.paivan_ohjelma': ['Päivän henkilökohtainen ohjelma', 'Dagens personliga program', 'Your personal program today'],
  'pelaaja.muuta_tanaan': ['Muuta tänään', 'Övrigt idag', 'Other today'],
  'pelaaja.unohtuiko_pin': ['Unohtuiko PIN?', 'Glömt PIN?', 'Forgot PIN?'],
  'pelaaja.syota_pin': ['Syötä PIN', 'Ange PIN', 'Enter PIN'],
};

describe('tm_lang — migroidut STR-avaimet fi/sv/en (STR-taulukko → jaettu lähde)', () => {
  Object.entries(MIGR).forEach(([polku, [fi, sv, en]]) => {
    it(`${polku} = fi/sv/en oikein`, () => {
      L.tmAsetaKieli('fi', false); expect(L.t(polku)).toBe(fi);
      L.tmAsetaKieli('sv', false); expect(L.t(polku)).toBe(sv);
      L.tmAsetaKieli('en', false); expect(L.t(polku)).toBe(en);
      L.tmAsetaKieli('fi', false);
    });
  });
  it('pelaaja-kategoria on olemassa kaikilla kielillä', () => {
    ['fi', 'sv', 'en'].forEach((k) => expect(typeof L.TM_LANG[k].pelaaja).toBe('object'));
  });
  it('xpHint EI migroitu tm_lang:iin (§7.22 XP-kieli kielletty)', () => {
    ['fi', 'sv', 'en'].forEach((k) => expect(L.TM_LANG[k].pelaaja.xpHint).toBeUndefined());
    expect(L.TM_LANG.fi.pelaaja).not.toHaveProperty('xpHint');
  });
});

describe('Pelaaja_v7 — konsolidointi (yksi käännöslähde, ei rinnakkaistaulukkoa)', () => {
  it('vanha STR-taulukko poistettu (ei const STR = { fi/en/sv/de })', () => {
    expect(PEL).not.toContain("wBack:   {fi:'Tervetuloa takaisin'");
    expect(PEL).not.toContain("xpHint:  {fi:'+40 XP");
  });
  it('_TMAP-avainmäppäys + T() delegoi t():hen', () => {
    expect(PEL).toContain('var _TMAP = {');
    expect(PEL).toContain("const T = k => (typeof t === 'function' ? t(_TMAP[k] || ('pelaaja.' + k)) : k);");
    expect(PEL).toContain("mina:'nav.mina'");
    expect(PEL).toContain("done:'yleiset.valmis'");
  });
  it('yksi kielitila: setLoc → tmAsetaKieli (tm_loc poistettu; ei erillistä loc-tilaa)', () => {
    expect(PEL).toContain('if (typeof tmAsetaKieli === \'function\') tmAsetaKieli(l, true);');
    expect(PEL).not.toContain("let loc = localStorage.getItem('tm_loc')");
  });
  it('kertamigraatio tm_loc → tm_kieli (de → fi), sitten tm_loc poistetaan', () => {
    expect(PEL).toContain("localStorage.setItem('tm_kieli', vanhaLoc === 'de' ? 'fi' : vanhaLoc)");
    expect(PEL).toContain("localStorage.removeItem('tm_loc')");
  });
});

describe('Pelaaja_v7 — kielivalitsin FI/SV/EN (ei DE) + ydinpinta + cache-bust', () => {
  it('kielivalitsin fi/sv/en, DE-nappi poistettu', () => {
    expect(PEL).toContain('onclick="setLoc(\'fi\')">FI</button>');
    expect(PEL).toContain('onclick="setLoc(\'sv\')">SV</button>');
    expect(PEL).toContain('onclick="setLoc(\'en\')">EN</button>');
    expect(PEL).not.toContain("setLoc('de')");
  });
  it('ydinpinta irrotettu t():hen (login: syota_pin, tervetuloa_takaisin, jatka_nuoli, kirjaudu_sahkopostilla)', () => {
    ['pelaaja.syota_pin', 'pelaaja.tervetuloa_takaisin', 'pelaaja.jatka_nuoli', 'pelaaja.kirjaudu_sahkopostilla'].forEach((k) => {
      expect(PEL).toContain("t('" + k + "')");
    });
  });
  it('tm_lang ?v=2 (uudet avaimet) + SW-cache v13', () => {
    expect(PEL).toMatch(/lib\/tm_lang\.js\?v=[2-9]/);
    expect(readFileSync(join(__dir, '..', 'sw_pelaaja.js'), 'utf8')).toMatch(/const CACHE = 'tm-pelaaja-v(1[3-9]|[2-9]\d)'/);
  });
  it('§7.1: konsolidointi ei tuo nested template literaleja (T-delegaatio on yksi rivi)', () => {
    expect(PEL).toContain("const T = k => (typeof t === 'function'");
  });
});
