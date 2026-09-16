/**
 * TalentMaster™ — §7.22 · Pelaajan kehon valmius: EI RAAKA-ARVOJA LAPSELLE.
 *
 * §7.22 (CLAUDE.md §7.22 / §16): pelaajalle ei näytetä tasolukuja, normivertailua eikä
 * numeerista arviota. Ketjun raaka-arvo (1.0–3.0) oli näkyvissä ketjurivin oikeassa reunassa.
 * Nyt taso välittyy PALKIN pituudella ja heikoimman ketjun amber-korostuksella — arvo säilyy
 * datassa (ohjaa palkkia + heikoin-valintaa), vain NÄKYVÄ numero on poissa.
 *
 * REGRESSIO: VP/Master ovat HENKILÖKUNNAN työkaluja → niissä luvut säilyvät. Tämä sviitti
 * vartioi molempia suuntia: 0 lukua pelaajalla JA luvut yhä henkilökunnalla.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const PELAAJA = readFileSync(join(ROOT, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');

// rTestit = pelaajan kehon valmius -näkymä. Ankkuroitu, ei rivinumeroitu.
function rTestitLohko() {
  const rivit = PELAAJA.split('\n');
  const a = rivit.findIndex((l) => l.startsWith('function rTestit()'));
  expect(a).toBeGreaterThan(0);
  let b = -1;
  for (let i = a + 1; i < rivit.length; i++) if (rivit[i].startsWith('}')) { b = i; break; }
  expect(b).toBeGreaterThan(a);
  return rivit.slice(a, b + 1);
}
// Ketjurivi = chains.map(...)-lohko (nimi + miksi + palkki).
function ketjuLohko() {
  const rivit = rTestitLohko();
  const a = rivit.findIndex((l) => l.includes('${chains.map(c=>`'));
  const b = rivit.findIndex((l, i) => i > a && l.includes("`).join('')}"));
  expect(a).toBeGreaterThan(-1);
  expect(b).toBeGreaterThan(a);
  return rivit.slice(a, b + 1).join('\n');
}

describe('§7.22 — ketjurivillä ei näkyvää raaka-arvoa', () => {
  it('ketjulohkossa EI ole arvon renderöintiä (toFixed / c.arvo näyttökentässä)', () => {
    const lohko = ketjuLohko();
    expect(lohko).not.toContain('toFixed');
    // c.arvo saa esiintyä VAIN palkin leveydessä (width:…%), ei tekstisolmuna
    const arvoInterp = [...lohko.matchAll(/\$\{[^}]*c\.arvo[^}]*\}/g)].map((m) => m[0]);
    expect(arvoInterp.length).toBeGreaterThan(0);           // ei-vacuous: arvo ohjaa yhä palkkia
    for (const x of arvoInterp) {
      expect(x, x).toMatch(/Math\.min\(100/);               // vain palkkilaskenta
      expect(x, x).not.toMatch(/toFixed|>\s*$/);
    }
  });
  it('ketjulohkossa 0 näkyvää numeroa (tekstisolmut ja ${}-ulostulot)', () => {
    const lohko = ketjuLohko();
    // tekstisolmut >…< ilman interpolointia
    const tekstit = [...lohko.matchAll(/>([^<>${}]+)</g)].map((m) => m[1].trim()).filter(Boolean);
    expect(tekstit.filter((t) => /\d/.test(t))).toEqual([]);
    // interpoloinnit jotka päätyvät NÄYTTÖÖN (eivät style-attribuuttiin)
    const naytto = [...lohko.matchAll(/>\s*(\$\{[^}]*\})/g)].map((m) => m[1]);
    for (const x of naytto) expect(x, x).not.toMatch(/arvo|flei|toFixed|Math\./);
  });
  it('palkki ja heikoin-korostus säilyvät (taso välittyy ilman lukua)', () => {
    const lohko = ketjuLohko();
    expect(lohko).toContain('width:${c.arvo>0?Math.min(100,c.arvo/3*100):0}%');
    expect(lohko).toContain("c.koodi===heikoin.koodi?'#E8A020'");
  });
  it('heikoin ketju nimetään yhä (nimi + miksi, ei lukua)', () => {
    const lohko = rTestitLohko().join('\n');
    expect(lohko).toContain('Heikoin ketju: <strong>${heikoin.nimi}</strong>');
    expect(lohko).toContain('${heikoin.miksi}');
    expect(lohko).not.toMatch(/heikoin\.arvo\.toFixed/);
  });
});

describe('REGRESSIO — henkilökunnan työkalut säilyttävät luvut', () => {
  it('VP: kehon valmius -profiili näyttää yhä kokonaisluvun (X / 100)', () => {
    expect(VP).toContain("<span class=\"flei-kokonais\">' + fleiPct + ' / 100</span>");
  });
  it('VP: ketjupalkin prosenttilaskenta ennallaan', () => {
    expect(VP).toContain("Math.round(((k[1]-1)/2)*100)");
  });
  it('VP: pelaajakortin Kehon valmius -rivi näyttää yhä arvon', () => {
    expect(VP).toContain("p.flei_viimeisin + ' / 100'");
  });
});

describe('DATA säilyy — vain näkyvä numero poistettiin', () => {
  it('pelaaja lukee yhä raaka-arvot (p.sbl…) ja laskee heikoimman', () => {
    const lohko = rTestitLohko().join('\n');
    expect(lohko).toContain('arvo: (p && p[a]) || 0');
    expect(lohko).toContain('[...chains].sort((a,b)=>a.arvo-b.arvo)[0]');
  });
});

describe('EI-TYHJYYS — portti tunnistaa paluun lukuun', () => {
  it('jos toFixed-luku palautetaan ketjuriville, testi punertaa', () => {
    const lohko = ketjuLohko();
    const mutatoitu = lohko.replace(
      '<div style="display:flex;align-items:center;margin-bottom:4px">',
      '<div style="display:flex;align-items:center;margin-bottom:4px"><div>${c.arvo.toFixed(1)}</div>'
    );
    expect(mutatoitu).not.toBe(lohko);
    expect(mutatoitu).toContain('toFixed');   // ← juuri se mitä 1. testi kieltää
    const tekstit = [...mutatoitu.matchAll(/>\s*(\$\{[^}]*\})/g)].map((m) => m[1]);
    expect(tekstit.some((x) => /toFixed/.test(x))).toBe(true);
  });
});
