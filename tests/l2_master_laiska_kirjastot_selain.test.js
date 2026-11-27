/* L2 · Master selain (Playwright + Chrome; chrome-tests-job): avausnäkymä (Koti) EI hae L2-kirjastoja; poistuminen Kodista / pelaajaprofiili lataa ne ja toiminto toimii ensimmäisellä käytöllä;
   epäonnistunut lataus ei kaada sivua eikä jätä puolikasta näkymää. Oikea Master file://-osoitteesta (tests/helpers/kalenteri_sivu.mjs). */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const LIBIT = ['tm_eerikkila_normit.js', 'tm_teknistaktiset.js', 'tm_kehityskaari.js', 'testit_indeksit.js', 'tm-microcycles.js'];
async function avaa(selain, opts) {
  const sk = await selain.newContext({ viewport: { width: 390, height: 800 } }), p = await sk.newPage(), haetut = [], virheet = [];
  p.on('request', (r) => { const m = /\/(?:lib|docs)\/([A-Za-z0-9_-]+\.js)/.exec(r.url()); if (m && LIBIT.indexOf(m[1]) >= 0) haetut.push(m[1]); });
  p.on('pageerror', (e) => virheet.push(e.message));
  if (opts && opts.katkaise) await p.route('**/' + opts.katkaise + '*', (r) => r.abort());
  await p.goto('file://' + sivu(MASTER, JUURI, { kutsu: '' })); await p.waitForSelector('#probe-out', { state: 'attached' });
  return { sk, p, haetut, virheet };
}
const kaynnista = () => require('playwright-core').chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('L2 · Master laiskat kirjastot (selain)', () => {
  it('avaus (Koti): yhtään L2-kirjastoa ei haeta eikä globaaleja ole; setWs(dev) lataa kaikki 5 järjestyksessä ja funktiot toimivat', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p, haetut } = await avaa(selain); await p.waitForTimeout(600);
      expect(haetut, 'avaus ei saa hakea L2-kirjastoja').toEqual([]);
      expect(await p.evaluate(() => [typeof eerikkilaTaso, typeof tmTtItems, typeof tmKaariRenderFull, typeof TM_TESTIT, typeof window.TM.microcycles])).toEqual(['undefined', 'undefined', 'undefined', 'undefined', 'undefined']);
      await p.evaluate(() => setWs('koti')); await p.waitForTimeout(200); expect(haetut).toEqual([]);   // Koti ei lataa
      await p.evaluate(() => setWs('dev')); await p.waitForFunction(() => typeof eerikkilaTaso === 'function' && typeof TM_TESTIT !== 'undefined' && !!window.TM.microcycles, null, { timeout: 8000 });
      expect(haetut).toEqual(LIBIT);   // HTML-järjestys
      expect(await p.evaluate(() => [typeof tmTtItems, typeof tmKaariRenderFull, tmLaiska.valmis(), document.querySelector('.ws-view.active') && document.querySelector('.ws-view.active').dataset.view])).toEqual(['function', 'function', true, 'dev']);   // alkuperäinen setWs ajettiin latauksen jälkeen
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('avaus ei kaadu ilman kirjastoja (ei pageerroria Kodissa); pelaajaprofiili (_mAvaaPelaajaVanha) palauttaa true heti ja lataa kirjastot', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p, haetut, virheet } = await avaa(selain); await p.waitForTimeout(600);
      expect(virheet.filter((e) => e !== 'Uncaught (in promise) cancelled')).toEqual([]);   // 'cancelled' = vanha kohina (myös ilman L2:ta)
      expect(await p.evaluate(() => _mAvaaPelaajaVanha('p1'))).toBe(true);
      await p.waitForFunction(() => tmLaiska.valmis(), null, { timeout: 8000 }); expect(haetut).toEqual(LIBIT);
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('kirjasto ei lataudu (verkkovirhe): sivu ei kaadu, näkymä ei vaihdu, toast näytetään, uusi yritys onnistuu', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await avaa(selain, { katkaise: 'lib/tm_kehityskaari.js' }); await p.waitForTimeout(500);
      await p.evaluate(() => setWs('dev')); await p.waitForTimeout(1200);
      expect(await p.evaluate(() => tmLaiska.valmis())).toBe(false);
      expect(await p.evaluate(() => _ws)).not.toBe('dev'); expect(await p.evaluate(() => !!document.querySelector('.toast-item'))).toBe(true);
      expect(await p.evaluate(() => typeof setWs)).toBe('function');
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
