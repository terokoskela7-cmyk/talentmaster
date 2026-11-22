/* Erä (a) · tm_lang.js sv/en → kielipaketit — SELAIN (Playwright + Chrome), Pelaaja_v7 + Vanhempi_v2 oikeina sivuina file://-osoitteesta (perhe_sivu.mjs: Firebase/Sentry tynkänä, ei verkkoa).
   fi: yksikään paketti ei lataudu, tmTuetutKielet() = fi/sv/en silti. Tallennettu sv: vain tm_lang_sv.js (ei en), synkronisesti heti → t() antaa ruotsia ensimmäisestä renderistä.
   Ajonaikainen vaihto (kielivalitsin): fi → sv → en lataa kunkin paketin kerran; draw() odottaa paketin eikä heitä. Offline-vartija: SW-allowlist kattaa paketit. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { selainKaynnista, CHROME, JUURI } from './helpers/kt_sivu.mjs';
import { perheSivu } from './helpers/perhe_sivu.mjs';

const SIVUT = [
  { nimi: 'Pelaaja_v7', tiedosto: 'TalentMaster_Pelaaja_v7.html', vaihda: (k) => 'setLoc("' + k + '")', sw: 'sw_pelaaja.js' },
  { nimi: 'Vanhempi_v2', tiedosto: 'TalentMaster_Vanhempi_v2.html', vaihda: (k) => '_vanhVaihdaKieli("' + k + '")', sw: 'sw_vanhempi.js' },
];
const avaa = async (selain, s, kieli) => {
  const sk = await selain.newContext({ viewport: { width: 390, height: 800 } }), p = await sk.newPage(), pyynnot = [], virheet = [];
  p.on('request', (r) => { const m = /lib\/(tm_lang[a-z_]*\.js)/.exec(r.url()); if (m) pyynnot.push(m[1]); });
  p.on('pageerror', (e) => virheet.push(e.message));
  if (kieli) await p.addInitScript((k) => { try { localStorage.setItem('tm_kieli', k); } catch (e) { /* ei */ } }, kieli);
  const html = perheSivu(readFileSync(join(JUURI, s.tiedosto), 'utf8'), JUURI, 'out("ok")');
  await p.goto('file://' + html, { waitUntil: 'load' }); await p.waitForTimeout(900);
  return { sk, p, pyynnot, virheet };
};
const tila = (p) => p.evaluate(() => ({ kieli: tmNykyinenKieli(), sv: !!(window.TM_LANG && TM_LANG.sv), en: !!(window.TM_LANG && TM_LANG.en), tuetut: tmTuetutKielet(), valmis: tmLangValmis(), t: t('yleiset.tallenna') }));

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('tm_lang-paketit selaimessa (Pelaaja_v7 + Vanhempi_v2)', () => {
  for (const s of SIVUT) {
    it(s.nimi + ' fi: ei lataa sv/en-pakettia; tmTuetutKielet() = fi/sv/en; t() suomea', async () => {
      const selain = await selainKaynnista(); try {
        const { sk, p, pyynnot } = await avaa(selain, s, null), x = await tila(p);
        expect(pyynnot, 'vain moottori').toEqual(['tm_lang.js']);
        expect(x).toMatchObject({ kieli: 'fi', sv: false, en: false, valmis: true, t: 'Tallenna' }); expect(x.tuetut).toEqual(['fi', 'sv', 'en']);
        await sk.close();
      } finally { await selain.close(); }
    }, 60000);
    it(s.nimi + ' tallennettu sv: vain sv-paketti (ei en), t() ruotsia heti; tmTuetutKielet() ennallaan', async () => {
      const selain = await selainKaynnista(); try {
        const { sk, p, pyynnot } = await avaa(selain, s, 'sv'), x = await tila(p);
        expect(pyynnot.sort()).toEqual(['tm_lang.js', 'tm_lang_sv.js']);
        expect(x).toMatchObject({ kieli: 'sv', sv: true, en: false, valmis: true, t: 'Spara' }); expect(x.tuetut).toEqual(['fi', 'sv', 'en']);
        await sk.close();
      } finally { await selain.close(); }
    }, 60000);
    it(s.nimi + ' ajonaikainen vaihto fi → sv → en: paketti ladataan kerran per kieli, draw() odottaa eikä heitä', async () => {
      const selain = await selainKaynnista(); try {
        const { sk, p, pyynnot, virheet } = await avaa(selain, s, null), ennen = virheet.length;
        await p.evaluate(s.vaihda('sv')); expect(await p.evaluate(() => tmLangValmis()), 'draw() jäi odottamaan pakettia').toBe(false);
        await p.waitForFunction(() => tmLangValmis(), null, { timeout: 15000 }); let x = await tila(p);
        expect(x).toMatchObject({ kieli: 'sv', sv: true, en: false, t: 'Spara' });
        await p.evaluate(s.vaihda('en')); await p.waitForFunction(() => tmLangValmis(), null, { timeout: 15000 }); x = await tila(p);
        expect(x).toMatchObject({ kieli: 'en', sv: true, en: true, t: 'Save' });
        await p.evaluate(s.vaihda('sv')); await p.waitForTimeout(300);
        expect(pyynnot.filter((n) => n === 'tm_lang_sv.js').length, 'sv ladattu kerran').toBe(1); expect(pyynnot.filter((n) => n === 'tm_lang_en.js').length, 'en ladattu kerran').toBe(1);
        expect(virheet.slice(ennen), 'vaihto ei heitä').toEqual([]);
        await sk.close();
      } finally { await selain.close(); }
    }, 90000);
    it(s.nimi + ' puuttuva paketti (lataus epäonnistuu) → ei draw-silmukkaa: valmis=true, teksti jää suomeksi', async () => {
      const selain = await selainKaynnista(); try {
        const { sk, p } = await avaa(selain, s, null);
        await p.evaluate(() => { document.querySelectorAll('script[data-tm-kielipaketti]').forEach((e) => e.setAttribute('src', 'lib/ei_ole_olemassa_' + e.getAttribute('src').split('/').pop())); });
        await p.evaluate(s.vaihda('sv')); await p.waitForFunction(() => tmLangValmis(), null, { timeout: 15000 }); const x = await tila(p);
        expect(x).toMatchObject({ kieli: 'sv', sv: false, valmis: true, t: 'Tallenna' });
        await sk.close();
      } finally { await selain.close(); }
    }, 60000);
  }
});
