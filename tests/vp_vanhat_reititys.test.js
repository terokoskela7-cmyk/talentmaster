/* VP: 10 vanhaa sv-läpiajon löytöä (QG-1c / sv-erä 96, PM 5.11.2026) kytketty OLEMASSA OLEVIIN sv-käännöksiin — ei uutta ruotsia (§0).
   8 tekstiä reititetään vpT:n kautta (sv on jo lib/tm_vp_i18n.js:ssä); Pre-PHV ja Post-PHV ovat kieleneutraaleja termejä
   (PM:n sv Masterissa: 'Jälki-PHV' → 'Post-PHV') → sv-läpiajon sallittu lista. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const VP = readFileSync(new URL('../TalentMaster_VP_v25.html', import.meta.url), 'utf8'), SV = require('../lib/tm_vp_i18n.js').TM_VP_I18N.sv;
const SALLITUT = JSON.parse(readFileSync(new URL('../tools/i18n/sv_lapiajo_sallitut.json', import.meta.url), 'utf8')).tekstit;

describe('VP · vanhat tekstit reititetty olemassa oleviin sv-käännöksiin', () => {
  it('jokaisella reititetyllä tekstillä on jo sv VP:n kartassa', () => {
    for (const k of ['Ilmoitukset', 'Top-5', 'Top-10', 'tulossa', 'Pikakirjaus', 'Excel-pohja', 'Historiatuonti', 'Palloliiton PDF']) expect(typeof SV[k] === 'string' && SV[k] !== '' && SV[k] !== k, k).toBe(true);
  });
  it('kutsupaikat kulkevat vpT:n tai data-i18n-arian kautta', () => {
    expect(VP).toContain('aria-label="Ilmoitukset" data-i18n-aria="Ilmoitukset"');
    expect(VP).toContain("['top5', vpT('Top-5')], ['top10', vpT('Top-10')]");
    expect(VP).toContain("lbl:vpT('Top-10')"); expect(VP).toContain("lbl:vpT('Top-5')");
    expect(VP).not.toMatch(/lbl:'Top-(5|10)'/); expect(VP).not.toMatch(/\['top(5|10)', 'Top-/);
    expect(VP).toContain(": vpT('tulossa'));");
    for (const n of ['Pikakirjaus', 'Excel-pohja', 'Historiatuonti', 'Palloliiton PDF']) { expect(VP, n).toContain(", vpT('" + n + "'), vpT("); expect(VP, n).not.toContain(", '" + n + "', vpT("); }
  });
  it('Pre-PHV ja Post-PHV: kieleneutraalit termit sallitulla listalla (sama sv: Master "Jälki-PHV" → "Post-PHV")', () => {
    expect(SALLITUT).toContain('pre-phv'); expect(SALLITUT).toContain('post-phv');
    expect(require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv['Jälki-PHV']).toBe('Post-PHV');
  });
});
