#!/usr/bin/env node
/* K35-2 · Masterin kalenterin kuvat (FC Demo, keksityt tapahtumat): viikkonäkymä + luontimodaali × 390/1280 × tumma/vaalea → docs/ui-kuvat/<haara>/. Ajaa OIKEAN Master_v16-sivun (Playwright + Chrome), syöttää fixture-tapahtumat (ei Firebasea, ei oikeaa dataa).
   Käyttö: node scripts/ui_kuvat_kalenteri.mjs [--haara nimi] [--juuri hakemisto (repokopio "ennen"-kuviin)] */
import { chromium } from 'playwright-core';
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execSync } from 'child_process'; import { fileURLToPath } from 'url';
const JUURI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const haara = (arg('haara') || (() => { try { return execSync('git rev-parse --abbrev-ref HEAD', { cwd: JUURI, encoding: 'utf8' }).trim(); } catch (e) { return 'paikallinen'; } })()).replace(/[^\w.-]+/g, '-');
const SJ = arg('juuri') ? path.resolve(arg('juuri')) : JUURI, UT = path.join(JUURI, 'docs', 'ui-kuvat', haara); fs.mkdirSync(UT, { recursive: true });
const POLKU = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome', process.env.PW_CHROMIUM].filter(Boolean).find((x) => fs.existsSync(x));
const NYT = Date.UTC(2026, 9, 14, 9, 0);   // ke 14.10.2026 (syysloma-viikko 12.–18.10.)
const AL = Date.UTC(2026, 9, 11, 21, 0), LO = Date.UTC(2026, 9, 18, 20, 59);   // 12.10. 00:00 – 18.10. 23:59 Helsinki
const TAP = [
  { id: 'a', tyyppi: 'harjoitus', nimi: 'Harjoitus', pvm: '2026-10-13', alkaa: '17:00', paattyy: '18:30', joukkue: 'Demo U13', joukkue_nimi: 'Demo U13', paikka: 'Kenttä 2' },
  { id: 'b', tyyppi: 'harjoitus', nimi: 'Harjoitus', pvm: '2026-10-15', alkaa: '09:00', paattyy: '10:00', joukkue: 'Demo U13', joukkue_nimi: 'Demo U13', paikka: 'Halli' },
  { id: 'c', tyyppi: 'ottelu', nimi: 'Ottelu', vastustaja: 'Demo Juniorit', pvm: '2026-10-17', alkaa: '21:00', paattyy: '22:30', joukkue: 'Demo U13', joukkue_nimi: 'Demo U13', paikka: 'Stadion' },
  { id: 'd', tyyppi: 'valmentajapalaveri', nimi: 'Valmentajapalaveri', pvm: '2026-10-14', alkaa: '19:30', paattyy: '20:30', joukkue: 'Demo U13', joukkue_nimi: 'Demo U13' },
  { id: 'k', tyyppi: 'seuran_tauko', nimi: 'Syysloma', koko_paiva: true, pvm: '2026-10-12', alkaa: '00:00', paattyy: '23:59', _alkaaMs: AL, _paattyyMs: LO }
];
const pakkaa = (html, probe) => { const j = html.indexOf('<head>') + 6, i = html.lastIndexOf('</body>'); return html.slice(0, j) + '<base href="file://' + SJ + '/">' + html.slice(j, i) + '<script>' + probe + '</script>' + html.slice(i); };
const kello = 'var __N=' + NYT + ',__D=Date;Date=class extends __D{constructor(...a){super(...(a.length?a:[__N]))}static now(){return __N}};';
const probe = (teema, modaali, rooli) => kello + '(function(){var out=function(x){var o=document.createElement("pre");o.id="probe-out";o.textContent=x;o.style.display="none";document.body.appendChild(o)};try{var T=' + JSON.stringify(TAP) + ';'
  + 'document.documentElement.setAttribute("data-theme","' + teema + '");_seuraId="x";_demo=false;_rooli="' + rooli + '";_uid="u1";_superAdmin=false;_joukkue="Demo U13";_testitapahtumat=[];_kalenteriTapahtumat=T;'
  + 'var pakota=function(){document.getElementById("sLogin").classList.add("hidden");document.getElementById("sDash").classList.remove("hidden")};pakota();setInterval(function(){pakota();_kalenteriTapahtumat=T},150);'
  + 'setWs("cal");renderCal();' + (modaali ? 'try{_saaMerkitaLasnaolo=function(){return true};_avaaUusiTapahtuma("2026-10-08","17:00")}catch(e){out("VIRHE "+e.message)}' : '')
  + 'setTimeout(function(){out("ok")},1800)}catch(e){out("VIRHE "+e.message)}})();';
const selain = await chromium.launch({ executablePath: POLKU, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }), rivit = [];
const html = fs.readFileSync(path.join(SJ, 'TalentMaster_Master_v16.html'), 'utf8');
for (const leveys of [390, 1280]) for (const teema of ['dark', 'light']) for (const [nimi, modaali, rooli] of [['kalenteri_valmentaja', false, 'valmentaja'], ['kalenteri_vp_uusi', true, 'vp']]) {
  const n = `${nimi}_${leveys}_${teema}`, src = path.join(os.tmpdir(), n + '.html'); fs.writeFileSync(src, pakkaa(html, probe(teema, modaali, rooli)));
  const ctx = await selain.newContext({ viewport: { width: leveys, height: modaali ? 1100 : (leveys < 600 ? 1100 : 900) }, deviceScaleFactor: 1 }), p = await ctx.newPage(); const virheet = [];
  p.on('pageerror', (e) => { if (!/cancelled|firebase|Firebase/i.test(e.message)) virheet.push(e.message.slice(0, 120)); });
  await p.goto('file://' + src, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 }); await p.waitForTimeout(500);
  const m = await p.evaluate(() => document.getElementById('probe-out').textContent); if (/^VIRHE/.test(m)) console.warn(n, m);
  await p.screenshot({ path: path.join(UT, n + '.png') }); rivit.push(n + (virheet.length ? '  [sivuvirheet: ' + virheet.join(' | ') + ']' : '')); await ctx.close();
}
await selain.close(); console.log(rivit.length + ' kuvaa → ' + UT); rivit.forEach((r) => console.log(' ', r));
