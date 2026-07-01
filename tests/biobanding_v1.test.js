// Bio-banding V1 (Mirwald-pohjainen) — kehitysvaihe-kaista, kasvutahti, yli-ikäisyys −0.75 -pariteetti.
// Lähde: docs/BIOBANDING_ARKKITEHTUURI.md. EI Khamis-Rochea (V2, lykätty). CLAUDE.md §25/§28.
import { describe, it, expect } from 'vitest';
const {
  kehitysvaiheKaista, laskeKasvutahti, laskeBioIkaDokumentti, YLI_IKAISYYS_KYNNYS,
} = require('../src/lib/tm_bioika.js');

describe('kehitysvaiheKaista — phv_tila → bio-banding-kaista (±1v circa)', () => {
  it('PRE → pre', () => expect(kehitysvaiheKaista('PRE')).toBe('pre'));
  it('LAH → circa', () => expect(kehitysvaiheKaista('LAH')).toBe('circa'));
  it('PH → circa', () => expect(kehitysvaiheKaista('PH')).toBe('circa'));
  it('POST → circa', () => expect(kehitysvaiheKaista('POST')).toBe('circa'));
  it('AN → post', () => expect(kehitysvaiheKaista('AN')).toBe('post'));
  it('tuntematon → null', () => expect(kehitysvaiheKaista('XYZ')).toBe(null));
});

describe('laskeKasvutahti — cm/v + vyöhyke (rajat 3.0 ja 7.2, injury ≥7.2)', () => {
  const V = '2025-01-01';   // edellinen
  const N = '2026-01-01';   // nyt (~1 v)

  it('kohtalainen: ~5 cm/v (3.0–7.2)', () => {
    const r = laskeKasvutahti(155, N, 150, V);
    expect(r.cm_v).toBeCloseTo(5.0, 1);
    expect(r.vyohyke).toBe('kohtalainen');
  });
  it('raja 3.0 → kohtalainen (>=3.0)', () => {
    expect(laskeKasvutahti(153, N, 150, V).vyohyke).toBe('kohtalainen');
  });
  it('juuri alle 3.0 → hidas', () => {
    expect(laskeKasvutahti(152.9, N, 150, V).vyohyke).toBe('hidas');
  });
  it('raja 7.2 → nopea (loukkaantumisriskisignaali)', () => {
    const r = laskeKasvutahti(157.2, N, 150, V);
    expect(r.cm_v).toBeCloseTo(7.2, 1);
    expect(r.vyohyke).toBe('nopea');
  });
  it('juuri alle 7.2 → kohtalainen', () => {
    expect(laskeKasvutahti(157.1, N, 150, V).vyohyke).toBe('kohtalainen');
  });
  it('null kun edellistä mittausta ei ole (<2 mittausta)', () => {
    expect(laskeKasvutahti(155, N, null, null)).toBe(null);
    expect(laskeKasvutahti(155, N, undefined, undefined)).toBe(null);
  });
  it('null kun väli ≤ 0 (sama/negatiivinen pvm)', () => {
    expect(laskeKasvutahti(155, V, 150, V)).toBe(null);
    expect(laskeKasvutahti(155, V, 150, N)).toBe(null);
  });
});

// ── Yli-ikäisyys −0.75 (Palloliitto-pariteetti) — ÄLÄ RIKO ─────────────────────
// Sääntö (§25): poikkeuslupa = phv_ika >= YLI_IKAISYYS_KYNNYS[syntymäkk][P=0|T=1].
// Kanoniset esimerkit (verifioitu 2026-07-01 Palloliiton taulukkoon bittiin):
describe('Yli-ikäisyys −0.75 — 4 kanonista esimerkkiä (Palloliitto-pariteetti)', () => {
  const IDX = { P: 0, T: 1 };
  const CANON = [
    { sp: 'P', kk: 9,  phv_ika: 14.6, kynnys: 14.30,   odotus: true },   // poika syys, PHV 14.6 ≥ 14.30
    { sp: 'P', kk: 1,  phv_ika: 14.5, kynnys: 14.9667, odotus: false },  // poika tammi, 14.5 < 14.97
    { sp: 'T', kk: 4,  phv_ika: 12.2, kynnys: 12.8167, odotus: false },  // tyttö huhti, 12.2 < 12.82
    { sp: 'T', kk: 10, phv_ika: 12.5, kynnys: 12.3167, odotus: true },   // tyttö loka, 12.5 ≥ 12.32
  ];

  it('kynnysarvot täsmäävät taulukkoon (ei muutettu)', () => {
    for (const c of CANON) {
      expect(YLI_IKAISYYS_KYNNYS[c.kk][IDX[c.sp]]).toBeCloseTo(c.kynnys, 3);
    }
  });

  it('poikkeuslupa-sääntö phv_ika >= kynnys tuottaa odotetun tuloksen', () => {
    for (const c of CANON) {
      const kynnys = YLI_IKAISYYS_KYNNYS[c.kk][IDX[c.sp]];
      expect(c.phv_ika >= kynnys).toBe(c.odotus);
    }
  });

  it('laskeBioIkaDokumentti wiraa taulukon + säännön oikein (integraatio)', () => {
    // Rakennettu pelaaja: syntymäkk poimitaan syntymäpäivästä; poikkeuslupa = phv_ika >= kynnys[kk][sp].
    const dok = laskeBioIkaDokumentti({
      sukupuoli: 'P', syntymapvm: '2011-09-15', mittauspaiva: '2025-06-01',
      pituus: 170, paino: 58, istumapituus: 86,
    });
    expect(dok).not.toBe(null);
    // kynnys tulee syntymäkuukauden (9) mukaan poikataulukosta
    expect(dok.yli_ikaisyys.kynnys).toBeCloseTo(YLI_IKAISYYS_KYNNYS[9][0], 4);
    expect(dok.yli_ikaisyys.syntymakuukausi).toBe(9);
    // poikkeuslupa on täsmälleen phv_ika >= kynnys
    expect(dok.yli_ikaisyys.poikkeuslupa).toBe(dok.phv_ika >= dok.yli_ikaisyys.kynnys);
    // kehitysvaihe-kaista tuotettu dokumenttiin
    expect(['pre', 'circa', 'post']).toContain(dok.kehitysvaihe_kaista);
    // yksi mittaus → ei kasvutahtia
    expect(dok.kasvutahti_cm_v).toBe(null);
    expect(dok.kasvutahti_vyohyke).toBe(null);
  });

  it('laskeBioIkaDokumentti + edellinen mittaus → kasvutahti täyttyy', () => {
    const dok = laskeBioIkaDokumentti({
      sukupuoli: 'P', syntymapvm: '2011-09-15', mittauspaiva: '2026-06-01',
      pituus: 176, paino: 62, istumapituus: 89,
      edellinen: { pituus: 170, mittauspaiva: '2025-06-01' },   // +6 cm / ~1 v
    });
    expect(dok.kasvutahti_cm_v).toBeCloseTo(6.0, 1);
    expect(dok.kasvutahti_vyohyke).toBe('kohtalainen');
  });
});
