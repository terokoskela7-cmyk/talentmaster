/**
 * TalentMaster™ — R4.1: Konseptin osa-arviointi (1–3 curriculum, "osaako pelissä": ei näy / ohjatusti / itsenäisesti).
 * Syöttö Kehityksen teknis-taktisessa editorissa (.jsp-scale3 + autosave), näyttö Aloituksen konseptin osissa.
 * §37 (EHDOTON): curriculum-kerros (OMA teknis-taktinen 1–3) · oma kenttä jaksofokus.osa_arviot · EI johdeta/muunneta
 * Arvioinnin havaittu 1–5:stä, EI kirjoita arviointi_havaittu:un. Honest-empty säilyy.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

function extract(sig) {
  const lines = HTML.split('\n');
  const s = lines.findIndex((l) => l.includes(sig));
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}') { e = i; break; } }
  return lines.slice(s, e + 1).join('\n');
}

describe('§37 — osa-arvio on OMA curriculum-kenttä, ei kytköstä arviointi_havaittu 1–5:een', () => {
  it('datamalli: jaksofokus.osa_arviot (ei uutta alikokoelmaa, ei arviointi_havaittu-kytkentää)', () => {
    // koko osa-arvio-koneisto (set + merge + näyttö) EI mainitse arviointi_havaittu:a
    const set = HTML.slice(HTML.indexOf('window._vpJfOsaArvioSet'), HTML.indexOf('window._vpJfOsaArvioSet') + 1400);
    expect(set).not.toContain('arviointi_havaittu');
    expect(extract('function _vpAloitusOsaArvioHTML(')).not.toContain('arviointi_havaittu');
    expect(extract('function _vpTtOsaArviotHTML(')).not.toContain('arviointi_havaittu');
  });
  it('init _jfOhjausAlusta:ssa jaksofokus.osa_arviot:sta (deep-copy per konsepti)', () => {
    expect(HTML).toContain('window._vpJfOsaArviot[p.id] = _oa;');
    expect(HTML).toContain('const _oaSrc = (p.jaksofokus && p.jaksofokus.osa_arviot) || {};');
  });
});

describe('SYÖTTÖ — _vpTtOsaArviotHTML (per-osa .jsp-scale3 + autosave-klik)', () => {
  let fn;
  beforeAll(() => {
    fn = new Function(
      'var _jsvEsc=function(s){return String(s==null?"":s);};\n' +
      'var window={_vpJfOsaArviot:{p1:{y_h1:{a:2}}}};\n' +
      extract('function _vpTtOsaArviotHTML(p, item) {') + '\n return _vpTtOsaArviotHTML;'
    )();
  });
  it('renderöi 3-portaisen scale3:n + autosave-onclickin per osa; arvioitu → label, arvioimaton → "arvioi"', () => {
    const h = fn({ id: 'p1' }, { avain: 'y_h1', kpi: [{ koodi: 'a', teksti: 'Käännä pää' }, { koodi: 'b', teksti: 'Valitse' }] });
    expect(h).toContain('class="jsp-scale3');
    expect(h).toContain("_vpJfOsaArvioSet('p1','y_h1','a',2)");
    expect(h).toContain("_vpJfOsaArvioSet('p1','y_h1','b',3)");
    expect(h).toContain('<b style="color:var(--ink2)">2</b>/3 · ohjatusti');   // a arvioitu
    expect(h).toContain('arvioi</span>');                                       // b honest-empty
    expect(h).toContain('Eri kuin Arvioinnin 1–5 (§37)');                       // §37-note
  });
  it('ei kpi:tä → tyhjä (ei kaadu)', () => {
    expect(fn({ id: 'p1' }, { avain: 'y_h1', kpi: [] })).toBe('');
    expect(fn({ id: 'p1' }, null)).toBe('');
  });
});

describe('NÄYTTÖ — _vpAloitusOsaArvioHTML (Aloitus, read-only, korvaa "arvioi Kehityksessä")', () => {
  let fn;
  beforeAll(() => { fn = new Function(extract('function _vpAloitusOsaArvioHTML(') + '\n return _vpAloitusOsaArvioHTML;')(); });
  it('arvo 3 → scale3 (3 on) + itsenäisesti · arvo 1 → low + ei näy · null → honest-empty', () => {
    const jf = { osa_arviot: { y_h1: { a: 3, b: 1 } } };
    const a = fn(jf, 'y_h1', 'a');
    expect(a).toContain('jsp-scale3');
    expect(a).toContain('<i class="on"></i><i class="on"></i><i class="on"></i>');
    expect(a).toContain('/3 · itsenäisesti');
    expect(a).not.toContain('low');
    const b = fn(jf, 'y_h1', 'b');
    expect(b).toContain('jsp-scale3 low');
    expect(b).toContain('/3 · ei näy');
    expect(fn(jf, 'y_h1', 'c')).toBe('<span class="idp-lab">arvioi Kehityksessä</span>');   // honest-empty säilyy
    expect(fn({}, 'y_h1', 'a')).toContain('arvioi Kehityksessä');
  });
  it('Aloituksen konseptin osa käyttää helperiä (korvaa entisen kiinteän "arvioi Kehityksessä")', () => {
    expect(HTML).toContain("_vpAloitusOsaArvioHTML(jf, avain, k.koodi) : '<span class=\"idp-lab\">arvioi Kehityksessä</span>'");
  });
});

describe('MERGE + autosave — jaksofokus.osa_arviot (§37 avain konsepti_avaimella → konseptin vaihto ei sekoita)', () => {
  let merge;
  beforeAll(() => {
    merge = new Function('var window={TM_JAKSOFOKUS:null};\n' + extract('function _vpJfMergeLisakentat(jf, pid) {') +
      '\n return function(jf,pid,oa){ window._vpJfOsaArviot={}; window._vpJfOsaArviot[pid]=oa; return _vpJfMergeLisakentat(jf,pid); };')();
  });
  it('sulauttaa editointitilan osa_arviot jaksofokukseen (vain 1–3, tyhjät pois)', () => {
    const jf = merge({ domeeni: 'teknis_taktinen', konsepti_avain: 'y_h1' }, 'p1', { y_h1: { a: 2, b: 3, x: 9, y: 0 } });
    expect(jf.osa_arviot).toEqual({ y_h1: { a: 2, b: 3 } });   // x=9 ja y=0 karsittu (ei 1–3)
  });
  it('kahden konseptin arviot säilyvät erikseen (avain konsepti_avaimella)', () => {
    const jf = merge({ domeeni: 'teknis_taktinen', konsepti_avain: 'y_h2' }, 'p1', { y_h1: { a: 3 }, y_h2: { c: 2 } });
    expect(jf.osa_arviot).toEqual({ y_h1: { a: 3 }, y_h2: { c: 2 } });
  });
  it('tyhjä osa_arviot → kenttä poistetaan (ei tyhjää objektia)', () => {
    const jf = merge({ domeeni: 'teknis_taktinen', konsepti_avain: 'y_h1' }, 'p1', {});
    expect(jf.osa_arviot).toBeUndefined();
  });
});

describe('autosave-langoitus + status osa-etenemä', () => {
  it('_vpJfOsaArvioSet: state + in-memory jaksofokus + deep-merge-kirjoitus (VAIN osa_arviot-alikenttä)', () => {
    const s = HTML.slice(HTML.indexOf('window._vpJfOsaArvioSet'), HTML.indexOf('window._vpJfOsaArvioSet') + 1400);
    expect(s).toContain('p.jaksofokus.osa_arviot[konseptiAvain] = Object.assign({}, p.jaksofokus.osa_arviot[konseptiAvain], c);');
    expect(s).toContain("_vpTtKirjoita(pid, { jaksofokus: { osa_arviot: _w } }, 'Osa-arvio tallennettu');");
    expect(s).toContain('_vpAloitusReRender');   // Aloitus-näyttö päivittyy
  });
  it('status-rivi näyttää osa-etenemän ("Osat X/Y itsenäisesti") olemassa olevasta datasta', () => {
    expect(HTML).toContain("' itsenäisesti</b></span>');");
    expect(HTML).toContain('jf.osa_arviot[jf.konsepti_avain]');
  });
});
