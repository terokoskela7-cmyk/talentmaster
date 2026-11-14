/* sv-erä 104 (sähköpostin vaihto, #1290; PM 14.11.2026) — 1 rivi. Code ei kirjoita ruotsia (§0): koodin sv = PM:n palautus (sha 17537f22…92a0) merkki merkiltä.
   Kohde lib/tm_henkilosto_i18n.js (tmHT); jokainen avain on seura/seura_hallinta.js:ssä lainausmerkeissä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('docs/i18n/sv_kaannoserae_104_palautus.json')).osiot, G = JSON.parse(teksti('docs/i18n/sv_kaannoserae_104_gemini.json')).osiot;
const V = require('../scripts/i18n_vie_sv_era104.cjs'), H = require('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv;
const C = (() => { const m = require('../lib/tm_i18n_common.js'); return (m.TM_I18N_COMMON || global.TM_I18N_COMMON).sv; })();
const rivit = P.henkilosto_kartta.rivit;
const pm = (s) => (s.match(/\{\w+\}/g) || []).sort().join();

describe('sv-erä 104 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha); 1 rivi = lähetetty erä; lähetetty sv tyhjä, palautettu täytetty, samat paikkamerkit', () => {
    expect(createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_104_palautus.json')).digest('hex')).toBe('17537f22587bbc9006f2c479feaaecd57a525e908b1c957ffad2195b692e29a0');
    expect(Object.keys(P)).toEqual(['henkilosto_kartta']); expect(Object.keys(rivit)).toHaveLength(1);
    expect(Object.keys(rivit).sort()).toEqual(Object.keys(G.henkilosto_kartta.rivit).sort());
    for (const [k, r] of Object.entries(rivit)) { expect(G.henkilosto_kartta.rivit[k].sv, k).toBe(''); expect(r.fi, k).toBe(k); expect(r.sv.trim(), k).not.toBe(''); expect(pm(r.sv), k).toBe(pm(k)); }
  });
  it('koodin sv = palautus merkki merkiltä (henkilöstökartta), eikä yhteinen kartta peitä riviä', () => {
    for (const [k, r] of Object.entries(rivit)) { expect(H[k], k).toBe(r.sv); expect(C[k], k).toBeUndefined(); }
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä; jokainen avain koodissa lainausmerkeissä', () => {
    const t = V.vie({ kirjoita: false });
    expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(1); expect(V.KOODISSA).toEqual({});
  });
  it('erä 104 ei ole enää odottavien listalla (kaikki erät viety)', () => {
    const rivi = teksti('tools/i18n/sv_kattavuus.mjs').match(/const ODOTTAVAT_ERAT = \[([^\]]*)\];/); expect(rivi).toBeTruthy();
    expect(rivi[1].split(',').map((x) => x.trim())).not.toContain('104');
  });
});
