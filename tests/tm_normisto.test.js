/* PR 3b · kolme kerrosta (docs/NORMISTO_JA_SEURAN_LINJA.md): tmNormistoRatkaise (lähde per arvo), asetukset laskentaparametrina, tuntematon normisto → "ei dataa", seuran raja näkyy. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const NO = require('../lib/tm_normisto.js'), TK = require('../lib/tm_tekniikka.js'), FY = require('../lib/tm_fyysinen.js'), S = require('../lib/tm_joukkuesaanto.js'), TT = require('../lib/tm_vp_tilanne.js'), F = require('./helpers/vp_fixture.cjs');
const NYT = Date.UTC(2026, 9, 10, 12), PV = '2026-09-15';
const pel = (o) => Object.assign({ id: 'p', syntymaVuosi: 2012, sukupuoli: 'M', joukkue: 'P14 Demo', joukkueet: ['j1'] }, o);
const docs = [{ id: 'j1', nimi: 'P14 Demo' }];

describe('tmNormistoRatkaise — lähde jokaisen arvon vieressä', () => {
  it('ilman konfiguraatiota: normisto "tm", rajat "normisto" (Suomi), ketju normistosta', () => {
    const A = NO.tmNormistoRatkaise(null);
    expect(A.normisto).toEqual({ arvo: 'eerikkila', lahde: 'tm' }); expect(A.tuntematon).toBe(false);
    expect(A.rajat.TKI).toEqual({ arvo: 40, lahde: 'normisto' }); expect(A.rajat.VANHA_KK).toEqual({ arvo: 15, lahde: 'tm' }); expect(A.rajat.OTOS_PIENI.arvo).toBe(8);
    expect(A.ketju).toEqual({ arvo: { tekniikka: ['tki', 'sm'], fyysinen: ['hh'] }, lahde: 'normisto' }); expect(A.testit).toEqual({ arvo: null, lahde: 'normisto' }); expect(A.seuranRajat).toEqual([]);
    for (const k of ['MIN_MITATTU', 'OTOS_PIENI', 'OSUUS_MITATUSTA', 'OSUUS_KAIKISTA', 'VANHA_KK', 'MUISTUTUS_KK']) expect(A.rajat[k].lahde, k).toBe('tm');   // lukitut = menetelmä
  });
  it('seuran raja → lahde "seura"; ei-sallittu (VANHA_KK = menetelmä) ja virheelliset arvot ohitetaan', () => {
    const A = NO.tmNormistoRatkaise({ normisto: 'eerikkila', rajat: { TKI: 35, VANHA_KK: 3, MIN_MITATTU: 2, OTOS_PIENI: 12, ERO_TASOA: 99, FYS_TASO_RAJA: '2' }, testit: ['lin30m', 'cmj'], tavoitetasot: { 14: 3, '15': 9, x: 2 } });
    expect(A.rajat.TKI).toEqual({ arvo: 35, lahde: 'seura' }); expect(A.rajat.FYS_TASO_RAJA).toEqual({ arvo: 2, lahde: 'seura' });
    expect(A.rajat.VANHA_KK).toEqual({ arvo: 15, lahde: 'tm' }); expect(A.rajat.MIN_MITATTU).toEqual({ arvo: 5, lahde: 'tm' }); expect(A.rajat.OTOS_PIENI).toEqual({ arvo: 8, lahde: 'tm' }); expect(A.rajat.ERO_TASOA).toEqual({ arvo: 2, lahde: 'normisto' });
    expect(A.seuranRajat.sort()).toEqual(['FYS_TASO_RAJA', 'TKI']); expect(A.normisto.lahde).toBe('seura'); expect(A.testit).toEqual({ arvo: ['lin30m', 'cmj'], lahde: 'seura' }); expect(A.tavoitetasot).toEqual({ arvo: { 14: 3 }, lahde: 'seura' });
    expect(NO.tmNormistoTavoitetaso({ tavoitetasot: { 14: 3 } }, 14)).toBe(3); expect(NO.tmNormistoTavoitetaso({ tavoitetasot: { 14: 3 } }, 13)).toBeNull(); expect(NO.tmNormistoTavoitetaso(null, 14)).toBeNull();
  });
  it('kelvottomat syötteet eivät heitä (null, merkkijono, taulukko, proto-avaimet) ja ratkaistu objekti ratkeaa itsekseen', () => {
    for (const x of [undefined, null, 'x', 5, [], { rajat: 'x' }, { rajat: { __proto__: { TKI: 1 } } }, { normisto: 'constructor' }, { tavoitetasot: null }]) expect(() => NO.tmNormistoRatkaise(x)).not.toThrow();
    const A = NO.tmNormistoRatkaise({ rajat: { TKI: 30 } }); expect(NO.tmNormistoRatkaise(A)).toBe(A);
  });
  it('tmNormistoLataa: lukija epäonnistuu / palauttaa null → oletus, ei virhettä', async () => {
    expect((await NO.tmNormistoLataa(() => Promise.reject(new Error('x')))).rajat.TKI.lahde).toBe('normisto'); expect((await NO.tmNormistoLataa(() => null)).normisto.arvo).toBe('eerikkila');
    expect((await NO.tmNormistoLataa(() => { throw new Error('y'); })).tuntematon).toBe(false); expect((await NO.tmNormistoLataa(() => Promise.resolve({ rajat: { TKI: 33 } }))).rajat.TKI.arvo).toBe(33);
  });
});

describe('sallitut rajat: raja-arvot (väli sisällä → seura, ulkopuolella → ohitetaan, lähteeksi jää "normisto")', () => {
  const r = (avain, v) => NO.tmNormistoRatkaise({ rajat: { [avain]: v } }).rajat[avain];
  const TAULU = { TKI: [25, 55, 40], FYS_TASO_RAJA: [1, 3, 1], SM_TASO_RAJA: [1, 3, 1], ERO_TASOA: [1, 3, 2] };   // [min, max, normiston oletus]
  for (const [avain, [lo, hi, oletus]] of Object.entries(TAULU)) {
    it(avain + ': ' + lo + ' ja ' + hi + ' hyväksytään; ' + (lo - 1) + ' ja ' + (hi + 1) + ' ohitetaan; epäkelvot arvot ohitetaan', () => {
      expect(r(avain, lo)).toEqual({ arvo: lo, lahde: 'seura' }); expect(r(avain, hi)).toEqual({ arvo: hi, lahde: 'seura' }); expect(r(avain, String(lo))).toEqual({ arvo: lo, lahde: 'seura' });
      for (const huono of [lo - 1, hi + 1, 0, -5, 1000, 2.5, NaN, Infinity, null, undefined, '', 'x', {}, [], true]) expect(r(avain, huono), String(huono)).toEqual({ arvo: oletus, lahde: 'normisto' });
    });
  }
  it('lukitut eivät muutu seuran asetuksella: MIN_MITATTU, OTOS_PIENI, OSUUS_*, VANHA_KK → lähde "tm"', () => {
    for (const k of ['MIN_MITATTU', 'OTOS_PIENI', 'OSUUS_MITATUSTA', 'OSUUS_KAIKISTA', 'VANHA_KK', 'MUISTUTUS_KK']) expect(r(k, 1), k).toEqual({ arvo: NO.LUKITUT[k], lahde: 'tm' });
    expect(NO.LUKITUT).toEqual({ MIN_MITATTU: 5, OTOS_PIENI: 8, OSUUS_MITATUSTA: 3, OSUUS_KAIKISTA: 2, VANHA_KK: 15, MUISTUTUS_KK: 12 }); expect(Object.keys(NO.SEURA_SALLITUT).sort()).toEqual(['ERO_TASOA', 'FYS_TASO_RAJA', 'SM_TASO_RAJA', 'TKI']);
  });
  it('tavoitetasot ikäluokittain 1–5: rajat sisällä, ulkopuoliset ja epäkelvot ohitetaan', () => {
    const t = (o) => NO.tmNormistoRatkaise({ tavoitetasot: o }).tavoitetasot;
    expect(t({ 12: 1, 13: 5 })).toEqual({ arvo: { 12: 1, 13: 5 }, lahde: 'seura' }); expect(t({ 12: 0, 13: 6, 14: 2.5, 15: 'x', abc: 3, 123: 3, '-1': 3 })).toEqual({ arvo: {}, lahde: 'tm' }); expect(t({ 12: 0, 13: 3 }).arvo).toEqual({ 13: 3 });
  });
  it('testit = normiston testien osajoukko: tuntemattomat ja kaksoiskappaleet pois; tyhjä tulos → kaikki (lähde "normisto")', () => {
    const t = (x) => NO.tmNormistoRatkaise({ testit: x }).testit;
    expect(t(['cmj', 'lin30m', 'cmj'])).toEqual({ arvo: ['cmj', 'lin30m'], lahde: 'seura' }); expect(t(['cmj', 'tuntematon_testi'])).toEqual({ arvo: ['cmj'], lahde: 'seura' });
    expect(t(['tuntematon'])).toEqual({ arvo: null, lahde: 'normisto' }); expect(t([])).toEqual({ arvo: null, lahde: 'normisto' }); expect(t('cmj')).toEqual({ arvo: null, lahde: 'normisto' }); expect(NO.tmNormistoRatkaise({ normisto: 'dfb', testit: ['cmj'] }).testit.lahde).toBe('tm');
  });
  it('laskenta: tasoraja 3 → taso ≤ 3 on kehityskohde (kehityskohde kun taso < raja + 1); raja 4 (ulkopuolella) ohitetaan', () => {
    const p = pel({ hh_viimeisin: { cmj: 28 }, hh_pvm: PV, biologinenIka_viimeisin: { phv_tila_koodi: 'POST' } }), taso = FY.tmFyysinenPelaaja(p, NYT).tasot.cmj;
    for (const raja of [1, 2, 3]) expect(FY.tmFyysinenPelaaja(p, NYT, { asetukset: { rajat: { FYS_TASO_RAJA: raja } } }).tila, 'raja ' + raja).toBe(taso <= raja ? 'kehityskohde' : 'ok');
    expect(FY.tmFyysinenPelaaja(p, NYT, { asetukset: { rajat: { FYS_TASO_RAJA: 4 } } }).tila).toBe(FY.tmFyysinenPelaaja(p, NYT).tila);
  });
});

describe('laskentafunktiot saavat asetukset parametrina; ilman → oletus (nykyinen käyttäytyminen)', () => {
  const p45 = pel({ tki_viimeisin: 45, tki_pvm: PV });
  it('TKI-raja: oletus 40 → 45 ok; seuran raja 50 → kehityskohde + seuranRaja-merkintä joukkuetuloksessa', () => {
    expect(TK.tmTekniikkaMittari(p45, NYT).kehityskohde).toBe(false); expect(TK.tmTekniikkaMittari(p45, NYT, { asetukset: { rajat: { TKI: 50 } } }).kehityskohde).toBe(true);
    const pp = Array.from({ length: 6 }, () => p45); expect(TK.tmTekniikkaJoukkueLuokka(pp, NYT).seuranRaja).toBe(false); const r = TK.tmTekniikkaJoukkueLuokka(pp, NYT, { asetukset: { rajat: { TKI: 50 } } }); expect(r).toMatchObject({ luokka: 'kehityskohde', seuranRaja: true });
  });
  it('joukkuesääntö: MIN_MITATTU, OTOS_PIENI ja kolmasosa ovat LUKITTUJA — seuran asetus ei vaikuta', () => {
    const k = { rajat: { MIN_MITATTU: 1, OTOS_PIENI: 50, OSUUS_MITATUSTA: 1 } };
    expect(S.tmJoukkueSaanto({ yht: 10, mitattu: 4, kehityskohteita: 0 }, k)).toEqual(S.tmJoukkueSaanto({ yht: 10, mitattu: 4, kehityskohteita: 0 })); expect(S.tmJoukkueSaanto({ yht: 10, mitattu: 9, kehityskohteita: 0 }, k).otosPieni).toBe(false);
    expect(S.tmJoukkueSaanto({ yht: 12, mitattu: 12, kehityskohteita: 3 }, k).luokka).toBe('ok');   // 3/12 < 1/3 vaikka seura yrittää kolmasosaa muuttaa
  });
  it('fyysinen: FYS_TASO_RAJA 2 → taso 2 on kehityskohde; testit-lista rajaa mukaan otettavat testit', () => {
    const p = pel({ hh_viimeisin: { kasirata: 99 }, hh_pvm: PV, biologinenIka_viimeisin: { phv_tila_koodi: 'POST' } });   // kasirata 99 = taso 1
    expect(FY.tmFyysinenPelaaja(p, NYT).tila).toBe('kehityskohde'); expect(FY.tmFyysinenPelaaja(p, NYT, { asetukset: { testit: ['cmj'] } }).tila).toBe('ei_dataa');
    const l2 = FY.tmFyysinenTaso('kasirata', 99, 14, 'M'); expect(l2).toBe(1);
    const tason2 = pel({ hh_viimeisin: { cmj: 28 }, hh_pvm: PV, biologinenIka_viimeisin: { phv_tila_koodi: 'POST' } }); const t0 = FY.tmFyysinenPelaaja(tason2, NYT);
    expect(FY.tmFyysinenPelaaja(tason2, NYT, { asetukset: { rajat: { FYS_TASO_RAJA: 4 } } }).tila).toBe('kehityskohde'); expect(t0.tila === 'ok' || t0.tila === 'kehityskohde').toBe(true);
  });
  it('tuntematon normisto tai ketjuton normisto → "ei dataa", ei virhettä (kaikki kolme libiä)', () => {
    const a = { asetukset: { normisto: 'dfb' } }, hv = pel({ tki_viimeisin: 20, tki_pvm: PV, hh_viimeisin: { kasirata: 99 }, hh_pvm: PV }), pp = Array.from({ length: 10 }, () => hv);
    expect(TK.tmTekniikkaMittari(hv, NYT, a)).toMatchObject({ tila: 'ei_dataa', eiDataaSyy: 'normisto_tuntematon' }); expect(FY.tmFyysinenPelaaja(hv, NYT, a)).toMatchObject({ tila: 'ei_dataa', eiDataaSyy: 'normisto_tuntematon' });
    expect(TK.tmTekniikkaYhteenveto(pp, docs, NYT, a)).toMatchObject({ kehityskohde: 0, eiTekniikkadataa: 1 }); expect(FY.tmFyysinenYhteenveto(pp, docs, NYT, a)).toMatchObject({ kehityskohde: 0, eiFyysistaDataa: 1 });
    expect(S.tmJoukkueSaanto({ yht: 10, mitattu: 10, kehityskohteita: 9 }, { normisto: 'dfb' }).luokka).toBe('ei_luokkaa'); expect(TK.tmSmTaso(8, 'sm_pallo', 14, 'M', { normisto: 'dfb' })).toBe(0); expect(FY.tmFyysinenTaso('kasirata', 99, 14, 'M', { normisto: 'dfb' })).toBe(0);
    for (const huono of [null, '', 'constructor', '__proto__', 'toString']) expect(() => TK.tmTekniikkaMittari(hv, NYT, { asetukset: { normisto: huono } })).not.toThrow();
    NO.NORMISTOT.testi = { nimi: 't', rekisteri: 'eerikkila', rajat: NO.TM_OLETUS.rajat, ketju: { tekniikka: [], fyysinen: [] } };   // ketjuton normisto
    try { expect(TK.tmTekniikkaMittari(hv, NYT, { asetukset: { normisto: 'testi' } })).toMatchObject({ tila: 'ei_dataa', eiDataaSyy: 'ei_ketjua' }); expect(FY.tmFyysinenPelaaja(hv, NYT, { asetukset: { normisto: 'testi' } }).tila).toBe('ei_dataa');
      NO.NORMISTOT.testi.ketju = { tekniikka: ['sm'], fyysinen: ['hh'] }; expect(TK.tmTekniikkaMittari(hv, NYT, { asetukset: { normisto: 'testi' } }).mittari).not.toBe('TKI'); } finally { delete NO.NORMISTOT.testi; }
  });
  it('lähdekoodissa ei normitauluviittauksia eikä omia RAJAT-vakioita (tekniikka, fyysinen, joukkuesääntö)', () => {
    const fs = require('fs'); for (const f of ['lib/tm_tekniikka.js', 'lib/tm_fyysinen.js', 'lib/tm_joukkuesaanto.js']) { const s = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); expect(s, f).not.toMatch(/EERIKKILA_NORMIT|eerikkilaTaso|HH_TESTI_MAP|\bRAJAT\b|<\s*40\b|MIN_MITATTU\s*[:=]\s*\d|OTOS_PIENI\s*[:=]\s*\d|ERO_TASOA\s*[:=]\s*\d/); }
  });
});

describe('VP näkee "seuran raja" rivillä (vain kun raja tulee seuralta)', () => {
  const teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const malli = (asetukset) => { const d = F.lataa('kypsa', NYT), pel = d.pelaajat, J = d.joukkueDocs, nimi = {}; J.forEach((j) => { nimi[j.id] = j.nimi; });
    const tek = J.map((jd) => Object.assign({ nimi: jd.nimi }, TK.tmJoukkueTekniikka(pel, J, jd.id, NYT, { asetukset }))).filter((r) => r.yht > 0), fy = J.map((jd) => Object.assign({ nimi: jd.nimi }, FY.tmJoukkueFyysinen(pel, J, jd.id, NYT, { asetukset }))).filter((r) => r.yht > 0);
    return TT.tmTilanneHTML(TT.tmTilanneMalli(Object.assign({}, d.syote, { nytMs: NYT, tekniikka: tek, fyysinen: fy })), { t: (x) => x, fn: { testijakso: 'te', joukkue: 'jk', auki: 'au' } }); };
  it('oletus: ei merkintää; seuran TKI-raja → "seuran raja" tekniikkariveillä', () => {
    expect(teksti(malli(undefined))).not.toContain('seuran raja'); expect(teksti(malli({ rajat: { TKI: 60, FYS_TASO_RAJA: 2 } }))).toContain('seuran raja');
  });
});
