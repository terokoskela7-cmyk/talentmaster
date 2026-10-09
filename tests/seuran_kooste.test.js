/**
 * Seuran pulssi S1 (docs/CODE_BRIEF_S1_SEURAN_PULSSI.md; design 17, D40–D45) — lib/tm_seuran_kooste.js fixtuureilla + tm_ikavaihe + tmJoukkuejaksoVoimassa.
 * Viikko W41/2026: ma 5.10. – su 11.10. (Helsinki, kesäaika); tila arvioidaan su 11.10. klo 21:00 = 18:00Z. Fixtuurien nimet keksittyjä; koosteessa EI nimiä/ID:itä.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import vm from 'vm';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const K = require('../lib/tm_seuran_kooste.js');
const IV = require('../lib/tm_ikavaihe.js');
const AJ = require('../lib/tm_aloita_jakso.js');
const JJ = require('../lib/tm_joukkuejakso.js');
const DAY = 86400000;
const ALKU = Date.UTC(2026, 9, 4, 21, 0), LOPPU = Date.UTC(2026, 9, 11, 21, 0), ARVIO = Date.UTC(2026, 9, 11, 18, 0);   // ma 00:00 / seur. ma 00:00 / su 21:00 Helsinki
const AIKA = { alkuMs: ALKU, loppuMs: LOPPU, arvioMs: ARVIO, nytMs: ARVIO, vuosi: 2026 };
const iso = (ms) => new Date(ms).toISOString();
const jakso = (alkoiMs, o) => Object.assign({ konsepti_avain: 'k1', konsepti_nimi: 'Kärki', alkoi: iso(alkoiMs), kesto_vk: 4 }, o || {});
const J13 = { id: 'u13', nimi: 'KPV U13', jaksofokus: { osa_alueet: { tekninen_taktinen: { nimi: 'Pelaaminen' } }, alku: '2026-10-01', kesto_vk: 4 } };
const J11 = { id: 'p11', nimi: 'KPV P11' };
const pel = (id, o) => Object.assign({ id, joukkue: 'KPV U13', joukkueet: [], syntymaVuosi: 2013 }, o || {});
const laske = (joukkueet, pelaajat, ulk, meta) => { const a = K.tmKoosteAnalysoi({ joukkueet, pelaajat, aika: AIKA }); return { a, doc: K.tmKoosteTulos(a, ulk || {}, Object.assign({ vk: '2026-W41' }, meta || {})) }; };

describe('tilat → luvut (sama tmJaksoTila kuin työpöydällä)', () => {
  const P = [
    pel('a', { jaksofokus: jakso(ARVIO - 10 * DAY) }),                                        // käynnissä
    pel('b', { jaksofokus: jakso(ARVIO - 2 * DAY) }),                                         // vahvistettu (vk 1, ei sitoumusta)
    pel('c', { jaksofokus: { tila: 'valittavana' } }),                                        // valinta odottaa
    pel('d', { jaksofokus: { tila: 'valittavana' }, ydinvahvuus_valinta: { vaihtoehto: 'x' } }),   // valinta tehty
    pel('e', { jaksofokus: jakso(ARVIO - 40 * DAY) }),                                        // päättynyt (suljettava) — ikkuna ei vielä umpeutunut
    pel('f'),                                                                                 // ei jaksoa
  ];
  const { doc, a } = laske([J13], P);
  const u = doc.joukkueet.u13;
  it('n_pelaajat · n_jaksolla (kaikki paitsi ei_jaksoa) · alatilat osajoukkoja', () => {
    expect(u.n_pelaajat).toBe(6); expect(u.n_jaksolla).toBe(5); expect(u.n_valinta_odottaa).toBe(2); expect(u.n_katselmus).toBe(1);
    expect(u.n_valinta_odottaa + u.n_katselmus).toBeLessThanOrEqual(u.n_jaksolla);
  });
  it('vastausperusta = vain käynnissä + vahvistettu (a, b); ehdokkaat haettavaksi = samat', () => { expect(u.n_vastausperusta).toBe(2); expect(a.ehdokkaat.sort()).toEqual(['a', 'b']); });
  it('tila tulee TÄSMÄLLEEN tmJaksoTilasta (ei omaa kopiota säännöstä)', () => {
    const tilat = P.map((p) => AJ.tmJaksoTila(p, { nyt: ARVIO }).tila);
    expect(tilat).toEqual(['kaynnissa', 'vahvistettu', 'valittavana', 'valinta_tehty', 'paattynyt', 'ei_jaksoa']);
  });
  it('joukkue: jakso voimassa + teeman nimi; ikävaihe joukkueen nimestä', () => { expect(u.jakso).toBe(true); expect(u.jakso_nimi).toBe('Pelaaminen'); expect(u.ikavaihe).toBe('rakentaja'); expect(u.nimi).toBe('KPV U13'); });
});

describe('joukkue ilman jaksoa · tyhjä seura', () => {
  it('joukkue ilman joukkuejaksoa: jakso false, ei jakso_nimi-kenttää; nollat', () => {
    const { doc } = laske([J11], [pel('x', { joukkue: 'KPV P11', syntymaVuosi: 2015 })]); const u = doc.joukkueet.p11;
    expect(u.jakso).toBe(false); expect('jakso_nimi' in u).toBe(false); expect(u.n_pelaajat).toBe(1); expect(u.n_jaksolla).toBe(0); expect(u.ikavaihe).toBe('leikkija');
  });
  it('umpeutunut tai tulevaisuuden joukkuejakso → jakso false', () => {
    const umpeutunut = { id: 'j', nimi: 'KPV U15', jaksofokus: { osa_alueet: { tekninen_taktinen: { nimi: 'Vanha' } }, alku: '2026-08-01', kesto_vk: 4 } };
    const tuleva = { id: 'k', nimi: 'KPV U16', jaksofokus: { osa_alueet: { tekninen_taktinen: { nimi: 'Tuleva' } }, alku: '2026-10-20', kesto_vk: 4 } };
    const { doc } = laske([umpeutunut, tuleva], []); expect(doc.joukkueet.j.jakso).toBe(false); expect(doc.joukkueet.k.jakso).toBe(false);
  });
  it('tyhjä seura: ei joukkueita → tyhjä joukkueet-kartta; joukkueita ilman pelaajia → nollat', () => {
    expect(laske([], []).doc.joukkueet).toEqual({});
    const u = laske([J13], []).doc.joukkueet.u13; expect([u.n_pelaajat, u.n_jaksolla, u.n_vastausperusta, u.n_katselmus_perusta]).toEqual([0, 0, 0, 0]);
  });
});

describe('Leikkijä (ei vastausasteeseen, mutta pelaajiin jaksolla)', () => {
  const L = pel('l', { joukkue: 'KPV P11', syntymaVuosi: 2015, jaksofokus: jakso(ARVIO - 10 * DAY) }), R = pel('r', { joukkue: 'KPV P11', syntymaVuosi: 2012, jaksofokus: jakso(ARVIO - 10 * DAY) });
  it('12-vuotias (Leikkijä) lasketaan jaksolle mutta ei vastausperustaan; 14-vuotias (Rakentaja) molempiin', () => {
    const { doc, a } = laske([J11], [L, R]); const u = doc.joukkueet.p11;
    expect(u.n_jaksolla).toBe(2); expect(u.n_vastausperusta).toBe(1); expect(a.ehdokkaat).toEqual(['r']);
  });
  it('ikä puuttuu → joukkueen nimestä (P11 → Leikkijä); tuntematon → EI Leikkijä', () => {
    const ilmanVuotta = pel('v', { joukkue: 'KPV P11', syntymaVuosi: null, jaksofokus: jakso(ARVIO - 10 * DAY) });
    expect(laske([J11], [ilmanVuotta]).doc.joukkueet.p11.n_vastausperusta).toBe(0);
    const tuntematon = pel('t', { joukkue: 'Edustus', syntymaVuosi: null, jaksofokus: jakso(ARVIO - 10 * DAY) });
    expect(laske([{ id: 'e', nimi: 'Edustus' }], [tuntematon]).doc.joukkueet.e.n_vastausperusta).toBe(1);
  });
  it('viikkokatsaus: n_vastanneet vain ehdokkaista (ulkopuolinen vastaaja ei vaikuta)', () => {
    const { doc } = laske([J11], [L, R], { vastanneet: ['l', 'r', 'joku-muu'] }); expect(doc.joukkueet.p11.n_vastanneet).toBe(1);   // vain perustan pelaaja r; Leikkijä l ja tuntematon vastaaja eivät lisää
  });
});

describe('viikkokatsaus (vastanneet / perusta)', () => {
  it('vastaajat lasketaan vain perustasta; vastaamattomat jäävät nimittäjään', () => {
    const P = [pel('a', { jaksofokus: jakso(ARVIO - 10 * DAY) }), pel('b', { jaksofokus: jakso(ARVIO - 10 * DAY) }), pel('c', { jaksofokus: jakso(ARVIO - 10 * DAY) }), pel('d', { jaksofokus: { tila: 'valittavana' } })];
    const { doc } = laske([J13], P, { vastanneet: ['a', 'c', 'd'] }); const u = doc.joukkueet.u13;
    expect(u.n_vastausperusta).toBe(3); expect(u.n_vastanneet).toBe(2);   // d ei kuulu perustaan (valinta odottaa)
  });
});

describe('katselmukset ajallaan (ikkuna = päättyminen + 14 pv, sulkeutuu tällä viikolla)', () => {
  const loppu = ARVIO - 16 * DAY, ikkuna = loppu + 14 * DAY;   // ikkuna sulkeutui pe 9.10.
  const rivi = (suljettuMs, o) => Object.assign({ sulkutapa: 'suljettu', paattyi: iso(loppu), suljettu: iso(suljettuMs), alkoi: iso(loppu - 28 * DAY) }, o || {});
  it('suljettu ikkunassa → ajallaan; suljettu myöhässä → perustassa mutta ei ajallaan (reviewit-haku pyydetään)', () => {
    const { doc, a } = laske([J13], [pel('a', { jaksofokus_historia: [rivi(loppu + 3 * DAY)] }), pel('b', { jaksofokus_historia: [rivi(ikkuna + 2 * DAY)] })]);
    const u = doc.joukkueet.u13; expect(u.n_katselmus_perusta).toBe(2); expect(u.n_katselmus_ajallaan).toBe(1);
    expect(a.katselmukset.map((k) => k.pid)).toEqual(['b']); expect(a.katselmukset[0].alkuPvm).toBe('2026-09-25'); expect(a.katselmukset[0].loppuPvm).toBe('2026-10-09');
  });
  it('myöhässä suljettu, mutta täysi katselmus (reviewit/{pvm}) ikkunassa → ajallaan', () => {
    const P = [pel('b', { jaksofokus_historia: [rivi(ikkuna + 2 * DAY)] })];
    const { a, doc } = laske([J13], P, { katselmusLoytyi: [] }); expect(doc.joukkueet.u13.n_katselmus_ajallaan).toBe(0);
    expect(K.tmKoosteTulos(a, { katselmusLoytyi: [a.katselmukset[0].i] }, { vk: '2026-W41' }).joukkueet.u13.n_katselmus_ajallaan).toBe(1);
  });
  it('päättynyt eikä suljettu, ikkuna umpeutui tällä viikolla → perustassa, ei ajallaan; ikkuna vielä auki → ei perustaan', () => {
    const umpeutui = pel('u', { jaksofokus: jakso(loppu - 28 * DAY) });   // päättyi loppu, ikkuna pe 9.10.
    const auki = pel('o', { jaksofokus: jakso(ARVIO - 40 * DAY) });       // päättyi 12 pv sitten → ikkuna sulkeutuu vasta ensi viikolla
    const { doc } = laske([J13], [umpeutui, auki]); const u = doc.joukkueet.u13;
    expect(u.n_katselmus).toBe(2); expect(u.n_katselmus_perusta).toBe(1); expect(u.n_katselmus_ajallaan).toBe(0);
  });
  it('jokainen jakso lasketaan KERRAN: ikkuna toisella viikolla → ei tämän viikon perustaan; korvattu / sulkutavaton ei ole katselmus', () => {
    const toinenViikko = pel('t', { jaksofokus_historia: [rivi(loppu + DAY, { paattyi: iso(loppu - 7 * DAY) })] });
    const korvattu = pel('k', { jaksofokus_historia: [rivi(loppu + DAY, { sulkutapa: 'korvattu' })] });
    const vanha = pel('v', { jaksofokus_historia: [rivi(loppu + DAY, { sulkutapa: undefined })] });
    expect(laske([J13], [toinenViikko, korvattu, vanha]).doc.joukkueet.u13.n_katselmus_perusta).toBe(0);
  });
});

describe('pelaaja kahdessa joukkueessa (joukkue + joukkueet[], §7.18)', () => {
  it('lasketaan KUMPAAN joukkueeseen (nimi- tai id-täsmäys)', () => {
    const p = pel('x', { joukkue: 'KPV U13', joukkueet: ['u13', 'p11'], jaksofokus: jakso(ARVIO - 10 * DAY) });
    const { doc } = laske([J13, J11], [p]);
    for (const jid of ['u13', 'p11']) { expect(doc.joukkueet[jid].n_pelaajat).toBe(1); expect(doc.joukkueet[jid].n_jaksolla).toBe(1); expect(doc.joukkueet[jid].n_vastausperusta).toBe(1); }
  });
  it('vain joukkueet[] (ID) tai vain joukkue (nimi) riittää; kuulumaton pelaaja ei lisäänny mihinkään', () => {
    const { doc } = laske([J13, J11], [pel('a', { joukkue: null, joukkueet: ['p11'] }), pel('b', { joukkue: 'KPV U13', joukkueet: [] }), pel('c', { joukkue: 'Muu', joukkueet: [] })]);
    expect(doc.joukkueet.p11.n_pelaajat).toBe(1); expect(doc.joukkueet.u13.n_pelaajat).toBe(1);
  });
});

describe('tietosuojavartija: koosteessa ei nimiä, ID:itä eikä vapaatekstiä', () => {
  const P = [pel('pid-salainen-1', { etunimi: 'Aleksi', sukunimi: 'Mäkinen', jaksofokus: jakso(ARVIO - 10 * DAY), idp_sitoumus_pvm: iso(ARVIO - 9 * DAY) })];
  const { doc } = laske([J13], P, { vastanneet: ['pid-salainen-1'] });
  it('tmKoosteRikkomukset tyhjä oikealla koosteella; joukkueen nimi ja teema sallittu', () => { expect(K.tmKoosteRikkomukset(doc)).toEqual([]); expect(K.tmKoosteJoukkueDokumentit(doc).every((d) => K.tmKoosteRikkomukset(d.data).length === 0)).toBe(true); });
  it('serialisoitu kooste ei sisällä pelaajan ID:tä eikä nimeä', () => { const s = JSON.stringify(doc) + JSON.stringify(K.tmKoosteJoukkueDokumentit(doc)); for (const kielletty of ['pid-salainen-1', 'Aleksi', 'Mäkinen', 'etunimi', 'sukunimi', 'pelaajaId', 'teksti']) expect(s).not.toContain(kielletty); });
  it('vartija nappaa kielletyt kentät (itsetesti)', () => {
    expect(K.tmKoosteRikkomukset({ joukkueet: { a: { nimi: 'X', etunimi: 'Y' } } })).toContain('joukkueet.a.etunimi');
    expect(K.tmKoosteRikkomukset({ joukkueet: { a: { pelaajaId: 'p' } } }).length).toBe(1);
    expect(K.tmKoosteRikkomukset({ nimi: 'x' })).toEqual(['nimi']);
    expect(K.tmKoosteRikkomukset({ joukkueet: { a: { teksti: 't' } } }).length).toBe(1);
    expect(K.tmKoosteRikkomukset({ joukkueet: { a: { x: ['pid'] } } }).length).toBe(1);
  });
  it('rakenne: vk, versio 4, arvio vain kun pyydetty; kooste_joukkue: id {jid}_{vk}, mittarit ilman nimiä', () => {
    expect(doc.vk).toBe('2026-W41'); expect(doc.versio).toBe(5); expect('arvio' in doc).toBe(false);
    expect(laske([J13], P, {}, { arvio: true }).doc.arvio).toBe(true);
    const jd = K.tmKoosteJoukkueDokumentit(doc)[0]; expect(jd.id).toBe('u13_2026-W41'); expect(jd.data).toMatchObject({ vk: '2026-W41', jid: 'u13', versio: 5 }); expect(jd.data.mittarit.n_pelaajat).toBe(1);
  });
  it('kenttiä ei tule teemakattavuudelle / kuormalle / kypsyydelle (S4) eikä nollia niille', () => { const k = Object.keys(doc.joukkueet.u13).join(','); for (const ei of ['teema', 'kuorma', 'kypsyys']) expect(k).not.toContain(ei); });
});

describe('tmJoukkuejaksoVoimassa = tmJoukkuejaksoKortti (ei eri totuutta)', () => {
  const jd = (alku, kesto, nimi) => ({ jaksofokus: { osa_alueet: { tekninen_taktinen: { nimi: nimi || 'T' } }, alku, kesto_vk: kesto } });
  it('pariteetti päivämäärillä: tulevaisuus / käynnissä / viimeinen päivä / päättymispäivä / umpeutunut', () => {
    for (const [d, tanaan] of [[jd('2026-10-01', 4), '2026-10-11'], [jd('2026-10-20', 4), '2026-10-11'], [jd('2026-10-11', 4), '2026-10-11'], [jd('2026-09-13', 4), '2026-10-10'], [jd('2026-09-13', 4), '2026-10-11'], [jd('2026-08-01', 4), '2026-10-11']]) {
      const k = JJ.tmJoukkuejaksoKortti(d, { tanaan }); const v = JJ.tmJoukkuejaksoVoimassa(d, tanaan);
      expect(v.voimassa, JSON.stringify([d.jaksofokus.alku, tanaan])).toBe(!!k.onJakso && !k.umpeutunut && !k.alkaaVasta);
    }
  });
  it('ei jaksoa / ei tekninen_taktinen → false; päivämäärät puuttuvat → voimassa (ei tiedetä umpeutumista)', () => { expect(JJ.tmJoukkuejaksoVoimassa({}, '2026-10-11').voimassa).toBe(false); expect(JJ.tmJoukkuejaksoVoimassa({ jaksofokus: { osa_alueet: {} } }, '2026-10-11').voimassa).toBe(false); expect(JJ.tmJoukkuejaksoVoimassa(jd(null, null), '2026-10-11').voimassa).toBe(true); });
});

describe('tm_ikavaihe: pariteetti sovelluksen normiIka:an', () => {
  const sb = { console: { log() {}, warn() {}, error() {} } }; sb.window = sb; vm.createContext(sb);
  vm.runInContext(readFileSync(new URL('../lib/tm_eerikkila_normit.js', import.meta.url), 'utf8') + '\n;this.__n = normiIka;', sb);
  const normi = sb.__n;
  it('syntymävuosi + vuosi / joukkueen nimi: sama tulos kuin normiIka (kun pvm = vuosi)', () => {
    for (const sv of [2005, 2010, 2012, 2013, 2014, 2016, 2021, 1990, null]) for (const jk of ['KPV U13', 'KPV P11', 'T15', 'Edustus', '', null]) {
      expect(IV.tmPelaajaIka(sv, 2026, jk), JSON.stringify([sv, jk])).toBe(normi(sv, '2026-10-11', jk));
    }
  });
  it('ikävaihe-raja: ≤12 Leikkijä · 13–15 Rakentaja · 16+ Showcase · tuntematon null (= sama kuin tmKtIkavaihe / tmMvRekisteri)', () => {
    expect([12, 13, 15, 16, 25].map(IV.tmIkavaihe)).toEqual(['leikkija', 'rakentaja', 'rakentaja', 'showcase', 'showcase']); expect([null, '', 0, NaN, 'x'].map(IV.tmIkavaihe)).toEqual([null, null, null, null, null]);
    const KT = require('../lib/tm_kehitystyopoyta.js'); const MV = require('../lib/tm_mediaviesti.js');
    for (const ika of [8, 12, 13, 15, 16, 19]) { expect(IV.tmIkavaihe(ika) === 'leikkija').toBe(KT.tmKtIkavaihe(ika) === 'Leikkijä'); expect(IV.tmIkavaihe(ika)).toBe(MV.tmMvRekisteri(ika) === 'leikkija' ? 'leikkija' : (ika <= 15 ? 'rakentaja' : 'showcase')); }
  });
});


describe('S1.1 Käyttöaste (versio 2) — suostumus · kirjautuminen · oma kirjoitus 7/30 pv', () => {
  // arviointihetki su 11.10.2026 21:00 Helsinki → tänään 2026-10-11; 7 pv ikkuna alkaa 2026-10-05, 30 pv ikkuna 2026-09-12
  const P = [
    pel('a', { suostumus: true, viimeisinKirjautuminen: '2026-10-10', huoltajaViimeisinKaynti: '2026-10-01', oma: ['2026-10-09'] }),          // aktiivinen 7+30, kirjautunut, huoltaja
    pel('b', { suostumus: true, viimeisinKirjautuminen: '2026-09-12', oma: ['2026-09-20'] }),                                                // 30 pv (ikkunan raja 12.9. mukaan), aktiivinen vain 30
    pel('c', { suostumus: true, viimeisinKirjautuminen: '2026-09-11', oma: ['2026-09-11'] }),                                                // 1 pv ikkunan ulkopuolella
    pel('d', { suostumus: false, oma: ['2026-10-12'] }),                                                                                       // tulevaisuus (arvion jälkeen) ei lasketa
    pel('e', { suostumus: true, oma: ['2026-10-05'] }),                                                                                       // 7 pv ikkunan ensimmäinen päivä
    pel('f', { oma: [iso(Date.UTC(2026, 9, 11, 20, 59))] }),                                                                                  // ISO-aikaleima → Helsingin päivä 11.10. (sis. 7 pv)
    pel('g'),                                                                                                                                 // ei mitään
  ];
  const u = laske([J13], P).doc.joukkueet.u13;
  it('n_suostumus: vain p.suostumus === true', () => { expect(u.n_suostumus).toBe(4); });
  it('n_kirjautunut_30: ikkunan rajat (30 pv sis. alkupäivä, ei arviohetken jälkeistä)', () => { expect(u.n_kirjautunut_30).toBe(2); });
  it('n_huoltaja_30: huoltajaViimeisinKaynti ikkunassa', () => { expect(u.n_huoltaja_30).toBe(1); });
  it('n_aktiivinen_7 / n_aktiivinen_30: oma kirjoitus; tulevaisuus ja ikkunan ulkopuoli ei; ISO-aikaleima Helsingin päivänä', () => { expect(u.n_aktiivinen_7).toBe(3); expect(u.n_aktiivinen_30).toBe(4); expect(u.n_aktiivinen_7).toBeLessThanOrEqual(u.n_aktiivinen_30); });
  it('kirjautuminen EI ole oma kirjoitus (c: kirjautunut mutta ei aktiivinen; vain kirjautunut ei nosta aktiivista)', () => {
    const v = laske([J13], [pel('x', { viimeisinKirjautuminen: '2026-10-10' })]).doc.joukkueet.u13; expect([v.n_kirjautunut_30, v.n_aktiivinen_7, v.n_aktiivinen_30]).toEqual([1, 0, 0]);
  });
  it('tyhjä seura / joukkue ilman pelaajia: nollat; v1-tyylinen pelaaja (ei uusia kenttiä) ei kaada', () => {
    const t = laske([J13], []).doc.joukkueet.u13; expect([t.n_suostumus, t.n_kirjautunut_30, t.n_huoltaja_30, t.n_aktiivinen_7, t.n_aktiivinen_30]).toEqual([0, 0, 0, 0, 0]);
    const v = laske([J13], [pel('y')]).doc.joukkueet.u13; expect(v.n_pelaajat).toBe(1); expect(v.n_aktiivinen_30).toBe(0);
  });
  it('pelaaja kahdessa joukkueessa (§7.18) lasketaan kumpaankin', () => {
    const J = { id: 'u15', nimi: 'KPV U15' };
    const { doc } = laske([J13, J], [pel('z', { joukkueet: ['u13', 'u15'], suostumus: true, oma: ['2026-10-10'] })]);
    expect(doc.joukkueet.u13.n_aktiivinen_7).toBe(1); expect(doc.joukkueet.u15.n_aktiivinen_7).toBe(1); expect(doc.joukkueet.u15.n_suostumus).toBe(1);
  });
  it('tietosuoja: syötteen oma-päivämäärät, kirjautumispäivät ja suostumus eivät vuoda koosteeseen (vain lukumäärät); vartija hiljaa', () => {
    const { doc } = laske([J13], P); const s = JSON.stringify(doc);
    for (const k of ['2026-10-09', '2026-09-20', 'viimeisinKirjautuminen', 'huoltajaViimeisinKaynti', '"oma"', '"a"', '"b"']) expect(s.includes(k), k).toBe(false);
    expect(K.tmKoosteRikkomukset(doc)).toEqual([]);
    Object.keys(doc.joukkueet.u13).filter((k) => /^n_/.test(k)).forEach((k) => expect(typeof doc.joukkueet.u13[k], k).toBe('number'));
  });
});

describe('tmKoosteTrendi — neljän viikon trendi (seura / joukkue)', () => {
  const dok = (vk, a, b) => ({ vk, joukkueet: { u13: { n_pelaajat: 10, n_aktiivinen_30: a }, u15: { n_pelaajat: 20, n_aktiivinen_30: b } } });
  it('summaa joukkueet; edellinen viikko + suunta', () => {
    const t = K.tmKoosteTrendi([dok('2026-W38', 1, 1), dok('2026-W39', 2, 2), dok('2026-W40', 3, 6)], 'n_aktiivinen_30');
    expect(t.nyt).toEqual({ vk: '2026-W40', osoittaja: 9, nimittaja: 30, pros: 30 }); expect(t.edellinen.osoittaja).toBe(4); expect(t.suunta).toBe('ylos');
  });
  it('yksittäinen joukkue (jid); alas / sama', () => {
    expect(K.tmKoosteTrendi([dok('a', 5, 0), dok('b', 3, 0)], 'n_aktiivinen_30', 'u13').suunta).toBe('alas');
    expect(K.tmKoosteTrendi([dok('a', 5, 0), dok('b', 5, 9)], 'n_aktiivinen_30', 'u13').suunta).toBe('sama');
  });
  it('tyhjä / yksi viikko / v1-dokumentit (kenttä puuttuu) → ei edellistä, suunta null', () => {
    expect(K.tmKoosteTrendi([], 'n_aktiivinen_30')).toEqual({ nyt: null, edellinen: null, suunta: null });
    expect(K.tmKoosteTrendi([dok('a', 1, 1)], 'n_aktiivinen_30').suunta).toBeNull();
    const v1 = { vk: 'x', joukkueet: { u13: { n_pelaajat: 10 } } };
    expect(K.tmKoosteTrendi([v1, dok('y', 1, 1)], 'n_aktiivinen_30').edellinen).toBeNull();
  });
});


describe('Joukkuejäsenyys (§7.18): joukkueet[] on totuus; yhteensä uniikeista pelaajista', () => {
  const JB = { id: 'sibbo_p12', nimi: 'Sibbo P12', ikaryhma: 'P12' }, JBL = { id: 'sibbo_bla', nimi: 'Sibbo 2014 Blå', ikaryhma: 'P12', vuosi: 2014 }, JP11 = { id: 'sibbo_p11', nimi: 'Sibbo P11', ikaryhma: 'P11' };
  it('Sibbo-tapaus: nimi = Blå mutta joukkueet[] = [p12] → lasketaan VAIN P12:een (tunniste voittaa nimen); korjattu data [bla] → vain Blå:hon; ei tuplalaskentaa', () => {
    const stale = laske([JB, JBL], [pel('a', { joukkue: 'Sibbo 2014 Blå', joukkueet: ['sibbo_p12'] })]).doc;
    expect(stale.joukkueet.sibbo_p12.n_pelaajat).toBe(1); expect(stale.joukkueet.sibbo_bla.n_pelaajat).toBe(0); expect(stale.yhteensa.n_pelaajat).toBe(1);
    const ok = laske([JB, JBL], [pel('a', { joukkue: 'Sibbo 2014 Blå', joukkueet: ['sibbo_bla'] })]).doc;
    expect(ok.joukkueet.sibbo_p12.n_pelaajat).toBe(0); expect(ok.joukkueet.sibbo_bla.n_pelaajat).toBe(1); expect(ok.yhteensa.n_pelaajat).toBe(1);
  });
  it('yhteensa = uniikit pelaajat: monijoukkueinen kerran, joukkueeton mukana (n_ilman_joukkuetta), joukkuesumma voi olla suurempi', () => {
    const P = [pel('a', { joukkue: 'Sibbo P12', joukkueet: ['sibbo_p12', 'sibbo_bla'], suostumus: true, oma: ['2026-10-10'] }), pel('b', { joukkue: 'Sibbo P12', joukkueet: ['sibbo_p12'], suostumus: true }), pel('c', { joukkue: 'Tuntematon', joukkueet: [], suostumus: true, oma: ['2026-10-09'] })];
    const d = laske([JB, JBL, JP11], P).doc, sum = Object.values(d.joukkueet).reduce((s, j) => s + j.n_pelaajat, 0);
    expect(sum).toBe(3); expect(d.yhteensa.n_pelaajat).toBe(3);   // 2 (P12) + 1 (Blå)  — a on kahdessa, c ei yhdessäkään → summa 3, uniikit 3
    expect(d.yhteensa).toMatchObject({ n_pelaajat: 3, n_ilman_joukkuetta: 1, n_suostumus: 3, n_aktiivinen_7: 2, n_aktiivinen_30: 2 });
    const kaksi = laske([JB, JBL], [pel('a', { joukkueet: ['sibbo_p12', 'sibbo_bla'] }), pel('b', { joukkueet: ['sibbo_p12', 'sibbo_bla'] })]).doc;
    expect(kaksi.yhteensa.n_pelaajat).toBe(2); expect(kaksi.joukkueet.sibbo_p12.n_pelaajat + kaksi.joukkueet.sibbo_bla.n_pelaajat).toBe(4);
  });
  it('legacy-pelaaja ilman joukkueet[]-listaa: nimi kanonisoidaan docia vasten; tuntematon nimi → ei joukkuetta; tuntematon tunniste ohitetaan', () => {
    expect(laske([JB], [pel('a', { joukkue: ' sibbo p12 ', joukkueet: [] })]).doc.joukkueet.sibbo_p12.n_pelaajat).toBe(1);
    expect(laske([JB], [pel('a', { joukkue: 'Muu', joukkueet: [] })]).doc.joukkueet.sibbo_p12.n_pelaajat).toBe(0);
    expect(laske([JB], [pel('a', { joukkue: 'Sibbo P12', joukkueet: ['kuollut_id'] })]).doc.joukkueet.sibbo_p12.n_pelaajat).toBe(0);
  });
  it('tmKayttoasteLaske seuran rivi käyttää yhteensa-lukuja (uniikit); trendi samoin; v2-dokumentti (ei yhteensa) → joukkuesumma', () => {
    const KA = require('../lib/tm_kayttoaste.js');
    const mk = (vk, y, jt) => ({ vk, versio: 3, yhteensa: y, joukkueet: jt });
    const jt = { a: { n_pelaajat: 6, n_suostumus: 6, n_kirjautunut_30: 0, n_aktiivinen_7: 0, n_aktiivinen_30: 2, n_huoltaja_30: 0 }, b: { n_pelaajat: 6, n_suostumus: 6, n_kirjautunut_30: 0, n_aktiivinen_7: 0, n_aktiivinen_30: 2, n_huoltaja_30: 0 } };
    const y = { n_pelaajat: 10, n_ilman_joukkuetta: 0, n_suostumus: 10, n_kirjautunut_30: 0, n_huoltaja_30: 0, n_aktiivinen_7: 0, n_aktiivinen_30: 3 };
    const l = KA.tmKayttoasteLaske([mk('2026-W41', { ...y, n_aktiivinen_30: 1 }, jt), mk('2026-W42', y, jt)]);
    expect(l.pelaajia).toBe(10); const c = l.solut.find((x) => x.k === 'n_aktiivinen_30'); expect(c).toMatchObject({ osoittaja: 3, nimittaja: 10, teksti: '30 %', edellinen: 1, suunta: 'ylos' });
    const v2 = KA.tmKayttoasteLaske([{ vk: 'x', versio: 2, joukkueet: jt }]); expect(v2.pelaajia).toBe(12);
  });
});
