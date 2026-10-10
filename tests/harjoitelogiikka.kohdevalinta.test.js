/* PR 4 (K14) — laskeTekninenKehityskohde: kohdevalinnan ketju = SAMA määritelmä kuin VP:n näkymät (lib/tm_tekniikka.js TKI → SM-tasot, lib/tm_fyysinen.js §28).
   "ENNEN"-lohko (TSI-sekuntirajat, tallennettu hh_taso) pinnattiin ennen PR 4:ää (commit "test(k14): kohdevalinnan nykytila pinnattu"); tässä on vanhan ja uuden käytöksen vertailu. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lib = require('../harjoitelogiikka_v4.js'), NORMIT = require('../lib/tm_eerikkila_normit.js').EERIKKILA_NORMIT, TK = require('../lib/tm_tekniikka.js'), FY = require('../lib/tm_fyysinen.js');
const NYT = Date.UTC(2026, 9, 10, 12), PV = '2026-09-15';
const kk = (p) => lib.laskeTekninenKehityskohde(p, NYT);
const aika = (testi, ika, sp, taso) => { const r = NORMIT[testi][sp === 'M' ? 'pojat' : 'tytot'][ika]; return { 5: r[0], 4: r[1], 3: r[2], 2: r[3], 1: Math.round((r[3] + 0.5) * 100) / 100 }[taso]; };
const sm = (pallo, juoksu, o) => Object.assign({ syntymaVuosi: 2012, sukupuoli: 'M', joukkue: 'P14 Demo', tsi_pvm: PV, sm_pallo_viimeisin: aika('sm_pallo', 14, 'M', pallo), sm_juoksu_viimeisin: aika('sm_juoksu', 14, 'M', juoksu) }, o);   // testipäivän ikä 14 (2026 − 2012)
const fy = (hh, o) => Object.assign({ syntymaVuosi: 2012, sukupuoli: 'M', joukkue: 'P14 Demo', hh_pvm: PV, hh_viimeisin: hh }, o);
const POST = { biologinenIka_viimeisin: { phv_tila_koodi: 'POST' } };

describe('ketju: P1 tki_kehityskohde → P2 SM-tasot → P3 H-H (§28) → P4 oletus', () => {
  it('P1: tki_kehityskohde voittaa kaiken (ennallaan)', () => { expect(kk(sm(1, 3, { tki_kehityskohde: 'syotto' }))).toMatchObject({ kohde: 'syotto', lahde: 'tki', varmuus: 'korkea' }); });
  it('P2: SM-pallo 1 ja SM-juoksu ≥ 2 → pallonhallinta (lähde sm); pallo ≥ 2 tasoa juoksun alla → pallonhallinta', () => {
    for (const j of [2, 3, 4, 5]) expect(kk(sm(1, j)), 'juoksu ' + j).toMatchObject({ kohde: 'pallonhallinta', lahde: 'sm', varmuus: 'kohtalainen' });
    expect(kk(sm(2, 4))).toMatchObject({ kohde: 'pallonhallinta', lahde: 'sm' }); expect(kk(sm(3, 5)).kohde).toBe('pallonhallinta');
  });
  it('P2: pallo yhden tason juoksun alla tai tasapainossa → koordinaatio; pallo juoksua edellä → nopeus', () => {
    expect(kk(sm(2, 3)).kohde).toBe('koordinaatio'); expect(kk(sm(3, 4)).kohde).toBe('koordinaatio'); expect(kk(sm(3, 3)).kohde).toBe('koordinaatio'); expect(kk(sm(5, 5)).kohde).toBe('koordinaatio'); expect(kk(sm(4, 2)).kohde).toBe('nopeus'); expect(kk(sm(3, 2)).kohde).toBe('nopeus'); expect(kk(sm(2, 1)).kohde).toBe('nopeus');
  });
  it('P2 on sama määritelmä kuin VP: kohde ≡ tm_tekniikka-luokitus (taulukko 5×5 tasoparia, molemmat sukupuolet)', () => {
    for (const sp of ['M', 'N']) for (let a = 1; a <= 5; a++) for (let b = 1; b <= 5; b++) {
      const p = sm(a, b, { sukupuoli: sp, sm_pallo_viimeisin: aika('sm_pallo', 14, sp, a), sm_juoksu_viimeisin: aika('sm_juoksu', 14, sp, b) }), m = TK.tmTekniikkaMittari(p, NYT), k = kk(p);
      if (m.tila === 'sm' && (m.syy === 'alle_ikatason' || m.syy === 'pallo_hidastaa')) expect(k.kohde, sp + a + b).toBe('pallonhallinta'); if (m.tila === 'neutraali') expect(k.lahde, 'neutraali ' + sp).not.toBe('sm');
      if (m.tila === 'sm') expect(k.lahde).toBe('sm');
    }
  });
  it('§28 / tilat: molemmat taso 1 (neutraali), vajaa mittaus, vanha (> 15 kk), päivä tuntematon, sukupuoli puuttuu → EI väitettä SM:stä (putoaa ketjussa)', () => {
    expect(kk(sm(1, 1)).lahde).toBe('ikavaihe');
    expect(kk(sm(1, 3, { sm_juoksu_viimeisin: undefined })).lahde).toBe('ikavaihe');
    expect(kk(sm(1, 3, { tsi_pvm: '2025-01-01' })).lahde).toBe('ikavaihe'); expect(kk(sm(1, 3, { tsi_pvm: undefined })).lahde).toBe('ikavaihe');
    expect(kk(sm(1, 3, { sukupuoli: undefined, joukkue: 'Demo' })).lahde).toBe('ikavaihe'); expect(kk(sm(1, 3, { sukupuoli: undefined, joukkue: 'T14 Demo' })).lahde).toBe('sm');   // P/T-tunnus joukkuenimestä
  });
  it('MUUTOS: pelkkä tsi_viimeisin (ilman SM-raakatuloksia) ei enää ohjaa kohdetta; TSI-sekuntirajoja ei ole', () => {
    expect(kk({ tsi_viimeisin: 2.0 })).toMatchObject({ kohde: 'pallonhallinta', lahde: 'ikavaihe' }); expect(kk({ tsi_viimeisin: 1.0 }).lahde).toBe('ikavaihe'); expect(kk({ tsi_viimeisin: 0.5 }).lahde).toBe('ikavaihe');
    expect(kk(sm(4, 3, { tsi_viimeisin: 2.0 }))).toMatchObject({ kohde: 'nopeus', lahde: 'sm' });   // SM-tasot ohittavat vanhan sekuntiluvun
  });
  it('P3: H-H kehityskohde → osa-alueen mukaan (ketteryys/suunnanmuutos → koordinaatio; nopeus/kiihdytys/voima/aerobinen → nopeus); tallennettu hh_taso ei vaikuta', () => {
    expect(kk(fy({ kasirata: 99 }))).toMatchObject({ kohde: 'koordinaatio', lahde: 'hh', varmuus: 'matala' });
    expect(kk(fy({ lin30m: 99 }, POST))).toMatchObject({ kohde: 'nopeus', lahde: 'hh' }); expect(kk(fy({ cmj: 1 }, POST))).toMatchObject({ lahde: 'hh' });
    expect(kk(fy({ kasirata: 99 }, { hh_taso: 4 })).kohde).toBe('koordinaatio'); expect(kk({ hh_taso: 1.0 })).toMatchObject({ lahde: 'ikavaihe' });   // vain tallennettu taso → ei väitettä
  });
  it('P3: §28 — kypsyysvahti: tason 1 maksinopeus PRE/LAH/tuntematon PHV → neutraali → ei väitettä (putoaa oletukseen); POST → kehityskohde', () => {
    const h = { lin30m: 99 }; for (const phv of ['PRE', 'LAH', null]) expect(kk(fy(h, phv ? { biologinenIka_viimeisin: { phv_tila_koodi: phv } } : {})).lahde, String(phv)).toBe('ikavaihe');
    expect(kk(fy(h, POST))).toMatchObject({ lahde: 'hh', kohde: 'nopeus' });
    const ok = fy({ kasirata: 15, cmj: 40 }, POST); if (FY.tmFyysinenPelaaja(ok, NYT).tila === 'ok') expect(kk(ok)).toMatchObject({ kohde: 'nopeus', lahde: 'hh' });
  });
  it('järjestys: SM ennen H-H; H-H ennen oletusta', () => { expect(kk(Object.assign(sm(1, 3), { hh_viimeisin: { kasirata: 99 }, hh_pvm: PV })).lahde).toBe('sm'); expect(kk(fy({ kasirata: 99 })).lahde).toBe('hh'); expect(kk({}).lahde).toBe('ikavaihe'); });
  it('ei heitä: null/undefined/rikkinäinen data; ilman TM-libejä (window ilman globaaleja) putoaa oletukseen', () => {
    for (const x of [undefined, null, {}, { sm_pallo_viimeisin: 'x' }, { hh_viimeisin: 'x' }, { hh_viimeisin: null }, sm(1, 3, { syntymaVuosi: 'x' })]) expect(() => lib.laskeTekninenKehityskohde(x, NYT)).not.toThrow();
    expect(lib.laskeTekninenKehityskohde(undefined).lahde).toBe('ikavaihe');
  });
  it('miksi-teksti: sm-lähde ei sisällä lukuja (§7.22); valitsePaivanHarjoite toimii SM-datalla', () => {
    const p = sm(1, 3), k = kk(p), m = lib.generoiMiksiteksti(p, k, lib._laskeIkavaihe(p)); expect(Object.values(m).join(' ')).not.toMatch(/\d+[.,]\d|sekunti/);
    expect(() => lib.valitsePaivanHarjoite(p, null, new Date(NYT))).not.toThrow();
  });
});
