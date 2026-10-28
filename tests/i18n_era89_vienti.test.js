/* sv-erä 89 (K4e: d3k_* + pr_*) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n kirjoittama palautus (sha 5c5e5a9c…d6e9) merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('docs/i18n/sv_kaannoserae_89_palautus.json')).osiot, G = JSON.parse(teksti('docs/i18n/sv_kaannoserae_89_gemini.json')).osiot;
const V = require('../scripts/i18n_vie_sv_era89.cjs'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
const LIBIT = { 'lib.tm_d3_kortti': [require('../lib/tm_d3_kortti.js').FI, 23], 'lib.tm_pelaajaraportti': [require('../lib/tm_pelaajaraportti.js').FI, 45] };
describe('sv-erä 89 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 68 riviä (23 + 45) = lähetetty erä; lähetetty sv tyhjä; fi = koodi; paikkamerkit säilyvät', () => {
    expect(createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_89_palautus.json')).digest('hex').startsWith('5c5e5a9c')).toBe(true);
    let n = 0;
    for (const [o, [FI, lkm]] of Object.entries(LIBIT)) {
      expect(Object.keys(P[o].rivit).sort()).toEqual(Object.keys(G[o].rivit).sort()); expect(Object.keys(P[o].rivit)).toHaveLength(lkm); expect(Object.keys(FI).sort()).toEqual(Object.keys(P[o].rivit).sort());
      for (const [k, r] of Object.entries(P[o].rivit)) { n++; expect(G[o].rivit[k].sv, k).toBe(''); expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(G[o].rivit[k].fi); expect(r.fi, k).toBe(FI[k]); expect(JSON.stringify(r.fi.match(/\{\w+\}/g)), k).toBe(JSON.stringify(r.sv.match(/\{\w+\}/g))); }
    }
    expect(n).toBe(68);
  });
  it('koodin sv = palautus merkki merkiltä (lib/tm_lib_i18n.js)', () => { for (const o of Object.keys(LIBIT)) for (const [k, r] of Object.entries(P[o].rivit)) expect(SV[k], k).toBe(r.sv); });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(68); });
  it('vienti kaatuu eikä kirjoita, jos fi muuttuu tai sv puuttuu (negatiivitesti, tilapäinen kopio)', async () => {
    const fs = await import('fs'), os = await import('os'), path = await import('path'), kopio = fs.mkdtempSync(path.join(os.tmpdir(), 'era89-'));
    for (const f of ['docs/i18n/sv_kaannoserae_89_palautus.json', 'docs/i18n/sv_kaannoserae_89_gemini.json', 'lib/tm_lib_i18n.js', 'lib/tm_d3_kortti.js', 'lib/tm_pelaajaraportti.js', 'lib/tm_todistekortit_fi.js', 'lib/tm_d3_itsearvio.js', 'lib/tm_kt_polku.js']) { fs.mkdirSync(path.dirname(path.join(kopio, f)), { recursive: true }); fs.copyFileSync(new URL('../' + f, import.meta.url), path.join(kopio, f)); }
    const pf = path.join(kopio, 'docs/i18n/sv_kaannoserae_89_palautus.json'), j = JSON.parse(fs.readFileSync(pf, 'utf8')); j.osiot['lib.tm_pelaajaraportti'].rivit.pr_pdf.sv = ''; fs.writeFileSync(pf, JSON.stringify(j));
    const t = V.vie({ juuri: kopio, kirjoita: true }); expect(t.virheet.join('|')).toContain('pr_pdf: sv tyhjä'); expect(t.kirjoitettu).toBe(false);
  });
  it('erä 89 ei ole enää odottavien listalla (LIB_SV_ODOTTAA tyhjä; ODOTTAVAT_ERAT ei sisällä 89)', () => {
    expect(teksti('tests/i18n_sv_era_lib.test.js')).toMatch(/const LIB_SV_ODOTTAA = (\[\]|require\('\.\/helpers\/sv_era91_odottaa\.cjs'\))/);   // erä 91 (sv-aukot k10–15) saa odottaa const rivi = teksti('tools/i18n/sv_kattavuus.mjs').match(/const ODOTTAVAT_ERAT = \[([^\]]*)\];/); expect(rivi).toBeTruthy(); expect(rivi[1].split(',').map((x) => x.trim())).not.toContain('89');
  });
});
