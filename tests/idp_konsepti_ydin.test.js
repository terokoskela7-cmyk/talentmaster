/**
 * TalentMaster™ — IDP R1.2: teknis-taktinen konsepti-ydin fokus-heron sisään (additiivinen).
 * Silta-alkuperä · konseptin miksi (pelitilanne) · konseptin osat a–e (item.kpi) · cue→Viikko · reflektio.
 * Data lib+pikakentistä (ei uutta laskentaa). Per-osa-tila = rehellinen tyhjä "arvioi Kehityksessä" (R4 kaappaa).
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
  if (s < 0) throw new Error('ei löytynyt: ' + sig);
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}') { e = i; break; } }
  return lines.slice(s, e + 1).join('\n');
}

let K;
beforeAll(() => {
  const ITEM = { avain: 'y_h0', koodi: 'Y-H0', nimi: 'HAVAINNOINTI', pelitilanne: 'kaikki alkaa tiedosta – 99 % pelistä.', kpi: [{ koodi: 'a', teksti: 'Sijoitu diagonaalisesti' }, { koodi: 'b', teksti: 'Pidä peliasento avoimena' }] };
  K = new Function(
    'var _jsvEsc = function(s){return String(s==null?"":s);};\n' +
    'var _vpAloitusSentence = function(s){ s=String(s||""); return (s===s.toUpperCase()&&s!==s.toLowerCase())?(s.charAt(0)+s.slice(1).toLowerCase()):s; };\n' +
    'var _vpSiltaKonsepti = function(a){ return a==="y_h0" ? ' + JSON.stringify(ITEM) + ' : null; };\n' +
    'var tmTtHarjoitteet = function(a){ return a==="Y-H0" ? [{},{}] : []; };\n' +   // 2 harjoitetta
    'var tmTtKysymykset = function(a){ return a==="y_h0" ? ["Mitä näit ennen kuin pallo tuli?","Missä oli lähin vastustaja?"] : []; };\n' +
    extract('function _vpAloitusKonseptiYdinHTML(p) {') + '\n return { yd: _vpAloitusKonseptiYdinHTML };'
  )().yd;
});

const JF = { konsepti_nimi: 'HAVAINNOINTI', konsepti_avain: 'y_h0', konsepti_koodi: 'Y-H0', domeeni: 'teknis_taktinen' };

describe('silta-alkuperä (§ vajaa → täydennetty)', () => {
  it('lahde=arviointi + arviointi_havaittu → "Havaittu Arviointi-välilehdellä" + taso + chain', () => {
    const h = K({ jaksofokus: Object.assign({}, JF, { lahde: 'arviointi' }), arviointi_havaittu: { y_h0: 2 } });
    expect(h).toContain('Havaittu <b>Arviointi-välilehdellä</b>');
    expect(h).toContain('<b>2/5</b>');
    expect(h).toContain('idp-chain');
    expect(h).toContain('node c');   // konsepti chain-solmu
  });
  it('lahde=silta_d1 → fyysinen mittaus (D1), ei chainia', () => {
    const h = K({ jaksofokus: Object.assign({}, JF, { lahde: 'silta_d1', domeeni: 'fyysinen' }) });
    expect(h).toContain('fyysisestä mittauksesta');
    expect(h).not.toContain('idp-chain');
  });
  it('käsin (lahde=vp) → "Asetettu käsin"', () => {
    expect(K({ jaksofokus: Object.assign({}, JF, { lahde: 'vp' }) })).toContain('Asetettu <b>käsin</b>');
  });
});

describe('konseptin miksi + osat (a–e) + per-osa rehellinen tyhjä', () => {
  it('miksi = pelitilanne (serif italic)', () => {
    expect(K({ jaksofokus: JF })).toContain('kaikki alkaa tiedosta');
  });
  it('osat item.kpi:stä (a/b) + jokainen "arvioi Kehityksessä" (R4 kaappaa, ei fabrikointia)', () => {
    const h = K({ jaksofokus: JF });
    expect(h).toContain('Konseptin osat · mitä katsotaan pelissä');
    expect(h).toContain('1 ei näy · 2 ohjatusti · 3 itsenäisesti');
    expect((h.match(/idp-kpi-row/g) || []).length).toBe(2);
    expect((h.match(/arvioi Kehityksessä/g) || []).length).toBe(2);
    expect(h).toContain('Sijoitu diagonaalisesti');
    // EI keksittyä 1–3 näkyy-tilaa (skaala näkymä vasta R4)
    expect(h).not.toContain('näkyy <b>itsenäisesti</b>');
  });
});

describe('cue → Viikko + reflektio', () => {
  it('kaction: cue + harjoitemäärä + → Viikko (_jspVaihda 4)', () => {
    const h = K({ jaksofokus: JF });
    expect(h).toContain('idp-kaction');
    expect(h).toContain('2 harjoitetta');
    expect(h).toContain('_jspVaihda(4)');
  });
  it('reflektio = eri kysymys kuin pelaajan peili (kys[1])', () => {
    const h = K({ jaksofokus: JF });
    expect(h).toContain('Reflektio');
    expect(h).toContain('Missä oli lähin vastustaja?');   // kys[1], ei kys[0] (peilin cue)
  });
});

describe('rehellinen tyhjä + kytkentä', () => {
  it('ei jaksofokusta → tyhjä (ei ydintä)', () => {
    expect(K({})).toBe('');
  });
  it('kutsuttu _vpAloitusJaksofokusHTML:n sisältä (fokus-heron sisään, additiivinen)', () => {
    const jf = extract('function _vpAloitusJaksofokusHTML(p) {');
    expect(jf).toContain('h += _vpAloitusKonseptiYdinHTML(p);');
  });
});
