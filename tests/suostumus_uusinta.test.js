/**
 * Suostumuksen uusiminen näkyväksi (2.10.2026): suostumussivu näyttää selitteen, kun kutsulinkissä on
 * suostumusAnnettu (Seura lisää sen, kun pelaajalla on jo annettu suostumus). vahvistaSuostumus ennallaan.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const LOMAKE = readFileSync(join(ROOT, 'TalentMaster_Rekisterointi_Suostumus.html'), 'utf8');
global.window = {}; require_(join(ROOT, 'lib', 'tm_lang.js')); const L = global.window.TM_LANG; delete global.window;
const pura = (t) => { const a = LOMAKE.indexOf(t); if (a < 0) throw new Error(t); let d = 0; for (let j = LOMAKE.indexOf(') {', a) + 2; ; j++) { if (LOMAKE[j] === '{') d++; else if (LOMAKE[j] === '}') { d--; if (!d) return LOMAKE.slice(a, j + 1); } } };

function ymp(tFn) {
  const v1 = { firstChild: null, insertBefore(n) { this.lisatty = n; } };
  const ctx = { el: (id) => (id === 'v1' ? v1 : null), document: { createElement: () => ({ style: {}, setAttribute() {} }) } };
  if (tFn) ctx.t = tFn;
  vm.createContext(ctx);
  vm.runInContext(pura('function _uusintaSelite(arvo) {') + '\n' + pura('function _naytaUusintaSelite(arvo) {')
    + '\nthis.selite = _uusintaSelite; this.nayta = _naytaUusintaSelite;', ctx);
  return { ctx, v1 };
}

describe('suostumussivu · uusinnan selite (ajettu)', () => {
  it('päivämäärä → "Suostumus annettu 12.6.2026 — tällä lomakkeella uusit sen."', () => {
    const { ctx, v1 } = ymp();
    ctx.nayta('2026-06-12');
    expect(v1.lisatty.textContent).toBe('Suostumus annettu 12.6.2026 — tällä lomakkeella uusit sen.');
    expect(v1.lisatty.id).toBe('uusintaSelite');
  });
  it('ilman päivää (annettu) → ei tuplavälilyöntiä', () => {
    expect(ymp().ctx.selite('annettu')).toBe('Suostumus annettu — tällä lomakkeella uusit sen.');
  });
  it('kielitiedostosta muuttujalla {pvm} (en)', () => {
    const tEn = (k, m) => L.en.suostumus.uusinta_selite.replace('{pvm}', m.pvm);
    expect(ymp(tEn).ctx.selite('2026-06-12')).toBe('Consent given 12.6.2026 — use this form to renew it.');
  });
  it('näytetään vain kun pelaajaId on linkissä; kielivaihto päivittää tekstin', () => {
    expect(LOMAKE).toContain('else if (_pelaajaId && _urlParams.suostumusAnnettu) _naytaUusintaSelite(_urlParams.suostumusAnnettu);');
    expect(pura('function _rekKaanna() {')).toContain("_uusintaSelite(_urlParams.suostumusAnnettu)");
  });
  it('tekstit fi + en + sv (Gemini-erä 8.10.2026)', () => {
    expect(L.fi.seura.uusinta_vahvistus).toBe('Suostumus on jo annettu {pvm}. Lähetetäänkö huoltajalle suostumuksen uusimispyyntö?');
    expect(L.fi.suostumus.uusinta_selite).toBe('Suostumus annettu {pvm} — tällä lomakkeella uusit sen.');
    expect(L.en.seura.uusinta_vahvistus).toContain('{pvm}'); expect(L.en.suostumus.uusinta_selite).toContain('{pvm}');
    expect(L.sv.seura.uusinta_vahvistus).toBeTruthy(); expect(L.sv.suostumus.uusinta_selite).toBeTruthy();
    const lista = require_('./tm_lang_sv_odotuslista.cjs');
    expect(lista).not.toContain('seura.uusinta_vahvistus'); expect(lista).not.toContain('suostumus.uusinta_selite');
  });

});
