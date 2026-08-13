/**
 * TalentMaster™ — IDP R1: 5D-radarin EDELLINEN-HAAMU (overlay) järjestysriippumaton.
 * Juurisyy (verify-löydös): _tmRadar5D lukee opts.overlay[i]:n INDEKSILLÄ (overlay[i] ↔ radarDims[i]).
 * Kun radarDims järjestettiin peli edellä (D4·D3·D5·D2·D1), kiinteä overlay-array [D1,D2,null,null,null]
 * siirsi D1:n edellisen Peliäly-akselille. Korjaus: overlay rakennetaan radarDims-avaimista (_prevByKey[d.key]).
 * Tämä testi lukitsee: (a) lähde EI palaa kiinteään indeksitaulukkoon, (b) haamu osuu oikealle akselille.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

// _tmRadar5D lukee overlay[i]:n indeksillä ja piirtää pt(i, arvo):lla → haamu on positiollinen.
// Rakennamme overlayn TÄSMÄLLEEN kuten lähde (radarDims-avaimista) ja varmennamme akselikohdistuksen.
function rakennaOverlay(radarDims, d1Prev, d2Prev) {
  const _prevByKey = { D1: d1Prev, D2: d2Prev };
  return radarDims.map(function (d) {
    return { arvo: (_prevByKey[d.key] != null ? _prevByKey[d.key] : null) };
  });
}

describe('IDP R1 — radar-overlay järjestysriippumaton (verify-korjaus)', () => {
  it('lähde EI käytä kiinteää D1..D5-indeksitaulukkoa; käyttää radarDims-avainmappia', () => {
    // Regressio: estä paluu kovakoodattuun [{arvo:_d1Prev},{arvo:_d2Prev},{arvo:null}...]-taulukkoon.
    expect(HTML).toContain('_prevByKey[d.key]');
    expect(HTML).toContain('_radarOpts.overlay = radarDims.map(');
    expect(HTML).not.toContain('_radarOpts.overlay = [{ arvo: _d1Prev }, { arvo: _d2Prev }');
  });

  it('reorder-järjestyksellä (D4·D3·D5·D2·D1): overlay D1-akselilla === _d1Prev, D2-akselilla === _d2Prev', () => {
    const radarDims = [
      { key: 'D4', label: 'Peliäly' },
      { key: 'D3', label: 'Psyykkinen' },
      { key: 'D5', label: 'Sosiaal.' },
      { key: 'D2', label: 'Tekninen' },
      { key: 'D1', label: 'Fyysinen' }
    ];
    const _d1Prev = 3.4, _d2Prev = 2.8;
    const overlay = rakennaOverlay(radarDims, _d1Prev, _d2Prev);

    const iD1 = radarDims.findIndex((d) => d.key === 'D1');
    const iD2 = radarDims.findIndex((d) => d.key === 'D2');
    const iD4 = radarDims.findIndex((d) => d.key === 'D4');

    expect(overlay[iD1].arvo).toBe(_d1Prev);   // fyysinen edellinen fyysinen-akselille
    expect(overlay[iD2].arvo).toBe(_d2Prev);   // tekninen edellinen tekninen-akselille
    expect(overlay[iD4].arvo).toBeNull();      // Peliäly-akselilla EI haamua (ei edellistä-pikakenttää)
  });

  it('kestää minkä tahansa dim-järjestyksen (mielivaltainen permutaatio)', () => {
    const radarDims = [
      { key: 'D2', label: 'Tekninen' },
      { key: 'D1', label: 'Fyysinen' },
      { key: 'D5', label: 'Sosiaal.' },
      { key: 'D4', label: 'Peliäly' },
      { key: 'D3', label: 'Psyykkinen' }
    ];
    const overlay = rakennaOverlay(radarDims, 4.1, 3.2);
    radarDims.forEach((d, i) => {
      if (d.key === 'D1') expect(overlay[i].arvo).toBe(4.1);
      else if (d.key === 'D2') expect(overlay[i].arvo).toBe(3.2);
      else expect(overlay[i].arvo).toBeNull();
    });
  });

  it('vain toinen edellinen olemassa → vain sen akseli saa haamun, muut null', () => {
    const radarDims = [
      { key: 'D4' }, { key: 'D3' }, { key: 'D5' }, { key: 'D2' }, { key: 'D1' }
    ];
    const overlay = rakennaOverlay(radarDims, null, 2.5);   // vain D2-edellinen
    const iD1 = radarDims.findIndex((d) => d.key === 'D1');
    const iD2 = radarDims.findIndex((d) => d.key === 'D2');
    expect(overlay[iD2].arvo).toBe(2.5);
    expect(overlay[iD1].arvo).toBeNull();
  });
});
