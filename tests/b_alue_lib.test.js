/* PR B (D172–D174, mockup 34): ydinvahvuuden alue klikkaamalla — lib/tm_kt_alue.js (aluejako, ehdotus, kirjoitus, sheet-HTML). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const A = require('../lib/tm_kt_alue.js'), KS = require('../lib/tm_kentta_spec.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
describe('tmKtAlueet: pelipaikka-alueet + maalivahti pelimuodon mukaan', () => {
  it('8v8 = 6 aluetta, 11v11 = 8 aluetta, 5v5 = ei aluevalintaa; jokainen alue kelpaa Rulesin muotoon; jako peittää kentän kokonaan ilman päällekkäisyyttä', () => {
    expect(A.tmKtAlueet('8v8')).toHaveLength(6); expect(A.tmKtAlueet('11v11')).toHaveLength(8); expect(A.tmKtAlueet('5v5')).toEqual([]); expect(A.tmKtAlueet('tuntematon')).toEqual([]);
    for (const m of ['8v8', '11v11']) {
      const z = A.tmKtAlueet(m); z.forEach((a) => expect(KS.tmKenttaAlueKelpaa({ x: a.x, y: a.y, w: a.w, h: a.h }), m + ' ' + a.avain).toBe(true));
      expect(z.reduce((s, a) => s + a.w * a.h, 0)).toBe(100 * 140);   // peitto
      for (let i = 0; i < z.length; i++) for (let j = i + 1; j < z.length; j++) { const a = z[i], b = z[j]; expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h, m + ' ' + a.avain + '/' + b.avain).toBe(false); }
      expect(z.some((a) => a.avain === 'maalivahti')).toBe(true); expect(new Set(z.map((a) => a.avain)).size).toBe(z.length);
    }
  });
  it('normisto (§41) voi antaa oman jaon; tuntematon avain → null; nimet FI-oletuksella', () => {
    expect(A.tmKtAlueet('8v8', { '8v8': [['a', 0, 0, 100, 140]] })).toEqual([{ avain: 'a', nimi: 'a', x: 0, y: 0, w: 100, h: 140 }]);
    expect(A.tmKtAlueAvaimella('11v11', 'vasen_puolustaja')).toMatchObject({ x: 0, y: 70, w: 25, h: 52, nimi: 'Vasen puolustaja' }); expect(A.tmKtAlueAvaimella('8v8', 'vasen_puolustaja')).toBeNull();
  });
});
describe('tmKtAlueAvain: nykyinen alue → avain (vaihto)', () => {
  it('alue_avain + täsmäävä geometria; ilman avainta täsmäävä alue; pelimuodon vaihtuessa keskipisteen alue; ei aluetta → null', () => {
    const p = (yv) => ({ ydinvahvuus: yv });
    expect(A.tmKtAlueAvain(p({ alue: { x: 25, y: 35, w: 50, h: 61 }, alue_avain: 'keskusta' }), '8v8')).toBe('keskusta');
    expect(A.tmKtAlueAvain(p({ alue: { x: 25, y: 35, w: 50, h: 61 } }), '11v11')).toBe('keskusta');
    expect(A.tmKtAlueAvain(p({ alue: { x: 0, y: 96, w: 100, h: 26 }, alue_avain: 'puolustus' }), '11v11')).toBe('keskipuolustus');   // 8v8 → 11v11: keskipiste (50,109) osuu keskipuolustukseen
    expect(A.tmKtAlueAvain(p(null), '8v8')).toBeNull(); expect(A.tmKtAlueAvain({}, '8v8')).toBeNull(); expect(A.tmKtAlueAvain(p({ alue: { x: 25, y: 35, w: 50, h: 61 } }), '5v5')).toBeNull();
  });
});
describe('tmKtAlueEhdotus: linja → TM-pelipaikkadata; ei dataa → ei esivalintaa', () => {
  const P = { KH: { nimi: 'Keskushyökkääjä', numerot: [9], oletusalue: { '8v8': 'karki', '11v11': 'karki' } }, T: { nimi: 'Toppari', numerot: [4, 5], oletusalue: 'keskipuolustus' }, LA: { nimi: 'Laitahyökkääjä' } };
  const pel = (positio) => ({ id: 'p1', tt_positio_aktiivinen: positio });
  it('TM-pelipaikkadata: oletusalue (avain tai { muoto: avain }); seuran linja voittaa; kelvoton avain ohitetaan; ei arvausta', () => {
    expect(A.tmKtAlueEhdotus(pel('KH'), { muoto: '8v8', pelipaikat: P })).toBe('karki');
    expect(A.tmKtAlueEhdotus(pel('T'), { muoto: '11v11', pelipaikat: P })).toBe('keskipuolustus');
    expect(A.tmKtAlueEhdotus(pel('T'), { muoto: '8v8', pelipaikat: P })).toBeNull();   // keskipuolustus ei kuulu 8v8-jakoon → ei ehdotusta
    expect(A.tmKtAlueEhdotus(pel('KH'), { muoto: '8v8', pelipaikat: P, linja: { pelipaikkaAlueet: { KH: 'keskusta' } } })).toBe('keskusta');   // linja ensin
    expect(A.tmKtAlueEhdotus(pel('KH'), { muoto: '8v8', pelipaikat: P, linja: { pelipaikkaAlueet: { KH: 'ei_olemassa' } } })).toBe('karki');   // kelvoton linjan avain → TM-data
    expect(A.tmKtAlueEhdotus(pel('LA'), { muoto: '8v8', pelipaikat: P })).toBeNull(); expect(A.tmKtAlueEhdotus({ id: 'p1' }, { muoto: '8v8', pelipaikat: P })).toBeNull(); expect(A.tmKtAlueEhdotus(pel('KH'), { pelipaikat: P })).toBeNull();
  });
  it('NYKYDATALLA mitään ei esivalita: TM_TT_PELIPAIKAT:ssa ei ole oletusaluetta', () => {
    const PP = require('../lib/tm_teknistaktiset.js'); const kaikki = (typeof PP.TM_TT_PELIPAIKAT !== 'undefined' ? PP.TM_TT_PELIPAIKAT : null) || (new Function(lue('lib/tm_teknistaktiset.js').slice(0, lue('lib/tm_teknistaktiset.js').indexOf('};', lue('lib/tm_teknistaktiset.js').indexOf('var TM_TT_PELIPAIKAT')) + 2) + '; return TM_TT_PELIPAIKAT;'))();
    Object.keys(kaikki).forEach((k) => expect(kaikki[k].oletusalue, k).toBeUndefined());
    ['MV', 'LP', 'T', 'KK', 'KH', 'LA'].forEach((k) => ['8v8', '11v11'].forEach((m) => expect(A.tmKtAlueEhdotus(pel(k), { muoto: m }), k + m).toBeNull()));
  });
});
describe('tmKtAlueKirjoitus: {x,y,w,h} + alue_avain (Rules v3.64 -muoto)', () => {
  it('polut: alue, asetti_uid, asetettu_pvm (paikallinen päivä), alue_avain; tuntematon avain / ei uid → ok:false', () => {
    const r = A.tmKtAlueKirjoitus({}, 'keskusta', '8v8', { uid: 'u1', nyt: new Date(2026, 9, 14) });
    expect(r.ok).toBe(true); expect(r.polut).toEqual({ 'ydinvahvuus.alue': { x: 25, y: 35, w: 50, h: 61 }, 'ydinvahvuus.asetti_uid': 'u1', 'ydinvahvuus.asetettu_pvm': '2026-10-14', 'ydinvahvuus.alue_avain': 'keskusta' });
    expect(A.tmKtAlueKirjoitus({}, 'vasen_puolustaja', '8v8', { uid: 'u1' }).ok).toBe(false); expect(A.tmKtAlueKirjoitus({}, 'keskusta', '8v8', {}).ok).toBe(false);
  });
});
describe('tmKtAlueMahdollinen: 5v5 → ei aluevalintaa', () => {
  it('false vain kun pelimuodot = [5v5] (asetus tai ikä ≤ 9); muuten true', () => {
    expect(A.tmKtAlueMahdollinen({ pelimuodot: ['5v5'] })).toBe(false); expect(A.tmKtAlueMahdollinen({ pelimuodot: ['8v8'] })).toBe(true); expect(A.tmKtAlueMahdollinen({ pelimuodot: ['5v5', '8v8'] })).toBe(true);
    expect(A.tmKtAlueMahdollinen(null, { ika: 8 })).toBe(false); expect(A.tmKtAlueMahdollinen(null, { ika: 11 })).toBe(true); expect(A.tmKtAlueMahdollinen(null, {})).toBe(true);
  });
});
describe('tmKtAlueSheetHTML', () => {
  const c = { kenttaSvg: '<svg></svg>', valitseFn: 'v', muotoFn: 'm', tallennaFn: 't', suljeFn: 's' };
  it('8v8: 6 vyöhykepainiketta, valittu aria-pressed + "ehdotus"-merkintä vain esivalitulle; Tallenna estetty ilman valintaa', () => {
    const h = A.tmKtAlueSheetHTML({ muoto: '8v8', muodot: ['8v8'], valittu: 'karki', ehdotus: 'karki' }, c);
    expect((h.match(/data-ka-alue=/g) || []).length).toBe(6); expect(h).toMatch(/data-ka-alue="karki" aria-pressed="true"/); expect(h).toContain('data-ka-ehdotus'); expect((h.match(/data-ka-ehdotus/g) || []).length).toBe(1);
    expect(A.tmKtAlueSheetHTML({ muoto: '8v8', muodot: ['8v8'], valittu: 'karki', ehdotus: 'karki', valintaTehty: true }, c)).not.toContain('data-ka-ehdotus');   // käyttäjä on valinnut → merkintä pois
    expect(A.tmKtAlueSheetHTML({ muoto: '11v11', muodot: ['11v11'] }, c)).toMatch(/data-ka-tallenna[^>]*aria-disabled="true"/); expect((A.tmKtAlueSheetHTML({ muoto: '11v11', muodot: ['11v11'] }, c).match(/data-ka-alue=/g) || []).length).toBe(8);
  });
  it('pelimuoto kysytään kun puuttuu (kolme nappia), kaksi pelimuotoa → vaihtokytkin; 5v5 → selite, ei vyöhykkeitä', () => {
    const k = A.tmKtAlueSheetHTML({ kysy: true, muoto: null, muodot: [] }, c); expect((k.match(/data-ka-muoto=/g) || []).length).toBe(3); expect(k).not.toContain('data-ka-alue=');
    expect((A.tmKtAlueSheetHTML({ muoto: '11v11', muodot: ['11v11', '8v8'] }, c).match(/data-ka-muoto=/g) || []).length).toBe(2);
    const v = A.tmKtAlueSheetHTML({ kysy: true, muoto: '5v5', muodot: [] }, c); expect(v).toContain('data-ka-5v5'); expect(v).not.toContain('data-ka-alue=');
  });
  it('lib ei sisällä hex-/rgb-värejä; tekstit FI-avaimina; kiellettyjä sanoja ei', () => {
    const lib = lue('lib/tm_kt_alue.js'); expect(lib).not.toMatch(/(?<![&\w])#[0-9a-fA-F]{6}\b/); expect(lib).not.toMatch(/rgba?\(/);
    const SN = require('../lib/tm_sanasto.js'); Object.entries(A.FI).forEach(([k, v]) => expect(SN.tmSanastoKielletyt(v), k).toEqual([]));
  });
});
