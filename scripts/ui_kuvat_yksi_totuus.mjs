#!/usr/bin/env node
/* "Yksi totuus näkymissä" -laatuportin kuvat: Master (Kausi: D1/D2-kortit + D2-ponnahdus + banneri/kattavuus) ja VP (joukkuekortit + joukkuesyvänäkymä) × kaksi fixturea
   (KPV-tyyppinen P13 + P12, SJK P15 -tyyppinen) × 390/1280 × tumma/vaalea → docs/ui-kuvat/<haara>/. Ajaa OIKEAT sivut (Playwright + Chrome), syöttää anonymisoidun fixturen (tests/helpers/yksi_totuus_fixture.cjs); ei Firebasea eikä oikeaa dataa.
   Käyttö: node scripts/ui_kuvat_yksi_totuus.mjs [--haara nimi] [--juuri hakemisto] (juuri = repokopio "ennen"-kuviin, esim. worktree origin/mainista) */
import { chromium } from 'playwright-core';
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execSync } from 'child_process'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url), JUURI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = require(path.join(JUURI, 'tests/helpers/yksi_totuus_fixture.cjs'));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const haara = (arg('haara') || (() => { try { return execSync('git rev-parse --abbrev-ref HEAD', { cwd: JUURI, encoding: 'utf8' }).trim(); } catch (e) { return 'paikallinen'; } })()).replace(/[^\w.-]+/g, '-');
const SIVU_JUURI = arg('juuri') ? path.resolve(arg('juuri')) : JUURI, UT = path.join(JUURI, 'docs', 'ui-kuvat', haara), TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-kuvat-'));
fs.mkdirSync(UT, { recursive: true });
const POLKU = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome', process.env.PW_CHROMIUM].filter(Boolean).find((x) => fs.existsSync(x));
const sivut = { master: fs.readFileSync(path.join(SIVU_JUURI, 'TalentMaster_Master_v16.html'), 'utf8'), vp: fs.readFileSync(path.join(SIVU_JUURI, 'TalentMaster_VP_v25.html'), 'utf8') };
const FIX = { kpv13: { P: F.p13(), kuvaus: 'KPV P13 -tyyppinen (16: 4 tuoretta / 8 vanhaa / 4 ei dataa)' }, kpv12: { P: F.p12(), kuvaus: 'KPV P12 -tyyppinen (14: 9 tuoretta / 5 vanhaa)' }, sjk: { P: F.sjkP15(), kuvaus: 'SJK P15 -tyyppinen (20)' } };
const pakkaa = (html, probe) => { const j = html.indexOf('<head>') + 6, i = html.lastIndexOf('</body>'); return html.slice(0, j) + '<base href="file://' + SIVU_JUURI + '/">' + html.slice(j, i) + '<script>' + probe + '</script>' + html.slice(i); };
const NYT = F.NYT;
const kello = 'var __N=' + NYT + ',__D=Date;Date=class extends __D{constructor(...a){super(...(a.length?a:[__N]))}static now(){return __N}};';   // kiinteä "nyt" (fixturen päivät suhteessa siihen)
function probeMaster(P, teema, popup) {
  return kello + '(function(){var out=function(x){var o=document.createElement("pre");o.id="probe-out";o.textContent=x;o.style.display="none";document.body.appendChild(o)};try{var P=' + JSON.stringify(P) + ';'
    + 'document.documentElement.setAttribute("data-theme","' + teema + '");_seuraId="x";_demo=false;_pelaajatData=P;'
    + 'var pakota=function(){document.getElementById("sLogin").classList.add("hidden");document.getElementById("sDash").classList.remove("hidden")};pakota();setInterval(function(){pakota();_pelaajatData=P},150);'
    + 'setWs("season");renderSeason();' + (popup ? '_avaaKausiPelaajat("' + popup + '");' : '')
    + 'setTimeout(function(){var k=document.querySelector(".ws-view[data-view=season]");var r=k.getBoundingClientRect();out(JSON.stringify({h:Math.ceil(r.bottom+window.scrollY)+24,sw:document.documentElement.scrollWidth,iw:window.innerWidth}))},2500)}catch(e){out("VIRHE "+e.message)}})();';
}
function probeVp(P, teema, avaa) {
  return kello + '(function(){var out=function(x){var o=document.createElement("pre");o.id="probe-out";o.textContent=x;o.style.display="none";document.body.appendChild(o)};try{var P=' + JSON.stringify(P) + ',J=' + JSON.stringify(F.jk) + ';'
    + 'document.documentElement.setAttribute("data-theme","' + teema + '");_seuraId="demo-fc";window._vpLiput={"demo-fc":{kentta:false}};_pelaajat=P;_vpJoukkueDocs=J;_joukkueNimet={};J.forEach(function(j){_joukkueNimet[j.id]=j.nimi});'
    + 'var pakota=function(){document.getElementById("sLogin").style.display="none";document.getElementById("sDash").style.display="block"};pakota();setInterval(function(){pakota();_pelaajat=P},150);'
    + '_uid="vp1";_valmentajat=[];try{_vpNaviAsenna()}catch(e){}'
    + 'setWs("tilanne");renderTeamPulse();' + (avaa === 'syva' ? 'avaaJoukkueSyvanakyma(J.filter(function(j){return P.some(function(p){return p.joukkueet&&p.joukkueet[0]===j.id})})[0].nimi);' : '')
    + 'setTimeout(function(){out(JSON.stringify({sw:document.documentElement.scrollWidth,iw:window.innerWidth,h:document.documentElement.scrollHeight}))},2500)}catch(e){out("VIRHE "+e.message)}})();';
}
const selain = await chromium.launch({ executablePath: POLKU, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
const rivit = [];
async function kuva(nimi, html, leveys, valinta) {
  const src = path.join(TMP, nimi + '.html'); fs.writeFileSync(src, html);
  const ctx = await selain.newContext({ viewport: { width: leveys, height: leveys < 600 ? 844 : 900 }, deviceScaleFactor: 1 }), p = await ctx.newPage(); const virheet = [];
  p.on('pageerror', (e) => { if (!/cancelled|firebase|Firebase/i.test(e.message)) virheet.push(e.message.slice(0, 140)); });
  await p.goto('file://' + src, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 }); await p.waitForTimeout(600);
  const m = await p.evaluate(() => document.getElementById('probe-out').textContent); if (/^VIRHE/.test(m)) console.warn(nimi, m);
  const o = /^\{/.test(m) ? JSON.parse(m) : {}; if (o.sw > o.iw) console.warn('VAROITUS vaakavieritys', nimi, o.sw, '>', o.iw);
  const t = path.join(UT, nimi + '.png');
  if (valinta.elementti) { const e = await p.$(valinta.elementti); await e.scrollIntoViewIfNeeded(); await e.screenshot({ path: t }); } else await p.screenshot({ path: t, fullPage: !valinta.modaali });
  rivit.push(nimi + (virheet.length ? '  [sivuvirheet: ' + virheet.join(' | ') + ']' : '')); await ctx.close();
}
for (const [fx, d] of Object.entries(FIX)) for (const leveys of [390, 1280]) for (const teema of ['dark', 'light']) {
  if (fx === 'kpv12' && leveys === 390) continue;   // P12: vain leveä (sama rakenne kuin P13:lla)
  await kuva(`master_kausi_${fx}_${leveys}_${teema}`, pakkaa(sivut.master, probeMaster(d.P, teema, null)), leveys, {});
  if (fx !== 'kpv12') await kuva(`master_popup_d2_${fx}_${leveys}_${teema}`, pakkaa(sivut.master, probeMaster(d.P, teema, 'd2')), leveys, { modaali: true });
  if (fx === 'sjk') await kuva(`master_popup_d1_${fx}_${leveys}_${teema}`, pakkaa(sivut.master, probeMaster(d.P, teema, 'd1')), leveys, { modaali: true });
  await kuva(`vp_joukkuekortit_${fx}_${leveys}_${teema}`, pakkaa(sivut.vp, probeVp(d.P, teema, 'joukkueet')), leveys, { elementti: '#joukkuekortit' });
  if (fx === 'kpv13') await kuva(`vp_syvanakyma_${fx}_${leveys}_${teema}`, pakkaa(sivut.vp, probeVp(d.P, teema, 'syva')), leveys, { modaali: true });
}
await selain.close();
console.log(rivit.length + ' kuvaa → ' + UT); rivit.forEach((r) => console.log(' ', r));
