/* L3 · Master selain (Playwright + Chrome; chrome-tests-job): avaus (Koti) EI hae harjoitelogiikka_v4.js:ää; laiska lataus (L2-portti) tuo globaalit ja Näyttö-lohkon Resepti piirtyy ladattuna.
   Oikea Master file://-osoitteesta (tests/helpers/kalenteri_sivu.mjs). Rakenne = l2_master_laiska_kirjastot_selain.test.js. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const kaynnista = () => require('playwright-core').chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
async function avaa(selain) {
  const sk = await selain.newContext({ viewport: { width: 390, height: 800 } }), p = await sk.newPage(), haetut = [], virheet = [];
  p.on('request', (r) => { if (/\/harjoitelogiikka_v4\.js/.test(r.url())) haetut.push(r.url()); });
  p.on('pageerror', (e) => virheet.push(e.message));
  await p.goto('file://' + sivu(MASTER, JUURI, { kutsu: '' })); await p.waitForSelector('#probe-out', { state: 'attached' });
  return { sk, p, haetut, virheet };
}
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('L3 · Master harjoitelogiikka laiskasti (selain)', () => {
  it('avaus (Koti): harjoitelogiikka_v4.js ei haeta, globaaleja ei ole, ei pageerroria; setWs(dev) lataa sen ja globaalit toimivat', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p, haetut, virheet } = await avaa(selain); await p.waitForTimeout(600);
      expect(haetut, 'avaus ei saa hakea harjoitelogiikkaa').toEqual([]);
      expect(virheet.filter((e) => e !== 'Uncaught (in promise) cancelled')).toEqual([]);
      expect(await p.evaluate(() => [typeof valitsePaivanHarjoite, typeof laskeTekninenKehityskohde, typeof PANKKI])).toEqual(['undefined', 'undefined', 'undefined']);
      await p.evaluate(() => setWs('dev')); await p.waitForFunction(() => tmLaiska.valmis() && typeof valitsePaivanHarjoite === 'function', null, { timeout: 8000 });
      expect(haetut.length).toBe(1);
      expect(await p.evaluate(() => [typeof laskeTekninenKehityskohde, typeof generoiMiksiteksti, typeof PANKKI, typeof tmKohdeOtsikko])).toEqual(['function', 'function', 'object', 'function']);
      // sama tulos kuin node-require (characterization): oletuskohde ei-datalle = ikavaihe/oletus
      expect(await p.evaluate(() => { const k = laskeTekninenKehityskohde({ id: 'x', ika: 12 }); return [k && k.lahde, k && k.varmuus]; })).toEqual(['ikavaihe', 'oletus']);
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
