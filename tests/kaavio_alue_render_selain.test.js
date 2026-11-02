/* K2b · alue-kuva (drawAlue) ja täyskentän regressio OIKEASSA selaimessa (Playwright + järjestelmän Chrome).
   Regressio: ennen K2b:tä ollut renderöijä on tallessa tests/fixtures/k2b_kaavio_render_ennen.js.txt. Jokainen spec ilman
   nakyma "alue" piirtyy täsmälleen samoin (outerHTML) kuin ennen, ja editorin polku ({ taysikentta: true }) piirtää myös
   alue-specin täsmälleen kuten ennen (editorin osumatestaus = täyskentän koordinaatit).
   drawAlue: ei täyskentän merkintöjä, oikea mittasuhde, kaikki näkyvissä, pelaajat eivät mene päällekkäin, selite oikein.
   Esimerkit = hyväksytyn prototyypin (2.11.2026) 6 speciä, tests/fixtures/k2b_alue_specs.json. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { CHROME, JUURI, selainKaynnista } from './helpers/kt_sivu.mjs';
const require_ = createRequire(import.meta.url);
const lue = (p) => readFileSync(join(JUURI, p), 'utf8');
const ALUE = JSON.parse(lue('tests/fixtures/k2b_alue_specs.json'));
const { TM_KAAVIO_KANON } = require_(join(JUURI, 'lib', 'tm_kaavio_kanon_data.js'));
const V = require_(join(JUURI, 'lib', 'tm_kaavio_validate.js'));

const kaari = (nimi, src) => '(function(){var module={exports:{}};' + src + '\n;window.' + nimi + '=module.exports;})();';
const CSS = '.tm-kaavio{--accent:#28B090;--pitch:#161615;--line:rgba(242,239,230,.34);--cone:rgba(40,176,144,.20);--halo:rgba(40,176,144,.26);--fade:#4D7A6C;'
  + '--bone:#F2EFE6;--carbon:#1C1C1A;--slate:#585751;--red:#D06A5A;--teal-brd:rgba(40,176,144,.55);--ink:#F2EFE6;--ink3:#8B887F;--bg:#111110;'
  + '--font-mono:ui-monospace,monospace;--font-sans:system-ui,sans-serif}.tm-kaavio{width:300px}';

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K2b · alue-kuva ja täyskentän regressio', { timeout: 30000 }, () => {
  let selain, p;
  beforeAll(async () => {
    selain = await selainKaynnista();
    p = await selain.newPage();
    await p.setContent('<html><head><style>' + CSS + '</style></head><body><div class="tm-kaavio" id="k"></div></body></html>');
    await p.addScriptTag({ content: kaari('RO', lue('tests/fixtures/k2b_kaavio_render_ennen.js.txt')) });
    await p.addScriptTag({ content: kaari('RU', lue('lib/tm_kaavio_render.js')) });
  }, 60000);
  afterAll(async () => { if (selain) await selain.close().catch(() => {}); }, 60000);

  it('regressio: kaanonin kaaviot ja esimerkit ilman nakyma "alue" piirtyvät täsmälleen kuten ennen (fi/sv/en)', async () => {
    const specit = TM_KAAVIO_KANON.map((k) => k.spec || k).concat(ALUE.map((a) => { const s = JSON.parse(JSON.stringify(a.spec)); delete s.nakyma; return s; }));
    expect(specit.length).toBeGreaterThan(20);
    const erot = await p.evaluate((specit) => {
      const ero = [];
      specit.forEach((s, i) => ['fi', 'sv', 'en'].forEach((l) => { if (RO.drawSpec(s, l).outerHTML !== RU.drawSpec(s, l).outerHTML) ero.push(i + ':' + l); }));
      return ero;
    }, specit);
    expect(erot).toEqual([]);
  });

  it('editorin polku { taysikentta: true }: alue-spec piirtyy täyskenttänä täsmälleen kuten ennen', async () => {
    const erot = await p.evaluate((alue) => alue.filter((a) => a.spec.nakyma === 'alue')
      .filter((a) => RO.drawSpec(a.spec, a.lang).outerHTML !== RU.drawSpec(a.spec, a.lang, { taysikentta: true }).outerHTML).map((a) => a.nimi), ALUE);
    expect(erot).toEqual([]);
  });

  it('esimerkit ovat valideja (jokeri-kenttä ei kaada validaattoria)', () => {
    ALUE.forEach((a) => expect(V.validoiKaavio(a.spec).E, a.nimi).toEqual([]));
  });

  it('drawAlue: ei täyskentän merkintöjä, mittasuhde = metrit (±1 %), kaikki viewBoxin sisällä, pelaajat eivät mene päällekkäin', async () => {
    const tulos = await p.evaluate((alue) => alue.filter((a) => a.spec.nakyma === 'alue').map((a) => {
      const k = document.getElementById('k'); k.innerHTML = '';
      const svg = RU.drawSpec(a.spec, a.lang); k.append(svg);
      const vb = svg.viewBox.baseVal, z = a.spec.vyohyke, rect = svg.querySelector('g > rect');
      const suhde = (+rect.getAttribute('width') / +rect.getAttribute('height')) / ((z.w * 0.68) / (z.h * 1.05));
      const isot = [...svg.querySelectorAll('circle')].filter((c) => +c.getAttribute('r') > 20).length;
      const ulos = [...svg.querySelectorAll('g > *')].filter((e) => { const b = e.getBBox(); return b.x < -0.5 || b.y < -0.5 || b.x + b.width > vb.width + 0.5 || b.y + b.height > vb.height + 0.5; })
        .map((e) => e.tagName + ':' + (e.textContent || ''));
      const merkit = [...svg.querySelectorAll('g > circle')].filter((c) => +c.getAttribute('r') >= 8), paall = [];
      for (let i = 0; i < merkit.length; i++) for (let j = i + 1; j < merkit.length; j++) {
        const A = merkit[i], B = merkit[j], d = Math.hypot(A.cx.baseVal.value - B.cx.baseVal.value, A.cy.baseVal.value - B.cy.baseVal.value);
        if (d < A.r.baseVal.value + B.r.baseVal.value - 1) paall.push(d.toFixed(1));
      }
      return { nimi: a.nimi, luokka: svg.getAttribute('class'), suhde, isot, ulos, paall, merkit: merkit.length, pelaajia: a.spec.pelaajat.length,
        viivoja: svg.querySelectorAll('g > line[y1="' + rect.getAttribute('y') + '"]').length };
    }), ALUE);
    expect(tulos.length).toBe(5);
    tulos.forEach((t) => {
      expect(t.luokka, t.nimi).toBe('pitch alue');
      expect(Math.abs(t.suhde - 1), t.nimi).toBeLessThan(0.01);
      expect(t.isot, t.nimi).toBe(0);                  // ei keskiympyrää
      expect(t.ulos, t.nimi).toEqual([]);
      expect(t.paall, t.nimi).toEqual([]);
      expect(t.merkit, t.nimi).toBe(t.pelaajia);
    });
  });

  it('merkit absoluuttisen kokoisia (r 9,5) ja mitat + suunta otsikossa (fi/sv/en)', async () => {
    const r = await p.evaluate((a) => ['fi', 'sv', 'en'].map((l) => {
      const svg = RU.drawSpec(a.spec, l), teksti = [...svg.querySelectorAll('text')].map((t) => t.textContent);
      return { r: [...new Set([...svg.querySelectorAll('g > circle')].filter((c) => +c.getAttribute('r') >= 8).map((c) => c.getAttribute('r')))], otsikko: teksti.find((t) => / m · /.test(t)) };
    }), ALUE[0]);
    expect(r[0].otsikko).toBe('15 × 15 m · hyökkäyssuunta ↑');
    expect(r[1].otsikko).toBe('15 × 15 m · anfallsriktning ↑');
    expect(r[2].otsikko).toBe('15 × 15 m · attacking ↑');
    expect(r[0].r).toEqual(['9.5', '8.3']);            // pelaaja + jokerirengas
  });

  it('selite: pallollinen oma → "Hyökkäys" ensin omalla värillä; pallollinen vastustaja → oma = "Puolustus"; jokeri vain kun jokeri:true', async () => {
    const r = await p.evaluate((alue) => alue.filter((a) => a.spec.nakyma === 'alue').map((a) => {
      const svg = RU.drawSpec(a.spec, a.lang), tekstit = [...svg.querySelectorAll('g > text')];
      const i = tekstit.findIndex((t) => ['Hyökkäys', 'Puolustus', 'Anfall', 'Försvar'].includes(t.textContent));
      const pallo = tekstit[i].previousSibling;   // selitteen pallo juuri ennen tekstiä
      return { nimi: a.nimi, ensin: tekstit[i].textContent, vari: pallo.getAttribute('fill'), toinen: tekstit[i + 1].textContent,
        jokeri: tekstit.some((t) => t.textContent === 'Jokeri' || t.textContent === 'Joker'), jRengas: tekstit.filter((t) => t.textContent === 'J').length };
    }), ALUE);
    const n = (x) => r.find((t) => t.nimi.startsWith(x));
    expect(n('T20')).toMatchObject({ ensin: 'Hyökkäys', toinen: 'Puolustus', jokeri: true, jRengas: 1 });
    expect(n('T20').vari).toBe('var(--al-oma,#2BB596)');
    expect(n('T12')).toMatchObject({ ensin: 'Anfall', toinen: 'Försvar', jokeri: true, jRengas: 2 });   // sv
    expect(n('1v1')).toMatchObject({ ensin: 'Puolustus', toinen: 'Hyökkäys', jokeri: false, jRengas: 0 });
    expect(n('1v1').vari).toBe('var(--al-oma,#2BB596)');
  });

  it('selitteet listana kuvan alle (ei pelaajien päälle), max 2 riviä; tyhjä selite ei piirry', async () => {
    const r = await p.evaluate((a) => {
      const s = JSON.parse(JSON.stringify(a.spec));
      s.selitteet = [{ id: 's1', x: 50, y: 50, t: { fi: 'Pitkä selite joka jatkuu ja jatkuu monen rivin yli eikä silti mahdu kahteen riviin mitenkään' } }, { id: 's2', x: 1, y: 1, t: { fi: '  ' } }];
      const svg = RU.drawSpec(s, 'fi'), rect = svg.querySelector('g > rect');
      const ala = +rect.getAttribute('y') + +rect.getAttribute('height');
      const rivit = [...svg.querySelectorAll('g > text')].filter((t) => /^(– | {2})/.test(t.textContent));
      return { rivit: rivit.map((t) => t.textContent), alla: rivit.every((t) => +t.getAttribute('y') > ala) };
    }, ALUE[0]);
    expect(r.rivit.length).toBe(2);
    expect(r.rivit[0].startsWith('– ')).toBe(true);
    expect(r.rivit[1].endsWith('…')).toBe(true);
    expect(r.alla).toBe(true);
  });

  it('värit: --al-tokenit fallbackeilla (Masterin pankki ilman tokeneita); ei haloja eikä suuntakaaria', () => {
    const R = lue('lib/tm_kaavio_render.js'), a = R.slice(R.indexOf('function drawAlue('), R.indexOf('var TM_KAAVIO_RENDER'));
    ['var(--al-oma,#2BB596)', 'var(--al-vas,#EE7B3A)', 'var(--al-jok,#F2C14E)', 'var(--al-teksti,#111110)', 'var(--al-alue,rgba(242,239,230,.04))'].forEach((v) => expect(R).toContain(v));
    expect(a).not.toMatch(/orientArc|--halo|pitch\(g\)/);
    ['TalentMaster_Valmennusapuri.html', 'TalentMaster_Master_v16.html'].forEach((f) => {
      const h = lue(f);
      expect(h, f).toMatch(/--al-oma: #2BB596;\s+--al-vas: #EE7B3A;\s+--al-jok: #F2C14E;\s+--al-teksti: #111110;/);
      expect(h, f).toMatch(/--al-oma: #16775D;\s+--al-vas: #9E3B1E;\s+--al-jok: #9A6B00;\s+--al-teksti: #FFFFFF;/);
    });
  });
});
