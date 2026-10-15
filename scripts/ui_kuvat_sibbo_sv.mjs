#!/usr/bin/env node
/* Sibbo-valmius: kuvakaappaukset ruotsinkielisessä tilassa (localStorage.tm_kieli='sv') → docs/ui-kuvat/sibbo-sv/ (WebP) + jaanteet.json / index.md.
   Sovellusten OMALLA DEMO-DATALLA (demoKirjaudu / loginDemo / demoMode) — ei Firebasea, ei oikeita alaikäisiä. Leveydet 390 ja 1280; tumma + vaalea teema siellä missä sivu tukee vaaleaa.
   Jokaisesta kuvasta kerätään näkyvät tekstit ja tunnistetaan suomenkieliset jäänteet (tools/i18n/sv_lapiajo_fi.mjs, allowlist tools/i18n/sv_lapiajo_sallitut.json) → jaanteet.json + index.md.
   Käyttö:  node scripts/ui_kuvat_sibbo_sv.mjs [--ulos hakemisto] [--vain id]      Chromium: $PW_CHROMIUM tai macOS Google Chrome / /opt/pw-browsers. */
import { chromium } from 'playwright-core';
import fs from 'fs'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
import { onkoSuomea } from '../tools/i18n/sv_lapiajo_fi.mjs';
const JUURI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const UT = path.resolve(arg('ulos', path.join(JUURI, 'docs/ui-kuvat/sibbo-sv'))), VAIN = arg('vain', null);
const SALLITUT = JSON.parse(fs.readFileSync(path.join(JUURI, 'tools/i18n/sv_lapiajo_sallitut.json'), 'utf8'));
const avain = (s) => String(s).replace(/\s+/g, ' ').trim().toLowerCase();
const sallittu = (t) => { const a = avain(t); return SALLITUT.tekstit.includes(a) || SALLITUT.alkavat.some((p) => a.startsWith(p.toLowerCase())) || !/[a-zåäö]{3}/i.test(t); };
const SULJE_TERVETULO = "typeof _suljeTervetulo === 'function' && _suljeTervetulo()";

/* Kuvattavat näkymät (brief 4). js = askeleet sisäänkäynnin jälkeen; Pelihavainto ja Suostumus eivät tarvitse sisäänkäyntiä. */
const KUVAT = [
  { id: '01-pelaaja-etusivu', sivu: 'TalentMaster_Pelaaja_v7.html', kysely: '?demo=1', entry: "demoKirjaudu('aleksi')", sisaan: SULJE_TERVETULO, js: ["tab('tanaan')"] },
  { id: '02-pelaaja-pelialy-kortti', sivu: 'TalentMaster_Pelaaja_v7.html', kysely: '?demo=1', entry: "demoKirjaudu('aleksi')", sisaan: SULJE_TERVETULO, js: ["go('card')"] },
  { id: '03-huoltaja', sivu: 'TalentMaster_Vanhempi_v2.html', kysely: '?demo=1', entry: '0', js: ["setAge('u12'); go('koti')"] },
  { id: '04-suostumus', sivu: 'TalentMaster_Rekisterointi_Suostumus.html', kysely: '', entry: '0', js: [] },
  { id: '05-valmentaja-pelaajakortti', sivu: 'TalentMaster_Master_v16.html', kysely: '?demo=1', entry: 'loginDemo()', lokalisoi: "typeof masterLokalisoi === 'function' && masterLokalisoi()", vaalea: true, js: ["setWs('dev')", "(function(){var e=document.querySelector('[onclick*=\"renderDev(\"]');if(e)e.click();})()"] },
  { id: '06-pelihavainto-tyokalu', sivu: 'TalentMaster_Pelihavainto_Kentta.html', kysely: '', entry: '0', js: [] },
  { id: '07-harjoitusarviointi', sivu: 'TalentMaster_VP_v25.html', kysely: '?demo=1', entry: 'demoMode()', lokalisoi: "typeof vpLokalisoi === 'function' && vpLokalisoi()", vaalea: true,
    // demo-tila estää vpAvaaHarjoitusarvioinnin (vaatii auth + seuran) → avataan jaettu lomakekomponentti suoraan demo-kontekstilla (ei Firestorea, ei tallennusta)
    js: ["TM_HARJOITUS.avaa({ db: null, firebase: null, seuraId: 'demo', config: null, konteksti: { joukkue: 'U12', valmentaja: 'Demo Valmentaja', valmentajaUid: 'demo' }, joukkueet: [{ id: 'u12', nimi: 'U12' }], valmentajat: [{ uid: 'demo', nimi: 'Demo Valmentaja', joukkue: 'U12' }] })"], vahvista: '#haModal' },
  { id: '08-vp-joukkuenakyma', sivu: 'TalentMaster_VP_v25.html', kysely: '?demo=1', entry: 'demoMode()', lokalisoi: "typeof vpLokalisoi === 'function' && vpLokalisoi()", vaalea: true, js: ["setWs('koti')"] },
];
const LEVEYDET = [390, 1280];

function chromiumPolku() {
  const k = [process.env.PW_CHROMIUM, process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].filter(Boolean);
  try { fs.readdirSync('/opt/pw-browsers').filter((x) => /^chromium/.test(x)).forEach((x) => k.unshift('/opt/pw-browsers/' + x + '/chrome-linux/chrome')); } catch (e) { /* ei */ }
  const l = k.find((x) => fs.existsSync(x)); if (!l) throw new Error('Chromiumia ei löytynyt: aseta PW_CHROMIUM'); return l;
}
const KERUU = () => {
  const DEV = '#sBar, .scene-bar, .locale-bar, #devChrome, #tmDemoPanel, [data-dev-chrome]';   // demo-tilan kehittäjätyökalut (sama rajaus kuin tools/i18n/sv_lapiajo.mjs)
  const nakyva = (el) => { if (!el || !el.getBoundingClientRect) return false; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none' && parseFloat(s.opacity || '1') > 0.01; };
  const ulos = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const p = n.parentElement; if (!p || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.tagName) || !nakyva(p) || p.closest(DEV)) continue; const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (t) ulos.push({ t, tyyppi: 'teksti' }); }
  for (const el of document.querySelectorAll('body *')) { if (!nakyva(el) || el.closest(DEV)) continue; for (const a of ['placeholder', 'title', 'aria-label', 'alt']) { const v = el.getAttribute(a); if (v && v.trim()) ulos.push({ t: v.replace(/\s+/g, ' ').trim(), tyyppi: a }); } }
  return ulos;
};
async function webp(pg, buf) {
  return Buffer.from(await pg.evaluate(async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0);
    const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.8)); return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(blob); }); }, buf.toString('base64')), 'base64');
}

fs.mkdirSync(UT, { recursive: true });
const selain = await chromium.launch({ headless: true, executablePath: chromiumPolku(), args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
const jaanteet = [], kuvat = [], virheet = [];
for (const k of KUVAT) {
  if (VAIN && k.id !== VAIN) continue;
  const tukeeVaaleaa = !!k.vaalea;   // vaalea teema vain VP:llä ja Masterilla (CLAUDE.md §5: Pelaaja/Vanhempi tumma)
  for (const teema of tukeeVaaleaa ? ['dark', 'light'] : ['dark']) for (const leveys of LEVEYDET) {
    const nimi = `${k.id}-${teema}-${leveys}`, ctx = await selain.newContext({ viewport: { width: leveys, height: leveys === 390 ? 844 : 900 }, deviceScaleFactor: 1 }), pg = await ctx.newPage();
    await pg.addInitScript((t) => { try { localStorage.setItem('tm_kieli', 'sv'); localStorage.setItem('tm_teema', t); localStorage.setItem('tm_theme', t); } catch (e) { /* ei LS */ } }, teema);
    await pg.addInitScript(() => { let a = 0x2f6e2b1; Math.random = function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
    try { await pg.clock.setFixedTime(new Date('2026-10-14T10:00:00+03:00')); } catch (e) { /* vanha playwright */ }
    pg.on('pageerror', () => { /* demo-datan ulkoiset kutsut */ });
    try {
      await pg.goto(pathToFileURL(path.join(JUURI, k.sivu)).href + k.kysely, { waitUntil: 'load', timeout: 45000 }); await pg.waitForTimeout(1200);
      if (k.entry !== '0') { await pg.evaluate(k.entry).catch((e) => virheet.push(nimi + ' entry: ' + e.message.slice(0, 80))); await pg.waitForTimeout(1500); }
      if (k.sisaan) await pg.evaluate(k.sisaan).catch(() => { /* ei */ });
      if (k.lokalisoi) await pg.evaluate(k.lokalisoi).catch(() => { /* ei */ });
      for (const js of k.js) { await pg.evaluate(js).catch((e) => virheet.push(nimi + ' askel: ' + e.message.slice(0, 80))); await pg.waitForTimeout(900); }
      if (k.lokalisoi) await pg.evaluate(k.lokalisoi).catch(() => { /* ei */ });
      await pg.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); }, teema); await pg.waitForTimeout(400);
      if (k.vahvista && !(await pg.$(k.vahvista))) virheet.push(nimi + ': odotettu elementti puuttuu (' + k.vahvista + ') — näkymä ei avautunut demo-datalla');
      const teksti = await pg.evaluate(KERUU), nahty = new Set(), jaanne = [];
      for (const x of teksti) { const id = x.tyyppi + '|' + x.t; if (nahty.has(id) || sallittu(x.t)) continue; nahty.add(id); if (onkoSuomea(x.t).fi) jaanne.push({ teksti: x.t.slice(0, 140), tyyppi: x.tyyppi }); }
      const png = await pg.screenshot({ fullPage: true }), tied = nimi + '.webp'; fs.writeFileSync(path.join(UT, tied), await webp(pg, png));
      kuvat.push({ id: k.id, teema, leveys, tiedosto: tied, tekstejaYht: nahty.size, suomea: jaanne.length }); jaanteet.push({ kuva: tied, sivu: k.sivu, jaanteet: jaanne });
      process.stderr.write(`${tied}: ${jaanne.length} suomenkielistä jäännettä\n`);
    } catch (e) { virheet.push(nimi + ': ' + e.message.slice(0, 120)); } finally { await ctx.close(); }
  }
}
await selain.close();
fs.writeFileSync(path.join(UT, 'jaanteet.json'), JSON.stringify({ luotu: '2026-10-15', kieli: 'sv', huom: 'Sovellusten oma demo-data; tunnistin on alaraja (puuttuva osuma ≠ ei suomea). Teema: tumma + vaalea siellä missä sivu tukee vaaleaa.', virheet, jaanteet }, null, 1) + '\n');
const L = ['# Sibbo sv -kuvat (demo-data)', '', 'Generoitu `node scripts/ui_kuvat_sibbo_sv.mjs`. Kieli sv, vain demo-data (ei oikeita alaikäisiä). Suomenkieliset jäänteet: `jaanteet.json`.', '', '| Kuva | Teema | Leveys | Suomenkielisiä jäänteitä |', '|---|---|---:|---:|'];
for (const x of kuvat) L.push(`| ![${x.id}](${x.tiedosto}) \`${x.tiedosto}\` | ${x.teema} | ${x.leveys} | ${x.suomea} |`);
if (virheet.length) L.push('', '## Virheet', ...virheet.map((v) => '- ' + v));
L.push('', '## Jäänteet kuvittain', ''); for (const j of jaanteet) if (j.jaanteet.length) { L.push('### ' + j.kuva); j.jaanteet.forEach((x) => L.push('- (' + x.tyyppi + ') ' + x.teksti)); L.push(''); }
fs.writeFileSync(path.join(UT, 'index.md'), L.join('\n') + '\n');
console.log(`kuvia ${kuvat.length}, virheitä ${virheet.length} → ${path.relative(JUURI, UT)}`); virheet.forEach((v) => console.log('  ! ' + v));
