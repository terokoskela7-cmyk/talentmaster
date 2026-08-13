/**
 * TalentMaster™ — IDP R1 (pala 2): tmKypsyys-komponentti korvaa vasemman paneelin kypsyysproosan.
 *
 * Kaksi invarianttia lukitaan:
 *  A) _vpRadarNormiJaVaihe.bandHTML = VAIN radarin normi-gate-note (§28); kypsyysvaiheen tulkinta
 *     ("Kehitysvaihe: … · Jälki-PHV") SIIRTYI komponenttiin → EI enää bandissa. normi-laskenta ennallaan.
 *  B) Vasen paneeli hydratoi #_jspKypsyys tmKypsyys-komponentilla live-polulla (appendChildin jälkeen),
 *     ei-PHV → §28 ikävaihe-fallback; EI kuollutta _vpAloitusReRenderiä; ?v bumpattu.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

let RN;
beforeAll(() => {
  const lines = HTML.split('\n');
  const s = lines.findIndex((l) => l.includes('function _vpRadarNormiJaVaihe(p, ika, radarDims) {'));
  if (s < 0) throw new Error('_vpRadarNormiJaVaihe-lohkoa ei löytynyt');
  // Funktion loppu = ensimmäinen "return { normi:" jälkeinen sulkeva rivi "}".
  let e = -1;
  for (let i = s; i < lines.length; i++) { if (lines[i].includes('return { normi: normi, bandHTML: bandHTML };')) { e = i + 1; break; } }
  if (e < 0) throw new Error('_vpRadarNormiJaVaihe-lopetusta ei löytynyt');
  RN = new Function('var window = {};\n' + lines.slice(s, e + 1).join('\n') + '\n return { _vpRadarNormiJaVaihe: _vpRadarNormiJaVaihe };')();
});

const DIMS = [
  { key: 'D4', label: 'Peliäly', arvo: 3 },
  { key: 'D3', label: 'Psyykkinen', arvo: 4 },
  { key: 'D5', label: 'Sosiaal.', arvo: null },
  { key: 'D2', label: 'Tekninen', arvo: 3 },
  { key: 'D1', label: 'Fyysinen', arvo: 2 }
];

describe('A — _vpRadarNormiJaVaihe: band = vain radar-normi-gate (kypsyysproosa siirtyi)', () => {
  it('band EI enää sisällä kypsyysvaiheen tulkintaa ("Kehitysvaihe:"/Rakentaja/Leikkijä/Showcase-label)', () => {
    const r = RN._vpRadarNormiJaVaihe({ phv_tila: 'AN' }, 17, DIMS);
    expect(r.bandHTML).not.toContain('Kehitysvaihe:');
    expect(r.bandHTML).not.toContain('Rakentaja');
    expect(r.bandHTML).not.toContain('Leikkijä');
    // band puhuu radarista, ei kypsyysvaiheesta
    expect(r.bandHTML).toContain('Radar-normi');
  });

  it('16+ eikä PHV-keskellä → normirengas näkyy (note "vertailu kelpaa") + normi-taulukko ennallaan', () => {
    const r = RN._vpRadarNormiJaVaihe({ phv_tila: 'AN' }, 17, DIMS);
    expect(r.bandHTML).toContain('vertailu kelpaa');
    // normi = radarDims-järjestyksessä {arvo:3} ei-tyhjille, null tyhjälle (D5) → §28-gate säilyy
    expect(Array.isArray(r.normi)).toBe(true);
    expect(r.normi.length).toBe(DIMS.length);
    expect(r.normi[2]).toBeNull();              // D5 arvo null → ei normia sille akselille
    expect(r.normi[0]).toEqual({ arvo: 3 });    // D4 arvo != null → normi 3
  });

  it('16+ mutta PHV kesken (PH) → normirengas piilotettu, normi null (§28 late developer -suoja)', () => {
    const r = RN._vpRadarNormiJaVaihe({ phv_tila: 'PH' }, 17, DIMS);
    expect(r.normi).toBeNull();
    expect(r.bandHTML).toContain('piilotettu (PHV kesken)');
  });

  it('<16 → normirengas vasta Showcase-iässä, normi null', () => {
    const r = RN._vpRadarNormiJaVaihe({ phv_tila: 'AN' }, 13, DIMS);
    expect(r.normi).toBeNull();
    expect(r.bandHTML).toContain('vasta Showcase-iässä (16+)');
  });
});

describe('B — vasemman paneelin kytkentä (rakenteellinen vartija)', () => {
  it('hL sisältää #_jspKypsyys-kontin (komponentin kohde)', () => {
    expect(HTML).toContain("hL += '<div id=\"_jspKypsyys\"");
  });

  it('hydratoi tmKypsyys-komponentilla live-polulla (muoto täysi), EI kuollutta _vpAloitusReRenderiä', () => {
    expect(HTML).toContain("modal.querySelector('#_jspKypsyys')");
    expect(HTML).toContain("tmKypsyys(_kySlot, _kd, { muoto: 'täysi' })");
    // hydrataatio elää appendChildin jälkeen, ei _vpAloitusReRenderin (kuollut _jspAloitus-polku) kautta
    expect(HTML).toContain('_vpAloitusKypsyysData(p)');
  });

  it('ei-PHV (SJK/Sibbo) → §28 ikävaihe-kehys fallbackina (ei menetetä §28-tulkintaa)', () => {
    expect(HTML).toContain('_ikavaiheBanneri(ika)');
    // vanha ehdoton banneri-lisäys vasemmasta paneelista poistettu (siirtyi fallbackiin)
    expect(HTML).not.toContain("const _kehysP = _ikavaiheBanneri(ika);");
  });

  it('tm_kypsyys.js ?v bumpattu (kutsutaan nyt oikeasti näkyviin)', () => {
    expect(HTML).toContain('lib/tm_kypsyys.js?v=2');
  });

  it('--surface2-alias määritelty molemmissa teemoissa (komponentin neutraalit segmentit vaalealla)', () => {
    // esiintyy vähintään 2× (dark root + light block) → light-teeman fallback #161614 ei osu
    const n = (HTML.match(/--surface2:\s*var\(--bg2\)/g) || []).length;
    expect(n).toBeGreaterThanOrEqual(2);
  });
});
