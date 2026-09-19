/**
 * ÄÄNIREFLEKTIO: YKSI LÄHDE (lib/tm_reflektio.js), EI INLINE-DUPLIKAATTIA.
 *
 * MIKSI: reflektio tulee molempiin appeihin (Master + VP, Vaihe 3 antaa VP:lle täyden
 * päiväkirjan). Kaksi inline-kopiota olisi sama driftirakenne joka on purrut ennenkin:
 *   · MAS-käännöskorjaus (§22) — sama kaava kolmessa tiedostossa, KOLME eri arvoa
 *   · PHV Mirwald-vakio (§25) — kolme kopiota, "päivitettävä yhdessä" käsin
 * Kumpikin huomattiin vasta kun luvut erosivat tuotannossa. Portti estää saman
 * reflektiolta: recorder-koodi saa olla täsmälleen yhdessä tiedostossa.
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

const LIB = 'lib/tm_reflektio.js';
/** Recorder-ydin: nämä kolme riittävät tunnistamaan inline-kopion. */
const SYMBOLIT = ['getUserMedia', 'MediaRecorder', '_refRecToggle'];

/** Toimitettava pinta, git:n mukaan — ei kovakoodattua tiedostolistaa. */
function kohdejoukko() {
  const ulos = execSync("git ls-files '*.html' 'lib/*.js'", { cwd: juuri, encoding: 'utf8' });
  return ulos.split('\n').map((s) => s.trim()).filter(Boolean);
}

function symbolienTiedostot() {
  return kohdejoukko().filter((f) => {
    let s = '';
    try { s = lue(f); } catch (e) { return false; }
    return SYMBOLIT.some((sym) => s.includes(sym));
  });
}

describe('Äänireflektio · yksi lähde', () => {
  it('EI VACUOUS: lib on kohdejoukossa ja sisältää recorder-ytimen', () => {
    /* Ilman tätä portti olisi vihreä myös jos lib katoaisi tai tyhjenisi —
       "täsmälleen yksi tiedosto" toteutuisi nollalla tiedostolla. */
    expect(kohdejoukko(), 'lib ei ole git-seurattu → ls-files ei näe sitä').toContain(LIB);
    const lib = lue(LIB);
    SYMBOLIT.forEach((sym) => expect(lib, LIB + ' ei sisällä ' + sym).toContain(sym));
  });

  it('recorder-koodi on TÄSMÄLLEEN yhdessä tiedostossa', () => {
    expect(symbolienTiedostot()).toEqual([LIB]);
  });

  it('Master ei enää määrittele reflektiota inlinessä', () => {
    const master = lue('TalentMaster_Master_v16.html');
    SYMBOLIT.forEach((sym) => expect(master, 'Master sisältää yhä ' + sym).not.toContain(sym));
  });

  it('Master lataa libin (muuten tmReflektio on undefined ajossa)', () => {
    expect(lue('TalentMaster_Master_v16.html')).toMatch(/<script src="lib\/tm_reflektio\.js\?v=\d+"><\/script>/);
  });

  it('Master kutsuu mountia — se asentaa window._ref*-globaalit', () => {
    /* Päiväkirjan onclick="_refUusi()" toimii VAIN mountin asentamien globaalien
       kautta (§7.17). Jos mount katoaa, nappi kuolee hiljaa: ei virhettä, ei
       modaalia. Siksi tämä on oma porttinsa eikä osa lataustestiä. */
    const master = lue('TalentMaster_Master_v16.html');
    expect(master).toContain('tmReflektio.mount(');
    expect(master, 'päiväkirja kutsuu yhä _refUusi():ta').toContain('onclick="_refUusi()"');
  });

  it('lib asentaa kaikki onclick=-lomakkeen tarvitsemat globaalit', () => {
    /* Lomakkeen HTML on libissä ja viittaa näihin nimiin. Jos mount unohtaa yhden,
       vika näkyy vasta kun käyttäjä klikkaa juuri sitä nappia. */
    const lib = lue(LIB);
    const lomakkeenKutsut = [...lib.matchAll(/onclick="(_ref[A-Za-z]+)\(/g)].map((m) => m[1]);
    expect(lomakkeenKutsut.length, 'EI VACUOUS: lomakkeessa on onclick-kutsuja').toBeGreaterThan(0);
    [...new Set(lomakkeenKutsut)].forEach((nimi) => {
      expect(lib, 'mount ei asenna ' + nimi).toMatch(new RegExp('global\\.' + nimi + '\\s*='));
    });
  });
});
