/**
 * S2 Seuran pulssi — kooste v4 (docs/CODE_BRIEF_S2_SEURAN_PULSSI.md "Kooste v4"): lib/tm_seuran_kooste.js fixtuureilla.
 * tyyppi/profiili (D70, D50) · n_toiminto_7 (D65: vain silmukan toiminnot, EI kirjautuminen/kirjaus/läsnäolo) · n_perhe_kuittaus_7 (D71: vain Leikkijä) · yhteensä uniikeista · tietosuojavartija.
 * Viikko W41/2026: ma 5.10. – su 11.10.; arviointihetki su 11.10. klo 21:00 Helsinki. 7 pv ikkuna = 5.10.–11.10.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const K = require('../lib/tm_seuran_kooste.js');
const DAY = 86400000;
const ALKU = Date.UTC(2026, 9, 4, 21, 0), LOPPU = Date.UTC(2026, 9, 11, 21, 0), ARVIO = Date.UTC(2026, 9, 11, 18, 0);
const AIKA = { alkuMs: ALKU, loppuMs: LOPPU, arvioMs: ARVIO, nytMs: ARVIO, vuosi: 2026 };
const J13 = { id: 'u13', nimi: 'KPV U13' }, J11 = { id: 'p11', nimi: 'KPV P11', tyyppi: 'harraste', valmentajaprofiili: 'ammatti' };
const pel = (id, o) => Object.assign({ id, joukkue: 'KPV U13', joukkueet: [], syntymaVuosi: 2013 }, o || {});
const laske = (joukkueet, pelaajat) => { const a = K.tmKoosteAnalysoi({ joukkueet, pelaajat, aika: AIKA }); return K.tmKoosteTulos(a, {}, { vk: '2026-W41' }); };

describe('kooste v4 · asetukset', () => {
  it('versio 4; tyyppi puuttuu/tuntematon → "kilpa" (D70), profiili puuttuu/tuntematon → "oto" (D50)', () => {
    expect(K.VERSIO).toBe(5);
    const d = laske([J13, J11, { id: 'x', nimi: 'KPV U14', tyyppi: 'muu', valmentajaprofiili: 'Ammatti' }], []);
    expect(d.versio).toBe(5);
    expect(d.joukkueet.u13).toMatchObject({ tyyppi: 'kilpa', profiili: 'oto' });
    expect(d.joukkueet.p11).toMatchObject({ tyyppi: 'harraste', profiili: 'ammatti' });
    expect(d.joukkueet.x).toMatchObject({ tyyppi: 'kilpa', profiili: 'oto' });
  });
  it('uudet kentät nollina ilman dataa (vanha syöte ilman toiminto/perhe-listoja ei kaadu)', () => {
    const d = laske([J13], [pel('a')]);
    expect(d.joukkueet.u13).toMatchObject({ n_toiminto_7: 0, n_perhe_kuittaus_7: 0 }); expect(d.yhteensa).toMatchObject({ n_toiminto_7: 0, n_perhe_kuittaus_7: 0 });
  });
});

describe('kooste v4 · n_toiminto_7 (7 pv: 5.10.–11.10., Helsingin päivät)', () => {
  it('ikkunassa → lasketaan; ikkunan ulkopuolella (4.10. / tulevaisuus 12.10.) ei', () => {
    const d = laske([J13], [pel('a', { toiminto: ['2026-10-05'] }), pel('b', { toiminto: ['2026-10-11'] }), pel('c', { toiminto: ['2026-10-04'] }), pel('e', { toiminto: ['2026-10-12'] }), pel('f')]);
    expect(d.joukkueet.u13.n_toiminto_7).toBe(2); expect(d.yhteensa.n_toiminto_7).toBe(2);
  });
  it('EI kirjautumista, kirjausta (oma) eikä läsnäoloa: n_aktiivinen_7 voi nousta mutta n_toiminto_7 ei', () => {
    const d = laske([J13], [pel('a', { oma: ['2026-10-08'], viimeisinKirjautuminen: '2026-10-09', huoltajaViimeisinKaynti: '2026-10-09' })]);
    expect(d.joukkueet.u13.n_aktiivinen_7).toBe(1); expect(d.joukkueet.u13.n_kirjautunut_30).toBe(1); expect(d.joukkueet.u13.n_toiminto_7).toBe(0);
  });
  it('pelaaja lasketaan kerran (useita toimintoja) ja kumpaankin joukkueeseen (§7.18), seuran yhteensä uniikeista', () => {
    const d = laske([J13, { id: 'u12', nimi: 'KPV U12' }], [pel('a', { joukkueet: ['u13', 'u12'], toiminto: ['2026-10-06', '2026-10-07', '2026-10-10'] }), pel('b', { toiminto: ['2026-10-08'] })]);
    expect(d.joukkueet.u13.n_toiminto_7).toBe(2); expect(d.joukkueet.u12.n_toiminto_7).toBe(1); expect(d.yhteensa.n_toiminto_7).toBe(2);
  });
  it('joukkueeton pelaaja: mukana seuran yhteensä-luvussa, ei joukkueissa', () => {
    const d = laske([J13], [pel('a', { joukkue: 'Tuntematon', toiminto: ['2026-10-08'] })]);
    expect(d.yhteensa.n_toiminto_7).toBe(1); expect(d.joukkueet.u13.n_toiminto_7).toBe(0);
  });
});

describe('kooste v4 · n_perhe_kuittaus_7 (Leikkijä, D71)', () => {
  it('lasketaan vain Leikkijä-ikävaiheelle (P11 → Leikkijä); Rakentaja (U13) saa 0 vaikka perhe-lista olisi täynnä', () => {
    const d = laske([J13, J11], [pel('a', { perhe: ['2026-10-08'] }), { id: 'l', joukkue: 'KPV P11', joukkueet: [], syntymaVuosi: 2015, perhe: ['2026-10-08'] }, { id: 'm', joukkue: 'KPV P11', joukkueet: [], syntymaVuosi: 2015, perhe: ['2026-09-20'] }]);
    expect(d.joukkueet.u13.n_perhe_kuittaus_7).toBe(0); expect(d.joukkueet.p11.n_perhe_kuittaus_7).toBe(1); expect(d.yhteensa.n_perhe_kuittaus_7).toBe(1);
  });
});

describe('kooste v4 · tietosuoja ja rakenne', () => {
  const d = laske([J13, J11], [pel('a', { toiminto: ['2026-10-08'], perhe: ['2026-10-08'] })]);
  it('vartija vihreä (ei nimiä/ID:itä/listoja); p.toiminto ja p.perhe -päivämääräluetteloja ei vuoda koosteeseen', () => {
    expect(K.tmKoosteRikkomukset(d)).toEqual([]);
    const s = JSON.stringify(d) + JSON.stringify(K.tmKoosteJoukkueDokumentit(d)); expect(s).not.toContain('2026-10-08'); expect(s).not.toMatch(/"toiminto"|"perhe"/);
  });
  it('kooste_joukkue-mittarit sisältävät tyypin, profiilin ja uudet luvut', () => {
    const j = K.tmKoosteJoukkueDokumentit(d).find((x) => x.id.startsWith('p11_')); expect(j.data.mittarit).toMatchObject({ tyyppi: 'harraste', profiili: 'ammatti', n_toiminto_7: 0, n_perhe_kuittaus_7: 0 });
  });
});

describe('kooste v5 · n_harjoite_7 / n_harjoite_30 (D119)', () => {
  it('p.harjoite-lista → 7 / 30 pv:n ikkuna; tulevaisuus ei; puuttuva lista ei kaadu; n_toiminto_7 ei muutu', () => {
    const d = laske([J13], [pel('a', { harjoite: ['2026-10-09'] }), pel('b', { harjoite: ['2026-10-03'] }), pel('c', { harjoite: ['2026-10-12'] }), pel('d'), pel('e', { toiminto: ['2026-10-09'] })]);
    expect(d.joukkueet.u13).toMatchObject({ n_harjoite_7: 1, n_harjoite_30: 2, n_toiminto_7: 1 });
    expect(d.yhteensa).toMatchObject({ n_harjoite_7: 1, n_harjoite_30: 2, n_toiminto_7: 1 });
  });
  it('pelaaja kahdessa joukkueessa → molempiin, yhteensä kerran', () => {
    const J14 = { id: 'u14', nimi: 'KPV U14' };
    const d = laske([J13, J14], [pel('a', { joukkueet: ['u13', 'u14'], harjoite: ['2026-10-09'] })]);
    expect(d.joukkueet.u13.n_harjoite_7).toBe(1); expect(d.joukkueet.u14.n_harjoite_7).toBe(1); expect(d.yhteensa.n_harjoite_7).toBe(1);
  });
});
