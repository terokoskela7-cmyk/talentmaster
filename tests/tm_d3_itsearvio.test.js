/* Vaihe 1 / PR 1d — lib/tm_d3_itsearvio.js: pelaajan oma D3-itsearvio (B) erillään valmentajan/VP:n pisteistä (A). */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const D = require('../lib/tm_d3_itsearvio.js');

describe('tmD3ItsearvioPisteet — pelaaja lukee VAIN omat arvonsa', () => {
  it('d3_itsearvio ensin; vanha d3_viimeisin-data varapolkuna vain .pelaaja-osa (ei valmentajan/VP:n/avg)', () => {
    const p = { d3_itsearvio: { pisteet: { inner_drive: 4 }, pvm: '2026-10-20' }, d3_viimeisin: { pisteet: { inner_drive: { pelaaja: 2, valmentaja: 5, avg: 3.5 }, focus: { pelaaja: 3, valmentaja: 1, vp: 4 }, resilience: { valmentaja: 5 } } } };
    expect(D.tmD3ItsearvioPisteet(p)).toEqual({ inner_drive: 4, focus: 3 });
    expect(D.tmD3ItsearvioPisteet({ d3_viimeisin: p.d3_viimeisin })).toEqual({ inner_drive: 2, focus: 3 });
    expect(D.tmD3ItsearvioPisteet({})).toEqual({}); expect(D.tmD3ItsearvioPisteet(null)).toEqual({});
  });
  it('kelvottomat arvot ohitetaan (0, 6, tekstit); numeromerkkijono 1–5 hyväksytään kokonaislukuna', () => {
    expect(D.tmD3ItsearvioPisteet({ d3_itsearvio: { pisteet: { inner_drive: 0, coachability: 6, resilience: 'x', focus: '3', emotional_control: 5 } } })).toEqual({ focus: 3, emotional_control: 5 });
  });
  it('jakso_alkoi: d3_itsearvio ensin, varalla vanha d3_viimeisin', () => {
    expect(D.tmD3ItsearvioJakso({ d3_itsearvio: { jakso_alkoi: '2026-09-01' }, d3_viimeisin: { jakso_alkoi: '2026-01-01' } })).toBe('2026-09-01');
    expect(D.tmD3ItsearvioJakso({ d3_viimeisin: { jakso_alkoi: '2026-01-01' } })).toBe('2026-01-01'); expect(D.tmD3ItsearvioJakso({})).toBeNull();
  });
});

describe('kirjoitus — vain d3_itsearvio, ei A-kenttiä', () => {
  it('tmD3ItsearvioKirjoitus palauttaa YKSI avain; yhdistää aiemmat arvot; ei d3_taso/d3_varmuus/d3_viimeisin/d3_pvm', () => {
    const p = { d3_itsearvio: { pisteet: { focus: 3 }, pvm: '2026-10-01' }, d3_viimeisin: { pisteet: { resilience: { pelaaja: 2, valmentaja: 5 } } } };
    const k = D.tmD3ItsearvioKirjoitus({ inner_drive: 4 }, p, { pvm: '2026-10-22', jaksoAlkoi: '2026-09-15T00:00:00.000Z' });
    expect(Object.keys(k)).toEqual(['d3_itsearvio']);
    expect(k.d3_itsearvio).toEqual({ pisteet: { focus: 3, resilience: 2, inner_drive: 4 }, pvm: '2026-10-22', jakso_alkoi: '2026-09-15T00:00:00.000Z' });
    expect(JSON.stringify(k)).not.toMatch(/valmentaja|"vp"|avg|d3_taso|d3_varmuus/);
  });
  it('ei annettuja arvoja → null; pvm puuttuu → heittää', () => {
    expect(D.tmD3ItsearvioKirjoitus({}, {}, { pvm: '2026-10-22' })).toBeNull();
    expect(() => D.tmD3ItsearvioKirjoitus({ focus: 3 }, {}, {})).toThrow(/pvm/);
  });
  it('tmD3ItsearvioKa: pelaajan oma keskiarvo (§7.22: ei valmentajan avg:ia)', () => {
    expect(D.tmD3ItsearvioKa({ d3_itsearvio: { pisteet: { focus: 3, resilience: 4 } }, d3_taso: 1.2, d3_viimeisin: { pisteet: { focus: { avg: 1, valmentaja: 1 } } } })).toBe(3.5);
    expect(D.tmD3ItsearvioKa({ d3_viimeisin: { pisteet: { focus: { valmentaja: 5, avg: 5 } } } })).toBeNull();
  });
});

describe('tmD3Yhdista — henkilökunnan näkymä', () => {
  it('itsearvio → pisteet[dim].pelaaja; avg, lahteet, d3_taso ja d3_varmuus lasketaan uudelleen; syöte ennallaan', () => {
    const doc = { d3_viimeisin: { pisteet: { focus: { valmentaja: 3, avg: 3 } }, pvm: '2026-10-10', lahteet: ['valmentaja'] }, d3_taso: 3, d3_varmuus: 'valmentaja', d3_pvm: '2026-10-10', d3_itsearvio: { pisteet: { focus: 5, resilience: 2 }, pvm: '2026-10-20' } };
    const kopio = JSON.stringify(doc), m = D.tmD3Yhdista(doc);
    expect(JSON.stringify(doc)).toBe(kopio);
    expect(m.d3_viimeisin.pisteet.focus).toEqual({ valmentaja: 3, pelaaja: 5, avg: 4 }); expect(m.d3_viimeisin.pisteet.resilience).toEqual({ pelaaja: 2, avg: 2 });
    expect(m.d3_viimeisin.lahteet).toEqual(['valmentaja', 'pelaaja']); expect(m.d3_varmuus).toBe('trianguloitu'); expect(m.d3_taso).toBe(3); expect(m.d3_pvm).toBe('2026-10-10');
  });
  it('vain pelaajan itsearvio → varmuus itsearvio, d3_pvm = itsearvion pvm; ilman itsearviota dokumentti sellaisenaan', () => {
    const m = D.tmD3Yhdista({ d3_itsearvio: { pisteet: { focus: 4 }, pvm: '2026-10-20' } });
    expect(m.d3_varmuus).toBe('itsearvio'); expect(m.d3_pvm).toBe('2026-10-20'); expect(m.d3_taso).toBe(4);
    const x = { d3_viimeisin: { pisteet: {} } }; expect(D.tmD3Yhdista(x)).toBe(x);
  });
  it('VP-osa säilyy yhdistyksessä (pisteet[dim].vp)', () => {
    const m = D.tmD3Yhdista({ d3_viimeisin: { pisteet: { focus: { valmentaja: 2, vp: 5 } }, lahteet: ['valmentaja', 'vp'] }, d3_itsearvio: { pisteet: { focus: 4 }, pvm: '2026-10-20' } });
    expect(m.d3_viimeisin.pisteet.focus).toEqual({ valmentaja: 2, vp: 5, pelaaja: 4, avg: 3 });
  });
  it('DIMS vastaa kanonista D3_DIMS-listaa (lib/tm_eerikkila_normit.js)', () => {
    const n = require('fs').readFileSync(new URL('../lib/tm_eerikkila_normit.js', import.meta.url), 'utf8');
    const avaimet = [...n.slice(n.indexOf('var D3_DIMS = [')).split('];')[0].matchAll(/key: '([a-z_]+)'/g)].map((x) => x[1]);
    expect(D.DIMS).toEqual(avaimet);
  });
});
