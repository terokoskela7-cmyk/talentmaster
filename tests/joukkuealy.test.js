/**
 * TalentMaster™ — R2-B J1: Joukkueäly-aggregaatit (TalentMaster_VP_v25.html)
 * Puhtaat aggregointifunktiot: jakaumat summautuvat N:ään · potentiaali SCOUT_POTENTIAALI-mäppäyksellä ·
 * RAE-kvartaalit · talenttiportaat signaaleista · PHV-mäppäys · pelipaikka-syvyys · tyhjä → tyhjä (ei kaadu).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

let J;
beforeAll(() => {
  const lines = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8').split('\n');
  const s = lines.findIndex((l) => l.includes('function _jaKohortti(pelaajat, token) {'));
  const e = lines.findIndex((l) => l.includes('window._jaKohortti = _jaKohortti;'));
  if (s < 0 || e < 0) throw new Error('Joukkueäly-lohkoa ei löytynyt');
  J = new Function('var window = {};\n' + lines.slice(s, e).join('\n') +
    '\n return { _jaKohortti, _jaKohorttiTokenit, _jaTalenttiportaat, _jaValmiusJakauma, _ja5DKa, _jaPotentiaaliJakauma, _jaRaeJakauma, _jaPhvJakauma, _jaPelipaikkaSyvyys };')();
});

describe('_jaValmiusJakauma — FLEI-ämpärit summautuvat N:ään', () => {
  it('viisi ämpäriä, summa = flei-ei-null N; null/puuttuva ohitetaan', () => {
    const r = J._jaValmiusJakauma([{ flei_viimeisin: 90 }, { flei_viimeisin: 72 }, { flei_viimeisin: 60 }, { flei_viimeisin: 45 }, { flei_viimeisin: 30 }, { flei_viimeisin: null }, {}]);
    expect(r.n).toBe(5);
    expect(r.ampat.reduce((a, b) => a + b.n, 0)).toBe(5);
    expect(r.ampat.map((b) => b.n)).toEqual([1, 1, 1, 1, 1]);   // 85-100 · 70-84 · 55-69 · 40-54 · <40
  });
});

describe('_jaPotentiaaliJakauma — SCOUT_POTENTIAALI-mäppäys + ei arvioitu', () => {
  const SCALE = [{ tahdet: 5, taso: 'TOP_5_LEAGUES', lyhyt: 'TOP 5 -liigat' }, { tahdet: 4, taso: 'OTHER_TOP_LEAGUES', lyhyt: 'Muut huippuliigat' }, { tahdet: 3, taso: 'TOP_LEAGUES_NORDIC', lyhyt: 'Pohjoismaat' }, { tahdet: 2, taso: 'FINNISH_PREMIER_LEAGUE', lyhyt: 'Veikkausliiga' }, { tahdet: 1, taso: 'OTHER', lyhyt: 'Muut' }];
  it('jakautuu tähtitasoittain; arvioimattomat eiArvioitu-luokkaan; summa = N', () => {
    const pel = [{ scout_potentiaali: 2, etunimi: 'A' }, { scout_potentiaali: 5, etunimi: 'B' }, { scout_potentiaali: 2, etunimi: 'C' }, { etunimi: 'D' }];
    const r = J._jaPotentiaaliJakauma(pel, SCALE, (p) => p.etunimi);
    const byT = {}; r.portaat.forEach((x) => (byT[x.tahdet] = x));
    expect(byT[2].n).toBe(2); expect(byT[2].nimet).toEqual(['A', 'C']);
    expect(byT[5].n).toBe(1);
    expect(r.eiArvioitu.n).toBe(1); expect(r.eiArvioitu.nimet).toEqual(['D']);
    const summa = r.portaat.reduce((a, b) => a + b.n, 0) + r.eiArvioitu.n;
    expect(summa).toBe(pel.length);
  });
});

describe('_jaRaeJakauma — syntymäkvartaalit', () => {
  it('laskee Q1–Q4; null ohitetaan; n = kvartaallisten määrä', () => {
    const qFn = (p) => p.q || null;
    const r = J._jaRaeJakauma([{ q: 'Q1' }, { q: 'Q1' }, { q: 'Q4' }, { q: null }, {}], qFn);
    expect(r).toMatchObject({ Q1: 2, Q2: 0, Q3: 0, Q4: 1, n: 3 });
  });
});

describe('_jaTalenttiportaat — signaalien tärkeysjärjestys', () => {
  it('X-Factor > Hidden Gem > Kehityskohde > Seuranta', () => {
    const hg = (p) => ({ dHG: !!p.hg, fleiHG: false });
    const heikko = (p) => !!p.heikko;
    const r = J._jaTalenttiportaat([{ signaali: 'xfactor', hg: true }, { hg: true }, { heikko: true }, {}], hg, heikko);
    expect(r).toEqual({ xfactor: 1, hiddengem: 1, kehityskohde: 1, seuranta: 1 });
  });
});

describe('_jaPhvJakauma — §25 koodit → ennen/aikana/jälkeen', () => {
  it('PRE/LAH→ennen · PH→aikana · POST/AN→jälkeen · tuntematon ohitetaan', () => {
    const r = J._jaPhvJakauma([{ phv_tila: 'PRE' }, { phv_tila: 'LAH' }, { phv_tila: 'PH' }, { phv_tila: 'POST' }, { phv_tila: 'AN' }, { phv_tila: 'X' }, {}]);
    expect(r).toEqual({ ennen: 2, aikana: 1, jalkeen: 2, n: 5 });
  });
});

describe('_jaPelipaikkaSyvyys — ryhmät + status', () => {
  it('ryhmittelee koodit; 0=aukko, ≤2=ohut, ≥5=vahva; tuntematon erikseen', () => {
    const r = J._jaPelipaikkaSyvyys([{ positio: 'KH' }, { positio: 'LH' }, { positio: 'MV' }, { positio: 'KK' }, { positio: 'KK' }, { positio: 'KK' }], null);
    const map = {}; r.ryhmat.forEach((x) => (map[x.ryhma] = x));
    expect(map['Kärki'].n).toBe(1); expect(map['Kärki'].status).toBe('ohut');
    expect(map['Puolustus'].n).toBe(0); expect(map['Puolustus'].status).toBe('aukko');
    expect(map['Keskikenttä'].n).toBe(3); expect(map['Keskikenttä'].status).toBe('ok');
    expect(r.tuntematon).toBe(0);
  });
  it('pelipaikka kirjaamatta → tuntematon', () => {
    const r = J._jaPelipaikkaSyvyys([{}, { positio: '' }], null);
    expect(r.tuntematon).toBe(2);
    expect(r.ryhmat.every((x) => x.n === 0)).toBe(true);
  });
});

describe('_ja5DKa — seuran dim-keskiarvot (null-turvallinen)', () => {
  it('keskiarvot vain ei-null-arvoista; puuttuva dim → null', () => {
    const r = J._ja5DKa([{ x: 1 }, { x: 2 }], (p) => ({ d1: p.x * 2, d2: 4 }));
    expect(r.d1).toBe(3); expect(r.d2).toBe(4);
    expect(r.d3).toBeNull(); expect(r.d4).toBeNull(); expect(r.d5).toBeNull();
  });
});

describe('tyhjä → tyhjä tila (ei kaadu)', () => {
  it('tyhjä roster → nolla-aggregaatit', () => {
    expect(J._jaValmiusJakauma([]).n).toBe(0);
    expect(J._jaRaeJakauma([], () => null).n).toBe(0);
    expect(J._jaPhvJakauma([]).n).toBe(0);
    expect(J._ja5DKa([], () => ({})).d1).toBeNull();
    expect(J._jaTalenttiportaat([], null, null)).toEqual({ xfactor: 0, hiddengem: 0, seuranta: 0, kehityskohde: 0 });
    expect(J._jaKohorttiTokenit([])).toEqual([]);
    expect(J._jaKohortti([{ joukkue: 'KPV U13' }], 'U15')).toEqual([]);
    expect(J._jaKohortti([{ joukkue: 'KPV U13' }], null).length).toBe(1);
  });
});
