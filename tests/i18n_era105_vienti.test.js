/* sv-erä 105 (Päivän harjoite PR E, Polku-rivi "Omatoiminen tällä viikolla"; PM 21.11.2026) — 5 riviä. Code ei kirjoita ruotsia (§0): koodin sv = PM:n palautus (sha 3cc28952…d6c) merkki merkiltä.
   Kohde lib/tm_lib_i18n.js TM_LIB_I18N.sv (lib-avain ktp_omat*; fi = lib/tm_kt_polku.js). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_105_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_105_gemini.json', OSIO = 'lib.tm_kt_polku';
const P = JSON.parse(teksti(PALAUTUS)).osiot, G = JSON.parse(teksti(LAHETYS)).osiot;
const V = require('../scripts/i18n_vie_sv_era105.cjs'), LIB = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, FI = require('../lib/tm_kt_polku.js').FI;
const pm = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
describe('sv-erä 105 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha); 5 riviä = lähetetty erä; lähetetty sv tyhjä, palautettu täytetty, samat paikkamerkit, fi = koodi', () => {
    expect(createHash('sha256').update(teksti(PALAUTUS)).digest('hex')).toBe('3cc289529291144a54dc46e222c54fbae32b0503dc38db37cb5ec98379e1fd6c');
    expect(Object.keys(P)).toEqual([OSIO]); expect(Object.keys(G)).toEqual([OSIO]);
    const r = P[OSIO].rivit; expect(Object.keys(r)).toHaveLength(5); expect(Object.keys(r).sort()).toEqual(Object.keys(G[OSIO].rivit).sort());
    for (const [k, x] of Object.entries(r)) { expect(G[OSIO].rivit[k].sv, k).toBe(''); expect(x.sv.trim(), k).not.toBe(''); expect(x.fi, k).toBe(FI[k]); expect(pm(x.sv), k).toBe(pm(x.fi)); }
  });
  it('koodin sv = PM:n rivi merkki merkiltä', () => {
    for (const [k, x] of Object.entries(P[OSIO].rivit)) expect(LIB[k], k).toBe(x.sv);
  });
  it('idempotentti: uusintakuiva-ajo ei löydä virheitä eikä lisää mitään', () => {
    const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(5);
  });
  it('erä 105 ei ole enää odottavien listalla', () => {
    const rivi = teksti('tools/i18n/sv_kattavuus.mjs').match(/const ODOTTAVAT_ERAT = \[([^\]]*)\];/); expect(rivi).toBeTruthy(); expect(rivi[1].split(',').map((x) => x.trim())).not.toContain('105');
  });
});
