/* L7 · selain (chrome-tests): #1313-jälkihavainnot tuotannossa 21.11.
   1. App Check aktivoituu ja reCAPTCHA ladataan KERRAN per dokumentti OIKEASTA DEPLOY-MUODOSTA (scripts/versiotiiviste.js laske → http-palvelin; ei lähdemuotoa).
      Staattisesti: yksi tm_appcheck.js-lataus, yksi tmAppCheckAktivoi()-kutsu deploy-puun skripteissä. Ajossa: sama dok-id kaikissa AppCheck-riveissä, aktivoitu ≤ 1, reCAPTCHA ≤ 1.
   2. Kausi: renderSeason ei yritä laskea ennen kuin L2-normikirjasto on ladattu (ei "[render season] … is not a function" -varoitusta) ja piirtyy latauksen jälkeen. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), VT = require('../scripts/versiotiiviste.js');
const MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const kaynnista = () => require('playwright-core').chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });

describe('L7 · App Check kerran — deploy-puun rakenne (staattinen)', () => {
  const r = VT.laske(JUURI), T = r.tiedostot, html = T['TalentMaster_Master_v16.html'];
  const skriptit = Object.keys(T).filter((k) => /\.js$/.test(k)).filter((k) => k === 'tm_master_main.js' || k === 'tm_master_alku.js');
  it('Master-deploy: tm_appcheck.js ladataan täsmälleen kerran ja ennen pääskriptiä', () => {
    const m = html.match(/<script[^>]*src="lib\/tm_appcheck\.js[^"]*"/g) || [];
    expect(m.length).toBe(1);
    expect(html.indexOf('lib/tm_appcheck.js')).toBeLessThan(html.indexOf('tm_master_main.js'));
  });
  it('Master-deploy: tmAppCheckAktivoi() kutsutaan täsmälleen kerran (pääskriptissä; ei alku-tiedostossa eikä HTML:n inline-lohkoissa)', () => {
    const kutsu = /tmAppCheckAktivoi\s*\(/g;
    expect((T['tm_master_main.js'].match(kutsu) || []).length).toBe(1);
    expect((T['tm_master_alku.js'].match(kutsu) || []).length).toBe(0);
    expect((html.match(kutsu) || []).length).toBe(0);
    expect(skriptit.length).toBe(2);
  });
});

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('L7 · App Check kerran per dokumentti (deploy-muoto, selain)', () => {
  it('http-palveltu deploy-puu: aktivointirivejä ≤ 1, reCAPTCHA-latausrivejä ≤ 1, kaikissa sama dok-id', async () => {
    const r = VT.laske(JUURI), srv = createServer((rq, rs) => {
      const p = decodeURIComponent(rq.url.split('?')[0]).replace(/^\//, ''), ov = Object.prototype.hasOwnProperty.call(r.tiedostot, p) ? r.tiedostot[p] : null, f = join(JUURI, p);
      if (ov === null && (!p || !existsSync(f) || !/\.[a-z]+$/.test(p))) { rs.statusCode = 404; return rs.end(); }
      rs.setHeader('content-type', MIME[extname(p)] || 'application/octet-stream'); rs.setHeader('cache-control', 'no-store'); rs.end(ov !== null ? Buffer.from(ov) : readFileSync(f));
    });
    await new Promise((ok) => srv.listen(0, '127.0.0.1', ok)); const selain = await kaynnista();
    try {
      const sk = await selain.newContext(), p = await sk.newPage(), rivit = [];
      p.on('console', (m) => { const t = m.text(); if (t.indexOf('[AppCheck] aktivoitu') === 0 || t.indexOf('[AppCheck] reCAPTCHA ladataan') === 0) rivit.push(t); });
      await p.goto('http://127.0.0.1:' + srv.address().port + '/TalentMaster_Master_v16.html', { waitUntil: 'load' }); await p.waitForTimeout(3000);
      const akt = rivit.filter((t) => t.indexOf('aktivoitu') >= 0), rec = rivit.filter((t) => t.indexOf('reCAPTCHA') >= 0);
      expect(akt.length, rivit.join('\n')).toBeLessThanOrEqual(1); expect(rec.length, rivit.join('\n')).toBeLessThanOrEqual(1);
      expect(new Set(rivit.map((t) => (/dok ([a-z0-9]+)/.exec(t) || [])[1])).size).toBeLessThanOrEqual(1);
      const rek = await p.evaluate(() => Object.keys((window.__tmAppCheckRek || { aktivoidut: {} }).aktivoidut)); expect(rek.length).toBeLessThanOrEqual(1);
      await sk.close();
    } finally { await selain.close(); srv.close(); }
  }, 90000);
});

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('L7 · Kausi ei piirrä ennen L2-normikirjastoa (selain)', () => {
  it('uudelleenpiirto ennen latausta: ei konsolivaroitusta; setWs(season) lataa kirjaston ja Kausi piirtyy (seasonSub päivittyy)', async () => {
    const selain = await kaynnista();
    try {
      const sk = await selain.newContext({ viewport: { width: 1200, height: 800 } }), p = await sk.newPage(), varoitukset = [];
      p.on('console', (m) => { if (/\[render season\]|laskeTaso3Osuus/.test(m.text())) varoitukset.push(m.text()); });
      await p.goto('file://' + sivu(MASTER, JUURI, { kutsu: '' })); await p.waitForSelector('#probe-out', { state: 'attached' }); await p.waitForTimeout(500);
      expect(await p.evaluate(() => typeof laskeTaso3Osuus)).toBe('undefined');
      const ennen = await p.evaluate(() => { _paivitaKaikkiNakymat(); return document.getElementById('seasonSub').textContent; });
      expect(varoitukset).toEqual([]); expect(ennen).toBe('Kausi 25/26');   // ei osittaista piirtoa
      await p.evaluate(() => setWs('season')); await p.waitForFunction(() => typeof laskeTaso3Osuus === 'function' && tmLaiska.valmis(), null, { timeout: 8000 }); await p.waitForTimeout(500);
      expect(varoitukset).toEqual([]);
      expect(await p.evaluate(() => document.getElementById('seasonSub').textContent)).toMatch(/^Kausi \d{4}\/\d{2} · \d+ pelaajaa$/);
      await sk.close();
    } finally { await selain.close(); }
  }, 90000);
});
