/**
 * TalentMaster™ — IDP R2 (pala 3): Fyysinen (f1) per-dim hero/trow-reflow.
 * mcard-ruudukko → iso Cormorant D1-taso (hero) + per-testi trow (track/tick/mean ⚽ + meta).
 * KRIITTINEN data-eheys: async trend/spark-hydraation säiliö-id:t (_trend_30m/_spark_30m jne.) SÄILYVÄT
 * trow'ssa → _p1bInjektoi(_p1bSarjat(docs)) täyttää ne ennallaan. Rakenteellinen vartija (f1 on syvästi inline).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

describe('f1 hero/trow-reflow — v4 rakenne', () => {
  it('mcard-ruudukko poistettu f1:stä (_mcardFys/_fysCards ei enää)', () => {
    expect(HTML).not.toContain('_mcardFys');
    expect(HTML).not.toContain('_fysCards');
  });
  it('hero (iso Cormorant D1-taso) + tname', () => {
    expect(HTML).toContain('class="mit-hero"');
    expect(HTML).toContain('Eerikkilä-taso · ka(30m · CMJ · MAS)');
  });
  it('per-testi trow: track + tick (taso-3 @60%) + mean ⚽ + meta', () => {
    expect(HTML).toContain('class="mit-trow"');
    expect(HTML).toContain('class="mit-tick" style="left:60%"');
    expect(HTML).toContain('<span class="ball">⚽</span>');
    // per-testi game-meaning (⚽ pelissä) — kartan tekstit
    expect(HTML).toContain('puhdas huippunopeus');
    expect(HTML).toContain('Räjähtävät irtiotot');
    expect(HTML).toContain('koko ottelun');
  });
});

describe('DATA-EHEYS — async hydraation säiliö-id:t säilyvät (pala 3:n ydin)', () => {
  it('trow tuottaa _trend_<k> + _spark_<k> -säiliöt (30m/cmj/mas c.k:sta)', () => {
    expect(HTML).toContain('id="_trend_\' + c.k + \'"');
    expect(HTML).toContain('id="_spark_\' + c.k + \'"');
  });
  it('_p1bInjektoi kohdistuu EDELLEEN _spark_/_trend_ + cfg.m (ei muutettu → id:t täsmäävät)', () => {
    expect(HTML).toContain("getElementById('_spark_' + cfg.m)");
    expect(HTML).toContain("getElementById('_trend_' + cfg.m)");
    // hydraatio kattaa 30m/cmj/mas/tki
    expect(HTML).toMatch(/\{ m: '30m'.*\{ m: 'cmj'.*\{ m: 'mas'.*\{ m: 'tki'/s);
  });
  it('f2:n TKI-sparkline-säiliö _spark_tki ennallaan', () => {
    expect(HTML).toContain('id="_spark_tki"');
  });
});

describe('§28 + brändi säilyy', () => {
  it('gated (kasvu/epävarma) → 🌱 kypsyys huomioitu, ei väärää arviota; low → amber', () => {
    expect(HTML).toContain('🌱 taso ');
    expect(HTML).toContain('kypsyys huomioitu (§28)');
    // hero gated → ink3 (ei väri-arvio)
    expect(HTML).toContain("(_kd === 'kasvu' || _kd === 'epavarma') ? 'var(--ink3)' : hhTasoVari(d1)");
  });
  it('per-testi-radar siirretty Syväanalyysi-revealiin (ei hero:n edelle)', () => {
    expect(HTML).toContain('if (_fysRadar) _fysSyva = _fysRadar + _fysSyva;');
    expect(HTML).toContain('f1 = f1 + _fysReveal;');
    expect(HTML).not.toContain('f1 = _fysRadar + f1 + _fysReveal;');
  });
});
