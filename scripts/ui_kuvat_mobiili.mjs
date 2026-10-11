#!/usr/bin/env node
/* Masterin mobiiliasettelu: Kalenteri-työtila 390 px tumma/vaalea → docs/ui-kuvat/<haara>/. Käyttö: node scripts/ui_kuvat_mobiili.mjs [--haara nimi] [--juuri repokopio ("ennen")] */
import { chromium } from 'playwright-core'; import fs from 'fs'; import os from 'os'; import path from 'path'; import { execSync } from 'child_process'; import { fileURLToPath } from 'url';
const JUURI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const haara = (arg('haara') || execSync('git rev-parse --abbrev-ref HEAD', { cwd: JUURI, encoding: 'utf8' }).trim()).replace(/[^\w.-]+/g, '-'), SJ = arg('juuri') ? path.resolve(arg('juuri')) : JUURI, UT = path.join(JUURI, 'docs', 'ui-kuvat', haara); fs.mkdirSync(UT, { recursive: true });
const POLKU = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome'].find((x) => fs.existsSync(x)), html = fs.readFileSync(path.join(SJ, 'TalentMaster_Master_v16.html'), 'utf8'), j = html.indexOf('<head>') + 6, i = html.lastIndexOf('</body>');
const b = await chromium.launch({ executablePath: POLKU, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
for (const teema of ['dark', 'light']) {
  const probe = '(function(){document.documentElement.setAttribute("data-theme","' + teema + '");_seuraId="x";_demo=false;_rooli="vp";_uid="u1";_joukkue="Demo U13";var pakota=function(){document.getElementById("sLogin").classList.add("hidden");document.getElementById("sDash").classList.remove("hidden")};pakota();setInterval(pakota,150);setTimeout(function(){try{setWs("cal");renderCal()}catch(e){}var o=document.createElement("pre");o.id="probe-out";o.style.display="none";document.body.appendChild(o)},800)})();';
  const src = path.join(os.tmpdir(), 'mobk_' + teema + '.html'); fs.writeFileSync(src, html.slice(0, j) + '<base href="file://' + SJ + '/">' + html.slice(j, i) + '<script>' + probe + '</script>' + html.slice(i));
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await p.goto('file://' + src); await p.waitForSelector('#probe-out', { state: 'attached' }); await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(UT, 'kalenteri_390_' + teema + '.png') });
}
await b.close(); console.log('kuvat → ' + UT);
