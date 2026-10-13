/* Mockup 22 (V-KOTI-kuori) -kuvat: docs/design/idp-v2/kuvat/22_v2_*_dark.png
   Käyttö: node tools/design/kuvaa_22_v2.mjs   (Chromium: $PW_CHROMIUM tai macOS Google Chrome / /usr/bin/chromium; fontit Google Fontsista, joten verkko päällä)
   Tumma teema, deviceScaleFactor 1. 1280-kuvat 1280×900-näkymällä, 390-kuvat 390×844:llä; sivun marginaalit poistetaan, jotta kuori on täsmälleen näkymän levyinen. */
import { chromium } from 'playwright-core';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const JUURI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HTML = 'file://' + path.join(JUURI, 'docs/design/idp-v2/22_kehitystyopoyta_kayttettavyys.html');
const UT = path.join(JUURI, 'docs/design/idp-v2/kuvat');
function chromiumPolku() {
  const k = [process.env.PW_CHROMIUM, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].filter(Boolean);
  try { fs.readdirSync('/opt/pw-browsers').filter((x) => /^chromium/.test(x)).forEach((x) => k.unshift('/opt/pw-browsers/' + x + '/chrome-linux/chrome')); } catch (e) { /* ei */ }
  const p = k.find((x) => { try { return fs.statSync(x).isFile(); } catch (e) { return false; } });
  if (!p) throw new Error('Chromiumia ei löytynyt (aseta PW_CHROMIUM)');
  return p;
}
const virheet = [];
async function avaa(browser, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: 'dark' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => virheet.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|net::ERR/.test(m.text())) virheet.push('console: ' + m.text()); });
  await page.goto(HTML, { waitUntil: 'load' });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.addStyleTag({ content: '.wrap{max-width:none!important;padding:0!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  return page;
}
const kuva = async (page, sel, nimi) => { await page.locator(sel).screenshot({ path: path.join(UT, '22_v2_' + nimi + '_dark.png'), animations: 'disabled' }); console.log('→', nimi, fs.statSync(path.join(UT, '22_v2_' + nimi + '_dark.png')).size); };
const aani = async (page, v) => { await page.click('#ctl [data-aa="' + v + '"]'); await page.waitForTimeout(150); };

const browser = await chromium.launch({ executablePath: chromiumPolku(), headless: true });
try {
  /* ── 1280 ── */
  let p = await avaa(browser, 1280, 900);
  await kuva(p, '#vk-a', 'tanaan_1280');
  await kuva(p, '#vk-b', 'polku_1280');
  await aani(p, 'ei'); await kuva(p, '#vk-b', 'polku_ei_aanta_1280'); await aani(p, 'on');
  await kuva(p, '#vk-c', 'naytto_1280');
  /* sheet-demo: Aloita jakso → kirjoita → sulje → avaa uudelleen */
  await p.click('#ctl5 [data-dv="d"]');
  await p.click('#ctl5 [data-sh="aloita"]');
  await p.click('.sh-ov .shopt[data-v="k1"]');
  await p.fill('.sh-ov #shAl', 'Tässä jaksossa harjoittelemme, että katsot ympärillesi ennen kuin pallo tulee.');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(150);
  await p.click('#ctl5 [data-sh="aloita"]');
  await p.waitForTimeout(150);
  await kuva(p, '#vk-x', 'sheet_luonnos_1280');
  await p.keyboard.press('Escape');
  await p.click('#ctl5 [data-sh="havainto"]');
  await p.click('.sh-ov .shopt[data-v="ohjatusti"]');
  await p.fill('.sh-ov #shLause', 'Hyvä, kun katse oli ylhäällä ennen vastaanottoa.');
  await p.waitForTimeout(150);
  await p.addStyleTag({ content: '#s5{padding:24px 28px 8px}' });
  await kuva(p, '#s5', 'sheetit_1280');
  await p.context().close();
  /* ── 390 ── */
  p = await avaa(browser, 390, 844);
  await kuva(p, '#vk-m0', 'tanaan_m390');
  await kuva(p, '#vk-m1', 'polku_m390');
  await aani(p, 'ei'); await kuva(p, '#vk-m1', 'polku_ei_aanta_m390'); await aani(p, 'on');
  await kuva(p, '#vk-m2', 'naytto_m390');
  await p.click('#ctl5 [data-dv="m"]');
  await p.click('#ctl5 [data-sh="havainto"]');
  await p.click('.sh-ov .shopt[data-v="ohjatusti"]');
  await p.fill('.sh-ov #shLause', 'Hyvä, kun katse oli ylhäällä ennen vastaanottoa.');
  await kuva(p, '#vk-x', 'sheet_havainto_m390');
  await p.keyboard.press('Escape');
  await p.click('#ctl5 [data-sh="aloita"]');
  await p.click('.sh-ov .shopt[data-v="k1"]');
  await p.fill('.sh-ov #shAl', 'Tässä jaksossa harjoittelemme, että katsot ympärillesi ennen kuin pallo tulee.');
  await kuva(p, '#vk-x', 'sheet_aloita_jakso_m390');
  await p.context().close();
} finally { await browser.close(); }
if (virheet.length) { console.error('VIRHEET:\n' + virheet.join('\n')); process.exit(1); }
console.log('ok, ei konsolivirheitä');
