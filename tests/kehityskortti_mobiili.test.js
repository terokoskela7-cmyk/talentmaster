/**
 * PR E — kehityskortti (naytaFcOverlay) skaalautuu puhelimen näyttöön. Ennen .fc-wrap oli kiinteä 286×470 px (~70 % leveydestä).
 * scale = min((innerWidth-32)/286, (innerHeight-160)/470, 1.45), alaraja 1 · skaalaus ULOMMASSA kääreessä (.fc-scale/.fc-scale-in),
 * jotta .fc-wrap:n fcRise- ja .fc-face:n flip-transformit säilyvät · resize/orientationchange · §6 yksi @media(max-width:768px).
 * Visuaalinen todennus: Playwright-kuvat PR:ssä (360×780, 430×932, etu + taka).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PEL = readFileSync(join(ROOT, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
function pura(tunniste) {
  const i = PEL.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = PEL.indexOf('{', i); k < PEL.length; k++) { if (PEL[k] === '{') syv++; else if (PEL[k] === '}') { syv--; if (!syv) return PEL.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const ctx = vm.createContext({ Math });
vm.runInContext(pura('function _fcSkaala(') + '\nthis.f = _fcSkaala;', ctx);

describe('Kehityskortti mobiilissa · skaala', () => {
  it('360×780 ja 430×932: kortti leveämmäksi, napit mahtuvat (korkeusraja) — skaala lasketaan kaavalla', () => {
    expect(ctx.f(360, 780)).toBeCloseTo(Math.min(328 / 286, 620 / 470), 5);   // ≈1.147 → 328 px leveä (ennen 286)
    expect(ctx.f(430, 932)).toBeCloseTo(Math.min(398 / 286, 772 / 470), 5);   // ≈1.392
    for (const [w, h] of [[360, 780], [430, 932]]) {
      const s = ctx.f(w, h);
      expect(286 * s, 'leveys + 16 px reunat').toBeLessThanOrEqual(w - 32 + 1e-9);
      expect(470 * s + 160, 'kortti + napit (~160 px) mahtuu ilman vieritystä').toBeLessThanOrEqual(h + 1e-9);
    }
  });
  it('yläraja 1.45 (tabletti/desktop) ja alaraja 1 (ei kutisteta pienellä näytöllä)', () => {
    expect(ctx.f(1440, 1200)).toBe(1.45);
    expect(ctx.f(300, 500)).toBe(1);
  });
  it('skaalaus ulommassa kääreessä: .fc-wrap ja flip-transformit koskemattomat', () => {
    expect(PEL).toMatch(/\.fc-scale\{[^}]*width:calc\(286px \* var\(--fc-s\)\)[^}]*height:calc\(470px \* var\(--fc-s\)\)/);
    expect(PEL).toMatch(/\.fc-scale-in\{[^}]*transform:scale\(var\(--fc-s\)\)[^}]*transform-origin:0 0/);
    expect(PEL).toContain('.fc-wrap{width:286px;height:470px;');   // sisäinen layout ennallaan
    expect(PEL).toContain(`'<div class="fc-scale" id="fcScale"><div class="fc-scale-in"><div class="fc-wrap" id="fcWrap">'`);
    const ov = pura('function naytaFcOverlay(');
    expect(ov.indexOf("el.classList.add('active');")).toBeLessThan(ov.indexOf('_fcSkaalaa();'));
  });
  it('päivittyy resize- ja orientationchange-tapahtumassa (kuuntelija kerran)', () => {
    expect(PEL).toContain("window.addEventListener('resize', _fcSkaalaa);");
    expect(PEL).toContain("window.addEventListener('orientationchange', _fcSkaalaa);");
    expect(PEL).toContain('window._fcSkaalaKuuntelija = true;');
  });
  it('§6: vain YKSI @media(max-width:768px) tiedostossa; skaalaus ei käytä display:none-animaatiota', () => {
    expect((PEL.match(/@media\s*\(\s*max-width\s*:\s*768px\s*\)/g) || []).length).toBe(1);
    expect(pura('function _fcSkaalaa(')).not.toMatch(/display/);
  });
});
