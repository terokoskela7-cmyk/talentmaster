/* Vaihe 0 B.4 — listayhteenveto: rivien rakenne (lib), palvelinkirjoittaja (functions/lista_yhteenveto.js), debounce (merkki + siivooja), callable. Muistinvarainen Firestore. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const L = require('../lib/tm_lista_yhteenveto.js');
const S = require('../functions/lista_yhteenveto.js');

const SID = 'fcl', NYT = Date.parse('2026-11-12T10:00:00Z');
const FV = { serverTimestamp: () => ({ __ts: true }) };
const PELAAJA = (extra) => Object.assign({ etunimi: 'Aatu', sukunimi: 'Virtanen', numero: 7, pelipaikka: 'KK', joukkueet: ['fcl_u12'], joukkue: 'FCL U12', syntymaVuosi: 2014, sukupuoli: 'M', tki_viimeisin: 4.5, tki_pvm: '2026-09-20', suostumusTila: 'annettu',
  // kenttiä jotka EIVÄT saa päätyä yhteenvetoon
  pin: '123456', _pelaajaPin: 'hash', huoltajaEmail: 'huoltaja@example.com', jaksofokus_historia: [{ a: 1 }], terveys: { x: 1 }, loukkaantuminen: { alue: 'polvi' } }, extra || {});

function mkDb(data, opts) {
  opts = opts || {}; const lue = { n: 0, polut: [] }, kirj = [], poistot = [];
  const st = {}; Object.keys(data).forEach((k) => { st[k] = Object.assign({}, data[k]); });   // matala kopio (toMillis-funktiot säilyvät)
  const alikokoelma = (polku) => { const pre = polku + '/'; return Object.keys(st).filter((k) => k.startsWith(pre) && !k.slice(pre.length).includes('/')).map((k) => ({ id: k.slice(pre.length), ref: ref(k), data: () => st[k], exists: true, updateTime: 'u' })); };
  const ref = (p) => ({ path: p, id: p.split('/').pop(), parent: { parent: { id: p.split('/')[1] } }, collection: (c) => kokoelma(p + '/' + c), get: async () => ({ exists: p in st, data: () => st[p] }), set: async (d) => { kirj.push(['set', p, d]); st[p] = d; }, delete: async () => { poistot.push(p); delete st[p]; } });
  const kokoelma = (p) => ({ limit: () => ({ get: async () => { const d = alikokoelma(p).slice(0, 1); return { docs: d, empty: !d.length }; } }), doc: (i) => ref(p + '/' + i), get: async () => { lue.polut.push(p); const d = alikokoelma(p); lue.n += d.length; return { docs: d }; }, select: () => ({ get: async () => ({ docs: alikokoelma(p) }) }),
    orderBy: () => ({ limit: () => ({ get: async () => ({ docs: alikokoelma(p).slice(0, 1) }) }) }) });
  const db = { collection: (c) => kokoelma(c), batch: () => { const t = []; return { set: (r, d) => t.push(['set', r.path, d]), delete: (r) => t.push(['del', r.path]), commit: async () => { t.forEach((x) => { kirj.push(x); if (x[0] === 'set') st[x[1]] = x[2]; else delete st[x[1]]; }); } }; },
    collectionGroup: (nimi) => ({ limit: () => ({ get: async () => ({ docs: Object.keys(st).filter((k) => k.split('/').slice(-2)[0] === nimi).map((k) => ({ ref: ref(k), data: () => st[k], updateTime: 'u' })) }) }) }) };
  return { db, st, lue, kirj, poistot };
}
const seeds = () => ({
  ['seurat/' + SID]: { nimi: 'FCL' },
  ['seurat/' + SID + '/joukkueet/fcl_u12']: { nimi: 'FCL U12' }, ['seurat/' + SID + '/joukkueet/fcl_u14']: { nimi: 'FCL U14' },
  ['seurat/' + SID + '/pelaajat/p1']: PELAAJA(), ['seurat/' + SID + '/pelaajat/p2']: PELAAJA({ etunimi: 'Bertta', sukunimi: 'Aalto', joukkueet: ['fcl_u12', 'fcl_u14'] }),
  ['seurat/' + SID + '/pelaajat/p3']: PELAAJA({ etunimi: 'Cecil', sukunimi: 'Poissa', arkistoitu: true }),
  ['seurat/' + SID + '/lista_joukkue/vanha_joukkue']: { versio: 1 },
  ['seurat/' + SID + '/pelaajat/p1/sisainen/tiedot']: { adar_vahvin: 'A' }, ['seurat/' + SID + '/pelaajat/p1/terveys/t']: { x: 1 },
});

describe('lib: rivin rakenne ja vartijat', () => {
  it('rivi sisältää listakentät lyhyillä avaimilla; ei PIN:iä, sähköpostia, terveystietoa, historiaa', () => {
    const r = L.tmListaRivi('p1', PELAAJA(), { d1r: 'ok' }); const j = JSON.stringify(r);
    expect(r).toMatchObject({ id: 'p1', e: 'Aatu', s: 'Virtanen', n: 7, pp: 'KK', sv: 2014, sg: 'M', tki: { v: 4.5, pvm: '2026-09-20' }, sut: 'annettu', d1r: 'ok' });
    ['123456', 'hash', 'huoltaja@example.com', 'polvi', 'jaksofokus_historia', 'terveys'].forEach((s) => expect(j).not.toContain(s));
    expect(L.tmListaRikkomukset({ rivit: [r] })).toEqual([]); expect(j.length).toBeLessThan(L.VERSIO && 1200);
  });
  it('jäsenyys tmPelaajanJoukkueet:lla: monen joukkueen pelaaja riville jokaisessa; tuntematon joukkue-id ohitetaan; aakkosjärjestys', () => {
    const P = [{ id: 'p1', data: PELAAJA({ sukunimi: 'Zeta' }) }, { id: 'p2', data: PELAAJA({ sukunimi: 'Aalto', joukkueet: ['fcl_u12', 'fcl_u14', 'ei_ole'] }) }];
    const d = L.tmListaJoukkueDokumentit(P, [{ id: 'fcl_u12', nimi: 'U12' }, { id: 'fcl_u14', nimi: 'U14' }], NYT);
    expect(d.map((x) => [x.id, x.data.n])).toEqual([['fcl_u12', 2], ['fcl_u14', 1]]);
    expect(d[0].data.rivit.map((r) => r.id)).toEqual(['p2', 'p1']); expect(d[0].data.rivit[0].jk).toEqual(['fcl_u12', 'fcl_u14']); expect(d[0].data.versio).toBe(L.VERSIO);
  });
  it('PHV tulee tmPhvKoodi:sta (vain mittauslähteestä), D1/D2-ryhmä tm_nakyma_ryhmat:sta', () => {
    const d = L.tmListaJoukkueDokumentit([{ id: 'p1', data: PELAAJA({ biologinenIka_viimeisin: { phv_tila_koodi: 'PH' } }) }, { id: 'p2', data: PELAAJA({ phv_tila: 'PH' }) }], [{ id: 'fcl_u12', nimi: 'U12' }], NYT).pop().data.rivit;
    expect(d.find((r) => r.id === 'p1').phv).toBe('PH'); expect(d.find((r) => r.id === 'p2').phv).toBeUndefined();   // pikakenttä ilman mittausta = tuntematon
    d.forEach((r) => { expect(typeof r.d1r).toBe('string'); expect(typeof r.d2r).toBe('string'); });
  });
  it('vartija: kielletty avain / sähköpostin näköinen arvo / liian iso rivi → rikkomus', () => {
    expect(L.tmListaRikkomukset({ rivit: [{ pin: '1' }] })).toHaveLength(1); expect(L.tmListaRikkomukset({ rivit: [{ x: 'a@b.fi' }] })).toHaveLength(1);
    expect(L.tmListaRikkomukset({ rivit: [{ x: 'a'.repeat(1300) }] })).toHaveLength(1); expect(L.tmListaKelpaa({ versio: L.VERSIO, rivit: [] })).toBe(true); expect(L.tmListaKelpaa({ versio: 0, rivit: [] })).toBe(false); expect(L.tmListaKelpaa(null)).toBe(false);
  });
});

describe('laskeSeura: kirjoittaja', () => {
  it('lukee vain joukkueet + pelaajat (ei sisainen/terveys), kirjoittaa lista_joukkue per joukkue, poistaa vanhentuneen, ei poistettuja pelaajia', async () => {
    const f = mkDb(seeds()); const r = await S.laskeSeura({ db: f.db, FieldValue: FV }, SID, { nytMs: NYT });
    expect(f.lue.polut.sort()).toEqual(['seurat/fcl/joukkueet', 'seurat/fcl/pelaajat']);   // ei alikokoelmia
    expect(r).toMatchObject({ joukkueita: 2, pelaajia: 2, poistettu: 1 });
    expect(Object.keys(f.st).filter((k) => k.includes('/lista_joukkue/')).sort()).toEqual(['seurat/fcl/lista_joukkue/fcl_u12', 'seurat/fcl/lista_joukkue/fcl_u14']);
    const d = f.st['seurat/fcl/lista_joukkue/fcl_u12']; expect(d.n).toBe(2); expect(d.laskettu).toEqual({ __ts: true });
    const kaikki = JSON.stringify(d); ['123456', 'huoltaja@example.com', 'polvi', 'Poissa'].forEach((s) => expect(kaikki).not.toContain(s));
  });
  it('kuiva-ajo ei kirjoita; kielletty sisältö keskeyttää (heitto) ennen kirjoitusta', async () => {
    const f = mkDb(seeds()); const r = await S.laskeSeura({ db: f.db, FieldValue: FV }, SID, { nytMs: NYT, kuiva: true });
    expect(r.kuiva).toBe(true); expect(f.kirj).toHaveLength(0); expect(r.tavuja).toBeGreaterThan(0);
    const g = mkDb(seeds()); g.st['seurat/fcl/pelaajat/p1'].etunimi = 'vuoto@example.com';
    await expect(S.laskeSeura({ db: g.db, FieldValue: FV }, SID, { nytMs: NYT })).rejects.toThrow(/kiellettyä/); expect(g.kirj).toHaveLength(0);
  });
  it('laskeKaikki: yhden seuran virhe ei kaada muita; aktiivinen:false ohitetaan', async () => {
    const d = Object.assign(seeds(), { 'seurat/rikki': { nimi: 'R' }, 'seurat/pois': { aktiivinen: false } });
    d['seurat/rikki/pelaajat/x'] = { etunimi: 'a@b.fi', joukkueet: ['j'] }; d['seurat/rikki/joukkueet/j'] = { nimi: 'J' };
    const f = mkDb(d), loki = { log() {}, error() {} };
    const r = await S.laskeKaikki({ db: f.db, FieldValue: FV, loki }, { nytMs: NYT });
    expect(r.tulokset.map((x) => x.sid)).toEqual(['fcl']); expect(r.virheet.map((x) => x.sid)).toEqual(['rikki']);
  });
});

describe('callable paivitaListaYhteenveto', () => {
  class HE extends Error { constructor(k, m) { super(m); this.code = k; } }
  const aja = (rooli, f, nyt) => S.paivitaKasittelija({ db: f.db, FieldValue: FV, HttpsError: HE, nyt: () => nyt || NYT, tarkistaOikeus: async () => ({ sallittu: true, rooli }) });
  const ctx = { auth: { uid: 'u1', token: {} } };
  it('sallitut roolit rakentavat; fysiikkavalmentaja/pelaaja ✗; ei kirjautunut ✗; puuttuva seura ✗', async () => {
    for (const rooli of ['vp', 'superadmin', 'talenttivalmentaja', 'valmentaja']) { const f = mkDb(seeds()); expect(await aja(rooli, f)({ seuraId: SID }, ctx)).toMatchObject({ tuore: false, joukkueita: 2 }); }
    await expect(aja('fysiikkavalmentaja', mkDb(seeds()))({ seuraId: SID }, ctx)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(aja('vp', mkDb(seeds()))({ seuraId: SID }, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(aja('vp', mkDb(seeds()))({ seuraId: 'ei' }, ctx)).rejects.toMatchObject({ code: 'not-found' });
  });
  it('30 s jäähy: tuore lista palautetaan sellaisenaan ilman uudelleenrakennusta', async () => {
    const d = seeds(); delete d['seurat/fcl/lista_joukkue/vanha_joukkue']; d['seurat/fcl/lista_joukkue/fcl_u12'] = { laskettu: { toMillis: () => NYT - 10000 } };
    const f = mkDb(d); expect(await aja('vp', f)({ seuraId: SID }, ctx)).toEqual({ tuore: true }); expect(f.kirj).toHaveLength(0);
    expect(await aja('vp', f, NYT + 60000)({ seuraId: SID }, ctx)).toMatchObject({ tuore: false });
  });
});

describe('debounce: merkitse + siivoa', () => {
  const snap = (data) => ({ exists: !!data, data: () => data });
  const muutos = (ennen, jalkeen) => ({ before: snap(ennen), after: snap(jalkeen) }), ctx = { params: { sid: SID, pid: 'p1' } };
  it('merkitsee vain listariviin vaikuttavasta muutoksesta (ei viimeisinKirjautuminen / PIN / kirjausaikaleima)', async () => {
    const f = mkDb({}); const k = S.merkitseKasittelija({ db: f.db, FieldValue: FV });
    await k(muutos(PELAAJA(), PELAAJA({ viimeisinKirjautuminen: 'x', huoltajaViimeisinKaynti: 'y', pin: '999999', jaksofokus_historia: [1, 2, 3] })), ctx); expect(f.kirj).toHaveLength(0); expect(Object.keys(f.st)).toHaveLength(0);
    await k(muutos(PELAAJA(), PELAAJA({ tki_viimeisin: 5.1 })), ctx); expect(f.st['seurat/fcl/lista_likainen/p1']).toEqual({ t: { __ts: true } });
  });
  it('merkitsee luonnin, poiston, arkistoinnin ja joukkueenvaihdon; ei tyhjää (ei ennen eikä jälkeen)', async () => {
    const k = (f) => S.merkitseKasittelija({ db: f.db, FieldValue: FV });
    for (const [e, j] of [[null, PELAAJA()], [PELAAJA(), null], [PELAAJA(), PELAAJA({ arkistoitu: true })], [PELAAJA(), PELAAJA({ joukkueet: ['fcl_u14'] })]]) { const f = mkDb({}); await k(f)(muutos(e, j), ctx); expect(Object.keys(f.st), JSON.stringify([!!e, !!j])).toEqual(['seurat/fcl/lista_likainen/p1']); }
    const f = mkDb({}); await k(f)(muutos(null, null), ctx); expect(Object.keys(f.st)).toHaveLength(0);
  });
  const merkit = (d, ms) => { Object.keys(ms).forEach((pid) => { d['seurat/fcl/lista_likainen/' + pid] = { t: { toMillis: () => ms[pid] } }; }); return d; };
  it('siivooja: odottaa kun merkit tuoreita (hiljaisuus < 30 s ja vanhin < 5 min); rakentaa kun hiljennyt, poistaa nähdyt merkit', async () => {
    const loki = { log() {}, error() {} };
    const f1 = mkDb(merkit(seeds(), { p1: NYT - 5000, p2: NYT - 40000 })); await S.siivoaKasittelija({ db: f1.db, FieldValue: FV, nyt: () => NYT, loki })(); expect(f1.kirj).toHaveLength(0); expect(Object.keys(f1.st).filter((k) => k.includes('likainen'))).toHaveLength(2);
    const f2 = mkDb(merkit(seeds(), { p1: NYT - 31000, p2: NYT - 60000 })); await S.siivoaKasittelija({ db: f2.db, FieldValue: FV, nyt: () => NYT, loki })();
    expect(f2.kirj.length).toBeGreaterThan(0); expect(Object.keys(f2.st).filter((k) => k.includes('likainen'))).toHaveLength(0); expect(f2.st['seurat/fcl/lista_joukkue/fcl_u12']).toBeTruthy();
  });
  it('siivooja: jatkuva myrsky ei estä ikuisesti — vanhin merkki > 5 min pakottaa rakennuksen; virhe jättää merkit paikoilleen', async () => {
    const loki = { log() {}, error() {} };
    const f = mkDb(merkit(seeds(), { p1: NYT - 1000, p2: NYT - 301000 })); await S.siivoaKasittelija({ db: f.db, FieldValue: FV, nyt: () => NYT, loki })(); expect(f.kirj.length).toBeGreaterThan(0);
    const g = mkDb(merkit(seeds(), { p1: NYT - 60000 })); g.st['seurat/fcl/pelaajat/p1'].etunimi = 'vuoto@example.com';
    await S.siivoaKasittelija({ db: g.db, FieldValue: FV, nyt: () => NYT, loki })(); expect(Object.keys(g.st).filter((k) => k.includes('likainen'))).toHaveLength(1);
  });
});

describe('luoFunktiot: kytkentä (firebase-functions-tynkä)', () => {
  it('5 exportia europe-west1:ssä: yöajo 03:30, callable App Checkillä, pelaajan onWrite, minuuttiajastus', () => {
    const kuvaus = (nimi, tiedot) => ({ nimi, ...tiedot });
    const kasi = (acc) => ({
      runWith: (o) => kasi(Object.assign({}, acc, { runWith: o })),
      pubsub: { schedule: (s) => ({ timeZone: (tz) => ({ onRun: (f) => kuvaus('ajastus', Object.assign({}, acc, { s, tz, f })) }) }) },
      https: { onCall: (f) => kuvaus('callable', Object.assign({}, acc, { f })) },
      firestore: { document: (p) => ({ onWrite: (f) => kuvaus('onWrite', Object.assign({}, acc, { p, f })) }) }
    });
    const fn = { region: (r) => kasi({ region: r }) };
    const e = S.luoFunktiot(fn, { db: {}, FieldValue: FV, HttpsError: Error, tarkistaOikeus: async () => ({}) });
    expect(Object.keys(e).sort()).toEqual(['laskeListaYhteenvedot', 'merkitseListaLikaiseksi', 'paivitaListaSeura', 'paivitaListaYhteenveto', 'siivoaListaLikaiset']);
    Object.values(e).forEach((x) => expect(x.region).toBe('europe-west1'));
    expect(e.laskeListaYhteenvedot).toMatchObject({ nimi: 'ajastus', s: '30 3 * * *', tz: 'Europe/Helsinki' });
    expect(e.paivitaListaYhteenveto).toMatchObject({ nimi: 'callable', runWith: { enforceAppCheck: true } });
    expect(e.merkitseListaLikaiseksi).toMatchObject({ nimi: 'onWrite', p: 'seurat/{sid}/pelaajat/{pid}' });
    expect(e.siivoaListaLikaiset).toMatchObject({ nimi: 'ajastus', s: 'every 1 minutes' });
  });
});


/* ═══ lista_seura (Vaihe 0 / seuran lista; Q1–Q8 27.11.2026) ═══ */
describe('lista_seura: lib — rivi ja dokumentit', () => {
  const P = (extra) => PELAAJA(Object.assign({ palloID: '12345678', talenttiOhjelma: true, talenttiTaso: 'perus', lahde: 'excel_tuonti', suostumusTila: 'annettu', pin: '123456' }, extra || {}));
  it('rivi: vain listakentät; PIN ja huoltajan sähköposti VAIN boolean-merkkeinä (pa/hk); ei terveysmerkkiä', () => {
    const r = L.tmListaSeuraRivi('p1', P({ kaytettavyys: 'loukkaantunut', loukkaantuminen_alue: 'polvi', paluu_arvio: '2026-12-01' })), j = JSON.stringify(r);
    expect(r).toMatchObject({ id: 'p1', e: 'Aatu', s: 'Virtanen', jn: 'FCL U12', sv: 2014, pid: '12345678', st: 'annettu', hk: 1, pa: 1, to: 1, tt: 'perus', lh: 'excel_tuonti' });
    ['"123456"', 'huoltaja@example.com', 'polvi', 'loukkaantunut', '2026-12-01', 'kaytettavyys', 'terveys'].forEach((x) => expect(j).not.toContain(x));
    expect(L.tmListaRikkomukset({ rivit: [r] })).toEqual([]);
    expect(L.tmListaRikkomukset({ rivit: [{ ky: 1 }] })).toHaveLength(1); expect(L.tmListaRikkomukset({ rivit: [{ kaytettavyys: true }] })).toHaveLength(1);   // Q3: ei edes boolean
  });
  it('nimetön pelaaja: nimi vain p.nimi:stä, EI koskaan sähköpostista (Seura näyttää "Keskeneräinen kutsu")', () => {
    const r = L.tmListaSeuraRivi('x', { huoltajaEmail: 'a@b.fi', suostumusTila: 'odottaa' }); expect(r.e).toBeUndefined(); expect(r.nm).toBeUndefined(); expect(JSON.stringify(r)).not.toContain('a@b.fi');
    expect(L.tmListaSeuraRivi('y', { nimi: 'Matti M' }).nm).toBe('Matti M');
  });
  it('suostumuskoodi st = Seuran badge-sääntö: peruttu voittaa; annettu (myös suostumus.annettu); pilotti; odottaa/luotu/tuotu; muuten ei_kutsua', () => {
    const t = (p) => L.tmListaSeuraSuostumus(p);
    expect(t({ suostumusTila: 'annettu' })).toBe('annettu'); expect(t({ suostumus: { annettu: {} } })).toBe('annettu');
    expect(t({ suostumusTila: 'annettu', suostumus: { peruttu: {} } })).toBe('peruttu'); expect(t({ suostumusTila: 'peruttu' })).toBe('peruttu'); expect(t({ suostumusTila: 'odottaa', suostumus: { peruttu: {} } })).toBe('peruttu');
    expect(t({ suostumusTila: 'pilotti' })).toBe('pilotti'); expect(t({ suostumusTila: 'odottaa' })).toBe('odottaa'); expect(t({ suostumusTila: 'luotu' })).toBe('odottaa'); expect(t({ tuotu: {} })).toBe('odottaa');
    expect(t({})).toBe('ei_kutsua'); expect(t({ suostumusTila: 'pilotti', tuotu: {} })).toBe('pilotti');
  });
  it('syntymävuosi: Timestamp voittaa (kuten Seuran pelaajaRivi), muuten syntymaVuosi; nv=1 vain kun syntymaVuosi puuttuu/virheellinen (= tmSeuraPuuttuuVuosi)', () => {
    const ts = { toDate: () => new Date(2013, 5, 1) };
    expect(L.tmListaSeuraRivi('a', { syntymaaika: ts, syntymaVuosi: 2012 }).sv).toBe(2013);
    expect(L.tmListaSeuraRivi('b', { syntymaVuosi: 2014 })).toMatchObject({ sv: 2014 }); expect(L.tmListaSeuraRivi('b', { syntymaVuosi: 2014 }).nv).toBeUndefined();
    expect(L.tmListaSeuraRivi('c', {}).nv).toBe(1); expect(L.tmListaSeuraRivi('d', { syntymaVuosi: 'abc' }).nv).toBe(1);
    const T = require('../lib/tm_seura_tuonti.js'); [{}, { syntymaVuosi: 2014 }, { syntymaVuosi: '' }, { syntymaVuosi: 'x' }].forEach((p) => expect(!!L.tmListaSeuraRivi('z', p).nv).toBe(T.tmSeuraPuuttuuVuosi(p)));
  });
  it('dokumentit: ≤ 250 riviä/sivu, _meta viimeisenä, kaikilla sama kierros, laskurit uniikeista; jäsenyys jk; järjestys sukunimi/etunimi/id', () => {
    const joukkueet = [{ id: 'fcl_u12', nimi: 'U12' }, { id: 'fcl_u14', nimi: 'U14' }];
    const pel = []; for (let i = 0; i < 520; i++) pel.push({ id: 'p' + String(i).padStart(4, '0'), data: PELAAJA({ etunimi: 'E' + (i % 7), sukunimi: 'S' + (i % 50), suostumusTila: i % 4 === 0 ? 'annettu' : i % 4 === 1 ? 'pilotti' : i % 4 === 2 ? 'odottaa' : 'peruttu', pin: i % 8 === 0 ? '123456' : undefined, palloID: i % 10 ? String(10000000 + i) : undefined, syntymaVuosi: i % 20 ? 2014 : undefined, joukkueet: i % 3 ? ['fcl_u12'] : ['fcl_u12', 'fcl_u14'] }) });
    const d = L.tmListaSeuraDokumentit(pel, joukkueet, 777);
    expect(d.map((x) => x.id)).toEqual(['s0001', 's0002', 's0003', '_meta']); expect(d.slice(0, 3).map((x) => x.data.n)).toEqual([250, 250, 20]);
    d.forEach((x) => expect(x.data.kierros).toBe(777));
    const m = d[3].data; expect(m).toMatchObject({ n: 520, sivuja: 3 }); expect(m.laskurit).toMatchObject({ kaikki: 520, annettu: 130, pilotti: 130, odottaa: 130, peruttu: 130, ilman_vuotta: 26, ilman_palloid: 52 });
    expect(m.laskurit.ilman_pin).toBe(130 - 65);   // annettu (i%4==0) ja PIN vain i%8==0 → annetuista puolella PIN
    const rivit = d.slice(0, 3).flatMap((x) => x.data.rivit); expect(new Set(rivit.map((r) => r.id)).size).toBe(520);
    for (let i = 1; i < rivit.length; i++) { const a = rivit[i - 1], b = rivit[i]; expect(String(a.s).localeCompare(String(b.s), 'fi') <= 0).toBe(true); }
    expect(rivit.find((r) => r.id === 'p0000').jk).toEqual(['fcl_u12', 'fcl_u14']);
    d.forEach((x) => expect(L.tmListaRikkomukset(x.data)).toEqual([]));
    d.slice(0, 3).forEach((x) => expect(JSON.stringify(x.data).length).toBeLessThan(400000));
  });
  it('tmListaSeuraKelpaa: kaikki tai ei mitään (puuttuva _meta/sivu, vanha versio, eri kierros, väärä rivimäärä → false)', () => {
    const d = L.tmListaSeuraDokumentit([{ id: 'a', data: PELAAJA() }, { id: 'b', data: PELAAJA({ sukunimi: 'Aalto' }) }], [], 5);
    const o = () => { const k = {}; d.forEach((x) => { k[x.id] = JSON.parse(JSON.stringify(x.data)); }); return k; };
    expect(L.tmListaSeuraKelpaa(o())).toBe(true); expect(L.tmListaSeuraKelpaa(null)).toBe(false); expect(L.tmListaSeuraKelpaa({})).toBe(false);
    let k = o(); delete k._meta; expect(L.tmListaSeuraKelpaa(k)).toBe(false);
    k = o(); delete k.s0001; expect(L.tmListaSeuraKelpaa(k)).toBe(false);
    k = o(); k._meta.versio = 0; expect(L.tmListaSeuraKelpaa(k)).toBe(false);
    k = o(); k.s0001.kierros = 4; expect(L.tmListaSeuraKelpaa(k)).toBe(false);
    k = o(); k.s0001.rivit.pop(); expect(L.tmListaSeuraKelpaa(k)).toBe(false);
    expect(L.tmListaSeuraKelpaa(JSON.parse(JSON.stringify({ _meta: L.tmListaSeuraDokumentit([], [], 1)[0].data })))).toBe(true);   // tyhjä seura: 0 sivua, _meta riittää
  });
});

describe('lista_seura: palvelin — kirjoitus, poisto, kuiva-ajo', () => {
  const lisaa = (d) => Object.assign(d, { ['seurat/' + SID + '/pelaajat/p1']: PELAAJA({ palloID: '1', suostumusTila: 'annettu' }), ['seurat/' + SID + '/pelaajat/p2']: PELAAJA({ etunimi: 'Bertta', sukunimi: 'Aalto', suostumusTila: 'pilotti' }) });
  it('kirjoittaa lista_seura: sivut ennen _metaa, yhteinen kierros, ei arkistoituja, ei PIN/sähköposti/terveys; poistaa ylimääräiset vanhat sivut', async () => {
    const d = lisaa(seeds()); d['seurat/fcl/lista_seura/s0009'] = { versio: 1 }; d['seurat/fcl/lista_seura/_meta'] = { versio: 1, kierros: 1, n: 0, sivuja: 0, laskurit: {} };
    const f = mkDb(d); const r = await S.laskeSeura({ db: f.db, FieldValue: FV }, SID, { nytMs: NYT });
    expect(f.lue.polut.sort()).toEqual(['seurat/fcl/joukkueet', 'seurat/fcl/pelaajat']);   // yksi pelaajaluku molemmille listoille
    expect(r).toMatchObject({ seuraSivuja: 1 }); expect(Object.keys(f.st).filter((k) => k.includes('/lista_seura/')).sort()).toEqual(['seurat/fcl/lista_seura/_meta', 'seurat/fcl/lista_seura/s0001']);
    const kirj = f.kirj.map((x) => x[1]).filter((p) => p.includes('/lista_seura/')); expect(kirj.indexOf('seurat/fcl/lista_seura/s0001')).toBeLessThan(kirj.indexOf('seurat/fcl/lista_seura/_meta'));
    const m = f.st['seurat/fcl/lista_seura/_meta'], s1 = f.st['seurat/fcl/lista_seura/s0001']; expect(m).toMatchObject({ n: 2, sivuja: 1, kierros: NYT, laskurit: { kaikki: 2, annettu: 1, pilotti: 1 } }); expect(s1.kierros).toBe(NYT); expect(m.laskettu).toEqual({ __ts: true });
    const kaikki = JSON.stringify([m, s1]); ['123456', 'hash', 'huoltaja@example.com', 'polvi', 'Poissa'].forEach((x) => expect(kaikki).not.toContain(x));
    const k = {}; ['_meta', 's0001'].forEach((id) => { k[id] = f.st['seurat/fcl/lista_seura/' + id]; }); expect(L.tmListaSeuraKelpaa(k)).toBe(true);
  });
  it('kuiva-ajo: ei kirjoita, raportoi sivut + laskurit; lista_seura-vartija heittää (kuiva)', async () => {
    const f = mkDb(lisaa(seeds())); const r = await S.laskeSeura({ db: f.db, FieldValue: FV }, SID, { nytMs: NYT, kuiva: true });
    expect(f.kirj).toHaveLength(0); expect(r).toMatchObject({ kuiva: true, seuraSivuja: 1, seuraLaskurit: { kaikki: 2 } });
  });
  it('lista_seura-virhe ei estä lista_joukkue-kirjoitusta (tuotannon lista_joukkue ei kaadu), mutta virhe heitetään', async () => {
    const f = mkDb(lisaa(seeds())), LF = require('../functions/tm_lista_yhteenveto.js'), vanha = LF.tmListaSeuraDokumentit;   // palvelin käyttää functions/-kopiota
    LF.tmListaSeuraDokumentit = () => { throw new Error('rikki'); };
    try { await expect(S.laskeSeura({ db: f.db, FieldValue: FV }, SID, { nytMs: NYT })).rejects.toThrow('rikki'); } finally { LF.tmListaSeuraDokumentit = vanha; }
    expect(f.st['seurat/fcl/lista_joukkue/fcl_u12']).toBeTruthy(); expect(Object.keys(f.st).some((k) => k.includes('/lista_seura/'))).toBe(false);
  });
});

describe('callable paivitaListaSeura', () => {
  class HE extends Error { constructor(k, m) { super(m); this.code = k; } }
  const aja = (rooli, f, nyt) => S.paivitaSeuraKasittelija({ db: f.db, FieldValue: FV, HttpsError: HE, nyt: () => nyt || NYT, tarkistaOikeus: async () => ({ sallittu: true, rooli }) });
  const ctx = { auth: { uid: 'u1', token: {} } };
  it('vain johto (vp, urheilutoimenjohtaja, seurasihteeri) + SA; valmentaja, talenttivalmentaja, fysiikkavalmentaja ✗ (Q1); ei kirjautunut ✗; puuttuva seura ✗', async () => {
    for (const rooli of ['vp', 'urheilutoimenjohtaja', 'seurasihteeri', 'superadmin', 'super_admin']) expect(await aja(rooli, mkDb(seeds()))({ seuraId: SID }, ctx)).toMatchObject({ tuore: false, pelaajia: 2 });
    for (const rooli of ['valmentaja', 'talenttivalmentaja', 'fysiikkavalmentaja', 'pelaaja']) await expect(aja(rooli, mkDb(seeds()))({ seuraId: SID }, ctx)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(S.paivitaSeuraKasittelija({ db: mkDb(seeds()).db, FieldValue: FV, HttpsError: HE, tarkistaOikeus: async () => ({ sallittu: false }) })({ seuraId: SID }, ctx)).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(aja('vp', mkDb(seeds()))({ seuraId: SID }, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(aja('vp', mkDb(seeds()))({ seuraId: 'ei' }, ctx)).rejects.toMatchObject({ code: 'not-found' }); await expect(aja('vp', mkDb(seeds()))({}, ctx)).rejects.toMatchObject({ code: 'invalid-argument' });
  });
  it('30 s jäähy; MUTTA odottava likainen-merkki (Excel-tuonti) pakottaa uudelleenkoosteen ja merkki siivotaan (Q8)', async () => {
    const d = seeds(); d['seurat/fcl/lista_seura/_meta'] = { laskettu: { toMillis: () => NYT - 10000 } };
    const f = mkDb(d); expect(await aja('vp', f)({ seuraId: SID }, ctx)).toEqual({ tuore: true }); expect(f.kirj).toHaveLength(0);
    d['seurat/fcl/lista_likainen/p1'] = { t: { toMillis: () => NYT - 5000 } };
    const g = mkDb(d); expect(await aja('vp', g)({ seuraId: SID }, ctx)).toMatchObject({ tuore: false }); expect(g.kirj.length).toBeGreaterThan(0); expect(Object.keys(g.st).some((k) => k.includes('lista_likainen'))).toBe(false);
  });
});

describe('lista_seura: debounce-merkki huomaa seuran rivin muutokset', () => {
  const snap = (data) => ({ exists: !!data, data: () => data });
  const muutos = (e, j) => ({ before: snap(e), after: snap(j) }), ctx = { params: { sid: SID, pid: 'p1' } };
  it('merkitsee: PIN asetettu, huoltajan sähköposti lisätty, suostumus peruttu, PalloID, lähde, talenttiaika; ei: kirjautumisaikaleima', async () => {
    const A = PELAAJA({ pin: undefined, huoltajaEmail: undefined, palloID: undefined });
    for (const j of [Object.assign({}, A, { pin: '123456' }), Object.assign({}, A, { huoltajaEmail: 'x@y.fi' }), Object.assign({}, A, { suostumus: { peruttu: { aika: 1 } } }), Object.assign({}, A, { palloID: '99' }), Object.assign({}, A, { lahde: 'kutsu' }), Object.assign({}, A, { talenttiAlku: '2026-01-01' }), Object.assign({}, A, { suostumusTila: 'peruttu' })]) {
      const f = mkDb({}); await S.merkitseKasittelija({ db: f.db, FieldValue: FV })(muutos(A, j), ctx); expect(Object.keys(f.st), JSON.stringify(Object.keys(j).slice(-1))).toEqual(['seurat/fcl/lista_likainen/p1']);
    }
    const f = mkDb({}); await S.merkitseKasittelija({ db: f.db, FieldValue: FV })(muutos(A, Object.assign({}, A, { viimeisinKirjautuminen: 'x' })), ctx); expect(Object.keys(f.st)).toHaveLength(0);
  });
});
