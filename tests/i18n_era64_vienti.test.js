/* sv-erä 64 (Kehitystyöpöytä B4a: Polku) — vienti (scripts/i18n_vie_sv_era64.cjs). Code ei kirjoita ruotsia (§0): koodin sv = Geminin palautus merkki merkiltä.
   Palautuksessa 42 riviä: ktp_siirra_ydinvahvuutta korvattiin koodissa olemassa olevalla ka_vaihda-avaimella (sv jo olemassa) → ohitetaan; ktp_muokkaa_kausitavoitetta: fi muutettu palautuksen mukaan. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => JSON.parse(readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8')).osiot;
const O = 'lib.tm_kt_polku', OHITETTU = 'ktp_siirra_ydinvahvuutta';
const P = lue('sv_kaannoserae_64_palautus.json')[O].rivit, G = lue('sv_kaannoserae_64_gemini.json')[O].rivit;
const V = require('../scripts/i18n_vie_sv_era64.cjs'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, TX = require('../lib/tm_kt_polku.js');
describe('sv-erä 64 — vienti', () => {
  it('palautus 42 riviä = lähetetty erä + ohitettu rivi; fi = koodi; sv täytetty; paikkamerkit säilyvät', () => {
    expect(Object.keys(P).length).toBe(42); expect(Object.keys(P).filter((k) => k !== OHITETTU).sort()).toEqual(Object.keys(G).sort());
    for (const [k, r] of Object.entries(P)) { expect(r.sv.trim(), k).not.toBe(''); if (k === OHITETTU) continue; expect(r.fi, k).toBe(require('./helpers/k1d_korvaukset.cjs').erassaFi(k, TX.FI[k])); expect(r.fi, k).toBe(G[k].fi); expect(JSON.stringify(r.fi.match(/\{\w+\}/g)), k).toBe(JSON.stringify(r.sv.match(/\{\w+\}/g))); }
  });
  it('fi-muutos: "Muokkaa kauden tavoitetta" (palautuksen mukaan)', () => { expect(TX.FI.ktp_muokkaa_kausitavoitetta).toBe('Muokkaa kauden tavoitetta'); expect(SV.ktp_muokkaa_kausitavoitetta).toBe('Redigera säsongsmål'); });
  it('ktp_siirra_ydinvahvuutta pois koodista ja viennistä; valikko käyttää ka_vaihda-avainta (sv olemassa)', () => {
    expect(TX.FI[OHITETTU]).toBeUndefined(); expect(SV[OHITETTU]).toBeUndefined(); expect(typeof SV.ka_vaihda).toBe('string');
    expect(readFileSync(new URL('../lib/tm_kt_polku.js', import.meta.url), 'utf8')).toContain("'ka_vaihda'");
  });
  it('koodin sv = palautus merkki merkiltä; jokaiselle ktp_-avaimelle on sv', () => {
    for (const [k, r] of Object.entries(P)) if (k !== OHITETTU) expect(SV[k], k).toBe(r.sv);
    expect(Object.keys(TX.FI).filter((k) => typeof SV[k] !== 'string' && !require('./helpers/k1d_korvaukset.cjs').era80Odottaa(k))).toEqual([]);   // K1d: erä 80 -avaimet odottavat Geminiä
  });
  it('idempotentti', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toContain(OHITETTU); });
});
