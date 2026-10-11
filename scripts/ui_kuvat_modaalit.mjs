#!/usr/bin/env node
/* K35-2b · Masterin tapahtumamodaalien kuvat: Uusi tapahtuma (toisto "Viikoittain" valittuna = pisin tila) ja Muokkaa tapahtumaa × 390×700 / 1280×720 × tumma/vaalea → docs/ui-kuvat/<haara>/ (näkymän koko = ruutu, jotta leikkautuminen näkyy).
   Käyttö: node scripts/ui_kuvat_modaalit.mjs [--haara nimi] [--juuri hakemisto (repokopio "ennen"-kuviin)] */
import { chromium } from 'playwright-core';
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execSync } from 'child_process'; import { fileURLToPath } from 'url';
const JUURI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const haara = (arg('haara') || (() => { try { return execSync('git rev-parse --abbrev-ref HEAD', { cwd: JUURI, encoding: 'utf8' }).trim(); } catch (e) { return 'paikallinen'; } })()).replace(/[^\w.-]+/g, '-');
const SJ = arg('juuri') ? path.resolve(arg('juuri')) : JUURI, UT = path.join(JUURI, 'docs', 'ui-kuvat', haara); fs.mkdirSync(UT, { recursive: true });
const POLKU = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome', process.env.PW_CHROMIUM].filter(Boolean).find((x) => fs.existsSync(x));
const kello = 'var __N=' + Date.UTC(2026, 9, 14, 9, 0) + ',__D=Date;Date=class extends __D{constructor(...a){super(...(a.length?a:[__N]))}static now(){return __N}};';
const probe = (teema, kutsu) => kello + '(function(){var out=function(x){var o=document.createElement("pre");o.id="probe-out";o.textContent=x;o.style.display="none";document.body.appendChild(o)};try{'
  + 'document.documentElement.setAttribute("data-theme","' + teema + '");_seuraId="x";_demo=false;_rooli="vp";_uid="u1";_superAdmin=true;_joukkue="Demo U13";_testitapahtumat=[];_kalenteriTapahtumat=[];'
  + 'var pakota=function(){document.getElementById("sLogin").classList.add("hidden");document.getElementById("sDash").classList.remove("hidden")};pakota();setInterval(pakota,150);setWs("cal");'
  + 'setTimeout(function(){try{_saaMerkitaLasnaolo=function(){return true};' + kutsu + '}catch(e){out("VIRHE "+e.message);return}out("ok")},800)}catch(e){out("VIRHE "+e.message)}})();';
const KUTSUT = { uusi_viikoittain: '_avaaUusiTapahtuma("2026-10-14","17:00")', muokkaus: '_calMuokkaaTapahtuma({id:"e1",tyyppi:"harjoitus",nimi:"Harjoitus",pvm:"2026-10-14",alkaa:"17:00",paattyy:"18:30",paikka:"Kenttä 2",lahde:"manuaalinen",luoja_uid:"u1"})' };
const html = fs.readFileSync(path.join(SJ, 'TalentMaster_Master_v16.html'), 'utf8'), j = html.indexOf('<head>') + 6, i = html.lastIndexOf('</body>');
const selain = await chromium.launch({ executablePath: POLKU, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }), rivit = [];
for (const [leveys, korkeus] of [[390, 700], [1280, 720]]) for (const teema of ['dark', 'light']) for (const [nimi, kutsu] of Object.entries(KUTSUT)) {
  const n = `modaali_${nimi}_${leveys}_${teema}`, src = path.join(os.tmpdir(), n + '.html');
  fs.writeFileSync(src, html.slice(0, j) + '<base href="file://' + SJ + '/">' + html.slice(j, i) + '<script>' + probe(teema, kutsu) + '</script>' + html.slice(i));
  const ctx = await selain.newContext({ viewport: { width: leveys, height: korkeus } }), p = await ctx.newPage();
  await p.goto('file://' + src, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 });
  if (nimi === 'uusi_viikoittain') { try { await p.locator('#uusiTapahtumaModal >> text=Viikoittain').first().click({ timeout: 3000 }); } catch (e) { rivit.push(n + ' [Viikoittain-klikkaus epäonnistui]'); } }
  await p.waitForTimeout(300); await p.screenshot({ path: path.join(UT, n + '.png') }); rivit.push(n); await ctx.close();
}
await selain.close(); console.log(rivit.length + ' kuvaa → ' + UT); rivit.forEach((r) => console.log(' ', r));
