/* lib/tm_fyysinen.js — "Fyysiset testit kehityskohteena" (docs/KARKI_JA_YKSILOLLINEN_KARTOITUS.md §0, §3, §6; PR 3).
 * Kattaa: taso raakatuloksesta (molemmat sukupuolet, iät 9/10/19/20, MAS km/h) · kehityskohde = ≥ 1 testi tasolla 1 · §28 (PRE/LAH/tuntematon neutraloi gated-testit; PH/POST/AN eivät;
 * F2: myös 5 m ja 10 m; F4: ketteryys ja SM-juoksu eivät ole gated) · tallennettuja d1_taso/hh_taso-kenttiä ei lueta · testipäivän ikä · vanhuus 15 kk (F3: koko patteristo) ·
 * päivä tuntematon · sukupuoli puuttuu + P/T-vara · ei fyysistä dataa · otos pieni · 5/15 · Kypsyys mittaamatta -laskuri · jäsenyys. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const F = require('../lib/tm_fyysinen.js'), E = require('../lib/tm_eerikkila_normit.js'), TK = require('../lib/tm_tekniikka.js');
const NYT = Date.UTC(2026, 9, 10, 12);

/* raaka-arvo, jolla testin taso on L (iälle/sukupuolelle): haetaan rekisteristä eerikkilaTaso:lla (ei kopioitu normeja). MAS km/h. */
function arvo(testi, ika, sp, L) {
  const m = E.HH_TESTI_MAP[testi], norm = E.EERIKKILA_NORMIT[m.eerikkila], r = norm[sp === 'M' ? 'pojat' : 'tytot'][ika >= 20 ? sp : ika], kmh = m.kmh ? 3.6 : 1;
  const kandidaatit = [r[0], r[1], r[2], r[3]].concat(norm.pienempi_parempi ? [r[3] + 0.4, r[0] - 0.3] : [r[3] - 0.4, r[0] + 0.3]);
  for (const k of kandidaatit) for (const d of [0, 0.001, -0.001, 0.003, -0.003]) { const v = Math.round((k + d) * kmh * 1000) / 1000; if (F.tmFyysinenTaso(testi, v, ika, sp) === L) return v; }   // km/h-muodossa (MAS) → tarkistus libin omalla funktiolla
  throw new Error('ei arvoa: ' + testi + ' ' + sp + ika + ' L' + L);
}
const PHV = (k) => (k ? { biologinenIka_viimeisin: { phv_tila_koodi: k } } : {});
/* pelaaja, ikä 14 (syntymävuosi 2012, testi 2026), tasot { testi: taso } */
function pel(tasot, o) {
  o = o || {}; const ika = o.ika || 14, sp = o.sp || 'M', hh = {};
  Object.keys(tasot).forEach((t) => { hh[t] = arvo(t, ika, sp, tasot[t]); });
  return Object.assign({ id: 'p' + Math.random(), syntymaVuosi: 2026 - ika, sukupuoli: sp, joukkue: (sp === 'M' ? 'P' : 'T') + ika, hh_pvm: '2026-06-02', hh_viimeisin: hh }, PHV(o.phv), o.lisaa || {});
}
const M = (p, o) => F.tmFyysinenPelaaja(p, NYT, o);

describe('tmFyysinenTaso — raakatuloksesta rekisteristä', () => {
  it('apuri antaa halutun tason jokaiselle testille, molemmille sukupuolille, iät 10–19 ja 20+', () => {
    for (const sp of ['M', 'N']) for (const ika of [10, 12, 14, 16, 19, 20, 22]) for (const t of Object.keys(F.TESTIT)) for (const L of [1, 2, 3, 4, 5]) expect(F.tmFyysinenTaso(t, arvo(t, ika, sp, L), ika, sp), `${t} ${sp}${ika} L${L}`).toBe(L);
  });
  it('ikä 9 → ei tasoa (eerikkilaTaso leikkaisi hiljaa 10:een); 10 ja 19 normaalisti; 20+ aikuisten M/N', () => {
    const v = arvo('lin30m', 10, 'M', 3);
    expect(E.eerikkilaTaso(v, 'nopeus_30m', 9, 'M')).toBe(3); expect(F.tmFyysinenTaso('lin30m', v, 9, 'M')).toBe(0); expect(F.tmFyysinenTaso('lin30m', v, 10, 'M')).toBe(3);
    const w = 4.30; expect(F.tmFyysinenTaso('lin30m', w, 19, 'M')).toBe(E.eerikkilaTaso(w, 'nopeus_30m', 19, 'M')); expect(F.tmFyysinenTaso('lin30m', w, 20, 'M')).toBe(E.eerikkilaTaso(w, 'nopeus_30m', 'M', 'M'));
  });
  it('MAS km/h → m/s; sukupuoli ratkaisee normin; kelvottomat arvot → 0 (ei tasoa 1)', () => {
    const kmh = arvo('mas', 14, 'M', 3); expect(kmh).toBeGreaterThan(8); expect(F.tmFyysinenTaso('mas', kmh, 14, 'M')).toBe(3); expect(F.tmFyysinenTaso('mas', kmh / 3.6, 14, 'M')).toBe(1);   // ilman ÷ 3,6 → "taso 1": muunnos on pakollinen
    expect(F.tmFyysinenTaso('lin30m', arvo('lin30m', 14, 'N', 3), 14, 'M')).not.toBe(3);
    for (const v of [null, undefined, '', 'abc', NaN, 0, -2]) expect(F.tmFyysinenTaso('lin30m', v, 14, 'M')).toBe(0);
    expect(F.tmFyysinenTaso('lin30m', 5, 14, null)).toBe(0); expect(F.tmFyysinenTaso('lin30m', 5, 14, 'P')).toBe(0); expect(F.tmFyysinenTaso('sm_pallo', 9, 14, 'M')).toBe(0); expect(F.tmFyysinenTaso('pujottelu', 9, 14, 'M')).toBe(0);   // tekniikkatestit eivät ole fyysisiä
  });
});

describe('tmFyysinenPelaaja — kehityskohde = vähintään yksi testi tasolla 1', () => {
  for (const sp of ['M', 'N']) {
    it('sukupuoli ' + sp + ': ketteryys 1 → kehityskohde (ei kypsyysgated), taso 2 ja yli → ok', () => {
      expect(M(pel({ kasirata: 1, lin30m: 3 }, { sp, phv: 'POST' }))).toMatchObject({ tila: 'kehityskohde', osat: ['ketteryys'] });
      expect(M(pel({ kasirata: 2, lin30m: 2, cmj: 5 }, { sp, phv: 'POST' }))).toMatchObject({ tila: 'ok', osat: [] });
    });
  }
  it('vähintään yksi tasolla 1 riittää; useita → osa-alueet järjestyksessä', () => {
    const r = M(pel({ kasirata: 1, sm_juoksu: 1, lin30m: 4, mas: 1 }, { phv: 'AN' }));
    expect(r.tila).toBe('kehityskohde'); expect(r.osat).toEqual(['maksinopeus', 'kiihdytys', 'voima', 'aerobinen', 'ketteryys', 'suunnanmuutos'].filter((o) => ['aerobinen', 'ketteryys', 'suunnanmuutos'].includes(o)));
  });
  it('tekniikkatestit (sm_pallo, pujottelu, syotto) eivät ole fyysisiä: vain ne → ei fyysistä dataa', () => {
    const p = pel({}); p.hh_viimeisin = { sm_pallo: 99, pujottelu: 99, syotto: 99 };
    expect(M(p)).toMatchObject({ tila: 'ei_dataa', eiDataaSyy: 'ei_mittausta' });
  });
  it('EI lueta tallennettuja d1_taso/hh_taso: tallennettu 1 mutta raaka hyvä → ok; tallennettu 5 mutta raaka heikko → kehityskohde', () => {
    expect(M(pel({ kasirata: 3, sm_juoksu: 3 }, { phv: 'POST', lisaa: { hh_taso: 1, d1_taso: 1 } })).tila).toBe('ok');
    expect(M(pel({ kasirata: 1 }, { phv: 'POST', lisaa: { hh_taso: 5, d1_taso: 5 } })).tila).toBe('kehityskohde');
  });
  it('taso lasketaan TESTIHETKEN iällä (normiIka), ei nykyiästä: sama raaka-arvo ja syntymävuosi, eri testivuosi → eri ikä ja taso', () => {
    // arvo, joka on taso 1 ikäluokalle 14 mutta ei ikäluokalle 13 (vanhemmalla ikäluokalla tiukempi normi)
    let v = null; for (let x = 7.0; x < 13; x += 0.01) { const a = E.eerikkilaTaso(x, 'sm_juoksu', 14, 'M'), b = E.eerikkilaTaso(x, 'sm_juoksu', 13, 'M'); if (a === 1 && b >= 2) { v = Math.round(x * 100) / 100; break; } }
    expect(v).not.toBeNull();
    const base = { id: 'x', syntymaVuosi: 2012, sukupuoli: 'M', joukkue: 'P14', hh_viimeisin: { kasirata: null, sm_juoksu: v } }; delete base.hh_viimeisin.kasirata;
    expect(M(Object.assign({}, base, { hh_pvm: '2026-06-02' })).tila).toBe('kehityskohde');   // testivuosi 2026 → ikä 14
    expect(M(Object.assign({}, base, { hh_pvm: '2025-09-02' })).tila).toBe('ok');             // testivuosi 2025 → ikä 13
  });
});

describe('§28 — PHV-tilat ja kypsyysgated-testit (F2, F4)', () => {
  const gated = ['lin5m', 'lin10m', 'lin30m', 'cmj', 'mas'];
  for (const t of gated) {
    it(t + ' (' + F.TESTIT[t] + ') tasolla 1: PRE, LAH ja tuntematon neutraloivat; PH, POST ja AN → kehityskohde (F2: myös 5 m ja 10 m)', () => {
      for (const k of ['PRE', 'LAH']) expect(M(pel({ [t]: 1 }, { phv: k })), t + ' ' + k).toMatchObject({ tila: 'neutraali', osat: [], neutraloidut: [F.TESTIT[t]], kypsyysMittaamatta: false });
      expect(M(pel({ [t]: 1 }))).toMatchObject({ tila: 'neutraali', neutraloidut: [F.TESTIT[t]], kypsyysMittaamatta: true });                   // tuntematon → "Kypsyys mittaamatta"
      for (const k of ['PH', 'POST', 'AN']) expect(M(pel({ [t]: 1 }, { phv: k })), t + ' ' + k).toMatchObject({ tila: 'kehityskohde', osat: [F.TESTIT[t]], neutraloidut: [] });
    });
  }
  it('F4: ketteryys (käsirata) ja SM-juoksu eivät ole kypsyysgated → kehityskohde myös PRE/LAH/tuntematon', () => {
    for (const t of ['kasirata', 'sm_juoksu']) for (const k of ['PRE', 'LAH', null]) expect(M(pel({ [t]: 1 }, { phv: k })), t + ' ' + k).toMatchObject({ tila: 'kehityskohde', osat: [F.TESTIT[t]], kypsyysMittaamatta: false });
  });
  it('sekatapaus: gated 1 + ei-gated 1, PRE → kehityskohde ei-gated osa-alueesta, gated näkyy neutraloituna', () => {
    expect(M(pel({ lin30m: 1, cmj: 1, kasirata: 1 }, { phv: 'PRE' }))).toMatchObject({ tila: 'kehityskohde', osat: ['ketteryys'], neutraloidut: ['maksinopeus', 'voima'], kypsyysMittaamatta: false });
  });
  it('neutraali pelaaja ei ole mitattu; taso 2+ gated-testeissä ei neutraloidu (ok)', () => {
    expect(M(pel({ lin30m: 2, mas: 3 }, { phv: 'PRE' }))).toMatchObject({ tila: 'ok', neutraloidut: [] });
  });
  it('käyttää olemassa olevaa vahtia (ei omaa PHV-sääntöä): lähteessä kypsyysEstetty, ei PRE/LAH-literaaleja', () => {
    const k = readFileSync(join(juuri, 'lib/tm_fyysinen.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(k).toContain('kypsyysEstetty'); expect(k).not.toMatch(/'PRE'|'LAH'|IDP_KYPSYYS_GATED|idpKypsyysEstetty/);
    expect(k).not.toMatch(/d1_taso|hh_taso/);
  });
});

describe('vanhuus 15 kk (F3: koko patteristo), päivä tuntematon, sukupuoli, ikä', () => {
  const ilmanPvm = (o) => { const p = pel({ kasirata: 1 }, { phv: 'POST', lisaa: o }); p.hh_viimeisin = { kasirata: 99 }; return p; };   // 99 s = taso 1 kaikilla ikäluokilla (ikä testipäivänä ei vaikuta tulokseen)
  it('15 kalenterikuukautta: 11.7.2025 tuore, 10.7.2025 vanha (nyt 10.10.2026)', () => {
    expect(M(ilmanPvm({ hh_pvm: '2025-07-11' })).tila).toBe('kehityskohde');
    expect(M(ilmanPvm({ hh_pvm: '2025-07-10' }))).toMatchObject({ tila: 'ei_dataa', eiDataaSyy: 'vanha', vanha: true });
  });
  it('F3: päivä on koko fyysisen patteriston päivä: testipaivat.fyysinen_hh voittaa hh_pvm:n (hh_pvm voi olla tekniikka-H-H:n päivä)', () => {
    expect(M(ilmanPvm({ hh_pvm: '2026-09-30', testipaivat: { fyysinen_hh: '2024-01-15' } }))).toMatchObject({ tila: 'ei_dataa', eiDataaSyy: 'vanha' });
    expect(M(ilmanPvm({ hh_pvm: '2024-01-15', testipaivat: { fyysinen_hh: '2026-06-02' } })).tila).toBe('kehityskohde');
    expect(M(ilmanPvm({ hh_pvm: '2024-01-15', testipaivat: { tekniikka_hh: '2026-06-02' } })).tila).toBe('ei_dataa');   // vain fyysinen_hh ohittaa hh_pvm:n
  });
  it('tuore FLEI / tekniikan päivä ei peitä vanhaa fyysistä', () => {
    expect(M(ilmanPvm({ hh_pvm: '2024-01-15', flei_pvm: '2026-10-09', tki_pvm: '2026-10-01' }))).toMatchObject({ tila: 'ei_dataa', eiDataaSyy: 'vanha' });
  });
  it('päivä tuntematon (puuttuu / tyhjä / virheellinen / tulevaisuus) ei ole tuore', () => {
    for (const pvm of [undefined, null, '', ' ', 'ei pvm', '2026-02-31', '2027-03-01']) { const p = ilmanPvm({ hh_pvm: pvm }); if (pvm === undefined) delete p.hh_pvm; expect(M(p), String(pvm)).toMatchObject({ tila: 'ei_dataa', eiDataaSyy: 'paiva_tuntematon', paivaTuntematon: true }); }
  });
  it('sukupuoli: kenttä → joukkuenimen P/T-vara → "sukupuoli puuttuu" (ei SM-tasoa, ei arvausta)', () => {
    const a = pel({ kasirata: 1 }, { sp: 'N', phv: 'POST' }); delete a.sukupuoli; expect(M(a)).toMatchObject({ tila: 'kehityskohde' });   // T14 → N
    const b = pel({ kasirata: 1 }, { sp: 'N', phv: 'POST' }); delete b.sukupuoli; b.joukkue = '2014 Blå'; expect(M(b)).toMatchObject({ tila: 'ei_dataa', eiDataaSyy: 'sukupuoli_puuttuu' });
    const c = pel({ kasirata: 1 }, { sp: 'N', phv: 'POST' }); c.sukupuoli = ''; c.joukkue = '2014 Blå'; expect(M(c).eiDataaSyy).toBe('sukupuoli_puuttuu');
  });
  it('ikä alle 10 ja puuttuva ikä', () => {
    const a = pel({ kasirata: 3 }, { ika: 10, phv: 'PRE' }); a.syntymaVuosi = 2017; a.joukkue = 'P9'; expect(M(a).eiDataaSyy).toBe('ika_alle_10');
    const b = pel({ kasirata: 3 }, { phv: 'PRE' }); delete b.syntymaVuosi; b.joukkue = 'Blå P'; expect(M(b).eiDataaSyy).toBe('ika_puuttuu');
  });
});

/* ── joukkue ── */
const DOCS = [{ id: 'j1', nimi: 'SJK P14' }, { id: 'j2', nimi: 'SJK T14' }];
const jas = (p, id) => Object.assign(p, { joukkueet: [id] });
const heikko = () => jas(pel({ kasirata: 1 }, { phv: 'POST' }), 'j1'), ok = () => jas(pel({ kasirata: 3, lin30m: 3 }, { phv: 'POST' }), 'j1'), eiDataa = () => jas({ id: 'e' + Math.random(), syntymaVuosi: 2012, sukupuoli: 'M', joukkue: 'P14' }, 'j1'), neutr = (phv) => jas(pel({ lin30m: 1 }, { phv }), 'j1');
const JT = (P) => F.tmJoukkueFyysinen(P, DOCS, 'j1', NYT);
const lkm = (f, n) => Array.from({ length: n }, f);

describe('tmJoukkueFyysinen — yhteinen joukkuesääntö, neutraalit, otos pieni', () => {
  it('5/15 riittää; 4/15 ja 5/16 eivät; otos pieni 7 / 8', () => {
    expect(JT(lkm(heikko, 5).concat(lkm(ok, 10)))).toMatchObject({ mitattu: 15, kehityskohteita: 5, luokka: 'kehityskohde', otosPieni: false });
    expect(JT(lkm(heikko, 4).concat(lkm(ok, 11))).luokka).toBe('ok'); expect(JT(lkm(heikko, 5).concat(lkm(ok, 11))).luokka).toBe('ok');
    expect(JT(lkm(heikko, 3).concat(lkm(ok, 4)))).toMatchObject({ mitattu: 7, otosPieni: true }); expect(JT(lkm(heikko, 3).concat(lkm(ok, 5)))).toMatchObject({ mitattu: 8, otosPieni: false });
  });
  it('neutraalit kuuluvat kokonaismäärään (puolen ehto) mutta eivät mitattuihin', () => {
    expect(JT(lkm(heikko, 3).concat(lkm(() => neutr('PRE'), 3)))).toMatchObject({ yht: 6, mitattu: 3, neutraaleja: 3, luokka: 'kehityskohde' });   // 3/6 = puolet
    expect(JT(lkm(heikko, 2).concat(lkm(() => neutr('PRE'), 4)))).toMatchObject({ yht: 6, mitattu: 2, neutraaleja: 4, luokka: 'ei_luokkaa' });
    expect(JT(lkm(ok, 6).concat(lkm(() => neutr('LAH'), 6)))).toMatchObject({ mitattu: 6, kehityskohteita: 0, luokka: 'ok' });
  });
  it('ei fyysistä dataa: 0 mitattua → eiMitattua; 1–4 mitattua → ilman luokkaa', () => {
    expect(JT(lkm(eiDataa, 6))).toMatchObject({ luokka: 'ei_luokkaa', eiMitattua: true, eiDataa: 6 }); expect(JT(lkm(ok, 3).concat(lkm(eiDataa, 4)))).toMatchObject({ luokka: 'ei_luokkaa', eiMitattua: false }); expect(JT([])).toMatchObject({ yht: 0, eiMitattua: true });
  });
  it('syy = osa-alueet yleisin ensin; "Kypsyys mittaamatta" lasketaan vain tuntemattoman PHV:n neutraaleista', () => {
    const a = lkm(() => jas(pel({ kasirata: 1 }, { phv: 'POST' }), 'j1'), 3), b = lkm(() => jas(pel({ lin30m: 1 }, { phv: 'AN' }), 'j1'), 2), c = lkm(ok, 3);
    expect(JT(a.concat(b, c))).toMatchObject({ luokka: 'kehityskohde', syy: 'ketteryys', syyt: ['ketteryys', 'maksinopeus'], syyJako: { ketteryys: 3, maksinopeus: 2 } });
    const r = JT(lkm(() => neutr('PRE'), 2).concat(lkm(() => neutr(null), 3), lkm(ok, 5))); expect(r).toMatchObject({ neutraaleja: 5, kypsyysMittaamatta: 3 });
  });
  it('vanhat, päivä tuntematon ja sukupuoli puuttuu -laskurit; ei mitattuja', () => {
    const vanha = jas(pel({ kasirata: 1 }, { phv: 'POST', lisaa: { hh_pvm: '2024-01-01' } }), 'j1'), tuntematon = jas(pel({ kasirata: 1 }, { phv: 'POST', lisaa: { hh_pvm: '' } }), 'j1');
    const sp = jas(pel({ kasirata: 1 }, { phv: 'POST' }), 'j1'); delete sp.sukupuoli; sp.joukkue = '2014 Blå';
    const docs = [{ id: 'j1', nimi: '2014 Blå' }];
    expect(F.tmJoukkueFyysinen([vanha, tuntematon, sp].concat(lkm(ok, 5)), docs, 'j1', NYT)).toMatchObject({ yht: 8, mitattu: 5, vanhoja: 1, paivaTuntematon: 1, sukupuoliPuuttuu: 1, eiDataa: 3 });
  });
  it('jäsenyys tmPelaajanJoukkueet: joukkueet[] ratkaisee, ei p.joukkue-nimi', () => {
    const a = jas(pel({ kasirata: 1 }, { phv: 'POST' }), 'j2'); a.joukkue = 'SJK P14';
    expect(F.tmJoukkueFyysinen([a], DOCS, 'j1', NYT).yht).toBe(0); expect(F.tmJoukkueFyysinen([a], DOCS, 'j2', NYT).yht).toBe(1);
  });
  it('yhteenveto: laskurit; Kypsyys mittaamatta = UNIIKIT pelaajat (monijoukkueinen vain kerran)', () => {
    const n = neutr(null); n.joukkueet = ['j1', 'j2'];
    const y = F.tmFyysinenYhteenveto(lkm(heikko, 5).concat(lkm(ok, 10), [n], lkm(eiDataa, 2)), DOCS.concat([{ id: 'j3', nimi: 'tyhjä' }]), NYT);
    expect(y).toMatchObject({ joukkueita: 2, kypsyysMittaamatta: 1, neutraaleja: 1, kehityskohde: 1 }); expect(Object.keys(y.joukkueet)).toEqual(['j1', 'j2']);
  });
});

describe('selainpolku (window-globaalit, ei require)', () => {
  it('toimii vm-ikkunassa kun libit on ladattu skripteinä', () => {
    const ikkuna = { console, Date, Math, JSON }; ikkuna.window = ikkuna; vm.createContext(ikkuna);
    const lataa = (f, vie) => vm.runInContext(readFileSync(join(juuri, f), 'utf8') + '\n;' + (vie || ''), ikkuna);
    lataa('lib/tm_eerikkila_normit.js');   // EI manuaalisia this.X=-vientejä: oikeassa selaimessa const-vakiot (HH_TESTI_MAP) ovat lexikaalisia, eivät window-ominaisuuksia
    lataa('lib/tm_joukkue.js'); lataa('lib/tm_phv_tila.js'); lataa('lib/tm_idp.js');
    lataa('lib/tm_koti_luvut.js'); lataa('lib/tm_joukkuesaanto.js'); lataa('lib/tm_tekniikka.js'); lataa('lib/tm_fyysinen.js');
    const p = pel({ kasirata: 1 }, { phv: 'POST' }), q = pel({ lin30m: 1 });
    expect(ikkuna.tmFyysinenPelaaja(p, NYT)).toMatchObject({ tila: 'kehityskohde', osat: ['ketteryys'] }); expect(ikkuna.tmFyysinenPelaaja(q, NYT)).toMatchObject({ tila: 'neutraali', kypsyysMittaamatta: true });
    expect(ikkuna.TM_FYSINEN.tmFyysinenJoukkueLuokka([p], NYT)).toMatchObject({ luokka: 'kehityskohde' });
  });
});
