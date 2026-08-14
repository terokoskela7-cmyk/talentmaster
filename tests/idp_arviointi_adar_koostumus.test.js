/**
 * TalentMaster™ — R3.B: D4 Peliäly ADAR-koostumuslohko (v3 "koostumus näkyviin").
 * Read-only näkymä: reuse p.adar_viimeisin (a/d/ac/r 1–3) + tmAdarIkaTier-ikäportti. EI autosavea.
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

let AK;
beforeAll(() => {
  AK = new Function(
    'var _jsvEsc = function(s){return String(s==null?"":s);};\n' +
    'var _pvmLyhyt = function(s){return "1.6.2025";};\n' +
    // reuse tmAdarIkaTier (kanoninen ikäportti): <13→[a] · 13–15→[a,d,ac] · 16+→[a,d,ac,r]
    'var tmAdarIkaTier = function(ika){ if(ika==null) return ["a","d","ac","r"]; if(ika<11) return ["a"]; if(ika<16) return ["a","d","ac"]; return ["a","d","ac","r"]; };\n' +
    extract('function _vpArvAdarKoostumusHTML(p, ika) {') + '\n return { ak: _vpArvAdarKoostumusHTML };'
  )().ak;
});

describe('ADAR-koostumus — 4 osaa + ikäportti', () => {
  it('U13 (13): Havaitse/Päätä/Toimi aktiivisia, Arvioi LUKOSSA (avautuu 16 v)', () => {
    const h = AK({ adar_viimeisin: { a: 3, d: 2, ac: 3, r: 2, yht: 2.6, pvm: '2025-06-01' } }, 13);
    expect(h).toContain('D4 Peliäly · pelihavainnosta (ADAR) · 1–3');
    expect(h).toContain('Havaitse');
    expect(h).toContain('Päätä');
    expect(h).toContain('Toimi');
    expect(h).toContain('Arvioi');
    expect(h).toContain('jsp-adar-row locked');   // Arvioi lukossa
    expect(h).toContain('avautuu 16 v');
    expect(h).toContain('U13-portti');
  });
  it('U16 (16): kaikki 4 aktiivista (ei lukittua)', () => {
    const h = AK({ adar_viimeisin: { a: 3, d: 2, ac: 3, r: 2, yht: 2.5 } }, 16);
    expect(h).not.toContain('jsp-adar-row locked');
    expect(h).not.toContain('avautuu 16 v');
  });
  it('scale3: arvo 3 → 3 täyttä (teal) · arvo 2 → low-luokka (amber) + av-teksti', () => {
    const h = AK({ adar_viimeisin: { a: 3, d: 2, ac: 3, r: 2 } }, 16);
    expect(h).toContain('jsp-scale3 low');       // Päätä 2/3 → low
    expect(h).toContain('<b>3</b>/3 · itsenäisesti');
    expect(h).toContain('<b>2</b>/3 · ohjatusti');
  });
  it('Kokonais-summa aktiivisista osista (U16 kaikki 4: 3+2+3+2 = 10/12)', () => {
    expect(AK({ adar_viimeisin: { a: 3, d: 2, ac: 3, r: 2 } }, 16)).toContain('Kokonais <b style="color:var(--ink2)">10/12</b>');
  });
  it('ei ADAR-dataa → rehellinen tyhjä (lohko pois)', () => {
    expect(AK({}, 13)).toBe('');
  });
});

describe('kytkentä _vpArviointiHTML:ään (v3-järjestys)', () => {
  it('ADAR-koostumus renderöidään ENNEN D3-kalibraatiota', () => {
    const iAdar = HTML.indexOf('_vpArvAdarKoostumusHTML(p, ika)');
    const iD3 = HTML.indexOf('_vpD3KalibraatioHTML(p);');
    expect(iAdar).toBeGreaterThan(0);
    expect(iAdar).toBeLessThan(iD3);
  });
  it('read-only: ei onclick/autosavea koostumuslohkossa', () => {
    const T = extract('function _vpArvAdarKoostumusHTML(p, ika) {');
    expect(T).not.toContain('onclick');
    expect(T).not.toContain('tallentu');
  });
});
