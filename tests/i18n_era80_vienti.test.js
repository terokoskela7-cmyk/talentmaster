/* sv-erä 80 (K1d) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n kirjoittama, Teron tarkistama palautus (sha f644ddf2…8ba9) merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('sv_kaannoserae_80_palautus.json')).osiot, G = JSON.parse(teksti('sv_kaannoserae_80_gemini.json')).osiot;
const V = require('../scripts/i18n_vie_sv_era80.cjs');
const LIB = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, VP = require('../lib/tm_vp_i18n.js').TM_VP_I18N.sv, MA = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv, YH = require('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv;
const KOHDE = { vp_kartta: VP, master_kartta: MA, yhteiset_kartta: YH };
describe('sv-erä 80 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 240 riviä = lähetetty erä; fi = lähetetty; sv täytetty; paikkamerkit säilyvät', () => {
    expect(createHash('sha256').update(teksti('sv_kaannoserae_80_palautus.json')).digest('hex').startsWith('f644ddf2')).toBe(true);
    let n = 0;
    for (const o of Object.keys(G)) {
      expect(Object.keys(P[o].rivit).sort(), o).toEqual(Object.keys(G[o].rivit).sort());
      for (const [k, r] of Object.entries(P[o].rivit)) { n++; expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(G[o].rivit[k].fi); expect(JSON.stringify(r.fi.match(/\{\w+\}/g)), k).toBe(JSON.stringify(r.sv.match(/\{\w+\}/g))); }
    }
    expect(n).toBe(240);
  });
  it('koodin sv = palautus merkki merkiltä (lib, VP, Master, yhteiset; tm_lang erikseen)', () => {
    for (const o of Object.keys(P)) for (const [k, r] of Object.entries(P[o].rivit)) { if (o === 'tm_lang') continue; expect((KOHDE[o] || LIB)[k], o + ':' + k).toBe(r.sv); }
    const src = readFileSync(new URL('../lib/tm_lang.js', import.meta.url), 'utf8'), sv = src.slice(src.search(/\n {2}sv: \{/), src.search(/\n {2}en: \{/)); expect(sv).toContain("adar_nimi_pelaaja_r: '" + P.tm_lang.rivit['pelaaja.adar_nimi_pelaaja_r'].sv + "'");
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); });
  it('vanhoja sv_nyt-arvoja (Avsluta period, Utvärdering, Granskning…) ei ole enää korvattujen avainten alla', () => {
    for (const o of Object.keys(P)) for (const [k, r] of Object.entries(G[o].rivit)) if (r.sv_nyt && o !== 'tm_lang') { const nyt = (KOHDE[o] || LIB)[k]; expect(nyt, o + ':' + k).toBe(P[o].rivit[k].sv); }
  });
});
