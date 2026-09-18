/**
 * VP · (A) kielivalitsin tavoitettavissa mobiilissa · (B) lajinimen reititys.
 *
 * (A) JUURISYY: `#topbar .topbar-lang { display:none }` ≤768px piilotti FI·EN·SV-valitsimen
 * puhelimessa kokonaan, eikä sitä ollut missään muualla → kieltä ei päässyt vaihtamaan
 * mobiilissa lainkaan. Korjaus: kopio sivupalkkiin (mobiilin navipinta).
 * Kaksi asiaa on pakko pysyä voimassa:
 *   1. sivupalkin valitsin säilyttää `topbar-lang`-luokan — aktiivikorostuksen päivitin kyselee
 *      `.topbar-lang [data-lang]`, ja ilman luokkaa sivupalkin kopio jäisi korostamatta
 *   2. sen tap-alue on sormenkokoinen mobiilissa (11–12px teksti yksin ei ole)
 *
 * (B) JUURISYY: kritsignaali näytti "Syöttö svagaste utvecklingsområde" — lajinimi luettiin
 * reitittämättömästä `TK_LAJI_NIMET`-taulukosta. Nimet ovat COMMONissa (Syöttö→Passning), joten
 * kyse oli pelkästä reitityksestä. Reititys tehtiin APURIN SISÄLLE, koska nimeä näytetään
 * kuudessa eri kohdassa — yhden kutsupaikan paikkaus olisi jättänyt loput vuotamaan.
 * DATA-arvo (treeniteeman avain) EI saa kääntyä → oma `_vpTkLajiRaaka`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const MASTER = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');

const C = require('../lib/tm_i18n_common.js');
global.TM_I18N_COMMON = C.TM_I18N_COMMON;
global.tmI18nResolve = C.tmI18nResolve;
const { vpT } = require('../lib/tm_vp_i18n.js');
const kielella = (k, fn) => {
  const vanha = global.tmNykyinenKieli;
  global.tmNykyinenKieli = () => k;
  try { return fn(); } finally { global.tmNykyinenKieli = vanha; }
};

/**
 * KAIKKI ≤768px-lohkot yhdistettyna. VP:ssa niita on kaksi (rivit 788 ja 2127) — yhden
 * poimiminen olisi osunut vaaraan. (CLAUDE.md §6 suosittaa yhta lohkoa per tiedosto; VP:n
 * kahtiajako on olemassa oleva poikkeama, ei taman eran asia.)
 */
function mobiililohko(html) {
  const palat = [];
  let i = html.indexOf('@media (max-width: 768px)');
  expect(i, 'mobiililohkoa ei löytynyt').toBeGreaterThan(0);
  while (i >= 0) { palat.push(html.slice(i, i + 4000)); i = html.indexOf('@media (max-width: 768px)', i + 1); }
  return palat.join('\n');
}

describe('A · kielivalitsin mobiilissa', () => {
  it('yläpalkin valitsin on yhä piilossa ≤768px (ahdas rivi — ei regressiota)', () => {
    expect(mobiililohko(VP)).toContain('#topbar .topbar-lang { display: none; }');
  });

  it('sivupalkissa on korvaava valitsin KAIKILLA kolmella kielellä', () => {
    const i = VP.indexOf('class="sb-lang');
    expect(i, 'sivupalkin valitsin puuttuu → mobiilissa ei pääse vaihtamaan kieltä').toBeGreaterThan(0);
    const lohko = VP.slice(i, i + 700);
    for (const k of ['fi', 'en', 'sv']) expect(lohko).toContain(`data-lang="${k}"`);
    expect(lohko).toContain('vpVaihdaKieli(');
  });

  it('sivupalkin valitsin on topbar-lang-säiliössä → aktiivikorostus päivittyy siihenkin', () => {
    // Päivitin: document.querySelectorAll('.topbar-lang [data-lang]')
    expect(VP).toContain("querySelectorAll('.topbar-lang [data-lang]')");
    const i = VP.indexOf('class="sb-lang');
    expect(VP.slice(i, i + 60), 'ilman topbar-lang-luokkaa korostus jäisi päivittymättä')
      .toContain('topbar-lang');
  });

  it('tap-alue on sormenkokoinen mobiilissa (≥44px, ei 11px tekstiä)', () => {
    const m = mobiililohko(VP);
    expect(m).toMatch(/\.sb-lang \.lang-opt \{[^}]*min-width: 44px/);
    expect(m).toMatch(/\.sb-lang \.lang-opt \{[^}]*min-height: 44px/);
  });

  it('Master-pariteetti: valitsin on sivupalkissa ja tap-alue kasvatettu mobiilissa', () => {
    // Masterissa rakenne oli jo oikein (.sb-bot sivupalkin footerissa) — vain kosketuskoko puuttui.
    const i = MASTER.indexOf('class="lang-switch"');
    expect(i).toBeGreaterThan(0);
    expect(MASTER.slice(Math.max(0, i - 1200), i), 'Masterin valitsin ei ole sivupalkissa').toContain('sb-bot');
    expect(mobiililohko(MASTER)).toMatch(/\.lang-switch \.lang-opt \{[^}]*min-height: 44px/);
  });
});

describe('B · lajinimen reititys (näyttö käännetään, data ei)', () => {
  it('reititys on APURIN sisällä, ei kutsupaikoissa', () => {
    expect(VP).toContain('function _vpTkLaji(id) { return vpT(_vpTkLajiRaaka(id)); }');
    expect(VP).toContain('function _vpTkLajiRaaka(id) { return TK_LAJI_NIMET[id]');
  });

  it('sv: lajinimet kääntyvät (ne ovat COMMONissa — pelkkä reititys riitti)', () => {
    const parit = { 'Syöttö': 'Passning', 'Pujottelu': 'Slalom', 'Ponnauttelu': 'Jonglering' };
    kielella('sv', () => {
      for (const [fi, sv] of Object.entries(parit)) expect(vpT(fi)).toBe(sv);
    });
  });

  it('kritsignaali: NÄYTTÖnimi käännetty, DATA-arvo raaka', () => {
    const i = VP.indexOf("kortit.push({ ik:'🎯'");
    expect(i).toBeGreaterThan(0);
    const rivi = VP.slice(i, i + 460);
    expect(rivi, 'näyttöteksti käyttää käännettyä nimeä').toContain('txt: kn +');
    expect(rivi, 'treeniteeman data-arvo saisi ruotsinnetun avaimen').toContain('esc(knData)');
    expect(rivi).not.toContain('esc(kn)');
  });

  it('sentinelivertailua ei tehdä näyttönimestä (se kääntyy)', () => {
    // Aiemmin: if (n && n !== 'Ei tietoa') — sv:ssä 'Ingen info' olisi rikkonut ehdon.
    expect(VP).not.toContain("n !== 'Ei tietoa'");
    expect(VP).toContain('TK_LAJI_NIMET[p.tki_vahvuus]');
  });

  it('HH-fokusnimi reititetään samoin (sama vuotoluokka)', () => {
    expect(VP).toContain('_VP_HH_FOKUS_NIMI[k] ? vpT(_VP_HH_FOKUS_NIMI[k])');
  });
});

/**
 * C · YLÄPALKKI EI SAA VUOTAA IKONIEN ALLE (mobiili).
 *
 * JUURISYY: `.topbar-breadcrumb` oli `flex:1; min-width:0` MUTTEI `overflow:hidden`. Flex antoi
 * laatikon kutistua, mutta lapset piirtyivät silti sen yli → 390px:ssä "KPV" leikkautui pois
 * vasemmalta ja kello peitti aktiivisen näkymän nimen ("T🔔NNE").
 *
 * ⚠ Tätä EI näe laatikkomittauksesta: elementin getBoundingClientRect päättyi oikeaan kohtaan
 * (242px) eikä ylivuotoa raportoitu (scrollWidth == clientWidth) — vain TEKSTI vuoti. Siksi
 * portti tarkistaa CSS-ehdot, ei mittoja.
 */
describe('C · yläpalkin murupolku mobiilissa', () => {
  it('murupolku on overflow-lukittu (muuten teksti valuu ikonien alle)', () => {
    expect(VP).toMatch(/#topbar \.topbar-breadcrumb \{ overflow: hidden; \}/);
  });

  it('oikea laita ei kutistu murupolun tieltä', () => {
    expect(VP).toMatch(/#topbar \.topbar-right \{ flex: 0 0 auto; \}/);
  });

  it('mobiilissa pudotetaan STAATTINEN rooli-pala, ei seuraa eikä näkymää', () => {
    const m = mobiililohko(VP);
    expect(m).toMatch(/#topbar \.bc-rooli, #topbar \.bc-rooli \+ \.bc-sep \{ display: none; \}/);
    // Seura ja aktiivinen näkymä EIVÄT saa olla piilotuslistalla — ne ovat murupolun sisältö.
    expect(m).not.toMatch(/\.bc-seura[^{]*\{[^}]*display: none/);
    expect(m).not.toMatch(/\.bc-active[^{]*\{[^}]*display: none/);
  });

  it('rooli-palalla on oma luokka (positiovalitsin olisi hauras)', () => {
    expect(VP).toContain('<span class="bc-rooli" data-i18n="Valmennuspäällikkö">');
  });

  it('aktiivinen näkymä typistyy ellipsillä eikä työnnä muita', () => {
    expect(VP).toMatch(/#topbar \.bc-active \{[^}]*text-overflow:ellipsis/);
  });
});
