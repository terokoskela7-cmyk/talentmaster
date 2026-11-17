/* L6 · selain (chrome-tests): Masterin pääskripti irrotettuna tiedostoon + `defer` toimii kuten inline: sama harness (mock-Firestore, oikea Master-sivu) ajetaan
   (a) alkuperäisellä inline-sivulla ja (b) deploy-muotoisella (scripts/versiotiiviste.js laske: <script src="tm_master_main.js?v=…" defer>). Molemmissa: ei sivuvirheitä, probe "ok",
   globaalit (setWs, login, loginDemo, _db) määritelty, Kalenteri piirtyy. Probe ajetaan DOMContentLoadedissa (deferred-skripti on silloin ajettu; inline-muodossa sama hetki). */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), VT = require('../scripts/versiotiiviste.js');
const MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));

/** harness kirjoittaa probe-skriptin viimeiseksi inline-skriptiksi → kääri DOMContentLoadediin (deferred-pääskripti on silloin jo ajettu). */
function probeDclHun(polku) {
  let h = readFileSync(polku, 'utf8'); const i = h.lastIndexOf('<script>'), j = h.lastIndexOf('</script>');
  h = h.slice(0, i) + '<script>document.addEventListener("DOMContentLoaded",function(){' + h.slice(i + 8, j) + '});</script>' + h.slice(j + 9); writeFileSync(polku, h); return polku;
}
async function aja(selain, polku) {
  const sk = await selain.newContext({ viewport: { width: 390, height: 800 } }), p = await sk.newPage(), virheet = [];
  p.on('pageerror', (e) => virheet.push(String(e && e.message))); await p.goto('file://' + polku); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 30000 });
  const tulos = await p.evaluate(() => ({ probe: document.getElementById('probe-out').textContent, tyypit: [typeof setWs, typeof login, typeof loginDemo, typeof _db, typeof masterT].join(','), kal: document.body.innerText.length }));
  await sk.close(); return { virheet, tulos };
}
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('L6 · pääskripti tiedostona + defer (selain)', () => {
  it('inline (nyt) ja irrotettu+defer (deploy) tuottavat saman: probe ok, globaalit, samat sivuvirheet, sama sisällön pituus ±5 %', async () => {
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
    const T = mkdtempSync(join(tmpdir(), 'l6s_'));
    try {
      const r = VT.laske(JUURI), js = r.tiedostot['tm_master_main.js']; writeFileSync(join(T, 'tm_master_main.js'), js);
      const ulos = r.tiedostot['TalentMaster_Master_v16.html'].replace(/<script src="tm_master_main\.js\?v=[0-9a-f]{8}" defer>/, '<script src="file://' + join(T, 'tm_master_main.js') + '" defer>');
      expect(ulos).toContain('file://' + T);
      const a = await aja(selain, probeDclHun(sivu(MASTER, JUURI, { kutsu: '' })));
      const b = await aja(selain, probeDclHun(sivu(ulos.replace(/\?v=[0-9a-f]{8}/g, ''), JUURI, { kutsu: '' })));
      expect(b.virheet, 'deploy-muoto: samat sivuvirheet kuin inline (vertailukohdassa on hyvänlaatuinen "Uncaught (in promise) cancelled")').toEqual(a.virheet);
      expect(a.tulos.probe).toBe('ok'); expect(b.tulos.probe).toBe('ok');
      expect(b.tulos.tyypit).toBe('function,function,function,object,function'); expect(b.tulos.tyypit).toBe(a.tulos.tyypit);
      expect(Math.abs(b.tulos.kal - a.tulos.kal) / Math.max(1, a.tulos.kal)).toBeLessThan(0.05);
    } finally { await selain.close(); rmSync(T, { recursive: true, force: true }); }
  }, 180000);
});
