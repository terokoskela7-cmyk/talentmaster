// Vaihe 6 — jakson sulku (meso-sykli) PURE-ydin (lib/tm_jaksokooste.js).
// Prosessi (harjoitukset+läsnäolo, 4d/K2), kalibraatio, delta-vain-mittauksesta (§29), historia-entry.
import { describe, it, expect } from 'vitest';
const J = require('../lib/tm_jaksokooste.js');

const h = (avain, pvm, opt = {}) => ({ treeniteema: { avain, pelaajat_id: opt.pelaajat_id }, pvm, pelaajat_id: opt.pelaajat_id, lasnaolo: opt.lasnaolo });

describe('tmJaksonHarjoitukset — prosessi', () => {
  it('laskee teemaharjoitukset jaksovälillä (konsepti + pvm)', () => {
    const tap = [h('y_h4', '2026-06-05'), h('y_h4', '2026-06-20'), h('y_h1', '2026-06-10'), h('y_h4', '2026-05-01')];
    const r = J.tmJaksonHarjoitukset(tap, 'y_h4', '2026-06-01', '2026-06-29');
    expect(r.harjoituksia).toBe(2);   // y_h1 väärä konsepti, 05-01 ennen jaksoa
  });

  it('läsnäolo per pelaaja (paikalla|myohassa = läsnä)', () => {
    const tap = [
      h('y_h4', '2026-06-05', { lasnaolo: { p1: 'paikalla' } }),
      h('y_h4', '2026-06-12', { lasnaolo: { p1: 'myohassa' } }),
      h('y_h4', '2026-06-19', { lasnaolo: { p1: 'poissa' } })
    ];
    const r = J.tmJaksonHarjoitukset(tap, 'y_h4', '2026-06-01', '2026-06-29', 'p1');
    expect(r).toEqual({ harjoituksia: 3, lasnaolo: { paikalla: 2, yhteensa: 3, tiedossa: 3 } });
  });

  it('kohdistettu harjoitus (pelaajat_id) rajaa muut pois; tyhjä = koko joukkue', () => {
    const tap = [h('y_h4', '2026-06-05', { pelaajat_id: ['p2'] }), h('y_h4', '2026-06-12', { pelaajat_id: [] })];
    expect(J.tmJaksonHarjoitukset(tap, 'y_h4', '2026-06-01', '2026-06-29', 'p1').harjoituksia).toBe(1);  // vain koko-joukkue
  });

  it('0 harjoitusta = jakso ei toteutunut treeneissä (§0)', () => {
    expect(J.tmJaksonHarjoitukset([], 'y_h4', '2026-06-01', '2026-06-29', 'p1')).toEqual({ harjoituksia: 0, lasnaolo: { paikalla: 0, yhteensa: 0, tiedossa: 0 } });
  });

  it('ei läsnäolodataa → tiedossa 0 (ei väitetä läsnäoloa)', () => {
    const r = J.tmJaksonHarjoitukset([h('y_h4', '2026-06-05')], 'y_h4', '2026-06-01', '2026-06-29', 'p1');
    expect(r.lasnaolo).toEqual({ paikalla: 0, yhteensa: 1, tiedossa: 0 });
  });
});

describe('tmKalibraatio', () => {
  it('|itse − aikuis|', () => {
    expect(J.tmKalibraatio(4, 3)).toBe(1);
    expect(J.tmKalibraatio(2, 5)).toBe(3);
    expect(J.tmKalibraatio(3, 3)).toBe(0);
  });
  it('null jos jompikumpi puuttuu', () => {
    expect(J.tmKalibraatio(4, null)).toBe(null);
    expect(J.tmKalibraatio(null, 3)).toBe(null);
    expect(J.tmKalibraatio(undefined, undefined)).toBe(null);
  });
});

describe('tmJaksoDelta — vain mittauksesta (§29)', () => {
  it('null kun ei mittausta', () => {
    expect(J.tmJaksoDelta(50, 45, false)).toBe(null);
    expect(J.tmJaksoDelta(50, 45)).toBe(null);
  });
  it('null kun luvut puuttuvat', () => {
    expect(J.tmJaksoDelta(null, 45, true)).toBe(null);
  });
  it('mittaus + luvut → muutos (käänteinen: negatiivinen = parani)', () => {
    expect(J.tmJaksoDelta(50, 45, true)).toEqual({ ennen: 50, jalkeen: 45, muutos: -5 });
  });
});

describe('tmHistoriaEntry — geneerinen (§8) domeeni-tagi', () => {
  it('oletusdomeeni teknis_taktinen + media[] valmis', () => {
    const e = J.tmHistoriaEntry({ konsepti_avain: 'y_h4', konsepti_nimi: 'Harhautus', harjoituksia: 3, tulos: 'parani' });
    expect(e.domeeni).toBe('teknis_taktinen');
    expect(e.media).toEqual([]);
    expect(e.tulos).toBe('parani');
    expect(e.arvio_itse).toBe(null);
    expect(e.kalibraatio_ero).toBe(null);
  });
  it('domeeni ylikirjoitettavissa (fyysinen, vaihe 7)', () => {
    expect(J.tmHistoriaEntry({ domeeni: 'fyysinen' }).domeeni).toBe('fyysinen');
  });
  it('arviot + kalibraatio + delta säilyvät', () => {
    const e = J.tmHistoriaEntry({ arvio_itse: 4, arvio_valmentaja: 3, kalibraatio_ero: 1, delta_mitattu: { testi: 'pujottelu', ennen: 12, jalkeen: 11 } });
    expect(e.arvio_itse).toBe(4);
    expect(e.arvio_valmentaja).toBe(3);
    expect(e.kalibraatio_ero).toBe(1);
    expect(e.delta_mitattu.testi).toBe('pujottelu');
  });
});
