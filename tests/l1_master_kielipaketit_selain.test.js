/* L1 · Master selain (Playwright + Chrome; chrome-tests-job): fi-tilassa sv/en-sanakirjoja EI haeta lainkaan; tm_kieli=sv → kaikki 4 haetaan ja masterT palauttaa ruotsin;
   kielenvaihto fi→sv lataa paketit ja renderöi sv:llä; epäonnistunut paketti ei kaada sivua (teksti jää fi:ksi). Oikea Master-sivu file://-osoitteesta (tests/helpers/kalenteri_sivu.mjs). */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const PAKETIT = ['tm_lib_i18n.js', 'tm_i18n_common.js', 'tm_master_i18n.js', 'tm_teknistaktiset_sv.js'];
const M = require('../lib/tm_master_i18n.js');
const AVAIN = Object.keys(M.TM_MASTER_I18N.sv).find((k) => k.length > 3 && M.TM_MASTER_I18N.sv[k] && M.TM_MASTER_I18N.sv[k] !== k), SV = M.TM_MASTER_I18N.sv[AVAIN];

async function avaa(selain, opts) {
  const sk = await selain.newContext({ viewport: { width: 390, height: 800 } }), p = await sk.newPage(), haetut = [];
  if (opts && opts.kieli) await sk.addInitScript((k) => { try { localStorage.setItem('tm_kieli', k); } catch (e) { /* */ } }, opts.kieli);
  p.on('request', (r) => { const m = /\/lib\/(tm_[a-z0-9_]+\.js)/.exec(r.url()); if (m && PAKETIT.indexOf(m[1]) >= 0) haetut.push(m[1]); });
  if (opts && opts.katkaise) await p.route('**/lib/' + opts.katkaise + '*', (r) => r.abort());
  await p.goto('file://' + sivu(MASTER, JUURI, { kutsu: '' })); await p.waitForSelector('#probe-out', { state: 'attached' });
  return { sk, p, haetut };
}
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('L1 · Master kielipaketit (selain)', () => {
  it('fi: yhtään sanakirjaa ei haeta; masterT = identiteetti; kielenvaihto sv → haetaan 4 + masterT sv; takaisin fi → fi', async () => {
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
    try {
      const { sk, p, haetut } = await avaa(selain); await p.waitForTimeout(600);
      expect(haetut, 'fi-avaus ei saa hakea sv/en-sanakirjoja').toEqual([]);
      expect(await p.evaluate((a) => masterT(a), AVAIN)).toBe(AVAIN);
      await p.evaluate(() => masterVaihdaKieli('sv')); await p.waitForFunction((a) => masterT(a) !== a, AVAIN, { timeout: 8000 });
      expect(await p.evaluate((a) => masterT(a), AVAIN)).toBe(SV); expect([...new Set(haetut)].sort()).toEqual([...PAKETIT].sort());
      await p.evaluate(() => masterVaihdaKieli('fi')); expect(await p.evaluate((a) => masterT(a), AVAIN)).toBe(AVAIN);
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('tm_kieli=sv (localStorage): paketit haetaan ja masterT palauttaa ruotsin ilman erillistä vaihtoa', async () => {
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
    try {
      const { sk, p, haetut } = await avaa(selain, { kieli: 'sv' });
      await p.waitForFunction((a) => masterT(a) !== a, AVAIN, { timeout: 8000 });
      expect(await p.evaluate((a) => masterT(a), AVAIN)).toBe(SV); expect([...new Set(haetut)].sort()).toEqual([...PAKETIT].sort());
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('paketti ei lataudu (verkkovirhe) → sivu ei kaadu, masterT jää fi:ksi', async () => {
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
    try {
      const { sk, p } = await avaa(selain, { kieli: 'sv', katkaise: 'tm_master_i18n.js' }); await p.waitForTimeout(1200);
      expect(await p.evaluate((a) => masterT(a), AVAIN)).toBe(AVAIN); expect(await p.evaluate(() => typeof setWs)).toBe('function');
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
