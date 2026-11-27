/* sv-erä 93 (8–9 v -esto, #1175) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n kirjoittama palautus (sha 44587d3f…1503) merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('docs/i18n/sv_kaannoserae_93_palautus.json')).osiot, G = JSON.parse(teksti('docs/i18n/sv_kaannoserae_93_gemini.json')).osiot;
const V = require('../scripts/i18n_vie_sv_era93.cjs'), HE = require('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv, L = require('../lib/tm_lang.js').TM_LANG;
describe('sv-erä 93 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 3 riviä = lähetetty erä; lähetetty sv tyhjä', () => {
    const sha = createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_93_palautus.json')).digest('hex');
    expect(sha.startsWith('44587d3f')).toBe(true); expect(sha.endsWith('1503')).toBe(true);
    let n = 0;
    for (const o of Object.keys(G)) { expect(Object.keys(P[o].rivit).sort()).toEqual(Object.keys(G[o].rivit).sort()); for (const [k, r] of Object.entries(P[o].rivit)) { n++; expect(G[o].rivit[k].sv, k).toBe(''); expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(G[o].rivit[k].fi); } }
    expect(n).toBe(3);
  });
  it('koodin sv = palautus merkki merkiltä (tm_lang sv.pelaaja + henkilöstökartta)', () => {
    expect(L.sv.pelaaja.ika_alle_10).toBe(P.tm_lang.rivit['pelaaja.ika_alle_10'].sv);
    expect(L.fi.pelaaja.ika_alle_10).toBe(P.tm_lang.rivit['pelaaja.ika_alle_10'].fi);
    for (const [k, r] of Object.entries(P.henkilosto_kartta.rivit)) expect(HE[k], k).toBe(r.sv);
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(3); });
  it('erä 93 ei ole odottavien listalla eikä sv-odotuslistalla', () => {
    const rivi = teksti('tools/i18n/sv_kattavuus.mjs').match(/const ODOTTAVAT_ERAT = \[([^\]]*)\];/); expect(rivi).toBeTruthy(); expect(rivi[1].split(',').map((x) => x.trim())).not.toContain('93');
    expect(require('./tm_lang_sv_odotuslista.cjs')).not.toContain('pelaaja.ika_alle_10');
  });
});
