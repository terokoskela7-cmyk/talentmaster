/**
 * Uhka-arvo (xT) — puhdas lib, tavallinen vitest. Kerros (DOM) testataan headless-selaimella.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const X = require('../lib/tm_xt.js');
const KANON = require('../lib/tm_kaavio_kanon_data.js');

describe('ruudukko', () => {
  it('on 8 × 12 ja symmetrinen laitojen suhteen', () => {
    expect(X.XT_RUUDUKKO.length).toBe(8);
    X.XT_RUUDUKKO.forEach(r => expect(r.length).toBe(12));
    for (let i = 0; i < 4; i++) expect(X.XT_RUUDUKKO[i]).toEqual(X.XT_RUUDUKKO[7 - i]);
  });
  it('suurin arvo on maalin edustalla keskellä', () => {
    expect(X.xtArvo(50, 2, 'ylos')).toBeCloseTo(0.25745362, 8);
    expect(X.xtArvo(50, 98, 'alas')).toBeCloseTo(0.25745362, 8);
  });
  it('oma pääty on pieni kummallakin suunnalla', () => {
    expect(X.xtArvo(2, 99, 'ylos')).toBeCloseTo(0.00638303, 8);
    expect(X.xtArvo(2, 1, 'alas')).toBeCloseTo(0.00638303, 8);
  });
  it('reunapisteet eivät vuoda ruudukon yli', () => {
    expect(X.xtRuutu(100, 0, 'ylos')).toEqual({ rivi: 7, sarake: 11 });
    expect(X.xtRuutu(0, 100, 'ylos')).toEqual({ rivi: 0, sarake: 0 });
    expect(X.xtRuutu(-5, 130, 'ylos')).toEqual({ rivi: 0, sarake: 0 });
  });
  it('puuttuva suunta = ylos (taktiikkataulun oletus)', () => {
    expect(X.xtArvo(50, 2)).toBe(X.xtArvo(50, 2, 'ylos'));
  });
});

describe('liikkeen arvo', () => {
  it('syöttö keskeltä boksin edustalle etenee', () => {
    const a = X.xtLiikeArvo({ tyyppi: 'syotto', from: { x: 50, y: 55 }, to: { x: 50, y: 12 } }, 'ylos');
    expect(a.muutos).toBeCloseTo(0.10805102 - 0.01484598, 8);
    expect(a.pisteet).toBe(9.3);
    expect(a.luokka).toBe('etenee');
    expect(a.laskettava).toBe(true);
  });
  it('taaksepäin syöttö on "palauttaa", ei virhe', () => {
    const a = X.xtLiikeArvo({ tyyppi: 'syotto', from: { x: 50, y: 12 }, to: { x: 50, y: 60 } }, 'ylos');
    expect(a.luokka).toBe('palauttaa');
    expect(a.pisteet).toBeLessThan(0);
  });
  it('sivuttaissiirto samalla korkeudella ylläpitää', () => {
    const a = X.xtLiikeArvo({ tyyppi: 'syotto', from: { x: 20, y: 60 }, to: { x: 80, y: 60 } }, 'ylos');
    expect(a.luokka).toBe('yllapitaa');
  });
  it('laukaus ei kuulu xT:hen', () => {
    const a = X.xtLiikeArvo({ tyyppi: 'laukaus', from: { x: 50, y: 12 }, to: { x: 50, y: 0 } }, 'ylos');
    expect(a.pisteet).toBeNull();
    expect(a.laskettava).toBe(false);
  });
  it('juoksu lasketaan, mutta ei pelaajan luomaan uhkaan', () => {
    const a = X.xtLiikeArvo({ tyyppi: 'juoksu', from: { x: 50, y: 40 }, to: { x: 50, y: 10 } }, 'ylos');
    expect(a.muutos).toBeGreaterThan(0);
    expect(a.laskettava).toBe(false);
  });
  it('suunta kääntää merkin', () => {
    const l = { tyyppi: 'kuljetus', from: { x: 50, y: 70 }, to: { x: 50, y: 30 } };
    expect(X.xtLiikeArvo(l, 'ylos').muutos).toBeGreaterThan(0);
    expect(X.xtLiikeArvo(l, 'alas').muutos).toBeLessThan(0);
  });
});

describe('muotoilu', () => {
  it('suomalainen desimaalipilkku ja etumerkki', () => {
    expect(X.xtMuotoile(9.3, true)).toBe('+9,3');
    expect(X.xtMuotoile(-2, true)).toBe('−2,0');
    expect(X.xtMuotoile(0, true)).toBe('±0,0');
    expect(X.xtMuotoile(25.7)).toBe('25,7');
    expect(X.xtMuotoile(null)).toBe('—');
  });
});

describe('kaavioanalyysi', () => {
  const SPEC = () => ({
    avain: 't_h0', suunta: 'ylos', pelimuoto: '11v11',
    pelaajat: [
      { id: 'a', joukkue: 'oma', rooli: 'syöttäjä', x: 50, y: 60, pallo: true },
      { id: 'b', joukkue: 'oma', rooli: 'vastaanottaja', x: 62, y: 30 },
      { id: 'x', joukkue: 'vastustaja', rooli: 'paine', x: 55, y: 50 }
    ],
    liikkeet: [
      { id: 'l1', tyyppi: 'syotto', from: { ref: 'a' }, to: { ref: 'b' } },
      { id: 'l2', tyyppi: 'kuljetus', from: { ref: 'b' }, to: { x: 60, y: 14 } },
      { id: 'l3', tyyppi: 'juoksu', from: { ref: 'x' }, to: { x: 55, y: 70 } },
      { id: 'l4', tyyppi: 'syotto', from: { ref: 'poistettu' }, to: { ref: 'b' } }
    ]
  });
  it('resolvoi viitteet, ohittaa orvot ja summaa vain omat pallotapahtumat', () => {
    const r = X.xtKaavioAnalyysi(SPEC());
    expect(r.liikkeet.map(l => l.id)).toEqual(['l1', 'l2', 'l3']);
    expect(r.liikkeet[2].tekija).toBe('vastustaja');
    const odotus = (X.xtArvo(62, 30) - X.xtArvo(50, 60)) + (X.xtArvo(60, 14) - X.xtArvo(62, 30));
    expect(r.yhteensa.muutos).toBeCloseTo(odotus, 10);
    expect(r.yhteensa.pallotapahtumia).toBe(2);
    expect(r.paras.id).toBe('l2');
  });
  it('11v11 ei anna juniorivarausta, 8v8 antaa', () => {
    expect(X.xtKaavioAnalyysi(SPEC()).huomio).toBeNull();
    const s = SPEC(); s.pelimuoto = '8v8';
    expect(X.xtKaavioAnalyysi(s).huomio).toContain('8v8');
  });
  it('tyhjä tai puutteellinen spec ei kaada', () => {
    expect(X.xtKaavioAnalyysi({}).liikkeet).toEqual([]);
    expect(X.xtKaavioAnalyysi(null).yhteensa.pisteet).toBe(0);
  });
  it('kaikki kanoniset kaaviot analysoituvat äärellisiksi luvuiksi', () => {
    const lista = KANON.TM_KAAVIO_KANON || KANON;
    expect(lista.length).toBeGreaterThan(0);
    lista.forEach(s => {
      const r = X.xtKaavioAnalyysi(s);
      expect(Number.isFinite(r.yhteensa.muutos)).toBe(true);
      r.liikkeet.forEach(l => { if (l.tyyppi !== 'laukaus') expect(Number.isFinite(l.muutos)).toBe(true); });
    });
  });
});

describe('pelihavainto', () => {
  const T = [
    { pelaajaId: '7', tyyppi: 'syotto', from: { x: 50, y: 60 }, to: { x: 50, y: 12 }, onnistui: true },
    { pelaajaId: '7', tyyppi: 'kuljetus', from: { x: 30, y: 50 }, to: { x: 40, y: 30 }, onnistui: false },
    { pelaajaId: '7', tyyppi: 'laukaus', from: { x: 50, y: 12 }, to: { x: 50, y: 0 } },
    { pelaajaId: '10', tyyppi: 'syotto', from: { x: 50, y: 30 }, to: { x: 50, y: 70 }, onnistui: true }
  ];
  it('epäonnistunut ei vähennä luotua, mutta näkyy yritetyssä', () => {
    const r = X.xtHavaintoYhteenveto(T, 'ylos');
    const p7 = r.find(p => p.pelaajaId === '7');
    expect(p7.toimintoja).toBe(2);
    expect(p7.onnistuneita).toBe(1);
    expect(p7.laukauksia).toBe(1);
    expect(p7.luotu.muutos).toBeCloseTo(X.xtArvo(50, 12) - X.xtArvo(50, 60), 10);
    expect(p7.yritetty.muutos).toBeGreaterThan(p7.luotu.muutos);
    expect(p7.onnistumisprosentti).toBe(50);
    expect(p7.eteenpainOsuus).toBe(100);
  });
  it('lajittelee luodun uhan mukaan', () => {
    const r = X.xtHavaintoYhteenveto(T, 'ylos');
    expect(r.map(p => p.pelaajaId)).toEqual(['7', '10']);
  });
  it('onnistui puuttuu = onnistui (pikakirjauksen oletus)', () => {
    const r = X.xtHavaintoYhteenveto([{ pelaajaId: '9', tyyppi: 'syotto', from: { x: 50, y: 50 }, to: { x: 50, y: 30 } }]);
    expect(r[0].onnistuneita).toBe(1);
  });
});

describe('voimakkuus', () => {
  it('0..1, monotoninen', () => {
    expect(X.xtVoimakkuus(0.00638303)).toBeCloseTo(0, 6);
    expect(X.xtVoimakkuus(0.25745362)).toBeCloseTo(1, 6);
    expect(X.xtVoimakkuus(0.02)).toBeLessThan(X.xtVoimakkuus(0.05));
    expect(X.xtVoimakkuus(0)).toBe(0);
  });
});
