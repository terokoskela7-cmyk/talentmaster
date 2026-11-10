/** Projekti 07 / PR 1: lib/tm_valvonta.js — puhdas ydin. Synteettinen aineisto, ei Firestorea.
 *  Sisältää 9.11.-tilanteen (273 ehdotusta väärän seuran alla, neljässä seurassa), kaikki E1–E7/H/K/M-tapaukset, kynnysrajat ja mutaatiotarkistuksen. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const V = require('../lib/tm_valvonta.js');

const seuraA = (sid, nimet, extra) => Object.assign({ sid, joukkueet: nimet.map((n, i) => ({ id: sid + '_j' + i, nimi: n })), pelaajat: [], kayttajat: [] }, extra || {});
const lista = (n, f) => Array.from({ length: n }, (_, i) => f(i));
function aja(seurat, kokoelmat, kayttajat) {
  const I = V.tmVIndeksit(seurat);
  const tulos = {};
  seurat.forEach((s) => { tulos[s.sid] = V.tmVTarkistaSeura({ sid: s.sid, joukkueet: s.joukkueet, kokoelmat: kokoelmat[s.sid] || {}, kayttajat: new Set((kayttajat && kayttajat[s.sid]) || s.kayttajat), indeksit: I }); });
  return { I, tulos };
}
const hae = (rivit, koodi, kokoelma) => rivit.find((r) => r.koodi === koodi && (!kokoelma || r.kokoelma === kokoelma));

describe('9.11.-tilanne: 273 ehdotusta väärän seuran alla neljässä seurassa', () => {
  const seurat = [seuraA('a', ['A U13']), seuraA('b', ['B U13']), seuraA('c', ['C U12']), seuraA('d', ['D U12'])];
  const saastuneet = { a: [100, 'B U13'], b: [80, 'A U13'], c: [60, 'D U12'], d: [33, 'C U12'] };   // 100+80+60+33 = 273
  const kok = {};
  seurat.forEach((s) => { const [n, vieras] = saastuneet[s.sid]; kok[s.sid] = { toimenpiteet: lista(30, (i) => ({ _id: 'o' + i, joukkue: s.joukkueet[0].nimi, tila: 'ehdotus' })).concat(lista(n, (i) => ({ _id: 'v' + i, joukkue: vieras, tila: 'ehdotus' }))) }; });
  it('E1a löytää täsmälleen 273 dokumenttia ja jakaa ne seuroittain', () => {
    const { tulos } = aja(seurat, kok);
    const e1a = seurat.map((s) => hae(tulos[s.sid], 'E1a', 'toimenpiteet'));
    expect(e1a.map((r) => r.lkm)).toEqual([100, 80, 60, 33]);
    expect(e1a.reduce((a, r) => a + r.lkm, 0)).toBe(273);
    e1a.forEach((r) => expect(r.taso).toBe('virhe'));
    seurat.forEach((s) => expect(hae(tulos[s.sid], 'E1b', 'toimenpiteet').lkm).toBe(0));
  });
  it('puhdas aineisto → 0 (ei vääriä hälytyksiä)', () => {
    const puhdas = {}; seurat.forEach((s) => { puhdas[s.sid] = { toimenpiteet: lista(30, (i) => ({ _id: 'o' + i, joukkue: s.joukkueet[0].nimi, tila: 'ehdotus' })) }; });
    const { tulos } = aja(seurat, puhdas);
    seurat.forEach((s) => expect(hae(tulos[s.sid], 'E1a', 'toimenpiteet').lkm).toBe(0));
  });
  it('MUTAATIO: yhden dokumentin siirto toisen seuran joukkueeseen nostaa lukua tasan yhdellä (ja takaisin laskee)', () => {
    const p = { a: { toimenpiteet: [{ _id: '1', joukkue: 'A U13' }, { _id: '2', joukkue: 'A U13' }] }, b: {} };
    const ss = [seuraA('a', ['A U13']), seuraA('b', ['B U13'])];
    expect(hae(aja(ss, p).tulos.a, 'E1a', 'toimenpiteet').lkm).toBe(0);
    p.a.toimenpiteet[1].joukkue = 'B U13';
    expect(hae(aja(ss, p).tulos.a, 'E1a', 'toimenpiteet').lkm).toBe(1);
    p.a.toimenpiteet[1].joukkue = 'A U13';
    expect(hae(aja(ss, p).tulos.a, 'E1a', 'toimenpiteet').lkm).toBe(0);
  });
});

describe('E1a / E1b: joukkueviitteen luokittelu', () => {
  const ss = [seuraA('a', ['A U13', 'A-U12']), seuraA('b', ['B U13'])];
  const ctx = () => { const I = V.tmVIndeksit(ss); return Object.assign({ sid: 'a', nimiSeurat: I.nimiSeurat, idSeurat: I.idSeurat }, I.omat.a); };
  it('tyhja / oma / toisen_seuran / orpo', () => {
    const c = ctx();
    ['', null, undefined, 'Tuntematon', '—'].forEach((v) => expect(V.tmVJoukkueviite(v, c)).toBe('tyhja'));
    expect(V.tmVJoukkueviite('a u13', c)).toBe('oma'); expect(V.tmVJoukkueviite('A_U12', c)).toBe('oma'); expect(V.tmVJoukkueviite('a_j0', c)).toBe('oma');
    expect(V.tmVJoukkueviite('B U13', c)).toBe('toisen_seuran'); expect(V.tmVJoukkueviite('b_j0', c)).toBe('toisen_seuran');
    expect(V.tmVJoukkueviite('Kadonnut U9', c)).toBe('orpo');
  });
  it('nimi joka on molemmilla seuroilla on oma (ei vääriä hälytyksiä "U13"-tyyppisistä nimistä)', () => {
    const s2 = [seuraA('a', ['U13']), seuraA('b', ['U13'])]; const I = V.tmVIndeksit(s2);
    expect(V.tmVJoukkueviite('U13', Object.assign({ sid: 'a', nimiSeurat: I.nimiSeurat, idSeurat: I.idSeurat }, I.omat.a))).toBe('oma');
  });
  it('pelaajan id-viitteet (joukkueId, joukkueet[]) ja nimet tarkistetaan; toisen seuran voittaa orvon', () => {
    const kok = { a: { pelaajat: [{ _id: 'p1', joukkue: 'A U13', joukkueet: ['b_j0'] }, { _id: 'p2', joukkueNimi: 'Kadonnut', joukkueId: 'a_j0' }, { _id: 'p3', joukkue: 'Kadonnut', joukkueet: ['b_j0'] }, { _id: 'p4', joukkue: 'A U13' }] } };
    const r = aja(ss, kok).tulos.a;
    expect(hae(r, 'E1a', 'pelaajat').lkm).toBe(2); expect(hae(r, 'E1b', 'pelaajat').lkm).toBe(1);
  });
  it('E1b on varoitus; yli 10 % seuran dokumenteista kokoelmassa → virhe (massavirhe)', () => {
    const p = (n, kaikki) => aja(ss, { a: { toimenpiteet: lista(kaikki, (i) => ({ _id: 'x' + i, joukkue: i < n ? 'Kadonnut' + i : 'A U13' })) } }).tulos.a;
    expect(hae(p(10, 100), 'E1b', 'toimenpiteet').taso).toBe('varoitus'); expect(hae(p(11, 100), 'E1b', 'toimenpiteet').taso).toBe('virhe'); expect(hae(p(0, 100), 'E1b', 'toimenpiteet').taso).toBe('ok');
  });
  it('kaikki kokoelmat joissa on joukkueviite käydään läpi (kalenteri, viestit, kuittaukset, kooste_joukkue, havainnot, harjoitusarvioinnit, mentoroinnit)', () => {
    Object.keys(V.VIITEKENTAT).forEach((k) => {
      const f = V.VIITEKENTAT[k][0], d = {}; d[f] = 'B U13';
      expect(hae(aja(ss, { a: { [k]: [Object.assign({ _id: '1' }, d)] } }).tulos.a, 'E1a', k).lkm, k).toBe(1);
    });
  });
});

describe('E2 / E6: seurojen väliset (globaali)', () => {
  const P = (id, extra) => Object.assign({ _id: id, etunimi: 'X', syntymaVuosi: 2013, tunniste: 't' + id }, extra || {});
  it('E2: sama id kahdella seuralla, molemmat aktiivisia → virhe kummallekin', () => {
    const ss = [seuraA('a', ['A'], { pelaajat: [P('p1')] }), seuraA('b', ['B'], { pelaajat: [P('p1'), P('p2')] })];
    const g = V.tmVTarkistaGlobaali(V.tmVIndeksit(ss), [], 0);
    ['a', 'b'].forEach((s) => { const r = g.find((x) => x.seura === s && x.koodi === 'E2'); expect(r.lkm).toBe(1); expect(r.taso).toBe('virhe'); });
  });
  it('E2: toinen arkistoitu / poistettu / aktiivinen:false → E2b varoitus (siirron jälki), ei E2 virhe', () => {
    [{ arkistoitu: true }, { poistettu: true }, { aktiivinen: false }, { tila: 'arkistoitu' }].forEach((tila) => {
      const ss = [seuraA('a', ['A'], { pelaajat: [P('p1')] }), seuraA('b', ['B'], { pelaajat: [P('p1', tila)] })];
      const g = V.tmVTarkistaGlobaali(V.tmVIndeksit(ss), [], 0);
      expect(g.filter((x) => x.koodi === 'E2').every((x) => x.lkm === 0), JSON.stringify(tila)).toBe(true);
      expect(g.filter((x) => x.koodi === 'E2b').map((x) => x.lkm)).toEqual([1, 1]);
      expect(g.find((x) => x.koodi === 'E2b').taso).toBe('varoitus');
    });
  });
  it('E6: sama PalloID eri pelaajilla (kirjautumisen törmäys); sama pelaaja-id kahdella seuralla ei ole E6', () => {
    const ss = [seuraA('a', ['A'], { pelaajat: [P('p1', { tunniste: '777' })] }), seuraA('b', ['B'], { pelaajat: [P('p2', { tunniste: '777' }), P('p3', { palloId: '888' })] })];
    const g = V.tmVTarkistaGlobaali(V.tmVIndeksit(ss), [], 0);
    expect(g.filter((x) => x.koodi === 'E6').map((x) => [x.seura, x.lkm, x.taso])).toEqual([['a', 1, 'virhe'], ['b', 1, 'virhe']]);
    const sama = [seuraA('a', ['A'], { pelaajat: [P('p1', { tunniste: '5' })] }), seuraA('b', ['B'], { pelaajat: [P('p1', { tunniste: '5', arkistoitu: true })] })];
    expect(V.tmVTarkistaGlobaali(V.tmVIndeksit(sama), [], 0).filter((x) => x.koodi === 'E6').every((x) => x.lkm === 0)).toBe(true);
  });
  it('E7: audit-estot viimeisen 7 pv ajalta, seuroittain; vanhat ja muut toiminnot eivät', () => {
    const nyt = Date.UTC(2026, 10, 10), pv = 86400000, ss = [seuraA('a', ['A']), seuraA('b', ['B'])];
    const rivit = [{ toiminto: 'kayttaja_toisen_seuran_estetty', aikaleimaMs: nyt - pv, seuraId: 'a' }, { toiminto: 'kayttaja_rooli_estetty', aikaleimaMs: nyt - 7 * pv, seuraId: 'a' },
      { toiminto: 'kayttaja_rooli_estetty', aikaleimaMs: nyt - 7 * pv - 1, seuraId: 'a' }, { toiminto: 'muu', aikaleimaMs: nyt, seuraId: 'a' }, { toiminto: 'kayttaja_rooli_estetty', aikaleimaMs: nyt - 2 * pv, seuraId: 'b' }];
    const g = V.tmVTarkistaGlobaali(V.tmVIndeksit(ss), rivit, nyt);
    expect(g.filter((x) => x.koodi === 'E7').map((x) => [x.seura, x.lkm, x.taso])).toEqual([['a', 2, 'varoitus'], ['b', 1, 'varoitus']]);
  });
});

describe('E3 / E4 / E5 / K / M', () => {
  const ss = [seuraA('a', ['A U13']), seuraA('b', ['B U13'])];
  it('E3: seuraId ≠ polun seura (kayttajat, havainnot, sisainen) → virhe', () => {
    const r = aja(ss, { a: { kayttajat: [{ _id: 'u1', seuraId: 'a' }, { _id: 'u2', seuraId: 'b' }, { _id: 'u3' }], havainnot: [{ _id: 'h', seuraId: 'b' }], sisainen: [{ _id: 's', seuraId: 'a' }] } }).tulos.a;
    expect(hae(r, 'E3', 'kayttajat').lkm).toBe(1); expect(hae(r, 'E3', 'havainnot').lkm).toBe(1); expect(hae(r, 'E3', 'sisainen').lkm).toBe(0); expect(hae(r, 'E3', 'kayttajat').taso).toBe('virhe');
  });
  it('E4: osittainen pelaajadokumentti (ei nimeä eikä syntymävuotta) → varoitus', () => {
    const r = aja(ss, { a: { pelaajat: [{ _id: '1', joukkueNimi: 'x' }, { _id: '2', etunimi: 'E' }, { _id: '3', syntymaVuosi: 2013 }, { _id: '4', nimi: 'N' }] } }).tulos.a;
    expect(hae(r, 'E4').lkm).toBe(1); expect(hae(r, 'E4').taso).toBe('varoitus');
  });
  it('E5: kuittauksen valmentaja_uid — toisen seuran käyttäjä = virhe, ei missään = varoitus, oma = ok', () => {
    const s2 = [seuraA('a', ['A'], { kayttajat: ['ua'] }), seuraA('b', ['B'], { kayttajat: ['ub'] })];
    const r = aja(s2, { a: { seuranta_kuittaukset: [{ _id: '1', valmentaja_uid: 'ua' }, { _id: '2', valmentaja_uid: 'ub' }, { _id: '3', valmentaja_uid: 'poistettu' }, { _id: '4' }] } }).tulos.a;
    expect(hae(r, 'E5').lkm).toBe(1); expect(hae(r, 'E5').taso).toBe('virhe'); expect(hae(r, 'E5b').lkm).toBe(1); expect(hae(r, 'E5b').taso).toBe('varoitus');
  });
  it('K1: avoimia ehdotuksia/joukkue — 6 ok, 7 varoitus, 12 virhe; muut tilat eivät laske', () => {
    const k = (n) => hae(aja(ss, { a: { toimenpiteet: lista(n, (i) => ({ _id: 'e' + i, joukkue: 'A U13', tila: 'ehdotus' })).concat([{ _id: 'k', joukkue: 'A U13', tila: 'korvattu' }]) } }).tulos.a, 'K1');
    expect([k(6).taso, k(7).taso, k(11).taso, k(12).taso]).toEqual(['ok', 'varoitus', 'varoitus', 'virhe']); expect(k(6).lkm).toBe(6);
  });
  it('K1 mittaa ryhmän maksimin (eri joukkueet eivät summaudu); K2 on poistettu (VP:n avoimet ehdotukset eivät ole enää rajattuja, #1242)', () => {
    const kok = { a: { toimenpiteet: lista(6, (i) => ({ _id: 'x' + i, joukkue: 'A U13', tila: 'ehdotus' })).concat(lista(6, (i) => ({ _id: 'y' + i, joukkue: 'A U12', tila: 'ehdotus' }))) } };
    const r = aja(ss, kok).tulos.a; expect(hae(r, 'K1').lkm).toBe(6); expect(hae(r, 'K2')).toBeUndefined();
    const isoSeura = aja(ss, { a: { toimenpiteet: lista(73, (i) => ({ _id: 'z' + i, joukkue: 'A U13', tila: 'ehdotus' })) } }).tulos.a;
    expect(isoSeura.filter((x) => x.koodi === 'K2')).toEqual([]); expect(V.tmVKynnys('K2', 73, 50)).toBe('virhe');   // tuntematon koodi → virhe (ei hiljaa ok), mutta ajo ei enää tuota K2-riviä
  });
  it('K3: kasvu > 2 × edellinen kasvu JA ≥ 50 → varoitus; pienet luvut eivät hälytä', () => {
    expect(V.tmVKasvuTaso(160, 100, 90)).toBe('varoitus'); expect(V.tmVKasvuTaso(160, 100, 70)).toBe('ok');   // kasvu 60 vs 2×30
    expect(V.tmVKasvuTaso(149, 100, 100)).toBe('ok'); expect(V.tmVKasvuTaso(150, 100, 100)).toBe('varoitus'); expect(V.tmVKasvuTaso(20, 5, 5)).toBe('ok');
    expect(V.tmVKasvuTaso(100, null, null)).toBe('ok'); expect(V.tmVKasvuTaso(100, 50, null)).toBe('varoitus');
    expect(V.tmVKasvuLuvut({ toimenpiteet: [1, 2], viestit: [{ tyyppi: 'klippi_vastaus' }, { tyyppi: 'muu' }] })).toEqual({ toimenpiteet: 2, viestit_klippi: 1 });
  });
  it('M1: dokumentin koko 1 MiB:stä — 69 % ok, 70 % varoitus, 90 % virhe', () => {
    expect([V.tmVKynnys('M1', 699, 1000), V.tmVKynnys('M1', 700, 1000), V.tmVKynnys('M1', 899, 1000), V.tmVKynnys('M1', 900, 1000)]).toEqual(['ok', 'varoitus', 'varoitus', 'virhe']);
    const iso = { _id: 'iso', etunimi: 'E', teksti: 'x'.repeat(800000) };
    const r = aja(ss, { a: { pelaajat: [{ _id: 'pieni', etunimi: 'E' }, iso] } }).tulos.a; expect(hae(r, 'M1').lkm).toBeGreaterThan(800000); expect(hae(r, 'M1').taso).toBe('varoitus');
  });
  it('M2: orpo pelaajaviite (kuittaus/toimenpide/viesti viittaa pelaajaan jota ei ole seurassa)', () => {
    const r = aja(ss, { a: { pelaajat: [{ _id: 'p1', etunimi: 'E' }], seuranta_kuittaukset: [{ _id: '1', pelaajaId: 'p1' }, { _id: '2', pelaajaId: 'poissa' }], toimenpiteet: [{ _id: '3', pelaaja_id: 'poissa2' }], viestit: [{ _id: '4' }] } }).tulos.a;
    expect(hae(r, 'M2').lkm).toBe(2); expect(hae(r, 'M2').taso).toBe('varoitus');
  });
});

describe('kynnykset: rajat 6/7, 69/70/100 %', () => {
  it('H1 osuuskynnys (raja 100): 69 ok · 70 varoitus · 99 varoitus · 100 virhe · yli virhe', () => {
    expect([69, 70, 99, 100, 150].map((n) => V.tmVKynnys('H1', n, 100))).toEqual(['ok', 'varoitus', 'varoitus', 'virhe', 'virhe']);
    expect([349, 350, 499, 500].map((n) => V.tmVKynnys('H1', n, 500))).toEqual(['ok', 'varoitus', 'varoitus', 'virhe']);
  });
  it('H1 vastaa vanhaa tilaa(): OK/LÄHELLÄ/YLITTYY samoilla rajoilla', () => {
    [[0, 500], [349, 500], [350, 500], [499, 500], [500, 500], [73, 50], [34, 50], [35, 50]].forEach(([m, r]) => {
      expect({ OK: 'ok', 'LÄHELLÄ': 'varoitus', YLITTYY: 'virhe' }[V.tmVTila(m, r)]).toBe(V.tmVKynnys('H1', m, r));
    });
    expect(V.tmVTila(5, 'ERA')).toBe(null);
  });
  it('Sibbo 73/50 → virhe (hiljainen leikkaus)', () => { expect(V.tmVKynnys('H1', 73, 50)).toBe('virhe'); });
  it('tuntematon koodi ja puuttuva raja → virhe (ei hiljaa ok)', () => { expect(V.tmVKynnys('XX', 1)).toBe('virhe'); expect(V.tmVKynnys('H1', 5)).toBe('virhe'); });
  it('absoluuttiset: E1a/E2/E3/E5/E6 virhe ≥ 1; E1b/E2b/E4/E5b/E7/M2 varoitus ≥ 1; 0 → ok', () => {
    ['E1a', 'E2', 'E3', 'E5', 'E6'].forEach((k) => expect([V.tmVKynnys(k, 0), V.tmVKynnys(k, 1)]).toEqual(['ok', 'virhe']));
    ['E1b', 'E2b', 'E4', 'E5b', 'E7', 'M2'].forEach((k) => expect([V.tmVKynnys(k, 0), V.tmVKynnys(k, 1)]).toEqual(['ok', 'varoitus']));
  });
});

describe('P10, mittaritaulukko ja siirretyt apurit', () => {
  it('P10: demo, demo-fc ja qg_savu ohitetaan; muut eivät', () => {
    ['demo', 'demo-fc', 'qg_savu'].forEach((s) => expect(V.ohitetaanko(s)).toBe(true));
    ['kpv', 'sibbovargarna', 'demo2', 'qg', ''].forEach((s) => expect(V.ohitetaanko(s)).toBe(false));
  });
  it('MITTARIT: 14 deklaratiivista mittaria, ainutlaatuiset nimet, kelvolliset tyypit ja rajat', () => {
    expect(V.MITTARIT.length).toBe(14); expect(new Set(V.MITTARIT.map((m) => m.nimi)).size).toBe(14);
    V.MITTARIT.concat(V.PELAAJAMITTARIT).forEach((m) => { expect(m.raja).toBeGreaterThan(0); expect(Array.isArray(m.ehto)).toBe(true); });
    V.MITTARIT.forEach((m) => { expect(['maara', 'ryhma', 'alikokoelma_ryhma']).toContain(m.tyyppi); if (m.tyyppi === 'ryhma') expect(m.ryhmaKentta).toBeTruthy(); });
    expect(V.mittarinEhto(V.MITTARIT[0], '2026-10-12')).toEqual([['pvm', '>=', '2026-10-12']]); expect(V.mittarinNimi(V.MITTARIT[0], '2026-10-12')).toBe('kalenteri_ikkuna (pvm ≥ 2026-10-12)');
  });
  it('ryhmaYhteenveto / ikkunanAlku siirretty ennallaan', () => {
    expect(V.ryhmaYhteenveto({ a: 120, b: 80, c: 10 }, 100)).toEqual({ ryhmia: 3, suurin: 120, ylittaa: 1, lahella: 1 });
    expect(V.ikkunanAlku(Date.parse('2026-11-10T12:00:00Z'))).toBe('2026-10-12');
  });
  it('indeksi kestää "constructor"/"__proto__"-tyyppiset id:t ja nimet', () => {
    const ss = [seuraA('a', ['constructor'], { pelaajat: [{ _id: '__proto__', etunimi: 'E' }, { _id: 'constructor', etunimi: 'E' }] }), seuraA('b', ['B'])];
    expect(() => V.tmVTarkistaGlobaali(V.tmVIndeksit(ss), [], 0)).not.toThrow();
    expect(() => aja(ss, { a: { toimenpiteet: [{ _id: '1', joukkue: 'constructor' }, { _id: '2', joukkue: 'toString' }] } })).not.toThrow();
  });
});

describe('F1 kenttävahti (PR 2): ei hiljaista nollaa, kun oletettu joukkuekenttä on arvattu väärin', () => {
  const ss = [seuraA('a', ['A U13']), seuraA('b', ['B U13'])];
  const f1 = (kok, docs) => hae(aja(ss, { a: { [kok]: docs } }).tulos.a, 'F1', kok);
  it('0 %: dokumentteja on, mutta yhdelläkään ei ole oletettua kenttää → VAROITUS, joka kertoo kokoelman ja osuuden', () => {
    const r = f1('toimenpiteet', lista(10, (i) => ({ _id: 't' + i, joukkueNimi: 'B U13' })));   // oikea kenttä on "joukkueNimi", oletettu "joukkue"
    expect(r.taso).toBe('varoitus'); expect(r.kokoelma).toBe('toimenpiteet'); expect(r.osuus).toBe(0); expect(r.lkm).toBe(10); expect(r.kokonais).toBe(10); expect(r.kentat).toEqual({ joukkue: 0 });
  });
  it('MUTAATIO: sama aineisto näyttää E1a = 0 (hiljainen nolla), mutta F1 paljastaa sen; oikealla kentällä E1a löytyy ja F1 on ok', () => {
    const vaarin = aja(ss, { a: { toimenpiteet: [{ _id: '1', joukkueNimi: 'B U13' }] } }).tulos.a;
    expect(hae(vaarin, 'E1a', 'toimenpiteet').lkm).toBe(0); expect(hae(vaarin, 'F1', 'toimenpiteet').taso).toBe('varoitus');
    const oikein = aja(ss, { a: { toimenpiteet: [{ _id: '1', joukkue: 'B U13' }] } }).tulos.a;
    expect(hae(oikein, 'E1a', 'toimenpiteet').lkm).toBe(1); expect(hae(oikein, 'F1', 'toimenpiteet').taso).toBe('ok');
  });
  it('raja 50 %: 49 % varoitus · 50 % ok · 100 % ok (alle 50 %, ei "enintään")', () => {
    const osuus = (n, kaikki) => f1('toimenpiteet', lista(kaikki, (i) => (i < n ? { _id: 'x' + i, joukkue: 'A U13' } : { _id: 'x' + i })));
    expect([osuus(49, 100).taso, osuus(50, 100).taso, osuus(100, 100).taso, osuus(0, 100).taso]).toEqual(['varoitus', 'ok', 'ok', 'varoitus']);
    expect(osuus(1, 3).taso).toBe('varoitus'); expect(osuus(2, 3).taso).toBe('ok'); expect(osuus(49, 100).osuus).toBe(49); expect(osuus(1, 3).osuus).toBe(33.3);
    expect(V.tmVKynnys('F1', 49.9)).toBe('varoitus'); expect(V.tmVKynnys('F1', 50)).toBe('ok'); expect(V.KENTTAVAHTI_RAJA).toBe(50);
  });
  it('tyhjä kokoelma ei tuota riviä (ei dataa); kokoelmaa jota ei ole luettu ei tarkisteta', () => {
    expect(aja(ss, { a: { toimenpiteet: [] } }).tulos.a.filter((r) => r.koodi === 'F1')).toEqual([]);
    expect(V.tmVKenttavahti('a', 'toimenpiteet', [])).toBe(null);
    expect(aja(ss, { a: {} }).tulos.a.filter((r) => r.koodi === 'F1')).toEqual([]);
  });
  it('tyhjä merkkijono, null ja tyhjä taulukko eivät ole kenttä; kukin oletettu kenttä raportoidaan erikseen', () => {
    const r = f1('pelaajat', [{ _id: '1', etunimi: 'E', joukkue: '', joukkueNimi: null, joukkueet: [] }, { _id: '2', etunimi: 'E', joukkue: 'A U13', joukkueet: ['a_j0'] }, { _id: '3', etunimi: 'E', joukkueId: 'a_j0' }]);
    expect(r.osuus).toBe(66.7); expect(r.kentat).toEqual({ joukkue: 33.3, joukkueNimi: 0, joukkueId: 33.3, joukkueet: 33.3, joukkueetNimet: 0 }); expect(r.taso).toBe('ok');
  });
  it('jokainen VIITEKENTAT-kokoelma saa F1-rivin; F1 läpäisee raportin muotovaatimukset ja lasketaan varoitukseksi', () => {
    const R = require('../lib/tm_valvonta_raportti.js');
    const kok = {}; Object.keys(V.VIITEKENTAT).forEach((k) => { kok[k] = [{ _id: '1', muu: 'x', tyyppi: 'harjoitus' }]; }); kok.kooste_joukkue = [{ _id: 'a_j0_2026-W45' }];
    const tulokset = aja(ss, { a: kok }).tulos.a;
    expect(tulokset.filter((r) => r.koodi === 'F1').map((r) => r.kokoelma).sort()).toEqual(Object.keys(V.VIITEKENTAT).sort());
    const raportti = R.tmVRaportti({ tulokset, ajettu: 'x', tyyppi: 'viikko' });
    expect(raportti.yhteenveto.hylatty).toBe(0); expect(V.VIITEKENTAT.seuranta_kuittaukset).toBeUndefined(); expect(raportti.rivit.filter((r) => r.koodi === 'F1').length).toBe(Object.keys(V.VIITEKENTAT).length - 1);   // kooste_joukkue: joukkue = dokumentin id → aina ok (ei raporttiriviä)
    expect(R.tmVAuditRivi(raportti).severity).toBe('warn');
  });
  it('tmVJoukkuekentat: löytää joukkue-/team-nimiset kentät (vain nimet, turvallisessa muodossa), ei muita', () => {
    const docs = [{ joukkue: 'A', joukkueId: 'x', nimi: 'N', teamName: 'T' }, { joukkue: 'B', 'joukkue nimi': 'v', 'Matti joukkue': 'v' }, { joukkue: '', joukkueet: [] }];
    expect(V.tmVJoukkuekentat(docs)).toEqual({ joukkue: 66.7, joukkueId: 33.3, teamName: 33.3 });
    expect(V.tmVJoukkuekentat([])).toEqual({});
  });
});

describe('sallittujen lista (P11)', () => {
  const hyva = { seura: 'kpv', koodi: 'E1b', kokoelma: 'toimenpiteet', enimmaismaara: 5, perustelu: 'Vanhoja nimiä, joukkue nimetty uudelleen 2025', paiva: '2026-11-11' };
  it('kelvollinen rivi läpäisee; jokaisella rivillä pitää olla perustelu ja päivä', () => {
    expect(V.tmVSallitutVirheet([hyva])).toEqual([]); expect(V.tmVSallitutVirheet([])).toEqual([]);
    expect(V.tmVSallitutVirheet([Object.assign({}, hyva, { perustelu: '' })])).toEqual(['rivi 1: perustelu puuttuu']);
    expect(V.tmVSallitutVirheet([Object.assign({}, hyva, { perustelu: 'lyhyt' })]).length).toBe(1);
    expect(V.tmVSallitutVirheet([Object.assign({}, hyva, { paiva: undefined })])).toEqual(['rivi 1: paiva']);
    expect(V.tmVSallitutVirheet([Object.assign({}, hyva, { paiva: '11.11.2026' })])).toEqual(['rivi 1: paiva']);
    expect(V.tmVSallitutVirheet([Object.assign({}, hyva, { enimmaismaara: -1 })])).toEqual(['rivi 1: enimmaismaara']);
    expect(V.tmVSallitutVirheet([Object.assign({}, hyva, { enimmaismaara: '5' })])).toEqual(['rivi 1: enimmaismaara']);
    expect(V.tmVSallitutVirheet([Object.assign({}, hyva, { koodi: 'X9' })])).toEqual(['rivi 1: koodi']);
    expect(V.tmVSallitutVirheet([hyva, hyva])).toEqual(['rivi 2: kaksoiskappale']); expect(V.tmVSallitutVirheet([null])).toEqual(['rivi 1: ei olio']);
  });
  it('sovellus: enimmäismäärän sisällä → ok (sallittu), ylitys → alkuperäinen taso + ylittaaSallitun; muut rivit koskemattomia', () => {
    const t = [{ seura: 'kpv', koodi: 'E1b', kokoelma: 'toimenpiteet', lkm: 5, taso: 'varoitus' }, { seura: 'kpv', koodi: 'E1b', kokoelma: 'pelaajat', lkm: 2, taso: 'varoitus' }, { seura: 'sjk', koodi: 'E1b', kokoelma: 'toimenpiteet', lkm: 2, taso: 'varoitus' }];
    const a = V.tmVSovellaSallitut(t, [hyva]);
    expect(a[0]).toMatchObject({ taso: 'ok', sallittu: true, sallittuMax: 5 }); expect(a[1]).toEqual(t[1]); expect(a[2]).toEqual(t[2]);
    const b = V.tmVSovellaSallitut([Object.assign({}, t[0], { lkm: 6 })], [hyva]);
    expect(b[0]).toMatchObject({ taso: 'varoitus', ylittaaSallitun: true, sallittuMax: 5 });
    expect(V.tmVSovellaSallitut(t, [])).toEqual(t);
  });
  it('tmVAjaKaikki soveltaa sallitut, ohittaa demo-seurat (P10) mutta pitää ne indeksissä', () => {
    const seurat = [Object.assign(seuraA('kpv', ['K U13']), { kokoelmat: { toimenpiteet: [{ _id: '1', joukkue: 'Demo U13' }] } }), Object.assign(seuraA('demo', ['Demo U13']), { kokoelmat: { toimenpiteet: [{ _id: '2', joukkue: 'K U13' }] } })];
    const t = V.tmVAjaKaikki({ seurat, auditRivit: [], nytMs: 0 });
    expect(t.some((r) => r.seura === 'demo')).toBe(false);
    expect(t.find((r) => r.seura === 'kpv' && r.koodi === 'E1a' && r.kokoelma === 'toimenpiteet').lkm).toBe(1);   // viite demo-seuran joukkueeseen näkyy
    const s = V.tmVAjaKaikki({ seurat, auditRivit: [], nytMs: 0, sallitut: [{ seura: 'kpv', koodi: 'E1a', kokoelma: 'toimenpiteet', enimmaismaara: 1, perustelu: 'testi: tunnettu poikkeama', paiva: '2026-11-11' }] });
    expect(s.find((r) => r.seura === 'kpv' && r.koodi === 'E1a' && r.kokoelma === 'toimenpiteet')).toMatchObject({ taso: 'ok', sallittu: true });
  });
});

describe('PR 2b: baseline-korjaukset (10.11.)', () => {
  const ss = [seuraA('a', ['A U13', 'A U12']), seuraA('b', ['B U13'])];
  const r = (kok, docs, koodi, kokoelma) => hae(aja(ss, { a: { [kok]: docs } }).tulos.a, koodi, kokoelma || kok);
  it('E1a/E1b: toimenpide tila == korvattu jätetään pois; kuitattu ja hylätty lasketaan', () => {
    const docs = [{ _id: '1', joukkue: 'B U13', tila: 'korvattu' }, { _id: '2', joukkue: 'B U13', tila: 'kuitattu' }, { _id: '3', joukkue: 'B U13', tila: 'hylatty' }, { _id: '4', joukkue: 'Haamu U9', tila: 'korvattu' }, { _id: '5', joukkue: 'Haamu U9', tila: 'ehdotus' }];
    expect(r('toimenpiteet', docs, 'E1a').lkm).toBe(2); expect(r('toimenpiteet', docs, 'E1b').lkm).toBe(1); expect(r('toimenpiteet', docs, 'E1a').kokonais).toBe(5);
  });
  it('K2 poistettu: 73 avointa ehdotusta ei tuota riviä, K1 (per joukkue) säilyy', () => {
    const t = aja(ss, { a: { toimenpiteet: lista(73, (i) => ({ _id: 'p' + i, joukkue: 'A U13', tila: 'ehdotus' })) } }).tulos.a;
    expect(t.some((x) => x.koodi === 'K2')).toBe(false); expect(hae(t, 'K1').lkm).toBe(73);
  });
  it('viestit ja mentoroinnit: kenttä joukkueId (id tai nimi käy); vanha kenttä "joukkue" ei enää kelpaa viiteaiheeksi', () => {
    ['viestit', 'mentoroinnit'].forEach((k) => {
      const docs = [{ _id: '1', joukkueId: 'a_j0' }, { _id: '2', joukkueId: 'b_j0' }, { _id: '3', joukkueId: 'poistettu_j7' }, { _id: '4', joukkue: 'B U13' }];
      expect(r(k, docs, 'E1a').lkm).toBe(1); expect(r(k, docs, 'E1b').lkm).toBe(1); expect(r(k, docs, 'F1').osuus).toBe(75); expect(r(k, docs, 'F1').kentat).toEqual({ joukkueId: 75 });
    });
  });
  it('kooste_joukkue: joukkue = dokumentin id ({joukkueId}_{vvvv-Www}); joukkueId:ssä saa olla alaviivoja; F1 ok', () => {
    const docs = [{ _id: 'a_j0_2026-W45' }, { _id: 'b_j0_2026-W45' }, { _id: 'haamu_j3_2026-W45' }, { _id: 'a_j1_2026-W9' }];
    expect(r('kooste_joukkue', docs, 'E1a').lkm).toBe(1); expect(r('kooste_joukkue', docs, 'E1b').lkm).toBe(1); expect(r('kooste_joukkue', docs, 'F1').taso).toBe('ok');
  });
  it('seuranta_kuittaukset ei ole E1/F1-kokoelma (E5 kattaa)', () => {
    const t = aja(ss, { a: { seuranta_kuittaukset: [{ _id: '1', joukkue: 'B U13', valmentaja_uid: 'u1' }] } }, { a: ['u1'] }).tulos.a;
    expect(t.filter((x) => x.kokoelma === 'seuranta_kuittaukset').map((x) => x.koodi).sort()).toEqual(['E5', 'E5b']);
  });
  it('pelaajat: joukkueetNimet-taulukko on viitekenttä', () => {
    const docs = [{ _id: '1', etunimi: 'E', joukkueetNimet: ['A U13', 'B U13'] }, { _id: '2', etunimi: 'E', joukkueetNimet: ['A U12'] }, { _id: '3', etunimi: 'E', joukkueetNimet: ['Haamu'] }];
    expect(r('pelaajat', docs, 'E1a').lkm).toBe(1); expect(r('pelaajat', docs, 'E1b').lkm).toBe(1);
  });
  it('kalenteri: tunnisteet ensin; joukkue_nimi vain jos tunnisteita ei ole; "A · B" pilkotaan; seuratason tapahtuma ilman joukkuetta ei ole orpo', () => {
    const docs = [
      { _id: 'e1', tyyppi: 'harjoitus', joukkue: 'a_j0', joukkue_nimi: 'Vanhentunut nimi', joukkueet: ['a_j0'] },   // nimi vanhentunut, id oma → ok
      { _id: 'e2', tyyppi: 'ottelu', joukkue: null, joukkue_nimi: 'A U13 · A U12', joukkueet: ['a_j0', 'a_j1'] },
      { _id: 'e3', tyyppi: 'ottelu', joukkue_nimi: 'A U13 · A U12' },   // vain nimet: pilkotaan → oma
      { _id: 'e4', tyyppi: 'seuran_tauko', joukkue: null, joukkue_nimi: null, joukkueet: [] },
      { _id: 'e5', tyyppi: 'harjoitus', joukkue: 'haamu_j9', joukkueet: ['haamu_j9'] },   // oikea orpo
      { _id: 'e6', tyyppi: 'harjoitus', joukkue: 'b_j0' },   // toisen seuran
      { _id: 'e7', tyyppi: 'harjoitus', joukkue: 'A U12' }, { _id: 'e8', tyyppi: 'harjoitus', joukkue_nimi: 'Haamu · A U13' }];
    expect(r('kalenteri', docs, 'E1a').lkm).toBe(1); expect(r('kalenteri', docs, 'E1b').lkm).toBe(2);
  });
  it('kalenteri F1 lasketaan vain joukkuetapahtumista (harjoitus/ottelu, ei aamutreeni, ei ryhmä/pelaajat/henkilökunta)', () => {
    const joukkuetta = [{ _id: 't', tyyppi: 'seuran_tauko' }, { _id: 'a', tyyppi: 'harjoitus', alalaji: 'aamutreeni' }, { _id: 'r', tyyppi: 'harjoitus', kohde: { tyyppi: 'ryhma' } }, { _id: 'p', tyyppi: 'ottelu', kohde: { tyyppi: 'pelaajat' } }, { _id: 'h', tyyppi: 'harjoitus', kohde: { tyyppi: 'henkilokunta' } }, { _id: 'm', tyyppi: 'muu' }];
    expect(r('kalenteri', joukkuetta, 'F1')).toBeUndefined();   // ei populaatiota → ei riviä (ei hiljaista nollaa eikä turhaa varoitusta)
    const sekaisin = joukkuetta.concat([{ _id: 'x1', tyyppi: 'harjoitus', joukkue: 'a_j0' }, { _id: 'x2', tyyppi: 'ottelu', joukkue: 'a_j0' }, { _id: 'x3', tyyppi: 'harjoitus' }]);
    const f = r('kalenteri', sekaisin, 'F1'); expect(f.kokonais).toBe(3); expect(f.osuus).toBe(66.7); expect(f.taso).toBe('ok');
    const huono = r('kalenteri', [{ _id: 'y1', tyyppi: 'harjoitus' }, { _id: 'y2', tyyppi: 'ottelu' }, { _id: 'y3', tyyppi: 'harjoitus', joukkue: 'a_j0' }], 'F1'); expect(huono.taso).toBe('varoitus'); expect(huono.osuus).toBe(33.3);
  });
  it('tmVE6Luonne: ryhmät, testipelaajat (§10), arkistoidut, testiarvo, samanniminen — ei nimiä tai tunnisteita tuloksessa', () => {
    const seurat = [{ sid: 'k', kokoelmat: { pelaajat: [{ _id: 'p1', etunimi: 'Toppari', sukunimi: 'Testi', tunniste: '12345678' }, { _id: 'p2', etunimi: 'Maija', sukunimi: 'M', tunniste: '99999991' }, { _id: 'p3', etunimi: 'Maija', sukunimi: 'M', tunniste: '55550001', arkistoitu: true }] } },
      { sid: 's', kokoelmat: { pelaajat: [{ _id: 'q1', etunimi: 'Testi', sukunimi: 'Pelaaja', tunniste: '12345678' }, { _id: 'q2', etunimi: 'Maija', sukunimi: 'M', tunniste: '55550001' }, { _id: 'q3', etunimi: 'Yksin', sukunimi: 'Y', tunniste: '77' }] } }];
    const g = V.tmVE6Luonne(seurat, ['Toppari Testi', 'Testi Pelaaja'], []);
    expect(g.length).toBe(2);
    const testi = g.find((x) => x.testiarvo); expect(testi).toMatchObject({ koko: 2, seurat: { k: 1, s: 1 }, sisaSeura: false, testipelaajia: 2, arkistoituja: 0, muoto: 'numeerinen_8', samaNimi: false });
    const siirto = g.find((x) => !x.testiarvo); expect(siirto).toMatchObject({ koko: 2, testipelaajia: 0, arkistoituja: 1, samaNimi: true });
    const json = JSON.stringify(g); ['12345678', '55550001', 'Maija', 'Toppari', 'p1', 'q2'].forEach((a) => expect(json).not.toContain(a));
    expect(V.tmVE6Luonne([{ sid: 'k', kokoelmat: { pelaajat: [{ _id: 'a', tunniste: '5' }, { _id: 'b', tunniste: '5' }] } }], [], [])[0]).toMatchObject({ sisaSeura: true, koko: 2 });
    expect(V.tmVE6Luonne([{ sid: 'k', kokoelmat: { pelaajat: [{ _id: 'a', tunniste: '5' }] } }, { sid: 's', kokoelmat: { pelaajat: [{ _id: 'a', tunniste: '5' }] } }], [], [])).toEqual([]);   // sama pelaajadokumentti-id = E2, ei E6
    expect(V.tmVE6Luonne([{ sid: 'k', kokoelmat: { pelaajat: [{ _id: 'm93GBdOaGCUuenMiCL0I', tunniste: '5', etunimi: 'X' }, { _id: 'z', tunniste: '5' }] } }], [], ['m93GBdOaGCUuenMiCL0I'])[0].testipelaajia).toBe(1);
  });
  it('tmVOrpojenLuonne: kirjoitusasu / osittainen / avainsana / id_muotoinen / muu — vain lukumäärät', () => {
    const joukkueet = [{ id: 'a_j0', nimi: 'A U13 Sininen' }];
    const docs = [{ _id: '1', joukkue: 'a u13  sininen!' }, { _id: '2', joukkue: 'A U13' }, { _id: '3', joukkue: 'Koko seura' }, { _id: '4', joukkue: 'vanha_joukkue_7' }, { _id: '5', joukkue: 'Eri Seura FC' }, { _id: '6', joukkue: 'A U13 Sininen' }];
    const o = V.tmVOrpojenLuonne('a', 'toimenpiteet', docs, joukkueet);
    expect(o).toEqual({ seura: 'a', kokoelma: 'toimenpiteet', orpoja: 5, luokat: { kirjoitusasu: 1, osittainen: 1, avainsana: 1, id_muotoinen: 1, muu: 1 } });
    expect(JSON.stringify(o)).not.toMatch(/Sininen|Koko|vanha/);
  });
});

describe('PR 2c: E1c (kirjoitusasu), aliaslista, K1-normalisointi', () => {
  const ss = [seuraA('a', ['A U13 Sininen', 'A U12']), seuraA('b', ['B U13'])];
  const aja2 = (kok, extra) => { const I = V.tmVIndeksit(ss.map((s) => ({ sid: s.sid, joukkueet: s.joukkueet, pelaajat: [], kayttajat: [] }))); return V.tmVTarkistaSeura(Object.assign({ sid: 'a', joukkueet: ss[0].joukkueet, kokoelmat: kok, kayttajat: new Set(), indeksit: I }, extra || {})); };
  const rr = (t, koodi, kok) => t.find((x) => x.koodi === koodi && x.kokoelma === kok);
  it('kirjoitusasu (sama joukkue eri tavalla kirjoitettuna) on E1c WARN, ei E1b ERROR — vaikka osuus olisi yli 10 %', () => {
    const docs = lista(20, (i) => ({ _id: 'k' + i, tyyppi: 'harjoitus', joukkue: i < 15 ? 'a u13-sininen!' : 'A U12' }));
    const t = aja2({ kalenteri: docs });
    expect(rr(t, 'E1c', 'kalenteri')).toMatchObject({ lkm: 15, taso: 'varoitus' }); expect(rr(t, 'E1b', 'kalenteri')).toMatchObject({ lkm: 0, taso: 'ok' });
  });
  it('oikea orpo pysyy E1b:nä; dokumentti jossa sekä kirjoitusasu että oikea orpo → E1b; toisen seuran viite → E1a', () => {
    const t = aja2({ toimenpiteet: [{ _id: '1', joukkue: 'Haamu FC' }, { _id: '2', joukkue: 'a u13 sininen!' }, { _id: '3', joukkue: 'B U13' }] });
    expect(rr(t, 'E1b', 'toimenpiteet').lkm).toBe(1); expect(rr(t, 'E1c', 'toimenpiteet').lkm).toBe(1); expect(rr(t, 'E1a', 'toimenpiteet').lkm).toBe(1);
  });
  it('aliaslista: aliaksella löytyvä viite on OK (E1b/E1c nollaan); alias ei vaikuta, jos kohdejoukkuetta ei ole seurassa; toisen seuran alias ei vaikuta', () => {
    const rivi = { seura: 'a', alias: 'A U13 vanha', joukkue: 'a_j0', perustelu: 'joukkue nimettiin uudelleen 2025', paiva: '2026-11-11' };
    const docs = [{ _id: '1', tyyppi: 'harjoitus', joukkue: 'A U13 vanha' }, { _id: '2', tyyppi: 'harjoitus', joukkue: 'A U13 vanha!' }];
    const ilman = aja2({ kalenteri: docs }); expect(rr(ilman, 'E1b', 'kalenteri').lkm + rr(ilman, 'E1c', 'kalenteri').lkm).toBe(2);
    const kanssa = aja2({ kalenteri: docs }, { aliasRivit: [rivi] });     expect(rr(kanssa, 'E1b', 'kalenteri').lkm).toBe(1);   // 2. ('A U13 vanha!') ei täsmää aliakseen → pysyy orpona
    expect(rr(aja2({ kalenteri: docs }, { aliasRivit: [Object.assign({}, rivi, { joukkue: 'poistettu_j9' })] }), 'E1b', 'kalenteri').lkm).toBe(2);
    expect(rr(aja2({ kalenteri: docs }, { aliasRivit: [Object.assign({}, rivi, { seura: 'b' })] }), 'E1b', 'kalenteri').lkm).toBe(2);
  });
  it('tmVAliasVirheet: validointi', () => {
    const h = { seura: 'a', alias: 'X', joukkue: 'a_j0', perustelu: 'perusteltu hyvin', paiva: '2026-11-11' };
    expect(V.tmVAliasVirheet([h])).toEqual([]);
    expect(V.tmVAliasVirheet([Object.assign({}, h, { alias: '' })])).toEqual(['rivi 1: alias']); expect(V.tmVAliasVirheet([Object.assign({}, h, { alias: 'mikko@x.fi' })])).toEqual(['rivi 1: alias']);
    expect(V.tmVAliasVirheet([Object.assign({}, h, { joukkue: '' })])).toEqual(['rivi 1: joukkue']); expect(V.tmVAliasVirheet([Object.assign({}, h, { perustelu: 'lyhyt' })])).toEqual(['rivi 1: perustelu puuttuu']);
    expect(V.tmVAliasVirheet([h, Object.assign({}, h, { alias: ' x ' })])).toEqual(['rivi 2: kaksoiskappale']);
  });
  it('K1: joukkueen id ja nimi (sekä kirjoitusasu) ovat sama ryhmä; vieraat nimet normalisoidaan (kirjainkoko, välimerkit)', () => {
    const avoin = (i, j) => ({ _id: 'e' + i, tila: 'ehdotus', joukkue: j });
    const docs = [].concat(lista(3, (i) => avoin(i, 'a_j0')), lista(3, (i) => avoin(10 + i, 'A U13 Sininen')), lista(2, (i) => avoin(20 + i, 'a u13-sininen')), lista(4, (i) => avoin(30 + i, i % 2 ? 'Haamu-FC' : 'HAAMU FC')));
    const t = aja2({ toimenpiteet: docs }); expect(rr(t, 'K1', 'toimenpiteet').lkm).toBe(8); expect(rr(t, 'K1', 'toimenpiteet').taso).toBe('varoitus');   // 3+3+2 samaa joukkuetta
  });
  it('tmVE6Jasenet (sisäinen): palauttaa vain ryhmät joissa ≥ 2 eri pelaajadokumenttia', () => {
    const g = V.tmVE6Jasenet([{ sid: 'k', kokoelmat: { pelaajat: [{ _id: 'a', etunimi: 'M', sukunimi: 'M', tunniste: '5' }, { _id: 'b', etunimi: 'M', sukunimi: 'M', tunniste: '5' }, { _id: 'c', tunniste: '6' }] } }]);
    expect(g.length).toBe(1); expect(g[0].jasenet.map((m) => m.pid)).toEqual(['a', 'b']);
  });
});
