/**
 * TalentMaster™ — K2 (v2): Katselmus — jaksosidos-evidenssi sulkuhetkeen (VP_v25 _vpSulkuJaksosidosHTML).
 * "Taipuiko kohdennettu ominaisuus juuri tämän jakson aikana" — reuse tmKaariJaksoSidos (window-bounded
 * ennen→jälkeen). Domeeni→avain kuten tmKaariRenderFull:n jaksoHtml (fyysinen→lin30m, muu→tki).
 * INVARIANTIT: §37 kaari=peruste keskusteluun EI arvosana · §28 PHV-herkkä+pre-PHV "ennallaan" neutraali ·
 * §0 ei tuplata fyysistä mitattua deltaa (tmFyysDelta omistaa fyysisen luvun) → aito lisäarvo teknis-taktisilla.
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

let F;   // eristetty _vpSulkuJaksosidosHTML (window.TM_KEHITYSKAARI = oikea lib)
beforeAll(() => {
  const lines = VP.split('\n');
  const s = lines.findIndex((l) => l.includes('function _vpSulkuJaksosidosHTML(p, jakso, opts) {'));
  if (s < 0) throw new Error('_vpSulkuJaksosidosHTML ei löytynyt');
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}') { e = i; break; } }
  if (e < 0) throw new Error('funktion loppua ei löytynyt');
  F = new Function('window', lines.slice(s, e + 1).join('\n') + '\nreturn _vpSulkuJaksosidosHTML;')({ TM_KEHITYSKAARI: K });
});

const JAKSO = { alkoi: '2026-02-15', paattyi: '2026-05-15' };

describe('_vpSulkuJaksosidosHTML — teknis-taktinen (TKI-ikkuna, aito lisäarvo)', () => {
  it('TKI paranee ikkunan yli → "✓ taipui" + ennen/jälkeen näkyvät', () => {
    const p = { tki_historia: [{ pvm: '2026-01-01', tki: 70 }, { pvm: '2026-06-01', tki: 80 }] };
    const h = F(p, JAKSO, { domeeni: 'teknis_taktinen' });
    expect(h).toContain('TKI');
    expect(h).toContain('✓ taipui jakson aikana');
    expect(h).toContain('70');
    expect(h).toContain('80');
  });
  it('TKI ei parane ikkunassa (ei PHV-herkkä) → "○ ennallaan tässä ikkunassa"', () => {
    const p = { tki_historia: [{ pvm: '2026-01-01', tki: 80 }, { pvm: '2026-06-01', tki: 72 }] };
    const h = F(p, JAKSO, { domeeni: 'teknis_taktinen' });
    expect(h).toContain('○ ennallaan tässä ikkunassa');
    expect(h).not.toContain('✓ taipui jakson aikana');
  });
  it('§37: peruste keskusteluun, ei arvosana', () => {
    const p = { tki_historia: [{ pvm: '2026-01-01', tki: 70 }, { pvm: '2026-06-01', tki: 80 }] };
    expect(F(p, JAKSO, { domeeni: 'teknis_taktinen' })).toContain('peruste keskusteluun, ei arvosana (§37)');
  });
});

describe('_vpSulkuJaksosidosHTML — §0 ei tuplaa fyysistä mitattua deltaa', () => {
  const pFyys = { hh_historia: [{ pvm: '2026-01-01', lin30m: 5.0 }, { pvm: '2026-06-01', lin30m: 4.8 }] };
  it('fyysinen + tmFyysDelta jo näytetty → tyhjä (ei kilpailevaa toista lukua)', () => {
    expect(F(pFyys, JAKSO, { domeeni: 'fyysinen', fyysDeltaNaytetty: true })).toBe('');
  });
  it('fyysinen + EI mitattua deltaa + lin30m kattaa ikkunan → näkyy (täydentävä)', () => {
    const h = F(pFyys, JAKSO, { domeeni: 'fyysinen', fyysDeltaNaytetty: false });
    expect(h).toContain('30 m');
    expect(h).toContain('✓ taipui jakson aikana');   // 5.0→4.8, pienempi_parempi → parani
  });
});

describe('_vpSulkuJaksosidosHTML — §28 PHV-herkkä + pre-PHV neutraali', () => {
  it('lin30m ei parane (aika nousee) + phvNeutraali → "🌱 ennallaan — odotettua (§28)", ei "epäonnistui"-kehys', () => {
    const p = { hh_historia: [{ pvm: '2026-01-01', lin30m: 5.0 }, { pvm: '2026-06-01', lin30m: 5.2 }] };
    const h = F(p, JAKSO, { domeeni: 'fyysinen', phvNeutraali: true });
    expect(h).toContain('odotettua (§28)');
    expect(h).not.toContain('✓ taipui jakson aikana');
  });
  it('TKI EI ole PHV-herkkä → phvNeutraali ei muuta teknis-taktista neutraaliksi', () => {
    const p = { tki_historia: [{ pvm: '2026-01-01', tki: 80 }, { pvm: '2026-06-01', tki: 72 }] };
    const h = F(p, JAKSO, { domeeni: 'teknis_taktinen', phvNeutraali: true });
    expect(h).toContain('○ ennallaan tässä ikkunassa');   // ei §28-neutraalia (TKI ei PHV-herkkä)
    expect(h).not.toContain('odotettua (§28)');
  });
});

describe('_vpSulkuJaksosidosHTML — honest-empty (§29: vain mitatusta)', () => {
  it('ei dataa → tyhjä', () => {
    expect(F({}, JAKSO, { domeeni: 'teknis_taktinen' })).toBe('');
    expect(F(null, JAKSO, { domeeni: 'teknis_taktinen' })).toBe('');
  });
  it('vain 1 piste (ei ennen+jälkeen) → tyhjä (ei väitetä sidosta)', () => {
    expect(F({ tki_historia: [{ pvm: '2026-03-01', tki: 75 }] }, JAKSO, { domeeni: 'teknis_taktinen' })).toBe('');
  });
  it('ei window-sidosta (kaikki pisteet ennen ikkunaa) → tyhjä', () => {
    const p = { tki_historia: [{ pvm: '2025-01-01', tki: 70 }, { pvm: '2025-02-01', tki: 72 }] };
    expect(F(p, JAKSO, { domeeni: 'teknis_taktinen' })).toBe('');
  });
  it('ei kiellettyjä brändivärejä (§5)', () => {
    const p = { tki_historia: [{ pvm: '2026-01-01', tki: 70 }, { pvm: '2026-06-01', tki: 80 }] };
    expect(/c060a8|3EC9A7|4A7ED9/i.test(F(p, JAKSO, { domeeni: 'teknis_taktinen' }))).toBe(false);
  });
});

describe('K2 wiring — _vpSulkuRender kutsuu helperiä oikeilla argumenteilla', () => {
  it('kutsu fokusikkunalla {alkoi:S.alkoi, paattyi:S.loppu} + domeeni', () => {
    expect(VP).toContain('_vpSulkuJaksosidosHTML(p, { alkoi: S.alkoi, paattyi: S.loppu }, {');
    expect(VP).toContain('domeeni: jf.domeeni');
  });
  it('§0-gate: fyysDeltaNaytetty sidottu fyysiseen mitattuun deltaan (_fyys && _delta)', () => {
    expect(VP).toContain('fyysDeltaNaytetty: !!(_fyys && _delta)');
  });
  it('phvNeutraali onNeutraaliPrePHV:stä (§28)', () => {
    expect(VP).toContain('phvNeutraali: (typeof onNeutraaliPrePHV === \'function\') ? onNeutraaliPrePHV(p) : false');
  });
  it('EI koske ① Edistymä-lohkoon / tmFyysDelta:aan (kutsut yhä olemassa)', () => {
    expect(VP).toContain('① Edistymä — peli edellä');
    expect(VP).toContain('_FLIB.tmFyysDelta(p, S.alkoi, jf.konsepti_avain)');
  });
});
