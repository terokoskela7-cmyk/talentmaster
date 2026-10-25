/* Vaihe 1 / PR 1f-3 — P7 selain (Playwright + Chrome; chrome-tests-job): oikea Pelaaja_v7-sivu lataa dok-libin ennen kuin sitä tarvitaan, eikä parse-virhettä (verifiointi-html-inline-script). Verkko estetty. */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('1f-3 · Pelaaja_v7 selaimessa', () => {
  it('sivu jäsentyy; TM_IDP_PELAAJA_DOK ladattu, lippu PÄÄLLÄ; _p7LataaTavoite/_tallennaSitoumus määritelty; dok-lib ennen tm_idp_pelaaja.js', async () => {
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files'] });
    try {
      const sk = await selain.newContext(), p = await sk.newPage(), virheet = [];
      await p.route(/^https?:/, (r) => r.abort()); p.on('pageerror', (e) => virheet.push(String(e.message)));
      await p.goto('file://' + join(JUURI, 'TalentMaster_Pelaaja_v7.html'), { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(800);
      const r = await p.evaluate(() => ({ dok: typeof window.TM_IDP_PELAAJA_DOK, lippu: window.TM_IDP_PELAAJA_DOK && window.TM_IDP_PELAAJA_DOK.LIPPU.kirjoitus, lataa: typeof _p7LataaTavoite, sit: typeof _tallennaSitoumus,
        jarj: [...document.scripts].map((s) => s.src).filter((s) => /tm_idp_pelaaja/.test(s)).map((s) => s.split('/').pop().split('?')[0]) }));
      expect(r).toEqual({ dok: 'object', lippu: true, lataa: 'function', sit: 'function', jarj: ['tm_idp_pelaaja_dok.js', 'tm_idp_pelaaja.js'] });
      expect(virheet.filter((m) => /SyntaxError|ReferenceError: (_p7|TM_IDP)/.test(m))).toEqual([]);
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
