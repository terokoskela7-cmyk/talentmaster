/**
 * Design V2 · T1 — tekstin kontrasti ≥ 4,5:1 (WCAG AA) kaikissa viidessä sovelluksessa.
 * Lukee :root- ja :root[data-theme=…]-lohkot (EI .tm-kaavio-skoopattuja eikä @media print -lohkoa),
 * laskee teksti-tokenien kontrastin teeman taustoja vasten (rgba sekoitetaan taustaan, WCAG 2.x).
 *
 * Teksti-tokenit: --ink (tai --text), --ink2, --ink3, --teal, --amber.
 * Pelaaja_v7 + Vanhempi_v2: --teal (#1A7A5E) on TÄYTTÖ, ei tekstiväri → tekstinä mitataan --teal-d,
 * ja staattinen tarkistus vaatii ettei color: var(--teal) esiinny.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(ROOT, f), 'utf8');
const AA = 4.5;

// Tokenit annetulle teemalle: ensin pelkkä :root, sitten :root[data-theme="<teema>"] (suurempi spesifisyys voittaa).
function tokenit(html, teema) {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const perus = {}, teemaan = {};
  for (const m of css.matchAll(/(^|[}\n])\s*(:root(?:\[data-theme="(dark|light)"\])?)\s*\{([^{}]*)\}/g)) {
    const kohde = m[3] ? (m[3] === teema ? teemaan : null) : perus;
    if (!kohde) continue;
    for (const d of m[4].matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) kohde[d[1]] = d[2].trim();
  }
  const t = Object.assign({}, perus, teemaan);
  const res = (v, syv = 0) => {
    const r = /^var\((--[\w-]+)(?:,\s*([^)]+))?\)$/.exec(v || '');
    if (!r || syv > 5) return v;
    return res(t[r[1]] != null ? t[r[1]] : r[2], syv + 1);
  };
  return (nimi) => res(t[nimi]);
}

function rgba(v) {
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (m) {
    const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(v);
  if (m) return [+m[1], +m[2], +m[3], m[4] != null ? +m[4] : 1];
  throw new Error('väriä ei tunnistettu: ' + v);
}
const sekoita = (fg, bg) => fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));
const lum = (c) => {
  const [r, g, b] = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
function kontrasti(fgV, bgV) {
  const bg = rgba(bgV).slice(0, 3);
  const fg = sekoita(rgba(fgV), bg);
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

const APPIT = [
  { f: 'TalentMaster_VP_v25.html',      teemat: ['dark', 'light'], teal: '--teal' },
  { f: 'TalentMaster_Master_v16.html',  teemat: ['dark', 'light'], teal: '--teal' },
  { f: 'TalentMaster_Seura.html',       teemat: ['dark'],          teal: '--teal' },
  { f: 'TalentMaster_Pelaaja_v7.html',  teemat: ['dark'],          teal: '--teal-d' },
  { f: 'TalentMaster_Vanhempi_v2.html', teemat: ['dark'],          teal: '--teal-d' },
];

describe('Design V2 T1 — kontrastilaskin', () => {
  it('tunnetut arvot (briefin mittaukset)', () => {
    expect(kontrasti('rgba(28,28,26,.55)', '#F2EFE6')).toBeCloseTo(3.69, 1);
    expect(kontrasti('#28B090', '#FFFFFF')).toBeCloseTo(2.73, 1);
    expect(kontrasti('#7A5A10', '#FFFFFF')).toBeCloseTo(6.37, 1);
  });
});

describe('Design V2 T1 — teksti-tokenit ≥ 4,5:1 teeman taustoilla', () => {
  for (const app of APPIT) {
    const html = lue(app.f);
    for (const teema of app.teemat) {
      it(`${app.f} · ${teema}`, () => {
        const tok = tokenit(html, teema);
        const taustat = ['--bg', '--bg3', '--card', '--surface'].filter((n) => tok(n) && /^(#|rgb)/.test(tok(n)));
        expect(taustat, 'taustatokenit').toContain('--bg');
        const tekstit = [tok('--ink') ? '--ink' : '--text', '--ink2', '--ink3', app.teal, '--amber'].filter((n) => tok(n));
        expect(tekstit.length, 'teksti-tokeneita löytyi').toBeGreaterThanOrEqual(4);
        const alle = [];
        for (const t of tekstit) for (const b of taustat) {
          const k = kontrasti(tok(t), tok(b));
          if (k < AA) alle.push(`${t} ${tok(t)} / ${b} ${tok(b)} = ${k.toFixed(2)}`);
        }
        expect(alle).toEqual([]);
      });
    }
  }
});

describe('Design V2 T1 — teksti täytön päällä (VP vaalea)', () => {
  it('--on-accent teal/amber-täytöllä ≥ 4,5 ja käytössä tummien kovakoodattujen sijaan', () => {
    const html = lue('TalentMaster_VP_v25.html');
    const tok = tokenit(html, 'light');
    for (const t of ['--teal', '--amber']) expect(kontrasti(tok('--on-accent'), tok(t)), t).toBeGreaterThanOrEqual(AA);
    expect(tokenit(html, 'dark')('--on-accent'), 'tumma: fallback pitää alkuperäisen').toBeUndefined();
    expect(html).not.toMatch(/background: ?var\(--(teal|amber)\);[^"}]{0,80}color: ?(#0c1a15|#211705|#08110E|#000|#111)\b/);
  });
});

describe('Design V2 T1 — Pelaaja/Vanhempi: teal tekstinä vain --teal-d', () => {
  for (const f of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html']) {
    it(f, () => {
      const html = lue(f);
      expect(html).not.toMatch(/(?<![-\w])color: ?var\(--teal\)(?![-\w])/);
      expect(tokenit(html, 'dark')('--teal'), '--teal-tokenin arvo ennallaan').toBe('#1A7A5E');
    });
  }
});

describe('Design V2 T1 — tekstin paino (300 → 400: kaikki < 18 px, Cormorant < 24 px; päätös 4.10.2026)', () => {
  for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Seura.html', 'TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html']) {
    it(`${f}: CSS-säännöissä ei font-weight:300 (< 18 px, serif < 24 px)`, () => {
      const css = [...lue(f).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
      const ohuet = [];
      for (const m of css.matchAll(/([^{}]+)\{([^{}]*font-weight: ?300[^{}]*)\}/g)) {
        const fs = /font-size: ?([\d.]+)px/.exec(m[2]);
        const serif = /Cormorant|font-serif|font-d\b|font-display/.test(m[2]);
        if (fs && (+fs[1] < 18 || (serif && +fs[1] < 24))) ohuet.push(m[1].trim() + ' ' + fs[1] + 'px');
      }
      expect(ohuet).toEqual([]);
    });
  }
});

describe('Design V2 T1 — VP kirjautumisen Google-nappi', () => {
  it('teksti var(--ink) (ei kovakoodattua #E8EEF8, joka on vaalealla 1,1:1)', () => {
    const html = lue('TalentMaster_VP_v25.html');
    const i = html.indexOf('data-i18n="Kirjaudu Google-tilillä"');
    const nappi = html.slice(html.lastIndexOf('<button', i), i);
    expect(nappi).toContain('color:var(--ink)');
    expect(nappi).not.toContain('#E8EEF8');
    expect(kontrasti(tokenit(html, 'light')('--ink'), '#FAF9F4')).toBeGreaterThanOrEqual(AA);
  });
});
