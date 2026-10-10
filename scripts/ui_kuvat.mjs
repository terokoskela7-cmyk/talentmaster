#!/usr/bin/env node
/* D168 · LAATUPORTIN KUVAT: VP_v25:n Koti ja Tilanne × 4 fixture-tilaa × 390/1280 × tumma/vaalea = 32 kuvaa → docs/ui-kuvat/<haara>/ (+ index.md PR-kuvaukseen).
   Ajaa OIKEAN VP_v25-sivun (Playwright + Chromium) Kenttä-lipun kanssa ja syöttää fixture-datan (tests/fixtures/vp + tests/helpers/vp_fixture.cjs) — ei Firebasea, ei oikeaa dataa.
   Käyttö:  node scripts/ui_kuvat.mjs [--haara nimi] [--nakyma koti|tilanne] [--tila pilotti] [--leveys 390] [--teema dark]   (oletus: kaikki 32)
   Chromium: $PW_CHROMIUM, /opt/pw-browsers/chromium*, CI:n playwright-chromium tai macOS Google Chrome. */
import { chromium } from 'playwright-core';
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execSync } from 'child_process'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url), JUURI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = require(path.join(JUURI, 'tests/helpers/vp_fixture.cjs'));
/* Kuvat WebP-muotoon (laatu ~80; Chromiumin canvas.toBlob) — PNG:t olivat ~14 MB/PR. Vertailukuvat tehdään vain valitusta (muuttuneesta) näkymästä: --nakyma. */
/* Lisävalitsimet: --juuri <hakemisto> (VP ja libit tästä repokopiosta, esim. worktree origin/mainista = "ennen"-kuvat) · --vertaa <kuvahakemisto> (tekee vertailukuvat ennen|nyt) · tila 'esimerkki' = Kodin esimerkkiseura (D167) */
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const haara = (arg('haara') || (() => { try { return execSync('git rev-parse --abbrev-ref HEAD', { cwd: JUURI, encoding: 'utf8' }).trim(); } catch (e) { return 'paikallinen'; } })()).replace(/[^\w.-]+/g, '-');
const VP_JUURI = arg('juuri') ? path.resolve(arg('juuri')) : JUURI, TILAT_KAIKKI = F.TILAT.concat(['esimerkki']);
const NAKYMAT = arg('nakyma') ? [arg('nakyma')] : ['koti', 'tilanne'], TILAT = arg('tila') ? [arg('tila')] : TILAT_KAIKKI, LEVEYDET = arg('leveys') ? [+arg('leveys')] : [390, 1280], TEEMAT = arg('teema') ? [arg('teema')] : ['dark', 'light'];
const UT = arg('ulos') ? path.resolve(arg('ulos')) : path.join(JUURI, 'docs', 'ui-kuvat', haara), TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-kuvat-'));
fs.mkdirSync(UT, { recursive: true });
function chromiumPolku() {
  const k = [process.env.PW_CHROMIUM, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].filter(Boolean);
  try { fs.readdirSync('/opt/pw-browsers').filter((x) => /^chromium/.test(x)).forEach((x) => k.unshift('/opt/pw-browsers/' + x + '/chrome-linux/chrome')); } catch (e) { /* ei */ }
  const l = k.find((x) => fs.existsSync(x)); if (!l) throw new Error('Chromiumia ei löytynyt: aseta PW_CHROMIUM'); return l;
}
const vp = fs.readFileSync(path.join(VP_JUURI, 'TalentMaster_VP_v25.html'), 'utf8');
function sivu(d, nakyma, teema, demo) {
  const probe = '(function(){var out=function(x){var o=document.createElement("pre");o.id="probe-out";o.textContent=x;o.style.display="none";document.body.appendChild(o)};try{'
    + 'var D=' + JSON.stringify({ p: d.pelaajat, j: d.joukkueDocs, n: d.nimet, k: d.kalenteri, t: d.tapahtumat, e: d.toimenpiteet, ks: d.koosteet, en: d.ensin, idp: d.spec.idpN, vi: d.viestit }) + ';'
    + '_vpPulssiLataa=function(){return Promise.resolve({koosteet:D.ks,ensin:D.en})};'
    + '_seuraId="demo-fc";window._vpLiput={"demo-fc":{kentta:true}};_pelaajat=D.p;_vpJoukkueDocs=D.j;_joukkueNimet=D.n;_kalenteriTapahtumat=D.k;_tapahtumat=D.t;_toimenpiteet=D.e;_idpJono=new Array(D.idp).fill(1);'
    + 'document.documentElement.setAttribute("data-theme","' + teema + '");'
    + 'var pakota=function(){document.getElementById("sLogin").style.display="none";document.getElementById("sDash").style.display="block"};pakota();setInterval(function(){pakota();var n=document.getElementById("topbar-name");if(n)n.textContent="Demo VP";var a=document.getElementById("topbar-avatar");if(a)a.textContent="D";var s=document.getElementById("sbNimi");if(s)s.textContent="Demo VP";var c=document.getElementById("sbSeura");if(c)c.textContent="Demo FC"},150);'
    + 'document.getElementById("tbSeura").textContent="Demo FC";_uid="vp1";_valmentajat=[];_vpViestitLataa=async function(){};_vpViestit={rivit:D.vi,ladattu:Date.now(),virhe:false};' + (demo ? 'window._vpKotiDemo="demo-fc";' : '')
    + '_vpNaviAsenna();try{setWs("' + nakyma + '")}catch(e){};' + (nakyma === 'tilanne' ? '_vpTilanneKausi();' : '')
    + 'setTimeout(function(){var k=document.getElementById("ws-' + nakyma + '");var r=k.getBoundingClientRect();out(JSON.stringify({h:Math.ceil(Math.max(r.bottom+window.scrollY,window.innerWidth>800?760:0))+24,sw:document.documentElement.scrollWidth,iw:window.innerWidth}))},3500)}catch(e){out("VIRHE "+e.message)}})();';
  const j = vp.indexOf('<head>') + 6, i = vp.lastIndexOf('</body>');
  return vp.slice(0, j) + '<base href="file://' + VP_JUURI + '/">' + vp.slice(j, i) + '<script>' + probe + '</script>' + vp.slice(i);
}
const WEBP_Q = 0.8;
async function webp(pg, buf) { return Buffer.from((await pg.evaluate(async ([b64, q]) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0);
  const blob = await new Promise((r) => c.toBlob(r, 'image/webp', q)); return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(blob); }); }, [buf.toString('base64'), WEBP_Q])), 'base64'); }
const selain = await chromium.launch({ executablePath: chromiumPolku(), args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
const rivit = []; let n = 0; const muunnin = await (await selain.newContext()).newPage();
for (const tila of TILAT) { const demo = tila === 'esimerkki', d = F.lataa(demo ? 'pilotti' : tila, Date.now()); for (const nakyma of NAKYMAT) for (const leveys of LEVEYDET) for (const teema of TEEMAT) {
  if (demo && nakyma !== 'koti') continue;
  const src = path.join(TMP, `${nakyma}_${tila}_${leveys}_${teema}.html`); fs.writeFileSync(src, sivu(d, nakyma, teema, demo));
  const ctx = await selain.newContext({ viewport: { width: leveys, height: 1000 }, deviceScaleFactor: 1 }), sivuP = await ctx.newPage(); sivuP.on('pageerror', (e) => console.warn('  [pageerror]', e.message.slice(0, 120)));
  await sivuP.goto('file://' + src, { waitUntil: 'load' }); await sivuP.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 });
  const m = JSON.parse(await sivuP.evaluate(() => document.getElementById('probe-out').textContent)); if (m.sw > m.iw) console.warn('VAROITUS vaakavieritys', nakyma, tila, leveys, m);
  await sivuP.setViewportSize({ width: leveys, height: Math.min(m.h, 8000) }); await sivuP.waitForTimeout(300);
  const nimi = `${nakyma}_${tila}_${leveys}_${teema}.webp`; fs.writeFileSync(path.join(UT, nimi), await webp(muunnin, await sivuP.screenshot({ clip: { x: 0, y: 0, width: leveys, height: Math.min(m.h, 8000) } })));
  rivit.push({ nakyma, tila, leveys, teema, nimi, h: m.h, vaaka: m.sw > m.iw }); n++; await ctx.close(); } }
/* vertailukuvat: ennen (--vertaa hakemisto) | nyt */
const vertaa = arg('vertaa');
if (vertaa) { const vp2 = path.join(UT, 'vertailu'); fs.mkdirSync(vp2, { recursive: true });
  for (const r of rivit) { const ennen = [r.nimi, r.nimi.replace(/\.webp$/, '.png')].map((x) => path.join(path.resolve(vertaa), x)).find((x) => fs.existsSync(x)); if (!ennen) continue;
    const html = '<!doctype html><meta charset=utf-8><style>body{margin:0;background:#777;font:600 14px/1 system-ui;color:#fff}.r{display:flex;gap:16px;align-items:flex-start;padding:12px}.c{display:grid;gap:6px}img{display:block;max-width:none}</style><div class=r><div class=c>ennen<img src="file://' + ennen + '"></div><div class=c>nyt<img src="file://' + path.join(UT, r.nimi) + '"></div></div>';
    const tmp = path.join(TMP, 'v_' + r.nimi + '.html'); fs.writeFileSync(tmp, html);
    const c = await selain.newContext({ viewport: { width: r.leveys * 2 + 60, height: 900 } }), pg = await c.newPage(); await pg.goto('file://' + tmp); await pg.waitForLoadState('load'); fs.writeFileSync(path.join(vp2, r.nimi), await webp(muunnin, await pg.screenshot({ fullPage: true }))); await c.close(); } }
await selain.close();
const md = ['# UI-kuvat · ' + haara, '', 'Luotu: `node scripts/ui_kuvat.mjs` (' + n + ' kuvaa). Fixture-tilat: tests/fixtures/vp. Oikea VP_v25, Kenttä-lippu päällä, keksitty data.', ''];
for (const nakyma of NAKYMAT) { md.push('## ' + nakyma, '', '| tila | 390 tumma | 390 vaalea | 1280 tumma | 1280 vaalea |', '|---|---|---|---|---|'); for (const tila of TILAT) md.push('| ' + tila + ' | ' + [[390, 'dark'], [390, 'light'], [1280, 'dark'], [1280, 'light']].map(([l, t]) => { const r = rivit.find((x) => x.nakyma === nakyma && x.tila === tila && x.leveys === l && x.teema === t); return r ? `[${r.nimi}](${r.nimi})${r.vaaka ? ' ⚠ vaakavieritys' : ''}` : '—'; }).join(' | ') + ' |'); md.push(''); }
fs.writeFileSync(path.join(UT, 'index.md'), md.join('\n')); console.log(n + ' kuvaa →', UT);
