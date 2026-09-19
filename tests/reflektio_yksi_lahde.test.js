/**
 * NAUHOITIN-YDIN: YKSI LÄHDE (lib/tm_aani.js), EI INLINE-KOPIOITA.
 *
 * MIKSI: nauhoitinta käyttää nyt KAKSI toisiinsa liittymätöntä ominaisuutta —
 * valmentajan reflektiopäiväkirja (lib/tm_reflektio.js) ja VP:n harjoitusarvioinnin
 * ääripalaute (VP_v25). Kopio kumpaankin olisi sama driftirakenne joka on purrut
 * ennenkin:
 *   · MAS-käännöskorjaus (§22) — sama kaava kolmessa tiedostossa, KOLME eri arvoa
 *   · PHV Mirwald-vakio (§25) — kolme kopiota, "päivitettävä yhdessä" käsin
 * Kumpikin huomattiin vasta kun luvut erosivat tuotannossa.
 *
 * Kohdejoukko = TOIMITETTAVA pinta (git-seuratut juuren *.html + lib/*.js). Docs ja
 * tests ovat ulkona tarkoituksella: briiffit ja tämä tiedosto SISÄLTÄVÄT symbolit
 * tekstinä, eivätkä ne suoritu.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');

const AANI = 'lib/tm_aani.js';
const REFLEKTIO = 'lib/tm_reflektio.js';
const APIT = ['TalentMaster_Master_v16.html', 'TalentMaster_VP_v25.html'];

/**
 * Nauhoittimen YDIN = selain-API:t joita ilman nauhoitinta ei voi toteuttaa.
 * Huom: `_refRecToggle` EI ole tässä — se on reflektion oma sidontanimi
 * (window-globaali + onclick=), ei nauhoitinkoodia. Sen vaatiminen samaan
 * tiedostoon pakottaisi väärän rakenteen: reflektiolomake saa omistaa oman
 * nappinsa, kunhan ydin on jaettu.
 */
const YDIN = ['getUserMedia', 'MediaRecorder'];

function kohdejoukko() {
  const ulos = execSync("git ls-files '*.html' 'lib/*.js'", { cwd: juuri, encoding: 'utf8' });
  return ulos.split('\n').map((s) => s.trim()).filter(Boolean);
}

function ytimenTiedostot() {
  return kohdejoukko().filter((f) => {
    let s = '';
    try { s = lue(f); } catch (e) { return false; }
    return YDIN.some((sym) => s.includes(sym));
  });
}

describe('Nauhoitin · yksi lähde', () => {
  it('EI VACUOUS: tm_aani on kohdejoukossa ja sisältää ytimen', () => {
    /* Ilman tätä portti olisi vihreä myös jos lib katoaisi tai tyhjenisi —
       "täsmälleen yksi tiedosto" toteutuisi nollalla tiedostolla. */
    expect(kohdejoukko(), 'lib ei ole git-seurattu → ls-files ei näe sitä').toContain(AANI);
    const lib = lue(AANI);
    YDIN.forEach((sym) => expect(lib, AANI + ' ei sisällä ' + sym).toContain(sym));
  });

  it('nauhoitinydin on TÄSMÄLLEEN yhdessä tiedostossa', () => {
    expect(ytimenTiedostot()).toEqual([AANI]);
  });

  it('reflektio KULUTTAA ytimen eikä toteuta sitä uudelleen', () => {
    const r = lue(REFLEKTIO);
    expect(r, 'reflektio ei kutsu tmAani.luo():ta').toContain('tmAani.luo(');
    YDIN.forEach((sym) => expect(r, 'reflektio toteuttaa ytimen uudelleen: ' + sym).not.toContain(sym));
  });

  it('appit eivät määrittele nauhoitinta inlinessä', () => {
    APIT.forEach((appi) => {
      const s = lue(appi);
      YDIN.forEach((sym) => expect(s, appi + ' sisältää ' + sym).not.toContain(sym));
    });
  });

  it('Master lataa tm_aanin ENNEN tm_reflektiota (mount kaatuisi muuten)', () => {
    /* tmReflektio.mount kutsuu global.tmAani.mount():ia. Väärä järjestys =
       ReferenceError heti latauksessa, eli koko Masterin inline-skripti kaatuu.
       Pelkkä "molemmat tagit löytyvät" ei riittäisi porttina. */
    const m = lue('TalentMaster_Master_v16.html');
    const iAani = m.indexOf('src="lib/tm_aani.js');
    const iRefl = m.indexOf('src="lib/tm_reflektio.js');
    expect(iAani, 'tm_aani.js-tagi puuttuu').toBeGreaterThan(-1);
    expect(iRefl, 'tm_reflektio.js-tagi puuttuu').toBeGreaterThan(-1);
    expect(iAani).toBeLessThan(iRefl);
  });

  it('Master kutsuu mountia — se asentaa window._ref*-globaalit', () => {
    /* Päiväkirjan onclick="_refUusi()" toimii VAIN mountin asentamien globaalien
       kautta (§7.17). Jos mount katoaa, nappi kuolee hiljaa: ei virhettä, ei
       modaalia. Siksi tämä on oma porttinsa eikä osa lataustestiä. */
    const master = lue('TalentMaster_Master_v16.html');
    expect(master).toContain('tmReflektio.mount(');
    expect(master, 'päiväkirja kutsuu yhä _refUusi():ta').toContain('onclick="_refUusi()"');
  });

  it('reflektio asentaa kaikki onclick=-lomakkeen tarvitsemat globaalit', () => {
    /* Lomakkeen HTML on libissä ja viittaa näihin nimiin. Jos mount unohtaa yhden,
       vika näkyy vasta kun käyttäjä klikkaa juuri sitä nappia. */
    const lib = lue(REFLEKTIO);
    const kutsut = [...lib.matchAll(/onclick="(_ref[A-Za-z]+)\(/g)].map((m) => m[1]);
    expect(kutsut.length, 'EI VACUOUS: lomakkeessa on onclick-kutsuja').toBeGreaterThan(0);
    [...new Set(kutsut)].forEach((nimi) => {
      expect(lib, 'mount ei asenna ' + nimi).toMatch(new RegExp('global\\.' + nimi + '\\s*='));
    });
  });

  it('nauhoitin ei päätä Storage-polkua — kutsuja antaa sen', () => {
    /* Ydin palvelee polkuja joilla on ERI näkyvyys (reflektio = vain oma uid ·
       palaute_jaettu = seura kuulee · palaute_yksityinen = johto-only). Jos ydin
       kovakoodaisi polun, toinen käyttö joutuisi kopioimaan sen. */
    const a = lue(AANI);
    expect(a, 'nauhoitin kovakoodaa reflektiopolun').not.toContain('/reflektiot');
    expect(a, 'lataa() ei ota kansiota parametrina').toMatch(/function lataa\(kansio/);
  });
});
