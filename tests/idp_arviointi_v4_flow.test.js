/**
 * TalentMaster™ — R3.A: Arviointi v4 rail-vapaa + flow-järjestys (kattavuus ensin, silta toiseksi).
 * Pelkkä asettelu/järjestys — arviointikoneistoa (autosave · _jspTab5-re-render · silta-handlerit) EI kosketa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

function arviointi() {
  const lines = HTML.split('\n');
  const s = lines.findIndex((l) => l.includes('function _vpArviointiHTML(p) {'));
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}' && lines[i - 1] !== undefined) { e = i; break; } }
  // _vpArviointiHTML on iso; grabataan reilusti (ensimmäinen col-0 '}').
  return lines.slice(s, (e > s ? e : s + 400) + 1).join('\n');
}

describe('R3.A — flow-järjestys: kattavuus ENSIN, silta TOISEKSI', () => {
  const A = arviointi();

  it('h ei enää alusta siltapaneeleilla (silta ei ylimpänä)', () => {
    expect(A).not.toContain("let h = _d1Prio ? (_d1Silta + _d2Silta) : (_d2Silta + _d1Silta);");
    expect(A).toContain("let h = '';");
  });

  it('SILTA renderöidään kattavuusruudukon (jsp-arv-cov) JÄLKEEN', () => {
    const iCov = A.indexOf("h += '<div class=\"jsp-arv-cov\">';");
    const iSilta = A.indexOf('h += _d1Prio ? (_d1Silta + _d2Silta) : (_d2Silta + _d1Silta);');
    expect(iCov).toBeGreaterThan(0);
    expect(iSilta).toBeGreaterThan(0);
    expect(iCov).toBeLessThan(iSilta);   // kattavuus ennen siltaa
  });

  it('silta-paneelit + prioriteettijärjestys ennallaan (sama sisältö, vain sijainti)', () => {
    expect(A).toContain('_vpSiltaPaneeliHTML(p)');
    expect(A).toContain('_d1Prio ? (_d1Silta + _d2Silta) : (_d2Silta + _d1Silta)');   // sama prioriteettilauseke
  });
});

describe('R3.A — rail-vapaa kattaa myös Arvioinnin (tab 2)', () => {
  it('_jspVaihda togglaa railvapaan tabeille 0/1/2', () => {
    expect(HTML).toContain("_grid.classList.toggle('jsp-railvapaa', n === 0 || n === 1 || n === 2 || n === 3 || n === 4)");
  });
});
