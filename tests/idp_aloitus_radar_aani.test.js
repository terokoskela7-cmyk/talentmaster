/**
 * TalentMaster™ — IDP VAIHE 2.0b: Aloituksen 5D-radar (peli edellä) + pelaajan ääni (VP_v25).
 * PUHTAAT: _vpAloitusRadarDims (D4 ylhäällä · §28-normigate) · _vpAloitusAani (pikakentistä; tyhjä → tyhjä).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

let A;
beforeAll(() => {
  const lines = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8').split('\n');
  const s = lines.findIndex((l) => l.includes('function _vpAloitusRadarDims(p, ika) {'));
  const e = lines.findIndex((l) => l.includes('window._vpAloitusRadarDims = _vpAloitusRadarDims;'));
  if (s < 0 || e < 0) throw new Error('2.0b-lohkoa ei löytynyt');
  // Injektoi lib-globaalit (muuten guardit putoavat pikakenttä-fallbackiin).
  A = new Function('laskeD2Taso', 'laskeD5Taso', '_dimNorm5Adar',
    'var window = {};\n' + lines.slice(s, e + 1).join('\n') + '\n return { _vpAloitusRadarDims: _vpAloitusRadarDims, _vpAloitusAani: _vpAloitusAani };')(
    function (p) { return p.d2_taso != null ? p.d2_taso : null; },
    function (p) { return p.d5_taso != null ? p.d5_taso : null; },
    function (yht) { return yht == null ? null : Math.round(yht / 3 * 5 * 10) / 10; });
});

describe('_vpAloitusRadarDims — peli edellä (D4 ylhäällä) + §28-normigate', () => {
  it('akselijärjestys D4·D3·D5·D2·D1 (peli-dim ensin, testi viimeisenä)', () => {
    const p = { hh_taso: 2.5, d2_taso: 4, d3_taso: 3, d5_taso: 4, adar_viimeisin: { yht: 2.7 } };
    const r = A._vpAloitusRadarDims(p, 13);
    expect(r.dims.map((d) => d.key)).toEqual(['D4', 'D3', 'D5', 'D2', 'D1']);
    expect(r.dims[0]).toMatchObject({ key: 'D4', label: 'Peliäly' });   // ei "ADAR"-labelia (C1)
    expect(r.dims[3].arvo).toBe(4);   // D2 = laskeD2Taso
    expect(r.dims[4].arvo).toBe(2.5); // D1 = hh_taso
    expect(r.dims[0].arvo).toBe(4.5); // D4 = _dimNorm5Adar(2.7)
  });
  it('tyhjät dimensiot → arvo null (radar näyttää "tulossa", ei 0)', () => {
    const r = A._vpAloitusRadarDims({}, 13);
    expect(r.dims.every((d) => d.arvo === null)).toBe(true);
  });
  it('§28: normivertailu vain Showcase 16+ EIKÄ PHV-keskellä (PH)', () => {
    expect(A._vpAloitusRadarDims({ phv_tila: 'AN' }, 16).normiOk).toBe(true);
    expect(A._vpAloitusRadarDims({ phv_tila: 'AN' }, 13).normiOk).toBe(false);   // alle 16
    expect(A._vpAloitusRadarDims({ phv_tila: 'PH' }, 17).normiOk).toBe(false);   // PHV-keskellä
    expect(A._vpAloitusRadarDims({ phv_tila: 'AN' }, null).normiOk).toBe(false); // ikä tuntematon
  });
});

describe('_vpAloitusAani — pelaajan oma ääni pikakentistä', () => {
  it('miksi_pelaan + itsearvio q1–q3 (tyhjät karsitaan)', () => {
    const r = A._vpAloitusAani({ miksi_pelaan: 'Rakastan maalintekoa', _idpSitoumus: { itsearvio: { q1: 'Haluan uskaltaa', q2: '', q3: 'Treenata kovaa' } } });
    expect(r.miksi).toBe('Rakastan maalintekoa');
    expect(r.aanet).toEqual(['Haluan uskaltaa', 'Treenata kovaa']);
  });
  it('ei dataa → tyhjä (ei keksitä pelaajan sanoja)', () => {
    expect(A._vpAloitusAani({})).toEqual({ miksi: null, aanet: [] });
    expect(A._vpAloitusAani({ _idpSitoumus: { itsearvio: {} } })).toEqual({ miksi: null, aanet: [] });
  });
});
