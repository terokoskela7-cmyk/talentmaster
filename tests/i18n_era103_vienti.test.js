/* sv-erä 103 (sähköpostin vaihto, #1290; PM 14.11.2026) — 7 riviä. Code ei kirjoita ruotsia (§0): koodin sv = PM:n palautus (sha 5af844c6…93ec5) merkki merkiltä.
   Kohde lib/tm_henkilosto_i18n.js (tmHT); jokainen avain on seura/seura_hallinta.js:ssä lainausmerkeissä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('docs/i18n/sv_kaannoserae_103_palautus.json')).osiot, G = JSON.parse(teksti('docs/i18n/sv_kaannoserae_103_gemini.json')).osiot;
const V = require('../scripts/i18n_vie_sv_era103.cjs'), H = require('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv;
const C = (() => { const m = require('../lib/tm_i18n_common.js'); return (m.TM_I18N_COMMON || global.TM_I18N_COMMON).sv; })();
const rivit = P.henkilosto_kartta.rivit;
const pm = (s) => (s.match(/\{\w+\}/g) || []).sort().join();

describe('sv-erä 103 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha); 7 riviä = lähetetty erä; lähetetty sv tyhjä, palautettu täytetty, samat paikkamerkit', () => {
    expect(createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_103_palautus.json')).digest('hex')).toBe('5af844c6f37e3220156c202111b0095eb9f2a8b78cf82f7df6da09d23d193ec5');
    expect(Object.keys(P)).toEqual(['henkilosto_kartta']); expect(Object.keys(rivit)).toHaveLength(7);
    expect(Object.keys(rivit).sort()).toEqual(Object.keys(G.henkilosto_kartta.rivit).sort());
    for (const [k, r] of Object.entries(rivit)) { expect(G.henkilosto_kartta.rivit[k].sv, k).toBe(''); expect(r.fi, k).toBe(k); expect(r.sv.trim(), k).not.toBe(''); expect(pm(r.sv), k).toBe(pm(k)); }
  });
  it('koodin sv = palautus merkki merkiltä (henkilöstökartta), eikä yhteinen kartta peitä riviä', () => {
    for (const [k, r] of Object.entries(rivit)) { expect(H[k], k).toBe(r.sv); expect(C[k], k).toBeUndefined(); }
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä; jokainen avain koodissa lainausmerkeissä', () => {
    const t = V.vie({ kirjoita: false });
    expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(7); expect(V.KOODISSA).toEqual({});
  });
  it('erä 103 ei ole enää odottavien listalla', () => {
    const rivi = teksti('tools/i18n/sv_kattavuus.mjs').match(/const ODOTTAVAT_ERAT = \[([^\]]*)\];/); expect(rivi).toBeTruthy();
    expect(rivi[1].split(',').map((x) => x.trim())).not.toContain('103');
  });
});
