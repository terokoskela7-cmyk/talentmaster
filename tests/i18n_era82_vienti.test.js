/* sv-erä 82 (Seura-tuonti) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n kirjoittama palautus (sha 7ded3a1d…18a5) merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('sv_kaannoserae_82_palautus.json')).osiot.henkilosto_kartta.rivit, G = JSON.parse(teksti('sv_kaannoserae_82_gemini.json')).osiot.henkilosto_kartta.rivit;
const V = require('../scripts/i18n_vie_sv_era82.cjs'), SV = require('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv;
describe('sv-erä 82 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 30 riviä = lähetetty erä; lähetetty sv tyhjä; fi = avain; paikkamerkit säilyvät', () => {
    expect(createHash('sha256').update(teksti('sv_kaannoserae_82_palautus.json')).digest('hex').startsWith('7ded3a1d')).toBe(true);
    expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort()); expect(Object.keys(P)).toHaveLength(30);
    for (const [k, r] of Object.entries(P)) {
      expect(G[k].sv, k).toBe(''); expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(k);
      expect(JSON.stringify(k.match(/\{\w+\}/g)), k).toBe(JSON.stringify(r.sv.match(/\{\w+\}/g)));
    }
  });
  it('koodin sv = palautus merkki merkiltä', () => { for (const [k, r] of Object.entries(P)) expect(SV[k], k).toBe(r.sv); });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(30); });
});
