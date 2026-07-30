// Kortin kääntöpuolen FYS+PSY-kehitystekstit — lib/tm_kortti_rubriikit.js (TM_KORTTI_RUBRIIKIT).
// Kanoni: fysTaso/psyTaso palauttavat {taso,nimi,nyt,askel[,vahvuus]} lapsen kielellä (§7.22); guard kuten alyTaso.
import { describe, it, expect } from 'vitest';
const R = require('../lib/tm_kortti_rubriikit.js');

describe('fysTaso — FYS (D1) tasokuvaus', () => {
  it('palauttaa oikeat kentät tasoille 1–5', () => {
    expect(R.fysTaso(1)).toEqual({ taso: 1, nimi: 'Perusta',     nyt: 'Rakennat liikkumisen perustaa 🌱', askel: 'Leiki, juokse ja hyppää paljon — keho vahvistuu.' });
    expect(R.fysTaso(2)).toEqual({ taso: 2, nimi: 'Vahvistuva',  nyt: 'Liikut yhä ketterämmin 🏃',        askel: 'Harjoittele nopeita lähtöjä ja suunnanmuutoksia.' });
    expect(R.fysTaso(3)).toEqual({ taso: 3, nimi: 'Ketterä',     nyt: 'Olet nopea ja tasapainoinen ⚡',   askel: 'Yhdistä nopeus ja pallo — kiihdytä hallitusti.' });
    expect(R.fysTaso(4)).toEqual({ taso: 4, nimi: 'Räjähtävä',   nyt: 'Kiihdytät ja hyppäät voimalla 💥', askel: 'Muista palautuminen — voima kasvaa levolla.' });
    expect(R.fysTaso(5)).toEqual({ taso: 5, nimi: 'Huippukunto', nyt: 'Liikut huipputasolla 🌟',          askel: 'Pidä yllä ja monipuolista liikkumista.' });
  });
  it('guard: alle 1 / null / NaN → null', () => {
    expect(R.fysTaso(0)).toBeNull();
    expect(R.fysTaso(-2)).toBeNull();
    expect(R.fysTaso(null)).toBeNull();
    expect(R.fysTaso(undefined)).toBeNull();
    expect(R.fysTaso('abc')).toBeNull();
  });
  it('guard: >5 cappaa 5:een, desimaalit pyöristyvät', () => {
    expect(R.fysTaso(6).taso).toBe(5);
    expect(R.fysTaso(99).taso).toBe(5);
    expect(R.fysTaso(2.4).taso).toBe(2);
    expect(R.fysTaso(2.6).taso).toBe(3);
  });
});

describe('psyTaso — PSY (D3) tasokuvaus', () => {
  it('palauttaa oikeat kentät tasoille 1–5 (ilman pisteitä → ei vahvuutta)', () => {
    expect(R.psyTaso(1)).toEqual({ taso: 1, nimi: 'Alku',         nyt: 'Harjoittelet keskittymistä ja sinnikkyyttä 🌱', askel: 'Yritä jatkaa vielä hetki, vaikka tuntuisi vaikealta.' });
    expect(R.psyTaso(2)).toEqual({ taso: 2, nimi: 'Kasvava sisu', nyt: 'Jaksat yrittää uudelleen 💪',                   askel: 'Kuuntele yksi vinkki ja kokeile sitä heti.' });
    expect(R.psyTaso(3)).toEqual({ taso: 3, nimi: 'Keskittyjä',   nyt: 'Pysyt mukana ja rauhoitut 🎯',                  askel: 'Pidä pää pelissä koko treenin — myös lopussa.' });
    expect(R.psyTaso(4)).toEqual({ taso: 4, nimi: 'Sinnikäs',     nyt: 'Palaudut pettymyksistä nopeasti 🔄',            askel: 'Kun ärsyttää, hengitä ja jatka — virhe ei jää päähän.' });
    expect(R.psyTaso(5)).toEqual({ taso: 5, nimi: 'Vahva mieli',  nyt: 'Johdat itseäsi ja pysyt rauhallisena 🌟',       askel: 'Näytä esimerkkiä muille — pidä yllä.' });
  });
  it('guard: alle 1 / null / >5 / desimaalit', () => {
    expect(R.psyTaso(0)).toBeNull();
    expect(R.psyTaso(null)).toBeNull();
    expect(R.psyTaso(7).taso).toBe(5);
    expect(R.psyTaso(3.6).taso).toBe(4);
  });

  it('vahvuus: korkein osa-alue → oikea näyttönimi (avg)', () => {
    const pisteet = {
      inner_drive:       { avg: 2 },
      coachability:      { avg: 3 },
      resilience:        { avg: 5 },   // korkein
      focus:             { avg: 4 },
      emotional_control: { avg: 1 }
    };
    expect(R.psyTaso(3, pisteet).vahvuus).toBe('Sinnikkyys');
  });
  it('vahvuus: kaikki osa-alueet mäppäytyvät oikeisiin lapsen sanoihin', () => {
    expect(R.psyTaso(3, { inner_drive: { avg: 5 } }).vahvuus).toBe('Oma into');
    expect(R.psyTaso(3, { coachability: { avg: 5 } }).vahvuus).toBe('Ohjeiden kuuntelu');
    expect(R.psyTaso(3, { resilience: { avg: 5 } }).vahvuus).toBe('Sinnikkyys');
    expect(R.psyTaso(3, { focus: { avg: 5 } }).vahvuus).toBe('Keskittyminen');
    expect(R.psyTaso(3, { emotional_control: { avg: 5 } }).vahvuus).toBe('Rauhallisuus');
  });
  it('vahvuus: tasapelissä ensimmäinen _MINA_D3_KYS-järjestyksessä voittaa', () => {
    const pisteet = {
      inner_drive:       { avg: 4 },   // ensimmäinen järjestyksessä, sama arvo
      coachability:      { avg: 4 },
      resilience:        { avg: 4 },
      focus:             { avg: 4 },
      emotional_control: { avg: 4 }
    };
    expect(R.psyTaso(4, pisteet).vahvuus).toBe('Oma into');
  });
  it('vahvuus: fallback avg → pelaaja → valmentaja; raakaluku kelpaa', () => {
    expect(R.psyTaso(3, { focus: { pelaaja: 5 }, resilience: { avg: 3 } }).vahvuus).toBe('Keskittyminen');
    expect(R.psyTaso(3, { emotional_control: { valmentaja: 5 }, resilience: { avg: 2 } }).vahvuus).toBe('Rauhallisuus');
    expect(R.psyTaso(3, { resilience: 5, focus: 2 }).vahvuus).toBe('Sinnikkyys');
  });
  it('vahvuus: puuttuva / tyhjä pisteet → ei vahvuutta', () => {
    expect(R.psyTaso(3).vahvuus).toBeUndefined();
    expect(R.psyTaso(3, null).vahvuus).toBeUndefined();
    expect(R.psyTaso(3, {}).vahvuus).toBeUndefined();
    expect(R.psyTaso(3, { resilience: { avg: null } }).vahvuus).toBeUndefined();
  });
});
