/* B2c (D152): mockup 22 v2 ja toteutus rinnakkain, leveydet 1024 / 1280 / 390, tilat "ei jaksoa" ja "jakso käynnissä" (tumma teema).
   Käyttö: node tools/design/kuvaa_b2c_vertailu.mjs   → docs/ui-kuvat/b2c-ulkoasu/vertailu_<tila>_<leveys>.png (vasen = mockup, oikea = toteutus; Firebase stubattu, vain keksityt nimet)
   Mockup: docs/design/idp-v2/22_kehitystyopoyta_kayttettavyys.html (tilanappi data-st = eijaksoa | normaali). */
import { chromium } from 'playwright-core';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { kaynnista, CHROME } from '../../tests/helpers/kt_sivu.mjs';
const JUURI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MOCK = 'file://' + path.join(JUURI, 'docs/design/idp-v2/22_kehitystyopoyta_kayttettavyys.html');
const UT = path.join(JUURI, 'docs/ui-kuvat/b2c-ulkoasu'); fs.mkdirSync(UT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
const TILAT = [['eijaksoa', 'eijaksoa', 'p1', 'Ei jaksoa'], ['jakso', 'normaali', 'p2', 'Jakso käynnissä']];
const LEVEYDET = [[1024, 900, '#vk-a'], [1280, 900, '#vk-a'], [390, 844, '#vk-m0']];
const virheet = [];
for (const [tnimi, mockTila, pid, otsikko] of TILAT) for (const [w, h, sel] of LEVEYDET) {
  const mctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark' }), mp = await mctx.newPage();
  await mp.goto(MOCK, { waitUntil: 'load' }); await mp.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await mp.addStyleTag({ content: '.wrap{max-width:none!important;padding:0!important}' });
  await mp.click('#ctl [data-st="' + mockTila + '"]'); await mp.evaluate(() => document.fonts.ready); await mp.waitForTimeout(400);
  const mf = path.join(UT, '_mock_' + tnimi + '_' + w + '.png'); await mp.locator(sel).screenshot({ path: mf, animations: 'disabled' }); await mctx.close();
  const { sk, p, virheet: v } = await kaynnista({ newContext: (o) => browser.newContext(o) }, { rooli: 'valmentaja', hash: '#pelaaja/' + pid + '/tanaan', leveys: w, korkeus: h });
  await p.waitForSelector('.kt-nimi'); await p.waitForTimeout(500);
  const tf = path.join(UT, '_toteutus_' + tnimi + '_' + w + '.png'); await p.screenshot({ path: tf }); virheet.push(...v.filter((e) => !/integrity/.test(e))); await sk.close();
  const kuvaB64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  const sctx = await browser.newContext({ viewport: { width: w * 2 + 60, height: 400 }, colorScheme: 'dark' }), sp = await sctx.newPage();
  await sp.setContent('<body style="margin:0;background:#222;color:#eee;font:14px sans-serif"><div style="display:flex;gap:20px;padding:10px;align-items:flex-start"><div><div style="margin-bottom:6px">Mockup 22 v2 · ' + otsikko + ' · ' + w + '</div><img style="display:block;width:' + w + 'px" src="' + kuvaB64(mf) + '"></div><div><div style="margin-bottom:6px">Toteutus · ' + otsikko + ' · ' + w + '</div><img style="display:block;width:' + w + 'px" src="' + kuvaB64(tf) + '"></div></div></body>');
  await sp.waitForTimeout(200); await sp.screenshot({ path: path.join(UT, 'vertailu_' + tnimi + '_' + w + '.png'), fullPage: true }); await sctx.close();
  fs.unlinkSync(mf); fs.unlinkSync(tf); console.log('→', tnimi, w);
}
await browser.close();
if (virheet.length) { console.error('VIRHEET:\n' + virheet.join('\n')); process.exit(1); }
