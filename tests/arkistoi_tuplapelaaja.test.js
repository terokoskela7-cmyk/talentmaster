/** PR 2d: arkistoi_tuplapelaaja — puhdas suunnittelu + kirjoitusturvat (ei tuotantoyhteyttä). */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const S = require('../scripts/arkistoi_tuplapelaaja.js');
const j = (sid, pid, d, alikok) => ({ sid, pid, d: Object.assign({ nimi: 'Matti Meikalainen', tunniste: '555' }, d), alikok });
const ei = () => false;
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
  const mk = (alikok, data) => {
    const kirj = []; const ref = { _r: 1 };
    const col = (n) => ({ select: () => ({ get: async () => ({ size: n }) }) });
    const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => Object.assign(ref, { listCollections: async () => (alikok ? [col(alikok)] : []) }) }) }) }),
      runTransaction: async (fn) => fn({ get: async () => ({ exists: !!data, data: () => data }), update: (_r, u) => kirj.push(u) }) };
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
  it('B ei enää aktiivinen / tunniste muuttunut / dokumenttia ei ole → ei kirjoiteta', async () => {
    for (const d of [{ tunniste: '555', tila: 'arkistoitu' }, { tunniste: '999' }, null]) { const { db, kirj } = mk(0, d); await expect(S.kirjoita(db, FV, e)).rejects.toThrow(); expect(kirj).toEqual([]); }
  });
  it('vartijat: require ei avaa yhteyttä; kuiva-ajo oletus (--aja tarvitaan kirjoitukseen)', () => {
    const src = readFileSync(new URL('../scripts/arkistoi_tuplapelaaja.js', import.meta.url), 'utf8');
    expect(src).toContain("indexOf('--aja') >= 0"); expect(src).toContain('require.main === module'); expect(src).not.toMatch(/\.delete\(/);
  });
});
