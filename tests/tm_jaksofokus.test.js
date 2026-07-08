// Vaihe 4c — VP:n jaksofokus-oversight PURE-ydin (lib/tm_jaksofokus.js).
// §26 pikakenttä-aggregaatti: kattavuus, umpeutunut-jakso, teemakeskittymä, lähdejakauma, talentit.
import { describe, it, expect } from 'vitest';
const JF = require('../lib/tm_jaksofokus.js');

// Kiinteä "nyt" testeille (2026-07-08). alkoi-pvm:t suhteessa tähän.
const NYT = new Date('2026-07-08T12:00:00Z').getTime();
const iso = (d) => new Date(NYT - d * 86400000).toISOString();   // d päivää sitten

const fokus = (avain, nimi, opt = {}) => ({
  jaksofokus: {
    konsepti_avain: avain, konsepti_nimi: nimi, konsepti_koodi: opt.koodi || null,
    alkoi: opt.alkoi != null ? opt.alkoi : iso(7), kesto_vk: opt.kesto_vk || 4, lahde: opt.lahde || 'valmentaja'
  },
  talenttiOhjelma: opt.talentti || false
});

describe('tmJfUmpeutunut', () => {
  it('tuore jakso (7 pv sitten, 4 vk) = aktiivinen', () => {
    expect(JF.tmJfUmpeutunut(fokus('y_h0', 'A').jaksofokus, NYT)).toBe(false);
  });
  it('vanha jakso (40 pv sitten, 4 vk = 28 pv) = umpeutunut', () => {
    expect(JF.tmJfUmpeutunut(fokus('y_h0', 'A', { alkoi: iso(40) }).jaksofokus, NYT)).toBe(true);
  });
  it('tasan rajalla (28 pv, 4 vk) EI vielä umpeutunut (<, ei <=)', () => {
    expect(JF.tmJfUmpeutunut(fokus('y_h0', 'A', { alkoi: iso(28), kesto_vk: 4 }).jaksofokus, NYT)).toBe(false);
  });
  it('kesto_vk vaikuttaa (40 pv, 8 vk = 56 pv) = aktiivinen', () => {
    expect(JF.tmJfUmpeutunut(fokus('y_h0', 'A', { alkoi: iso(40), kesto_vk: 8 }).jaksofokus, NYT)).toBe(false);
  });
  it('ei alkoi-pvm / ei jf → false (ei tietoa, ei umpeudu)', () => {
    expect(JF.tmJfUmpeutunut({ konsepti_avain: 'y_h0' }, NYT)).toBe(false);
    expect(JF.tmJfUmpeutunut(null, NYT)).toBe(false);
    expect(JF.tmJfUmpeutunut({ konsepti_avain: 'y_h0', alkoi: 'roska' }, NYT)).toBe(false);
  });
});

describe('tmJfKattavuus', () => {
  it('laskee katetut + pct + ilman', () => {
    const pel = [fokus('y_h0', 'A'), fokus('y_h1', 'B'), {}, {}];   // 2/4
    const k = JF.tmJfKattavuus(pel);
    expect(k).toEqual({ katettu: 2, yht: 4, pct: 50, ilman: 2 });
  });
  it('tyhjä lista → 0 %, ei jakoa nollalla', () => {
    expect(JF.tmJfKattavuus([])).toEqual({ katettu: 0, yht: 0, pct: 0, ilman: 0 });
  });
  it('jaksofokus ilman konsepti_avainta ei laske katetuksi', () => {
    expect(JF.tmJfKattavuus([{ jaksofokus: { alkoi: iso(1) } }]).katettu).toBe(0);
  });
});

describe('tmJfTeemakeskittyma', () => {
  it('ryhmittelee konseptin mukaan, laskeva järjestys', () => {
    const pel = [
      fokus('y_h0', 'Kuljetus'), fokus('y_h0', 'Kuljetus'), fokus('y_h0', 'Kuljetus'),
      fokus('y_h1', 'Syöttö'), fokus('y_h1', 'Syöttö'),
      fokus('y_h2', 'Havainnointi')
    ];
    const t = JF.tmJfTeemakeskittyma(pel);
    expect(t.map(x => [x.avain, x.count])).toEqual([['y_h0', 3], ['y_h1', 2], ['y_h2', 1]]);
  });
  it('≥3 samaa → ryhma:true (ryhmäharjoite-signaali)', () => {
    const pel = [fokus('y_h0', 'K'), fokus('y_h0', 'K'), fokus('y_h0', 'K'), fokus('y_h1', 'S'), fokus('y_h1', 'S')];
    const t = JF.tmJfTeemakeskittyma(pel);
    expect(t.find(x => x.avain === 'y_h0').ryhma).toBe(true);
    expect(t.find(x => x.avain === 'y_h1').ryhma).toBe(false);
  });
  it('ilman fokusta → tyhjä', () => {
    expect(JF.tmJfTeemakeskittyma([{}, {}])).toEqual([]);
  });
});

describe('tmJfJaksot / tmJfLahdejakauma / tmJfTalentit', () => {
  it('jaksot erottaa aktiiviset ja umpeutuneet', () => {
    const pel = [fokus('y_h0', 'A'), fokus('y_h1', 'B', { alkoi: iso(40) }), {}];
    expect(JF.tmJfJaksot(pel, NYT)).toEqual({ aktiiviset: 1, umpeutuneet: 1 });
  });
  it('lähdejakauma laskee valmentaja/vp/talenttivalmentaja', () => {
    const pel = [fokus('y_h0', 'A', { lahde: 'valmentaja' }), fokus('y_h1', 'B', { lahde: 'vp' }), fokus('y_h2', 'C', { lahde: 'talenttivalmentaja' }), fokus('y_h3', 'D', { lahde: 'valmentaja' })];
    expect(JF.tmJfLahdejakauma(pel)).toEqual({ valmentaja: 2, vp: 1, talenttivalmentaja: 1, muu: 0 });
  });
  it('talentit lasketaan erikseen (§37)', () => {
    const pel = [fokus('y_h0', 'A', { talentti: true }), fokus('y_h1', 'B', { talentti: true }), { talenttiOhjelma: true }, fokus('y_h2', 'C')];
    expect(JF.tmJfTalentit(pel)).toEqual({ katettu: 2, yht: 3, ilman: 1 });
  });
});

describe('tmJfKooste (KPI-nauha yhdellä kutsulla)', () => {
  it('yhdistää kaikki osiot', () => {
    const pel = [fokus('y_h0', 'A', { talentti: true }), fokus('y_h0', 'A'), fokus('y_h0', 'A', { alkoi: iso(40) }), {}];
    const k = JF.tmJfKooste(pel, NYT);
    expect(k.kattavuus.katettu).toBe(3);
    expect(k.jaksot).toEqual({ aktiiviset: 2, umpeutuneet: 1 });
    expect(k.talentit.katettu).toBe(1);
    expect(k.teemat[0]).toMatchObject({ avain: 'y_h0', count: 3, ryhma: true });
  });
});
