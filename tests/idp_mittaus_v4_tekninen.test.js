/**
 * TalentMaster™ — IDP R2 (pala 4): Tekninen (f2) per-dim hero/trow-reflow (peilaa f1).
 * mcard-ruudukko → tkitag (TKI-merkki) + iso Cormorant D2-taso (hero) + per-testi trow (Syöttö/Pujottelu H-H · TSI).
 * KRIITTINEN data-eheys: async TKI-sparkline-säiliö _spark_tki SÄILYY → _p1bInjektoi täyttää sen ennallaan.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

describe('f2 hero/trow-reflow — v4 rakenne (peilaa f1)', () => {
  it('D2-mcard-ruudukko poistettu (_d2Cards ei enää)', () => {
    expect(HTML).not.toContain('_d2Cards');
    expect(HTML).not.toContain("class=\"mrow d2b\"");
  });
  it('tkitag (TKI-merkki) + hero (iso Cormorant D2-taso) + tname', () => {
    expect(HTML).toContain('class="mit-tkitag"');
    expect(HTML).toContain('D2-taso · TKI + H-H-lajitekniikka');
  });
  it('per-testi trow: Syöttö/Pujottelu (H-H) + TSI, mean ⚽', () => {
    expect(HTML).toContain('Pallonhallinta ja syöttö paineessa.');
    expect(HTML).toContain('Pallon kuljetus ahtaassa');
    expect(HTML).toContain('Lähellä 0 = ei lajitekniikkavajetta.');
  });
  it('TSI-meta "automatisoitunut" vain <0.8 (§14, yhtenäinen synthin kanssa)', () => {
    expect(HTML).toContain("tsi < 0.8 ? ' · <span class=\"open\">automatisoitunut</span>' : ''");
  });
});

describe('DATA-EHEYS — _spark_tki-hydraatio säilyy (pala 4:n ydin)', () => {
  it('_spark_tki-säiliö säilytetty (mit-spark) hero-alla', () => {
    expect(HTML).toContain('<div class="mit-spark" id="_spark_tki"></div>');
  });
  it('_p1bInjektoi kohdistuu edelleen tki-sarjaan (id täsmää)', () => {
    expect(HTML).toContain("{ m: 'tki', pien: false, nuoli: false }");
    expect(HTML).toContain("getElementById('_spark_' + cfg.m)");
  });
});

describe('duplikaatit poistettu + radar revealiin', () => {
  it('duplikaatti "Lajitekniikka (H-H)" -osio poistettu f2:sta (Syöttö/Pujottelu nyt trow\'ja)', () => {
    // f2:n vanha jsv-an-otsikko "Lajitekniikka" -kooste poistettu; merkki nyt tkitagissa (ei erillisessä taulukossa)
    expect(HTML).not.toContain("f2 += '<div class=\"jsv-an-otsikko\" style=\"margin-top:10px\">Lajitekniikka");
    expect(HTML).not.toContain("(m2 ? tRiv('Merkki'");
  });
  it('per-testi-radar Syväanalyysi-revealiin (peilaa f1)', () => {
    expect(HTML).toContain('if (_tekRadar) _tekSyva = _tekRadar + _tekSyva;');
    expect(HTML).toContain('f2 = f2 + _tekReveal;');
    expect(HTML).not.toContain('f2 = _tekRadar + f2 + _tekReveal;');
  });
});
