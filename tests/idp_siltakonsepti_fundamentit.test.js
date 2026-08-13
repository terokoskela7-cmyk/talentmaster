/**
 * TalentMaster™ — R1.2-korjaus: _vpSiltaKonsepti hakee myös TM_TT_FUNDAMENTIT (pelipaikkakonseptit).
 * Ennen: vain TM_TT_YOUTH → pelipaikka-avaimelle (mv_p1) null → konseptin osat/miksi/reflektio katosivat.
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

let SK;
beforeAll(() => {
  SK = new Function(
    'var TM_TT_YOUTH = [{ avain: "y_h0", nimi: "HAVAINNOINTI", kpi: [{koodi:"a",teksti:"x"}] }];\n' +
    'var TM_TT_FUNDAMENTIT = { MV: [{ avain: "mv_p1", nimi: "MV-PERUSTEET", kpi: [{koodi:"a"},{koodi:"b"},{koodi:"c"},{koodi:"d"}], kysymykset: ["q1","q2"] }], LP: [{ avain: "lp_p1", nimi: "LAITAPUOLUSTAJA" }] };\n' +
    extract('function _vpSiltaKonsepti(avain) {') + '\n return { sk: _vpSiltaKonsepti };'
  )().sk;
});

describe('_vpSiltaKonsepti — youth + fundamentit', () => {
  it('youth-avain löytyy (ennallaan)', () => {
    expect(SK('y_h0').nimi).toBe('HAVAINNOINTI');
  });
  it('pelipaikka-avain (mv_p1) löytyy TM_TT_FUNDAMENTIT:sta (ei enää null) — kpi/kysymykset mukana', () => {
    const k = SK('mv_p1');
    expect(k).not.toBeNull();
    expect(k.nimi).toBe('MV-PERUSTEET');
    expect(Array.isArray(k.kpi)).toBe(true);
    expect(k.kpi.length).toBe(4);
    expect(k.kysymykset.length).toBe(2);
  });
  it('toinen pelipaikkaryhmä (LP) myös löytyy', () => {
    expect(SK('lp_p1').nimi).toBe('LAITAPUOLUSTAJA');
  });
  it('tuntematon avain → null', () => {
    expect(SK('ei_ole')).toBeNull();
    expect(SK(null)).toBeNull();
  });
});

describe('lähdekorjaus paikallaan', () => {
  it('TM_TT_FUNDAMENTIT-loop lisätty youth-loopin jälkeen (typeof-vartioitu)', () => {
    expect(HTML).toContain("if (typeof TM_TT_FUNDAMENTIT !== 'undefined') {");
    expect(HTML).toContain('for (const pos in TM_TT_FUNDAMENTIT) {');
  });
});
