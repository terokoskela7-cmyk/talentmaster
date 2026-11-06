/* sv-erä 97 (email_verified a, #1210) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n kirjoittama palautus (sha fe0a36ba…ea88) merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('docs/i18n/sv_kaannoserae_97_palautus.json')).osiot, G = JSON.parse(teksti('docs/i18n/sv_kaannoserae_97_gemini.json')).osiot;
const V = require('../scripts/i18n_vie_sv_era97.cjs'), L = require('../lib/tm_lang.js').TM_LANG;
describe('sv-erä 97 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 1 rivi = lähetetty erä; lähetetty sv tyhjä', () => {
    const sha = createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_97_palautus.json')).digest('hex');
    expect(sha).toBe('fe0a36bac83ef2d6188ec7f549dfd22c96e9efa4ad72dfa14c1f1e947962ea88');
    expect(Object.keys(P)).toEqual(['tm_lang']); expect(Object.keys(P.tm_lang.rivit)).toEqual(Object.keys(G.tm_lang.rivit));
    for (const [k, r] of Object.entries(P.tm_lang.rivit)) { expect(G.tm_lang.rivit[k].sv, k).toBe(''); expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(G.tm_lang.rivit[k].fi); }
    expect(Object.keys(P.tm_lang.rivit)).toHaveLength(1);
  });
  it('koodin sv = palautus merkki merkiltä, fi ennallaan', () => {
    for (const [k, r] of Object.entries(P.tm_lang.rivit)) { const [ry, a] = k.split('.'); expect(L.sv[ry][a], k).toBe(r.sv); expect(L.fi[ry][a], k).toBe(r.fi); expect(L.en[ry][a], k).toBe(r.en); }
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(1); });
  it('erä 97 ei ole odottavien listalla eikä sv-odotuslistalla', () => {
    const rivi = teksti('tools/i18n/sv_kattavuus.mjs').match(/const ODOTTAVAT_ERAT = \[([^\]]*)\];/); expect(rivi).toBeTruthy(); expect(rivi[1].split(',').map((x) => x.trim())).not.toContain('97');
    const od = require('./tm_lang_sv_odotuslista.cjs'); for (const k of Object.keys(P.tm_lang.rivit)) expect(od, k).not.toContain(k);
  });
});
