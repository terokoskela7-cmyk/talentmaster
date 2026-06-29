// #71 — tarkistaOikeus-päätös: seuran kaikki (aktiiviset) VP:t + johto saavat oikeudet.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { kayttajaRooliSallittu, SALLITUT_KAYTTAJA_ROOLIT } = require('../functions/authz_paatos.js');

describe('kayttajaRooliSallittu (#71 — seuran kaikki VP:t tunnistetaan)', () => {
  it('vp kayttajat-roolilla → sallittu (Sibbo: 2. VP ilman vp_uid:ta)', () => {
    expect(kayttajaRooliSallittu({ rooli: 'vp' })).toBe('vp');
    expect(kayttajaRooliSallittu({ rooli: 'vp', aktiivinen: true })).toBe('vp');
  });
  it('johtoroolit → sallittu', () => {
    expect(kayttajaRooliSallittu({ rooli: 'seura_admin' })).toBe('seura_admin');
    expect(kayttajaRooliSallittu({ rooli: 'urheilutoimenjohtaja' })).toBe('urheilutoimenjohtaja');
    expect(kayttajaRooliSallittu({ rooli: 'seurasihteeri' })).toBe('seurasihteeri');
  });
  it('deaktivoitu vp → ei oikeuksia (aktiivinen === false)', () => {
    expect(kayttajaRooliSallittu({ rooli: 'vp', aktiivinen: false })).toBeNull();
    expect(kayttajaRooliSallittu({ rooli: 'seura_admin', aktiivinen: false })).toBeNull();
  });
  it('valmentaja / muu operatiivinen rooli → ei oikeuksia', () => {
    expect(kayttajaRooliSallittu({ rooli: 'valmentaja' })).toBeNull();
    expect(kayttajaRooliSallittu({ rooli: 'talenttivalmentaja' })).toBeNull();
    expect(kayttajaRooliSallittu({ rooli: 'fysiikkavalmentaja' })).toBeNull();
  });
  it('null / puuttuva data → null (ei kaadu)', () => {
    expect(kayttajaRooliSallittu(null)).toBeNull();
    expect(kayttajaRooliSallittu(undefined)).toBeNull();
    expect(kayttajaRooliSallittu({})).toBeNull();
  });
  it('vp on sallituissa rooleissa (regressiovahti: roolilistaa ei kavenneta)', () => {
    expect(SALLITUT_KAYTTAJA_ROOLIT).toContain('vp');
  });
});
