/* sv-erä 67 (VP = tränarchef) — viennin toiminta (scripts/i18n_vie_sv_era67.cjs). Ajetaan TILAPÄISESSÄ kopiossa repon lib-kansiosta: mekaaninen sanankorvaus (vanha termi → "tränarchef") on VAIN testidataa, ei koskaan käännös eikä repoon päätyvä sv.
   Oikea palautus (Gemini, .sv_palautukset/) viedään samalla skriptillä ja tarkistuksilla. */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { cpSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..'), tmp = [];
const V = require('../scripts/i18n_vie_sv_era67.cjs');
function kopio() {
  const d = mkdtempSync(join(tmpdir(), 'era67-')); tmp.push(d); cpSync(join(ROOT, 'lib'), join(d, 'lib'), { recursive: true }); cpSync(join(ROOT, 'TalentMaster_Valmennusapuri.html'), join(d, 'TalentMaster_Valmennusapuri.html')); mkdirSync(join(d, 'docs/i18n'), { recursive: true });
  cpSync(join(ROOT, 'docs/i18n/sv_kaannoserae_67_gemini.json'), join(d, 'docs/i18n/sv_kaannoserae_67_gemini.json')); return d;
}
const palautus = (d, muunna) => {
  const g = JSON.parse(readFileSync(join(d, 'docs/i18n/sv_kaannoserae_67_gemini.json'), 'utf8')); let n = 0;
  for (const o of Object.values(g.osiot)) for (const r of Object.values(o.rivit)) { r.sv = muunna ? muunna(r, n++) : r.sv_nyt.replace(/fotbollsutvecklar\w*/gi, 'tränarchef').replace(/(?<![A-Za-zÅÄÖåäö])FU(?![A-Za-zÅÄÖåäö])/g, 'tränarchef'); }
  writeFileSync(join(d, 'docs/i18n/sv_kaannoserae_67_palautus.json'), JSON.stringify(g)); return g;
};
afterAll(() => { for (const d of tmp) rmSync(d, { recursive: true, force: true }); });
describe('sv-erä 67 — vienti (testidata, tilapäinen kopio)', () => {
  let d; beforeEach(() => { d = kopio(); });
  it('oikea palautus on viety: kuiva-ajo repoa vasten ei muuta mitään (89 ohitettu), inventaario tyhjä; tilapäisessä kopiossa mekaaninen palautus on idempotentti', () => {
    const I = require('../scripts/i18n_tranarchef_inventaario.cjs'); expect(I.kerays()).toEqual([]);
    const k = V.vie({ juuri: ROOT, kirjoita: false }); expect(k.virheet).toEqual([]); expect(k.lisatty).toBe(0); expect(k.ohitettu.length).toBe(89);
    const lang = readFileSync(join(ROOT, 'lib/tm_lang.js'), 'utf8'); expect(lang).toMatch(/vp:\s+'Tränarchef'/); expect(readFileSync(join(ROOT, 'lib/tm_i18n_common.js'), 'utf8')).toMatch(/'Valmennuspäällikkö': 'Tränarchef',   \/\/ kanoni \(Teron päätös 18\.10\.2026\): tränarchef/);   // arvo kopioitu palautuksesta sellaisenaan (otsikkomuoto isolla)
  });
  it('muu lause ennallaan: vain VP-termi vaihtuu (rivimäärä ja avaimet samat)', () => {
    palautus(d); const rivit = (f) => readFileSync(join(d, f), 'utf8').split('\n').length, a = rivit('lib/tm_vp_i18n.js'), b = rivit('lib/tm_master_i18n.js'); V.vie({ juuri: d, kirjoita: true }); expect(rivit('lib/tm_vp_i18n.js')).toBe(a); expect(rivit('lib/tm_master_i18n.js')).toBe(b);
  });
  it('palautus jossa yhä FU tai fotbollsutvecklare → vienti kaatuu, mitään ei kirjoiteta', () => {
    for (const huono of ['FU:s hälsning', 'Fotbollsutvecklaren sätter']) { palautus(d, (r, i) => (i === 3 ? huono : r.sv_nyt.replace(/fotbollsutvecklar\w*/gi, 'tränarchef').replace(/(?<![A-Za-zÅÄÖåäö])FU(?![A-Za-zÅÄÖåäö])/g, 'tränarchef'))); const ennen = readFileSync(join(d, 'lib/tm_vp_i18n.js'), 'utf8'); const t = V.vie({ juuri: d, kirjoita: true }); expect(t.virheet.length).toBeGreaterThan(0); expect(t.kirjoitettu).toBe(false); expect(readFileSync(join(d, 'lib/tm_vp_i18n.js'), 'utf8')).toBe(ennen); }
  });
  it('sv ilman tränarchef-sanaa, puuttuva rivi tai muuttunut fi → kaatuu', () => {
    palautus(d, (r, i) => (i === 5 ? 'ledaren' : r.sv_nyt.replace(/fotbollsutvecklar\w*/gi, 'tränarchef').replace(/(?<![A-Za-zÅÄÖåäö])FU(?![A-Za-zÅÄÖåäö])/g, 'tränarchef'))); expect(V.vie({ juuri: d }).virheet.join()).toContain('tränarchef');
    const g = palautus(d), osio = Object.keys(g.osiot)[0], av = Object.keys(g.osiot[osio].rivit)[0]; delete g.osiot[osio].rivit[av]; writeFileSync(join(d, 'docs/i18n/sv_kaannoserae_67_palautus.json'), JSON.stringify(g)); expect(V.vie({ juuri: d }).virheet.join()).toContain('palautuksen avaimet');
    const g2 = palautus(d); g2.osiot[osio].rivit[av].fi = 'muutettu'; writeFileSync(join(d, 'docs/i18n/sv_kaannoserae_67_palautus.json'), JSON.stringify(g2)); expect(V.vie({ juuri: d }).virheet.join()).toContain('fi ≠ lähetetty');
  });
});
