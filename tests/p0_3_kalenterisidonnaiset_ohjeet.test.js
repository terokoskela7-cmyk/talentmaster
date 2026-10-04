/**
 * Pelaaja-app V2 · Vaihe 0 · P0.3 — harjoitelogiikka_v4: kalenterisidonnaiset vertailut ohjeissa.
 * CHARACTERIZATION ENSIN (§7.25): commit 1 pinnasi nykytilan; tämä commit on KORJAUS — odotukset päivitetty, kaikki muu pysyi ennallaan.
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

const UUSI = 'Syöttöhaaste: 20 syöttöä, eri etäisyydet (10/15/20 m). Laske pisteet: tarkka osuma = 1 p. Vertaa: oletko parempi kuin edellisellä kerralla?';
const VANHA = 'Syöttöhaaste: 20 syöttöä, eri etäisyydet (10/15/20 m). Laske pisteet: tarkka osuma = 1 p. Vertaa: oletko parempi kuin joulukuun alussa?';

describe('P0.3 korjaus — "joulukuun alussa" pois, muu ennallaan', () => {
  it('"joulukuun alussa" ei esiinny missään pelaajalle näkyvässä kentässä', () => {
    const kaikki = kaikkiHarjoitteet().flatMap(({ h }) => FIELDS.map((f) => h[f]).filter((x) => typeof x === 'string'));
    expect(kaikki.filter((x) => /joulukuun alussa/i.test(x))).toEqual([]);
  });
  it('syöttö vk4 ohje_rakentaja = kalenterista riippumaton "edellisellä kerralla"', () => {
    const syotto = kaikkiHarjoitteet().filter(({ h }) => h.nimi === 'Syöttö-mittaus' && /Syöttöhaaste/.test(h.ohje_rakentaja || ''));
    expect(syotto.length).toBe(1);
    expect(syotto[0].h.ohje_rakentaja).toBe(UUSI);
  });
  it('saman harjoitteen muut kentät ennallaan (characterization-pinnaus pitää)', () => {
    const h = kaikkiHarjoitteet().find(({ h }) => h.ohje_rakentaja === UUSI).h;
    expect(h.ohje_leikkija).toBe('Laske: montako kertaa lähetät pallon tarkasti 10 metriin? Tee 20 syöttöä ja laske pisteet.');
    expect(h.ohje_showcase).toBe('Syöttösarja 11 muotoa — montako hallitset jo? Käy läpi ja arvioi itsesi. Harjoittele 2 heikkointa 10 min.');
    expect(h.kesto).toBe('20 min'); expect(h.xp).toBe(30); expect(h.yt).toBe('yGHMHi9mMOQ');
  });
  it('rajaus: loka­kuun alussa -viittaus (pujottelu) EI kuulunut tähän korjaukseen — pinnattu näkyviin, ei muutettu', () => {
    const v = kuukausiViittaukset();
    expect(v.length).toBe(1);
    const h = kaikkiHarjoitteet().find(({ h }) => /lokakuun alussa/.test(h.ohje_rakentaja || '')).h;
    expect(h.ohje_rakentaja).toBe('Ajanotto: pujottelu 5 kartio, 10 m. Tee 5 suoritusta. Laske paras aika. Vertaa: oletko nopeampi kuin lokakuun alussa?');
  });
  it('sv: vanha käännösavain poistettu (ei orpoa), uusi fi-teksti odottaa Geminiä → sv-kieli näyttää fi-tekstin (ei kaadu, ei tyhjää)', () => {
    const map = H.HARJOITE_I18N.sv.sisalto;
    expect(map[VANHA]).toBeUndefined(); expect(map[UUSI]).toBeUndefined();
    const prev = global.tmNykyinenKieli; global.tmNykyinenKieli = () => 'sv';
    try {
      const h = kaikkiHarjoitteet().find(({ h }) => h.ohje_rakentaja === UUSI).h;
      expect(H._hT ? H._hT(h.ohje_rakentaja) : h.ohje_rakentaja).toBe(UUSI);
    } finally { if (prev === undefined) delete global.tmNykyinenKieli; else global.tmNykyinenKieli = prev; }
  });
});
