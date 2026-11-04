/* Apuri (ei testi): sivu oikeassa Chromessa Playwrightilla — sama tapa kuin muissa selaintesteissä (kt_sivu, kalenteri_sivu).
   Korvaa käsin käynnistetyn `chrome --headless --dump-dom --virtual-time-budget=N`:n, joka oli CI:ssä epäluotettava kahdesta syystä:
     1. Chrome jäi ajoittain tulostamatta mitään (30 s → "Chrome ei tuottanut DOM:ia"), kun shardin muut testit käynnistivät selaimia samaan aikaan.
        Prosessin stderr ohitettiin, joten syy ei näkynyt. Playwright käynnistää selaimen CDP-putken yli ja odottaa sen valmiutta itse.
     2. Tulos luettiin kiinteän virtuaaliajan jälkeen (setTimeout 3500 / 7000 ms), joka kilpaili sivun latauksen kanssa. Nyt testi odottaa sivun omaa
        valmiusehtoa (`odota`: CSS-valitsin tai funktio), ei kelloa.
   Ulkoverkko estetään: CDN-skriptit (Firebase, Sentry) ja Google-fontit vastataan tyhjinä, Firebase-app sallivalla tyngällä (kuten perhe_sivu.mjs).
   Testi ei siis riipu verkosta eikä CDN:n nopeudesta. */
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export const CHROME = [process.env.TM_CHROME_PATH, process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  .filter(Boolean).find((p) => existsSync(p));
/* Selaintestit ajetaan vain chrome-tests-jobissa (TM_CHROME_TESTS=1); unit-tests asettaa 0. Ilman tätä ehtoa testi ajetaan myös unit-testsissä
   satojen rinnakkaisten testien kuormassa (ks. tests/chrome_testit_ci_vartija.test.js). */
export const CHROME_KAYTOSSA = !!CHROME && process.env.TM_CHROME_TESTS !== '0';

const FIREBASE_TYNKA = 'window.__mk=function(){var f=function(){return window.__mk()};return new Proxy(f,{get:function(t,p){if(p==="then")return undefined;if(p===Symbol.toPrimitive)return function(){return ""};if(p==="toString")return function(){return ""};return window.__mk()},apply:function(){return window.__mk()}})};window.firebase=window.__mk();';

export async function kaynnistaSelain() {
  const { chromium } = require('playwright-core');
  return chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files', '--hide-scrollbars'] });
}

/* Avaa sivun ja odottaa valmiusehtoa. kohde: { html } (kirjoitetaan tmp-tiedostoon) tai { tiedosto } (absoluuttinen polku).
   Palauttaa { p, virheet, sulje }. virheet = sivun kaatumiset (pageerror) diagnostiikkaa varten. */
export async function avaaSivu(selain, kohde, { viewport = { width: 800, height: 600 }, odota, aikaraja = 20000 } = {}) {
  const sk = await selain.newContext({ viewport }), p = await sk.newPage(), virheet = [];
  let hak = null;
  p.on('pageerror', (e) => virheet.push(e.message));
  await p.route(/^https?:\/\//, (r) => {
    const u = r.request().url();
    if (/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: FIREBASE_TYNKA });
    if (/\.css(\?|$)|fonts\.googleapis\.com/.test(u)) return r.fulfill({ contentType: 'text/css', body: '' });
    if (/\.js(\?|$)/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: '' });
    return r.fulfill({ status: 204, body: '' });
  });
  let url = kohde.tiedosto ? pathToFileURL(kohde.tiedosto).href : null;
  if (kohde.html != null) { hak = mkdtempSync(join(tmpdir(), 'tm-chrome-ajo-')); const f = join(hak, 'sivu.html'); writeFileSync(f, kohde.html); url = pathToFileURL(f).href; }
  const sulje = async () => { await sk.close().catch(() => {}); if (hak) rmSync(hak, { recursive: true, force: true }); };
  try {
    await p.goto(url, { waitUntil: 'load', timeout: aikaraja });
    if (typeof odota === 'string') await p.waitForSelector(odota, { state: 'attached', timeout: aikaraja });
    else if (typeof odota === 'function') await p.waitForFunction(odota, null, { timeout: aikaraja, polling: 100 });
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));   // asettelu valmis ennen mittausta
  } catch (e) {
    await sulje();
    throw new Error(e.message.split('\n')[0] + (virheet.length ? ' · sivun virheet: ' + virheet.slice(0, 3).join(' | ') : ''));
  }
  return { p, virheet, sulje };
}
