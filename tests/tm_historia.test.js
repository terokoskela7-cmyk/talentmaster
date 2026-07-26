import { describe, it, expect } from 'vitest';
import H from '../lib/tm_historia.js';

describe('tm_historia — snapshot (vain mitatut avaimet, §26)', () => {
  it('tmHhSnapshot ottaa vain olemassa olevat numeeriset raaka-avaimet', () => {
    // Sibbo-tyyppi: kasirata + lin30m, ei cmj/mas
    const s = H.tmHhSnapshot('2025-05-10', { hv: { lin30m: 5.33, kasirata: 7.60, cmj: null, mas: undefined } });
    expect(s).toEqual({ pvm: '2025-05-10', lin30m: 5.33, kasirata: 7.60 });
    expect('cmj' in s).toBe(false);
    expect('mas' in s).toBe(false);
  });

  it('tmHhSnapshot ottaa tasot vain jos numeerisia', () => {
    const s = H.tmHhSnapshot('2025-05-10', { hh_taso: 3.2, d1_taso: 2.8, d2_taso: null, hv: { lin10m: 2.01 } });
    expect(s).toEqual({ pvm: '2025-05-10', hh_taso: 3.2, d1_taso: 2.8, lin10m: 2.01 });
    expect('d2_taso' in s).toBe(false);
  });

  it('tmHhSnapshot: SJK-tyyppi (10m/30m/cmj/sm_juoksu/sm_pallo) — testijoukko-agnostinen', () => {
    const s = H.tmHhSnapshot('2024-11-01', { hv: { lin10m: 1.9, lin30m: 4.6, cmj: 34, sm_juoksu: 3.1, sm_pallo: 3.7 } });
    expect(s).toEqual({ pvm: '2024-11-01', lin10m: 1.9, lin30m: 4.6, cmj: 34, sm_juoksu: 3.1, sm_pallo: 3.7 });
  });

  it('tmHhSnapshot ei fabrikoi nulleja tyhjästä', () => {
    expect(H.tmHhSnapshot('2025-01-01', {})).toEqual({ pvm: '2025-01-01' });
    expect(H.tmHhSnapshot('2025-01-01')).toEqual({ pvm: '2025-01-01' });
  });

  it('tmHhSnapshot hylkää ei-numeeriset (string) arvot', () => {
    const s = H.tmHhSnapshot('2025-01-01', { hv: { lin30m: '5.3', cmj: NaN, mas: Infinity, kasirata: 7.1 } });
    expect(s).toEqual({ pvm: '2025-01-01', kasirata: 7.1 });
  });

  it('tmTkiSnapshot ottaa tki + kaikki numeeriset per-laji-avaimet', () => {
    const s = H.tmTkiSnapshot('2025-04-01', { tki: 62, tkLajit: { ponnauttelu: 9.0, syotto: 44.1, pujottelu: null, kokonaistulos: 120.5 } });
    expect(s).toEqual({ pvm: '2025-04-01', tki: 62, ponnauttelu: 9.0, syotto: 44.1, kokonaistulos: 120.5 });
  });

  it('tmTkiSnapshot ilman tki:tä (vain lajit)', () => {
    expect(H.tmTkiSnapshot('2025-04-01', { tkLajit: { syotto: 40 } })).toEqual({ pvm: '2025-04-01', syotto: 40 });
  });
});

describe('tm_historia — tmHistoriaLisaa (upsert · lajittelu · katko · idempotentti)', () => {
  it('lisää uuden pisteen ja lajittelee pvm nousevaan', () => {
    let arr = [];
    arr = H.tmHistoriaLisaa(arr, { pvm: '2025-05-01', lin30m: 5.5 });
    arr = H.tmHistoriaLisaa(arr, { pvm: '2024-11-01', lin30m: 5.7 });
    arr = H.tmHistoriaLisaa(arr, { pvm: '2025-02-01', lin30m: 5.6 });
    expect(arr.map(x => x.pvm)).toEqual(['2024-11-01', '2025-02-01', '2025-05-01']);
  });

  it('upsert pvm:llä: sama pvm korvaa (ei duplikaattia) → idempotentti re-import', () => {
    let arr = [{ pvm: '2025-05-01', lin30m: 5.5 }];
    arr = H.tmHistoriaLisaa(arr, { pvm: '2025-05-01', lin30m: 5.33, kasirata: 7.34 });
    expect(arr.length).toBe(1);
    expect(arr[0]).toEqual({ pvm: '2025-05-01', lin30m: 5.33, kasirata: 7.34 });
  });

  it('sama data uudelleen → ei kasva (idempotentti)', () => {
    const snap = { pvm: '2025-05-01', lin30m: 5.33 };
    let arr = H.tmHistoriaLisaa([], snap);
    arr = H.tmHistoriaLisaa(arr, snap);
    arr = H.tmHistoriaLisaa(arr, snap);
    expect(arr).toEqual([snap]);
  });

  it('kova katto 20: säilyttää viimeiset 20 pvm-järjestyksessä', () => {
    let arr = [];
    for (let i = 1; i <= 25; i++) {
      const pvm = '2025-' + String(i).padStart(2, '0').slice(0, 2) + '-01';
      // varmista uniikit nousevat pvm:t
      const p = '20' + String(25 + Math.floor(i / 12)).slice(-2) + '-' + String((i % 12) + 1).padStart(2, '0') + '-01';
      arr = H.tmHistoriaLisaa(arr, { pvm: p, lin30m: 5 + i / 100 });
    }
    expect(arr.length).toBe(20);
    // järjestys nouseva
    const pvmt = arr.map(x => x.pvm);
    expect(pvmt.slice().sort()).toEqual(pvmt);
  });

  it('katko custom cap', () => {
    let arr = [];
    ['2025-01-01', '2025-02-01', '2025-03-01'].forEach(pvm => { arr = H.tmHistoriaLisaa(arr, { pvm }, 2); });
    expect(arr.map(x => x.pvm)).toEqual(['2025-02-01', '2025-03-01']);
  });

  it('EI mutatoi alkuperäistä arraytä', () => {
    const orig = [{ pvm: '2025-01-01', lin30m: 5.5 }];
    const kopio = orig.slice();
    H.tmHistoriaLisaa(orig, { pvm: '2025-02-01', lin30m: 5.4 });
    expect(orig).toEqual(kopio);
  });

  it('snapshot ilman pvm:ää ei lisätä', () => {
    const arr = [{ pvm: '2025-01-01' }];
    expect(H.tmHistoriaLisaa(arr, { lin30m: 5 })).toEqual(arr);
    expect(H.tmHistoriaLisaa(arr, null)).toEqual(arr);
  });
});

describe('tm_historia — Aleksi Rajala -kaltainen sarja (L3-verifiointi)', () => {
  it('4 pistettä 30m + kasirata, idempotentti re-run', () => {
    const raaka = [
      { pvm: '2023-10-01', lin30m: 6.18, kasirata: 8.21 },
      { pvm: '2024-04-01', lin30m: 5.72, kasirata: 7.71 },
      { pvm: '2024-10-01', lin30m: 5.33, kasirata: 7.60 },
      { pvm: '2025-05-01', lin30m: 5.38, kasirata: 7.34 }
    ];
    const build = () => raaka.reduce((arr, r) => H.tmHistoriaLisaa(arr, H.tmHhSnapshot(r.pvm, { hv: { lin30m: r.lin30m, kasirata: r.kasirata } })), []);
    const a = build();
    expect(a.length).toBe(4);
    expect(a.map(x => x.lin30m)).toEqual([6.18, 5.72, 5.33, 5.38]);
    expect(a.map(x => x.kasirata)).toEqual([8.21, 7.71, 7.60, 7.34]);
    // re-run lähteestä → identtinen (idempotentti)
    expect(build()).toEqual(a);
  });
});
