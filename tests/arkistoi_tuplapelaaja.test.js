/** PR 2d: arkistoi_tuplapelaaja — puhdas suunnittelu + kirjoitusturvat (ei tuotantoyhteyttä). */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const S = require('../scripts/arkistoi_tuplapelaaja.js');
const V = require('../scripts/diag_e6_vertailu.js');
const D = require('../scripts/e6_datamaara.js');
const j = (sid, pid, d, alikok) => ({ sid, pid, d: Object.assign({ nimi: 'Matti Meikalainen', tunniste: '555' }, d), alikok });
const ei = () => false;

/** Minimaalinen Firestore-vale: seurat/{sid}/pelaajat/{pid}.kolls = {alikokoelma: n}; seurat/{sid}.tapahtumat = {tid: [pid,…]} (testitapahtumat/{tid}/tulokset/{pid}). */
function fakeDb(data) {
  const sget = (sid) => data.seurat[sid] || { pelaajat: {}, tapahtumat: {} };
  const kol = (n) => ({ select: () => ({ get: async () => ({ size: n, docs: Array.from({ length: n }, (_, i) => ({ id: 'd' + i })) }) }) });
  const pel = (sid, pid) => ({ id: pid, collection: (c) => ({ count: () => ({ get: async () => ({ data: () => ({ count: ((((sget(sid).pelaajat || {})[pid] || {}).kolls || {})[c]) || 0 }) }) }) }), listCollections: async () => Object.keys(((sget(sid).pelaajat || {})[pid] || {}).kolls || {}).map((k) => Object.assign({ id: k }, kol(sget(sid).pelaajat[pid].kolls[k]))) });
  return { collection: () => ({ doc: (sid) => ({ collection: (c) => c === 'pelaajat'
    ? { doc: (pid) => pel(sid, pid) }
    : { select: () => ({ get: async () => ({ docs: Object.keys(sget(sid).tapahtumat || {}).map((id) => ({ id })) }) }),
        doc: (tid) => ({ collection: () => ({ doc: (pid) => ({ get: async () => ({ exists: ((sget(sid).tapahtumat || {})[tid] || []).indexOf(pid) >= 0 }) }) }) }) } }) }) };
}
describe('arkistoi_tuplapelaaja · suunnittele', () => {
  it('2 aktiivista samannimistä: A dataa, B 0 → ehdokas (B arkistoidaan)', () => {
    const s = S.suunnittele([{ jasenet: [j('x', 'a', {}, 7), j('x', 'b', {}, 0)] }], ei);
    expect(s.ehdokkaat.length).toBe(1); expect(s.ehdokkaat[0].B.pid).toBe('b'); expect(s.ehdokkaat[0].A.pid).toBe('a');
    const kaanteinen = S.suunnittele([{ jasenet: [j('x', 'b', {}, 0), j('x', 'a', {}, 7)] }], ei); expect(kaanteinen.ehdokkaat[0].B.pid).toBe('b');
  });
  it('ohitetaan: molemmilla dataa / ei kummallakaan / eri nimi / 3 dokumenttia / ei-aktiivinen / §10-testipelaaja', () => {
    const r = (jasenet, testi) => S.suunnittele([{ jasenet }], testi || ei);
    expect(r([j('x', 'a', {}, 3), j('x', 'b', {}, 1)]).epaselvat.ilmanEroa).toBe(1);
    expect(r([j('x', 'a', {}, 0), j('x', 'b', {}, 0)]).epaselvat.ilmanEroa).toBe(1);
    expect(r([j('x', 'a', {}, 3), j('x', 'b', { nimi: 'Eri Henkilo' }, 0)]).epaselvat.eriNimi).toBe(1);
    expect(r([j('x', 'a', {}, 3), j('x', 'b', {}, 0), j('y', 'c', {}, 0)]).epaselvat.muuKoko).toBe(1);
    expect(r([j('x', 'a', {}, 3), j('x', 'b', { tila: 'arkistoitu' }, 0)]).epaselvat.eiAktiivisia).toBe(1);
    expect(r([j('x', 'a', {}, 3), j('x', 'b', {}, 0)], (pid) => pid === 'a').epaselvat.testipelaaja).toBe(1);
    ['ilmanEroa', 'eriNimi', 'muuKoko', 'eiAktiivisia', 'testipelaaja'].forEach(() => {});
    expect(r([j('x', 'a', {}, 3), j('x', 'b', { tila: 'arkistoitu' }, 0)]).ehdokkaat.length).toBe(0);
  });
  it('raportti: vain lukuja; kutsut/PIN lukuna; ehdokkaita > 1 → varoitus; ei nimiä/id:itä', () => {
    const s = S.suunnittele([{ jasenet: [j('x', 'idA', {}, 7), j('x', 'idB', {}, 0)] }], ei); s.ryhmia = 1;
    const t = S.raportti(s, false, null, [{ kutsut: 1, huoltajakutsut: 0, pin: 1 }]);
    expect(t).toContain('KUIVA-AJO'); expect(t).toContain('kutsuja 1'); expect(t).toContain('PIN-linkkejä 1');
    ['Meikalainen', 'idA', 'idB', '555'].forEach((x) => expect(t).not.toContain(x));
  });
});
describe('arkistoi_tuplapelaaja · kirjoita (turvat)', () => {
  const FV = { serverTimestamp: () => 'TS' };
  const mk = (alikok, data, terveys) => {
    const kirj = []; const db = fakeDb({ seurat: { x: { pelaajat: { b: { kolls: Object.assign(alikok ? { havainnot: alikok } : {}, terveys ? { terveys } : {}) } }, tapahtumat: {} } } });
    const base = db.runTransaction; db.runTransaction = async (fn) => fn({ get: async () => ({ exists: !!data, data: () => data }), update: (_r, u) => kirj.push(u) }); void base;
    return { db, kirj };
  };
  const e = { B: { sid: 'x', pid: 'b', tunniste: '555' } };
  it('kirjoittaa vakiintuneet arkistointikentät (tila, arkistoitu, arkistoija_uid), ei poistoa', async () => {
    const { db, kirj } = mk(0, { tunniste: '555' }); await S.kirjoita(db, FV, e);
    expect(kirj).toEqual([{ tila: 'arkistoitu', arkistoitu: 'TS', arkistoija_uid: null }]);
  });
  it('B:ssä on nyt alikokoelmadokumentteja → ei kirjoiteta', async () => {
    const { db, kirj } = mk(2, { tunniste: '555' }); await expect(S.kirjoita(db, FV, e)).rejects.toThrow(/ei kirjoiteta/); expect(kirj).toEqual([]);
  });
  it('TERVEYS-ESTO: B:llä terveys/-dokumentteja (count > 0) → ei kirjoiteta, vaikka muita alikokoelmia ei ole', async () => {
    const { db, kirj } = mk(0, { tunniste: '555' }, 3); await expect(S.kirjoita(db, FV, e)).rejects.toThrow(/terveys.*ei kirjoiteta/); expect(kirj).toEqual([]);
    const ok = mk(0, { tunniste: '555' }, 0); await S.kirjoita(ok.db, FV, e); expect(ok.kirj.length).toBe(1);
  });
  it('B ei enää aktiivinen / tunniste muuttunut / dokumenttia ei ole → ei kirjoiteta', async () => {
    for (const d of [{ tunniste: '555', tila: 'arkistoitu' }, { tunniste: '999' }, null]) { const { db, kirj } = mk(0, d); await expect(S.kirjoita(db, FV, e)).rejects.toThrow(); expect(kirj).toEqual([]); }
  });
  it('vartijat: require ei avaa yhteyttä; kuiva-ajo oletus (--aja tarvitaan kirjoitukseen)', () => {
    const src = readFileSync(new URL('../scripts/arkistoi_tuplapelaaja.js', import.meta.url), 'utf8');
    expect(src).toContain("indexOf('--aja') >= 0"); expect(src).toContain('require.main === module'); expect(src).not.toMatch(/\.delete\(/);
  });
});

describe('E6: vertailu ja arkistointi laskevat saman (jaettu e6_datamaara)', () => {
  const db = fakeDb({ seurat: { x: {
    pelaajat: { a: { kolls: { testitulokset: 2, terveys: 5 } }, b: { kolls: { terveys: 4 } }, c: { kolls: {} }, d: { kolls: { jokuMuu: 1 } } },
    tapahtumat: { t1: ['c'], t2: ['c', 'a'] } } } });
  it('sama luku: vertailun tiivistelmä (alikYht) = arkistoinnin alikokoelmat() kaikille tapauksille', async () => {
    for (const pid of ['a', 'b', 'c', 'd']) {
      const t = await V.tiivista(db, 'x', pid, {}); expect(t.alikYht).toBe(await S.alikokoelmat(db, 'x', pid));
    }
  });
  it('laskee testitapahtumat/*/tulokset/{pid} ja kaikki alikokoelmat, ei terveys/', async () => {
    expect((await D.datamaara(db, 'x', 'a')).yht).toBe(3);   // testitulokset 2 + tulokset(t2) 1; terveys ohitetaan
    expect((await D.datamaara(db, 'x', 'b')).yht).toBe(0);   // vain terveys → 0
    expect((await D.datamaara(db, 'x', 'c')).yht).toBe(2);   // vain tapahtumatulokset (ennen: 0 molemmissa skripteissä)
    expect((await D.datamaara(db, 'x', 'd')).yht).toBe(1);   // tuntematon alikokoelma lasketaan (ennen vain arkistointi)
  });
  it('sama ryhmä → sama A/B-päätös: vertailun A = arkistoinnin A, eikä "ei dataeroa" kun toisella on tapahtumatuloksia', async () => {
    const ryhma = []; for (const pid of ['b', 'c']) ryhma.push({ sid: 'x', pid, d: { nimi: 'Matti Meikalainen', tunniste: '1' }, alikok: await S.alikokoelmat(db, 'x', pid) });
    const s = S.suunnittele([{ jasenet: ryhma }], ei); expect(s.ehdokkaat.length).toBe(1); expect(s.ehdokkaat[0].A.pid).toBe('c'); expect(s.ehdokkaat[0].B.pid).toBe('b');
    const tv = []; for (const pid of ['b', 'c']) tv.push(await V.tiivista(db, 'x', pid, { nimi: 'Matti' })); tv.sort((p, q) => q.pisteet - p.pisteet);
    expect(tv[0].alikYht).toBe(ryhma.find((x) => x.pid === 'c').alikok);
  });
});

describe('E6: yhteinen ryhmittely + erittely + terveys raportissa', () => {
  const pe = (sid, pid, d) => ({ sid, pid, d: Object.assign({ nimi: 'Matti Meikalainen', tunniste: '555' }, d) });
  const lista = [pe('x', 'a', {}), pe('x', 'b', {}), pe('y', 'c', {}), pe('x', 'd', { nimi: 'Eri Henkilo' }), pe('x', 'e', { tila: 'arkistoitu' }), pe('z', 'f', {}), pe('z', 'g', { palloId: '555', tunniste: undefined }), pe('w', 'h', { nimi: '' }), pe('w', 'i', { nimi: '' })];
  const db = fakeDb({ seurat: { x: { pelaajat: { a: { kolls: { havainnot: 2 } }, b: { kolls: { terveys: 1 } } }, tapahtumat: {} }, z: { pelaajat: {}, tapahtumat: {} } } });
  it('molemmat skriptit valitsevat saman ryhmän: sama seura + nimi + tunniste, aktiiviset; ei yli seurojen / eri nimellä / arkistoitua', async () => {
    const jaettu = D.ryhmittele(lista).map((g) => g.sid + ':' + g.jasenet.map((m) => m.pid).sort().join(','));
    expect(jaettu).toEqual(['x:a,b', 'z:f,g']);
    const arkisto = (await S.ryhmat(db, lista)).map((g) => g.jasenet[0].sid + ':' + g.jasenet.map((m) => m.pid).sort().join(','));
    const aineisto = { seurat: ['x', 'y', 'z', 'w'].map((sid) => ({ sid, kokoelmat: { pelaajat: lista.filter((p) => p.sid === sid).map((p) => Object.assign({ _id: p.pid }, p.d)) } })) };
    const vertailu = V.ryhmat(aineisto).map((g) => g.sid + ':' + g.jasenet.map((m) => m.pid).sort().join(','));
    expect(arkisto).toEqual(jaettu); expect(vertailu).toEqual(jaettu);
  });
  it('raportti: alikokoelmakohtainen erittely myös ohitetuille ryhmille; terveys lukuna; ei nimiä/id:itä', async () => {
    const rr = await S.ryhmat(db, lista.slice(0, 2)), s = S.suunnittele(rr, ei); s.ryhmia = rr.length;
    expect(s.ehdokkaat.length).toBe(1); expect(s.ehdokkaat[0].B.terveys).toBe(1);
    const t = S.raportti(s, true, 0, null);
    expect(t).toMatch(/ryhmä 1 \[ehdokas\]/); expect(t).toMatch(/A \(seura x\): yht\. 2 · havainnot 2, testitapahtumat\/\*\/tulokset 0 · terveys 0/); expect(t).toMatch(/B \(seura x\): yht\. 0 .* terveys 1/); expect(t).toContain('terveys-esto');
    ['Meikalainen', '555'].forEach((x) => expect(t).not.toContain(x));
    const ero = S.suunnittele([{ jasenet: [{ sid: 'x', pid: 'a', d: lista[0].d, alikok: 0, alik: {}, terveys: 0 }, { sid: 'x', pid: 'b', d: lista[1].d, alikok: 0, alik: {}, terveys: 0 }] }], ei);
    expect(S.raportti(Object.assign(ero, { ryhmia: 1 }), false, null, null)).toMatch(/\[ei dataeroa\]/);
  });
});
