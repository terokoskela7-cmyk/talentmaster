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
  const ennen = await p.evaluate(() => window.__tmEnnen), jalkeen = await p.evaluate(() => window.__tmJalkeen);
  await sk.close(); return { virheet, tulos, ennen, jalkeen };
}
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('L6 · pääskripti tiedostona + defer (selain)', () => {
  it('inline (nyt) ja irrotettu+defer (deploy) tuottavat saman: probe ok, globaalit, samat sivuvirheet, sama sisällön pituus ±5 %', async () => {
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
    const T = mkdtempSync(join(tmpdir(), 'l6s_'));
    try {
      const r = VT.laske(JUURI), js = r.tiedostot['tm_master_main.js']; writeFileSync(join(T, 'tm_master_main.js'), js);
      writeFileSync(join(T, 'tm_master_alku.js'), r.tiedostot['tm_master_alku.js'].replace(/\?v=[0-9a-f]{8}/g, ''));   // vaihe 2: head-lohkot omassa defer-tiedostossaan
      let ulos = r.tiedostot['TalentMaster_Master_v16.html'].replace(/<script src="tm_master_main\.js\?v=[0-9a-f]{8}" defer>/, '<script src="file://' + join(T, 'tm_master_main.js') + '" defer>')
        .replace(/<script src="tm_master_alku\.js\?v=[0-9a-f]{8}" defer>/, '<script src="file://' + join(T, 'tm_master_alku.js') + '" defer>');
      expect(ulos).toContain('file://' + T + '/tm_master_main.js'); expect(ulos).toContain('file://' + T + '/tm_master_alku.js');
      // parsinta-aikainen probe heti tynkälohkon jälkeen (ennen kuin yksikään deferattu skripti on ajettu) + DCL-probe: tynkä → oikeat funktiot, luokka pois
      const PROBE = '<script>window.__tmEnnen={luokka:document.documentElement.classList.contains("tm-main-odottaa"),login:typeof login,loginAsync:/^async/.test(String(window.login)),demoScript:typeof _lataaDemoScript,host:typeof TM_KAAVIO_HOST,seura:typeof window.__TM_SEURA};' +
        'document.addEventListener("DOMContentLoaded",function(){window.__tmJalkeen={luokka:document.documentElement.classList.contains("tm-main-odottaa"),loginAsync:/^async/.test(String(window.login)),googleAsync:/^async/.test(String(window.kirjauduGooglella)),demoAsync:/^async/.test(String(window.loginDemo)),unohditSalasana:/function/.test(String(window._unohditSalasana))&&String(window._unohditSalasana).length>20,demoScript:typeof _lataaDemoScript,host:typeof TM_KAAVIO_HOST,seura:window.__TM_SEURA,bus:typeof TMBus};});</script>';
      expect(ulos).toContain("window.login=window.kirjauduGooglella=window.loginDemo=window._unohditSalasana=function(){};</script>");
      ulos = ulos.replace("window._unohditSalasana=function(){};</script>", 'window._unohditSalasana=function(){};</script>' + PROBE);
      const a = await aja(selain, probeDclHun(sivu(MASTER, JUURI, { kutsu: '' })));
      const b = await aja(selain, probeDclHun(sivu(ulos.replace(/\?v=[0-9a-f]{8}/g, ''), JUURI, { kutsu: '' })));
      expect(b.virheet, 'deploy-muoto: samat sivuvirheet kuin inline (vertailukohdassa on hyvänlaatuinen "Uncaught (in promise) cancelled")').toEqual(a.virheet);
      expect(a.tulos.probe).toBe('ok'); expect(b.tulos.probe).toBe('ok');
      expect(b.tulos.tyypit).toBe('function,function,function,object,function'); expect(b.tulos.tyypit).toBe(a.tulos.tyypit);
      // vaihe 2: ennen deferattuja skriptejä kirjautumisnapit ovat tynkiä ja pois käytöstä (luokka), head-lohkot eivät ole vielä ajaneet; DCL:ssä oikeat funktiot ja luokka pois
      expect(b.ennen).toEqual({ luokka: true, login: 'function', loginAsync: false, demoScript: 'undefined', host: 'undefined', seura: 'undefined' });
      expect(b.jalkeen.luokka).toBe(false); expect(b.jalkeen.loginAsync).toBe(true); expect(b.jalkeen.googleAsync).toBe(true); expect(b.jalkeen.demoAsync).toBe(true); expect(b.jalkeen.unohditSalasana).toBe(true);
      expect(b.jalkeen.demoScript).toBe('function'); expect(b.jalkeen.host).toBe('object'); expect(typeof b.jalkeen.seura).toBe('string'); expect(b.jalkeen.bus).not.toBe('undefined');   // alku-tiedosto ajoi ennen tm-bus.js:ää (__TM_SEURA oli asetettu)
      expect(Math.abs(b.tulos.kal - a.tulos.kal) / Math.max(1, a.tulos.kal)).toBeLessThan(0.05);
    } finally { await selain.close(); rmSync(T, { recursive: true, force: true }); }
  }, 180000);
});
