/**
 * TalentMaster™ — Valmentajan IDP Briiffi 2: Oura-kehityskortti (_cmKehityskorttiHTML, VP_v25).
 * Yksi tila-rengas (EI numeroa/arvosanaa) → kontribuuttorit (tila+suunta+sparkline) → yksi jaksofokus.
 * Synteesi reuse: laskeValmentajaHarjoitusKooste · harjoitusKalibraatioHistoria · tmValmennusKaari (valmKaari) · tmKaariSiru.
 * Aikuisen ammatillista dataa: kehittävä, EI rankaiseva — ei sijoitusta/arvosanaa/punaista; poikkeama = keskustelunavaus.
 * Teal ainoa aksentti, 0 pinkkiä/amber.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const E = require('../lib/tm_eerikkila_normit.js');
const KK = require('../lib/tm_kehityskaari.js');
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');
const KRIT = { b1: 'Organisointi', b2: 'Tavoitteen selkeys', b3: 'Palaute (määrä)', b4: 'Palaute (laatu)', b5: 'Pedagogiikka', b6: 'Eriyttäminen', b7: 'Vuorovaikutus' };

let F;
beforeAll(() => {
  const lines = VP.split('\n');
  const s = lines.findIndex((l) => l.includes('function _cmKehityskorttiHTML(arvioinnit, valmKaari, uid) {'));
  if (s < 0) throw new Error('_cmKehityskorttiHTML ei löytynyt');
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) { if (lines[i] === '}') { e = i; break; } }
  F = new Function('_jsvEsc', 'window', 'laskeValmentajaHarjoitusKooste', 'harjoitusKalibraatioHistoria', 'laskeHarjoituslaatuPalloliitto', '_HL_KRIT_B',
    lines.slice(s, e + 1).join('\n') + '\nreturn _cmKehityskorttiHTML;'
  )((x) => String(x == null ? '' : x), { TM_KEHITYSKAARI: KK }, E.laskeValmentajaHarjoitusKooste, E.harjoitusKalibraatioHistoria, E.laskeHarjoituslaatuPalloliitto, KRIT);
});

const ARV = () => [
  { malli: 'palloliitto', pvm: '2026-01-01', vastaukset: { a1: 6, a2: 6, a3: 6, a4: 6, a5: 6, a6: 6, a7: 6 } },
  { malli: 'palloliitto', pvm: '2026-06-01', vastaukset: { a1: 8, a2: 8, a3: 8, a4: 8, a5: 8, a6: 8, a7: 8 } },
  { malli: 'valmennustaidot', pvm: '2026-01-01', arviointitapa: 'itsearvio', valmentajaUid: 'j', valmentaja: 'Joakim', pari_id: 'P1', pari_vahvistettu: true, vastaukset: { b1: 4, b2: 4, b3: 2, b4: 3, b5: 4, b6: 3, b7: 4 } },
  { malli: 'valmennustaidot', pvm: '2026-01-01', arviointitapa: 'havainnointi', valmentajaUid: 'j', valmentaja: 'Joakim', pari_id: 'P1', pari_vahvistettu: true, vastaukset: { b1: 3, b2: 4, b3: 3, b4: 4, b5: 4, b6: 3, b7: 4 } }
];

describe('_cmKehityskorttiHTML — tila-rengas (KISS + Oura, EI numeroa/arvosanaa)', () => {
  it('rengas = SVG + sanallinen tila (Linjassa/Kehittyy), EI numeroa/arvosanaa (/10 · /5)', () => {
    const h = F(ARV(), null, 'j');
    expect(h).toContain('<svg');
    expect(/Linjassa|Kehittyy/.test(h)).toBe(true);
    expect(h).not.toContain('/10');
    expect(h).not.toContain('/5');
  });
  it('tyhjä data → "Kerää dataa" + kaikki kontribuuttorit honest-empty', () => {
    const h = F([], null, 'j');
    expect(h).toContain('Kerää dataa');
    expect(h).toContain('kertyy kun arvioit harjoituksia');
    expect(h).toContain('kertyy vahvistetuista');
    expect(h).toContain('kertyy pelihavainnoista');
  });
});

describe('_cmKehityskorttiHTML — kontribuuttorit (tila + suunta + sparkline, reuse)', () => {
  it('Harjoituslaatu: n arviota + suunta (nousee) + sparkline (tmKaariSiru)', () => {
    const h = F(ARV(), null, 'j');
    expect(h).toContain('Harjoituslaatu');
    expect(h).toContain('2 harjoitusarviota');
    expect(h).toContain('nousee ↑');
    expect((h.match(/<svg/g) || []).length).toBeGreaterThanOrEqual(2);   // rengas + harjoituslaatu-sparkline
  });
  it('Kalibraatio: n_paria + suunta (linjassa) reuse harjoitusKalibraatioHistoria', () => {
    const h = F(ARV(), null, 'j');
    expect(h).toContain('1 paria');
    expect(h).toContain('linjassa havainnoijan kanssa');
  });
  it('Peliäly (valmKaari): kaventuu ↓ + sparkline kun dataa; honest-empty kun null', () => {
    expect(F(ARV(), null, 'j')).toContain('kertyy pelihavainnoista');
    const vk = { datataso: 'suunta', kalibraatio: [{ ikkuna: '2026-H1', arvo: 0.8 }, { ikkuna: '2026-H2', arvo: 0.4 }], havainnointi: [], reflektio: [], kalibraatioAnkkuri: 'vp' };
    const h2 = F(ARV(), vk, 'j');
    expect(h2).toContain('kalibraatio kaventuu ↓');
    expect((h2.match(/<svg/g) || []).length).toBeGreaterThanOrEqual(3);   // rengas + 2 sparklinea
  });
  it('yliarvio/aliarvio kehystetään keskustelunavauksena (ei rankaisu)', () => {
    const arv = [
      { malli: 'valmennustaidot', pvm: '2026-01-01', arviointitapa: 'itsearvio', valmentajaUid: 'j', pari_id: 'P1', pari_vahvistettu: true, vastaukset: { b1: 5, b2: 5, b3: 5, b4: 5, b5: 5, b6: 5, b7: 5 } },
      { malli: 'valmennustaidot', pvm: '2026-01-01', arviointitapa: 'havainnointi', valmentajaUid: 'j', pari_id: 'P1', pari_vahvistettu: true, vastaukset: { b1: 2, b2: 2, b3: 2, b4: 2, b5: 2, b6: 2, b7: 2 } }
    ];
    expect(F(arv, null, 'j')).toContain('keskustelunavaus');
  });
});

describe('_cmKehityskorttiHTML — jaksofokus + kehittävä-ei-rankaiseva', () => {
  it('jaksofokus = suurin kalibraatioero-kriteeri (_HL_KRIT_B), kehystettynä keskustelunavaukseksi', () => {
    const h = F(ARV(), null, 'j');
    expect(h).toContain('Jaksofokus:');
    expect(h).toContain('Organisointi');   // b1 = suurin kuilu
    expect(h).toContain('keskustelunavaus');
  });
  it('teal ainoa aksentti — EI amber/punaista/pinkkiä (§5, aikuisdata mutta kehittävä)', () => {
    const h = F(ARV(), { datataso: 'suunta', kalibraatio: [{ arvo: 0.8 }, { arvo: 0.4 }], havainnointi: [], reflektio: [], kalibraatioAnkkuri: 'vp' }, 'j');
    expect(h).toContain('var(--teal');
    expect(/E0A040|C94040|c060a8|3EC9A7|4A7ED9|amber/i.test(h)).toBe(false);
    expect(h).toContain('Ei sijoitusta eikä arvosanaa');   // kortti kehystää itse: kehittävä, ei rankaiseva
  });
});

describe('Briiffi 2 — wiring (mount + progressiivinen render, reuse ei tuplakyselyä)', () => {
  it('coachModal mounttaa #cmKehityskortti (header ↔ tabs)', () => {
    expect(VP).toContain("'<div id=\"cmKehityskortti\"");
  });
  it('_cmLataaArvioinnit renderöi kortin heti + päivittää peliälyn _lataaKalibHavainnot:lla (K5b-cache)', () => {
    expect(VP).toContain('kortEl.innerHTML = _cmKehityskorttiHTML(arvioinnit, null, uid);');
    expect(VP).toContain('_lataaKalibHavainnot().then(function (hav) {');
    expect(VP).toContain('_cmKehityskorttiHTML(arvioinnit, vk, uid)');
  });
  it('EI koske _cmLataaAdarCpd:hen / tmValmennusKaari-logiikkaan (reuse, ei muokkaus)', () => {
    expect(VP).toContain('function _cmLataaAdarCpd(uid)');
    expect(VP).toContain('function _cmAdarCpdHTML(k)');
  });
});
