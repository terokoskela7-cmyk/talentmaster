/* L2 Erä 1 · Master selain: kaavio-/xt-/pelihavainto-valinta -skriptit (8 kpl) EI lataudu avauksessa (Koti), mutta tynkä-portit (+avaaKaaviopankki, +_kaavioUusiLomake, +tmKaavioLiitaHavaintoon, +tmPhAvaaValinta)
   ovat typeof 'function' → typeof-vartijat eivät putoa hiljaa varapolulle; ensikäyttö lataa erän HTML-järjestyksessä ja oikea funktio korvaa tynkän. Oikea Master file://-osoitteesta. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const ERA = ['tm_pelihavainto_valinta.js', 'tm_kaavio_render.js', 'tm_kaavio_policy.js', 'tm_kaavio_validate.js', 'tm_kaavio_editori.js', 'tm_xt.js', 'tm_xt_kerros.js', 'tm_kaavio_ui.js'];
const kaynnista = () => require('playwright-core').chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
async function avaa(selain) {
  const sk = await selain.newContext({ viewport: { width: 390, height: 800 } }), p = await sk.newPage(), haetut = [], virheet = [];
  p.on('request', (r) => { const m = /\/lib\/([A-Za-z0-9_-]+\.js)/.exec(r.url()); if (m && ERA.indexOf(m[1]) >= 0) haetut.push(m[1]); });
  p.on('pageerror', (e) => virheet.push(e.message));
  await p.goto('file://' + sivu(MASTER, JUURI, { kutsu: '' })); await p.waitForSelector('#probe-out', { state: 'attached' });
  return { sk, p, haetut, virheet };
}
describe('L2 Erä 1 · staattiset', () => {
  it('8 skriptiä text/plain + data-tm-laiska; tm_idp, tm_arviointi_taksonomia, tm_piirros, tm_master_alku EIVÄT siirry (fail-open/globaalit)', () => {
    ERA.forEach((n) => { expect(MASTER, n).toMatch(new RegExp('<script type="text/plain" data-tm-laiska data-tm-ryhma="kaavio" src="lib/' + n.replace('.', '\\.') + '"></script>')); });
    ['tm_idp', 'tm_arviointi_taksonomia', 'tm_piirros'].forEach((n) => expect(MASTER, n).toMatch(new RegExp('<script src="lib/' + n + '\\.js"></script>')));
  });
  it('HTML-järjestys (= latausjärjestys) säilyttää alkuperäiset riippuvuudet: render < policy < validate < editori < xt < xt_kerros < ui', () => {
    const i = (n) => MASTER.indexOf('src="lib/' + n + '"');
    ['tm_kaavio_render.js', 'tm_kaavio_policy.js', 'tm_kaavio_validate.js', 'tm_kaavio_editori.js', 'tm_xt.js', 'tm_xt_kerros.js', 'tm_kaavio_ui.js'].reduce((ed, n) => { expect(i(n), n).toBeGreaterThan(ed); return i(n); }, -1);
  });
});
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('L2 Erä 1 · selain', () => {
  it('avaus ei lataa erää; tynkä-portit ovat funktioita; kaavio-globaaleja ei ole', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p, haetut, virheet } = await avaa(selain); await p.waitForTimeout(800);
      expect(haetut, 'avaus ei saa hakea erän skriptejä').toEqual([]);
      expect(await p.evaluate(() => ['avaaKaaviopankki', '_kaavioUusiLomake', 'tmKaavioLiitaHavaintoon', 'tmPhAvaaValinta'].map((n) => typeof window[n] === 'function' && !!window[n].__tmTynka))).toEqual([true, true, true, true]);
      expect(await p.evaluate(() => [typeof TM_KAAVIO_RENDER, typeof validoiKaavio, typeof xtPiirraKerros, typeof kaavioEdPX])).toEqual(['undefined', 'undefined', 'undefined', 'undefined']);
      expect(virheet.filter((e) => e !== 'Uncaught (in promise) cancelled')).toEqual([]);
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('avaaKaaviopankki() ensikäytöllä: erä latautuu HTML-järjestyksessä ja tynkä korvautuu oikealla funktiolla; piraattikutsu kahdesti ei lataa uudelleen', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p, haetut } = await avaa(selain); await p.waitForTimeout(600);
      await p.evaluate(() => { try { avaaKaaviopankki(); } catch (e) { /* oikea funktio voi tarvita Firestorea — tässä vain lataus ratkaisee */ } });
      await p.waitForFunction(() => window.tmLaiska.valmis('kaavio') && !window.avaaKaaviopankki.__tmTynka, null, { timeout: 15000 });
      expect(haetut).toEqual(ERA);
      expect(await p.evaluate(() => [typeof TM_TT_YOUTH, typeof TM_TT_JOUKKUE])).toEqual(['object', 'object']);   // kaavio_ui lukee konseptit TM_TT_*:stä (typeof-vartioitu) → tm_teknistaktiset.js ladataan kaavio-ryhmän mukana (data-tm-myos)
      expect(await p.evaluate(() => window.tmLaiska.valmis())).toBe(false);   // oletusryhmä (L2/L3: harjoitelogiikka ym.) EI latautunut kaavio-avauksella
      expect(await p.evaluate(() => [typeof TM_KAAVIO_RENDER, typeof validoiKaavio, typeof xtPiirraKerros, typeof kaavioEdPX, typeof _kaavioUusiLomake, !!_kaavioUusiLomake.__tmTynka])).toEqual(['object', 'function', 'function', 'function', 'function', false]);
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('setWs(dev) (oletusryhmän portti) EI lataa kaavio-ryhmää: välilehden vaihto ei maksa erän tavuja (eikä kasvata portin odotusta)', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p, haetut } = await avaa(selain); await p.waitForTimeout(600);
      await p.evaluate(() => setWs('dev')); await p.waitForFunction(() => window.tmLaiska.valmis(), null, { timeout: 15000 }); await p.waitForTimeout(300);
      expect(haetut).toEqual([]); expect(await p.evaluate(() => window.tmLaiska.valmis('kaavio'))).toBe(false);
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
