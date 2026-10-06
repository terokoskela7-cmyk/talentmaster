/**
 * B PR2 — seuran oma harjoitepankki ohittaa TM:n oletuksen KEHITYSKOHTEEN / KETJUN tasolla (ei nimen), TM varapolkuna (D16 = A). Lib pysyy PURE: pankki injektoidaan.
 * Characterization-testit (tests/harjoitelogiikka.characterization.test.js) pysyvät ennallaan (TM-polun paluumuoto ei muutu).
 * Eristys parametrisoitu (seuraA, seuraB) molempiin suuntiin: SJK:n harjoite ei koskaan päädy Sibbon (sibbovargarna) pelaajan päivän harjoitteeksi.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lib = require('../harjoitelogiikka_v4.js');
const PVM = (n) => new Date(Date.UTC(2026, 5, 15 + n)).toISOString().slice(0, 10);
const PELAAJA = (seuraId, lisa) => Object.assign({ seuraId, ika: 13, tki_kehityskohde: 'syotto', luotu: '2026-03-01' }, lisa || {});
const H = (seura, lisa) => Object.assign({ nimi: seura + ' syöttörondo', tyyppi: 'T', lahde: 'seura', tila: 'hyvaksytty', kehityskohde: 'syotto', ika_min: 10, ika_max: 15, ohje: seura + ' ohje', kesto_min: 15, versio: 1 }, lisa || {});
const PANKKI_OF = (seura, harjoitteet) => ({ seuraId: seura, harjoitteet });
const TM_NIMET = (kohdePelaaja) => new Set(Array.from({ length: 60 }, (_, i) => lib.valitsePaivanHarjoite(kohdePelaaja, lib.PANKKI, PVM(i)).nimi));

describe('T-ohitus: seuran pankki ensin, TM varalla (kehityskohteen taso)', () => {
  it('seuran harjoite voittaa: lahde "seura", nimi/ohje seuralta, kesto minuuteista; TM-polun muoto ennallaan (ei lahde-kenttää)', () => {
    const r = lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(10), PANKKI_OF('sjk', [H('SJK')]));
    expect(r).toMatchObject({ nimi: 'SJK syöttörondo', ohje: 'SJK ohje', kesto: '15 min', kehityskohde: 'syotto', tyyppi: 'T', lahde: 'seura' });
    const tm = lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(10)); expect('lahde' in tm).toBe(false); expect(tm.nimi).not.toBe('SJK syöttörondo');
  });
  it('OHITUS ON KOHTEEN TASOLLA, EI NIMEN: kun seuralla on syöttö-harjoitteita, TM:n syöttöoletusta ei näy YHTENÄKÄÄN päivänä (60 pv); muiden kohteiden TM-oletus ennallaan', () => {
    const tmSyotto = TM_NIMET(PELAAJA('sjk')); expect(tmSyotto.size).toBeGreaterThan(1);
    const seura = PANKKI_OF('sjk', [H('SJK', { nimi: 'Eri nimi 1' }), H('SJK', { nimi: 'Eri nimi 2' })]);
    const nimet = new Set(Array.from({ length: 60 }, (_, i) => lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(i), seura).nimi));
    expect([...nimet].sort()).toEqual(['Eri nimi 1', 'Eri nimi 2']); [...tmSyotto].forEach((n) => expect(nimet.has(n)).toBe(false));
    const muu = PELAAJA('sjk', { tki_kehityskohde: 'nopeus' });   // seuralla ei nopeus-harjoitteita → TM-varapolku
    const ilman = lib.valitsePaivanHarjoite(muu, lib.PANKKI, PVM(10)), kanssa = lib.valitsePaivanHarjoite(muu, lib.PANKKI, PVM(10), seura);
    expect(kanssa).toEqual(ilman); expect(kanssa.kehityskohde).toBe('nopeus');
  });
  it('varapolku: ei seuraPankkia / tyhjä / väärä kohde / väärä ikä → TM-oletus täsmälleen kuten ennen', () => {
    const ennen = lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(10));
    for (const sp of [undefined, null, [], { seuraId: 'sjk', harjoitteet: [] }, PANKKI_OF('sjk', [H('SJK', { kehityskohde: 'nopeus' })]), PANKKI_OF('sjk', [H('SJK', { ika_min: 14, ika_max: 16 })]), PANKKI_OF('sjk', [H('SJK', { ika_max: 12 })])])
      expect(lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(10), sp)).toEqual(ennen);
  });
  it('vain lahde "seura" + tyyppi "T" + nimi hyväksytään (lahde "tm", tyyppi "S", nimetön ignoroidaan)', () => {
    const ennen = lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(10));
    for (const huono of [{ lahde: 'tm' }, { lahde: undefined }, { tyyppi: 'S' }, { nimi: '' }, { nimi: undefined }]) {
      const h = H('SJK', huono); Object.keys(h).forEach((k) => h[k] === undefined && delete h[k]);
      expect(lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(10), PANKKI_OF('sjk', [h]))).toEqual(ennen);
    }
  });
  it('v3.41 TILA: vain "hyvaksytty" päätyy pelaajalle — luonnos, tyhjä ja puuttuva tila ignoroidaan (→ TM-oletus); hyväksytty voittaa luonnoksen samassa listassa; myös ketjutaso', () => {
    const ennen = lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(10));
    for (const tila of ['luonnos', '', undefined, 'Hyvaksytty', 'odottaa']) {
      const h = H('SJK', { tila }); if (tila === undefined) delete h.tila;
      expect(lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(10), PANKKI_OF('sjk', [h]))).toEqual(ennen);
      expect(lib.valitseSeuranKetjunHarjoite(PELAAJA('sjk'), PANKKI_OF('sjk', [Object.assign(h, { ketju: 'DFL' })]), 'DFL', PVM(10))).toBeNull();
    }
    const sp = PANKKI_OF('sjk', [H('SJK', { nimi: 'LUONNOS', tila: 'luonnos' }), H('SJK', { nimi: 'HYVÄKSYTTY' })]);
    for (let n = 0; n < 30; n++) expect(lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(n), sp).nimi).toBe('HYVÄKSYTTY');
    const jm = require('../lib/tm_jakso_malli.js');   // jakso-snapshot: luonnosta ei voi liittää tukiosaan
    expect(() => jm.tmTukiosa({ alue: 'kestävyys', perustelu: 'x', harjoitteet: [{ id: 'a', nimi: 'A', lahde: 'seura', tila: 'luonnos' }] })).toThrow(/luonnos/);
    expect(jm.tmTukiosa({ alue: 'kestävyys', perustelu: 'x', harjoitteet: [{ id: 'a', nimi: 'A', lahde: 'seura', tila: 'hyvaksytty' }, { id: 'b', nimi: 'B', lahde: 'tm' }] }).harjoitteet.map((x) => x.id)).toEqual(['a', 'b']);
  });
  it('4a KAYTTO "joukkue": joukkueharjoite (valmentajan rata) EI korvaa TM:n oletusta eikä ole koskaan päivän harjoite — samalla kohteella/ketjulla; muu kaytto (puuttuva / "koti") toimii kuten ennen', () => {
    const ennen = lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(10));
    const jk = PANKKI_OF('sjk', [H('SJK', { kaytto: 'joukkue', ketju: 'DFL' })]);
    for (let n = 0; n < 30; n++) expect(lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(n), jk)).toEqual(lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(n)));
    expect(lib.valitseSeuranKetjunHarjoite(PELAAJA('sjk'), jk, 'DFL', PVM(10))).toBeNull(); expect(lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(10), jk)).toEqual(ennen);
    const sekaisin = PANKKI_OF('sjk', [H('SJK', { nimi: 'JOUKKUE', kaytto: 'joukkue' }), H('SJK', { nimi: 'KOTI', kaytto: 'koti' }), H('SJK', { nimi: 'ILMAN' })]);
    const nimet = new Set(Array.from({ length: 30 }, (_, i) => lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(i), sekaisin).nimi)); expect([...nimet].sort()).toEqual(['ILMAN', 'KOTI']);
  });
  it('ikärajat: ika_min/ika_max rajaavat (13-vuotias: 10–15 ✓, 14–16 ✗, ≤12 ✗); rajat puuttuvat = avoin; paljas taulukko kelpaa myös', () => {
    expect(lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(10), [H('SJK', { ika_min: undefined, ika_max: undefined })]).lahde).toBe('seura');
    expect(lib.valitsePaivanHarjoite(PELAAJA('sjk', { ika: 14 }), lib.PANKKI, PVM(10), PANKKI_OF('sjk', [H('SJK', { ika_min: 14, ika_max: 16 })])).lahde).toBe('seura');
  });
  it('rotaatio ja determinismi: sama päivä → sama harjoite; eri päivinä kierto seuran listassa; 3 ensimmäistä päivää sama (kuten TM)', () => {
    const sp = PANKKI_OF('sjk', [H('SJK', { nimi: 'A' }), H('SJK', { nimi: 'B' }), H('SJK', { nimi: 'C' })]);
    const nimi = (n) => lib.valitsePaivanHarjoite(PELAAJA('sjk'), lib.PANKKI, PVM(n), sp).nimi;
    expect(nimi(30)).toBe(nimi(30)); expect(new Set(Array.from({ length: 9 }, (_, i) => nimi(10 + i)))).toEqual(new Set(['A', 'B', 'C']));
    const tuore = PELAAJA('sjk', { luotu: PVM(0) }); expect([0, 1, 2].map((n) => lib.valitsePaivanHarjoite(tuore, lib.PANKKI, PVM(n), sp).nimi)).toEqual(['A', 'A', 'A']);
  });
});

describe.each([['sjk', 'sibbovargarna'], ['sibbovargarna', 'sjk']])('ERISTYS: %s-pankki ei päädy seuran %s pelaajalle', (A, B) => {
  it('pelaaja saa OMAN seuransa harjoitteen; toisen seuran pankki (wrapperin seuraId ≠ pelaajan seuraId) IGNOROIDAAN → TM-oletus; jokaisena päivänä 60 pv', () => {
    const pankkiA = PANKKI_OF(A, [H(A.toUpperCase(), { nimi: A + '-harjoite' })]), tm = (n) => lib.valitsePaivanHarjoite(PELAAJA(B), lib.PANKKI, PVM(n));
    for (let n = 0; n < 60; n++) {
      expect(lib.valitsePaivanHarjoite(PELAAJA(A), lib.PANKKI, PVM(n), pankkiA).nimi).toBe(A + '-harjoite');
      const vaara = lib.valitsePaivanHarjoite(PELAAJA(B), lib.PANKKI, PVM(n), pankkiA);   // A:n pankki B:n pelaajalle (esim. väärä lataus)
      expect(vaara).toEqual(tm(n)); expect(vaara.nimi).not.toContain(A + '-harjoite'); expect(vaara.lahde).toBeUndefined();
    }
  });
  it('ketjutaso (DFL): A:lla DFL-harjoite → A:n pelaaja ei saa TM:n DFL-oletusta (palautuu seuran harjoite); B:n pelaaja saa null (→ TM:n DFL-oletus), myös A:n pankilla', () => {
    const pankkiA = PANKKI_OF(A, [H(A.toUpperCase(), { nimi: A + ' DFL-harjoite', ketju: 'DFL', kehityskohde: undefined })]);
    const r = lib.valitseSeuranKetjunHarjoite(PELAAJA(A), pankkiA, 'DFL', PVM(10)); expect(r).toMatchObject({ nimi: A + ' DFL-harjoite', lahde: 'seura', ketju: 'DFL' });
    expect(lib.valitseSeuranKetjunHarjoite(PELAAJA(A), pankkiA, 'dfl', PVM(10)).nimi).toBe(A + ' DFL-harjoite');   // kirjainkoko ei merkitse
    expect(lib.valitseSeuranKetjunHarjoite(PELAAJA(B), pankkiA, 'DFL', PVM(10))).toBeNull();                         // toinen seura → TM:n DFL-oletus
    expect(lib.valitseSeuranKetjunHarjoite(PELAAJA(B), PANKKI_OF(B, []), 'DFL', PVM(10))).toBeNull();
    expect(lib.valitseSeuranKetjunHarjoite(PELAAJA(A), pankkiA, 'SBL', PVM(10))).toBeNull();                          // muu ketju ennallaan (TM)
    expect(lib.valitseSeuranKetjunHarjoite(PELAAJA(A), null, 'DFL', PVM(10))).toBeNull();
  });
  it('paljas taulukko (ilman seuraId-vartijaa) toimii kutsujan vastuulla; lähde "seura" -vaatimus silti voimassa', () => {
    expect(lib.valitseSeuranKetjunHarjoite(PELAAJA(A), [H(A, { ketju: 'DFL', lahde: 'tm' })], 'DFL', PVM(10))).toBeNull();
  });
});

describe('lib on PURE ja kutsujat eivät vielä muutu', () => {
  it('harjoitelogiikka_v4.js ei lue Firestorea / verkkoa; HTML-kutsujat (Pelaaja_v7, Master, Solo) eivät välitä seuraPankkia vielä → käytös ennallaan', () => {
    const { readFileSync } = require('fs'); const src = readFileSync(require.resolve('../harjoitelogiikka_v4.js'), 'utf8');
    const seuranOsa = src.slice(src.indexOf('// ── SEURAN OMA HARJOITEPANKKI'), src.indexOf('// ── 1B: Päivittäinen harjoitevalinta'));
    expect(seuranOsa.length).toBeGreaterThan(500); expect(seuranOsa.replace(/\/\/.*$/gm, '')).not.toMatch(/firebase|firestore|collection\(|fetch\(|XMLHttpRequest|require\(/i);
    for (const f of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Master_v16.html', 'Solo_Koti.html']) { try { expect(readFileSync(require('path').join(__dirname, '..', f), 'utf8')).not.toMatch(/valitseSeuranKetjunHarjoite|seuraPankki/); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
  });
});
