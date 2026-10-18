/* VP = tränarchef (Teron päätös 18.10.2026): mihinkään sv-karttaan ei saa tulla "fotbollsutvecklare" eikä sanaa "FU" (FU:s, FU:n, FU-). Ei sallittuja poikkeuksia — paitsi erän 67 vielä viemättömät rivit (ERA67_ODOTTAA, poistetaan viennissä). */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const I = require('../scripts/i18n_tranarchef_inventaario.cjs');
const ERA67_ODOTTAA = false;   // false kun erä 67 on viety (scripts/i18n_vie_sv_era67.cjs)
const odottavat = () => {
  if (!ERA67_ODOTTAA) return new Set();
  const g = JSON.parse(readFileSync(new URL('../docs/i18n/sv_kaannoserae_67_gemini.json', import.meta.url), 'utf8')).osiot, s = new Set();
  for (const [osio, o] of Object.entries(g)) for (const a of Object.keys(o.rivit)) s.add(osio + '|' + a); return s;
};
describe('sv-kartoissa ei vanhaa VP-termiä', () => {
  it('ei fotbollsutvecklare / FU yhdessäkään sv-arvossa (lib-kartat, tm_lang, Valmennusapuri)', () => {
    const o = odottavat(), loydot = I.kerays().filter((r) => !o.has(r.osio + '|' + r.avain)).map((r) => r.osio + ' ' + r.avain + ' → ' + r.sv_nyt.slice(0, 60));
    expect(loydot, 'käytä "tränarchef" (docs/i18n/termisto.fi-sv.json)').toEqual([]);
  });
  it('vartija on vakuuttava: tunnistaa vanhat muodot, ei CSS-animaatiota "fu" eikä sanoja joiden osana FU', () => {
    for (const s of ['Fotbollsutvecklaren', 'fotbollsutvecklare', 'FU', 'FU:s hälsning', 'FU:n', 'FU-bedömning', 'tränare/FU', 'Be FU eller']) expect(I.osuu(s), s).toBe(true);
    for (const s of ['animation:fu .8s', 'tränarchef', 'FUNKTION', 'FUNK', 'Futsal', 'TC']) expect(I.osuu(s), s).toBe(false);
  });
  it('termistö ja Gemini-ohje: VP = tränarchef', () => {
    const t = JSON.parse(readFileSync(new URL('../docs/i18n/termisto.fi-sv.json', import.meta.url), 'utf8')), rivit = JSON.stringify(t);
    expect(rivit).toMatch(/"sv":\s*"tränarchef"/); expect(rivit).not.toMatch(/"sv":\s*"Fotbollsutvecklare"/);
    const o = readFileSync(new URL('../docs/i18n/GEMINI_OHJE_kooste.md', import.meta.url), 'utf8'); expect(o).toContain('tränarchef'); expect(o).not.toMatch(/\| Valmennuspäällikkö \| Fotbollsutvecklare/);
  });
  it('erä 67: lähetetty erä kattaa täsmälleen löydetyt rivit (ennen vientiä) ja jokaisella rivillä on sv_nyt + tyhjä sv', () => {
    if (!ERA67_ODOTTAA) return;
    const g = JSON.parse(readFileSync(new URL('../docs/i18n/sv_kaannoserae_67_gemini.json', import.meta.url), 'utf8')), r = I.kerays(); expect(g._rivit_yhteensa).toBe(r.length); expect(r.length).toBeLessThanOrEqual(120);
    for (const x of r) { const rr = g.osiot[x.osio].rivit[x.avain]; expect(rr.sv_nyt).toBe(x.sv_nyt); expect(rr.sv).toBe(''); expect(rr.fi, x.avain).toBeTruthy(); }
    expect(g._ohje).toContain('tränarchef');
  });
});
