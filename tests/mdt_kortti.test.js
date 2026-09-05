/**
 * TalentMaster™ — R2-A V2: Player Development Card (Pelaajaraportti), TalentMaster_VP_v25.html
 * Uudet puhtaat esityshelperit: _mdtPelipaikkaSVG (pelipaikka-piirros + tyhjä tila) ja
 * _mdtFaLista (FA 1–5 read-only, arvioidut dimeittäin + ⓘ + tyhjä tila). Poimitaan lähteestä, injektoidaan deps.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dir = dirname(fileURLToPath(import.meta.url));
const LIB = require('../lib/tm_arviointi_taksonomia.js');

let M;
beforeAll(() => {
  const lines = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8').split('\n');
  const s = lines.findIndex((l) => l.includes('var _MDT_POS = {'));
  const e = lines.findIndex((l) => l.includes('function _renderMDTProfiili() {'));
  if (s < 0 || e < 0) throw new Error('MDT-kortti-lohkoa ei löytynyt');
  const esc = (x) => String(x == null ? '' : x);
  const posNimi = (c) => ({ LH: 'Laitahyökkääjä', KH: 'Keskushyökkääjä', MV: 'Maalivahti' }[String(c || '').toUpperCase()] || String(c || ''));
  const kehys = () => ({ taksonomia: LIB.ARVIOINTI_TAKSONOMIA });
  const vari5 = () => 'var(--teal)';
  M = new Function('_vpPosNimi', '_jsvEsc', 'tmKehys', 'ARVIOINTI_TAKSONOMIA', 'TM_DIMENSIOT', '_mdtVari5', 'vpT',
    'var window = {};\n' + lines.slice(s, e).join('\n') + '\n return { _mdtPelipaikkaSVG: _mdtPelipaikkaSVG, _mdtFaLista: _mdtFaLista };')(
    posNimi, esc, kehys, LIB.ARVIOINTI_TAKSONOMIA, LIB.TM_DIMENSIOT, vari5, (x)=>x);
});

describe('_mdtPelipaikkaSVG — pelipaikka-piirros', () => {
  it('tunnettu koodi → nimi + sijaintipiste (teal dot)', () => {
    const h = M._mdtPelipaikkaSVG({ positio: 'LH' });
    expect(h).toContain('Laitahyökkääjä');
    expect(h).toContain('fill="var(--teal)"');   // pelaajan sijaintipiste (dot), ei kentän keskiympyrä
    expect(h).toContain('LH');
  });
  it('tt_positio_aktiivinen voittaa positio/pelipaikan', () => {
    const h = M._mdtPelipaikkaSVG({ tt_positio_aktiivinen: 'MV', positio: 'LH' });
    expect(h).toContain('Maalivahti');
  });
  it('ei pelipaikkaa → "ei kirjattu", ei sijaintipistettä (dot)', () => {
    const h = M._mdtPelipaikkaSVG({});
    expect(h).toContain('ei kirjattu');
    expect(h).not.toContain('fill="var(--teal)"');   // kentän keskiympyrä on (stroke), mutta ei teal-pistettä
  });
});

describe('_mdtFaLista — FA 1–5 read-only', () => {
  it('arvioidut attribuutit dimeittäin + arvo + ⓘ (kuvaus_fi)', () => {
    const h = M._mdtFaLista({ arviointi_havaittu: { balance: 4, short_passing: 3 } });
    expect(h).toContain('Tasapaino');        // D1 balance
    expect(h).toContain('Lyhyt syöttö');     // D2 short_passing
    expect(h).toContain('ⓘ');                // selite-vihje (kuvaus_fi #315)
    expect(h).toContain('D1');               // dim-otsikko
    expect(h).toContain('2 arvioitua');      // laskuri
  });
  it('vain arvioidut näytetään (ei tyhjiä attribuutteja)', () => {
    const h = M._mdtFaLista({ arviointi_havaittu: { balance: 4 } });
    expect(h).toContain('Tasapaino');
    expect(h).not.toContain('Rohkeus');      // courage ei arvioitu → ei riviä
  });
  it('ei arvioita → rehellinen tyhjä tila', () => {
    expect(M._mdtFaLista({})).toContain('Ei vielä FA 1–5');
    expect(M._mdtFaLista({ arviointi_havaittu: {} })).toContain('Ei vielä FA 1–5');
  });
});
