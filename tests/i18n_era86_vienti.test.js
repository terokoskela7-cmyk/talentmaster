/* sv-erä 86 (Seuran STATUS-merkit Virhe + Huomio) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n kirjoittama palautus (sha 14a39daf…79cb) merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('docs/i18n/sv_kaannoserae_86_palautus.json')).osiot.henkilosto_kartta.rivit, G = JSON.parse(teksti('docs/i18n/sv_kaannoserae_86_gemini.json')).osiot.henkilosto_kartta.rivit;
const V = require('../scripts/i18n_vie_sv_era86.cjs'), SV = require('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv;
describe('sv-erä 86 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 2 riviä = lähetetty erä; lähetetty sv tyhjä; fi = avain', () => {
    const sha = createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_86_palautus.json')).digest('hex');
    expect(sha.startsWith('14a39daf')).toBe(true); expect(sha.endsWith('79cb')).toBe(true);
    expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort()); expect(Object.keys(P)).toHaveLength(2);
    for (const [k, r] of Object.entries(P)) { expect(G[k].sv, k).toBe(''); expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(k); }
  });
  it('koodin sv = palautus merkki merkiltä', () => { for (const [k, r] of Object.entries(P)) expect(SV[k], k).toBe(r.sv); });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(2); });
  it('erä 86 ei ole enää odottavien listalla', () => {
    const rivi = teksti('tools/i18n/sv_kattavuus.mjs').match(/const ODOTTAVAT_ERAT = \[([^\]]*)\];/); expect(rivi).toBeTruthy(); expect(rivi[1].split(',').map((x) => x.trim())).not.toContain('86');
  });
});
