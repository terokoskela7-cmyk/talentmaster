/* sv-erä 77 (K1b-jatko: Tämän viikon fokus) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n kirjoittama palautus (sha 6306af5d…7920) merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('sv_kaannoserae_77_palautus.json')).osiot, G = JSON.parse(teksti('sv_kaannoserae_77_gemini.json')).osiot;
const OSIOT = { 'lib.tm_kt_havainto': require('../lib/tm_kt_havainto.js'), 'lib.tm_tanaan_kentta': require('../lib/tm_tanaan_kentta.js') };
const V = require('../scripts/i18n_vie_sv_era77.cjs'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
const KATTAVUUS = readFileSync(new URL('../tools/i18n/sv_kattavuus.mjs', import.meta.url), 'utf8');
describe('sv-erä 77 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 3 riviä = lähetetty erä; lähetetty sv tyhjä; fi = koodi; paikkamerkit säilyvät', () => {
    const sha = createHash('sha256').update(teksti('sv_kaannoserae_77_palautus.json')).digest('hex'); expect(sha.startsWith('6306af5d')).toBe(true); expect(sha.endsWith('7920')).toBe(true);
    expect(Object.keys(P).sort()).toEqual(Object.keys(OSIOT).sort()); expect(Object.keys(G).sort()).toEqual(Object.keys(OSIOT).sort());
    let n = 0;
    for (const [o, TX] of Object.entries(OSIOT)) {
      expect(Object.keys(P[o].rivit).sort()).toEqual(Object.keys(G[o].rivit).sort());
      for (const [k, r] of Object.entries(P[o].rivit)) { n++; expect(G[o].rivit[k].sv, k).toBe(''); expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(TX.FI[k]); expect(r.fi, k).toBe(G[o].rivit[k].fi); expect(JSON.stringify(r.fi.match(/\{\w+\}/g)), k).toBe(JSON.stringify(r.sv.match(/\{\w+\}/g))); }
    }
    expect(n).toBe(3);
  });
  it('koodin sv = palautus merkki merkiltä; odottavien lista on tyhjä', () => {
    for (const o of Object.keys(OSIOT)) for (const [k, r] of Object.entries(P[o].rivit)) expect(SV[k], k).toBe(r.sv);
    const rivi = KATTAVUUS.match(/const ODOTTAVAT_ERAT = \[([^\]]*)\];/); expect(rivi).toBeTruthy(); expect(rivi[1].trim()).not.toMatch(/\b77\b/);   // sv-aukot P7: erä 90 odottaa (ei erää 77)
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(3); });
});
