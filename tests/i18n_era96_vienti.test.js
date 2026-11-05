/* sv-erä 96 (QG-1c: VP Läge oikean datan tiloissa, #1188) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n palautus (sha ee6f6750…7c3f) merkki merkiltä.
   vp.* → lib/tm_vp_i18n.js, master.tm_kalenteri → lib/tm_master_i18n.js. Selainhyväksyntä (Läge-näkymässä ei suomea): tests/qg1c_vp_lage_selain.test.js. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('docs/i18n/sv_kaannoserae_96_palautus.json')).osiot, G = JSON.parse(teksti('docs/i18n/sv_kaannoserae_96_gemini.json')).osiot;
const V = require('../scripts/i18n_vie_sv_era96.cjs'), M = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv, VP = require('../lib/tm_vp_i18n.js').TM_VP_I18N.sv;
const rivit = Object.entries(P).flatMap(([o, v]) => Object.entries(v.rivit).map(([k, r]) => ({ o, k, r })));

describe('sv-erä 96 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 52 riviä = lähetetty erä; lähetetty sv tyhjä', () => {
    const sha = createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_96_palautus.json')).digest('hex');
    expect(sha).toBe('ee6f6750fd890028811ab7e31dbe53cfc7074008cf18b454e3a09fe93fc77c3f');
    expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort()); expect(rivit).toHaveLength(52);
    for (const { o, k, r } of rivit) { expect(G[o].rivit[k].sv, k).toBe(''); expect(r.fi, k).toBe(G[o].rivit[k].fi); expect(r.sv.trim(), k).not.toBe(''); }
  });
  it('koodin sv = palautus merkki merkiltä (vp.* → VP:n kartta, master.* → Masterin kartta)', () => {
    for (const { o, k, r } of rivit) expect((o.startsWith('master.') ? M : VP)[k], o + ' / ' + k).toBe(r.sv);
  });
  it('Masterissa jo käännetyt (sv_master_nyt) = sama sv VP:ssä', () => {
    for (const { k, r } of rivit) if (r.sv_master_nyt !== undefined) { expect(r.sv, k).toBe(r.sv_master_nyt); expect(VP[k], k).toBe(M[k]); }
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => {
    const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toEqual({ vp: 0, master: 0 }); expect(t.ohitettu).toHaveLength(52);
  });
  it('erä 96 ei ole odottavien listalla', () => {
    const rivi = teksti('tools/i18n/sv_kattavuus.mjs').match(/const ODOTTAVAT_ERAT = \[([^\]]*)\];/); expect(rivi).toBeTruthy(); expect(rivi[1].split(',').map((x) => x.trim())).not.toContain('96');
  });
});
