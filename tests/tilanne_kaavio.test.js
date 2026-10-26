/**
 * Taktiikkatyökalu, vaihe A · V0-1: lib/tm_tilanne_kaavio.js — tilanteen hetki → kaavion spec.
 * Synteettinen data; speciä verrataan jaettuun validaattoriin (YKSI TOTUUS). Vartija: ei kirjoituksia.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const K = require('../lib/tm_tilanne_kaavio.js');
const V = require('../lib/tm_kaavio_validate.js');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');

const p = (id, x, y) => ({ id, x, y });
function tilanne(lisa) {
  const oma = [p('MV', 34, 100), p('A', 20, 60), p('B', 30, 66), p('C', 40, 66), p('D', 48, 60), p('E', 34, 78), p('F', 26, 84), p('G', 42, 84)];
  const vast = [p('MV', 34, 5), p('A', 20, 40), p('B', 30, 38), p('C', 40, 38), p('D', 48, 40), p('E', 34, 28), p('F', 26, 22), p('G', 42, 22)];
  return Object.assign({
    id: 't1', pelimuoto: '8v8', kentta: { pituus: 105, leveys: 68 }, suunta: 'ylos',
    hetket: [{ t: 0, pallo: { x: 30.5, y: 65 }, oma, vastustaja: vast }, { t: 1, pallo: { x: 10, y: 10 }, oma, vastustaja: vast }]
  }, lisa || {});
}

describe('muunnos', () => {
  it('antaa validin specin ja skaalaa metrit 0–100:aan', () => {
    const { spec, varoitukset } = K.tmTilanneKaavio(tilanne(), 0, { avain: 'j_p2' });
    expect(V.validoiKaavio(spec)).toEqual({ E: [], W: expect.any(Array) });
    expect(spec).toMatchObject({ avain: 'j_p2', suunta: 'ylos', pelimuoto: '8v8' });
    expect(spec.pelaajat).toHaveLength(16);
    const a = spec.pelaajat.find((x) => x.id === 'o_A');
    expect(a).toMatchObject({ joukkue: 'oma', x: 29.4, y: 57.1 });   // 20/68, 60/105
    expect(varoitukset).toEqual([]);
  });
  it('id:t ovat uniikit joukkueiden yli (sama id molemmilla joukkueilla)', () => {
    const { spec } = K.tmTilanneKaavio(tilanne(), 0);
    expect(new Set(spec.pelaajat.map((x) => x.id)).size).toBe(spec.pelaajat.length);
    expect(spec.pelaajat.filter((x) => x.id.endsWith('MV'))).toHaveLength(2);
  });
  it('roolit: pallollinen syöttäjä + pallo, muut oma tuki, vastustaja paine', () => {
    const { spec } = K.tmTilanneKaavio(tilanne(), 0);
    expect(spec.pelaajat.filter((x) => x.pallo)).toHaveLength(1);
    expect(spec.pelaajat.find((x) => x.pallo)).toMatchObject({ id: 'o_B', rooli: 'syöttäjä' });
    expect(spec.pelaajat.filter((x) => x.joukkue === 'vastustaja').every((x) => x.rooli === 'paine')).toBe(true);
    expect(spec.pelaajat.filter((x) => x.joukkue === 'oma' && !x.pallo).every((x) => x.rooli === 'tuki')).toBe(true);
  });
  it('pallo ei kenenkään lähellä → ei palloa ja varoitus, spec silti validi', () => {
    const { spec, varoitukset } = K.tmTilanneKaavio(tilanne(), 1);
    expect(spec.pelaajat.some((x) => x.pallo)).toBe(false);
    expect(varoitukset).toContain('pallo_ei_pelaajalla');
    expect(V.validoiKaavio(spec).E).toEqual([]);
  });
  it('palloEtaisyysM-asetus ja suunta alas välittyvät; kpi menee specille', () => {
    const t = tilanne({ suunta: 'alas' });
    const kapea = K.tmTilanneKaavio(t, 0, { palloEtaisyysM: 0.1 });
    expect(kapea.spec.pelaajat.some((x) => x.pallo)).toBe(false);
    const { spec } = K.tmTilanneKaavio(t, 0, { avain: 'j_p2', kpi: 'b' });
    expect(spec).toMatchObject({ suunta: 'alas', kpi: 'b' });
    expect(V.validoiKaavio(spec, { kpiKoodit: ['a', 'b', 'c'] }).E).toEqual([]);
  });
  it('kentän ulkopuolinen koordinaatti leikataan ja raportoidaan', () => {
    const t = tilanne();
    t.hetket = [{ t: 0, pallo: { x: 0, y: 0 }, oma: [p('A', -2, 110), p('B', 30, 50), p('C', 40, 50)], vastustaja: [p('V', 30, 40)] }];
    const { spec, varoitukset } = K.tmTilanneKaavio(t, 0);
    expect(varoitukset).toContain('koordinaatti_leikattu');
    expect(spec.pelaajat.find((x) => x.id === 'o_A')).toMatchObject({ x: 0, y: 100 });
    expect(V.validoiKaavio(spec).E).toEqual([]);
  });
});

describe('virhetilat', () => {
  it('liikaa pelaajia pelimuotoon → ei specia', () => {
    const t = tilanne({ pelimuoto: '5v5' });
    expect(K.tmTilanneKaavio(t, 0)).toEqual({ spec: null, varoitukset: ['liikaa_pelaajia'] });
  });
  it('puuttuva hetki, kenttä tai tilanne → tilanne_puutteellinen eikä heitä', () => {
    expect(K.tmTilanneKaavio(tilanne(), 9).spec).toBeNull();
    expect(K.tmTilanneKaavio(tilanne({ kentta: null }), 0).varoitukset).toEqual(['tilanne_puutteellinen']);
    expect(K.tmTilanneKaavio(null, 0).spec).toBeNull();
  });
  it('kelvottomat pelaajakoordinaatit ohitetaan', () => {
    const t = tilanne();
    t.hetket[0].oma = [p('A', NaN, 5), p('B', 30, 50), p('C', 40, 50), { id: 'X' }];
    const { spec } = K.tmTilanneKaavio(t, 0);
    expect(spec.pelaajat.filter((x) => x.joukkue === 'oma').map((x) => x.id)).toEqual(['o_B', 'o_C']);
  });
});

describe('kaikki hetket', () => {
  it('tmTilanneKaaviot palauttaa yhden tuloksen per hetki', () => {
    const r = K.tmTilanneKaaviot(tilanne(), { avain: 'j_p2' });
    expect(r).toHaveLength(2);
    r.forEach((x) => expect(V.validoiKaavio(x.spec).E).toEqual([]));
    expect(K.tmTilanneKaaviot(null)).toEqual([]);
  });
});

describe('vartija: ei kirjoituksia', () => {
  const lahde = readFileSync(join(juuri, 'lib/tm_tilanne_kaavio.js'), 'utf8').replace(/\/\/.*$/gm, '');
  it('lähdekoodissa ei ole Firestore-, verkko-, tallennus- eikä DOM-kutsuja', () => {
    expect(lahde.match(/firebase|firestore|\.set\(|\.update\(|\.add\(|\.delete\(|fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|document\.|require\(|import\s|console\./)).toBeNull();
  });
  it('syötettä ei mutatoida (syväjäädytetty syöte läpäisee) ja tulos on deterministinen', () => {
    const jaada = (o) => { if (o && typeof o === 'object') { Object.values(o).forEach(jaada); Object.freeze(o); } return o; };
    const t = jaada(tilanne());
    const a = K.tmTilanneKaavio(t, 0, { avain: 'j_p2' });
    expect(a).toEqual(K.tmTilanneKaavio(t, 0, { avain: 'j_p2' }));
  });
});
