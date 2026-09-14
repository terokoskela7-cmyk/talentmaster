/**
 * i18n V5 · Erä 4 -korjaus — MITTAUKSEN LÄHDELABEL (_vpMittausLahdeLabel).
 *
 * MIKSI OMA PORTTI: label syntyy FUNKTIOSSA (rivi ~10539) ja renderöityy kahdessa eri paikassa
 * MUUTTUJANA (_esc(g.lahde) mittauslistassa, _esc(lahdeLbl) tapahtumakortissa). Molemmat ovat
 * container-luokkaa (5): AST-gate näkee vain literaaleja, ja tuottajafunktio on RANGES-alueiden
 * ULKOPUOLELLA. Gate oli siis vihreä vaikka sv-tilassa renderöityi "Pikakirjaus"/"Testitapahtuma".
 *
 * Portti on kaksiosainen:
 *  (1) LÄHDEVÄITE — tuottaja palauttaa vpT-käärityn arvon molemmissa haaroissa, eikä kummallakaan
 *      kuluttajalla ole raakaa fallback-literaalia.
 *  (2) AJETTU RENDER — _vpMittausListaHTML ajetaan vm-sandboxissa sv-tilassa aidoilla riveillä ja
 *      todennetaan ettei outputissa ole fi-labeleita. Lähdeväite yksin ei riittäisi: se ei todista
 *      että kuluttaja tosiaan käyttää tuottajaa (vrt. erän 4 opetus — vasta render paljasti vuodon).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const juuri = join(__dir, '..');
const HTML = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const rivit = HTML.split('\n');

// Poimi funktio nimellä: alkurivi + tasapainotetut aaltosulkeet.
function poimi(nimi) {
  const i = rivit.findIndex((r) => r.includes('function ' + nimi + '('));
  if (i < 0) throw new Error('ei löydy: ' + nimi);
  let syvyys = 0, ulos = [];
  for (let j = i; j < rivit.length; j++) {
    ulos.push(rivit[j]);
    for (const c of rivit[j]) { if (c === '{') syvyys++; else if (c === '}') syvyys--; }
    if (syvyys === 0 && ulos.length > 0 && rivit[j].includes('}')) break;
  }
  return ulos.join('\n');
}
function poimiVar(nimi) {
  const i = rivit.findIndex((r) => r.trimStart().startsWith('var ' + nimi + ' =') || r.trimStart().startsWith('const ' + nimi + ' ='));
  if (i < 0) throw new Error('ei löydy: ' + nimi);
  let syvyys = 0, ulos = [];
  for (let j = i; j < rivit.length; j++) {
    ulos.push(rivit[j]);
    for (const c of rivit[j]) { if (c === '{') syvyys++; else if (c === '}') syvyys--; }
    if (syvyys === 0 && rivit[j].includes('}')) break;
  }
  return ulos.join('\n');
}

describe('mittauksen lähdelabel · lähdeväite', () => {
  it('tuottaja kääriä MOLEMMAT haarat vpT:hen (ei raakaa labelia)', () => {
    const f = poimi('_vpMittausLahdeLabel');
    expect(f).toContain("vpT('Pikakirjaus')");
    expect(f).toContain("vpT('Testitapahtuma')");
    // ei raakaa literaalia vpT:n ulkopuolella samassa funktiossa
    expect(f.replace(/vpT\('(Pikakirjaus|Testitapahtuma)'\)/g, '')).not.toMatch(/'(Pikakirjaus|Testitapahtuma)'/);
  });
  it('kuluttajilla ei raakaa fallback-literaalia', () => {
    const kuluttajat = rivit.filter((r) => r.includes('_vpMittausLahdeLabel(')).join('\n');
    expect(kuluttajat).not.toMatch(/:\s*'(Pikakirjaus|Testitapahtuma)'/);
    expect(kuluttajat).toContain("vpT('Testitapahtuma')");   // tapahtumakortin fallback reititetty
  });
  it("konkatenaatio-suffiksi ' pelaajaa' reititetty strippinä (välilyönti vpT:n ULKOPUOLELLA)", () => {
    // Rajattu TÄHÄN kuluttajaan (tapahtumakortti). Rivi 12216 (_vpValmentajaKaari, havTxt) sisältää
    // saman suffiksin container-luokkana jo katetulla RANGES-alueella — eri funktio, eri erä.
    const kortti = rivit.filter((x) => x.includes("vpT('pelaajaa')")).join('\n');
    expect(kortti).toContain("' ' + vpT('pelaajaa')");
    const tapahtumaRivi = rivit.find((x) => x.includes("vpT('pelaajaa')") && x.includes('osallistujat.length'));
    expect(tapahtumaRivi, 'tapahtumakortin rivi').toBeTruthy();
    expect(tapahtumaRivi).not.toMatch(/' pelaajaa'/);
  });
});

// Sandbox on jaettu kaikkien ajettujen renderien kesken (mittauslista · siivouslista · cross-view).
let sb;
beforeAll(() => {
    sb = { console: { log() {}, warn() {}, error() {} } };
    sb.window = sb;
    vm.createContext(sb);
    ['lib/tm_lang.js', 'lib/tm_i18n_common.js', 'lib/tm_vp_i18n.js']
      .forEach((f) => vm.runInContext(readFileSync(join(juuri, f), 'utf8'), sb));
    // shippaavat funktiot HTML:stä (ei stubeja labelin osalta)
    [poimiVar('_VPM'), poimi('_esc'), poimi('_vpMittausPvmFi'), poimi('_vpMittausLahdeLabel'),
     poimi('_vpMittausListaHTML')].forEach((k) => vm.runInContext(k, sb));
    vm.runInContext("function _pvmFiVP(d){ return '1.1.2026'; }", sb);
    // Rivirenderi stubataan: testattava label syntyy RYHMÄOTSIKOSSA (_vpMittausListaHTML), ei rivissä.
    // Stubi katkaisee riippuvuusketjun (_jesc ym.) ilman että label-polku muuttuu.
    vm.runInContext("function _vpMittausRiviHTML(){ return '<i>rivi</i>'; }", sb);
    // Siivousnäkymä (Erä 4d) — sama container-luokka toisessa näkymässä.
    vm.runInContext("function _jesc(s){ return String(s == null ? '' : s); }", sb);
  [poimi('_vpSiivousLahde'), poimi('_vpSiivousListaHTML')].forEach((k) => vm.runInContext(k, sb));
});

describe('mittauksen lähdelabel · AJETTU render sv-tilassa', () => {

  const RIVIT = [
    { id: 'a', pvm: '2026-09-01', lahde: 'pikakirjaus', testi: 'lin30m', arvo: 5.1 },
    { id: 'b', pvm: '2026-08-01', lahde: 'testitapahtuma', testi: 'cmj', arvo: 26 }
  ];
  const aja = (kieli) => {
    vm.runInContext('tmAsetaKieli(' + JSON.stringify(kieli) + ', false);', sb);
    sb.__rows = RIVIT;
    return vm.runInContext('_vpMittausListaHTML(__rows, true)', sb);
  };

  it('sv: ei fi-labeleita outputissa', () => {
    const out = aja('sv');
    expect(out).not.toContain('Pikakirjaus');
    expect(out).not.toContain('Testitapahtuma');
    expect(out).toContain('Snabbregistrering');
    expect(out).toContain('Testhändelse');
  });
  it('fi: labelit ennallaan (ei regressiota suomelle)', () => {
    const out = aja('fi');
    expect(out).toContain('Pikakirjaus');
    expect(out).toContain('Testitapahtuma');
    expect(out).not.toContain('Snabbregistrering');
  });
  it('EI VACUOUS: sv-ajo tuottaa oikeasti sisältöä (ei tyhjää merkkijonoa)', () => {
    expect(aja('sv').length).toBeGreaterThan(200);
  });
});

describe('siivousnäkymä (Erä 4d) · AJETTU render sv-tilassa', () => {
  const TAPAHTUMAT = [
    { pvm: '2026-09-01', lahde: 'pikakirjaus', pelaajaMaara: 7 },
    { pvm: '2026-08-01', lahde: 'testitapahtuma', pelaajaMaara: 12 },
    { pvm: '2026-07-01', lahde: 'historiatuonti', pelaajaMaara: 3 }
  ];
  const aja = (kieli, tap) => {
    vm.runInContext('tmAsetaKieli(' + JSON.stringify(kieli) + ', false);', sb);
    sb.__tap = tap;
    return vm.runInContext("_vpSiivousListaHTML(__tap, 'KPV U13')", sb);
  };

  it('sv: yksikään fi-label ei jää outputiin', () => {
    const out = aja('sv', TAPAHTUMAT);
    ['Pikakirjaus', 'Testitapahtuma', 'Historiatuonti', 'Palloliiton PDF'].forEach((fi) => expect(out).not.toContain(fi));
    expect(out).toContain('Snabbregistrering');
    expect(out).toContain('Testhändelse');
    expect(out).toContain('Historikimport');
  });
  it("sv: konkatenaatio-suffiksi ' pelaajaa' → 'spelare'", () => {
    const out = aja('sv', TAPAHTUMAT);
    expect(out).not.toContain(' pelaajaa');
    expect(out).toContain('spelare');
  });
  it('sv: TYHJÄTILA käännetty (literaali, nyt myös AST-gaten katteessa)', () => {
    const out = aja('sv', []);
    expect(out).not.toContain('Ei muokattavia mittauksia');
    expect(out).toContain('Inga redigerbara mätningar');
  });
  it('fi: siivousnäkymä ennallaan (ei regressiota suomelle)', () => {
    expect(aja('fi', TAPAHTUMAT)).toContain('Pikakirjaus');
    expect(aja('fi', [])).toContain('Ei muokattavia mittauksia');
  });
});

// TÄMÄN TAITON KOKO POINTTI: sama lähde ei saa näkyä eri kielellä eri näkymissä. Ennen korjausta
// mittauslista sanoi sv 'Snabbregistrering' ja siivouslista 'Pikakirjaus' — sama data, kaksi kieltä.
describe('cross-view-konsistenssi · sama lähde, sama sv-muoto', () => {
  it("lahde='pikakirjaus' → MOLEMMAT listat tuottavat 'Snabbregistrering' sv-tilassa", () => {
    vm.runInContext("tmAsetaKieli('sv', false);", sb);
    sb.__rows = [{ id: 'a', pvm: '2026-09-01', lahde: 'pikakirjaus', testi: 'lin30m', arvo: 5.1 }];
    sb.__tap = [{ pvm: '2026-09-01', lahde: 'pikakirjaus', pelaajaMaara: 7 }];
    const mittaus = vm.runInContext('_vpMittausListaHTML(__rows, true)', sb);
    const siivous = vm.runInContext("_vpSiivousListaHTML(__tap, 'KPV U13')", sb);
    [mittaus, siivous].forEach((out) => {
      expect(out).toContain('Snabbregistrering');
      expect(out).not.toContain('Pikakirjaus');
    });
  });
});
