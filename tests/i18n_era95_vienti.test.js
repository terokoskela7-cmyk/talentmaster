/* sv-erä 95 (B3 Kehitystyöpöydän Korjaa mittaus, #1187) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n palautus (sha d0886529…9638) merkki merkiltä.
   PM vahvisti VP:n nykyiset sv-tekstit sellaisenaan → Kehitystyöpöytä ja VP puhuvat samaa kieltä korjausikkunassa. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('docs/i18n/sv_kaannoserae_95_palautus.json')).osiot.master_kartta.rivit, G = JSON.parse(teksti('docs/i18n/sv_kaannoserae_95_gemini.json')).osiot.master_kartta.rivit;
const V = require('../scripts/i18n_vie_sv_era95.cjs'), M = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv, VP = require('../lib/tm_vp_i18n.js').TM_VP_I18N.sv;
describe('sv-erä 95 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 13 riviä = lähetetty erä; lähetetty sv tyhjä', () => {
    const sha = createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_95_palautus.json')).digest('hex');
    expect(sha).toBe('d088652980a28d6f66013bfbf720eda34b34bdbfe9f4b6af792be36eb9fb9638');
    expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort()); expect(Object.keys(P)).toHaveLength(13);
    for (const [k, r] of Object.entries(P)) { expect(G[k].sv, k).toBe(''); expect(r.fi, k).toBe(G[k].fi); expect(r.sv.trim(), k).not.toBe(''); }
  });
  it('koodin sv (Masterin/Kehitystyöpöydän kartta) = palautus merkki merkiltä = VP:n sv samalle tekstille', () => {
    for (const [k, r] of Object.entries(P)) { expect(M[k], k).toBe(r.sv); expect(VP[k], k).toBe(r.sv); }
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(13); });
  it('erä 95 ei ole odottavien listalla', () => {
    const rivi = teksti('tools/i18n/sv_kattavuus.mjs').match(/const ODOTTAVAT_ERAT = \[([^\]]*)\];/); expect(rivi).toBeTruthy(); expect(rivi[1].split(',').map((x) => x.trim())).not.toContain('95');
  });
});
