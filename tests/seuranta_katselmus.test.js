/**
 * TalentMaster™ — Seuranta S2: katselmuksen edistymäkooste (peli edellä) + tulos-sanasto (VP_v25).
 * _vpEdistymaKooste: konsepti + D4 ADAR + pelipaikkakonseptit (tmTtItems) johtavat; D1/D2 = konteksti. Tyhjä → tyhjä.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

let S;
beforeAll(() => {
  const lines = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8').split('\n');
  const s = lines.findIndex((l) => l.includes('function _vpEdistymaKooste(p, opts) {'));
  const e = lines.findIndex((l) => l.includes('window._vpEdistymaKooste = _vpEdistymaKooste;'));
  if (s < 0 || e < 0) throw new Error('S2-lohkoa ei löytynyt');
  S = new Function('var window = {};\n' + lines.slice(s, e + 1).join('\n') +
    '\n return { _vpEdistymaKooste, _vpKatselmusTulos };')();
});

const TT = () => [{ nimi: 'Syöttö selkä maaliin' }, { nimi: 'Käännös paineessa' }, { nimi: 'Ajoitus' }, { nimi: 'Tila' }, { nimi: 'Viides' }];

describe('_vpEdistymaKooste — peli edellä (konsepti + ADAR + pelipaikka johtavat)', () => {
  it('nostaa teknis-taktisen konseptin + D4 ADAR-luvut + pelipaikkakonseptit (tmTtItems, max 4)', () => {
    const p = {
      jaksofokus: { konsepti_nimi: 'Haltuunotto', konsepti_avain: 'haltuunotto', domeeni: 'teknis_taktinen' },
      adar_viimeisin: { a: 3, d: 2, ac: 3, r: 3, yht: 2.7 },
      positio: 'LH', hh_taso: 2.5, tki_viimeisin: 88
    };
    const k = S._vpEdistymaKooste(p, { tmTtItems: TT, laskeD2Taso: () => 4, ika: 13 });
    expect(k.konseptiNimi).toBe('Haltuunotto');
    expect(k.domeeni).toBe('teknis_taktinen');
    expect(k.adar).toMatchObject({ a: 3, d: 2, ac: 3, r: 3, yht: 2.7 });
    expect(k.pelipaikka.konseptit).toEqual(['Syöttö selkä maaliin', 'Käännös paineessa', 'Ajoitus', 'Tila']);   // max 4
    expect(k.konteksti).toMatchObject({ d1: 2.5, d2: 4, tki: 88 });   // D1/D2 = konteksti, ei kärki
  });
  it('ei ADAR-dataa → adar null (ei keksitä); ei tmTtItems-libiä → tyhjä konseptilista', () => {
    const k = S._vpEdistymaKooste({ jaksofokus: { konsepti_nimi: 'X' } }, {});   // ei tmTtItems injektoitu
    expect(k.adar).toBeNull();
    expect(k.pelipaikka.konseptit).toEqual([]);
  });
  it('täysin tyhjä pelaaja → kaikki kentät tyhjiä (ei kaadu)', () => {
    const k = S._vpEdistymaKooste({}, {});
    expect(k.konseptiNimi).toBeNull();
    expect(k.adar).toBeNull();
    expect(k.pelipaikka.konseptit).toEqual([]);
    expect(k.konteksti.d1).toBeNull();
    expect(k.konteksti.d2).toBeNull();
  });
  it('phvNeutraali välitetään kontekstiin (§28-portti)', () => {
    expect(S._vpEdistymaKooste({}, { phvNeutraali: true }).konteksti.phvNeutraali).toBe(true);
    expect(S._vpEdistymaKooste({}, {}).konteksti.phvNeutraali).toBe(false);
  });
});

describe('_vpKatselmusTulos — tulos-sanasto (S3 historia)', () => {
  it('parani→Parani · ennallaan→Ennallaan · vaihda→Vaihda · tuntematon→null', () => {
    expect(S._vpKatselmusTulos('parani')).toBe('Parani');
    expect(S._vpKatselmusTulos('ennallaan')).toBe('Ennallaan');
    expect(S._vpKatselmusTulos('vaihda')).toBe('Vaihda');
    expect(S._vpKatselmusTulos('x')).toBeNull();
    expect(S._vpKatselmusTulos(null)).toBeNull();
  });
});
