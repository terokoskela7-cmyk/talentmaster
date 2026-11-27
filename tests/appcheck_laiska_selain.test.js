/* A1 · laiska reCAPTCHA TODELLISELLA App Check -SDK:lla oikeassa Chromessa (ei verkkoa: google.com/recaptcha + firebaseappcheck.googleapis.com reititetään paikallisesti).
   Todistaa: voimassa oleva token IndexedDB:ssä → 0 pyyntöä reCAPTCHA-skriptiin; ei tokenia → skripti ladataan; vertailukohta (kääreetön eager-aktivointi) lataa sen myös tokenin kanssa
   (= testi on herkkä). SDK = node_modules/firebase (compat), ei tuotannon 10.7.1/9.22.x — sisäinen initialize/getToken-rajapinta on sama; tuotantoversio todennetaan stagingissa. */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { createServer } from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const SDK = (n) => readFileSync('node_modules/firebase/' + n, 'utf8');
const SIVU = `<!doctype html><meta charset="utf-8"><title>ac</title><body><script src="/app.js"></script><script src="/ac.js"></script><script src="/lib/tm_appcheck.js"></script><script>
 (async function () {
   var q = new URLSearchParams(location.search), app = firebase.initializeApp({ apiKey: 'k', appId: '1:2:web:3', projectId: 'p' });
   if (q.get('siemen') === '1') await new Promise(function (ok, fail) { var r = indexedDB.open('firebase-app-check-database', 1);
     r.onupgradeneeded = function () { r.result.createObjectStore('firebase-app-check-store', { keyPath: 'compositeKey' }); };
     r.onsuccess = function () { var t = r.result.transaction('firebase-app-check-store', 'readwrite'); t.objectStore('firebase-app-check-store').put({ compositeKey: '1:2:web:3-[DEFAULT]', value: { token: 'SIEMEN', expireTimeMillis: Date.now() + 20 * 3600e3, issuedAtTimeMillis: Date.now() - 600e3 } }); t.oncomplete = ok; t.onerror = fail; }; r.onerror = fail; });
   if (q.get('eager') === '1') firebase.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(TM_APPCHECK_SITE_KEY), true); else tmAppCheckAktivoi();
   var r = await firebase.appCheck().getToken(false).catch(function (e) { return { virhe: String(e && e.message) }; });
   await new Promise(function (x) { setTimeout(x, 600); }); window.__tulos = { token: r && r.token || null, tila: window.tmAppCheckTila && tmAppCheckTila() };
 })();
</script>`;
async function aja(selain, portti, kysely) {
  const ctx = await selain.newContext(), page = await ctx.newPage(), pyynnot = [];
  await page.route(/google\.com\/recaptcha\//, (r) => { pyynnot.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.grecaptcha = { enterprise: { ready: function (f) { f(); }, render: function () { return 1; }, execute: function () { return Promise.resolve("tynkatoken"); } } };' }); });
  await page.route(/googleapis\.com/, (r) => r.abort());
  await page.goto('http://127.0.0.1:' + portti + '/?' + kysely); await page.waitForFunction(() => window.__tulos, null, { timeout: 15000 });
  const tulos = await page.evaluate(() => window.__tulos); await ctx.close(); return { tulos, recaptcha: pyynnot.length };
}
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('A1 · laiska reCAPTCHA (oikea SDK, Chrome)', () => {
  it('voimassa oleva token IndexedDB:ssä → 0 reCAPTCHA-pyyntöä; ei tokenia → ladataan; kääreetön vertailu lataa tokenin kanssakin', async () => {
    const tiedostot = { '/app.js': SDK('firebase-app-compat.js'), '/ac.js': SDK('firebase-app-check-compat.js'), '/lib/tm_appcheck.js': readFileSync('lib/tm_appcheck.js', 'utf8') };
    const palvelin = createServer((rq, rs) => { const p = rq.url.split('?')[0]; if (tiedostot[p]) { rs.setHeader('content-type', 'text/javascript'); rs.end(tiedostot[p]); } else if (p === '/') { rs.setHeader('content-type', 'text/html'); rs.end(SIVU); } else { rs.statusCode = 404; rs.end(); } });
    await new Promise((r) => palvelin.listen(0, '127.0.0.1', r)); const portti = palvelin.address().port;
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
    try {
      const lampimana = await aja(selain, portti, 'siemen=1');
      expect(lampimana.recaptcha).toBe(0); expect(lampimana.tulos.token).toBe('SIEMEN'); expect(lampimana.tulos.tila.recaptcha).toBe('odottaa'); expect(lampimana.tulos.tila.token).toBe(true);
      const kylmana = await aja(selain, portti, 'x=1');
      expect(kylmana.recaptcha).toBeGreaterThan(0); expect(kylmana.tulos.tila.recaptcha).toBe('ladataan');
      const vertailu = await aja(selain, portti, 'siemen=1&eager=1');
      expect(vertailu.recaptcha).toBeGreaterThan(0);   // ilman käärettä sama voimassa oleva token EI estä skriptin latausta
    } finally { await selain.close(); palvelin.close(); }
  }, 90000);
});
