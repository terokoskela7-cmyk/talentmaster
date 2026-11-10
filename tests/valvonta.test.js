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
  it('K1 mittaa ryhmän maksimin (eri joukkueet eivät summaudu); K2 seuran kokonaismäärä vs. raja 50', () => {
    const kok = { a: { toimenpiteet: lista(6, (i) => ({ _id: 'x' + i, joukkue: 'A U13', tila: 'ehdotus' })).concat(lista(6, (i) => ({ _id: 'y' + i, joukkue: 'A U12', tila: 'ehdotus' }))) } };
    const r = aja(ss, kok).tulos.a; expect(hae(r, 'K1').lkm).toBe(6); expect(hae(r, 'K2').lkm).toBe(12); expect(hae(r, 'K2').raja).toBe(50);
    const k2 = (n) => hae(aja(ss, { a: { toimenpiteet: lista(n, (i) => ({ _id: 'z' + i, joukkue: 'J' + (i % 9), tila: 'ehdotus' })) } }).tulos.a, 'K2').taso;
    expect([k2(34), k2(35), k2(49), k2(50)]).toEqual(['ok', 'varoitus', 'varoitus', 'virhe']);
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
