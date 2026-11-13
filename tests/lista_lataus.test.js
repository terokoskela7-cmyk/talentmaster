/* Vaihe 0 B.4 PR 2 — lista_joukkue-lataaja: kaikki tai ei mitään, lukumäärä, dedup, oletusnäkymä, aikaleima. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const L = require('../lib/tm_lista_yhteenveto.js');
const T = require('../lib/tm_lista_lataus.js');

function fake(docs) {
  const lukuja = { kt: 0 };
  const col = { doc: (id) => ({ get: async () => { lukuja.kt++; const d = docs[id]; return { exists: !!d, data: () => d }; } }), get: async () => { lukuja.kt += Object.keys(docs).length; return { docs: Object.keys(docs).map((id) => ({ id, data: () => docs[id] })) }; } };
  return { lukuja, db: { collection: () => ({ doc: () => ({ collection: () => col }) }) } };
}
const rivi = (id, jk, o) => Object.assign({ id, e: id, s: id, jk }, o || {});
const dok = (jid, rivit, laskettu) => ({ jid, nimi: jid, versio: L.VERSIO, n: rivit.length, rivit, laskettu: laskettu == null ? undefined : { toMillis: () => laskettu } });

describe('tmListaLataa', () => {
  const docs = () => ({ a: dok('a', [rivi('p1', ['a']), rivi('p2', ['a', 'b'])], 2000), b: dok('b', [rivi('p2', ['a', 'b']), rivi('p3', ['b'], { to: 1 })], 1000) });
  it('kaikki: yksi luku/dokumentti, dedup, vanhin laskettu', async () => {
    const f = fake(docs()), r = await T.tmListaLataa(f.db, 's', null, { tunnetut: ['a', 'b'] });
    expect(r.ok).toBe(true); expect(r.pelaajat.map((p) => p.id).sort()).toEqual(['p1', 'p2', 'p3']); expect(r.laskettuMs).toBe(1000); expect(f.lukuja.kt).toBe(2); expect(r.pelaajat.every((p) => p._lista)).toBe(true);
  });
  it('joukkuekohtainen: vain pyydetyt luetaan', async () => {
    const f = fake(docs()), r = await T.tmListaLataa(f.db, 's', ['b']); expect(r.ok).toBe(true); expect(f.lukuja.kt).toBe(1); expect(r.pelaajat.map((p) => p.id).sort()).toEqual(['p2', 'p3']);
  });
  it('puuttuva dokumentti → ok:false (ei osittaista listaa)', async () => {
    expect((await T.tmListaLataa(fake({ a: docs().a }).db, 's', null, { tunnetut: ['a', 'b'] })).ok).toBe(false);
    expect((await T.tmListaLataa(fake(docs()).db, 's', ['a', 'x'])).syy).toBe('puuttuu:x');
  });
  it('vanha versio / rikkinäinen / tyhjä → ok:false', async () => {
    const d = docs(); d.b.versio = 1; expect((await T.tmListaLataa(fake(d).db, 's', null, { tunnetut: ['a', 'b'] })).syy).toBe('versio:b');
    const e = docs(); delete e.a.rivit; expect((await T.tmListaLataa(fake(e).db, 's', ['a'])).ok).toBe(false);
    expect((await T.tmListaLataa(fake({}).db, 's', null)).syy).toBe('tyhja'); expect((await T.tmListaLataa(fake(docs()).db, 's', [])).ok).toBe(false);
  });
  it('luvun virhe → ok:false (kutsuja putoaa vanhaan polkuun, virhe ei katoa)', async () => {
    const db = { collection: () => ({ doc: () => ({ collection: () => ({ get: async () => { const e = new Error('x'); e.code = 'permission-denied'; throw e; } }) }) }) };
    const r = await T.tmListaLataa(db, 's', null); expect(r.ok).toBe(false); expect(r.syy).toBe('luku:permission-denied');
  });
  it('oletusnäkymä: oma joukkue + talenttiohjelma', async () => {
    const r = await T.tmListaLataa(fake(docs()).db, 's', null); expect(T.tmListaOletusNakyma(r.pelaajat, ['a']).map((p) => p.id).sort()).toEqual(['p1', 'p2', 'p3']);
    expect(T.tmListaOletusNakyma(r.pelaajat, ['x']).map((p) => p.id)).toEqual(['p3']);
  });
  it('päivitetty-teksti: tänään hh:mm, muuten pv.kk. hh:mm; tyhjä ilman aikaa', () => {
    const nyt = Date.parse('2026-11-12T10:00:00Z'); expect(T.tmListaPaivitettyTeksti(Date.parse('2026-11-12T01:30:00Z'), nyt)).toBe('03:30'); expect(T.tmListaPaivitettyTeksti(Date.parse('2026-11-10T09:05:00Z'), nyt)).toBe('10.11. 11:05'); expect(T.tmListaPaivitettyTeksti(null, nyt)).toBe('');
  });
});
