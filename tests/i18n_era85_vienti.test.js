/* sv-erä 85 (K1e) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n kirjoittama palautus (sha ed000350…04f7) merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('docs/i18n/sv_kaannoserae_85_palautus.json')).osiot, G = JSON.parse(teksti('docs/i18n/sv_kaannoserae_85_gemini.json')).osiot;
const V = require('../scripts/i18n_vie_sv_era85.cjs'), TC = require('../lib/tm_todistekortit_fi.js');
const SVC = require('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv, SVL = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
const KARTAT = { yhteiset_kartta: SVC, 'lib.tm_todistekortit': SVL };
describe('sv-erä 85 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 12 riviä (7 + 5) = lähetetty erä; lähetetty sv tyhjä; fi = koodi; paikkamerkit säilyvät', () => {
    expect(createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_85_palautus.json')).digest('hex').startsWith('ed000350')).toBe(true);
    let n = 0;
    for (const o of Object.keys(KARTAT)) {
      expect(Object.keys(P[o].rivit).sort()).toEqual(Object.keys(G[o].rivit).sort());
      for (const [k, r] of Object.entries(P[o].rivit)) {
        n++; expect(G[o].rivit[k].sv, k).toBe(''); expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(G[o].rivit[k].fi);
        expect(r.fi, k).toBe(o === 'yhteiset_kartta' ? k : TC[k]);
        expect(JSON.stringify(r.fi.match(/\{\w+\}/g)), k).toBe(JSON.stringify(r.sv.match(/\{\w+\}/g)));
      }
    }
    expect(n).toBe(12); expect(Object.keys(P.yhteiset_kartta.rivit)).toHaveLength(7); expect(Object.keys(P['lib.tm_todistekortit'].rivit)).toHaveLength(5);
  });
  it('koodin sv = palautus merkki merkiltä', () => { for (const [o, SV] of Object.entries(KARTAT)) for (const [k, r] of Object.entries(P[o].rivit)) expect(SV[k], k).toBe(r.sv); });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(12); });
  it('vanhat katselmus/granskning-rivit poissa; erä 85 ei ole enää odottavien listalla', () => {
    expect(JSON.stringify(SVC)).not.toMatch(/katselm|granskning/i); expect(SVL.tc_viimeisin_testi).toBe('Testad {pvm} · {ika}');
    { const rivi = teksti('tools/i18n/sv_kattavuus.mjs').match(/const ODOTTAVAT_ERAT = \[([^\]]*)\];/); expect(rivi).toBeTruthy(); expect(rivi[1].split(',').map((x) => x.trim())).not.toContain('85'); }   // erä 85 viety; 86 (Seuran STATUS-merkit, #1112) odottaa
  });
});
