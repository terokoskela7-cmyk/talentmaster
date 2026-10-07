/**
 * J4 C — lib/tm_joukkoaloitus.js (D32): rivin tila (käynnissä / valittavana / ei ydinvahvuutta / hyväksyttävissä), ehdotus lennossa (V1:n funktiot), Hyväksy = V1-modaalin oletustallennus (identtinen kirjoitusolio),
 * rajattu rinnakkaisuus, osion HTML. Fixture: KPV U13 Topias (PHV LAH, heikko 30 m + kiihdytys).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const JA = require('../lib/tm_joukkoaloitus.js'), AJ = require('../lib/tm_aloita_jakso.js'), TAKS = require('../lib/tm_arviointi_taksonomia.js'), KOTI = require('../lib/tm_koti_oletus.js'), JM = require('../lib/tm_jakso_malli.js');
const TANAAN = '2026-11-10', NYT = new Date('2026-11-10T09:00:00'), T = (s) => s;
const ITEMS = [{ avain: 'y_h2', nimi: 'Saattaen vaihtaminen', koodi: 'Y-H2' }, { avain: 'y_h3', nimi: 'Toinen taito' }];
const PHV = (k) => (k ? { biologinenIka_viimeisin: { phv_tila_koodi: k } } : {});
const P = (id, lisa) => Object.assign({ id: id, joukkue: 'KPV U13', syntymaVuosi: 2013, ydinvahvuus: { kuvaus: 'Tempokuljetus', havaittu_pvm: '2026-10-01', rooli: 'vp' }, hh_viimeisin: { lin30m: 5.8, lin10m: 1.9 }, hh_pvm: '2026-10-30', ...PHV('LAH') }, lisa || {});
const JJ = { jid: 'kpv_u13', data: { id: 'kpv_u13', jaksofokus: { alku: '2026-11-10', kesto_vk: 6, osa_alueet: { tekninen_taktinen: { teema_avain: 't', nimi: 'Syöttö', lahde: 'seura' }, fyysinen: { avain: 'fy_ketteryys', nimi: 'Ketteryys ja nopeus', lahde: 'tm' } } } } };
const HAETUT = (lisa) => Object.assign({ joukkue: JJ, havainnot: [{ tyyppi: 'adar_pikakortti', pvm: '2026-10-20', pisteet: { Act: 1 } }, { tyyppi: 'adar_pikakortti', pvm: '2026-11-03', pisteet: { Act: 1 } }], kehys: TAKS.tmKehys('palloliitto'), profiili: null, seuranPankki: [], seuranOhjelmat: [] }, lisa || {});
const C = (lisa) => Object.assign({ tanaan: TANAAN, ika: 13, sp: 'P', nimi: 'Topias K.', items: ITEMS, ehdotusAvain: 'y_h2', haetut: HAETUT(), tmPankki: KOTI, seuraNimi: 'KPV', nyt: NYT }, lisa || {});
const JF = (lisa) => Object.assign({ konsepti_avain: 'y_h2', konsepti_nimi: 'X', alkoi: '2026-11-03T08:00:00.000Z', kesto_vk: 6 }, lisa || {});

describe('tmJoukkueenPelaajat (§18 kaksoisehto)', () => {
  it('p.joukkue (nimi, case-insensitive) TAI p.joukkueet ∋ jid; muiden joukkueiden pelaajat pois; null-turvallinen', () => {
    const l = [{ id: 'a', joukkue: 'KPV U13' }, { id: 'b', joukkue: 'kpv  u13' }, { id: 'c', joukkueet: ['kpv_u13'] }, { id: 'd', joukkue: 'KPV U12', joukkueet: ['kpv_u12'] }, { id: 'e', joukkue: 'KPV U12', joukkueet: ['kpv_u12', 'kpv_u13'] }, { id: 'f' }, null];
    expect(JA.tmJoukkueenPelaajat(l, 'kpv_u13', 'KPV U13').map((p) => p.id)).toEqual(['a', 'b', 'c', 'e']);
    expect(JA.tmJoukkueenPelaajat(l, null, 'KPV U13').map((p) => p.id)).toEqual(['a', 'b']); expect(JA.tmJoukkueenPelaajat(l, 'kpv_u13', '').map((p) => p.id)).toEqual(['c', 'e']);
    expect(JA.tmJoukkueenPelaajat(null, 'x', 'y')).toEqual([]);
  });
});

describe('tmJoukkoTila', () => {
  it('käynnissä: jakso ei umpeutunut; valittavana: pelaaja valitsi, odottaa vahvistusta; umpeutunut jakso → uusi aloitettavissa; ei ydinvahvuutta → vain Avaa', () => {
    expect(JA.tmJoukkoTila(P('a', { jaksofokus: JF() }), NYT)).toBe('kaynnissa');
    expect(JA.tmJoukkoTila(P('a', { jaksofokus: JF({ alkoi: '2026-09-01T08:00:00.000Z' }) }), NYT)).toBe('valmis');   // päättyi 13.10.
    expect(JA.tmJoukkoTila(P('a', { jaksofokus: JF({ tila: 'valittavana' }), ydinvahvuus_valinta: { vaihtoehto: 'X' } }), NYT)).toBe('valittavana');
    expect(JA.tmJoukkoTila(P('a'), NYT)).toBe('valmis'); expect(JA.tmJoukkoTila(P('a', { ydinvahvuus: null }), NYT)).toBe('ei_ydinvahvuutta');
    expect(JA.tmJoukkoTila(P('a', { ydinvahvuus: null, ydinvahvuus_valinta: { vaihtoehto: 'Näkee pelin' } }), NYT)).toBe('valmis');   // pelaajan valinta riittää
    expect(JA.tmJoukkoTila(P('a', { ydinvahvuus: { kuvaus: '  ' }, ydinvahvuus_valinta: null }), NYT)).toBe('ei_ydinvahvuutta');
    expect(JA.tmJoukkoTila(P('a', { jaksofokus: { konsepti_avain: 'y_h2' } }), NYT)).toBe('kaynnissa');   // ei alkoi-päivää → ei umpeudu (ei arvausta)
  });
  it('raja: jakso joka päättyy täsmälleen nyt on vielä käynnissä (alkoi + kesto < nyt)', () => {
    const alkoi = new Date(NYT.getTime() - 6 * 7 * 86400000).toISOString();
    expect(JA.tmJoukkoTila(P('a', { jaksofokus: JF({ alkoi: alkoi }) }), NYT)).toBe('kaynnissa'); expect(JA.tmJoukkoTila(P('a', { jaksofokus: JF({ alkoi: new Date(new Date(alkoi).getTime() - 1000).toISOString() }) }), NYT)).toBe('valmis');
  });
});

describe('tmJoukkoRivi', () => {
  it('Topias (LAH): hyväksyttävissä; ehdotus = kypsyyssuojattu liikehallinta (EI nopeus/kiihdytys/voima/kestävyys); lyhyt + miksi mukana; maksimi 1; lomake laskettu', () => {
    const r = JA.tmJoukkoRivi(P('m93GBdOaGCUuenMiCL0I'), C());
    expect(r).toMatchObject({ pid: 'm93GBdOaGCUuenMiCL0I', nimi: 'Topias K.', tila: 'valmis', ydinvahvuus: 'Tempokuljetus', maksimi: 1, hyvaksyttavissa: true });
    expect(r.ehdotus).toMatchObject({ alue: 'fyysinen', kuvaus: 'Liikehallinta ja kehonhallinta' }); expect(r.ehdotus.lyhyt).toBe('testistä, kasvu huomioiden'); expect(r.ehdotus.miksi).toMatch(/Kypsyysvahti/); expect(r.ehdotus.perustelu).toMatch(/^Tukee ydinvahvuutta \(Tempokuljetus\)/);
    expect(JSON.stringify(r.ehdotus)).not.toMatch(/speed|acceleration|power|endurance/); expect(/^(nopeus|kiihdytys|voima|kestävyys)/i.test(r.ehdotus.kuvaus)).toBe(false);
    expect(r.x.tuki.alku).toBe('2026-11-10'); expect(r.x.tuki.viite).toMatchObject({ jid: 'kpv_u13', alku: '2026-11-10' });
  });
  it('POST-pelaaja: nopeus tarjotaan sellaisenaan (vartija vain PRE/LAH/PH/tuntematon)', () => {
    expect(JA.tmJoukkoRivi(P('x', PHV('POST')), C()).ehdotus).toMatchObject({ alue: 'fyysinen', kuvaus: 'Nopeus' });
  });
  it('Leikkijä (10 v): maksimi 0 → ei ehdotusta, silti hyväksyttävissä (vain päivät + ydinvahvuus)', () => {
    const r = JA.tmJoukkoRivi(P('x'), C({ ika: 10 })); expect(r).toMatchObject({ maksimi: 0, ehdotus: null, hyvaksyttavissa: true });
    const hy = JA.tmJoukkoHyvaksy(P('x'), r, { tanaan: TANAAN, rooli: 'valmentaja', ika: 10, nytISO: TANAAN + 'T10:00:00.000Z' }); expect(hy.jaksofokus.tukitavoitteet).toEqual([]); expect(hy.jaksofokus.tukiosa).toBeNull(); expect(hy.jaksofokus.kesto_vk).toBe(12); expect(hy.ydinvahvuus.kuvaus).toBe('Tempokuljetus');
  });
  it('käynnissä: ei laskentaa eikä toimintoa; valittavana: ei Hyväksy kaikki -joukossa; ei ydinvahvuutta: ei hyväksyttävissä (Avaa)', () => {
    const k = JA.tmJoukkoRivi(P('x', { jaksofokus: JF() }), C()); expect(k).toMatchObject({ tila: 'kaynnissa', hyvaksyttavissa: false, x: null, ehdotus: null });
    const v = JA.tmJoukkoRivi(P('x', { jaksofokus: JF({ tila: 'valittavana' }), ydinvahvuus_valinta: { vaihtoehto: 'X' } }), C()); expect(v).toMatchObject({ tila: 'valittavana', hyvaksyttavissa: false }); expect(v.x).toBeTruthy();
    const e = JA.tmJoukkoRivi(P('x', { ydinvahvuus: null }), C()); expect(e).toMatchObject({ tila: 'ei_ydinvahvuutta', hyvaksyttavissa: false, ydinvahvuus: '' }); expect(e.x).toBeTruthy();
  });
  it('lähteet puuttuvat (null) → rivi silti; ei taitoa (ei ehdotusta, ei listaa) → ei hyväksyttävissä; poikkeus lähteessä ei kaada', () => {
    expect(JA.tmJoukkoRivi(P('x'), C({ haetut: { joukkue: null, havainnot: null, kehys: null } })).tila).toBe('valmis');
    expect(JA.tmJoukkoRivi(P('x'), C({ items: [], ehdotusAvain: null })).hyvaksyttavissa).toBe(false);
    expect(() => JA.tmJoukkoRivi(P('x'), C({ haetut: undefined, items: undefined }))).not.toThrow();
  });
});

describe('tmJoukkoHyvaksy = V1-modaalin oletustallennus (identtinen kirjoitusolio)', () => {
  const op = { tanaan: TANAAN, rooli: 'valmentaja', ika: 13, nytISO: TANAAN + 'T09:00:00.000Z' };
  it('sama jaksofokus/ydinvahvuus kuin V1-modaali kirjoittaisi oletusarvoilla (rakennettu riippumatta: taito, ydinvahvuus, kesto, joukkuejakson päivä, ensimmäinen ehdotus + sen perustelu, ei kotiharjoitteita)', () => {
    const p = P('m93GBdOaGCUuenMiCL0I'), r = JA.tmJoukkoRivi(p, C()), x = r.x, k0 = x.tuki.kortit[0];
    const hy = JA.tmJoukkoHyvaksy(p, r, op);
    const arvot = { _ajTaito: 'y_h2', _ajYv: 'Tempokuljetus', _ajKesto: String(x.kesto.valittu), _ajVh: '', _ajAlku: '2026-11-10', _ajTtV_0: '1', _ajTtP_0: k0.perustelu };
    const v1 = AJ.tmAloitaJaksoV2(p, Object.assign({}, AJ.tmAloitaJaksoSyoteV2((id) => (id in arvot ? arvot[id] : ''), x), { konsepti_nimi: 'Saattaen vaihtaminen', konsepti_koodi: 'Y-H2' }), x, op);
    expect(hy).toEqual(v1);
    expect(hy.jaksofokus.tukitavoitteet).toHaveLength(1); expect(hy.jaksofokus.tukitavoitteet[0]).toMatchObject({ alue: 'fyysinen', kuvaus: 'Liikehallinta ja kehonhallinta', harjoitteet: [] }); expect(hy.jaksofokus.tukiosa.alue).toBe('Liikehallinta ja kehonhallinta');
    expect(hy.jaksofokus.joukkuejakso_viite).toMatchObject({ jid: 'kpv_u13', alku: '2026-11-10', nimi: expect.any(String), kesto_vk: expect.any(Number) }); expect(hy.jaksofokus.kesto_vk).toBe(x.kesto.valittu); expect(hy.jaksofokus.asetti).toEqual({ rooli: 'valmentaja', pvm: TANAAN }); expect(JM.tmTarkistaJaksoData(hy.jaksofokus)).toEqual([]);
    const upd = AJ.tmAloitaJaksoKirjoitus({ jaksofokus: hy.jaksofokus, historiaLisays: [] }, hy, null, { arrayUnion: () => null }); expect(Object.keys(upd)).toEqual(['jaksofokus', 'ydinvahvuus']);   // YKSI update
  });
  it('pelaajan valinta ydinvahvuutena (ei omaa): käytetään; ilman ydinvahvuutta heittää (ei kirjoiteta); rivi ilman lomaketta heittää', () => {
    const p = P('x', { ydinvahvuus: null, ydinvahvuus_valinta: { vaihtoehto: 'Näkee pelin hyvin' } }); expect(JA.tmJoukkoHyvaksy(p, JA.tmJoukkoRivi(p, C()), op).ydinvahvuus.kuvaus).toBe('Näkee pelin hyvin');
    const e = P('x', { ydinvahvuus: null }); expect(() => JA.tmJoukkoHyvaksy(e, JA.tmJoukkoRivi(e, C()), op)).toThrow(/ydinvahvuus/);
    expect(() => JA.tmJoukkoHyvaksy(P('x'), { x: null }, op)).toThrow(/ei ole laskettua lomaketta/);
  });
  it('joukkuejakson päivät oletuksena; ei aktiivista joukkuejaksoa → tänään ilman viitettä', () => {
    const eiJj = JA.tmJoukkoHyvaksy(P('x'), JA.tmJoukkoRivi(P('x'), C({ haetut: HAETUT({ joukkue: null }) })), op); expect(eiJj.jaksofokus.joukkuejakso_viite).toBeUndefined(); expect(eiJj.jaksofokus.alkoi).toBe(op.nytISO);
    const tuleva = JA.tmJoukkoHyvaksy(P('x'), JA.tmJoukkoRivi(P('x'), C({ haetut: HAETUT({ joukkue: { jid: 'kpv_u13', data: { jaksofokus: Object.assign({}, JJ.data.jaksofokus, { alku: '2026-11-17' }) } } }) })), op);
    expect(new Date(tuleva.jaksofokus.alkoi).getDate()).toBe(17); expect(tuleva.jaksofokus.joukkuejakso_viite.alku).toBe('2026-11-17');
  });
});

describe('tmRinnakkain', () => {
  it('enintään n työtä yhtä aikaa; tulokset alkuperäisessä järjestyksessä; n > pituus ja tyhjä lista toimivat', async () => {
    let nyt = 0, maks = 0; const lista = Array.from({ length: 12 }, (_, i) => i);
    const r = await JA.tmRinnakkain(lista, 5, async (x) => { nyt++; maks = Math.max(maks, nyt); await new Promise((res) => setTimeout(res, 5 + (x % 3) * 4)); nyt--; return x * 2; });
    expect(maks).toBe(5); expect(r.map((x) => x.arvo)).toEqual(lista.map((x) => x * 2));
    expect((await JA.tmRinnakkain([1, 2], 9, async (x) => x)).map((x) => x.arvo)).toEqual([1, 2]); expect(await JA.tmRinnakkain([], 5, async (x) => x)).toEqual([]);
  });
  it('yhden työn virhe (heitto tai hylätty lupaus) ei kaada muita: { virhe } samassa kohdassa', async () => {
    const r = await JA.tmRinnakkain([1, 2, 3, 4], 2, async (x) => { if (x === 2) throw new Error('boom'); if (x === 3) return Promise.reject(new Error('hylätty')); return x; });
    expect(r[0]).toEqual({ arvo: 1 }); expect(r[1].virhe.message).toBe('boom'); expect(r[2].virhe.message).toBe('hylätty'); expect(r[3]).toEqual({ arvo: 4 });
    const sync = await JA.tmRinnakkain([1], 5, () => { throw new Error('sync'); }); expect(sync[0].virhe.message).toBe('sync');
  });
});

describe('tmJoukkoHTML', () => {
  const rivit = () => [JA.tmJoukkoRivi(P('a'), C({ nimi: 'Aatu A.' })), JA.tmJoukkoRivi(P('b', { jaksofokus: JF() }), C({ nimi: 'Bertta B.' })), JA.tmJoukkoRivi(P('c', { ydinvahvuus: null }), C({ nimi: 'Cecilia C.' })),
    JA.tmJoukkoRivi(P('d', { jaksofokus: JF({ tila: 'valittavana' }), ydinvahvuus_valinta: { vaihtoehto: 'X' } }), C({ nimi: 'Daavid D.' })), { pid: 'e', nimi: 'Eero E.', tila: 'virhe', ydinvahvuus: '', ehdotus: null, hyvaksyttavissa: false }];
  const OPT = { t: T, hyvaksyFn: '_hy', avaaFn: '_av', kaikkiFn: '_kaikki' };
  it('rivi: pelaaja · ydinvahvuus · ehdotus (alue, nimi, lyhyt) + "miksi?" · toiminto tilan mukaan; Hyväksy kaikki (n) = vain hyväksyttävät', () => {
    const h = JA.tmJoukkoHTML(rivit(), {}, OPT);
    expect(h).toContain('Pelaajien jaksot'); expect(h).toContain('Hyväksy kaikki (1)'); expect(h).toContain("_kaikki()");
    const rivi = (pid) => new RegExp('data-pid="' + pid + '"[\\s\\S]*?(?=<div class="tm-ja-rivi"|$)').exec(h)[0];
    expect(rivi('a')).toContain('Aatu A.'); expect(rivi('a')).toContain('Tempokuljetus'); expect(rivi('a')).toContain('Liikehallinta ja kehonhallinta'); expect(rivi('a')).toContain('testistä, kasvu huomioiden'); expect(rivi('a')).toMatch(/<summary[^>]*>miksi\?<\/summary>/); expect(rivi('a')).toContain("_hy('a')"); expect(rivi('a')).toContain("_av('a')");
    expect(rivi('b')).toContain('jakso käynnissä'); expect(rivi('b')).not.toContain('_hy('); expect(rivi('b')).not.toContain('_av('); expect(rivi('b')).not.toContain('miksi?');
    expect(rivi('c')).toContain('Ei ydinvahvuutta'); expect(rivi('c')).toContain("_av('c')"); expect(rivi('c')).not.toContain('_hy(');
    expect(rivi('d')).toContain('Pelaaja valitsi — vahvista'); expect(rivi('d')).toContain("_av('d')"); expect(rivi('d')).not.toContain('_hy(');
    expect(rivi('e')).toContain('Tietoja ei saatu'); expect(rivi('e')).toContain("_av('e')");
  });
  it('Leikkijä: "Ei tukitavoitetta (ikävaihe)"; ei hyväksyttäviä → ei Hyväksy kaikki -nappia; tyhjä lista; edistyminen ja epäonnistuneet näkyvät', () => {
    const l = JA.tmJoukkoHTML([JA.tmJoukkoRivi(P('a'), C({ ika: 10, nimi: 'Pieni P.' }))], {}, OPT); expect(l).toContain('Ei tukitavoitetta (ikävaihe)'); expect(l).toContain('Hyväksy kaikki (1)');
    expect(JA.tmJoukkoHTML([JA.tmJoukkoRivi(P('b', { jaksofokus: JF() }), C())], {}, OPT)).not.toContain('Hyväksy kaikki'); expect(JA.tmJoukkoHTML([], {}, OPT)).toContain('Joukkueella ei ole pelaajia.');
    const e = JA.tmJoukkoHTML(rivit(), { edistyy: { tehty: 2, yht: 5 }, virheet: [{ nimi: 'Aatu A.', syy: 'ei oikeutta' }] }, OPT); expect(e).toContain('Hyväksytään 2/5…'); expect(e).toContain('Ei onnistunut (1):'); expect(e).toContain('Aatu A. — ei oikeutta'); expect(e).not.toContain('data-ja-kaikki');   // ei uutta Hyväksy kaikki kesken
  });
  it('escapaa (XSS), kääntää t():llä, ei hex-värejä, ei ketjunimiä; nappien vaihtoehtona puuttuva funktio → nappia ei renderöidä', () => {
    const r = JA.tmJoukkoRivi(P('<x>', { ydinvahvuus: { kuvaus: '<img onerror=x>' } }), C({ nimi: '<b>Nimi</b>' })); const h = JA.tmJoukkoHTML([r], { virheet: [{ nimi: '<i>v</i>', syy: '<s>' }] }, { t: (s) => '«' + s + '»', hyvaksyFn: '_hy', avaaFn: '_av' });
    expect(h).not.toContain('<img'); expect(h).not.toContain('<b>Nimi'); expect(h).not.toContain('<i>v'); expect(h).toContain('«Pelaajien jaksot»'); expect(h).not.toContain('data-ja-kaikki'); expect(h).toContain('data-ja-hyvaksyFn');
    expect(h).not.toMatch(/#[0-9a-f]{3,6}\b/i); expect(h).not.toMatch(/\b(SBL|SFL|DIAG|DFL)\b/);
  });
});
