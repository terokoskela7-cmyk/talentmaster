/**
 * TalentMaster™ — K1b: alusta per piste §22-vartija (write-side + kehityskaari-render).
 * Nopeus/ketteryys vertailukelpoisia vain saman alustan sisällä (§22). Kaksi aitoa aukkoa:
 *  (1) tmHhSnapshot ei kantanut alustaa · (2) _testiRivi ei segmentoinut eri alustoja.
 * INVARIANTIT: null == vertailukelpoinen (ei regressiota vanhaan all-null-dataan) · segmentointi VASTA kun
 * eksplisiittiset alustat eroavat · alustaherkkyys per testi (cmj EI herkkä) · aito per-piste-alusta vain Testaus_v9:stä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const H = require('../lib/tm_historia.js');
const K = require('../lib/tm_kehityskaari.js');
const TESTAUS = readFileSync(join(__dir, '..', 'TalentMaster_Testaus_v9.html'), 'utf8');
const EXCEL = readFileSync(join(__dir, '..', 'TalentMaster_Excel_Tuonti.html'), 'utf8');
const esc = s => String(s == null ? '' : s);

describe('K1b tm_historia — tmHhSnapshot kantaa alustan (vain eksplisiittinen, trimmattu)', () => {
  it('tallentaa alustan kun ei-tyhjä', () => {
    const s = H.tmHhSnapshot('2026-06-01', { hv: { lin30m: 4.8 }, alusta: 'nurmi' });
    expect(s).toEqual({ pvm: '2026-06-01', lin30m: 4.8, alusta: 'nurmi' });
  });
  it('trimmaa alustan', () => {
    expect(H.tmHhSnapshot('2026-06-01', { hv: { lin30m: 4.8 }, alusta: '  halli ' }).alusta).toBe('halli');
  });
  it('EI merkitse tyhjää / null / undefined alustaa (null == vertailukelpoinen, ei regressiota)', () => {
    expect('alusta' in H.tmHhSnapshot('2026-06-01', { hv: { lin30m: 4.8 } })).toBe(false);
    expect('alusta' in H.tmHhSnapshot('2026-06-01', { hv: { lin30m: 4.8 }, alusta: '' })).toBe(false);
    expect('alusta' in H.tmHhSnapshot('2026-06-01', { hv: { lin30m: 4.8 }, alusta: '   ' })).toBe(false);
    expect('alusta' in H.tmHhSnapshot('2026-06-01', { hv: { lin30m: 4.8 }, alusta: null })).toBe(false);
  });
});

describe('K1b tmKaariSarja — alusta kulkee per piste (null kun puuttuu)', () => {
  it('poimii alustan pisteille, null muille', () => {
    const h = [{ pvm: '2026-01-01', lin30m: 5.0, alusta: 'nurmi' }, { pvm: '2026-06-01', lin30m: 4.8 }];
    const s = K.tmKaariSarja(h, 'lin30m');
    expect(s.map(p => p.alusta)).toEqual(['nurmi', null]);
  });
});

describe('K1b §22-segmentointi — tmKaariRenderFull (_testiRivi)', () => {
  it('VANHA DATA (kaikki alusta null) → delta näkyy normaalisti + hienovarainen "alusta —" (ei regressiota)', () => {
    const r = K.tmKaariRenderFull({ hh_historia: [{ pvm: '2026-01-01', lin30m: 5.0 }, { pvm: '2026-06-01', lin30m: 4.8 }] }, { esc });
    expect(r.includes('5→4.8')).toBe(true);       // delta säilyy — null == null vertailukelpoinen
    expect(r.includes('alusta —')).toBe(true);     // hienovarainen info-note, EI deltan piilotus
    expect(r.includes('⚠')).toBe(false);           // ei varoitusta
  });
  it('SAMA eksplisiittinen alusta → subtle "· [alusta]", delta näkyy', () => {
    const r = K.tmKaariRenderFull({ hh_historia: [{ pvm: '2026-01-01', lin30m: 5.0, alusta: 'mondo_yleisurheilualusta' }, { pvm: '2026-06-01', lin30m: 4.8, alusta: 'mondo_yleisurheilualusta' }] }, { esc });
    expect(r.includes('· mondo')).toBe(true);
    expect(r.includes('5→4.8')).toBe(true);
    expect(r.includes('⚠')).toBe(false);
  });
  it('ERI eksplisiittiset alustat (nurmi→halli) → ⚠-merkki + EI sekoita cross-alusta-deltaa', () => {
    const r = K.tmKaariRenderFull({ hh_historia: [{ pvm: '2026-01-01', lin30m: 5.0, alusta: 'nurmi' }, { pvm: '2026-06-01', lin30m: 4.8, alusta: 'halli' }] }, { esc });
    expect(r.includes('⚠ halli')).toBe(true);      // segmentoitu viimeisimpään alustaan
    expect(r.includes('5→4.8')).toBe(false);       // §22: nurmi-piste EI vertaudu halli-pisteeseen
  });
  it('cmj EI alustaherkkä → ei alusta-merkkiä eikä segmentointia vaikka alustat eroavat', () => {
    const r = K.tmKaariRenderFull({ hh_historia: [{ pvm: '2026-01-01', cmj: 30, alusta: 'nurmi' }, { pvm: '2026-06-01', cmj: 33, alusta: 'halli' }] }, { esc });
    expect(r.includes('⚠')).toBe(false);
    expect(r.includes('· alusta')).toBe(false);
    expect(r.includes('· nurmi')).toBe(false);
  });
});

describe('K1b write-side wiring — aito alusta vain Testaus_v9:stä', () => {
  it('Testaus_v9 välittää sessio-alustan tmHhSnapshotiin', () => {
    expect(TESTAUS).toContain("var _sessioAlusta = (_aktiivinenTapahtuma && _aktiivinenTapahtuma.alusta) || '';");
    expect(TESTAUS).toContain('tmHhSnapshot(pvm, { hv: hv, alusta: _sessioAlusta })');
  });
  it('Excel-tuonti EI fabrikoi alustaa (import ei tunne mittausalustaa; Moodi B monta pvm → valhe-segmentointi)', () => {
    // guard-kommentti + snapshot-kutsu ILMAN alusta-avainta
    expect(EXCEL).toContain('K1b §22 — EI alustaa');
    expect(EXCEL).toContain('tmHhSnapshot(pvmIso, {\n            hh_taso: hhTaso, d1_taso: profiiliUpdate.d1_taso, d2_taso: profiiliUpdate.d2_taso, hv: hhViimeisin\n          })');
    expect(EXCEL).toContain('tmHhSnapshot(pvm, { hv: hv, hh_taso: hh_taso, d1_taso: d1_taso })');
  });
});
