// I3a — Looginen silta -resolver (lib/tm_kehityspolku.js). Brief: docs/CODE_BRIEF_I3a_LOGINEN_SILTA.md §A/§G.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { tmRatkaiseKehityspolku, D2_KONSEPTI, TULOSMITTARI } = require('../lib/tm_kehityspolku.js');
const pelialy = require('../lib/tm_pelialy_yksilo.js');
const tt = require('../lib/tm_teknistaktiset.js');
const taks = require('../lib/tm_arviointi_taksonomia.js');

// Realistinen ctx (sibling-libit injektoituna — kuten VP/Master tekevät selaimessa).
const ctx = {
  tmPelialyYksiloEhdota: pelialy.tmPelialyYksiloEhdota,
  tmTtKysymykset: tt.tmTtKysymykset,
  tmTtHarjoitteet: tt.tmTtHarjoitteet,
  tmTtVaihe: tt.tmTtVaihe,
  tmTaksonomiaByAvain: taks.tmTaksonomiaByAvain,
  konseptiNimi: (a) => (tt.tmTtPelaaja(a) || {}).otsikko || null
};
// U12 pelaaja (yhteispeli-vaihe → ei fundamenttia)
const p12 = { syntymaVuosi: 2014, nyt_vuosi: 2026, joukkue: 'SJK P12' };

describe('D2 → youth-konsepti (D2_KONSEPTI-kartta)', () => {
  it('kaikki 18 D2-taksonomia-avainta ratkeaa (konsepti / tulosmittari / modifieri)', () => {
    const d2 = taks.ARVIOINTI_TAKSONOMIA.filter(i => i.dim === 'D2').map(i => i.avain);
    expect(d2.length).toBe(18);
    d2.forEach(alue => {
      const r = tmRatkaiseKehityspolku({ alue, dim: 'D2' }, p12, ctx);
      expect(['teknis_taktinen', 'tulosmittari', 'modifieri']).toContain(r.tyyppi);
      if (r.tyyppi === 'teknis_taktinen') expect(r.konsepti_avain).toMatch(/^y_h[0-9]$/);
    });
  });
  it('ball_control → y_h1 (Haltuunotto), cue + harjoite ctx:stä', () => {
    const r = tmRatkaiseKehityspolku({ alue: 'ball_control', dim: 'D2' }, p12, ctx);
    expect(r.konsepti_avain).toBe('y_h1');
    expect(r.varmuus).toBe('lukittu');
    expect(Array.isArray(r.cue)).toBe(true);
    expect(r.cue.length).toBeGreaterThan(0);
  });
  it('dribbling → y_h3 (EI y_h4 — §A.7 Y-H4 tulee D4:stä)', () => {
    expect(tmRatkaiseKehityspolku({ alue: 'dribbling', dim: 'D2' }, p12, ctx).konsepti_avain).toBe('y_h3');
    expect(D2_KONSEPTI.dribbling).not.toBe('y_h4');
    expect(Object.values(D2_KONSEPTI)).not.toContain('y_h4');   // Y-H4 ei koskaan D2-kartassa
  });
  it('short_passing/long_passing/passing_variety/hide_pass/ball_striking → y_h2', () => {
    ['short_passing', 'long_passing', 'passing_variety', 'hide_pass', 'ball_striking'].forEach(a =>
      expect(tmRatkaiseKehityspolku({ alue: a, dim: 'D2' }, p12, ctx).konsepti_avain).toBe('y_h2'));
  });
  it('long_passing kantaa alt-vihjeen y_h8', () => {
    expect(tmRatkaiseKehityspolku({ alue: 'long_passing', dim: 'D2' }, p12, ctx).alt_konsepti_avain).toBe('y_h8');
  });
});

describe('§A.4 havainnointi_vihje (Y-H0 läpileikkaava)', () => {
  it('tekniset suoritustaidot (haltuunotto/syöttö/kuljetus) → vihje true', () => {
    ['ball_control', 'short_passing', 'running_with_ball'].forEach(a =>
      expect(tmRatkaiseKehityspolku({ alue: a, dim: 'D2' }, p12, ctx).havainnointi_vihje).toBe(true));
  });
  it('hide_pass → vihje true (eksplisiittinen §A.5)', () => {
    expect(tmRatkaiseKehityspolku({ alue: 'hide_pass', dim: 'D2' }, p12, ctx).havainnointi_vihje).toBe(true);
  });
  it('viimeistely (y_h9) → ei vihjettä', () => {
    expect(tmRatkaiseKehityspolku({ alue: 'finishing', dim: 'D2' }, p12, ctx).havainnointi_vihje).toBe(false);
  });
});

describe('§E harjoite-tägit (laukaustyyppi)', () => {
  it('shooting_power → y_h9 + tag power', () => {
    const r = tmRatkaiseKehityspolku({ alue: 'shooting_power', dim: 'D2' }, p12, ctx);
    expect(r.konsepti_avain).toBe('y_h9');
    expect(r.harjoite_tagit).toEqual(['power']);
  });
  it('shooting_accuracy → placement, shooting_quickness → first-time, shooting_variety → variety', () => {
    expect(tmRatkaiseKehityspolku({ alue: 'shooting_accuracy', dim: 'D2' }, p12, ctx).harjoite_tagit).toEqual(['placement']);
    expect(tmRatkaiseKehityspolku({ alue: 'shooting_quickness', dim: 'D2' }, p12, ctx).harjoite_tagit).toEqual(['first-time']);
    expect(tmRatkaiseKehityspolku({ alue: 'shooting_variety', dim: 'D2' }, p12, ctx).harjoite_tagit).toEqual(['variety']);
  });
});

describe('§A.2 tulosmittari-erottelu', () => {
  it('shooting_efficiency → tulosmittari, ei konseptia', () => {
    const r = tmRatkaiseKehityspolku({ alue: 'shooting_efficiency', dim: 'D2' }, p12, ctx);
    expect(r.tyyppi).toBe('tulosmittari');
    expect(r.konsepti_avain).toBeNull();
    expect(r.syy).toMatch(/[Ss]euraus/);
  });
  it('defensive_reliability (D4) → tulosmittari', () => {
    expect(tmRatkaiseKehityspolku({ alue: 'defensive_reliability', dim: 'D4' }, p12, ctx).tyyppi).toBe('tulosmittari');
  });
  it('TULOSMITTARI-setti sisältää efficiency + reliability + consistency', () => {
    expect(TULOSMITTARI).toHaveProperty('shooting_efficiency');
    expect(TULOSMITTARI).toHaveProperty('defensive_reliability');
  });
});

describe('§A.5 weaker_foot → modifieri', () => {
  it('ei konseptia, jalka heikompi', () => {
    const r = tmRatkaiseKehityspolku({ alue: 'weaker_foot', dim: 'D2' }, p12, ctx);
    expect(r.tyyppi).toBe('modifieri');
    expect(r.konsepti_avain).toBeNull();
    expect(r.jalka).toBe('heikompi');
  });
});

describe('D4 → KARTTA_A (tm_pelialy_yksilo aktivoitu)', () => {
  it('anticipation → y_h0 (Havainnointi), tyyppi teknis_taktinen', () => {
    const r = tmRatkaiseKehityspolku({ alue: 'anticipation', dim: 'D4' }, p12, ctx);
    expect(r.konsepti_avain).toBe('y_h0');
    expect(r.tyyppi).toBe('teknis_taktinen');
    expect(r.varmuus).toBe('ehdotettu');
  });
  it('pressing → y_p1 (puolustuskonsepti KARTTA_A:sta)', () => {
    expect(tmRatkaiseKehityspolku({ alue: 'pressing', dim: 'D4' }, p12, ctx).konsepti_avain).toBe('y_p1');
  });
  it('ilman ctx.tmPelialyYksiloEhdota → ei_konseptia (graceful)', () => {
    const r = tmRatkaiseKehityspolku({ alue: 'anticipation', dim: 'D4' }, p12, {});
    expect(r.varmuus).toBe('ei_konseptia');
  });
});

describe('D1/D3/D5 dispatch', () => {
  it('D1 → fyysinen (route fyysinen, ei konseptia)', () => {
    const r = tmRatkaiseKehityspolku({ alue: 'speed', dim: 'D1' }, p12, ctx);
    expect(r.tyyppi).toBe('fyysinen');
    expect(r.route).toBe('fyysinen');
    expect(r.konsepti_avain).toBeNull();
  });
  it('D3 → laadullinen (henkinen)', () => {
    expect(tmRatkaiseKehityspolku({ alue: 'x', dim: 'D3' }, p12, ctx).tyyppi).toBe('laadullinen');
  });
  it('D5 → laadullinen (sosiaalinen)', () => {
    expect(tmRatkaiseKehityspolku({ alue: 'y', dim: 'D5' }, p12, ctx).tyyppi).toBe('laadullinen');
  });
});

describe('§A.6 fundamentti-gate (U14+/pelipaikka/sisältö)', () => {
  it('U12 (yhteispeli) → ei fundamenttia', () => {
    const r = tmRatkaiseKehityspolku({ alue: 'ball_control', dim: 'D2' }, p12, ctx);
    expect(r.fundamentti_avain).toBeNull();
  });
  it('U16 + pelipaikka + haeFundamentti (sisältö valmis) → fundamentti täytetään', () => {
    const p16 = { syntymaVuosi: 2010, nyt_vuosi: 2026, joukkue: 'SJK P16', positio: 'KK' };
    const ctx2 = Object.assign({}, ctx, { haeFundamentti: () => ({ avain: 'kk_h1', nimi: 'Testifundamentti' }) });
    const r = tmRatkaiseKehityspolku({ alue: 'ball_control', dim: 'D2' }, p16, ctx2);
    expect(r.fundamentti_avain).toBe('kk_h1');
    expect(r.fundamentti_nimi).toBe('Testifundamentti');
  });
  it('U16 + pelipaikka mutta haeFundamentti puuttuu (sisältö kesken) → null (pysyy youth-konseptissa)', () => {
    const p16 = { syntymaVuosi: 2010, nyt_vuosi: 2026, joukkue: 'SJK P16', positio: 'KK' };
    expect(tmRatkaiseKehityspolku({ alue: 'ball_control', dim: 'D2' }, p16, ctx).fundamentti_avain).toBeNull();
  });
});

describe('Graceful / reunaehdot', () => {
  it('ei idpFokusta → ei_konseptia', () => {
    expect(tmRatkaiseKehityspolku(null, p12, ctx).varmuus).toBe('ei_konseptia');
    expect(tmRatkaiseKehityspolku({}, p12, ctx).varmuus).toBe('ei_konseptia');
  });
  it('dim päätellään ctx.tmTaksonomiaByAvain:sta jos idpFokus.dim puuttuu', () => {
    const r = tmRatkaiseKehityspolku({ alue: 'ball_control' }, p12, ctx);   // ei dim → D2 taksonomiasta
    expect(r.dim).toBe('D2');
    expect(r.konsepti_avain).toBe('y_h1');
  });
  it('nimi toimii ilman ctx.konseptiNimi (sisäinen YOUTH_NIMI-fallback)', () => {
    const r = tmRatkaiseKehityspolku({ alue: 'ball_control', dim: 'D2' }, p12, {});
    expect(r.konsepti_nimi).toBe('Haltuunotto');
  });
});
