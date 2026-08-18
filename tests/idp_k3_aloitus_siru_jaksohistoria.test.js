/**
 * TalentMaster™ — K3 (v2): Aloitus-siru + Kehitys-evidenssi (jfBody) + nimikorjaus (Jaksohistoria).
 * (A) _vpAloitusSiruHTML — kohdennetun ominaisuuden mitattu trendi-siru fokus-heroon (lib tmKaariSiru export).
 * (B) _vpJfEvidenssiHTML — mini-kaari + jaksosidos-delta jfBodyyn (reuse tmKaariJaksoSidos + _vpSulkuJaksovali kuten K2).
 * (C) TASO 3 -haitari + Suunnitelman kaari: label "Kehityskaari" → "Jaksohistoria" (meso ≠ Mittauksen kaari).
 * INVARIANTIT: domeeni→sarja kuten K2 (fyysinen→lin30m · teknis_taktinen→tki · psyykkinen/sosiaalinen→ei-mitattava,
 * honest-empty EI TKI) · §28 pre-PHV neutraali · §37 peruste keskusteluun ei arvosana · §7.22 = VP-näkymä (sallittu).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const K = require('../lib/tm_kehityskaari.js');
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

let M;   // { _vpKohdennettuSarja, _vpAloitusSiruHTML, _vpJfEvidenssiHTML } — eristetyt, stubattu ympäristö
beforeAll(() => {
  const lines = VP.split('\n');
  const s = lines.findIndex((l) => l.includes('function _vpKohdennettuSarja(p, domeeni) {'));
  const e = lines.findIndex((l, i) => i > s && l.includes('function _vpKehSuunnitelmaHTML(p, opts) {'));
  if (s < 0 || e < 0) throw new Error('K3-lohkoa ei löytynyt');
  const body = lines.slice(s, e).join('\n');
  const esc = (x) => String(x == null ? '' : x);
  const jaksovali = (jf) => ({
    alkoi: jf.alkoi ? String(jf.alkoi).slice(0, 10) : null,
    loppu: jf.alkoi ? new Date(new Date(jf.alkoi).getTime() + (jf.kesto_vk || 4) * 7 * 86400000).toISOString().slice(0, 10) : null
  });
  const neutr = (p) => !!(p && p._prePHV);
  M = new Function('window', '_jsvEsc', '_vpSulkuJaksovali', 'onNeutraaliPrePHV',
    body + '\nreturn { _vpKohdennettuSarja, _vpAloitusSiruHTML, _vpJfEvidenssiHTML };'
  )({ TM_KEHITYSKAARI: K }, esc, jaksovali, neutr);
});

const TKI_HIST = [{ pvm: '2026-01-01', tki: 70 }, { pvm: '2026-06-01', tki: 80 }];
const ttP = () => ({ jaksofokus: { konsepti_nimi: 'Haltuunotto', domeeni: 'teknis_taktinen', alkoi: '2026-02-15', kesto_vk: 6 }, tki_historia: TKI_HIST });

describe('lib tmKaariSiru — export (K3)', () => {
  it('renderöi SVG-sirun ≥2 pisteestä', () => {
    const svg = K.tmKaariSiru([{ arvo: 70 }, { arvo: 80 }], 72, 18);
    expect(svg).toContain('<svg');
    expect(svg).toContain('polyline');
  });
  it('<2 pistettä → tyhjä (ei väitetä trendiä)', () => {
    expect(K.tmKaariSiru([{ arvo: 70 }])).toBe('');
    expect(K.tmKaariSiru([])).toBe('');
  });
});

describe('_vpKohdennettuSarja — domeeni→sarja (sama mappaus kuin K2)', () => {
  it('fyysinen→lin30m · teknis_taktinen→tki', () => {
    expect(M._vpKohdennettuSarja({ hh_historia: [{ pvm: '2026-01-01', lin30m: 5 }] }, 'fyysinen').key).toBe('lin30m');
    expect(M._vpKohdennettuSarja({ tki_historia: TKI_HIST }, 'teknis_taktinen').key).toBe('tki');
  });
  it('psyykkinen/sosiaalinen/tuntematon → mitattava:false (TKI ei ole niiden kohdennettu ominaisuus)', () => {
    expect(M._vpKohdennettuSarja({ tki_historia: TKI_HIST }, 'psyykkinen').mitattava).toBe(false);
    expect(M._vpKohdennettuSarja({ tki_historia: TKI_HIST }, 'sosiaalinen').mitattava).toBe(false);
    expect(M._vpKohdennettuSarja({ tki_historia: TKI_HIST }, null).mitattava).toBe(false);
  });
});

describe('(A) _vpAloitusSiruHTML — fokus-heron mitattu trendi-siru', () => {
  it('teknis_taktinen + ≥2 TKI → SVG-siru + ↑ + nimi', () => {
    const h = M._vpAloitusSiruHTML(ttP());
    expect(h).toContain('<svg');
    expect(h).toContain('↑');
    expect(h).toContain('TKI');
    expect(h).toContain('mitattu trendi (§26)');
  });
  it('psyykkinen → EI sirua (ei fabrikoida TKI:tä)', () => {
    expect(M._vpAloitusSiruHTML({ jaksofokus: { konsepti_nimi: 'X', domeeni: 'psyykkinen' }, tki_historia: TKI_HIST })).toBe('');
  });
  it('<2 pistettä → EI sirua', () => {
    expect(M._vpAloitusSiruHTML({ jaksofokus: { konsepti_nimi: 'X', domeeni: 'teknis_taktinen' }, tki_historia: [{ pvm: '2026-01-01', tki: 70 }] })).toBe('');
  });
  it('ei jaksofokusta → tyhjä', () => {
    expect(M._vpAloitusSiruHTML({ tki_historia: TKI_HIST })).toBe('');
  });
});

describe('(B) _vpJfEvidenssiHTML — jfBody mini-kaari + jaksosidos-delta', () => {
  it('teknis_taktinen: siru + jaksosidos "✓ taipui" + ennen→jälkeen', () => {
    const h = M._vpJfEvidenssiHTML(ttP());
    expect(h).toContain('<svg');
    expect(h).toContain('✓ taipui jakson aikana');
    expect(h).toContain('70→80');
    expect(h).toContain('peruste keskusteluun, ei arvosana (§37)');
  });
  it('sosiaalinen/psyykkinen → honest-empty-note, EI TKI-lukua/sirua', () => {
    const h = M._vpJfEvidenssiHTML({ jaksofokus: { konsepti_nimi: 'X', domeeni: 'sosiaalinen' }, tki_historia: TKI_HIST });
    expect(h).toContain('arvio katselmuksessa');
    expect(h).not.toContain('<svg');
    expect(h).not.toContain('70');
  });
  it('mitattava mutta <2 pistettä → "kaari täyttyy 2. mittauksesta"', () => {
    const h = M._vpJfEvidenssiHTML({ jaksofokus: { konsepti_nimi: 'X', domeeni: 'teknis_taktinen', alkoi: '2026-02-15' }, tki_historia: [{ pvm: '2026-01-01', tki: 70 }] });
    expect(h).toContain('täyttyy 2. mittauksesta');
    expect(h).not.toContain('<svg');
  });
  it('§28: PHV-herkkä (lin30m) ei parane + pre-PHV → "🌱 ennallaan — odotettua (§28)", ei "epäonnistui"', () => {
    const h = M._vpJfEvidenssiHTML({ _prePHV: true, jaksofokus: { konsepti_nimi: 'Nopeus', domeeni: 'fyysinen', alkoi: '2026-02-15', kesto_vk: 6 }, hh_historia: [{ pvm: '2026-01-01', lin30m: 5.0 }, { pvm: '2026-06-01', lin30m: 5.2 }] });
    expect(h).toContain('odotettua (§28)');
    expect(h).not.toContain('✓ taipui jakson aikana');
  });
  it('ei kiellettyjä brändivärejä (§5)', () => {
    expect(/c060a8|3EC9A7|4A7ED9/i.test(M._vpJfEvidenssiHTML(ttP()))).toBe(false);
  });
});

describe('(C) nimikorjaus — Jaksohistoria (meso ≠ Mittauksen kaari)', () => {
  it('TASO 3 -haitarin label = "Jaksohistoria" (ei enää "Kehityskaari")', () => {
    expect(VP).toContain("row('_accKaari', '🗺', 'TASO 3 · HISTORIA', 'Jaksohistoria'");
    expect(VP).not.toContain("'TASO 3 · HISTORIA', 'Kehityskaari'");
  });
  it('Suunnitelman kaari -rivi = "Jaksohistoria"', () => {
    expect(VP).toContain('<span class="kk">Jaksohistoria</span>');
    expect(VP).not.toContain('<span class="kk">Kehityskaari</span>');
  });
  it('review-sykli-funktio (_vpKehityskaariHTML) koskematon (vain label/kommentit muuttui)', () => {
    expect(VP).toContain('function _vpKehityskaariHTML(t, pid)');
    expect(VP).toContain('_vpMesoKaariHTML');
  });
});

describe('K3 wiring — helperit kytketty', () => {
  it('(A) Aloitus-hero kutsuu _vpAloitusSiruHTML', () => {
    expect(VP).toContain("if (typeof _vpAloitusSiruHTML === 'function') h += _vpAloitusSiruHTML(p);");
  });
  it('(B) jfBody-rivi liittää _vpJfEvidenssiHTML (vain kun jaksofokus)', () => {
    expect(VP).toContain('const jfEvid = jfNimi && typeof _vpJfEvidenssiHTML === \'function\' ? _vpJfEvidenssiHTML(p) : \'\';');
    expect(VP).toContain('jfBody + jfEvid, _inlineEditori);');
  });
  it('lib tmKaariSiru exportattu (API + global)', () => {
    const src = readFileSync(join(__dir, '..', 'lib', 'tm_kehityskaari.js'), 'utf8');
    expect(src).toContain('tmKaariSiru: _sparkline');
    expect(src).toContain('root.tmKaariSiru = _sparkline;');
  });
});
