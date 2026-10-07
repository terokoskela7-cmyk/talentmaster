/**
 * lib/tm_harjoitepankki.js — T1 (D29): jäsennys + normalisointi + haku. Fixturet keksittyjä (seuran aineisto EI repossa).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const H = require('../lib/tm_harjoitepankki.js');
const JM = require('../lib/tm_jakso_malli.js');
const FIX = require('./fixtures/harjoitepankki/keksitty_seura.json');

describe('jäsennys: alue', () => {
  it.each([
    ['10 x 20', { pituus: 20, leveys: 10 }, 'mitta'], ['10 x 10', { pituus: 10, leveys: 10 }, 'mitta'], ['20x30', { pituus: 30, leveys: 20 }, 'mitta'], ['28x18m', { pituus: 28, leveys: 18 }, 'mitta'], ['28 × 18 m', { pituus: 28, leveys: 18 }, 'mitta'],
    ['25-30m x 18-22m', { pituus: 27.5, leveys: 20 }, 'mitta'], ['10x35-40 m suorakaide jaettuna kahteen osaan', { pituus: 37.5, leveys: 10 }, 'mitta'], ['20,5 x 10,5', { pituus: 20.5, leveys: 10.5 }, 'mitta'],
  ])('%s → %j', (t, m, tyyppi) => { const r = H.tmHarjoiteParsiAlue(t); expect(r.alue_m).toEqual(m); expect(r.alue_tyyppi).toBe(tyyppi); expect(r.alue_teksti).toBe(t); });
  it('"koko kenttä" → alue_m null + tyyppi koko; rangaistusalue / kolmannes → osa; tyhjä → kaikki null; outo → teksti säilyy, ei tyyppiä', () => {
    expect(H.tmHarjoiteParsiAlue('koko kenttä')).toEqual({ alue_m: null, alue_tyyppi: 'koko', alue_teksti: 'koko kenttä' }); expect(H.tmHarjoiteParsiAlue('Koko Kenttä')).toMatchObject({ alue_tyyppi: 'koko' });
    expect(H.tmHarjoiteParsiAlue('rangaistusalue')).toMatchObject({ alue_m: null, alue_tyyppi: 'osa' }); expect(H.tmHarjoiteParsiAlue('kolmannes kentästä')).toMatchObject({ alue_tyyppi: 'osa' });
    for (const t of ['', '  ', null, undefined]) expect(H.tmHarjoiteParsiAlue(t)).toEqual({ alue_m: null, alue_tyyppi: null, alue_teksti: null });
    expect(H.tmHarjoiteParsiAlue('jossain')).toEqual({ alue_m: null, alue_tyyppi: null, alue_teksti: 'jossain' }); expect(H.tmHarjoiteParsiAlue('0 x 10').alue_m).toBeNull();
  });
});
describe('jäsennys: pelaajamäärä', () => {
  it.each([['6 pelaajaa', 6, 6], ['1 pelaajaa', 1, 1], ['30 pelaajaa', 30, 30], ['6–8 pelaajaa', 6, 8], ['6-8', 6, 8], ['8 (3v3+2mv)', 8, 8], ['4v4', 8, 8], ['4v4+mv', 8, 9], ['3v3+2mv', 8, 8], ['3v3+mv', 6, 7], ['5 v 5', 10, 10]])('%s → %i–%i', (t, min, max) => {
    expect(H.tmHarjoiteParsiPelaajat(t).pelaajamaara).toEqual({ min, max }); expect(H.tmHarjoiteParsiPelaajat(t).pelaajamaara_teksti).toBe(t);
  });
  it('"koko ryhmä", "2+ ryhmää", kuvaileva teksti → null (teksti säilyy); tyhjä → null/null', () => {
    for (const t of ['koko ryhmä', '2+ ryhmää', '2 hyökkäysnelikkoa ja 2–3 puolustajaparia + MV']) expect(H.tmHarjoiteParsiPelaajat(t)).toEqual({ pelaajamaara: null, pelaajamaara_teksti: t });
    expect(H.tmHarjoiteParsiPelaajat('')).toEqual({ pelaajamaara: null, pelaajamaara_teksti: null });
  });
});
describe('jäsennys: ikä', () => {
  it('KPV-ikäkaistat: unioni; "alle 8" = ei alarajaa (null), yläraja 7; kaikki kaistat → 19', () => {
    expect(H.tmHarjoiteParsiIka(['alle 8'])).toMatchObject({ ika_min: null, ika_max: 7 }); expect(H.tmHarjoiteParsiIka(['alle 8', '8–9'])).toMatchObject({ ika_min: null, ika_max: 9, ika_teksti: 'alle 8, 8–9' });
    expect(H.tmHarjoiteParsiIka(['10–11', '12–13'])).toMatchObject({ ika_min: 10, ika_max: 13 }); expect(H.tmHarjoiteParsiIka(['8–9', '10–11', '12–13', '14–15', '16–19'])).toMatchObject({ ika_min: 8, ika_max: 19 });
    expect(H.tmHarjoiteParsiIka(['alle 8', '8–9', '10–11', '12–13', '14–15', '16–19'])).toMatchObject({ ika_min: null, ika_max: 19 });
  });
  it('Palloliiton tasokoodit: G6 = 6 v, F9 = 9 v, väli G7-F8 = 7–8, B17 = 17; tyhjä → null; tuntematon → null + _jasentymaton', () => {
    expect(H.tmHarjoiteParsiIka('G6')).toMatchObject({ ika_min: 6, ika_max: 6 }); expect(H.tmHarjoiteParsiIka('F9')).toMatchObject({ ika_min: 9, ika_max: 9 }); expect(H.tmHarjoiteParsiIka('G7-F8')).toMatchObject({ ika_min: 7, ika_max: 8, ika_teksti: 'G7-F8' }); expect(H.tmHarjoiteParsiIka('g7 – f8')).toMatchObject({ ika_min: 7, ika_max: 8 });
    expect(H.tmHarjoiteParsiIka('B17')).toMatchObject({ ika_min: 17, ika_max: 17 }); expect(H.tmHarjoiteParsiIka(['G6', 'F9'])).toMatchObject({ ika_min: 6, ika_max: 9 });
    for (const t of [[], '', null, undefined]) expect(H.tmHarjoiteParsiIka(t)).toEqual({ ika_min: null, ika_max: null, ika_teksti: null });
    expect(H.tmHarjoiteParsiIka('aikuiset')).toMatchObject({ ika_min: null, ika_max: null, ika_teksti: 'aikuiset', _jasentymaton: true }); expect(H.tmHarjoiteParsiIka(['10–11', 'outo'])._jasentymaton).toBe(true);
  });
});
describe('jäsennys: kesto + vuosikello', () => {
  it('kesto: "15 min" → 15, "15–20 min" → 18 (keskiarvo), "1–2 min / kierros" ja tyhjä → null (teksti säilyy)', () => {
    expect(H.tmHarjoiteParsiKesto('15 min')).toEqual({ kesto_min: 15, kesto_teksti: '15 min' }); expect(H.tmHarjoiteParsiKesto('15–20 min').kesto_min).toBe(18); expect(H.tmHarjoiteParsiKesto('10min').kesto_min).toBe(10);
    expect(H.tmHarjoiteParsiKesto('1–2 min / kierros')).toEqual({ kesto_min: null, kesto_teksti: '1–2 min / kierros' }); expect(H.tmHarjoiteParsiKesto('')).toEqual({ kesto_min: null, kesto_teksti: null });
  });
  it('vuosikello: objektit ja "Vuosi 1: 1, 4, 9" -merkkijonot; tyhjä → []; rikkinäinen ohitetaan', () => {
    expect(H.tmHarjoiteParsiVuosikello([{ vuosi: '1', jaksot: [1, 4, 9] }, { vuosi: '3', jaksot: [8] }])).toEqual([{ vuosi: 1, jaksot: [1, 4, 9] }, { vuosi: 3, jaksot: [8] }]);
    expect(H.tmHarjoiteParsiVuosikello('Vuosi 1: 1, 4, 9')).toEqual([{ vuosi: 1, jaksot: [1, 4, 9] }]); expect(H.tmHarjoiteParsiVuosikello(['Vuosi 2: 3', 'Vuosi 3: 8, 12'])).toEqual([{ vuosi: 2, jaksot: [3] }, { vuosi: 3, jaksot: [8, 12] }]);
    expect(H.tmHarjoiteParsiVuosikello([])).toEqual([]); expect(H.tmHarjoiteParsiVuosikello([{ vuosi: 'x', jaksot: [1] }, { vuosi: '1', jaksot: [] }, null, 'roskaa'])).toEqual([]);
  });
});

describe('tmHarjoiteNormalisoi (KPV-muoto)', () => {
  const N = (rivi, o) => H.tmHarjoiteNormalisoi(rivi, 'kpv', Object.assign({ tarkistaja: 'Testaaja', pvm: '2026-10-07' }, o || {}));
  it('kohdeskeema: vanhat kentät ennallaan (nimi, lahde seura, tyyppi T, tila, kaytto joukkue, kotiin_sopiva false, lahde_viite) + uudet (pelikonteksti, rakenne, pelaajamaara, alue_*, kesto_min, tasot, ika_*, vuosikello, tags, huom)', () => {
    const r = N(FIX.harjoitteet[0]); const d = r.data;
    expect(r.id).toBe('kpvh_01'); expect(d).toMatchObject({ nimi: 'Keksitty kuljetus', lahde: 'seura', tyyppi: 'T', tila: 'hyvaksytty', kaytto: 'joukkue', kotiin_sopiva: false, lahde_viite: 'Keksitty lähde A', tarkistaja: 'Testaaja', tarkistettu_pvm: '2026-10-07', laatija_rooli: 'tuonti' });
    expect(d).toMatchObject({ pelikonteksti: 'Kuljettaminen', rakenne: 'Tekniikka', pelaajamaara: { min: 6, max: 6 }, alue_m: { pituus: 20, leveys: 10 }, alue_tyyppi: 'mitta', alue_teksti: '10 x 20', kesto_min: 20, tavoite: 'Tavoite', kulku: 'Kulku', vaikeuta: 'Vaikeuta', ika_min: null, ika_max: 9, ika_teksti: 'alle 8, 8–9', vuosikello: [{ vuosi: 1, jaksot: [1, 4, 9] }], tags: ['1v1'], tasot: [], kuva_url: null, lahde_pankki: '5v5 Vuosi 1' });
    expect(d.jarjestely).toBeNull(); expect(d.helpota).toBeNull(); expect(d.huom).toBeNull(); expect(d.painopiste).toBeNull(); expect(d.maalinteko).toBeNull(); expect(d.kysymykset).toEqual([]); expect(d.kolmas_osapuoli).toBeUndefined(); expect(r.jasentymattomat).toEqual([]);
  });
  it('rivi ilman kenttiä ei kaadu (tyhjät → null/[]); id ja nimi pakollisia (uudelleenajo ei saa tuplata)', () => {
    const d = N({ id: 'x_1', nimi: 'Vain nimi' }).data; expect(d).toMatchObject({ alue_m: null, pelaajamaara: null, kesto_min: null, ika_min: null, ika_max: null, tasot: [], vuosikello: [], tags: [], kulku: null });
    expect(() => N({ nimi: 'x' })).toThrow(/id puuttuu/); expect(() => N({ id: 'a' })).toThrow(/nimi puuttuu/); expect(() => N({ id: '  ', nimi: 'x' })).toThrow(/id puuttuu/);
  });
  it('koko kenttä / osa / outo muoto: alue_tyyppi, alue_m null; jäsentymättömät raportoidaan (alue, pelaajamäärä, kesto) mutta teksti säilyy', () => {
    expect(N(FIX.harjoitteet[1]).data).toMatchObject({ alue_m: null, alue_tyyppi: 'koko', alue_teksti: 'koko kenttä', pelaajamaara: { min: 8, max: 8 }, tasot: [{ taso: 'Taso 1', ohje: 'Äänimerkistä', mittari: '3 × 5' }], ika_min: 12, ika_max: 15 });
    const o = N(FIX.harjoitteet[3]); expect(o.data).toMatchObject({ pelaajamaara: null, pelaajamaara_teksti: '2+ ryhmää', kesto_min: null, kesto_teksti: '1–2 min / kierros', alue_m: { pituus: 37.5, leveys: 10 } }); expect(o.jasentymattomat).toEqual(['kesto: "1–2 min / kierros"']);
    expect(N({ id: 'a', nimi: 'b', kentta: 'jossain', pelaajat: 'kuvaus ilman lukua', ika: ['aikuiset'] }).jasentymattomat.length).toBe(3); expect(N(FIX.harjoitteet[2]).data.alue_tyyppi).toBe('osa'); expect(N(FIX.harjoitteet[2]).jasentymattomat).toEqual([]);
  });
  it('SoccerTutor-lähteinen → luonnos + kolmas_osapuoli (ei tarkistajaa/pvm:ää); muut FIFA/SPL-maininnat eivät yksin tee luonnosta; kolmas_osapuoli voidaan antaa riviltä', () => {
    const s = N(FIX.harjoitteet[2]).data; expect(s.tila).toBe('luonnos'); expect(s.kolmas_osapuoli).toBe(true); expect(s.tarkistaja).toBeUndefined(); expect(s.tarkistettu_pvm).toBeUndefined();
    expect(N(FIX.harjoitteet[4]).data.tila).toBe('hyvaksytty'); expect(N({ id: 'a', nimi: 'b', kolmas_osapuoli: true }).data).toMatchObject({ tila: 'luonnos', kolmas_osapuoli: true });
  });
  it('kaytto: oletus joukkue (pelaajalle ei näy); koti vain jos lähde sanoo; Pallo-Iirot: jako_lupa tallentuu, tasokoodit → ika_min/max', () => {
    expect(N({ id: 'a', nimi: 'b' }).data.kaytto).toBe('joukkue'); expect(N({ id: 'a', nimi: 'b', kaytto: 'koti' }).data.kaytto).toBe('koti'); expect(N({ id: 'a', nimi: 'b', kaytto: 'muu' }).data.kaytto).toBe('joukkue');
    const p = H.tmHarjoiteNormalisoi({ id: 'pi_u9_04', nimi: 'Leikki', rakenne: 'leikki', pelikonteksti: 'Kuljetus', painopiste: 'Käännös', laatutekija: 'Ketteryys', maalinteko: 'ei', pelaajat: '6–8 pelaajaa', alue: '25-30m x 18-22m', ikavaihe: 'G7-F8', jako_lupa: true }, 'pallo_iirot', { tarkistaja: 'T', pvm: '2026-10-07' });
    expect(p.data).toMatchObject({ rakenne: 'leikki', pelikonteksti: 'Kuljetus', painopiste: 'Käännös', laatutekija: 'Ketteryys', maalinteko: 'ei', pelaajamaara: { min: 6, max: 8 }, alue_m: { pituus: 27.5, leveys: 20 }, ika_min: 7, ika_max: 8, ika_teksti: 'G7-F8', jako_lupa: true }); expect(N({ id: 'a', nimi: 'b' }).data.jako_lupa).toBeUndefined();
  });
  it('tuloksessa ei undefined-arvoja (Firestore set hylkäisi) eikä kiellettyjä kenttänimiä; GDPR-sanatesti kenttänimille', () => {
    for (const rivi of FIX.harjoitteet) { const d = N(rivi).data; const kay = (x, p) => { if (x === undefined) throw new Error('undefined: ' + p); if (x && typeof x === 'object') Object.keys(x).forEach((k) => kay(x[k], p + '.' + k)); }; expect(() => kay(d, '$')).not.toThrow(); expect(JM.tmTarkistaJaksoData(Object.keys(d).reduce((o, k) => { o[k] = null; return o; }, {}))).toEqual([]); }
  });
});

describe('tmHarjoiteHaku (D29)', () => {
  const R = (id, lisa) => Object.assign({ nimi: id, tila: 'hyvaksytty', pelikonteksti: 'Kuljettaminen', painopiste: null, alue_m: { pituus: 20, leveys: 10 }, alue_tyyppi: 'mitta', ika_min: null, ika_max: null }, lisa || {});
  const PANKKI = [R('a'), R('b', { alue_m: { pituus: 20, leveys: 12 } }), R('c', { alue_m: { pituus: 40, leveys: 20 } }), R('koko', { alue_m: null, alue_tyyppi: 'koko' }), R('osa', { alue_m: null, alue_tyyppi: 'osa' }), R('tuntematon', { alue_m: null, alue_tyyppi: null }),
    R('arkisto', { arkistoitu: true }), R('luonnos', { tila: 'luonnos' }), R('muu_konteksti', { pelikonteksti: 'Syöttäminen' }), R('nuoret', { ika_min: 14, ika_max: 19 }), R('pienille', { ika_max: 7 }), R('p1', { painopiste: 'Käännös' }), R('p2', { painopiste: 'Suojaus' })];
  const nimet = (l) => l.map((x) => x.nimi);
  it('koko ±30 % rajaa (pinta-ala): 200 m² → 140–260; "koko kenttä" ei osu pieneen alueeseen; tuntematon/osa-alue ei osu kun alue annettu', () => {
    const l = nimet(H.tmHarjoiteHaku(PANKKI, { alue_m: { pituus: 20, leveys: 10 } })); expect(l).toContain('a'); expect(l).toContain('b'); expect(l).not.toContain('c'); expect(l).not.toContain('koko'); expect(l).not.toContain('osa'); expect(l).not.toContain('tuntematon');
    expect(nimet(H.tmHarjoiteHaku([R('x', { alue_m: { pituus: 20, leveys: 14 } }), R('y', { alue_m: { pituus: 20, leveys: 6 } })], { alue_m: { pituus: 20, leveys: 10 } }))).toEqual([]);   // 280 > 260 ja 120 < 140
    expect(nimet(H.tmHarjoiteHaku([R('x', { alue_m: { pituus: 20, leveys: 13 } }), R('y', { alue_m: { pituus: 20, leveys: 7 } })], { alue_m: { pituus: 20, leveys: 10 } }))).toEqual(['x', 'y']);   // 260 ja 140 = rajalla (mukana)
  });
  it('"koko kenttä" -harjoite osuu vain kun aluetta ei ole annettu TAI se on ≥ 60 × 40 m', () => {
    expect(nimet(H.tmHarjoiteHaku(PANKKI, {}))).toContain('koko'); expect(nimet(H.tmHarjoiteHaku(PANKKI, { alue_m: { pituus: 60, leveys: 40 } }))).toContain('koko'); expect(nimet(H.tmHarjoiteHaku(PANKKI, { alue_m: { pituus: 100, leveys: 64 } }))).toContain('koko');
    expect(nimet(H.tmHarjoiteHaku(PANKKI, { alue_m: { pituus: 59, leveys: 40 } }))).not.toContain('koko'); expect(nimet(H.tmHarjoiteHaku(PANKKI, { alue_m: { pituus: 60, leveys: 39 } }))).not.toContain('koko'); expect(nimet(H.tmHarjoiteHaku(PANKKI, { alue_m: { pituus: 20, leveys: 10 } }))).not.toContain('koko');
  });
  it('ilman aluetta alue ei rajaa (tuntematon ja osa-alue mukana); arkistoidut ja ei-hyväksytyt AINA pois', () => {
    const l = nimet(H.tmHarjoiteHaku(PANKKI, {})); for (const n of ['a', 'b', 'c', 'osa', 'tuntematon']) expect(l).toContain(n); expect(l).not.toContain('arkisto'); expect(l).not.toContain('luonnos');
    expect(nimet(H.tmHarjoiteHaku(PANKKI, { alue_m: { pituus: 20, leveys: 10 }, pelikonteksti: 'Kuljettaminen', ika: 10 }))).not.toContain('arkisto');
  });
  it('pelikonteksti ratkaisee (rajaa, diakriittien/kirjainkoon yli); painopiste nostaa järjestyksessä; ikä suodattaa (avoimet rajat sallivat)', () => {
    const k = nimet(H.tmHarjoiteHaku(PANKKI, { pelikonteksti: 'kuljettaminen' })); expect(k).not.toContain('muu_konteksti'); expect(nimet(H.tmHarjoiteHaku(PANKKI, { pelikonteksti: 'Syöttäminen' }))).toEqual(['muu_konteksti']); expect(nimet(H.tmHarjoiteHaku([R('d', { pelikonteksti: 'Syottaminen' })], { pelikonteksti: 'Syöttäminen' }))).toEqual(['d']);
    const p = nimet(H.tmHarjoiteHaku(PANKKI, { pelikonteksti: 'Kuljettaminen', painopiste: 'Käännös' })); expect(p[0]).toBe('p1'); expect(p).toContain('p2');   // väärä painopiste ei karsi, vain oikea nousee
    const i10 = nimet(H.tmHarjoiteHaku(PANKKI, { ika: 10 })); expect(i10).toContain('a'); expect(i10).toContain('pienille' === 'x' ? '' : 'a'); expect(i10).not.toContain('nuoret'); expect(i10).not.toContain('pienille');
    expect(nimet(H.tmHarjoiteHaku(PANKKI, { ika: 16 }))).toContain('nuoret'); expect(nimet(H.tmHarjoiteHaku(PANKKI, { ika: 6 }))).toContain('pienille'); expect(nimet(H.tmHarjoiteHaku(PANKKI, { ika: 14 }))).toContain('nuoret'); expect(nimet(H.tmHarjoiteHaku(PANKKI, { ika: 7 }))).toContain('pienille'); expect(nimet(H.tmHarjoiteHaku(PANKKI, { ika: 8 }))).not.toContain('pienille');
  });
  it('tyhjä/rikkinäinen pankki ja ehto ei kaada; järjestys vakaa (pisteet, sitten nimi)', () => {
    expect(H.tmHarjoiteHaku(null, null)).toEqual([]); expect(H.tmHarjoiteHaku([null, {}, 5], {})).toEqual([]); expect(H.tmHarjoiteHaku(PANKKI)).toEqual(H.tmHarjoiteHaku(PANKKI, {}));
    const a = nimet(H.tmHarjoiteHaku(PANKKI, { pelikonteksti: 'Kuljettaminen' })); expect(a).toEqual(a.slice().sort((x, y) => x.localeCompare(y)));
  });
});
