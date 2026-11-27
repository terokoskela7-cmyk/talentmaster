/* B2 (BACKLOG_2_11.md): Peli-kortin Valmennettavuus-rivi on D3:n coachability (1–5), muut rivit ADAR (1–3). Kortin alarivi "Pelihavainnot · pvm · n havaintoa"
   koskee vain ADAR-rivejä → Valmennettavuus-rivillä oma lähde- ja päivämerkintä ("Psyykkinen arvio · 30.9.2026"), ettei sitä lueta pelihavainnoksi.
   Vain henkilökunnan näkymä (lib ei lataudu Pelaaja- eikä Vanhempi-sovellukseen, §7.22). Tekstit olemassa olevista avaimista (tc_l_d3, tc_lahde_rivi_*), ei uusia sv-avaimia. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { TOPIAS } from './helpers/k4a_fixturet.mjs';
const require = createRequire(import.meta.url);
const N = require('../lib/tm_eerikkila_normit.js');
globalThis.tkLajiTaso = require('../docs/testit_indeksit.js').tkLajiTaso;
globalThis.normiIka = N.normiIka;
const TC = require('../lib/tm_todistekortit.js'), TH = require('../lib/tm_todistekortit_html.js'), L = require('../lib/tm_naytto_lohkot.js');
const NYT = new Date('2026-10-19T12:00:00');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const malli = (p) => { const isp = L.tmNayttoDevIkaSp(p); const c = { nyt: NYT, ika: isp.ika, sp: isp.sp, perTestTasot: N.perTestTasot, jaksoTila: 'ei_jaksoa', esc, pid: p.id }; return { m: TC.tmTodisteMalli(p, c), c }; };
const peliHTML = (p) => { const { m, c } = malli(p); const h = TH.tmTodisteHTML(m, c).kortitHTML, i = h.indexOf('data-tc-kortti="peli"'); return { m, h: h.slice(i, h.indexOf('</details>', i) > 0 ? h.indexOf('</details>', i) : undefined) }; };

describe('B2 · Valmennettavuus-rivin lähde Peli-kortissa', () => {
  it('malli: D3-rivillä oma merkintä (Psyykkinen arvio · D3:n päivä); ADAR-riveillä ei merkintää (kortin alarivi kattaa ne)', () => {
    const peli = malli(TOPIAS).m.kortitKaikki.peli;
    const d3 = peli.rivit.filter((r) => r.lahde === 'd3'), adar = peli.rivit.filter((r) => r.lahde === 'adar');
    expect(d3).toHaveLength(1); expect(adar.length).toBeGreaterThan(0);
    expect(d3[0].merkinta).toBe('Psyykkinen arvio · 30.9.2026');
    adar.forEach((r) => expect(r.merkinta, r.id).toBeUndefined());
    expect(peli.lahdeTeksti).toBe('Pelihavainnot · 28.9.2026');   // kortin alarivi ennallaan: ADAR-päivä, ei D3:n
  });
  it('HTML: merkintä Valmennettavuus-rivin nimen alla (data-tc-lahde="d3"), escapattu; ADAR-riveillä ei tc-rivi-m:ää', () => {
    const { h } = peliHTML(TOPIAS);
    expect(h).toMatch(/<div class="tc-rivi" data-tc-lahde="d3"><span class="tc-lbl">Valmennettavuus<span class="tc-rivi-m">Psyykkinen arvio · 30\.9\.2026<\/span><\/span>/);
    expect((h.match(/class="tc-rivi-m"/g) || []).length).toBe(1);
  });
  it('D3 ilman päivää → "Psyykkinen arvio. Päivä puuttuu" (ei hiljaista varapäivää eikä ADAR-päivää)', () => {
    const p = Object.assign({}, TOPIAS, { d3_viimeisin: { pisteet: TOPIAS.d3_viimeisin.pisteet } });
    expect(malli(p).m.kortitKaikki.peli.rivit.find((r) => r.lahde === 'd3').merkinta).toBe('Psyykkinen arvio. Päivä puuttuu');
  });
  it('ei D3:a → ei Valmennettavuus-riviä eikä merkintää', () => {
    const p = Object.assign({}, TOPIAS, { d3_viimeisin: null });
    expect(malli(p).m.kortitKaikki.peli.rivit.some((r) => r.lahde === 'd3')).toBe(false); expect(peliHTML(p).h).not.toContain('tc-rivi-m');
  });
  it('tyyli: merkintä = D169 meta (--fs-meta, --ink2), ei hex-värejä; libiä ei ladata pelaajan eikä huoltajan sovellukseen (§7.22)', () => {
    expect(TH.tmTodisteCss()).toContain('.tc-rivi-m{display:block;font-size:var(--fs-meta);line-height:1.3;color:var(--ink2);margin-top:2px}');
    for (const f of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html']) expect(readFileSync(new URL('../' + f, import.meta.url), 'utf8')).not.toMatch(/tm_todistekortit/);
  });
});
