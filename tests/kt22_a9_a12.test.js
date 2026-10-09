/**
 * Kehitystyöpöytä 22 · A9 + A12 — V4-siivous (liput.kentta): kuollut koodi ja toisto pois, kehittäjäkieli pois käyttäjätekstistä.
 * Vanha modaali ennallaan (poistuu 1.12., D49).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const KT = require('../lib/tm_kehitystyopoyta.js');
const __dir = dirname(fileURLToPath(import.meta.url));
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');
const MASTER = readFileSync(join(__dir, '..', 'TalentMaster_Master_v16.html'), 'utf8');
const fnRunko = (src, sig) => { const i = src.indexOf(sig); const j = src.indexOf('\n}\n', i); return src.slice(i, j + 3); };

describe('A9 · V4 Tänään ja Polku', () => {
  const h = KT.tmKtTanaanHTML({ pid: 'p1', kenttaHTML: '<i>kentta</i>', signaaliHTML: '<i>sig</i>', osat: [{ k: 'a', teksti: 'osa' }], rivitila: { teksti: 'Jakso käynnissä · vk 1' }, askel: { teksti: 'ASKEL' } }, { t: (k) => k });
  it('Tänään: ei Polun tila -korttia (D99) eikä kehyksen omaa Seuraava askel -korttia', () => {
    expect(h).not.toContain('Polun tila');
    expect(h).not.toContain('Jakso käynnissä');
    expect(h).not.toContain('data-kt-askel');
    expect(h).not.toContain('ASKEL');
    expect(h).toContain('sig'); expect(h).toContain('kentta');   // signaali + kenttä + osat säilyvät
  });
  it('adapterit eivät enää välitä askel:null / rivitilaa Tänäänille', () => {
    for (const src of [VP, MASTER]) expect(src).not.toContain('osat: osat, askel: null');
  });
  it('VP Polku (V4): ei Pelaajan ääni- eikä Seuraava askel -lohkoa; vanha modaali kutsuu niitä edelleen', () => {
    const polku = fnRunko(VP, 'function _ktPolkuHTML(p) {');
    expect(polku).not.toContain('_vpPelaajanAaniHTML(p)');
    expect(polku).not.toContain('_vpKehSeuraavaAskelHTML(p)');
    expect(VP).toMatch(/_kehExtra \+= '<div id="_jspKehAskel">' \+ _vpKehSeuraavaAskelHTML\(p\)/);   // vanha modaali ennallaan
    expect(VP).toMatch(/hR \+= '<div id="_jspTab3[^;]*_vpPelaajanAaniHTML\(p\)/);
  });
  it('viikkorefleksio pois V4:stä (_vpOnV4), vanhassa modaalissa ennallaan', () => {
    const vk = VP;
    expect(vk).toContain("(typeof _vpOnV4 === 'function' && _vpOnV4())");
    expect(vk).toMatch(/\? '<div class="jsp-wk-duo"><div>' \+ _vpViikkoLasnaoloHTML\(p, st\) \+ '<\/div><\/div>'/);
    expect(vk).toContain('_vpViikkoAaniHTML(p, st)');   // vanha polku
    expect(VP).toMatch(/_ktS\.v4Render = true;[\s\S]*_vpViikkoHTML\(p\)[\s\S]*finally \{ _ktS\.v4Render = false; \}/);
  });
});

describe('A12 · kehittäjäkieli pois käyttäjätekstistä', () => {
  const vpTtekstit = VP.match(/vpT\('(?:[^'\\]|\\.)*'\)/g) || [];   // vain käyttäjälle näkyvät merkkijonot (ei koodikommentteja)
  it('A12-listan tekstit eivät sisällä koodiviitteitä', () => {
    for (const k of ['(§35 K2)', 'EPPP-rytmi, §37', 'ottelupäivä-suhteinen', 'kausi › 📍 jakso']) expect(vpTtekstit.filter((t) => t.includes(k)), k).toEqual([]);
    expect(VP).not.toContain('lahde:pelaaja</span>');
    expect(VP).not.toContain('K2 · \' + vpT(\'kalenteri');
  });
  it('uudet tekstit: siistitty muoto', () => {
    expect(VP).toContain('🎯 Kausi › 📍 Jakso › 📈 Eteneminen');
    expect(VP).toContain('Fokus jaetaan ottelupäivän mukaan, ei joka treeniin');
    expect(VP).toContain("vpT('ei arvosana.')");
  });
});
