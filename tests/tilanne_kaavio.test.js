/**
 * Videoanalyysi V0 / T1 — tilanne (metrit) → kaavio-spec (§3).
 * KOVIN VÄITE: muunnoksen tuottama spec läpäisee SAMAN validaattorin ja editorin tilaoperaatiot kuin
 * käsin piirretty kaavio. Lisäksi: ei arvata (aukko > 0,5 s → ohitus), tuomari ei kaavioon,
 * tapahtumadata voittaa seurannasta päätellyn kosketuksen (2D ei erota puskukaksinkamppailua).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const T = require('../lib/tm_tilanne_kaavio.js');
const V = require('../lib/tm_kaavio_validate.js');
const E = require('../lib/tm_kaavio_editori.js');
const FIX = () => JSON.parse(JSON.stringify(require('./fixtures/tilanne_synteettinen.json.js')));
const K = { pituus_m: 105, leveys_m: 68 };

describe('koordinaattimuunnos · oma hyökkää aina ylös', () => {
  it('omaPuolustaa vasen: oma maali y=100, vastustajan maali y=0', () => {
    expect(T.tilanneMetritSpeciin({ x: -52.5, y: 0 }, K, 'vasen').y).toBe(100);
    expect(T.tilanneMetritSpeciin({ x: 52.5, y: 0 }, K, 'vasen').y).toBe(0);
  });
  it('omaPuolustaa oikea: peilikuva', () => {
    expect(T.tilanneMetritSpeciin({ x: 52.5, y: 0 }, K, 'oikea').y).toBe(100);
    expect(T.tilanneMetritSpeciin({ x: -52.5, y: 0 }, K, 'oikea').y).toBe(0);
  });
  it('kierto, ei peilaus: hyökkääjän oikea laita → x > 50 molempiin suuntiin', () => {
    expect(T.tilanneMetritSpeciin({ x: 0, y: 20 }, K, 'vasen').x).toBeGreaterThan(50);
    expect(T.tilanneMetritSpeciin({ x: 0, y: -20 }, K, 'oikea').x).toBeGreaterThan(50);
  });
  it('kentän ulkopuolinen klampataan 0–100 ja raportoidaan', () => {
    const p = T.tilanneMetritSpeciin({ x: 60, y: 40 }, K, 'vasen');
    expect(p.klampattu).toBe(true); expect(p.x).toBe(100); expect(p.y).toBe(0);
  });
});

describe('tilanneKaavioksi · keskityshetki 0,0 s', () => {
  const r = T.tilanneKaavioksi(FIX(), 0, { avain: 'y_h1', pelimuoto: '11v11' });
  it('validaattori: 0 virhettä', () => expect(V.validoiKaavio(r.spec).E).toEqual([]));
  it('tuomari, epätarkka (> 2 m) ja havaitsematon ohitetaan syyn kanssa', () => {
    const syyt = Object.fromEntries(r.ohitetut.map(o => [o.tunniste, o.syy]));
    expect(syyt).toEqual({ 21: 'tuomari', 13: 'epatarkka', 3: 'ei_havaintoa' });
    expect(r.huomiot).toEqual([]);
  });
  it('pallollinen = tapahtuman tekijä, syöttö tekijältä kohteelle, ei arvio-merkintää', () => {
    const s = r.spec.liikkeet[0];
    expect(s.tyyppi).toBe('syotto');
    expect(r.tunnisteet[s.from.ref]).toBe(1); expect(r.tunnisteet[s.to.ref]).toBe(2);
    expect(s.lahde).toBeUndefined();
    expect(r.spec.pelaajat.filter(p => p.pallo).length).toBe(1);
  });
  it('maalivahti gk-lipulla', () => expect(r.spec.pelaajat.filter(p => p.gk).length).toBe(1));
  it('editorin siirto pitää specin validina', () => {
    const o = E.kaavioSiirraPelaaja(r.spec, r.spec.pelaajat[0].id, E.kaavioEdPX(30), E.kaavioEdPY(30));
    expect(V.validoiKaavio(o.spec || o).E).toEqual([]);
  });
});

describe('kaksinkamppailu: 2D ei erota kumpi osui', () => {
  it('ilman tapahtumia kosketus päätellään seurannasta ja merkitään lahde:arvio', () => {
    const f = FIX(); f.tapahtumat = [];
    const r = T.tilanneKaavioksi(f, 0, { avain: 'y_h1' });
    const s = r.spec.liikkeet.find(l => l.tyyppi === 'syotto');
    expect(s.lahde).toBe('arvio');
    expect(V.validoiKaavio(r.spec).E).toEqual([]);
  });
  it('tapahtuman tekijä voittaa lähimmän pelaajan: puskuhetkellä laukaus O2:lta', () => {
    const r = T.tilanneKaavioksi(FIX(), 0.94, { avain: 'y_h1' });
    const l = r.spec.liikkeet[0];
    expect(l.tyyppi).toBe('laukaus'); expect(r.tunnisteet[l.from.ref]).toBe(2);
  });
});

describe('ei arvata', () => {
  it('lähin havainto yli 0,5 s päässä → ohitus', () => {
    const t = { kentta: K, suunta: { omaPuolustaa: 'vasen' }, pelaajat: [{ tunniste: 1, joukkue: 'oma', polku: [{ t: 0, x: 0, y: 0 }, { t: 3, x: 5, y: 0 }] }] };
    const r = T.tilanneKaavioksi(t, 1.5, { avain: 'y_p1' });
    expect(r.spec.pelaajat).toEqual([]); expect(r.ohitetut[0].syy).toBe('ei_havaintoa');
  });
  it('pelimuodon katto: ylimenevät ohitetaan epätarkimmasta', () => {
    const pel = Array.from({ length: 6 }, (_, i) => ({ tunniste: i, joukkue: 'oma', tarkkuus_m: i / 10, polku: [{ t: 0, x: i, y: 0 }] }));
    const r = T.tilanneKaavioksi({ kentta: K, suunta: { omaPuolustaa: 'vasen' }, pelaajat: pel }, 0, { avain: 'y_p1', pelimuoto: '5v5' });
    expect(r.spec.pelaajat.length).toBe(5); expect(r.ohitetut).toEqual([{ tunniste: 5, syy: 'pelimuoto_taynna' }]);
    expect(V.validoiKaavio(r.spec).E).toEqual([]);
  });
});

describe('katselmuksen löydökset (regressiot)', () => {
  const base = () => ({ kentta: K, suunta: { omaPuolustaa: 'vasen' }, pelimuoto: '11v11', kesto_s: 3 });
  it('tapahtumat valitaan ajan mukaan, ei taulukon järjestyksessä', () => {
    const f = FIX(); f.tapahtumat = f.tapahtumat.slice().reverse();
    const r = T.tilanneKaavioksi(f, 0, { avain: 'y_h1' });
    expect(r.spec.liikkeet[0].tyyppi).toBe('syotto');
  });
  it('pallo ilmassa (0,25 s): ei pallollista, vaikka syöttötapahtuma on ikkunassa', () => {
    const r = T.tilanneKaavioksi(FIX(), 0.25, { avain: 'y_h1' });
    expect(r.spec.pelaajat.filter(p => p.pallo).length).toBe(0);
    expect(V.validoiKaavio(r.spec).E).toEqual([]);
  });
  it('tapahtuman tekijä puuttuu (epätarkka) → ei kaatumista, ei nuolta väärälle pelaajalle, huomio', () => {
    const f = FIX(); f.tapahtumat = [{ t: 0, tyyppi: 'laukaus', tekija: 13, kohde: null, lahde: 'valmentaja' }];
    const r = T.tilanneKaavioksi(f, 0, { avain: 'y_h1' });
    expect(r.spec.liikkeet.some(l => l.tyyppi === 'laukaus')).toBe(false);
    expect(r.huomiot).toContainEqual({ tunniste: 13, syy: 'tapahtuman_tekija_puuttuu' });
  });
  it('pelimuodon katto ei poista pallollista eikä vastaanottajaa (5v5, 7 omaa)', () => {
    const f = FIX();
    for (let i = 0; i < 5; i++) f.pelaajat.push({ tunniste: 100 + i, joukkue: 'oma', tarkkuus_m: 0.1, polku: [{ t: 0, x: 10 + i, y: 0 }, { t: 3, x: 10 + i, y: 0 }] });
    f.pelaajat.find(p => p.tunniste === 1).tarkkuus_m = 1.9; f.pelaajat.find(p => p.tunniste === 2).tarkkuus_m = 1.9;
    const r = T.tilanneKaavioksi(f, 0, { avain: 'y_h1', pelimuoto: '5v5' });
    expect(V.validoiKaavio(r.spec).E).toEqual([]);
    expect(Object.values(r.tunnisteet)).toEqual(expect.arrayContaining([1, 2]));
  });
  it('vastustajan laukaus osoittaa oman maalin suuntaan (y = 100)', () => {
    const t = Object.assign(base(), {
      pelaajat: [{ tunniste: 1, joukkue: 'vast', polku: [{ t: 0, x: -40, y: 0 }, { t: 1, x: -41, y: 0 }] }],
      pallo: [{ t: 0, x: -40, y: 0 }, { t: 1, x: -52, y: 0 }],
      tapahtumat: [{ t: 0, tyyppi: 'laukaus', tekija: 1, lahde: 'valmentaja' }] });
    const l = T.tilanneKaavioksi(t, 0, { avain: 'y_p1' }).spec.liikkeet[0];
    expect(l.tyyppi).toBe('laukaus'); expect(l.to.y).toBe(100);
  });
  it('paine vain ≤ 5 m: kaukainen maalivahti ei ole paine', () => {
    const r = T.tilanneKaavioksi(FIX(), 0, { avain: 'y_h1' });
    const mv = r.spec.pelaajat.find(p => p.gk);
    expect(mv.rooli).toBe('tuki');
  });
  it('klamppaus on huomio, ei ohitus', () => {
    const t = Object.assign(base(), { pelaajat: [{ tunniste: 1, joukkue: 'oma', polku: [{ t: 0, x: 55, y: 0 }] }] });
    const r = T.tilanneKaavioksi(t, 0, { avain: 'y_p1' });
    expect(r.ohitetut).toEqual([]); expect(r.huomiot).toEqual([{ tunniste: 1, syy: 'klampattu_rajalle' }]);
  });
  it('virheellinen syöte → poikkeus, ei arvausta', () => {
    expect(() => T.tilanneKaavioksi({ pelaajat: [] }, 0, { avain: 'x' })).toThrow('tilanne_kentta_puuttuu');
    expect(() => T.tilanneKaavioksi(base(), 0, { avain: 'x', pelimuoto: '11 v 11' })).toThrow('pelimuoto_ei_kelpaa');
    expect(() => T.tilanneKaavioksi(base(), 4, { avain: 'x' })).toThrow('hetki_tilanteen_ulkopuolella');
    const dup = Object.assign(base(), { pelaajat: [{ tunniste: 1, joukkue: 'oma', polku: [] }, { tunniste: 1, joukkue: 'vast', polku: [] }] });
    expect(() => T.tilanneKaavioksi(dup, 0, { avain: 'x' })).toThrow('tunniste_ei_uniikki');
  });
  it('liikkeiden id:t ovat uniikkeja ja juoksevia', () => {
    const r = T.tilanneKaavioksi(FIX(), 0, { avain: 'y_h1' });
    expect(r.spec.liikkeet.map(l => l.id)).toEqual(r.spec.liikkeet.map((_, i) => 'L' + (i + 1)));
  });
});
