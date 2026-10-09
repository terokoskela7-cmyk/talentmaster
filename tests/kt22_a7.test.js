/**
 * Kehitystyöpöytä 22 · A7 — datan ikä (§14): pvm jokaiselle mittausryhmälle, TK-pvm:t muotoiltuina,
 * tmKypsyys-pvm pp.kk.vvvv ja tyhjätilan CTA saa onCta:n.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');
const require = createRequire(import.meta.url);

function extract(sig) {
  const lines = HTML.split('\n');
  const s = lines.findIndex((l) => l.includes(sig));
  if (s < 0) throw new Error('ei löytynyt: ' + sig);
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}') { e = i; break; } }
  return lines.slice(s, e + 1).join('\n');
}

let tuoreus;
beforeAll(() => {
  tuoreus = new Function(
    'var _jsvEsc = function(s){return String(s==null?"":s);};\nvar vpT = function(x){return x;};\n'
    + extract('function _vpMittausTuoreusHTML(p, ika) {') + '\nreturn _vpMittausTuoreusHTML;'
  )();
});

describe('A7 · datan ikä', () => {
  it('pvm jokaiselle ryhmälle (H-H, TKI, FLEI, ADAR, kypsyys), muoto pp.kk.vvvv', () => {
    const h = tuoreus({ hh_pvm: '2026-05-01', tki_pvm: '2026-03-12', flei_pvm: '2026-02-02', adar_pvm: '2026-09-20', biologinenIka_viimeisin: { pvm: '2026-01-15' } }, 13);
    const rivi = h.slice(h.indexOf('mit-ryhmapvm'));
    ['H-H <b>1.5.2026', 'TKI <b>12.3.2026', 'FLEI <b>2.2.2026', 'ADAR <b>20.9.2026', 'Kypsyys <b>15.1.2026'].forEach((x) => expect(rivi).toContain(x));
  });
  it('vain yksi ryhmä → ei erillistä ryhmäriviä (ei toistoa)', () => {
    expect(tuoreus({ hh_pvm: '2026-05-01' }, 13)).not.toContain('mit-ryhmapvm');
  });
  it('TK-kokonaisajan pvm:t muotoillaan tmPvmFi:llä', () => {
    expect(HTML).toMatch(/_tkFi\(p\.tk_kokonaistulos_edellinen_pvm\)/);
    expect(HTML).toMatch(/_tkFi\(p\.tk_lajit_pvm\)/);
  });
  it('tmKypsyys: mitattu-pvm pp.kk.vvvv', () => {
    const K = require('../lib/tm_kypsyys.js');
    const el = { innerHTML: '', querySelector: () => null };
    K.tmKypsyys(el, { phv_tila_koodi: 'PH', maturity_offset: 0, mittaus_pvm: '2026-01-05' }, { muoto: 'täysi' });
    expect(el.innerHTML).toContain('mitattu 5.1.2026');
  });
  it('tmKypsyys-tyhjätilan CTA kytketään onCta:lla VP:ssä', () => {
    expect(HTML).toMatch(/tmKypsyys\(_kySlot, _kd, \{ muoto: 'täysi', onCta:/);
  });
});
