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
    expect(A.rajat.TKI).toEqual({ arvo: 40, lahde: 'normisto' }); expect(A.rajat.VANHA_KK).toEqual({ arvo: 15, lahde: 'normisto' }); expect(A.rajat.OTOS_PIENI.arvo).toBe(8);
    expect(A.ketju).toEqual({ arvo: { tekniikka: ['tki', 'sm'], fyysinen: ['hh'] }, lahde: 'normisto' }); expect(A.testit).toEqual({ arvo: null, lahde: 'tm' }); expect(A.seuranRajat).toEqual([]);
  });
  it('seuran raja → lahde "seura"; ei-sallittu (VANHA_KK = menetelmä) ja virheelliset arvot ohitetaan', () => {
    const A = NO.tmNormistoRatkaise({ normisto: 'eerikkila', rajat: { TKI: 35, VANHA_KK: 3, MIN_MITATTU: 'x', OTOS_PIENI: 12.5, ERO_TASOA: 99, FYS_TASO_RAJA: '2' }, testit: ['lin30m', 'cmj'], tavoitetasot: { 14: 3, '15': 9, x: 2 } });
    expect(A.rajat.TKI).toEqual({ arvo: 35, lahde: 'seura' }); expect(A.rajat.FYS_TASO_RAJA).toEqual({ arvo: 2, lahde: 'seura' });
    expect(A.rajat.VANHA_KK).toEqual({ arvo: 15, lahde: 'normisto' }); expect(A.rajat.MIN_MITATTU.lahde).toBe('normisto'); expect(A.rajat.OTOS_PIENI.arvo).toBe(8); expect(A.rajat.ERO_TASOA.arvo).toBe(2);
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

describe('laskentafunktiot saavat asetukset parametrina; ilman → oletus (nykyinen käyttäytyminen)', () => {
  const p45 = pel({ tki_viimeisin: 45, tki_pvm: PV });
  it('TKI-raja: oletus 40 → 45 ok; seuran raja 50 → kehityskohde + seuranRaja-merkintä joukkuetuloksessa', () => {
    expect(TK.tmTekniikkaMittari(p45, NYT).kehityskohde).toBe(false); expect(TK.tmTekniikkaMittari(p45, NYT, { asetukset: { rajat: { TKI: 50 } } }).kehityskohde).toBe(true);
    const pp = Array.from({ length: 6 }, () => p45); expect(TK.tmTekniikkaJoukkueLuokka(pp, NYT).seuranRaja).toBe(false); const r = TK.tmTekniikkaJoukkueLuokka(pp, NYT, { asetukset: { rajat: { TKI: 50 } } }); expect(r).toMatchObject({ luokka: 'kehityskohde', seuranRaja: true });
  });
  it('joukkuesääntö: MIN_MITATTU ja OTOS_PIENI seuran asetuksista', () => {
    expect(S.tmJoukkueSaanto({ yht: 10, mitattu: 4, kehityskohteita: 0 }).luokka).toBe('ei_luokkaa'); expect(S.tmJoukkueSaanto({ yht: 10, mitattu: 4, kehityskohteita: 0 }, { rajat: { MIN_MITATTU: 4 } }).luokka).toBe('ok');
    expect(S.tmJoukkueSaanto({ yht: 10, mitattu: 9, kehityskohteita: 0 }).otosPieni).toBe(false); expect(S.tmJoukkueSaanto({ yht: 10, mitattu: 9, kehityskohteita: 0 }, { rajat: { OTOS_PIENI: 12 } }).otosPieni).toBe(true);
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
