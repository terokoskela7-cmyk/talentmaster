/* "Ei tekniikkadataa · N joukkuetta" -rivi Tilanteessa (PR 3): rivi näkyy AINA, myös leveällä (1280 px).
 * Vika PR 2:ssa: rivillä oli luokka .tt-ilmankortti, joka on kapean näkymän "Ei jaksoa" -kortti ja piilossa ≥ 760 px (display:none) → pilotin 1280-kuvassa ei riviä. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TT = require('../lib/tm_vp_tilanne.js'), F = require('./helpers/vp_fixture.cjs');
const NYT = Date.UTC(2026, 9, 10, 12);
const html = (tila) => { const d = F.lataa(tila, NYT); return { d, h: TT.tmTilanneHTML(TT.tmTilanneMalli(d.syote), { t: (x) => x, fn: { testijakso: 'te', joukkue: 'jk', auki: 'au' } }) }; };
const teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('Tilanne: "Ei tekniikkadataa · N joukkuetta" (pilotti-fixture)', () => {
  it('pilotti: rivi on huomioiden lopussa omana rivinään, N = ilman luokkaa jäävät joukkueet, linkki vie testijaksoon', () => {
    const { d, h } = html('pilotti'), i = h.indexOf('id="tilanneEiTekniikkaa"');
    expect(d.tekniikka.eiTekniikkadataa).toBe(10); expect(i).toBeGreaterThan(0);
    const rivi = h.slice(i, h.indexOf('Suunnittele testijakso', i) + 40);
    expect(teksti(rivi)).toContain('Ei tekniikkadataa · 10 joukkuetta'); expect(rivi).toContain('onclick="te()"'); expect(rivi).toContain('Suunnittele testijakso');
    /* sijainti: huomioiden (.tt-list) jälkeen, samassa sarakkeessa, ennen ehdotuksia */
    const sar = h.slice(h.indexOf('id="tilannePoikkeamat"'), h.indexOf('id="tilanneEhdotukset"'));
    expect(sar.indexOf('class="tt-list"')).toBeGreaterThan(0); expect(sar.indexOf('id="tilanneEiTekniikkaa"')).toBeGreaterThan(sar.indexOf('class="tt-list"')); expect(sar.trim().endsWith('</div></div>') || sar.includes('id="tilanneEiTekniikkaa"')).toBe(true);
    /* tunnisteet: kuusi + "+N" (D144), ei joukkuerivejä toistettuna */
    expect((rivi.match(/class="tt-tg n"/g) || []).length).toBeGreaterThanOrEqual(6); expect(rivi).toMatch(/\+4/);
  });
  it('näkyvyys: rivi EI käytä .tt-ilmankortti-luokkaa (display:none ≥ 760 px), eikä mikään CSS-sääntö piilota .tt-tekei:tä', () => {
    const { h } = html('pilotti'), i = h.indexOf('id="tilanneEiTekniikkaa"'), alku = h.lastIndexOf('<div', i + 1);
    expect(h.slice(alku, i + 30)).toContain('tt-tekei'); expect(h.slice(alku, i + 30)).not.toContain('tt-ilmankortti');
    const hide = TT.CSS.split('\n').filter((r) => /tt-tekei/.test(r)).join('\n');
    expect(hide).toContain('.tt-tekei{display:grid'); expect(hide).not.toMatch(/tt-tekei[^{}]*\{[^}]*display:none/);
    for (const r of TT.CSS.split('\n')) { const m = /([^{}]*tt-tekei[^{}]*)\{([^}]*)\}/.exec(r); if (m) expect(m[2]).not.toMatch(/display:none/); }
  });
  it('muut tilat: kypsä (0 ilman dataa) → ei riviä; kuormitus (27) → rivi; tyhjä seura → ei riviä', () => {
    expect(html('kypsa').h).not.toContain('id="tilanneEiTekniikkaa"');
    const k = html('kuormitus'); expect(teksti(k.h)).toContain('Ei tekniikkadataa · ' + k.d.tekniikka.eiTekniikkadataa + ' joukkuetta');
    expect(html('tyhja').h).not.toContain('id="tilanneEiTekniikkaa"');
  });
});
