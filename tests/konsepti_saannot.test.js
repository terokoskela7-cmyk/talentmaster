/**
 * Videoanalyysi V1-1: lib/tm_konsepti_saannot.js — konseptin säännöt tilannekuvasta (V0 §2 -muoto, synteettinen data).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const S = require('../lib/tm_konsepti_saannot.js');
const F = require('./fixtures/saannot_synteettinen.js');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const ajo = (t, avain, o) => S.konseptiSaannot(t, avain, Object.assign({ t: 3 }, o || {}));
const mit = (r, id) => r.mittarit.find((x) => x.id === id);
const rool = (r, k) => r.roolit.find((x) => x.konsepti === k);

describe('J-P2 11v11', () => {
  it('ok-tilanne: kaikki mittarit ok ja arvot pyöristetty 0,5 m:iin', () => {
    const r = ajo(F.jp2(), 'j_p2');
    expect(r.mittarit.map((m) => m.id)).toEqual(['linjavali', 'kk_leveys', 'kk_painopiste', 'takalinja_aukko']);
    expect(mit(r, 'linjavali')).toMatchObject({ tila: 'ok', arvo: 12, raja: 12, lahde: 'tm', kpi: 'a' });
    expect(mit(r, 'kk_leveys')).toMatchObject({ tila: 'ok', arvo: 16, raja: 25 });
    expect(mit(r, 'kk_painopiste')).toMatchObject({ tila: 'ok', arvo: 1.5, raja: 4, kpi: 'b' });
    expect(mit(r, 'takalinja_aukko')).toMatchObject({ tila: 'ok', arvo: 10, raja: 12, kpi: 'c' });
    expect(rool(r, 't_p1')).toMatchObject({ tila: 'ok', arvo: 0, tunniste: expect.any(Number) });
    expect(rool(r, 'lp_p2').tila).toBe('ok');
    r.mittarit.concat(r.roolit).forEach((x) => { if (typeof x.arvo === 'number') expect((x.arvo * 2) % 1).toBe(0); });
  });
  it('klipin 6 poikkeama: painopiste 6,5 m, toppari 4 m edellä, aukko 15 m', () => {
    const r = ajo(F.jp2Poikkeama(), 'j_p2');
    expect(mit(r, 'kk_painopiste')).toMatchObject({ tila: 'poikkeama', arvo: 6.5 });
    expect(mit(r, 'takalinja_aukko')).toMatchObject({ tila: 'poikkeama', arvo: 15 });
    expect(rool(r, 't_p1')).toMatchObject({ tila: 'poikkeama', arvo: 4, tunniste: 4 });
    expect(rool(r, 'lp_p2').tila).toBe('poikkeama');
    // kk_p1 viittaa kk_painopisteeseen
    expect(rool(r, 'kk_p1')).toMatchObject({ tila: 'poikkeama', arvo: 6.5, raja: 4 });
  });
  it('havaintoroolit eivät saa mittaria', () => {
    const r = ajo(F.jp2(), 'j_p2');
    ['j_p1', 't_p3'].forEach((k) => expect(rool(r, k)).toMatchObject({ tila: 'havainto', arvo: null, raja: null }));
  });
  it('kk_leveys on ei_dataa kun pallo ei ole laidalla', () => {
    const t = F.jp2(); t.pallo = [{ t: 0, x: -25, y: 2 }, { t: 10, x: -25, y: 2 }];
    expect(mit(ajo(t, 'j_p2'), 'kk_leveys')).toMatchObject({ tila: 'ei_dataa', arvo: null });
  });
  it('pallo puuttuu → pallosidonnaiset ei_dataa, linjavali silti lasketaan (puuttuva data ei ole poikkeama)', () => {
    const t = F.jp2(); t.pallo = null;
    const r = ajo(t, 'j_p2');
    expect(mit(r, 'kk_painopiste').tila).toBe('ei_dataa');
    expect(mit(r, 'linjavali').tila).toBe('ok');
    expect(rool(r, 'lp_p2').tila).toBe('ei_dataa');
  });
  it('epätarkka pelaaja (> 2,0 m) jätetään pois ja siitä tulee huomio', () => {
    const t = F.jp2(); t.pelaajat.find((q) => q.tunniste === 1).tarkkuus_m = 3.5;
    const r = ajo(t, 'j_p2');
    expect(r.huomiot).toContainEqual({ syy: 'epatarkka_ohitettu', tunniste: 1 });
    expect(mit(r, 'takalinja_aukko').tunnisteet).not.toContain(1);
  });
  it('linjat päätellään syvyydestä (huomio) ja alle linjan koon → ei_dataa', () => {
    expect(ajo(F.jp2(), 'j_p2').huomiot).toContainEqual({ syy: 'linjat_paateltu_syvyydesta' });
    const t = F.jp2(); t.pelaajat = t.pelaajat.filter((q) => !(q.joukkue === 'oma' && q.tunniste >= 5 && q.tunniste <= 10));
    expect(mit(ajo(t, 'j_p2'), 'kk_painopiste').tila).toBe('ei_dataa');
  });
});

describe('pelimuodot', () => {
  it('8v8 käyttää 8v8-rajoja ja 3+3-linjoja', () => {
    const r = ajo(F.jp2_8v8(), 'j_p2');
    expect(mit(r, 'linjavali')).toMatchObject({ raja: 7, tila: 'ok' });
    expect(mit(r, 'kk_painopiste').raja).toBe(2.5);
    expect(mit(r, 'takalinja_aukko')).toMatchObject({ raja: 7, arvo: 8, tila: 'poikkeama' });
  });
  it('5v5 (ja muu pelimuoto) → kaikki ei_dataa', () => {
    ['5v5', '9v9'].forEach((pm) => {
      const r = ajo(F.jp2(), 'j_p2', { pelimuoto: pm });
      expect(r.mittarit.concat(r.roolit).filter((x) => x.tila !== 'ei_dataa' && x.tila !== 'havainto')).toEqual([]);
      expect(r.huomiot).toContainEqual({ syy: 'pelimuoto_ei_konseptin' });
    });
  });
});

describe('J-H4', () => {
  it('tasku-vastaanotto 6,9 m → ok, 3 m → poikkeama, tapahtuma puuttuu → ei_dataa', () => {
    expect(mit(ajo(F.jh4({ etaisyys: 6.9 }), 'j_h4'), 'tasku_vastaanotto')).toMatchObject({ tila: 'ok', arvo: 7, raja: 5 });
    expect(mit(ajo(F.jh4({ etaisyys: 3 }), 'j_h4'), 'tasku_vastaanotto')).toMatchObject({ tila: 'poikkeama', arvo: 3 });
    expect(mit(ajo(F.jh4({ tapahtuma: false }), 'j_h4'), 'tasku_vastaanotto')).toMatchObject({ tila: 'ei_dataa', arvo: null });
  });
  it('roolirivit viittaavat mittareihin ja kantavat tunnisteen', () => {
    const r = ajo(F.jh4(), 'j_h4');
    expect(rool(r, 'ky_h2')).toMatchObject({ tila: 'ok', tunniste: 2 });
    expect(rool(r, 'j_h4')).toMatchObject({ tila: 'ok', arvo: 6, tunniste: 2 });
    expect(rool(r, 'j_h5').tila).toBe('havainto');
  });
  it('sitova kuljetus ja takalinjan tasalta lähtö: ok ja poikkeama', () => {
    expect(mit(ajo(F.jh4({ kuljetus: 3 }), 'j_h4'), 'sitova_kuljetus')).toMatchObject({ tila: 'poikkeama', arvo: 3 });
    expect(rool(ajo(F.jh4({ juoksu: 7 }), 'j_h4'), 'lp_h5')).toMatchObject({ tila: 'ok', arvo: 7, tunniste: 3 });
    expect(rool(ajo(F.jh4({ juoksu: 3, kuljetus: 2 }), 'j_h4'), 'lp_h5')).toMatchObject({ tila: 'poikkeama', arvo: 3, tunniste: 3 });
  });
  it('blokin venytys: leveä blokki ok, kapea ilman siirtoa poikkeama', () => {
    expect(mit(ajo(F.jh4({ leveys: true }), 'j_h4'), 'blokin_venytys')).toMatchObject({ tila: 'ok', arvo: { leveys: 48, siirto: 0 } });
    expect(mit(ajo(F.jh4(), 'j_h4'), 'blokin_venytys')).toMatchObject({ tila: 'poikkeama', raja: { leveys: 40, siirto: 8 } });
  });
  it('ohitetut = pallon takana olevat vastustajat; 8v8-raja eri', () => {
    expect(mit(ajo(F.jh4(), 'j_h4'), 'ohitetut')).toMatchObject({ tila: 'ok', arvo: 6, raja: 4 });
    expect(mit(ajo(F.jh4({ pelimuoto: '8v8' }), 'j_h4'), 'ohitetut').raja).toBe(3);
  });
});

describe('asetukset, suunta, aikaväli, virheet', () => {
  it('asetukset.rajat korvaa mittarikohtaisesti ja palauttaa lähteen seura', () => {
    const r = ajo(F.jp2(), 'j_p2', { asetukset: { rajat: { kk_painopiste: 1 } } });
    expect(mit(r, 'kk_painopiste')).toMatchObject({ raja: 1, lahde: 'seura', tila: 'poikkeama' });
    expect(mit(r, 'linjavali').lahde).toBe('tm');
    const h = ajo(F.jh4(), 'j_h4', { asetukset: { rajat: { blokin_venytys: { leveys: 30 }, lp_h5: 1 } } });
    expect(mit(h, 'blokin_venytys')).toMatchObject({ raja: { leveys: 30, siirto: 8 }, lahde: 'seura', tila: 'ok' });
    expect(rool(h, 'lp_h5')).toMatchObject({ raja: 1, lahde: 'seura' });
  });
  it('suunta oikea (180° kierretty) antaa saman tuloksen kuin vasen', () => {
    [[F.jp2Poikkeama(), 'j_p2'], [F.jp2(), 'j_p2'], [F.jh4(), 'j_h4'], [F.jh4({ etaisyys: 3 }), 'j_h4']].forEach(([t, a]) => {
      expect(ajo(F.kierra(t), a)).toEqual(ajo(t, a));
    });
  });
  it('aikaväli palauttaa huonoimman arvon ja sen ajan', () => {
    const t = F.jp2();
    const liikkuva = t.pelaajat.find((q) => q.tunniste === 1);
    liikkuva.polku = Array.from({ length: 21 }, (_, i) => ({ t: i / 2, x: -34, y: i / 2 < 3 ? -15 : -30 }));
    const piste = ajo(t, 'j_p2', { t: 0 });
    const ikk = ajo(t, 'j_p2', { t: 0, ikkuna_s: 4 });
    expect(mit(piste, 'takalinja_aukko').arvo).toBe(10);
    expect(mit(ikk, 'takalinja_aukko')).toMatchObject({ arvo: 25, tila: 'poikkeama', t: 3 });
  });
  it('tuntematon avain, puuttuva t tai tilanne → tyhjä tulos ilman poikkeusta', () => {
    const tyhja = { mittarit: [], roolit: [], huomiot: [] };
    expect(S.konseptiSaannot(F.jp2(), 'x_y', { t: 3 })).toEqual(tyhja);
    expect(S.konseptiSaannot(F.jp2(), 'j_p2', {})).toEqual(tyhja);
    expect(S.konseptiSaannot(null, 'j_p2', { t: 3 })).toEqual(tyhja);
  });
  it('hetki ilman havaintoja (> 0,5 s päässä) → ei_dataa, ei poikkeamaa', () => {
    const r = ajo(F.jp2(), 'j_p2', { t: 99 });
    expect(r.mittarit.every((m) => m.tila === 'ei_dataa')).toBe(true);
  });
  it('syöte ei muutu (syväjäädytetty) ja tulos on deterministinen', () => {
    const jaada = (o) => { if (o && typeof o === 'object') { Object.values(o).forEach(jaada); Object.freeze(o); } return o; };
    const t = jaada(F.jp2Poikkeama());
    expect(ajo(t, 'j_p2')).toEqual(ajo(t, 'j_p2'));
  });
});

describe('vartijat', () => {
  const lahde = readFileSync(join(juuri, 'lib/tm_konsepti_saannot.js'), 'utf8');
  it('sääntödatassa ei ole fi/sv-tekstejä: kaikki merkkijonot ovat tunnisteita', () => {
    const kasaa = (o, ulos) => { if (typeof o === 'string') ulos.push(o); else if (o && typeof o === 'object') Object.values(o).forEach((v) => kasaa(v, ulos)); return ulos; };
    const merkkijonot = kasaa(S.TM_KONSEPTI_SAANNOT, []);
    expect(merkkijonot.length).toBeGreaterThan(40);
    expect(merkkijonot.filter((m) => !/^[a-z0-9_]+$/.test(m))).toEqual([]);
  });
  it('sääntödatan konseptiavaimet löytyvät kaanonista', () => {
    const k = require('../lib/tm_teknistaktiset.js');
    const kaikki = JSON.stringify(k);
    Object.keys(S.TM_KONSEPTI_SAANNOT).forEach((a) => {
      expect(kaikki).toContain('"avain":"' + a + '"');
    });
  });
  it('lähteessä ei ole Firestore-, verkko-, tallennus- eikä DOM-kutsuja', () => {
    const ilmanKommentteja = lahde.replace(/\/\/.*$/gm, '');
    expect(ilmanKommentteja.match(/firebase|firestore|\.set\(|\.update\(|\.add\(|\.delete\(|fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|document\.|require\(|import\s|console\./)).toBeNull();
  });
});
