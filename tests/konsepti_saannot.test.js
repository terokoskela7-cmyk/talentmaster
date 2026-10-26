/**
 * Taktiikkatyökalu, vaihe A · V1-1: lib/tm_konsepti_saannot.js — puhdas kirjasto, synteettinen data.
 * Vartija: kirjasto ei kirjoita mitään (ei Firestorea, verkkoa, tallennusta eikä syötteen mutaatiota).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const S = require('../lib/tm_konsepti_saannot.js');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');

const J_P2 = { avain: 'j_p2', koodi: 'J-P2', pelimuoto: ['8v8', '11v11'] };
// 8v8 → 7 kenttäpelaajaa + mv. Kenttä 68 × 105 m (x leveys, y pituus); oma hyökkäys 'ylos' → oma maali y=105.
const mv = { id: 'MV', x: 34, y: 103, mv: true };
const rivi = (id, x, y) => ({ id, x, y });
// Tiivis lohko: leveys 20, syvyys 24, keskikäytävä (x 22.7–45.3) täynnä.
function tiivis(dx) {
  dx = dx || 0;
  return [mv, rivi('A', 24 + dx, 60), rivi('B', 30 + dx, 66), rivi('C', 36 + dx, 70), rivi('D', 42 + dx, 66),
    rivi('E', 44 + dx, 60), rivi('F', 32 + dx, 78), rivi('G', 38 + dx, 84)];
}
function hetki(t, palloX, oma, lisa) {
  return Object.assign({ t: t, pallo: { x: palloX, y: 55 }, oma: oma, vastustaja: [rivi('V1', palloX, 55), rivi('V2', 30, 40), rivi('V3', 40, 40)] }, lisa || {});
}
function tilanne(hetket, lisa) {
  return Object.assign({ id: 't1', pelimuoto: '8v8', kentta: { pituus: 105, leveys: 68 }, suunta: 'ylos', hetket: hetket }, lisa || {});
}
const rivit = (r) => Object.fromEntries(r.map((x) => [x.saanto, x]));

describe('rivin muoto', () => {
  it('jokaisella rivillä on saanto, tila, arvo, raja, hetki ja perustelu', () => {
    const r = S.tmKonseptiSaannot(tilanne([hetki(0, 8, tiivis())]), J_P2);
    expect(r.length).toBe(4);
    r.forEach((x) => {
      expect(['ok', 'ylittyy', 'havainto', 'ei_dataa']).toContain(x.tila);
      ['saanto', 'kpi', 'arvo', 'raja', 'hetki', 'perustelu'].forEach((k) => expect(x).toHaveProperty(k));
      expect(typeof x.perustelu).toBe('string');
    });
  });
});

describe('J-P2a kompaktius', () => {
  it('tiivis lohko on ok ja arvo = leveys/syvyys metreinä', () => {
    const r = rivit(S.tmKonseptiSaannot(tilanne([hetki(0, 34, tiivis())]), J_P2));
    expect(r.j_p2a_leveys).toMatchObject({ tila: 'ok', arvo: 20, raja: 25, hetki: 0, kpi: 'a' });
    expect(r.j_p2a_syvyys).toMatchObject({ tila: 'ok', arvo: 24, raja: 30 });
  });
  it('hajanainen lohko ylittyy ja osoittaa pahimman hetken', () => {
    const levea = tiivis(); levea[1] = rivi('A', 5, 60);   // leveys 39
    const r = rivit(S.tmKonseptiSaannot(tilanne([hetki(0, 34, tiivis()), hetki(1, 34, levea)]), J_P2));
    expect(r.j_p2a_leveys).toMatchObject({ tila: 'ylittyy', arvo: 39, hetki: 1 });
  });
  it('maalivahti ei kuulu lohkoon (mv-lippu) — vaikka hän olisi kaukana', () => {
    const r = rivit(S.tmKonseptiSaannot(tilanne([hetki(0, 34, tiivis())]), J_P2));
    expect(r.j_p2a_syvyys.arvo).toBe(24);   // mv y=103 ei laskettu
  });
  it('maalivahti tunnistetaan oman maalin puoleisimmaksi ilman mv-lippua, myös suunnalla alas', () => {
    const ilman = tiivis().map((p) => rivi(p.id, p.x, p.y));
    const ylos = rivit(S.tmKonseptiSaannot(tilanne([hetki(0, 34, ilman)]), J_P2));
    expect(ylos.j_p2a_syvyys.arvo).toBe(24);
    const peilattu = ilman.map((p) => rivi(p.id, p.x, 105 - p.y));
    const alas = rivit(S.tmKonseptiSaannot(tilanne([hetki(0, 34, peilattu)], { suunta: 'alas' }), J_P2));
    expect(alas.j_p2a_syvyys.arvo).toBe(24);
  });
});

describe('J-P2b ryhmityksen siirtyminen', () => {
  it('lohko seuraa palloa → ok', () => {
    const r = rivit(S.tmKonseptiSaannot(tilanne([hetki(0, 12, tiivis(-8)), hetki(1, 34, tiivis(8))]), J_P2));
    expect(r.j_p2b_siirtyma.tila).toBe('ok');
    expect(r.j_p2b_siirtyma.arvo).toBeGreaterThanOrEqual(0.5);
  });
  it('lohko ei seuraa palloa → ylittyy; vastakkainen suunta on negatiivinen', () => {
    const paikallaan = rivit(S.tmKonseptiSaannot(tilanne([hetki(0, 12, tiivis()), hetki(1, 34, tiivis())]), J_P2));
    expect(paikallaan.j_p2b_siirtyma).toMatchObject({ tila: 'ylittyy', arvo: 0, raja: 0.5, hetki: 1 });
    const vaarin = rivit(S.tmKonseptiSaannot(tilanne([hetki(0, 12, tiivis(8)), hetki(1, 34, tiivis(-8))]), J_P2));
    expect(vaarin.j_p2b_siirtyma.arvo).toBeLessThan(0);
  });
  it('pieni pallon liike ei arvioidu → ei_dataa', () => {
    const r = rivit(S.tmKonseptiSaannot(tilanne([hetki(0, 30, tiivis()), hetki(1, 34, tiivis())]), J_P2));
    expect(r.j_p2b_siirtyma).toMatchObject({ tila: 'ei_dataa', arvo: null, hetki: null });
  });
});

describe('J-P2c keskustan suojaus', () => {
  it('pallo laidalla ja keskikäytävässä riittävästi pelaajia → ok', () => {
    const r = rivit(S.tmKonseptiSaannot(tilanne([hetki(0, 6, tiivis())]), J_P2));
    expect(r.j_p2c_keskusta).toMatchObject({ tila: 'ok', raja: 2 });
  });
  it('keskikäytävä tyhjä pallon ollessa laidalla → ylittyy', () => {
    const laidalla = [mv, rivi('A', 4, 60), rivi('B', 8, 66), rivi('C', 12, 70), rivi('D', 16, 66), rivi('E', 18, 60), rivi('F', 10, 78), rivi('G', 14, 84)];
    const r = rivit(S.tmKonseptiSaannot(tilanne([hetki(0, 6, laidalla)]), J_P2));
    expect(r.j_p2c_keskusta).toMatchObject({ tila: 'ylittyy', arvo: 0, hetki: 0 });
  });
  it('pallo keskellä → sääntö ei koske (ei_dataa)', () => {
    expect(rivit(S.tmKonseptiSaannot(tilanne([hetki(0, 34, tiivis())]), J_P2)).j_p2c_keskusta.tila).toBe('ei_dataa');
  });
});

describe('seuran rajat, pelimuodot ja reunatapaukset', () => {
  it('opts.rajat ylikirjoittaa oletuksen; raja null → havainto; kelvoton arvo ohitetaan', () => {
    const t = tilanne([hetki(0, 34, tiivis())]);
    expect(rivit(S.tmKonseptiSaannot(t, J_P2, { rajat: { leveys: 15 } })).j_p2a_leveys).toMatchObject({ tila: 'ylittyy', raja: 15 });
    expect(rivit(S.tmKonseptiSaannot(t, J_P2, { rajat: { leveys: null } })).j_p2a_leveys).toMatchObject({ tila: 'havainto', raja: null, arvo: 20 });
    expect(rivit(S.tmKonseptiSaannot(t, J_P2, { rajat: { leveys: 'x', tuntematon: 1 } })).j_p2a_leveys.raja).toBe(25);
  });
  it('oletusrajat eroavat pelimuodoittain (11v11 sallii leveämmän lohkon)', () => {
    expect(S.TM_KS_OLETUSRAJAT['11v11'].leveys).toBeGreaterThan(S.TM_KS_OLETUSRAJAT['8v8'].leveys);
  });
  it('pelimuoto jota konsepti ei koske → yksi ei_dataa -rivi', () => {
    const r = S.tmKonseptiSaannot(tilanne([hetki(0, 34, tiivis())], { pelimuoto: '5v5' }), J_P2);
    expect(r).toHaveLength(1);
    expect(r[0].tila).toBe('ei_dataa');
  });
  it('tuntematon konsepti, puuttuva syöte tai ei hetkiä ei heitä', () => {
    expect(S.tmKonseptiSaannot(tilanne([]), { avain: 'tuntematon' })).toEqual([]);
    expect(S.tmKonseptiSaannot(null, J_P2)).toEqual([]);
    expect(S.tmKonseptiSaannot(tilanne([hetki(0, 34, tiivis())]), null)).toEqual([]);
    S.tmKonseptiSaannot(tilanne([]), J_P2).forEach((x) => expect(x.tila).toBe('ei_dataa'));
    expect(S.tmKonseptiSaannot(tilanne([hetki(0, 34, tiivis())], { kentta: null }), J_P2)[0].tila).toBe('ei_dataa');
  });
  it('hyökkäysvaiheen hetket ohitetaan; vastustaja voi olla puolustaja', () => {
    const r = rivit(S.tmKonseptiSaannot(tilanne([hetki(0, 34, tiivis(), { vaihe: 'hyokkays' })]), J_P2));
    expect(r.j_p2a_leveys.tila).toBe('ei_dataa');
    const vast = [mv, rivi('A', 24, 45), rivi('B', 30, 39), rivi('C', 36, 35), rivi('D', 42, 39), rivi('E', 44, 45), rivi('F', 32, 27)].map((p) => (p.mv ? { id: 'MV', x: 34, y: 2, mv: true } : p));
    const t = tilanne([{ t: 0, pallo: { x: 34, y: 50 }, oma: [], vastustaja: vast }]);
    expect(rivit(S.tmKonseptiSaannot(t, J_P2, { puolustaja: 'vastustaja' })).j_p2a_leveys.arvo).toBe(20);
  });
});

describe('vartija: ei kirjoituksia', () => {
  const lahde = readFileSync(join(juuri, 'lib/tm_konsepti_saannot.js'), 'utf8').replace(/\/\/.*$/gm, '');
  it('lähdekoodissa ei ole Firestore-, verkko-, tallennus- eikä DOM-kutsuja', () => {
    const kielletyt = /firebase|firestore|\.set\(|\.update\(|\.add\(|\.delete\(|fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|document\.|require\(|import\s|console\./;
    expect(lahde.match(kielletyt)).toBeNull();
  });
  it('syötteitä ei mutatoida (syväjäädytetty syöte läpäisee)', () => {
    const jaada = (o) => { if (o && typeof o === 'object') { Object.values(o).forEach(jaada); Object.freeze(o); } return o; };
    const t = jaada(tilanne([hetki(0, 12, tiivis()), hetki(1, 34, tiivis(8))]));
    const k = jaada({ avain: 'j_p2', pelimuoto: ['8v8', '11v11'] });
    const rajat = jaada({ leveys: 20 });
    expect(() => S.tmKonseptiSaannot(t, k, { rajat: rajat })).not.toThrow();
  });
  it('sama syöte antaa saman tuloksen (deterministinen)', () => {
    const t = tilanne([hetki(0, 12, tiivis()), hetki(1, 34, tiivis(8))]);
    expect(S.tmKonseptiSaannot(t, J_P2)).toEqual(S.tmKonseptiSaannot(t, J_P2));
  });
});
