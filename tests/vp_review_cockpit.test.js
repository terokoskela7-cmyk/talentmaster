/**
 * TalentMaster™ — R1: Arviointi-cockpit puhtaat funktiot (TalentMaster_VP_v25.html)
 * Omistajuuspredikaatti (§9367) · DVI-tyhjä tila (§29) · saman-ulottuvuuden itsearvio/VP-ero ·
 * review-tagien kuratoitu sanasto + sanitointi · liput vakavuusjärjestyksessä · nelikulma.
 * Poimitaan yhtenäinen lohde VP-lähteestä ja evaluoidaan (ei DOM/Firestore).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

let A;   // API-objekti
beforeAll(() => {
  const lines = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8').split('\n');
  const s = lines.findIndex(l => l.includes('var REVIEW_TAGIT = {'));
  const e = lines.findIndex(l => l.includes('window._vpNelikulma = _vpNelikulma;'));
  if (s < 0 || e < 0) throw new Error('R1-lohkoa ei löytynyt');
  const src = 'var window = {}; var vpT = function(x){ return x; };\n' + lines.slice(s, e + 1).join('\n') +
    '\n return { REVIEW_TAGIT, DVI_MIN_N, _vpReviewTagitSanitoi, _vpOmistaaPelaajan, _vpCockpitDvi, _vpItsearvioEro, _vpCockpitLiput, _vpNelikulma };';
  A = new Function(src)();
});

describe('_vpOmistaaPelaajan — omistajuuspredikaatti (oma vs vieras joukkue, §9367)', () => {
  it('osuma joukkue-nimellä (case-insensitive)', () => {
    expect(A._vpOmistaaPelaajan({ joukkue: 'KPV U13' }, { nimet: ['kpv u13'], ids: [] })).toBe(true);
    expect(A._vpOmistaaPelaajan({ joukkue: 'kpv u13' }, { nimet: ['KPV U13'], ids: [] })).toBe(true);
  });
  it('osuma joukkueet[]-id:llä (case-insensitive)', () => {
    expect(A._vpOmistaaPelaajan({ joukkueet: ['kpv_u13', 'muu'] }, { ids: ['KPV_U13'], nimet: [] })).toBe(true);
  });
  it('VIERAS joukkue → false (portti pitää)', () => {
    expect(A._vpOmistaaPelaajan({ joukkue: 'KPV U15', joukkueet: ['kpv_u15'] }, { nimet: ['kpv u13'], ids: ['kpv_u13'] })).toBe(false);
  });
  it('tyhjä/null omat tai pelaaja → false', () => {
    expect(A._vpOmistaaPelaajan({ joukkue: 'KPV U13' }, null)).toBe(false);
    expect(A._vpOmistaaPelaajan(null, { nimet: ['kpv u13'] })).toBe(false);
    expect(A._vpOmistaaPelaajan({ joukkue: 'KPV U13' }, { nimet: [], ids: [] })).toBe(false);
  });
});

describe('_vpCockpitDvi — DVI-trendi + tyhjä tila (§29, min-pistemäärä)', () => {
  it('ei yhtään reviewia → ei_reviewia', () => {
    expect(A._vpCockpitDvi({}).tila).toBe('ei_reviewia');
  });
  it('mittauksia < min → "kerätään (n/min)"', () => {
    const r = A._vpCockpitDvi({ idp_dvi: { suunta: 'up', n: 1 } });
    expect(r.tila).toBe('kerataan'); expect(r.n).toBe(1); expect(r.min).toBe(A.DVI_MIN_N);
  });
  it('review olemassa mutta ei idp_dvi:tä → kerätään (0/min)', () => {
    const r = A._vpCockpitDvi({ review_viimeisin_pvm: '2026-06-01' });
    expect(r.tila).toBe('kerataan'); expect(r.n).toBe(0);
  });
  it('n ≥ min → trendi; down = amber-junnaa (abs+ hoidettu idpDviSuunnassa)', () => {
    expect(A._vpCockpitDvi({ idp_dvi: { suunta: 'down', n: 3 } })).toMatchObject({ tila: 'trend', suunta: 'down', teksti: 'junnaa' });
    expect(A._vpCockpitDvi({ idp_dvi: { suunta: 'up', n: 4 } })).toMatchObject({ suunta: 'up', teksti: 'kiihtyy' });
    expect(A._vpCockpitDvi({ idp_dvi: { suunta: 'flat', n: 5 } })).toMatchObject({ suunta: 'flat', teksti: 'vakaa' });
  });
});

describe('_vpItsearvioEro — Pel(D3) vs VP, SAMA ulottuvuus', () => {
  it('erotus samasta ulottuvuudesta (itse & vp samasta dimistä)', () => {
    const p = { d3_viimeisin: { pisteet: { teknis_taktinen: { itse: 4, valmentaja: 3, vp: 2 } } } };
    expect(A._vpItsearvioEro(p)).toMatchObject({ dim: 'teknis_taktinen', pel: 4, vp: 2, ero: 2 });
  });
  it('valitsee suurimman eron useasta ulottuvuudesta', () => {
    const p = { d3_viimeisin: { pisteet: { fyysinen: { itse: 3, vp: 3 }, psyykkinen: { itse: 5, vp: 2 } } } };
    expect(A._vpItsearvioEro(p).dim).toBe('psyykkinen');
    expect(A._vpItsearvioEro(p).ero).toBe(3);
  });
  it('ulottuvuus jossa vain itse (ei vp) ohitetaan → null jos ei täydellistä paria', () => {
    expect(A._vpItsearvioEro({ d3_viimeisin: { pisteet: { fyysinen: { itse: 4 } } } })).toBeNull();
    expect(A._vpItsearvioEro({})).toBeNull();
  });
  it('pelVanhentunut välitetään läpi', () => {
    const p = { d3_viimeisin: { pisteet: { psyykkinen: { itse: 4, vp: 2 } } } };
    expect(A._vpItsearvioEro(p, true).pelVanhentunut).toBe(true);
    expect(A._vpItsearvioEro(p, false).pelVanhentunut).toBe(false);
  });
});

describe('review-tagit — kuratoitu sanasto + sanitointi (ei vapaita tageja)', () => {
  it('sanasto = 5 domeeni-avainta, kaikki arvot listoja', () => {
    const keys = Object.keys(A.REVIEW_TAGIT);
    expect(keys).toEqual(expect.arrayContaining(['fyysinen', 'teknis_taktinen', 'psyykkinen', 'sosiaalinen', 'yleinen']));
    keys.forEach(k => expect(Array.isArray(A.REVIEW_TAGIT[k])).toBe(true));
  });
  it('normalisoi (#, väli→-, lower), pudottaa sanaston ulkopuoliset, deduplikoi', () => {
    expect(A._vpReviewTagitSanitoi(['#Oikea-Jalka', 'paineensieto', 'bogus-tag', 'oikea jalka']))
      .toEqual(['oikea-jalka', 'paineensieto']);
    expect(A._vpReviewTagitSanitoi(['SYOTTO', 'syotto'])).toEqual(['syotto']);
  });
  it('ei-lista → []', () => {
    expect(A._vpReviewTagitSanitoi(null)).toEqual([]);
    expect(A._vpReviewTagitSanitoi('syotto')).toEqual([]);
  });
});

describe('_vpCockpitLiput — vakavuusjärjestys (turvallisuus → elinkaari), ≤2 näkyy', () => {
  it('Valmius <40 = turvallisuuslippu ENSIN (punainen)', () => {
    const l = A._vpCockpitLiput({ flei_viimeisin: 38 }, { sitoumusOdottaa: true, itsearvioEro: 2 });
    expect(l[0].key).toBe('valmius'); expect(l[0].vari).toBe('red');
    expect(l.map(x => x.key)).toEqual(['valmius', 'sitoumus', 'itsearvio']);
  });
  it('itsearvioEro < 1.5 → ei itsearviolippua', () => {
    const l = A._vpCockpitLiput({ flei_viimeisin: 70 }, { sitoumusOdottaa: false, itsearvioEro: 1.0 });
    expect(l.length).toBe(0);
  });
  it('valmius ≥40 → ei turvallisuuslippua', () => {
    const l = A._vpCockpitLiput({ flei_viimeisin: 55 }, { sitoumusOdottaa: true, itsearvioEro: null });
    expect(l.map(x => x.key)).toEqual(['sitoumus']);
  });
});

describe('_vpNelikulma — MDT-domeenit (jaksofokus.domeeni = nykyinen fokus)', () => {
  it('4 domeenia; fokus-domeeni = cur, historia = fresh, muut = none', () => {
    const p = { jaksofokus: { domeeni: 'teknis_taktinen' }, jaksofokus_historia: [{ domeeni: 'fyysinen' }] };
    const n = A._vpNelikulma(p);
    expect(n.length).toBe(4);
    expect(n.find(x => x.avain === 'teknis_taktinen').tila).toBe('cur');
    expect(n.find(x => x.avain === 'fyysinen').tila).toBe('fresh');
    expect(n.find(x => x.avain === 'sosiaalinen').tila).toBe('none');
  });
});
