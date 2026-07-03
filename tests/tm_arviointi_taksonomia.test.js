// Vaihe 2 — Palloliitto-arviointitaksonomia (lib/tm_arviointi_taksonomia.js). Standardi: docs/PALLOLIITTO_PELAAJAKORTTI_TAKSONOMIA.md.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const {
  ARVIOINTI_TAKSONOMIA, TM_ARVIOINTI_ASTEIKKO, TM_DIMENSIOT,
  tmTaksonomiaDim, tmTaksonomiaByAvain, tmTaksonomiaMitattavat, tmTaksonomiaHavaittavat, tmMitattuMappaus,
  tmTeemat, tmTeemaKohteet, tmKategoriaNimi,
  ARVIOINTI_KEHYKSET, ARVIOINTI_KEHYS_OLETUS, tmKehys, tmKehysTaksonomia
} = require('../lib/tm_arviointi_taksonomia.js');

describe('ARVIOINTI_TAKSONOMIA — rakenteen eheys', () => {
  it('avaimet uniikkeja', () => {
    const avaimet = ARVIOINTI_TAKSONOMIA.map(i => i.avain);
    expect(new Set(avaimet).size).toBe(avaimet.length);
  });
  it('jokaisella pakolliset kentät + dim on D1–D5', () => {
    const dims = ['D1', 'D2', 'D3', 'D4', 'D5'];
    ARVIOINTI_TAKSONOMIA.forEach(i => {
      expect(typeof i.avain).toBe('string');
      expect(i.nimi_fi && i.nimi_en).toBeTruthy();
      expect(dims).toContain(i.dim);
      expect(typeof i.kategoria).toBe('string');
      expect(typeof i.mitattavissa).toBe('boolean');
    });
  });
  it('mitattavissa:true → validi mitta (d1osa/tklaji); mitattavissa:false → ei mitta-kenttää', () => {
    ARVIOINTI_TAKSONOMIA.forEach(i => {
      if (i.mitattavissa) {
        expect(i.mitta).toBeTruthy();
        expect(['d1osa', 'tklaji']).toContain(i.mitta.tyyppi);
        if (i.mitta.tyyppi === 'd1osa') expect(typeof i.mitta.avain).toBe('string');
        else expect(typeof i.mitta.laji).toBe('string');
      } else {
        expect(i.mitta).toBeUndefined();
      }
    });
  });
  it('kaikki 5 dimensiota edustettuina', () => {
    ['D1', 'D2', 'D3', 'D4', 'D5'].forEach(d => expect(tmTaksonomiaDim(d).length).toBeGreaterThan(0));
    expect(Object.keys(TM_DIMENSIOT)).toEqual(['D1', 'D2', 'D3', 'D4', 'D5']);
  });
});

describe('Asteikko 1–5 (Palloliitto P/A/G/VG/E)', () => {
  it('viisi porrasta koodeilla', () => {
    expect(Object.keys(TM_ARVIOINTI_ASTEIKKO)).toEqual(['1', '2', '3', '4', '5']);
    expect(TM_ARVIOINTI_ASTEIKKO[1].koodi).toBe('P');
    expect(TM_ARVIOINTI_ASTEIKKO[5].koodi).toBe('E');
    expect(TM_ARVIOINTI_ASTEIKKO[4].koodi).toBe('VG');
  });
});

describe('Mitattu → avain -mäppäys (testi → taksonomia)', () => {
  it('9 mitattavaa kohdetta (5 D1 + 4 D2)', () => {
    const mitattavat = tmTaksonomiaMitattavat();
    expect(mitattavat.length).toBe(9);
    expect(mitattavat.filter(i => i.dim === 'D1').length).toBe(5);
    expect(mitattavat.filter(i => i.dim === 'D2').length).toBe(4);
  });
  it('d1osa-mäppäys: kiihdytys→acceleration, maksinopeus→speed, ketteryys→mobility, aerobinen→endurance, voima→power', () => {
    const m = tmMitattuMappaus();
    expect(m.d1osa).toEqual({ kiihdytys: 'acceleration', maksinopeus: 'speed', ketteryys: 'mobility', aerobinen: 'endurance', voima: 'power' });
  });
  it('tklaji-mäppäys: syotto→short_passing, pujottelu→dribbling, ponnauttelu→ball_striking, kuljetus_laukaus→finishing', () => {
    const m = tmMitattuMappaus();
    expect(m.tklaji).toEqual({ syotto: 'short_passing', pujottelu: 'dribbling', ponnauttelu: 'ball_striking', kuljetus_laukaus: 'finishing' });
  });
  it('mitattavat + havaittavat = koko taksonomia (ei päällekkäisyyttä)', () => {
    expect(tmTaksonomiaMitattavat().length + tmTaksonomiaHavaittavat().length).toBe(ARVIOINTI_TAKSONOMIA.length);
  });
});

describe('Helperit', () => {
  it('tmTaksonomiaByAvain löytää + palauttaa null tuntemattomalle', () => {
    expect(tmTaksonomiaByAvain('speed').dim).toBe('D1');
    expect(tmTaksonomiaByAvain('vision').mitattavissa).toBe(false);
    expect(tmTaksonomiaByAvain('ei_ole')).toBeNull();
  });
});

describe('Pääteemat (dim + kategoria) — dropdown-ryhmittely', () => {
  it('teema-avain = dim_kategoria, uniikit, taksonomian järjestyksessä', () => {
    const teemat = tmTeemat();
    const avaimet = teemat.map(t => t.avain);
    expect(new Set(avaimet).size).toBe(avaimet.length);           // uniikit
    expect(teemat[0].avain).toBe('D1_liike');                     // ensimmäinen taksonomiassa
    expect(avaimet).toContain('D2_syotto');
    expect(avaimet).toContain('D4_football_sense');
    // n summautuu koko taksonomiaan
    expect(teemat.reduce((s, t) => s + t.n, 0)).toBe(ARVIOINTI_TAKSONOMIA.length);
  });
  it('teeman nimi "D1 · Liike"; tmTeemaKohteet palauttaa vain teeman kohteet', () => {
    const teemat = tmTeemat();
    const liike = teemat.find(t => t.avain === 'D1_liike');
    expect(liike.nimi).toBe('D1 · Liike');
    const kohteet = tmTeemaKohteet('D1_liike');
    expect(kohteet.length).toBe(liike.n);
    expect(kohteet.every(i => i.dim === 'D1' && i.kategoria === 'liike')).toBe(true);
  });
  it('tmKategoriaNimi tunnetuille + fallback', () => {
    expect(tmKategoriaNimi('football_sense')).toBe('Peliäly');
    expect(tmKategoriaNimi('outo')).toBe('Outo');
  });
});

describe('Arviointikehykset (kv-avoimuus)', () => {
  it('oletus = palloliitto; kehys sisältää nimi/asteikko/taksonomia', () => {
    expect(ARVIOINTI_KEHYS_OLETUS).toBe('palloliitto');
    const k = ARVIOINTI_KEHYKSET.palloliitto;
    expect(k.nimi).toBe('Palloliitto');
    expect(k.asteikko).toBe(TM_ARVIOINTI_ASTEIKKO);
    expect(k.taksonomia).toBe(ARVIOINTI_TAKSONOMIA);
  });
  it('tmKehys: tunnettu → oma, tuntematon → oletus (palloliitto)', () => {
    expect(tmKehys('palloliitto').avain).toBe('palloliitto');
    expect(tmKehys('ei_ole').avain).toBe('palloliitto');       // fallback oletukseen
    expect(tmKehysTaksonomia('palloliitto')).toBe(ARVIOINTI_TAKSONOMIA);
  });
});
