/* QG-2 · SW-päivitys oikeassa Chromessa: kun lib muuttuu ja deploy laskee tiivisteet uudelleen, P7, Vanhempi ja ADAR saavat
   uuden version ENSIMMÄISELLÄ latauksella, eikä vanha cache jää käyttöön (activate siivoaa sen, koska cachenimi vaihtui).
   Ajo: julkaisupuu levylle → scripts/versiotiiviste.js --kirjoita → paikallinen http-palvelin → Chrome (ulkoverkko estetty).
   chrome-tests-vaihe ajaa tämän (TM_CHROME_TESTS=1). Puhdas tiivistelaskenta ilman selainta: tests/versiotiiviste.test.js. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, mkdirSync, cpSync, readdirSync, statSync, rmSync } from 'fs';
import { createRequire } from 'module';
import { createServer } from 'http';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join, extname, normalize } from 'path';

const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const VT = require('../scripts/versiotiiviste.js');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const LIB = 'lib/tm_lang.js';   // kaikki kolme lataavat ja cachettavat sen (cache-first)
const MERKKI = (n) => '\n;self.__qgSwVersio = ' + n + ';\n';

function kopioiPuu(kohde) {
  mkdirSync(kohde, { recursive: true });
  for (const f of readdirSync(JUURI)) if (statSync(join(JUURI, f)).isFile()) cpSync(join(JUURI, f), join(kohde, f));
  for (const d of ['lib', 'assets/pwa', 'assets/fonts']) if (existsSync(join(JUURI, d))) cpSync(join(JUURI, d), join(kohde, d), { recursive: true });
  mkdirSync(join(kohde, 'docs'), { recursive: true });
  for (const f of readdirSync(join(JUURI, 'docs'))) if (/\.js$/.test(f)) cpSync(join(JUURI, 'docs', f), join(kohde, 'docs', f));
  return kohde;
}
const TYYPIT = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' };
function palvelin(puu) {
  return new Promise((ok) => {
    const s = createServer((req, res) => {
      const polku = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^\/+/, '');
      const p = join(puu, polku);
      if (!p.startsWith(puu) || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYYPIT[extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(readFileSync(p));
    });
    s.listen(0, '127.0.0.1', () => ok(s));
  });
}
const cachenimi = (puu, sw) => /const CACHE = '([^']+)'/.exec(readFileSync(join(puu, sw), 'utf8'))[1];
/** Pollaa sivulla ajettavaa (async) ehtoa. Playwrightin waitForFunction hyväksyisi async-funktion Promisen heti tosiarvona. */
async function odota(p, fn, arg, ms, viesti) {
  const loppu = Date.now() + ms;
  for (;;) { if (await p.evaluate(fn, arg)) return; if (Date.now() > loppu) throw new Error('aikakatkaisu: ' + viesti + ' — cachet nyt ' + JSON.stringify(await p.evaluate(() => caches.keys()))); await p.waitForTimeout(200); }
}
const libV = (puu, html) => new RegExp(LIB.replace(/[./]/g, '\\$&') + '\\?v=([0-9a-f]{8})').exec(readFileSync(join(puu, html), 'utf8'))[1];

const APIT = [
  { nimi: 'P7', html: 'TalentMaster_Pelaaja_v7.html', sw: 'sw_pelaaja.js' },
  { nimi: 'Vanhempi', html: 'TalentMaster_Vanhempi_v2.html', sw: 'sw_vanhempi.js' },
  { nimi: 'ADAR', html: 'TalentMaster_ADAR_Pikakortti.html', sw: 'sw_adar.js' },
];

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('QG-2 · SW-päivitys selaimessa (P7, Vanhempi, ADAR)', () => {
  let selain; const siivottavat = [];
  beforeAll(async () => {
    const { chromium } = require('playwright-core');
    // Ulkoverkko pois (Firebase-SDK, fontit): sivun omat skriptit ja SW riittävät, eikä ajo riipu verkosta.
    selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
  }, 60000);
  afterAll(async () => { if (selain) await selain.close(); for (const t of siivottavat) rmSync(t, { recursive: true, force: true }); });

  for (const a of APIT) {
    it(a.nimi + ': uusi lib ensimmäisellä latauksella, vanha cache poistuu', async () => {
      const t = mkdtempSync(join(tmpdir(), 'qg2-sw-')); siivottavat.push(t);
      const puu = kopioiPuu(join(t, 'puu')); const alkuLib = readFileSync(join(puu, LIB), 'utf8');
      writeFileSync(join(puu, LIB), alkuLib + MERKKI(1));
      expect(VT.kirjoita(puu).ok).toBe(true);
      const nimi1 = cachenimi(puu, a.sw), v1 = libV(puu, a.html);
      const srv = await palvelin(puu); const base = 'http://127.0.0.1:' + srv.address().port + '/';
      const sk = await selain.newContext(); const p = await sk.newPage();
      try {
        // 1) Ensiasennus: SW rekisteröidään (ADAR rekisteröi itse vain https:ssä → sama URL käsin), sivu ladataan SW:n alaisena.
        await p.goto(base + a.html, { waitUntil: 'load', timeout: 30000 });
        await p.evaluate(async (sw) => { await navigator.serviceWorker.register(sw); await navigator.serviceWorker.ready; }, a.sw);
        await p.reload({ waitUntil: 'load' });
        await p.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
        await p.reload({ waitUntil: 'load' });
        expect(await p.evaluate(() => self.__qgSwVersio)).toBe(1);
        await odota(p, async ([n, lib]) => { const c = await caches.open(n); return (await c.keys()).some((r) => r.url.indexOf(lib) >= 0); }, [nimi1, LIB + '?v=' + v1], 15000, 'lib cacheen (' + nimi1 + ')');
        expect(await p.evaluate(() => caches.keys())).toEqual([nimi1]);

        // 2) Uusi deploy: lib muuttuu → tiivisteet lasketaan uudelleen (sama komento kuin deploy-workflowssa).
        writeFileSync(join(puu, LIB), alkuLib + MERKKI(2));
        expect(VT.kirjoita(puu).ok).toBe(true);
        const nimi2 = cachenimi(puu, a.sw), v2 = libV(puu, a.html);
        expect(nimi2).not.toBe(nimi1); expect(v2).not.toBe(v1);

        // 3) Ensimmäinen lataus deployn jälkeen: uusi lib heti (HTML network-first → uusi ?v → cache-ohitus).
        await p.reload({ waitUntil: 'load' });
        expect(await p.evaluate(() => self.__qgSwVersio)).toBe(2);
        expect(await p.evaluate((lib) => performance.getEntriesByType('resource').map((r) => r.name).filter((u) => u.indexOf(lib) >= 0), LIB)).toEqual([base + LIB + '?v=' + v2]);

        // 4) Uusi SW aktivoituu (skipWaiting + clients.claim) ja poistaa vanhan cachen: vanha versio ei jää käyttöön.
        await odota(p, async (n) => { const k = await caches.keys(); return k.length === 1 && k[0] === n; }, nimi2, 20000, 'vain uusi cache ' + nimi2);
        await p.reload({ waitUntil: 'load' });
        expect(await p.evaluate(() => self.__qgSwVersio)).toBe(2);
        expect(await p.evaluate(() => caches.keys())).toEqual([nimi2]);
      } finally { await sk.close(); srv.close(); }
    }, 120000);
  }
});
