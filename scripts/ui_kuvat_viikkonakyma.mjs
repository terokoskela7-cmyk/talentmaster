#!/usr/bin/env node
/* K35-6a · Masterin Kalenteri · Viikko -kuvat: 3 tilaa (tyhjä viikko, esikatselu, täytetty) × tumma/vaalea × 390/1280 → docs/ui-kuvat/<haara>/. Oikea Master-sivu, mock-Firestore, FC Demon kaltainen fixture (tests/helpers/kalenteri_sivu.mjs).
   Käyttö: node scripts/ui_kuvat_viikkonakyma.mjs [--haara nimi] */
import { chromium } from 'playwright-core';
import fs from 'fs'; import path from 'path'; import { execSync } from 'child_process'; import { fileURLToPath } from 'url';
import { sivu, FIXTURE } from '../tests/helpers/kalenteri_sivu.mjs';
const JUURI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const haara = (arg('haara') || execSync('git rev-parse --abbrev-ref HEAD', { cwd: JUURI, encoding: 'utf8' }).trim()).replace(/[^\w.-]+/g, '-'), UT = path.join(JUURI, 'docs', 'ui-kuvat', haara); fs.mkdirSync(UT, { recursive: true });
const POLKU = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome', process.env.PW_CHROMIUM].filter(Boolean).find((x) => fs.existsSync(x));
const html = fs.readFileSync(path.join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8'), TAP = [...FIXTURE.historia, FIXTURE.ottelu, FIXTURE.ryhma], selain = await chromium.launch({ executablePath: POLKU, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }), rivit = [];
for (const [leveys, korkeus] of [[390, 1500], [1280, 900]]) for (const teema of ['dark', 'light']) for (const tila of ['tyhja', 'esikatselu', 'taytetty']) {
  const n = `viikko_${tila}_${leveys}_${teema}`, ctx = await selain.newContext({ viewport: { width: leveys, height: korkeus } }), p = await ctx.newPage();
  await p.goto('file://' + sivu(html, JUURI, { teema, tapahtumat: TAP })); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 }); await p.waitForSelector('#calTaytaKortti .kv-btn', { timeout: 10000 });
  if (tila !== 'tyhja') await p.locator('#calTaytaKortti .kv-btn').click();
  if (tila === 'taytetty') { await p.locator('#calTaytaKortti .kv-btn').click(); await p.waitForFunction(() => document.querySelectorAll('.kv-ehdotus').length === 0 && window.__kirj.length === 4); }
  await p.waitForTimeout(300); const el = p.locator('.ws-view.active').first(); await p.screenshot({ path: path.join(UT, n + '.png') }); rivit.push(n); await ctx.close();
}
await selain.close(); console.log(rivit.length + ' kuvaa → ' + UT);
