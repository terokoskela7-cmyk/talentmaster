/* sv-erä 90 (sv-aukot P7: 7 libiä, 110 riviä) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n kirjoittama palautus (sha b4e886a6…) merkki merkiltä. Malli: i18n_era90_vienti.test.js. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('docs/i18n/sv_kaannoserae_90_palautus.json')).osiot, G = JSON.parse(teksti('docs/i18n/sv_kaannoserae_90_gemini.json')).osiot;
const V = require('../scripts/i18n_vie_sv_era90.cjs'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
const LIBIT = { 'lib.tm_kehityskaari': [require('../lib/tm_kehityskaari.js').FI, 25], 'lib.tm_harjoituskertyma_nakyma': [require('../lib/tm_harjoituskertyma_nakyma.js').FI, 10], 'lib.tm_kalenteri_tilaus_ui': [require('../lib/tm_kalenteri_tilaus_ui.js').FI, 30],
  'lib.tm_idp_pelaaja': [require('../lib/tm_idp_pelaaja.js').FI, 35], 'lib.tm_taman_tueksi': [require('../lib/tm_taman_tueksi.js').FI, 2], 'lib.tm_kotiharjoitteet': [require('../lib/tm_kotiharjoitteet.js').FI, 4], 'lib.tm_kentta': [require('../lib/tm_kentta.js').FI, 4] };
describe('sv-erä 90 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 110 riviä (7 osiota) = lähetetty erä; lähetetty sv tyhjä; fi = koodi; paikkamerkit säilyvät', () => {
    expect(createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_90_palautus.json')).digest('hex').startsWith('b4e886a6')).toBe(true);
    let n = 0;
    for (const [o, [FI, lkm]] of Object.entries(LIBIT)) {
      expect(Object.keys(P[o].rivit).sort()).toEqual(Object.keys(G[o].rivit).sort()); expect(Object.keys(P[o].rivit)).toHaveLength(lkm); for (const k of Object.keys(P[o].rivit)) expect(FI, k).toHaveProperty([k]);
      for (const [k, r] of Object.entries(P[o].rivit)) { n++; expect(G[o].rivit[k].sv, k).toBe(''); expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(G[o].rivit[k].fi); expect(r.fi, k).toBe(FI[k]); expect(JSON.stringify(r.fi.match(/\{\w+\}/g)), k).toBe(JSON.stringify(r.sv.match(/\{\w+\}/g))); }
    }
    expect(n).toBe(110);
  });
  it('koodin sv = palautus merkki merkiltä (lib/tm_lib_i18n.js)', () => { for (const o of Object.keys(LIBIT)) for (const [k, r] of Object.entries(P[o].rivit)) expect(SV[k], k).toBe(r.sv); });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(110); });
  it('vienti kaatuu eikä kirjoita, jos fi muuttuu tai sv puuttuu (negatiivitesti, tilapäinen kopio)', async () => {
    const fs = await import('fs'), os = await import('os'), path = await import('path'), kopio = fs.mkdtempSync(path.join(os.tmpdir(), 'era90-'));
    for (const f of ['docs/i18n/sv_kaannoserae_90_palautus.json', 'docs/i18n/sv_kaannoserae_90_gemini.json']) { fs.mkdirSync(path.dirname(path.join(kopio, f)), { recursive: true }); fs.copyFileSync(new URL('../' + f, import.meta.url), path.join(kopio, f)); }
    fs.cpSync(new URL('../lib', import.meta.url), path.join(kopio, 'lib'), { recursive: true });
    const pf = path.join(kopio, 'docs/i18n/sv_kaannoserae_90_palautus.json'), j = JSON.parse(fs.readFileSync(pf, 'utf8')); j.osiot['lib.tm_kehityskaari'].rivit.kka_kehityit.sv = ''; fs.writeFileSync(pf, JSON.stringify(j));
    const t = V.vie({ juuri: kopio, kirjoita: true }); expect(t.virheet.join('|')).toContain('kka_kehityit: sv tyhjä'); expect(t.kirjoitettu).toBe(false);
  });
  it('erä 90 ei ole enää odottavien listalla (LIB_SV_ODOTTAA tyhjä; ODOTTAVAT_ERAT ei sisällä 90)', () => {
    expect(teksti('tests/i18n_sv_era_lib.test.js')).toMatch(/const LIB_SV_ODOTTAA = \[\]/); const rivi = teksti('tools/i18n/sv_kattavuus.mjs').match(/const ODOTTAVAT_ERAT = \[([^\]]*)\];/); expect(rivi).toBeTruthy(); expect(rivi[1].split(',').map((x) => x.trim())).not.toContain('90');
  });
});
