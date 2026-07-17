// Vaihe 2 — Palloliitto-arviointitaksonomia (lib/tm_arviointi_taksonomia.js). Standardi: docs/PALLOLIITTO_PELAAJAKORTTI_TAKSONOMIA.md.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const {
  ARVIOINTI_TAKSONOMIA, TM_ARVIOINTI_ASTEIKKO, TM_DIMENSIOT,
  tmTaksonomiaDim, tmTaksonomiaByAvain, tmTaksonomiaMitattavat, tmTaksonomiaHavaittavat, tmMitattuMappaus,
  tmTeemat, tmTeemaKohteet, tmKategoriaNimi,
  ARVIOINTI_KEHYKSET, ARVIOINTI_KEHYS_OLETUS, tmKehys, tmKehysTaksonomia,
  ADAR_HAVAITTU_MAP, tmAdarHavaittu, tmAdarIkaTier
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
  it('adarMap Palloliitto-kehyksen sisällä (kv-kehykset voivat määritellä oman)', () => {
    expect(tmKehys('palloliitto').adarMap).toBe(ADAR_HAVAITTU_MAP);
  });
});

describe('2c — tmAdarHavaittu (ADAR → havaittu peliäly D4)', () => {
  it('I1 (§7): ADAR 1–3 suoraan (ei muunnosta 1–5:een); >3 (vanha 1–5/1–10) capataan 3:een', () => {
    expect(tmAdarHavaittu({ a: 1, d: 2, ac: 3, r: 2 }).decision_making.arvo).toBe(2);
    expect(tmAdarHavaittu({ a: 1 }).vision.arvo).toBe(1);
    expect(tmAdarHavaittu({ ac: 3 }).play_under_pressure.arvo).toBe(3);
    expect(tmAdarHavaittu({ d: 8 }).decision_making.arvo).toBe(3);   // vanha 1–10 → cap 3
    expect(tmAdarHavaittu({ a: 5 }).vision.arvo).toBe(3);            // vanha 1–5 → cap 3
  });
  it('assess (a) → 2 kohdetta: anticipation + vision', () => {
    const r = tmAdarHavaittu({ a: 3 });
    expect(r.anticipation.arvo).toBe(3);
    expect(r.vision.arvo).toBe(3);
    expect(Object.keys(r).sort()).toEqual(['anticipation', 'vision']);
  });
  it('ac-avain (ei act) → play_under_pressure; d → decision_making; r → positioning', () => {
    const r = tmAdarHavaittu({ a: 3, d: 3, ac: 3, r: 3 });
    expect(r.play_under_pressure).toBeTruthy();
    expect(r.act).toBeUndefined();                 // avain on 'ac', ei 'act'
    expect(r.decision_making.arvo).toBe(3);
    expect(r.positioning.arvo).toBe(3);
    expect(Object.keys(r).length).toBe(5);         // anticipation+vision+decision_making+play_under_pressure+positioning
  });
  it('lähde aina "adar" + pvm välittyy', () => {
    const r = tmAdarHavaittu({ a: 2, pvm: '2026-06-01' });
    expect(r.vision.lahde).toBe('adar');
    expect(r.vision.pvm).toBe('2026-06-01');
  });
  it('null kun ei ADAR-dataa / tyhjä / vain null-komponentit', () => {
    expect(tmAdarHavaittu(null)).toBeNull();
    expect(tmAdarHavaittu(undefined)).toBeNull();
    expect(tmAdarHavaittu({})).toBeNull();
    expect(tmAdarHavaittu({ a: null, d: null })).toBeNull();
  });
  it('mäppäys osuu vain olemassa oleviin D4 football_sense -avaimiin', () => {
    const kohteet = new Set(ARVIOINTI_TAKSONOMIA.filter(i => i.dim === 'D4').map(i => i.avain));
    Object.values(ADAR_HAVAITTU_MAP).flat().forEach(avain => expect(kohteet.has(avain)).toBe(true));
  });
});

describe('P3 — ADAR-ikäportti (kolmiportainen ikävaiheittain, §7)', () => {
  it('tmAdarIkaTier: ≤12 Assess · 13–15 +Decide+Act · 16+ täysi · null=täysi', () => {
    expect(tmAdarIkaTier(10)).toEqual(['a']);
    expect(tmAdarIkaTier(12)).toEqual(['a']);
    expect(tmAdarIkaTier(13)).toEqual(['a', 'd', 'ac']);
    expect(tmAdarIkaTier(15)).toEqual(['a', 'd', 'ac']);
    expect(tmAdarIkaTier(16)).toEqual(['a', 'd', 'ac', 'r']);
    expect(tmAdarIkaTier(17)).toEqual(['a', 'd', 'ac', 'r']);
    expect(tmAdarIkaTier(null)).toEqual(['a', 'd', 'ac', 'r']);
  });
  const adar = { a: 2, d: 3, ac: 1, r: 2 };
  it('U8–12 → vain Assess (anticipation/vision), ei Decide/Act/Reassess', () => {
    const r = tmAdarHavaittu(adar, { ika: 10 });
    expect(Object.keys(r).sort()).toEqual(['anticipation', 'vision']);
    expect(r.decision_making).toBeUndefined();
    expect(r.positioning).toBeUndefined();
  });
  it('U13–15 → Assess+Decide+Act, EI positioning (Reassess)', () => {
    const r = tmAdarHavaittu(adar, { ika: 14 });
    expect(Object.keys(r).sort()).toEqual(['anticipation', 'decision_making', 'play_under_pressure', 'vision']);
    expect(r.positioning).toBeUndefined();
  });
  it('U16+ → kaikki dimit', () => {
    const r = tmAdarHavaittu(adar, { ika: 17 });
    expect(r.positioning.arvo).toBe(2);
    expect(Object.keys(r).length).toBe(5);
  });
  it('taaksepäin-yhteensopiva: ilman opts → kaikki (regressiovahti)', () => {
    expect(Object.keys(tmAdarHavaittu(adar)).length).toBe(5);
  });
  it('opts.adarMap ohittaa globaalin (kehys-pluggability)', () => {
    const oma = { a: ['oma_avain'] };
    const r = tmAdarHavaittu({ a: 2 }, { ika: 10, adarMap: oma });
    expect(r.oma_avain.arvo).toBe(2);
    expect(r.vision).toBeUndefined();
  });
  it('ika==null (opts annettu muttei ikää) → kaikki dimit', () => {
    expect(Object.keys(tmAdarHavaittu(adar, { adarMap: ADAR_HAVAITTU_MAP })).length).toBe(5);
  });
});

describe('P4b — mittaus-moodin autotunnistus (konsepti mäppäytyy taksonomiaan → arviointi, muuten numeerinen)', () => {
  // Editorin _vpJfMittausOletus-sääntö: tmTaksonomiaByAvain(avain) totuusarvo ratkaisee.
  const oletus = (a) => (tmTaksonomiaByAvain(a) ? 'arviointi' : 'numeerinen');
  it('taksonomia-avaimet (D3/D5/D4) → arviointi (nykyarvo luetaan Arvioinnista, ei tuplakirjausta)', () => {
    expect(oletus('leadership')).toBe('arviointi');      // D3
    expect(oletus('scoring_drive')).toBe('arviointi');   // D3 (P0-seed = taksonomia-avain)
    expect(oletus('team_role')).toBe('arviointi');       // D5
    expect(oletus('vision')).toBe('arviointi');          // D4 (ADAR)
  });
  it('ei-taksonomia-avaimet → numeerinen (Lähtö→Tavoite)', () => {
    expect(oletus('y_h0')).toBe('numeerinen');           // teknis-taktinen youth-konsepti (ei arviointikohtaa)
    expect(oletus('laskettava_mittari')).toBe('numeerinen');
  });
});
