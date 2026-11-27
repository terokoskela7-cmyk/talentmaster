/* B7 (BACKLOG_2_11.md, PM 2.11.): Vanhempi-appin Asetukset → Ilmoitukset -kytkin "Loukkaantuminen – heti kun valmentaja kirjaa" näkyi päällä,
   mutta mikään funktio ei lähetä ilmoitusta → piilotettu. Muut ilmoitusrivit ennallaan. Käännösavaimet (vanhempi.ilm5_*) jäävät tm_lang.js:iin palautusta varten. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
const html = readFileSync(new URL('../TalentMaster_Vanhempi_v2.html', import.meta.url), 'utf8');
const ilmoitukset = (() => { const i = html.indexOf('<!-- Ilmoitukset -->'); return html.slice(i, html.indexOf('<!-- Yksityisyys -->', i)); })();

describe('B7 · Loukkaantuminen-ilmoituskytkin piilossa', () => {
  it('Ilmoitukset-lohko ei renderöi vanhempi.ilm5-riviä', () => {
    expect(ilmoitukset.length).toBeGreaterThan(0);
    expect(ilmoitukset).not.toMatch(/t\('vanhempi\.ilm5_[ls]'\)/);
  });
  it('muut ilmoitusrivit (ilm1–ilm4) ennallaan', () => {
    for (const n of [1, 2, 3, 4]) expect(ilmoitukset, 'ilm' + n).toContain("{l:t('vanhempi.ilm" + n + "_l'), s:t('vanhempi.ilm" + n + "_s')");
  });
  it('ilm5-teksti ei renderöidy muualtakaan Vanhempi-appissa', () => {
    expect(html).not.toMatch(/t\(['"]vanhempi\.ilm5_[ls]['"]\)/);
  });
});
