/**
 * TalentMaster™ — R4-korjaus: Kehitys v2 viimeistely (4 kosmeettista aukkoa brief'istä).
 * (1) Aloituksen off-palette-pinkki pois · (2) D3-linkki + diag-toggle blue→teal (teal ainoa aksentti) ·
 * (3) rolenote §37 + pelifoot _kehExtra:n loppuun (kartta .rolenote + .pelifoot). Vain väri + 2 lohkoa, ei logiikkaa.
 */
import { describe, it, expect } from 'vitest';
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

describe('(1) Aloituksen lähdechip neutraali (ei off-palette-pinkkiä)', () => {
  it('_vpAloitusHTML pelihavainto-lähde = var(--ink3), ei #c060a8', () => {
    const T = extract('function _vpAloitusHTML(p) {');
    expect(T).not.toContain('#c060a8');
    expect(T).toContain('<div class="vpal-meta" style="color:var(--ink3)">\' + vpT(\'◎ Lähde: pelihavainto\')');  // i18n V6: teksti vpT-reititetty; väri-guard (var(--ink3)) säilyy
  });
});

describe('(2) teal ainoa aksentti — Kehitys-linkit blue→teal', () => {
  it('D3-kalibraatio-linkki teal (ei sininen)', () => {
    expect(HTML).toContain('🧠 D3-kalibraatio (itse × valmentaja × VP) → <span style="color:var(--teal);cursor:pointer;font-weight:600" onclick="_jspVaihda(2)">Arviointi-välilehti</span>');
    expect(HTML).not.toContain('color:var(--blue);cursor:pointer;font-weight:600" onclick="_jspVaihda(2)">Arviointi-välilehti');
  });
  it('diagnostiikka-toggle teal (ei sininen)', () => {
    expect(HTML).toContain('color:var(--teal);cursor:pointer;font-weight:600">▸ Diagnostiikka (PHV · testipäivät)</span>');
    expect(HTML).not.toContain('color:var(--blue);cursor:pointer;font-weight:600">▸ Diagnostiikka (PHV · testipäivät)</span>');
  });
});

describe('(3) rolenote §37 + pelifoot _kehExtra:n loppuun (diagnostiikan JÄLKEEN)', () => {
  it('rolenote §37 (roolijako) + pelifoot ("Peli edellä") lisätty', () => {
    expect(HTML).toContain('<b style="color:var(--ink2);font-weight:500">Roolit §37:</b> valmentaja omistaa operatiivisen jaksofokuksen');
    expect(HTML).toContain('<b style="color:var(--ink2);font-weight:500">Peli edellä, muut mukana.</b> Jaksofokus voi olla fyysinen, teknis-taktinen tai psyykkinen');
  });
  it('järjestys: diagnostiikka → rolenote → pelifoot → hR-kokoonpano', () => {
    const iDiag = HTML.indexOf("' + f4 + '</div></div>';");
    const iRole = HTML.indexOf('Roolit §37:</b> valmentaja omistaa');
    const iPeli = HTML.indexOf('Peli edellä, muut mukana.</b> Jaksofokus');
    const iHr = HTML.indexOf('let hR = \'\';');
    expect(iDiag).toBeGreaterThan(0);
    expect(iDiag).toBeLessThan(iRole);
    expect(iRole).toBeLessThan(iPeli);
    expect(iPeli).toBeLessThan(iHr);
  });
});
