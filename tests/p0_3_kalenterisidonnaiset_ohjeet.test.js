/**
 * Pelaaja-app V2 · Vaihe 0 · P0.3 — harjoitelogiikka_v4: kalenterisidonnaiset vertailut ohjeissa.
 * CHARACTERIZATION ENSIN (§7.25): tämä tiedosto pinnaa NYKYTILAN (commit 1). Korjauksen commit päivittää odotukset.
 * Ongelma: "Vertaa: oletko parempi kuin joulukuun alussa?" näkyy pelaajalle vaikka jakso ei ala joulukuussa (jakso = valmentajan päätös).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const H = require('../harjoitelogiikka_v4.js');

const KUUKAUSI_ALUSSA = /(tammi|helmi|maalis|huhti|touko|kesä|heinä|elo|syys|loka|marras|joulu)kuun (alussa|lopussa|alusta)/i;
const FIELDS = ['nimi', 'ohje_leikkija', 'ohje_rakentaja', 'ohje_showcase', 'ohje', 'cue', 'tarina'];
function kaikkiHarjoitteet() {
  const out = [];
  Object.keys(H.T_MESOSYKLI_KOHDE).forEach((meso) => {
    const s = H.PANKKI.T[meso]; if (!s) return;
    ['vk1', 'vk2', 'vk3', 'vk4'].forEach((vk) => { if (s[vk]) out.push({ polku: 'T.' + meso + '.' + vk, h: s[vk] }); });
  });
  Object.keys(H.T_KOHDE_PANKKI).forEach((k) => (H.T_KOHDE_PANKKI[k] || []).forEach((h, i) => out.push({ polku: 'KOHDE.' + k + '[' + i + ']', h })));
  return out;
}
const kuukausiViittaukset = () => kaikkiHarjoitteet().flatMap(({ polku, h }) => FIELDS.filter((f) => typeof h[f] === 'string' && KUUKAUSI_ALUSSA.test(h[f])).map((f) => polku + '/' + f));

describe('P0.3 characterization — kuukausiviittaukset pelaajalle näkyvissä ohjeissa', () => {
  it('NYKYTILA: kaksi kalenterisidonnaista vertailua (loka- ja joulukuun alussa), vain ohje_rakentaja-kentissä', () => {
    const v = kuukausiViittaukset();
    expect(v.length).toBe(2);
    expect(v.every((x) => x.endsWith('/ohje_rakentaja'))).toBe(true);
  });
  it('NYKYTILA: syöttö vk4 ohje_rakentaja = "… Vertaa: oletko parempi kuin joulukuun alussa?"', () => {
    const syotto = kaikkiHarjoitteet().filter(({ h }) => /joulukuun alussa/.test(h.ohje_rakentaja || ''));
    expect(syotto.length).toBe(1);
    expect(syotto[0].h.nimi).toBe('Syöttö-mittaus');
    expect(syotto[0].h.ohje_rakentaja).toBe('Syöttöhaaste: 20 syöttöä, eri etäisyydet (10/15/20 m). Laske pisteet: tarkka osuma = 1 p. Vertaa: oletko parempi kuin joulukuun alussa?');
  });
  it('NYKYTILA: saman harjoitteen muut kentät (leikkijä/showcase/kesto/xp/yt/viikkotavoite-kentät) pinnattu', () => {
    const h = kaikkiHarjoitteet().find(({ h }) => /joulukuun alussa/.test(h.ohje_rakentaja || '')).h;
    expect(h.ohje_leikkija).toBe('Laske: montako kertaa lähetät pallon tarkasti 10 metriin? Tee 20 syöttöä ja laske pisteet.');
    expect(h.ohje_showcase).toBe('Syöttösarja 11 muotoa — montako hallitset jo? Käy läpi ja arvioi itsesi. Harjoittele 2 heikkointa 10 min.');
    expect(h.kesto).toBe('20 min'); expect(h.xp).toBe(30); expect(h.yt).toBe('yGHMHi9mMOQ');
  });
  it('NYKYTILA: sv-kartassa on käännös täsmälleen tälle fi-merkkijonolle (avain = fi-teksti)', () => {
    const map = H.HARJOITE_I18N.sv.sisalto;
    expect(typeof map['Syöttöhaaste: 20 syöttöä, eri etäisyydet (10/15/20 m). Laske pisteet: tarkka osuma = 1 p. Vertaa: oletko parempi kuin joulukuun alussa?']).toBe('string');
  });
});
