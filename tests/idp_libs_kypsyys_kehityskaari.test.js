/**
 * TalentMaster™ — IDP-libs VAIHE 1: tm_kypsyys.js + tm_kehityskaari.js vartijat (puhtaat funktiot).
 * Kypsyys: vaihe · kasvutahti-vyöhykerajat · marker-sijainti · guard (kasvutahti/sparkline-minimit · PH-kuormarajoitin).
 * Kehityskaari: datatasot (1/2/≥3) · alustavartija (§22) · kaksi deltaa (§34: TKI-lasku ei punainen jos abs+).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const __dir = dirname(fileURLToPath(import.meta.url));
const KY = require(join(__dir, '..', 'lib', 'tm_kypsyys.js'));
const KK = require(join(__dir, '..', 'lib', 'tm_kehityskaari.js'));

describe('tm_kypsyys — vaihe + kasvutahti-vyöhyke', () => {
  it('tmKypsyysVaihe: PHV-koodit → luettava vaihe; tuntematon → null', () => {
    expect(KY.tmKypsyysVaihe('AN').nimi).toBe('Jälki-PHV');
    expect(KY.tmKypsyysVaihe('PH').vyohyke).toBe('phv');
    expect(KY.tmKypsyysVaihe('X')).toBeNull();
  });
  it('tmKasvutahtiVyohyke: hidas <3 · kohtalainen 3–7.2 · nopea ≥7.2 (rajat)', () => {
    expect(KY.tmKasvutahtiVyohyke(2)).toBe('hidas');
    expect(KY.tmKasvutahtiVyohyke(3)).toBe('kohtalainen');
    expect(KY.tmKasvutahtiVyohyke(7.1)).toBe('kohtalainen');
    expect(KY.tmKasvutahtiVyohyke(7.2)).toBe('nopea');
    expect(KY.tmKasvutahtiVyohyke(9)).toBe('nopea');
    expect(KY.tmKasvutahtiVyohyke(null)).toBeNull();
  });
  it('tmKypsyysMarkerPos: offset → % (+1.3 ≈ 76 %); null → null; clamp', () => {
    expect(Math.round(KY.tmKypsyysMarkerPos(1.3))).toBe(76);
    expect(Math.round(KY.tmKypsyysMarkerPos(0))).toBe(50);
    expect(KY.tmKypsyysMarkerPos(null)).toBeNull();
    expect(KY.tmKypsyysMarkerPos(99)).toBe(97);   // clamp ylös
  });
});

describe('tm_kypsyys — tmKypsyysGuard (vartijat)', () => {
  it('<2 kasvumittausta → ei kasvutahtia/sparklinea (ei keksittyä viivaa)', () => {
    const g = KY.tmKypsyysGuard({ phv_tila_koodi: 'AN', maturity_offset: 1.3, kasvutahti_cm_v: 4.1, kasvuhistoria: [{ pvm: '2025-04-01', pituus_cm: 160 }] });
    expect(g.onKypsyys).toBe(true);
    expect(g.naytaKasvutahti).toBe(false);   // vain 1 mittaus
    expect(g.naytaSparkline).toBe(false);
  });
  it('≥2 mittausta + kasvutahti → näytä tahti; ≥3 → sparkline', () => {
    const hist2 = [{ pvm: '2024-10', pituus_cm: 155 }, { pvm: '2025-04', pituus_cm: 160 }];
    const g2 = KY.tmKypsyysGuard({ phv_tila_koodi: 'AN', kasvutahti_cm_v: 4.1, kasvuhistoria: hist2 });
    expect(g2.naytaKasvutahti).toBe(true);
    expect(g2.naytaSparkline).toBe(false);
    const g3 = KY.tmKypsyysGuard({ phv_tila_koodi: 'AN', kasvutahti_cm_v: 4.1, kasvuhistoria: hist2.concat({ pvm: '2025-10', pituus_cm: 163 }) });
    expect(g3.naytaSparkline).toBe(true);
  });
  it('PH-tila → kuormarajoitin (§28); varhaiskypsä bio>krono', () => {
    expect(KY.tmKypsyysGuard({ phv_tila_koodi: 'PH' }).kuormarajoitin).toBe(true);
    expect(KY.tmKypsyysGuard({ phv_tila_koodi: 'AN' }).kuormarajoitin).toBe(false);
    expect(KY.tmKypsyysGuard({ phv_tila_koodi: 'AN', phv_ika: 14.7, kronologinen_ika: 13.4 }).varhaiskypsa).toBe(true);
  });
  it('ei kypsyysdataa → onKypsyys false (rehellinen tyhjä tila)', () => {
    expect(KY.tmKypsyysGuard({}).onKypsyys).toBe(false);
  });
});

describe('tm_kehityskaari — datatasot + alustavartija + kaksi deltaa', () => {
  it('tmKaariDatataso: 0→tyhja · 1→lähtöpiste · 2→suunta · ≥3→kaari', () => {
    expect(KK.tmKaariDatataso([])).toBe('tyhja');
    expect(KK.tmKaariDatataso([{ arvo: 1 }])).toBe('lahtopiste');
    expect(KK.tmKaariDatataso([{ arvo: 1 }, { arvo: 2 }])).toBe('suunta');
    expect(KK.tmKaariDatataso([{ arvo: 1 }, { arvo: 2 }, { arvo: 3 }])).toBe('kaari');
    expect(KK.tmKaariDatataso([{ arvo: 1 }, { arvo: null }])).toBe('lahtopiste');   // null-arvo ei laske
  });
  it('tmKaariAlustaSuodata (§22): vain saman alustan pisteet', () => {
    const h = [{ arvo: 4.6, alusta: 'nurmi' }, { arvo: 4.5, alusta: 'halli' }, { arvo: 4.4, alusta: 'nurmi' }];
    expect(KK.tmKaariAlustaSuodata(h, 'nurmi').map((x) => x.arvo)).toEqual([4.6, 4.4]);
    expect(KK.tmKaariAlustaSuodata(h, null).length).toBe(3);   // ei suodatinta → kaikki
  });
  it('tmKaariKaksiDeltaa (§34): abs+ → normi EI punaisena; abs− & normi− → punainen', () => {
    expect(KK.tmKaariKaksiDeltaa(8, -3)).toEqual({ absPositiivinen: true, normiPunainen: false });   // suoritus parani, TKI laski → ei punainen
    expect(KK.tmKaariKaksiDeltaa(-2, -3)).toEqual({ absPositiivinen: false, normiPunainen: true });   // aito taantuma → punainen
    expect(KK.tmKaariKaksiDeltaa(5, 2)).toEqual({ absPositiivinen: true, normiPunainen: false });
    expect(KK.tmKaariKaksiDeltaa(null, null)).toEqual({ absPositiivinen: false, normiPunainen: false });
  });
});
