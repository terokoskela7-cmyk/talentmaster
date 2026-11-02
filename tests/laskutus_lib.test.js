/* Laskutus L1a — lib/tm_laskutus.js (briiffi §1–§2, §8 + PM:n vaihe 0 -päätökset 2.11.2026). Puhdas laskenta, sentit kokonaislukuina. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const L = require('../lib/tm_laskutus.js'), SUOST = require('../functions/suostumus.js');

const AS = (o) => { const r = L.tmLaskutusAsetukset(null, Object.assign({ laskutettava: true, sopimus_alkaen: '2026-11' }, o)); if (!r.ok) throw new Error(r.virhe); return r.asetukset; };
const valm = (jid, o) => Object.assign({ rooli: 'valmentaja', email: 'v@x.fi', aktiivinen: true, joukkueet: [jid] }, o);
let _n = 0;
const pel = (jid, o) => Object.assign({ id: 'p' + (++_n), syntymaVuosi: 2012, suostumusTila: 'annettu', joukkueet: [jid] }, o);
const pelaajia = (jid, n, o) => Array.from({ length: n }, () => pel(jid, o));
const aktiivinen = (id, o) => Object.assign({ id, nimi: id.toUpperCase(), laskutustila: 'aktiivinen' }, o);
const laske = (o) => L.tmLaskutusLaske(Object.assign({ kk: '2026-11', seuraId: 's', asetukset: AS() }, o));
const rivi = (t, id) => t.joukkueet.find((r) => r.id === id);

describe('hinnoittelu (sopimus Sibbo 1.11.2026)', () => {
  it('sopimuksen esimerkki: joukkueet 30 + 20, kaikilla suostumus, kaikki ≥ 10 v → 80 + 25 + 20 = 125 €', () => {
    const t = laske({ joukkueet: [aktiivinen('a'), aktiivinen('b')], kayttajat: [valm('a'), valm('b')], pelaajat: [...pelaajia('a', 30), ...pelaajia('b', 20)] });
    expect(t).toMatchObject({ laskutettava: true, seuralisenssi_snt: 8000, pelaajamaksut_snt: 4500, yhteensa_snt: 12500, alv_prosentti: 0 });
    expect(rivi(t, 'a')).toMatchObject({ maksulliset: 30, summa_snt: 2500, katto_kaytossa: true }); expect(rivi(t, 'b')).toMatchObject({ maksulliset: 20, summa_snt: 2000, katto_kaytossa: false });
  });
  it('katto: 0 / 24 / 25 / 26 pelaajaa → 0 / 24 / 25 / 25 €', () => {
    for (const [n, snt, katto] of [[0, 0, false], [24, 2400, false], [25, 2500, false], [26, 2500, true]]) {
      const r = rivi(laske({ joukkueet: [aktiivinen('a')], kayttajat: [valm('a')], pelaajat: pelaajia('a', n) }), 'a'); expect(r.summa_snt, String(n)).toBe(snt); expect(r.katto_kaytossa, String(n)).toBe(katto);
    }
  });
  it('seurakohtainen ohitus (hinta, katto, lisenssi) ja oletuksen arvot', () => {
    expect(L.OLETUS).toMatchObject({ seuralisenssi_snt: 8000, hinta_pelaaja_snt: 100, joukkuekatto_snt: 2500, laskentaperuste: 'suostumus', maksuton_alle_ika: 10, alv_prosentti: 0, laskutettava: false });
    const a = L.tmLaskutusAsetukset({ hinta_pelaaja_snt: 100 }, { laskutettava: true, sopimus_alkaen: '2026-11', hinta_pelaaja_snt: 250, joukkuekatto_snt: 999999, seuralisenssi_snt: 15000, tuntematon: 1 });
    expect(a.ok).toBe(true); expect(a.asetukset).not.toHaveProperty('tuntematon');
    const t = L.tmLaskutusLaske({ kk: '2026-11', seuraId: 's', asetukset: a.asetukset, joukkueet: [aktiivinen('a')], kayttajat: [valm('a')], pelaajat: pelaajia('a', 30) });
    expect(t).toMatchObject({ seuralisenssi_snt: 15000, pelaajamaksut_snt: 7500, yhteensa_snt: 22500 });
  });
  it('virheelliset asetukset → virhe, ei hiljaista oletusta', () => {
    expect(L.tmLaskutusAsetukset(null, { hinta_pelaaja_snt: 1.5 }).virhe).toMatch(/hinta_pelaaja_snt/);
    expect(L.tmLaskutusAsetukset(null, { laskentaperuste: 'kaikki' }).virhe).toMatch(/tuntematon laskentaperuste/);
    expect(L.tmLaskutusAsetukset(null, { lista_alkaen_kk_aktivoinnista: 2 }).virhe).toMatch(/vaatii laskentaperuste 'lista'/);
    expect(L.tmLaskutusAsetukset(null, { laskentaperuste: 'lista', lista_alkaen_kk_aktivoinnista: 0 }).virhe).toMatch(/positiivinen/);
    expect(L.tmLaskutusAsetukset(null, { laskutettava: true }).virhe).toMatch(/sopimus_alkaen/);
    expect(L.tmLaskutusAsetukset(null, { laskutettava: 'kyllä' }).virhe).toMatch(/true\/false/);
    expect(L.tmLaskutusAsetukset(null, {}).ok).toBe(true);
  });
});
describe('sopimusseura ja seuralisenssi (PM 2.11.)', () => {
  it('laskutettava:false (pilottiseura) → ei laskua, mutta rivit näkyvät', () => {
    const a = L.tmLaskutusAsetukset(null, {}).asetukset, t = L.tmLaskutusLaske({ kk: '2026-11', seuraId: 'kpv', asetukset: a, joukkueet: [aktiivinen('a')], kayttajat: [valm('a')], pelaajat: pelaajia('a', 5) });
    expect(t).toMatchObject({ laskutettava: false, yhteensa_snt: 0, seuralisenssi_snt: 0 }); expect(rivi(t, 'a').maksulliset).toBe(5);
  });
  it('ennen sopimuksen alkua → ei laskua; sopimuksen alusta lisenssi joka kuukausi, myös ilman aktiivisia joukkueita', () => {
    expect(laske({ kk: '2026-10', joukkueet: [], pelaajat: [] }).yhteensa_snt).toBe(0);
    expect(laske({ kk: '2026-11', joukkueet: [], pelaajat: [] })).toMatchObject({ laskutettava: true, yhteensa_snt: 8000 });
    expect(laske({ kk: '2027-03', joukkueet: [{ id: 'a' }], pelaajat: pelaajia('a', 10) }).yhteensa_snt).toBe(8000);   // passiivinen joukkue → vain lisenssi
  });
});
describe('ikä (syntymävuoden mukaan, laskentakuukauden vuosi)', () => {
  it('9 v → 0 €; täyttää 10 tänä vuonna → maksullinen; vuosi puuttuu → maksullinen + merkintä; varalla syntymaaika', () => {
    const p = [pel('a', { syntymaVuosi: 2017 }), pel('a', { syntymaVuosi: 2016 }), pel('a', { syntymaVuosi: undefined, id: 'eivuotta' }), pel('a', { syntymaVuosi: undefined, syntymaaika: '2018-05-01' }), pel('a', { syntymaVuosi: '2014' })];
    const t = laske({ joukkueet: [aktiivinen('a')], kayttajat: [valm('a')], pelaajat: p });
    expect(rivi(t, 'a')).toMatchObject({ alle_ika: 2, ika_puuttuu: 1, maksulliset: 3, summa_snt: 300 }); expect(t.pelaajat.ika_puuttuu_idt).toEqual(['eivuotta']);
    expect(L.tmLaskutusIka({ syntymaaika: { toDate: () => new Date('2016-06-01T12:00:00Z') } }, 2026)).toBe(10); expect(L.tmLaskutusIka({ syntymaaika: { seconds: Date.parse('2017-01-01T00:00:00Z') / 1000 } }, 2026)).toBe(9);
  });
  it('vuosi otetaan laskentakuukaudesta: 2017 syntynyt on 0 € joulukuussa 2026, maksullinen tammikuussa 2027', () => {
    const p = [pel('a', { syntymaVuosi: 2017 })], o = { joukkueet: [aktiivinen('a')], kayttajat: [valm('a')], pelaajat: p };
    expect(rivi(laske(Object.assign({ kk: '2026-12' }, o)), 'a').maksulliset).toBe(0); expect(rivi(laske(Object.assign({ kk: '2027-01' }, o)), 'a').maksulliset).toBe(1);
  });
});
describe('suostumus (kanoninen ehto)', () => {
  it('sama ehto kuin functions/suostumus.js', () => {
    for (const p of [{}, { suostumusTila: 'annettu' }, { suostumusTila: 'pilotti' }, { suostumusTila: 'odottaa' }, { suostumusTila: 'luotu' }, { suostumus: { annettu: { seconds: 1 } } }, { suostumusTila: 'odottaa', suostumus: { annettu: null } }, null])
      expect(L.tmLaskutusSuostumus(p), JSON.stringify(p)).toBe(SUOST.suostumusAnnettu(p));
  });
  it("peruste 'suostumus': suostumukseton aktiivisessa joukkueessa → ei laskuteta, näkyy erikseen; molemmat luvut aina", () => {
    const t = laske({ joukkueet: [aktiivinen('a')], kayttajat: [valm('a')], pelaajat: [...pelaajia('a', 3), ...pelaajia('a', 2, { suostumusTila: 'pilotti' }), pel('a', { suostumusTila: undefined, suostumus: { annettu: 1 } })] });
    expect(rivi(t, 'a')).toMatchObject({ peruste: 'suostumus', maksulliset_suostumus: 4, maksulliset_lista: 6, ilman_suostumusta: 2, maksulliset: 4, summa_snt: 400 });
  });
});
describe('laskentaperuste lista + välimalli', () => {
  const p = () => [...pelaajia('a', 3), ...pelaajia('a', 2, { suostumusTila: 'odottaa' })];
  it("peruste 'lista': suostumukseton laskutetaan; katto ja ikäsäännöt samat", () => {
    const t = laske({ asetukset: AS({ laskentaperuste: 'lista' }), joukkueet: [aktiivinen('a')], kayttajat: [valm('a')], pelaajat: [...p(), pel('a', { syntymaVuosi: 2018, suostumusTila: 'odottaa' }), ...pelaajia('a', 30, { suostumusTila: 'pilotti' })] });
    expect(rivi(t, 'a')).toMatchObject({ peruste: 'lista', maksulliset: 35, alle_ika: 1, summa_snt: 2500, katto_kaytossa: true });
  });
  it('välimalli n = 2: kk 1 ja 2 aktivoinnista suostumus, kk 3 lista; aktivointi kuun viimeisenä päivänä = kuukausi 1', () => {
    const as = AS({ laskentaperuste: 'lista', lista_alkaen_kk_aktivoinnista: 2 }), j = aktiivinen('a', { laskutus_aktivoitu: { pvm: '2026-11-30', uid: 'sa' } });
    const kk = (k) => rivi(laske({ kk: k, asetukset: as, joukkueet: [j], kayttajat: [valm('a')], pelaajat: p() }), 'a');
    expect(kk('2026-11')).toMatchObject({ peruste: 'suostumus', kk_aktivoinnista: 1, maksulliset: 3 }); expect(kk('2026-12')).toMatchObject({ peruste: 'suostumus', kk_aktivoinnista: 2 });
    expect(kk('2027-01')).toMatchObject({ peruste: 'lista', kk_aktivoinnista: 3, maksulliset: 5, summa_snt: 500 });
    expect(L.tmLaskutusPeruste(as, { laskutus_aktivoitu: { pvm: { toDate: () => new Date('2026-11-30T23:30:00Z') } } }, '2026-12').kk_aktivoinnista).toBe(1);   // Helsingissä jo 1.12.
  });
  it('välimalli: puuttuva aktivointipäivä → suostumus + varoitus SA:lle', () => {
    const t = laske({ asetukset: AS({ laskentaperuste: 'lista', lista_alkaen_kk_aktivoinnista: 2 }), joukkueet: [aktiivinen('a')], kayttajat: [valm('a')], pelaajat: p() });
    expect(rivi(t, 'a')).toMatchObject({ peruste: 'suostumus', maksulliset: 3, varoitukset: ['aktivointi_puuttuu'] }); expect(t.varoitukset.aktivointi_puuttuu).toEqual(['a']);
  });
  it("tulos tallentaa käytetyn perusteen joukkueittain ja asetukset (hinnat)", () => {
    const t = laske({ asetukset: AS({ laskentaperuste: 'lista' }), joukkueet: [aktiivinen('a'), { id: 'b' }], kayttajat: [valm('a')], pelaajat: p() });
    expect(t.hinnat).toEqual({ seuralisenssi_snt: 8000, hinta_pelaaja_snt: 100, joukkuekatto_snt: 2500, maksuton_alle_ika: 10, laskentaperuste: 'lista', lista_alkaen_kk_aktivoinnista: null, alv_prosentti: 0 });
    expect(rivi(t, 'a').peruste).toBe('lista'); expect(rivi(t, 'b')).toMatchObject({ laskutustila: 'passiivinen', peruste: null, summa_snt: 0 });
  });
});
describe('joukkue ja valmentaja', () => {
  it('passiivinen (myös puuttuva tila) → ei lasketa; aktiivinen ilman valmentajaa → 0 € + varoitus', () => {
    const t = laske({ joukkueet: [{ id: 'p1', laskutustila: 'passiivinen' }, { id: 'p2' }, aktiivinen('a')], kayttajat: [], pelaajat: [...pelaajia('p1', 5), ...pelaajia('p2', 5), ...pelaajia('a', 5)] });
    expect(t.pelaajamaksut_snt).toBe(0); expect(rivi(t, 'a')).toMatchObject({ maksulliset: 5, summa_snt: 0, vastuuvalmentaja: false, varoitukset: ['ei_valmentajaa'] });
    expect(t.varoitukset.ilman_valmentajaa).toEqual(['a']); expect(t.pelaajat.ilman_aktiivista_joukkuetta).toBe(10);
  });
  it('SA:n ohitus laskutus_vastuuvalmentaja_ok: joukkue ilman valmentajaa laskutetaan, ei varoitusta; vain true kelpaa', () => {
    const t = laske({ joukkueet: [aktiivinen('bl', { laskutus_vastuuvalmentaja_ok: true }), aktiivinen('x', { laskutus_vastuuvalmentaja_ok: 'true' })], kayttajat: [], pelaajat: [...pelaajia('bl', 15), ...pelaajia('x', 3)] });
    expect(rivi(t, 'bl')).toMatchObject({ vastuuvalmentaja: true, vastuuvalmentaja_sa: true, valmentajia: 0, summa_snt: 1500, varoitukset: [] });
    expect(rivi(t, 'x')).toMatchObject({ vastuuvalmentaja: false, summa_snt: 0 }); expect(t.varoitukset.ilman_valmentajaa).toEqual(['x']);
    expect(L.tmLaskutusCsv([t], {}).split('\n').find((r) => r.includes(';BL;'))).toContain(';aktiivinen;kyllä (SA);');
    const t2 = laske({ joukkueet: [aktiivinen('bl', { laskutus_vastuuvalmentaja_ok: true })], kayttajat: [valm('bl')], pelaajat: [] });
    expect(rivi(t2, 'bl')).toMatchObject({ vastuuvalmentaja: true, vastuuvalmentaja_sa: false });
  });
  it('valmentaja: vain rooli valmentaja, aktiivinen, ei demo, ei haamu; nimimerkintä kanonisoidaan; kuollut id ohitetaan', () => {
    const docs = [{ id: 'a', nimi: 'P13 Blå' }, { id: 'b', nimi: 'P12' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];
    const v = L.tmLaskutusValmentajat([valm('a'), valm('a'), valm('P12'), valm('c', { aktiivinen: false }), valm('d', { demo: true }), valm('e', { email: '', etunimi: '', sukunimi: '' }),
      valm('c', { rooli: 'talenttivalmentaja' }), valm('d', { rooli: 'vp' }), valm('e', { rooli: 'fysiikkavalmentaja' }), valm('poistettu')], docs);
    expect(v).toEqual({ a: 2, b: 1, c: 0, d: 0, e: 0 });
  });
  it('ryhmät eivät ole joukkueita (lib ei lue ryhmat-kokoelmaa); demo-joukkue ohitetaan', () => {
    const t = laske({ joukkueet: [aktiivinen('a'), aktiivinen('demo1', { demo: true })], kayttajat: [valm('a'), valm('demo1')], pelaajat: [...pelaajia('a', 2), ...pelaajia('demo1', 2)] });
    expect(t.joukkueet.map((r) => r.id)).toEqual(['a']); expect(t.pelaajamaksut_snt).toBe(200);
  });
});
describe('pääjoukkue ja kerran laskeminen (PM 2.11.)', () => {
  const docs = [aktiivinen('a', { nimi: 'A' }), aktiivinen('b', { nimi: 'B' }), { id: 'c', nimi: 'C' }];
  it('kahdessa aktiivisessa → vain pääjoukkueessa (näyttönimen joukkue), ei joukkueet[0]:ssa', () => {
    const t = laske({ joukkueet: docs, kayttajat: [valm('a'), valm('b')], pelaajat: [pel('a', { joukkueet: ['a', 'b'], joukkue: 'B' })] });
    expect(rivi(t, 'a').pelaajia).toBe(0); expect(rivi(t, 'b').pelaajia).toBe(1); expect(t.pelaajat.laskussa).toBe(1);
  });
  it('näyttönimi ei jäsenyyksissä → jäsenyyksien järjestys; pääjoukkue passiivinen → ensimmäinen aktiivinen (ei jätetä laskuttamatta)', () => {
    expect(rivi(laske({ joukkueet: docs, kayttajat: [valm('a'), valm('b')], pelaajat: [pel('a', { joukkueet: ['b', 'a'], joukkue: 'C' })] }), 'b').pelaajia).toBe(1);
    const t = laske({ joukkueet: docs, kayttajat: [valm('a'), valm('b')], pelaajat: [pel('c', { joukkueet: ['c', 'b'], joukkue: 'C' })] });
    expect(rivi(t, 'b')).toMatchObject({ pelaajia: 1, siirretty_muualta: 1, summa_snt: 100 }); expect(rivi(t, 'c').pelaajia).toBe(0);
    expect(L.tmLaskutusJoukkue({ joukkueet: ['c'] }, docs, (id) => id !== 'c')).toEqual({ joukkueId: null, paajoukkue: 'c', siirretty: false });
  });
  it('arkistoitu, demo, poistettu ja aktiivinen:false pois; legacy-pelaaja pelkällä joukkue-nimellä mukana', () => {
    const t = laske({ joukkueet: docs, kayttajat: [valm('a')], pelaajat: [pel('a', { isDemoUser: true }), pel('a', { tila: 'arkistoitu' }), pel('a', { arkistoitu: true }), pel('a', { aktiivinen: false }), pel('a', { poistettu: true }), pel(null, { joukkueet: undefined, joukkue: 'A' })] });
    expect(t.pelaajat).toMatchObject({ yhteensa: 6, poissa: 5, laskussa: 1 }); expect(rivi(t, 'a').maksulliset).toBe(1);
  });
});
describe('apurit ja CSV', () => {
  it('kuukaudet: indeksi, Helsingin aika, virheellinen kk heittää', () => {
    expect(L.tmLaskutusKkIndeksi('2026-12') + 1).toBe(L.tmLaskutusKkIndeksi('2027-01')); expect(L.tmLaskutusKkIndeksi('2026-13')).toBeNull();
    expect(L.tmLaskutusKk(new Date('2026-11-30T22:30:00Z'))).toBe('2026-12'); expect(L.tmLaskutusKk('2026-11-05')).toBe('2026-11'); expect(L.tmLaskutusKk('2026-11-30T22:30:00.000Z')).toBe('2026-12'); expect(L.tmLaskutusKk('x')).toBeNull();
    expect(() => laske({ kk: '11/2026', joukkueet: [], pelaajat: [] })).toThrow(/YYYY-MM/);
  });
  it('CSV: ; erotin, desimaalipilkku, joukkue + lisenssi + yhteensä; lainausmerkit escapetaan', () => {
    const t = laske({ joukkueet: [aktiivinen('a', { nimi: 'P13; "Blå"' })], kayttajat: [valm('a')], pelaajat: pelaajia('a', 30) });
    const c = L.tmLaskutusCsv([t], { s: 'Sibbo-Vargarna' }).trim().split('\n');
    expect(c[0]).toBe('kuukausi;seura;joukkue;tila;vastuuvalmentaja;peruste;maksulliset;suostumukselliset;koko_lista;alle_10v;ika_puuttuu;ilman_suostumusta;katto;summa_eur;alv_pct');
    expect(c[1]).toBe('2026-11;Sibbo-Vargarna;"P13; ""Blå""";aktiivinen;kyllä;suostumus;30;30;30;0;0;0;kyllä;25,00;0');
    expect(c[2]).toBe('2026-11;Sibbo-Vargarna;SEURALISENSSI;;;;;;;;;;;80,00;0'); expect(c[3]).toBe('2026-11;Sibbo-Vargarna;YHTEENSÄ;;;;;;;;;;;105,00;0');
  });
});
