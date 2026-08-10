/**
 * TalentMaster™ — FA-potentiaali (uran kattoarvio · Scouting-linssi, TalentMaster_VP_v25.html)
 * Puhtaat funktiot: tähdet↔enum-parimappaus (1↔OTHER … 5↔TOP_5_LEAGUES) + label-tekstit. Poimitaan lähteestä.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

let A;
beforeAll(() => {
  const lines = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8').split('\n');
  const s = lines.findIndex((l) => l.includes('var SCOUT_POTENTIAALI = ['));
  const e = lines.findIndex((l) => l.includes('window.SCOUT_POTENTIAALI = SCOUT_POTENTIAALI;'));
  if (s < 0 || e < 0) throw new Error('SCOUT_POTENTIAALI-lohkoa ei löytynyt');
  A = new Function('var window = {};\n' + lines.slice(s, e + 1).join('\n') +
    '\n return { SCOUT_POTENTIAALI, _vpPotTaso, _vpPotTahdet, _vpPotRivi };')();
});

describe('SCOUT_POTENTIAALI — asteikon rakenne (FA §6)', () => {
  it('5 porrasta, tähdet 1–5 uniikit, jokaisella taso/lyhyt/kuvaus', () => {
    expect(A.SCOUT_POTENTIAALI.length).toBe(5);
    const tahdet = A.SCOUT_POTENTIAALI.map((r) => r.tahdet).sort();
    expect(tahdet).toEqual([1, 2, 3, 4, 5]);
    A.SCOUT_POTENTIAALI.forEach((r) => {
      expect(typeof r.taso).toBe('string');
      expect(r.lyhyt.length).toBeGreaterThan(0);
      expect(r.kuvaus.length).toBeGreaterThan(0);
    });
  });
});

describe('tähdet ↔ enum -parimappaus (yksi lähde, ei ristiriitaa)', () => {
  it('_vpPotTaso: 1↔OTHER … 5↔TOP_5_LEAGUES', () => {
    expect(A._vpPotTaso(1)).toBe('OTHER');
    expect(A._vpPotTaso(2)).toBe('FINNISH_PREMIER_LEAGUE');
    expect(A._vpPotTaso(3)).toBe('TOP_LEAGUES_NORDIC');
    expect(A._vpPotTaso(4)).toBe('OTHER_TOP_LEAGUES');
    expect(A._vpPotTaso(5)).toBe('TOP_5_LEAGUES');
  });
  it('_vpPotTahdet: käänteinen (enum → tähdet)', () => {
    expect(A._vpPotTahdet('OTHER')).toBe(1);
    expect(A._vpPotTahdet('TOP_5_LEAGUES')).toBe(5);
  });
  it('round-trip tahdet → taso → tahdet', () => {
    [1, 2, 3, 4, 5].forEach((n) => expect(A._vpPotTahdet(A._vpPotTaso(n))).toBe(n));
  });
  it('asteikon ulkopuoli → null (0/6/null/tuntematon enum)', () => {
    expect(A._vpPotTaso(0)).toBeNull();
    expect(A._vpPotTaso(6)).toBeNull();
    expect(A._vpPotTaso(null)).toBeNull();
    expect(A._vpPotTahdet('BOGUS')).toBeNull();
  });
});

describe('kirjoitusportti — JOHTO-only (_vpSeurantaOnJohto, täsmää Firestore-sääntöön onJohtoRooli)', () => {
  let api;
  beforeAll(() => {
    const lines = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8').split('\n');
    const s = lines.findIndex((l) => l.includes('function _vpSeurantaOnJohto()'));
    let e = s + 1; while (e < lines.length && lines[e].indexOf('}') < 0) e++;
    api = new Function('var window = {};\n' + lines.slice(s, e + 1).join('\n') + '\n return { fn: _vpSeurantaOnJohto, win: window };')();
  });
  it('ei-johto (valmentaja / talenttivalmentaja) → portti false → kontrolli ei näy', () => {
    api.win._vpSA = false; api.win._vpRooli = 'valmentaja';
    expect(api.fn()).toBe(false);
    api.win._vpRooli = 'talenttivalmentaja';
    expect(api.fn()).toBe(false);
  });
  it('VP / johto / SA → portti true → kontrolli näkyy + kirjoitus sallittu', () => {
    api.win._vpSA = false; api.win._vpRooli = 'vp'; expect(api.fn()).toBe(true);
    api.win._vpRooli = 'urheilutoimenjohtaja'; expect(api.fn()).toBe(true);
    api.win._vpRooli = null; api.win._vpSA = true; expect(api.fn()).toBe(true);
  });
});

describe('R2-A — potentiaali-projektio "Talenttisuositukset kv-tasolle" -listaan', () => {
  let R;
  beforeAll(() => {
    const lines = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8').split('\n');
    const s = lines.findIndex((l) => l.includes('var SCOUT_POTENTIAALI = ['));
    const e = lines.findIndex((l) => l.includes('window._vpPotentiaaliBadgeHTML = _vpPotentiaaliBadgeHTML;'));
    if (s < 0 || e < 0) throw new Error('R2-A-lohkoa ei löytynyt');
    R = new Function('_jsvEsc', 'var window = {};\n' + lines.slice(s, e + 1).join('\n') +
      '\n return { _vpPotTahtiStr: _vpPotTahtiStr, _vpPotentiaaliBadgeHTML: _vpPotentiaaliBadgeHTML };')(function (x) { return String(x == null ? '' : x); });
  });
  it('_vpPotTahtiStr — täytetyt/tyhjät tähdet', () => {
    expect(R._vpPotTahtiStr(2)).toBe('★★☆☆☆');
    expect(R._vpPotTahtiStr(5)).toBe('★★★★★');
    expect(R._vpPotTahtiStr(0)).toBe('☆☆☆☆☆');
    expect(R._vpPotTahtiStr(null)).toBe('☆☆☆☆☆');
  });
  it('badge — asetettu: tähdet + taso-label (SCOUT_POTENTIAALI-mäppäys, sama single source)', () => {
    const h = R._vpPotentiaaliBadgeHTML({ scout_potentiaali: 2 });
    expect(h).toContain('★★☆☆☆');
    expect(h).toContain('Veikkausliiga');
    expect(R._vpPotentiaaliBadgeHTML({ scout_potentiaali: 5 })).toContain('TOP 5 -liigat');
  });
  it('badge — tyhjä → "ei arvioitu"', () => {
    expect(R._vpPotentiaaliBadgeHTML({})).toContain('ei arvioitu');
    expect(R._vpPotentiaaliBadgeHTML({ scout_potentiaali: null })).toContain('ei arvioitu');
  });
});

describe('label-tekstit', () => {
  it('_vpPotRivi palauttaa oikean portaan tekstit', () => {
    expect(A._vpPotRivi(2).lyhyt).toBe('Veikkausliiga');
    expect(A._vpPotRivi(5).lyhyt).toBe('TOP 5 -liigat');
    expect(A._vpPotRivi(5).kuvaus).toMatch(/EPL/);
  });
  it('tyhjä (ei arvioitu) → _vpPotRivi(null) = null → render näyttää "ei arvioitu"', () => {
    expect(A._vpPotRivi(null)).toBeNull();
    expect(A._vpPotRivi(0)).toBeNull();
  });
});
