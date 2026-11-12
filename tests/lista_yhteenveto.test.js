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
  const kokoelma = (p) => ({ doc: (i) => ref(p + '/' + i), get: async () => { lue.polut.push(p); const d = alikokoelma(p); lue.n += d.length; return { docs: d }; }, select: () => ({ get: async () => ({ docs: alikokoelma(p) }) }),
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
  it('4 exportia europe-west1:ssä: yöajo 03:30, callable App Checkillä, pelaajan onWrite, minuuttiajastus', () => {
    const kuvaus = (nimi, tiedot) => ({ nimi, ...tiedot });
    const kasi = (acc) => ({
      runWith: (o) => kasi(Object.assign({}, acc, { runWith: o })),
      pubsub: { schedule: (s) => ({ timeZone: (tz) => ({ onRun: (f) => kuvaus('ajastus', Object.assign({}, acc, { s, tz, f })) }) }) },
      https: { onCall: (f) => kuvaus('callable', Object.assign({}, acc, { f })) },
      firestore: { document: (p) => ({ onWrite: (f) => kuvaus('onWrite', Object.assign({}, acc, { p, f })) }) }
    });
    const fn = { region: (r) => kasi({ region: r }) };
    const e = S.luoFunktiot(fn, { db: {}, FieldValue: FV, HttpsError: Error, tarkistaOikeus: async () => ({}) });
    expect(Object.keys(e).sort()).toEqual(['laskeListaYhteenvedot', 'merkitseListaLikaiseksi', 'paivitaListaYhteenveto', 'siivoaListaLikaiset']);
    Object.values(e).forEach((x) => expect(x.region).toBe('europe-west1'));
    expect(e.laskeListaYhteenvedot).toMatchObject({ nimi: 'ajastus', s: '30 3 * * *', tz: 'Europe/Helsinki' });
    expect(e.paivitaListaYhteenveto).toMatchObject({ nimi: 'callable', runWith: { enforceAppCheck: true } });
    expect(e.merkitseListaLikaiseksi).toMatchObject({ nimi: 'onWrite', p: 'seurat/{sid}/pelaajat/{pid}' });
    expect(e.siivoaListaLikaiset).toMatchObject({ nimi: 'ajastus', s: 'every 1 minutes' });
  });
});
