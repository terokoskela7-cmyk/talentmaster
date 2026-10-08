/**
 * Pelaaja_v7 "Vauhti & pallo": paras mahdollinen tulos (taso 5) jätti kortin tyhjäksi → "Nopeustestit tulossa" vaikka
 * tulos oli mitattu. Juurisyy: (1) tavoiterivi palauttaa '' kun ei seuraavaa tasoa; (2) Pikakirjaus ei kirjoita
 * hh_vahvuus/hh_kehityskohde/hh_taso_edellinen (vain Excel-tuonti) → h tyhjä → fallback "tulossa".
 * (PR B 2026-10-04: Pikakirjaus kirjoittaa nyt myös nämä — lib/tm_pikakentat.js tmJohdetutPikakentat.)
 * Ajetaan SIVUN OIKEA koodi vm:ssä, data OIKEALLA Pikakirjaus-laskennalla (tmLaskePikakentat + historia).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PEL_APU } from './helpers/pelaaja_t.mjs';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const N = require('../lib/tm_eerikkila_normit.js');
const PK = require('../lib/tm_pikakentat.js');
const H = require('../lib/tm_historia.js');

function pura(tunniste) {
  const i = SRC.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = SRC.indexOf('{', i); k < SRC.length; k++) {
    if (SRC[k] === '{') syv++; else if (SRC[k] === '}') { syv--; if (!syv) return SRC.slice(i, k + 1); }
  }
  throw new Error('sulkeet');
}
const VUOSI = new Date().getFullYear();
function rakenna(p) {
  const ctx = { ...PEL_APU, _pelaaja: p, hhSeuraavaTaso: N.hhSeuraavaTaso, HH_TESTI_MAP: N.HH_TESTI_MAP, Date, Math, Object, Array, String, Number, isNaN };
  vm.createContext(ctx);
  vm.runInContext("const _MINA_HHNIMI = { lin30m:'Nopeus', lin10m:'Kiihdytys', cmj:'Ponnistusvoima', mas:'Kestävyys', kasirata:'Ketteryys', sm_pallo:'Vauhti pallon kanssa' };"
    + SRC.slice(SRC.indexOf('function _minaHhArvo('), SRC.indexOf('\n', SRC.indexOf('function _minaHhArvo(')))
    + '\n' + pura('function _minaHhEdellinen(') + '\n' + pura('function _minaHhHuipulla(') + '\n' + pura('function rMinaFyysinenTavoite(')
    + '\nthis.f = rMinaFyysinenTavoite;', ctx);
  return ctx.f();
}
/** Pelaajadokin tila Pikakirjauksen jälkeen: SAMA laskenta kuin tuotannossa (lib/tm_pikakirjaus._tallennaPelaajanTulokset). */
function pikakirjaa(d, tulokset, pvm) {
  const upd = PK.tmLaskePikakentat(d, tulokset, pvm);
  const hv = {}; Object.keys(PK._HH_MAP || {}).forEach((k) => { const v = tulokset[k]; if (v != null) hv[PK._HH_MAP[k]] = v; });
  if (Object.keys(hv).length) upd.hh_historia = H.tmHistoriaLisaa(d.hh_historia || [], H.tmHhSnapshot(pvm, { hh_taso: upd.hh_taso, d1_taso: upd.d1_taso, d2_taso: upd.d2_taso, hv }));
  return Object.assign({}, d, upd);
}
const TOPIAS = { syntymaVuosi: VUOSI - 13, sukupuoli: 'M' };

describe('Pelaaja_v7 · Vauhti & pallo — mitattu tulos ei koskaan "tulossa"', () => {
  it('EI VACUOUS: eri testiarvoilla Eerikkilä-taso on 1 ja 5 (aineisto kattaa ääripäät)', () => {
    expect(N.eerikkilaTaso(5.9, 'nopeus_30m', 13, 'M')).toBeLessThanOrEqual(2);
    expect(N.eerikkilaTaso(4.0, 'nopeus_30m', 13, 'M')).toBe(5);
  });

  it('JUURISYY-TOISTO: nopeus nousi tasolta 1 tasolle 5 Pikakirjauksella → EI "tulossa", kortilla positiivinen viesti', () => {
    let d = pikakirjaa(TOPIAS, { lin_30m: 5.9 }, '2026-09-01');
    d = pikakirjaa(d, { lin_30m: 4.0 }, '2026-10-03');
    expect(d.hh_taso, 'aineisto ei ole tasolla 5').toBe(5);
    // PR B (datakatkokset): Pikakirjaus kirjoittaa nyt hh_taso_edellinen(+_pvm) jaetulla tmJohdetutPikakentat-laskennalla
    // (pvm-vahti: eri päivä → vangitaan). Kortti toimii sekä kentästä että historiasta.
    expect(d.hh_taso_edellinen, 'Pikakirjaus kirjoittaa edellisen tason (eri päivän testi)').toBe(1);
    expect(d.hh_taso_edellinen_pvm).toBe('2026-09-01');
    const html = rBox(d);
    expect(html).not.toContain('tulossa');
    expect(html).toContain('Huippuvauhtia');
    expect(html).toContain('Kehityit viime kerrasta');           // vertailu historiasta, ei hh_taso_edellinen-kentästä
    expect(html).toContain('5.9 s → 4 s');                        // sekunnit saa näyttää
  });

  it('paras tulos heti ensimmäisellä kerralla (ei vertailukohtaa) → "Huippuvauhtia", ei "tulossa" eikä kehityit-riviä', () => {
    const d = pikakirjaa(TOPIAS, { lin_30m: 4.0 }, '2026-10-03');
    const html = rBox(d);
    expect(html).toContain('Huippuvauhtia'); expect(html).not.toContain('tulossa'); expect(html).not.toContain('Kehityit');
  });

  it('keskitason tulos, ei vertailua → neutraali positiivinen viesti, ei "tulossa"', () => {
    const d = pikakirjaa(TOPIAS, { lin_30m: 5.2 }, '2026-10-03');
    const html = rBox(d);
    expect(html).not.toContain('tulossa');
    expect(html).toContain('Vauhtisi on mitattu');
  });

  it('EI mittauksia lainkaan (ei hh_viimeisin) → ei korttia; tyhjä hh_viimeisin → vanha "tulossa" säilyy (totta)', () => {
    expect(rBox({ ...TOPIAS })).toBe('');
    expect(rBox({ ...TOPIAS, hh_viimeisin: {} })).toContain('tulossa');
  });

  it('EI regressiota: kehityskohde + tavoite näkyy edelleen kun on seuraava taso', () => {
    const d = pikakirjaa(TOPIAS, { lin_30m: 5.2 }, '2026-10-03');
    d.hh_kehityskohde = 'lin30m';
    const html = rBox(d);
    expect(html).toContain('Tavoite');
    expect(html).not.toContain('Huippuvauhtia');
  });

  it('§7.22: ei tasolukuja, ei vertailua muihin, ei XP/progress, ei loss-aversion-kieltä missään tilassa', () => {
    const tilat = [
      pikakirjaa(pikakirjaa(TOPIAS, { lin_30m: 5.9 }, '2026-09-01'), { lin_30m: 4.0 }, '2026-10-03'),
      pikakirjaa(TOPIAS, { lin_30m: 4.0 }, '2026-10-03'),
      pikakirjaa(TOPIAS, { lin_30m: 5.2 }, '2026-10-03'),
    ];
    tilat.forEach((d) => {
      const teksti = rBox(d).replace(/<[^>]*>/g, ' ');
      expect(teksti, 'taso-sana/-luku pelaajalle').not.toMatch(/\btaso\b|\blevel\b|tasolta|tasolle/i);
      expect(teksti).not.toMatch(/\bXP\b|progress|menetä|putoa|jäät jälkeen|muut |muita|ikätoverei|keskiarvo|sijoitus|%/i);
    });
  });
});
function rBox(p) { return rakenna(p); }
