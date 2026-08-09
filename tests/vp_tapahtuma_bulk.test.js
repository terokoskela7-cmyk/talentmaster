/**
 * TalentMaster™ — E1b: tapahtuman bulk-mitätöinnin merkintärakennus (TalentMaster_VP_v25.html)
 * Puhtaat funktiot _vpTapahtumaMitatoiKentat / _vpTapahtumaPalautaKentat: per-pelaaja tapahtuma-dokin
 * mitatoidut-kenttäpolut. Poimitaan lähteestä ja evaluoidaan (ei DOM/Firestore).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

let mitatoi, palauta;
beforeAll(() => {
  const lines = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8').split('\n');
  const s = lines.findIndex(l => l.includes('function _vpTapahtumaMitatoiKentat'));
  const e = lines.findIndex(l => l.includes('window._vpTapahtumaPalautaKentat = _vpTapahtumaPalautaKentat;'));
  if (s < 0 || e < 0) throw new Error('lohkoa ei löytynyt');
  const api = new Function('var window = {};\n' + lines.slice(s, e + 1).join('\n') + '\n return { _vpTapahtumaMitatoiKentat, _vpTapahtumaPalautaKentat };')();
  mitatoi = api._vpTapahtumaMitatoiKentat;
  palauta = api._vpTapahtumaPalautaKentat;
});

const META = { kuka: 'uid1', milloin: '2026-08-09T00:00:00Z' };

describe('_vpTapahtumaMitatoiKentat — koko tapahtuman avaimet', () => {
  it('mitätöi kaikki testiavaimet (mitatoidut.<avain> = meta)', () => {
    const k = mitatoi({ lin_30m: 4.3, hyppy_cj: 38 }, {}, META);
    expect(k).toEqual({ 'mitatoidut.lin_30m': META, 'mitatoidut.hyppy_cj': META });
  });

  it('idempotentti: jo mitätöidyt avaimet ohitetaan', () => {
    const k = mitatoi({ lin_30m: 4.3, hyppy_cj: 38 }, { lin_30m: { kuka: 'x', milloin: 'y' } }, META);
    expect(k).toEqual({ 'mitatoidut.hyppy_cj': META });   // lin_30m jo mitätöity → pois
  });

  it('kaikki jo mitätöity → {} (ei kirjoitusta)', () => {
    expect(mitatoi({ lin_30m: 4.3 }, { lin_30m: META }, META)).toEqual({});
  });

  it('tyhjä testit → {}', () => {
    expect(mitatoi({}, {}, META)).toEqual({});
    expect(mitatoi(null, null, META)).toEqual({});
  });
});

describe('_vpTapahtumaPalautaKentat — poista mitätöinnit', () => {
  it('poistaa kaikki mitätöidyt avaimet (deleteSentinel)', () => {
    const DEL = '__DELETE__';
    const k = palauta({ lin_30m: META, hyppy_cj: META }, DEL);
    expect(k).toEqual({ 'mitatoidut.lin_30m': DEL, 'mitatoidut.hyppy_cj': DEL });
  });

  it('ei mitätöityjä → {}', () => {
    expect(palauta({}, '__DELETE__')).toEqual({});
    expect(palauta(null, '__DELETE__')).toEqual({});
  });
});

describe('mitatoi ↔ palauta symmetria', () => {
  it('mitätöinti sitten palautus koskee samoja avaimia', () => {
    const testit = { lin_30m: 4.3, hyppy_cj: 38, kuljetus_laukaus: 14 };
    const mit = mitatoi(testit, {}, META);                      // { mitatoidut.lin_30m, .hyppy_cj, .kuljetus_laukaus }
    // simuloi että kaikki nyt mitätöity
    const joMit = {}; Object.keys(mit).forEach(kk => { joMit[kk.replace('mitatoidut.', '')] = META; });
    const pal = palauta(joMit, '__DELETE__');
    expect(Object.keys(pal).sort()).toEqual(Object.keys(mit).sort());   // samat avaimet
  });
});
