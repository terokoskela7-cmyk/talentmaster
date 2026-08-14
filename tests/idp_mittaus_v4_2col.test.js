/**
 * TalentMaster™ — Mittaus v4 -asettelu: rail-vapaa + 2-sarake D1|D2 (kartta .cols 1fr 1fr).
 * Sijoittelu (ei uutta dataa): tulkintakerros (tuoreus/§28/synth) täysleveä → D1 Fyysinen | D2 Tekninen vierekkäin
 * → Kehon valmius + nextstep täysleveinä. Profiiliraili piiloon Mittauksella (kuten Aloituksella).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

describe('Mittaus v4 — 2-sarake D1|D2 + rail-vapaa', () => {
  it('CSS: .mit-cols = grid 1fr 1fr + mobiili-stack', () => {
    expect(HTML).toContain('.mit-cols { display: grid; grid-template-columns: 1fr 1fr;');
    expect(HTML).toMatch(/@media \(max-width: 900px\) \{ \.mit-cols \{ grid-template-columns: 1fr;/);
  });

  it('f1/f2 kääritty .mit-cols-sarakkeisiin (Fyysinen | Tekninen), erotin poistettu välistä', () => {
    expect(HTML).toContain("'<div class=\"mit-cols\"><div>' + _mSub('Fyysinen · mitattu') + f1 + '</div><div>' + _mSub('Tekninen · mitattu') + f2 + '</div></div>'");
    // vanha pino (_mErot f1:n ja f2:n VÄLISSÄ) poistettu
    expect(HTML).not.toContain("_mSub('Fyysinen · mitattu') + f1 + _mErot + _mSub('Tekninen · mitattu')");
  });

  it('tulkintakerros (tuoreus/§28/synth) ENNEN cols; Kehon valmius + nextstep JÄLKEEN (täysleveinä)', () => {
    const iTuoreus = HTML.indexOf('_vpMittausTuoreusHTML(p, ika) :');
    const iSynth = HTML.indexOf('_vpMittausSynthHTML(p, ika, d1, d2, tsi) :');
    const iCols = HTML.indexOf("'<div class=\"mit-cols\"><div>' + _mSub('Fyysinen");
    const iKehon = HTML.indexOf("_mSub('Kehon valmius')");
    const iNext = HTML.indexOf('_vpMittausNextStepHTML(p) :');
    expect(iTuoreus).toBeLessThan(iSynth);
    expect(iSynth).toBeLessThan(iCols);
    expect(iCols).toBeLessThan(iKehon);
    expect(iKehon).toBeLessThan(iNext);
  });

  it('rail-vapaa kattaa Aloituksen (0) + Mittauksen (1); muut välilehdet → raili takaisin', () => {
    expect(HTML).toContain("_grid.classList.toggle('jsp-railvapaa', n === 0 || n === 1 || n === 2)");
    expect(HTML).toContain('.jsp-grid.jsp-railvapaa > .jsp-left { display: none; }');
  });
});
