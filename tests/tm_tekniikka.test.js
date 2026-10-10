/* lib/tm_tekniikka.js — "Tekniikka kehityskohteena" (docs/TEKNIIKKA_MAARITELMA.md §2, §6; PR 1).
 * Kattaa: molemmat sukupuolet · tason 1 sääntö (juoksu ≥ 2 / molemmat 1) · kahden tason ero · iät 9/10/19/20 · vanhuus 15 kk ·
 * päivä tuntematon · sukupuoli puuttuu + P/T-vara · mittaus vajaa · otos pieni · rajatapaus 5/15 · jäsenyys · vartijat.
 * Testidata on koneellista: SM-ajat johdetaan normirekisteristä (EERIKKILA_NORMIT), ei kirjoiteta uudelleen. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = require('../lib/tm_tekniikka.js');
const E = require('../lib/tm_eerikkila_normit.js');
const J = require('../lib/tm_joukkue.js');

const NYT = Date.UTC(2026, 9, 10, 12);          // 10.10.2026 klo 12 UTC
const TUORE = '2026-04-01';
const N = E.EERIKKILA_NORMIT;

/* aika (s), jolla testin taso on L annetulle iälle ja sukupuolelle (rajat: [t5, t4, t3, t2]; pienempi parempi, ≤-vertailu) */
function aika(testi, ika, sp, L) {
  const r = N[testi][sp === 'M' ? 'pojat' : 'tytot'][ika >= 20 ? sp : ika];
  return { 5: r[0], 4: r[1], 3: r[2], 2: r[3], 1: Math.round((r[3] + 0.5) * 100) / 100 }[L];
}
/* pelaaja, jolla on SM-raakatulokset tasoille (pallo, juoksu); testipäivä 'pvm', ikä = nyt-vuosi − syntymävuosi (testivuosi 2026) */
function smPelaaja(ika, sp, pallo, juoksu, o) {
  const p = Object.assign({ id: 'p' + Math.random(), syntymaVuosi: 2026 - ika, sukupuoli: sp, joukkue: (sp === 'M' ? 'P' : 'T') + ika, tsi_pvm: TUORE }, o || {});
  if (pallo != null) p.sm_pallo_viimeisin = aika('sm_pallo', ika, sp, pallo);
  if (juoksu != null) p.sm_juoksu_viimeisin = aika('sm_juoksu', ika, sp, juoksu);
  return p;
}
const tkiPelaaja = (tki, o) => Object.assign({ id: 'k' + Math.random(), syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'P13', tki_viimeisin: tki, tki_pvm: '2026-05-01' }, o || {});
const M = (p, o) => T.tmTekniikkaMittari(p, NYT, o);

describe('tmSmTaso — rekisteri, ikärajat 9 / 10 / 19 / 20', () => {
  it('apuri antaa halutun tason molemmille sukupuolille (koko rekisteri 10–19)', () => {
    for (const sp of ['M', 'N']) for (let ika = 10; ika <= 19; ika++) for (const testi of ['sm_pallo', 'sm_juoksu']) for (const L of [1, 2, 3, 4, 5]) {
      expect(T.tmSmTaso(aika(testi, ika, sp, L), testi, ika, sp), `${testi} ${sp}${ika} L${L}`).toBe(L);
    }
  });
  it('ikä 9 → ei tasoa (eerikkilaTaso leikkaisi hiljaa ikään 10)', () => {
    const v = aika('sm_pallo', 10, 'M', 3);
    expect(E.eerikkilaTaso(v, 'sm_pallo', 9, 'M')).toBe(3);        // todiste ansasta: rekisteri antaisi tason
    expect(T.tmSmTaso(v, 'sm_pallo', 9, 'M')).toBe(0);
    expect(T.tmSmTaso(v, 'sm_pallo', 10, 'M')).toBe(3);
  });
  it('ikä 19 käyttää ikää 19, ikä 20 ja 21 aikuisten avainta M/N', () => {
    const v = 8.40;   // pojat: ikä 19 → taso 3 (≤ 8,44), aikuiset M → taso 2 (> 8,34)
    expect(T.tmSmTaso(v, 'sm_pallo', 19, 'M')).toBe(E.eerikkilaTaso(v, 'sm_pallo', 19, 'M'));
    expect(T.tmSmTaso(v, 'sm_pallo', 19, 'M')).toBe(3);
    expect(T.tmSmTaso(v, 'sm_pallo', 20, 'M')).toBe(E.eerikkilaTaso(v, 'sm_pallo', 'M', 'M'));
    expect(T.tmSmTaso(v, 'sm_pallo', 20, 'M')).toBe(2);
    expect(T.tmSmTaso(v, 'sm_pallo', 21, 'M')).toBe(2);
    const w = 9.30;   // tytöt: avain N
    expect(T.tmSmTaso(w, 'sm_pallo', 20, 'N')).toBe(E.eerikkilaTaso(w, 'sm_pallo', 'N', 'N'));
  });
  it('nolla ei ole taso 1: puuttuva / ei-numero / tuntematon sukupuoli → 0', () => {
    expect(E.eerikkilaTaso(null, 'sm_pallo', 14, 'M')).toBe(0);
    for (const v of [null, undefined, '', 'abc', NaN, 0, -1]) expect(T.tmSmTaso(v, 'sm_pallo', 14, 'M')).toBe(0);
    expect(T.tmSmTaso(9.5, 'sm_pallo', 14, null)).toBe(0);
    expect(T.tmSmTaso(9.5, 'sm_pallo', 14, 'P')).toBe(0);          // vain 'M'/'N' (normalisoi ensin)
    expect(T.tmSmTaso('9,5', 'sm_pallo', 14, 'M')).toBe(T.tmSmTaso(9.5, 'sm_pallo', 14, 'M'));   // desimaalipilkku
  });
  it('sukupuoli ratkaisee normin: sama aika on tytöille eri taso kuin pojille', () => {
    const v = aika('sm_pallo', 14, 'N', 3);
    expect(T.tmSmTaso(v, 'sm_pallo', 14, 'N')).toBe(3);
    expect(T.tmSmTaso(v, 'sm_pallo', 14, 'M')).toBeLessThan(3);
  });
});

describe('tmTekniikkaMittari — TKI', () => {
  it('TKI < 40 → kehityskohde, syy alle_ikatason; 39,9 / 40 / 40,1', () => {
    expect(M(tkiPelaaja(39.9))).toMatchObject({ tila: 'tki', mittari: 'TKI', mitattu: true, kehityskohde: true, syy: 'alle_ikatason' });
    expect(M(tkiPelaaja(40))).toMatchObject({ mitattu: true, kehityskohde: false, syy: null });
    expect(M(tkiPelaaja(40.1)).kehityskohde).toBe(false);
    expect(M(tkiPelaaja('35')).kehityskohde).toBe(true);           // merkkijono
  });
  it('TKI voittaa SM-tasot (ketju: ensimmäinen käytettävissä oleva)', () => {
    const p = Object.assign(smPelaaja(13, 'M', 1, 4), { tki_viimeisin: 55, tki_pvm: '2026-05-01' });
    expect(M(p)).toMatchObject({ mittari: 'TKI', kehityskohde: false });
    const q = Object.assign(smPelaaja(13, 'M', 3, 3), { tki_viimeisin: 20, tki_pvm: '2026-05-01' });
    expect(M(q)).toMatchObject({ mittari: 'TKI', kehityskohde: true, syy: 'alle_ikatason' });
  });
  it('vanha TKI ei luokita, vaan ketju jatkuu SM-tasoihin', () => {
    const p = Object.assign(smPelaaja(14, 'M', 1, 3), { tki_viimeisin: 20, tki_pvm: '2024-01-01' });
    const m = M(p);
    expect(m).toMatchObject({ mittari: 'SM', kehityskohde: true, syy: 'alle_ikatason' });
    expect(m.vanhat).toEqual(['TKI']);
  });
});

describe('tmTekniikkaMittari — SM-tasot: tason 1 sääntö ja kahden tason ero', () => {
  for (const sp of ['M', 'N']) {
    describe('sukupuoli ' + sp, () => {
      const ika = 14;
      it('pallo 1 ja juoksu ≥ 2 → alle_ikatason (juoksu 2, 3, 4, 5)', () => {
        for (const j of [2, 3, 4, 5]) expect(M(smPelaaja(ika, sp, 1, j)), 'juoksu ' + j).toMatchObject({ tila: 'sm', mitattu: true, kehityskohde: true, syy: 'alle_ikatason', tasot: { pallo: 1, juoksu: j, sukupuoli: sp } });
      });
      it('pallo 1 ja juoksu 1 → neutraali: ei kehityskohde, ei mitattu, huomautus', () => {
        expect(M(smPelaaja(ika, sp, 1, 1))).toMatchObject({ tila: 'neutraali', mitattu: false, kehityskohde: false, syy: null, huom: 'nopeus_ja_tekniikka_samalla_tasolla' });
      });
      it('pallo vähintään 2 tasoa juoksun alla → pallo_hidastaa; 1 tason ero ei riitä', () => {
        expect(M(smPelaaja(ika, sp, 2, 4))).toMatchObject({ mitattu: true, kehityskohde: true, syy: 'pallo_hidastaa' });
        expect(M(smPelaaja(ika, sp, 3, 5))).toMatchObject({ kehityskohde: true, syy: 'pallo_hidastaa' });
        expect(M(smPelaaja(ika, sp, 2, 5))).toMatchObject({ kehityskohde: true, syy: 'pallo_hidastaa' });    // 3 tason ero
        expect(M(smPelaaja(ika, sp, 2, 3))).toMatchObject({ mitattu: true, kehityskohde: false });          // 1 tason ero
        expect(M(smPelaaja(ika, sp, 3, 4)).kehityskohde).toBe(false);
        expect(M(smPelaaja(ika, sp, 3, 3)).kehityskohde).toBe(false);
        expect(M(smPelaaja(ika, sp, 4, 2)).kehityskohde).toBe(false);                                      // pallo juoksua parempi
      });
      it('pallo 1 ja juoksu 3: tason 1 sääntö voittaa (syy alle_ikatason, ei pallo_hidastaa)', () => {
        expect(M(smPelaaja(ika, sp, 1, 3)).syy).toBe('alle_ikatason');
      });
    });
  }
  it('tasot lasketaan testihetken iällä: sama raakatulos eri testivuonna → eri taso', () => {
    const v = aika('sm_pallo', 15, 'M', 3);
    const a = { syntymaVuosi: 2011, sukupuoli: 'M', sm_pallo_viimeisin: v, sm_juoksu_viimeisin: aika('sm_juoksu', 15, 'M', 3), joukkue: 'P15' };
    expect(M(Object.assign({ tsi_pvm: '2026-04-01' }, a)).tasot).toMatchObject({ ika: 15, pallo: 3 });
    const vanhempi = M(Object.assign({ tsi_pvm: '2025-09-01' }, a));        // testihetkellä 14 v → eri ikä (ja alle 15 kk vanha)
    expect(vanhempi.tasot.ika).toBe(14);
  });
  it('ikä 9 ei SM-tasoa → ei_dataa (ika_alle_10); 10-vuotias luokitellaan', () => {
    const yhdeksan = { syntymaVuosi: 2017, sukupuoli: 'M', joukkue: 'P9', tsi_pvm: TUORE, sm_pallo_viimeisin: 11, sm_juoksu_viimeisin: 9 };
    expect(M(yhdeksan)).toMatchObject({ tila: 'ei_dataa', mitattu: false, eiDataaSyy: 'ika_alle_10' });
    expect(M(smPelaaja(10, 'M', 1, 3))).toMatchObject({ tila: 'sm', kehityskohde: true });
  });
  it('ikä 19 ja 20: 20-vuotiaan taso tulee aikuisten normista', () => {
    expect(M(smPelaaja(19, 'M', 2, 3)).tasot.ika).toBe(19);
    const aikuinen = { syntymaVuosi: 2006, sukupuoli: 'M', joukkue: 'Miehet', tsi_pvm: TUORE, sm_pallo_viimeisin: 8.40, sm_juoksu_viimeisin: 7.30 };
    const t = M(aikuinen).tasot;
    expect(t.ika).toBe(20);
    expect(t.pallo).toBe(E.eerikkilaTaso(8.40, 'sm_pallo', 'M', 'M'));
    expect(t.juoksu).toBe(E.eerikkilaTaso(7.30, 'sm_juoksu', 'M', 'M'));
  });
});

describe('tmTekniikkaMittari — mittaus vajaa', () => {
  it('pelkkä SM-pallo ilman SM-juoksua → vajaa, ei mitattu, tason 1 sääntöä ei sovelleta', () => {
    expect(M(smPelaaja(14, 'M', 1, null))).toMatchObject({ tila: 'vajaa', mitattu: false, kehityskohde: false, huom: 'mittaus_vajaa' });
    expect(M(smPelaaja(14, 'N', 3, null))).toMatchObject({ tila: 'vajaa', mitattu: false, huom: 'mittaus_vajaa' });
  });
  it('pelkkä SM-juoksu → vajaa; kelvoton arvo toisessa → vajaa', () => {
    expect(M(smPelaaja(14, 'M', null, 1))).toMatchObject({ tila: 'vajaa', mitattu: false });
    const p = smPelaaja(14, 'M', 1, 3); p.sm_juoksu_viimeisin = 'abc';
    expect(M(p)).toMatchObject({ tila: 'vajaa', mitattu: false, kehityskohde: false });
  });
});

describe('tmTekniikkaMittari — vanhuusraja 15 kk ja "päivä tuntematon"', () => {
  const tki = (pvm) => tkiPelaaja(30, { tki_pvm: pvm });
  it('15 kalenterikuukautta: 14,9 kk tuore, 15,0 kk vanha (testipäivä 10.7.2025 ↔ nyt 10.10.2026)', () => {
    expect(M(tki('2025-07-11'))).toMatchObject({ tila: 'tki', mitattu: true });                        // raja 11.10.2026 > nyt
    const v = M(tki('2025-07-10'));                                                                      // raja 10.10.2026 00:00 ≤ nyt
    expect(v).toMatchObject({ tila: 'ei_dataa', mitattu: false, eiDataaSyy: 'vanha' });
    expect(v.vanhat).toEqual(['TKI']);
  });
  it('kuukauden loppu: 30.6.2025 + 15 kk = 30.9.2026 → vanha; 31.12.2024 → vanha', () => {
    expect(M(tki('2025-06-30')).vanhat).toEqual(['TKI']);
    expect(M(tki('2024-12-31')).vanhat).toEqual(['TKI']);
    expect(M(tki('2025-07-31')).mitattu).toBe(true);        // + 15 kk = 31.10.2026 > nyt
  });
  it('pvmTila: kk-ikä ja tilat; ISO-aikaleima, Date, Firestore-tyyppinen olio', () => {
    expect(T.tmTekniikkaPvmTila('2026-10-10T08:00:00Z', NYT).tila).toBe('tuore');
    expect(T.tmTekniikkaPvmTila(new Date(Date.UTC(2024, 0, 1)), NYT).tila).toBe('vanha');
    expect(T.tmTekniikkaPvmTila({ toDate: () => new Date(Date.UTC(2026, 5, 1)) }, NYT).tila).toBe('tuore');
    expect(T.tmTekniikkaPvmTila('2025-10-10', NYT).kk).toBeGreaterThan(11.9);
  });
  it('SM-testin vanhuus mitataan tsi_pvm:stä; vanha SM ei luokita (vanhat = ["SM"])', () => {
    const m = M(smPelaaja(14, 'M', 1, 3, { tsi_pvm: '2025-01-15' }));
    expect(m).toMatchObject({ tila: 'ei_dataa', mitattu: false, kehityskohde: false });
    expect(m.vanhat).toEqual(['SM']);
  });
  it('tuore FLEI / H-H / muu mittaus ei peitä vanhaa tekniikkatulosta', () => {
    const p = tkiPelaaja(20, { tki_pvm: '2024-03-01', flei_pvm: '2026-10-05', hh_pvm: '2026-10-09', tsi_pvm: null });
    const m = M(p);
    expect(m.mitattu).toBe(false);
    expect(m.vanhat).toEqual(['TKI']);
  });
  it('päivä tuntematon (puuttuu / tyhjä / null / virheellinen / tulevaisuudessa) ei ole tuore: TKI', () => {
    for (const pvm of [undefined, null, '', '   ', 'ei pvm', '2026-02-31', '2026-13-01', '31.12.2025', 12345678901234567890, {}, '2027-03-01']) {
      const m = M(tkiPelaaja(20, { tki_pvm: pvm }));
      expect(m.mitattu, String(pvm)).toBe(false);
      expect(m.kehityskohde, String(pvm)).toBe(false);
      expect(m.tuntematonPvm, String(pvm)).toEqual(['TKI']);
      expect(m.eiDataaSyy, String(pvm)).toBe('paiva_tuntematon');
    }
  });
  it('päivä tuntematon: SM — ei luokita, ketju ei koskaan oleta "tänään"', () => {
    for (const pvm of [undefined, null, '', 'huomenna']) {
      const m = M(smPelaaja(14, 'M', 1, 3, { tsi_pvm: pvm }));
      expect(m, String(pvm)).toMatchObject({ mitattu: false, kehityskohde: false });
      expect(m.tuntematonPvm).toEqual(['SM']);
    }
  });
  it('tuntematon TKI-päivä + tuore SM → SM ratkaisee', () => {
    const p = Object.assign(smPelaaja(14, 'M', 1, 3), { tki_viimeisin: 10, tki_pvm: '' });
    expect(M(p)).toMatchObject({ mittari: 'SM', kehityskohde: true });
    expect(M(p).tuntematonPvm).toEqual(['TKI']);
  });
});

describe('sukupuoli: kenttä, P/T-vara, "sukupuoli puuttuu"', () => {
  it('kentän arvot M / P / N / T', () => {
    expect(T.tmTekniikkaSukupuoli({ sukupuoli: 'M' })).toBe('M');
    expect(T.tmTekniikkaSukupuoli({ sukupuoli: 'P' })).toBe('M');
    expect(T.tmTekniikkaSukupuoli({ sukupuoli: 'N' })).toBe('N');
    expect(T.tmTekniikkaSukupuoli({ sukupuoli: 'T' })).toBe('N');
  });
  it('vara: joukkuenimen P/T-tunnus kun kenttä puuttuu / on tyhjä', () => {
    expect(T.tmTekniikkaSukupuoli({ joukkue: 'SJK P14' })).toBe('M');
    expect(T.tmTekniikkaSukupuoli({ sukupuoli: '', joukkue: 'KPV T12' })).toBe('N');
    expect(T.tmTekniikkaSukupuoli({ joukkue: 'Sibbo-Vargarna P10' })).toBe('M');
    expect(T.tmTekniikkaSukupuoli({ joukkue: '2014 Blå' })).toBe(null);
    expect(T.tmTekniikkaSukupuoli({ joukkue: 'Tytöt' })).toBe(null);
    expect(T.tmTekniikkaSukupuoli({ joukkueetNimet: ['Ryhmä', 'T13'] })).toBe('N');
    expect(T.tmTekniikkaSukupuoli({ joukkue: '2014 Blå' }, 'Blå T11')).toBe('N');   // joukkueen oma nimi viimeisenä varana
  });
  it('kenttä voittaa joukkuenimen', () => { expect(T.tmTekniikkaSukupuoli({ sukupuoli: 'N', joukkue: 'P14' })).toBe('N'); });
  it('vara toimii luokituksessa: tytön SM-tasot tyttöjen normilla ilman sukupuoli-kenttää', () => {
    const p = smPelaaja(14, 'N', 1, 3); delete p.sukupuoli;
    expect(M(p)).toMatchObject({ tila: 'sm', kehityskohde: true, tasot: { sukupuoli: 'N', pallo: 1, juoksu: 3 } });
  });
  it('ilman sukupuolta ja ilman P/T-tunnusta: ei SM-tasoa, "ei tekniikkadataa", syy sukupuoli_puuttuu — EI arvausta', () => {
    const p = smPelaaja(14, 'N', 1, 3, { joukkue: '2014 Blå' }); delete p.sukupuoli;
    expect(M(p)).toMatchObject({ tila: 'ei_dataa', mitattu: false, kehityskohde: false, eiDataaSyy: 'sukupuoli_puuttuu' });
    const q = smPelaaja(14, 'N', 1, 3, { joukkue: '2014 Blå', sukupuoli: '' });
    expect(M(q).eiDataaSyy).toBe('sukupuoli_puuttuu');
  });
  it('sukupuoli puuttuu: TKI toimii silti (sukupuolesta riippumaton)', () => {
    const p = tkiPelaaja(20); delete p.sukupuoli; p.joukkue = '2014 Blå';
    expect(M(p)).toMatchObject({ mittari: 'TKI', kehityskohde: true });
  });
});

/* ── joukkueluokka ── */
const DOCS = [{ id: 'j1', nimi: 'SJK P14' }, { id: 'j2', nimi: 'SJK T14' }];
const jasen = (p, id) => Object.assign(p, { joukkueet: [id] });
/* n pelaajaa joukkueeseen: k kehityskohdetta (TKI 20), m−k ok (TKI 70), muut ilman dataa */
function tkiJoukkue(id, k, ok, eiDataa, neutraali) {
  const P = [];
  for (let i = 0; i < k; i++) P.push(jasen(tkiPelaaja(20), id));
  for (let i = 0; i < ok; i++) P.push(jasen(tkiPelaaja(70), id));
  for (let i = 0; i < (eiDataa || 0); i++) P.push(jasen({ id: 'e' + i, syntymaVuosi: 2012, sukupuoli: 'M', joukkue: 'P14' }, id));
  for (let i = 0; i < (neutraali || 0); i++) P.push(jasen(smPelaaja(14, 'M', 1, 1), id));
  return P;
}
const JT = (P, id) => T.tmJoukkueTekniikka(P, DOCS, id || 'j1', NYT);

describe('tmJoukkueTekniikka — kolmasosa, puolet, minimi, otos pieni', () => {
  it('rajatapaus 5/15: tasan kolmasosa riittää (kokonaisluvuilla); 4/15 ja 5/16 eivät', () => {
    expect(JT(tkiJoukkue('j1', 5, 10))).toMatchObject({ mitattu: 15, kehityskohteita: 5, luokka: 'kehityskohde', otosPieni: false });
    expect(JT(tkiJoukkue('j1', 4, 11)).luokka).toBe('ok');
    expect(JT(tkiJoukkue('j1', 5, 11)).luokka).toBe('ok');          // 15 < 16
    expect(JT(tkiJoukkue('j1', 6, 12))).toMatchObject({ luokka: 'kehityskohde', mitattu: 18 });   // 6/18 = 1/3
  });
  it('kolmasosa vaatii vähintään 5 mitattua; 5 mitattua ja 2 kehityskohdetta riittää', () => {
    expect(JT(tkiJoukkue('j1', 2, 3))).toMatchObject({ mitattu: 5, luokka: 'kehityskohde', otosPieni: true });
    expect(JT(tkiJoukkue('j1', 1, 4)).luokka).toBe('ok');          // 1/5 < 1/3
    expect(JT(tkiJoukkue('j1', 1, 3))).toMatchObject({ mitattu: 4, luokka: 'ei_luokkaa', eiMitattua: false });   // 1/4 yli kolmasosa mutta mitattuja 4
  });
  it('puolen ehto: vähintään puolet KAIKISTA joukkueen pelaajista, vaikka mitattuja < 5', () => {
    expect(JT(tkiJoukkue('j1', 2, 0, 2))).toMatchObject({ yht: 4, mitattu: 2, luokka: 'kehityskohde', otosPieni: true });   // 2/4
    expect(JT(tkiJoukkue('j1', 2, 0, 3)).luokka).toBe('ei_luokkaa');                                                       // 2/5 < 1/2
    expect(JT(tkiJoukkue('j1', 4, 0, 4))).toMatchObject({ yht: 8, mitattu: 4, luokka: 'kehityskohde' });                   // 4/8, rajatapaus
    expect(JT(tkiJoukkue('j1', 4, 0, 5)).luokka).toBe('ei_luokkaa');                                                       // 4/9
  });
  it('neutraalit kuuluvat kokonaismäärään mutta eivät mitattuihin', () => {
    const r = JT(tkiJoukkue('j1', 3, 0, 0, 3));                       // 3 kehityskohdetta + 3 neutraalia: yht 6
    expect(r).toMatchObject({ yht: 6, mitattu: 3, kehityskohteita: 3, neutraaleja: 3, luokka: 'kehityskohde' });          // 3/6 = puolet
    const s = JT(tkiJoukkue('j1', 2, 0, 0, 4));                       // 2 / 6: ei puolta, mitattuja 2
    expect(s).toMatchObject({ yht: 6, mitattu: 2, neutraaleja: 4, luokka: 'ei_luokkaa' });
    const t = JT(tkiJoukkue('j1', 0, 6, 0, 6));                       // vain neutraalit eivät nosta osuutta
    expect(t).toMatchObject({ mitattu: 6, kehityskohteita: 0, luokka: 'ok' });
  });
  it('mittaus vajaa: kuuluu kokonaismäärään, ei mitattuihin', () => {
    const P = tkiJoukkue('j1', 0, 5).concat([jasen(smPelaaja(14, 'M', 1, null), 'j1'), jasen(smPelaaja(14, 'M', 3, null), 'j1')]);
    expect(JT(P)).toMatchObject({ yht: 7, mitattu: 5, vajaita: 2, luokka: 'ok' });
  });
  it('otos pieni: mitattuja 7 → kyllä, 8 → ei (sekä kehityskohde että ok)', () => {
    expect(JT(tkiJoukkue('j1', 3, 4))).toMatchObject({ mitattu: 7, otosPieni: true, luokka: 'kehityskohde' });
    expect(JT(tkiJoukkue('j1', 3, 5))).toMatchObject({ mitattu: 8, otosPieni: false, luokka: 'kehityskohde' });
    expect(JT(tkiJoukkue('j1', 0, 7))).toMatchObject({ otosPieni: true, luokka: 'ok' });
    expect(JT(tkiJoukkue('j1', 0, 8)).otosPieni).toBe(false);
    expect(JT(tkiJoukkue('j1', 0, 3)).otosPieni).toBe(false);       // ilman luokkaa ei otos pieni -merkintää
  });
  it('ei tekniikkadataa: 0 mitattua → eiMitattua; 1–4 mitattua → ilman luokkaa mutta ei "ei mitattua"', () => {
    expect(JT(tkiJoukkue('j1', 0, 0, 6))).toMatchObject({ yht: 6, mitattu: 0, luokka: 'ei_luokkaa', eiMitattua: true, eiDataa: 6 });
    expect(JT(tkiJoukkue('j1', 0, 3, 3))).toMatchObject({ mitattu: 3, luokka: 'ei_luokkaa', eiMitattua: false });
    expect(JT([])).toMatchObject({ yht: 0, luokka: 'ei_luokkaa', eiMitattua: true });
  });
  it('syy: useampaa koskeva; tasatilanne alle_ikatason', () => {
    const alle = (id, n) => Array.from({ length: n }, () => jasen(tkiPelaaja(10), id));
    const pallo = (id, n) => Array.from({ length: n }, () => jasen(smPelaaja(14, 'M', 2, 4), id));
    const ok = (id, n) => Array.from({ length: n }, () => jasen(tkiPelaaja(80), id));
    expect(JT(alle('j1', 3).concat(pallo('j1', 2), ok('j1', 5)))).toMatchObject({ luokka: 'kehityskohde', syy: 'alle_ikatason', syyJako: { alle_ikatason: 3, pallo_hidastaa: 2 } });
    expect(JT(alle('j1', 1).concat(pallo('j1', 3), ok('j1', 5)))).toMatchObject({ luokka: 'kehityskohde', syy: 'pallo_hidastaa' });
    expect(JT(alle('j1', 2).concat(pallo('j1', 2), ok('j1', 4)))).toMatchObject({ luokka: 'kehityskohde', syy: 'alle_ikatason' });   // tasan
    expect(JT(ok('j1', 6)).syy).toBe(null);
  });
  it('vanhat ja tuntemattoman päivän pelaajat eivät ole mitattuja; laskurit', () => {
    const P = tkiJoukkue('j1', 0, 5).concat([
      jasen(tkiPelaaja(10, { tki_pvm: '2024-01-01' }), 'j1'),
      jasen(tkiPelaaja(10, { tki_pvm: '' }), 'j1'),
      jasen(smPelaaja(14, 'M', 1, 3, { tsi_pvm: '2025-01-01' }), 'j1')]);
    expect(JT(P)).toMatchObject({ yht: 8, mitattu: 5, kehityskohteita: 0, vanhoja: 2, paivaTuntematon: 1, eiDataa: 3, luokka: 'ok' });
  });
  it('sukupuoli puuttuu -laskuri diagnostiikkaan (joukkueen nimessä ei P/T-tunnusta)', () => {
    const docs = [{ id: 'jb', nimi: '2014 Blå' }];
    const p = smPelaaja(14, 'M', 1, 3, { joukkue: '2014 Blå' }); delete p.sukupuoli;
    const ok = Array.from({ length: 5 }, () => jasen(tkiPelaaja(70), 'jb'));
    expect(T.tmJoukkueTekniikka(ok.concat([jasen(p, 'jb')]), docs, 'jb', NYT)).toMatchObject({ yht: 6, mitattu: 5, sukupuoliPuuttuu: 1, eiDataa: 1, luokka: 'ok' });
  });
  it('päivä- ja lähdetiedot: uusinPvm, mediaaniKk, lähteet', () => {
    const P = [jasen(tkiPelaaja(70, { tki_pvm: '2026-09-10' }), 'j1'), jasen(tkiPelaaja(70, { tki_pvm: '2026-07-10' }), 'j1'), jasen(smPelaaja(14, 'M', 3, 3, { tsi_pvm: '2026-04-10' }), 'j1')];
    const r = JT(P);
    expect(r.uusinPvm).toBe('2026-09-10');
    expect(r.lahteet).toEqual({ TKI: 2, SM: 1 });
    expect(r.mediaaniKk).toBeGreaterThan(2.5); expect(r.mediaaniKk).toBeLessThan(3.5);
  });
});

describe('jäsenyys — tmPelaajanJoukkueet, ryhmät eivät ole joukkueita', () => {
  it('joukkueet[] ratkaisee, ei p.joukkue-nimi; monijoukkueinen pelaaja kumpaankin', () => {
    const a = tkiPelaaja(10, { joukkue: 'SJK T14', joukkueet: ['j1'] });                         // nimi sanoo T14, jäsenyys j1
    const b = tkiPelaaja(10, { joukkue: 'SJK P14', joukkueet: ['j1', 'j2'] });
    const c = tkiPelaaja(10, { joukkue: 'SJK P14', joukkueet: ['ryhma_x'] });                      // ryhmä: ei kumpaankaan
    expect(T.tmJoukkueTekniikka([a, b, c], DOCS, 'j1', NYT).yht).toBe(2);
    expect(T.tmJoukkueTekniikka([a, b, c], DOCS, 'j2', NYT).yht).toBe(1);
    expect(J.tmPelaajanJoukkueet(b, DOCS)).toEqual(['j1', 'j2']);
  });
  it('joukkueen nimi toimii sukupuolen varana (SM-pelaaja ilman kenttää ja omaa tunnusta)', () => {
    const p = smPelaaja(14, 'N', 1, 3, { joukkue: undefined, joukkueet: ['j2'] }); delete p.sukupuoli;
    const r = T.tmJoukkueTekniikka([p], DOCS, 'j2', NYT);                                           // j2 = "SJK T14"
    expect(r).toMatchObject({ yht: 1, mitattu: 1, kehityskohteita: 1, sukupuoliPuuttuu: 0 });
  });
  it('yhteenveto: laskurit ja vain joukkueet joilla on pelaajia', () => {
    const docs = DOCS.concat([{ id: 'j3', nimi: 'tyhjä' }]);
    const P = tkiJoukkue('j1', 5, 10).concat(tkiJoukkue('j2', 0, 0, 3));
    const y = T.tmTekniikkaYhteenveto(P, docs, NYT);
    expect(y).toMatchObject({ joukkueita: 2, kehityskohde: 1, ok: 0, eiLuokkaa: 1, eiMitattua: 1, eiTekniikkadataa: 1, otosPieni: 0, syy: { alle_ikatason: 1, pallo_hidastaa: 0 } });
    expect(Object.keys(y.joukkueet)).toEqual(['j1', 'j2']);
  });
});

describe('fixturet — realistiset TKI- ja SM-raakatulokset (ei d2_taso = 2)', () => {
  const F = require('./helpers/vp_fixture.cjs');
  const nyt = Date.UTC(2026, 9, 10, 12);
  const lataa = (n) => F.lataa(n, nyt);
  it('ei vakio-d2_taso:ta; TKI vain 8–13-vuotiailla; SM-raakatulokset vain 10+; TKI vaihtelee pelaajittain', () => {
    for (const n of ['pilotti', 'kypsa', 'kuormitus']) {
      const d = lataa(n);
      expect(d.pelaajat.filter((p) => p.d2_taso != null), n).toEqual([]);
      for (const p of d.pelaajat) {
        const ika = nyt && new Date(nyt).getUTCFullYear() - p.syntymaVuosi;
        if (p.tki_viimeisin != null) { expect(ika, n).toBeGreaterThanOrEqual(8); expect(ika, n).toBeLessThanOrEqual(13); expect(p.tki_viimeisin).toBeGreaterThanOrEqual(0); expect(p.tki_viimeisin).toBeLessThanOrEqual(99); }
        if (p.sm_pallo_viimeisin != null) { expect(ika, n).toBeGreaterThanOrEqual(10); expect(p.sm_juoksu_viimeisin).toBeGreaterThan(0); expect(p.tsi_viimeisin).toBeCloseTo(p.sm_pallo_viimeisin - p.sm_juoksu_viimeisin, 2); expect(p.tsi_pvm).toBeTruthy(); }
      }
      const tki = d.pelaajat.filter((p) => p.tki_viimeisin != null).map((p) => p.tki_viimeisin);
      expect(new Set(tki).size, n).toBeGreaterThan(5);
    }
  });
  it('SM-raakatulokset vastaavat tasoparia rekisteristä (pallo, juoksu ∈ 1–5)', () => {
    const d = lataa('kypsa');
    const sm = d.pelaajat.filter((p) => p.sm_pallo_viimeisin != null);
    expect(sm.length).toBeGreaterThan(20);
    const tasot = sm.map((p) => M(p).tasot);
    for (const t of tasot) { expect(t.pallo).toBeGreaterThanOrEqual(1); expect(t.pallo).toBeLessThanOrEqual(5); expect(t.juoksu).toBeGreaterThanOrEqual(1); }
    const tilat = new Set(sm.map((p) => M(p).tila));
    expect([...tilat].sort()).toEqual(['neutraali', 'sm']);          // molemmat tilat esiintyvät
  });
  it('joukkueluokat fixtureilla (deterministinen nyt = 10.10.2026)', () => {
    const odotus = { pilotti: { joukkueita: 15, kehityskohde: 4, ok: 1, eiTekniikkadataa: 10, eiMitattua: 10, otosPieni: 1 },
                     kypsa: { joukkueita: 9, kehityskohde: 5, ok: 4, eiTekniikkadataa: 0, eiMitattua: 0, otosPieni: 1 },
                     kuormitus: { joukkueita: 40, kehityskohde: 11, ok: 2, eiTekniikkadataa: 27, eiMitattua: 27, otosPieni: 6 } };
    for (const n of Object.keys(odotus)) { const d = lataa(n), y = T.tmTekniikkaYhteenveto(d.pelaajat, d.joukkueDocs, nyt); expect(y, n).toMatchObject(odotus[n]); }
    const t = lataa('tyhja'); expect(T.tmTekniikkaYhteenveto(t.pelaajat, t.joukkueDocs, nyt).joukkueita).toBe(0);
  });
});

describe('vartijat', () => {
  const src = readFileSync(join(juuri, 'lib/tm_tekniikka.js'), 'utf8');
  const koodi = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  it('luokitus ei lue d2_taso-, tallennettuja sm_*_taso- eikä Eerikkilän tekniikkakenttiä eikä muunna TKI:tä tasoksi', () => {
    for (const kielletty of ['d2_taso', 'sm_pallo_taso', 'sm_juoksu_taso', 'laskeD2', 'tmJoukkueD2', 'hh_viimeisin', 'pujottelu', 'syotto', 'flei']) expect(koodi, kielletty).not.toContain(kielletty);
    expect(koodi).not.toMatch(/tki[\w.]*\s*\)?\s*\/\s*20/i);
    expect(koodi).not.toMatch(/\/\s*20\b/);
  });
  it('ei "tänään" -varapäivää: ei new Date() ilman argumenttia / Date.now() pvm-tilassa', () => {
    const pvmOsa = koodi.slice(koodi.indexOf('function _isoPaiva'), koodi.indexOf('function tmTekniikkaSukupuoli'));
    expect(pvmOsa).not.toMatch(/new Date\(\)|Date\.now\(\)/);
  });
  it('tki/20-ratsu: TKI→taso-muunnoksia ei lisätä uusiin paikkoihin (nykyiset tiedostot sallittu kunnes PR 3 poistaa)', () => {
    const SALLITTU = {   // tiedosto → enimmäismäärä; PR 3 pienentää nollaan (§1.2)
      'lib/tm_eerikkila_normit.js': 3, 'TalentMaster_VP_v25.html': 5, 'TalentMaster_Pelaaja_v7.html': 1,
    };
    const re = /tki[\w.]*\)?\s*\/\s*20\b/g;
    const tiedostot = require('child_process').execSync('git ls-files "*.js" "*.html" ":!:tests" ":!:node_modules" ":!:archive" ":!:docs" ":!:functions"', { cwd: juuri }).toString().split('\n').filter(Boolean);
    const ylitykset = [];
    for (const f of tiedostot) {
      const n = (readFileSync(join(juuri, f), 'utf8').match(re) || []).length;
      if (n > (SALLITTU[f] || 0)) ylitykset.push(f + ': ' + n + ' > ' + (SALLITTU[f] || 0));
    }
    expect(ylitykset).toEqual([]);
  });
  it('selainpolku: lib toimii window-globaaleilla (ei require)', () => {
    const ikkuna = { console, Date, Math, JSON };
    ikkuna.window = ikkuna;
    vm.createContext(ikkuna);
    for (const f of ['lib/tm_eerikkila_normit.js', 'lib/tm_joukkue.js', 'lib/tm_joukkuesaanto.js']) {
      const s = readFileSync(join(juuri, f), 'utf8');
      vm.runInContext(s + '\n;' + (f.includes('eerikkila') ? 'this.eerikkilaTaso=eerikkilaTaso;this.normiIka=normiIka;this.normSukupuoliMN=normSukupuoliMN;' : f.includes('joukkuesaanto') ? '' : 'this.tmPelaajanJoukkueet=tmPelaajanJoukkueet;'), ikkuna);
    }
    vm.runInContext(src, ikkuna);
    expect(typeof ikkuna.TM_TEKNIIKKA).toBe('object');
    const p = smPelaaja(14, 'M', 1, 3);
    expect(ikkuna.tmTekniikkaMittari(p, NYT)).toMatchObject({ tila: 'sm', kehityskohde: true, syy: 'alle_ikatason' });
    expect(ikkuna.TM_TEKNIIKKA.tmTekniikkaJoukkueLuokka([p], NYT)).toMatchObject({ luokka: 'kehityskohde' });   // joukkuesääntö window-globaalin kautta
  });
});
