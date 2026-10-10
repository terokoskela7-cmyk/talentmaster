/* "Ei tekniikkadataa · N joukkuetta" -rivi Tilanteessa (PR 3): rivi näkyy AINA, myös leveällä (1280 px).
 * Vika PR 2:ssa: rivillä oli luokka .tt-ilmankortti, joka on kapean näkymän "Ei jaksoa" -kortti ja piilossa ≥ 760 px (display:none) → pilotin 1280-kuvassa ei riviä. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const TT = require('../lib/tm_vp_tilanne.js'), F = require('./helpers/vp_fixture.cjs');
const NYT = Date.UTC(2026, 9, 10, 12);
const html = (tila) => { const d = F.lataa(tila, NYT); return { d, h: TT.tmTilanneHTML(TT.tmTilanneMalli(d.syote), { t: (x) => x, fn: { testijakso: 'te', joukkue: 'jk', auki: 'au' } }) }; };
const teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

/* PR 3 (korjaus): "Ei tekniikkadataa" on rivi YHDESSÄ Mittausaukot-kortissa (id tilanneMittausaukot) — rivi per aukko, yksi linkki kortin lopussa. */
const rivi = (h, id) => { const i = h.indexOf('id="' + id + '"'); if (i < 0) return ''; const j = h.indexOf('class="tt-aukko"', i + 10), k = h.indexOf('class="tt-cta"', i); return h.slice(i, Math.min(...[j, k].filter((x) => x > 0))); };
describe('Tilanne: "Ei tekniikkadataa · N joukkuetta" Mittausaukot-kortin rivinä (pilotti-fixture)', () => {
  it('pilotti: rivi on kortissa, N = ilman luokkaa jäävät joukkueet, kortin linkki vie testijaksoon', () => {
    const { d, h } = html('pilotti'), i = h.indexOf('id="tilanneEiTekniikkaa"');
    expect(d.tekniikka.eiTekniikkadataa).toBe(10); expect(i).toBeGreaterThan(h.indexOf('id="tilanneMittausaukot"'));
    const r = rivi(h, 'tilanneEiTekniikkaa'), kortti = h.slice(h.indexOf('id="tilanneMittausaukot"'), h.indexOf('id="tilanneEhdotukset"'));
    expect(teksti(r)).toContain('Ei tekniikkadataa · 10 joukkuetta'); expect(kortti).toContain('onclick="te()"'); expect(kortti).toContain('Suunnittele testijakso');
    const sar = h.slice(h.indexOf('id="tilannePoikkeamat"'), h.indexOf('id="tilanneEhdotukset"')); expect(sar.indexOf('id="tilanneMittausaukot"')).toBeGreaterThan(sar.indexOf('class="tt-list"'));
    expect((r.match(/class="tt-tg n"/g) || []).length).toBe(7); expect(r).toMatch(/\+4/);   // kuusi + "+4" (D144)
  });
  it('näkyvyys: kortti EI käytä .tt-ilmankortti-luokkaa (display:none ≥ 760 px), eikä mikään CSS-sääntö piilota .tt-aukot:ia', () => {
    const { h } = html('pilotti'), i = h.indexOf('id="tilanneMittausaukot"'), alku = h.lastIndexOf('<div', i + 1);
    expect(h.slice(alku, i + 30)).toContain('tt-aukot'); expect(h.slice(alku, i + 30)).not.toContain('tt-ilmankortti');
    for (const r of TT.CSS.split('\n')) { const m = /([^{}]*tt-aukot?[^{}]*)\{([^}]*)\}/.exec(r); if (m) expect(m[2]).not.toMatch(/display:none/); }
    expect(TT.CSS).toContain('.tt-aukot{display:grid');
  });
  it('muut tilat: kypsä (0 ilman dataa) → ei tekniikkariviä; kuormitus → rivi; tyhjä seura → ei korttia', () => {
    expect(html('kypsa').h).not.toContain('id="tilanneEiTekniikkaa"');
    const k = html('kuormitus'); expect(teksti(k.h)).toContain('Ei tekniikkadataa · ' + k.d.tekniikka.eiTekniikkadataa + ' joukkuetta');
    expect(html('tyhja').h).not.toContain('id="tilanneMittausaukot"');
  });
});
