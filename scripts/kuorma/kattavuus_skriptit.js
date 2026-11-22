#!/usr/bin/env node
'use strict';
/* kattavuus_skriptit.js — KYLMA_AVAUS_DIAGNOOSI §9/§16: oikea (kirjautunut valmentaja) funktiokattavuus avauksessa → mitkä omat skriptit (lib/, docs/, juuri) eivät kutsuttu lainkaan → laiskaksi siirrettävien lista erissä.
 * Vain LISTA — ei muuta sivua. Ajo (Tero, `! `): STAGING_APPCHECK_DEBUG_TOKEN=<token> node scripts/kuorma/kattavuus_skriptit.js --url=https://talentmaster-staging--<kanava>.web.app [--seura=1] [--profiili=puhelin|tyopoyta] [--sivu=master] [--rooli=valmentaja1] [--era=lib/a.js,lib/b.js] [--lisaodotus=3000] [--era-kt=100] [--ulos=mittaus_tulokset/kattavuus_<aika>]
 * Käyttää mittaa_sivut.js:n kirjautumista/profiileja/URL-vartijaa (vain staging) ja mittaaAvaus:ta (lopetus vasta kun lataukset valmiit + rauhoittunut), + page.coverage (V8 precise coverage, block-taso).
 * Luokitus per skripti: EI_KUTSUTTU = yksikään funktio (ml. nimetön) skriptin ylätason jälkeen ei ajettu (vain ylätason määrittelyt); VAHAN = kutsuttu mutta < 10 % tavuista ajettu; KAYTOSSA = muut.
 * HUOM (tulkinta): EI_KUTSUTTU ≠ turvallisesti siirrettävissä. Ylätason sivuvaikutus (rekisteröinti, kuuntelijat, window-asetus jota muut lukevat latauksessa) ajettiin silti → `ylataso_pct` ja `nimet` auttavat arvioimaan; jokainen erä tarvitsee typeof-vartion/ReferenceError-itseparannuksen (tmLaiska) ja oman A/B:n. */
const fs = require('fs'), path = require('path');
const M = require('./mittaus_lib.js');

/** V8-kattavuus (Playwright `entry.functions`: [{ functionName, ranges: [{ startOffset, endOffset, count }] }]) → { kaytetty_pct, kutsuttuja, funktioita, ylataso_pct }.
 *  Tavut maalataan ulkoa sisään (alku ↑, loppu ↓): sisempi alue ylikirjoittaa → count 0 sisällä ajettua aluetta = ei ajettu. Ylätaso = funktio, jonka ensimmäinen alue kattaa koko skriptin. */
function analysoiSkripti(lahde, funktiot) {
  const n = lahde.length, kat = new Uint8Array(n); let ylataso = null, kutsuttuja = 0, funktioita = 0;
  const alueet = [];
  (funktiot || []).forEach((f) => {
    const r = f.ranges || []; if (!r.length) return;
    const koko = r[0].startOffset <= 0 && r[0].endOffset >= n - 1, kaare = !koko && (r[0].endOffset - r[0].startOffset) >= 0.8 * n;   // IIFE/UMD-kääre (≥ 80 % skriptistä) ajetaan aina latauksessa → ei "kutsu" (22.11.: kutsuttuja = 1 oli lähes aina pelkkä kääre)
    if (koko && !ylataso) ylataso = f; else if (kaare) { /* kääre: ei lasketa funktioksi eikä kutsuksi */ } else { funktioita++; if (r[0].count > 0) kutsuttuja++; }
    r.forEach((a) => alueet.push(a));
  });
  alueet.sort((a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset);
  alueet.forEach((a) => { kat.fill(a.count > 0 ? 1 : 0, Math.max(0, a.startOffset), Math.min(n, a.endOffset)); });
  let kaytetty = 0; for (let i = 0; i < n; i++) kaytetty += kat[i];
  // ylätason oma suoritus = ajetut tavut, jotka eivät kuulu mihinkään sisäfunktioon: lasketaan maalaamalla vain ylätason alueet ja nollaamalla sisäfunktioiden alueet
  let yl = 0;
  if (ylataso) { const k2 = new Uint8Array(n); ylataso.ranges.forEach((a) => k2.fill(a.count > 0 ? 1 : 0, Math.max(0, a.startOffset), Math.min(n, a.endOffset)));
    (funktiot || []).forEach((f) => { if (f !== ylataso && f.ranges && f.ranges.length) { const a = f.ranges[0]; k2.fill(0, Math.max(0, a.startOffset), Math.min(n, a.endOffset)); } });
    for (let i = 0; i < n; i++) yl += k2[i]; }
  const nimet = (funktiot || []).filter((f) => f !== ylataso && f.functionName && f.ranges && f.ranges[0] && f.ranges[0].count > 0 && (f.ranges[0].endOffset - f.ranges[0].startOffset) < 0.8 * n).map((f) => f.functionName + (f.ranges[0].count > 1 ? '×' + f.ranges[0].count : '')).slice(0, 12);
  return { kutsutut_nimet: nimet, tavut: n, kaytetty_pct: n ? +(100 * kaytetty / n).toFixed(1) : 0, kutsuttuja, funktioita, ylataso_pct: n ? +(100 * yl / n).toFixed(1) : 0 };
}

const NIMET_RE = /(?:^|[\n;])\s*(?:window|self)\.(\w+)\s*=|(?:^|\n)\s*function\s+(\w+)\s*\(|(?:^|\n)(?:var|let|const)\s+(\w+)\s*=/g;
function ylatasonNimet(lahde, max) {
  const s = new Set(); let m; NIMET_RE.lastIndex = 0;
  while ((m = NIMET_RE.exec(lahde)) && s.size < (max || 6)) s.add(m[1] || m[2] || m[3]);
  return Array.from(s);
}

const OMA_POLKU = /^https:\/\/[^/]+\.web\.app\/((?:lib\/|docs\/)?[^/?#]+\.js)$/;
/** coverage = [{ url, source, functions }], resurssit = resurssiLista() → rivit (vain oman hostin .js), järjestetty siirtohyödyn mukaan (EI_KUTSUTTU, koodattu laskeva). */
function analysoi(coverage, resurssit) {
  const koodattu = {}; (resurssit || []).forEach((r) => { if (r.tyyppi === 'Script' && r.url) koodattu[r.url] = Math.max(koodattu[r.url] || 0, r.koodattu || 0); });
  const rivit = [];
  (coverage || []).forEach((e) => {
    const m = OMA_POLKU.exec(String(e.url || '').split('?')[0]); if (!m) return;
    const a = analysoiSkripti(e.source || '', e.functions), gz = koodattu[String(e.url).split('?')[0]] || 0;
    const luokka = a.kutsuttuja === 0 ? 'EI_KUTSUTTU' : (a.kaytetty_pct < 10 ? 'VAHAN' : 'KAYTOSSA');
    rivit.push(Object.assign({ skripti: m[1], luokka, koodattu_kt: +(gz / 1024).toFixed(1), nimet: ylatasonNimet(e.source || '') }, a));
  });
  const jarj = { EI_KUTSUTTU: 0, VAHAN: 1, KAYTOSSA: 2 };
  return rivit.sort((x, y) => jarj[x.luokka] - jarj[y.luokka] || y.koodattu_kt - x.koodattu_kt);
}

/** EI_KUTSUTTU-skriptit erinä (iso ensin): erä täyttyy kun summa ≥ eraKt. Ylätason sivuvaikutus (ylataso_pct) mukana → pienin riski ensin saman koon sisällä ei erotella; PM päättää. */
function eraehdotus(rivit, eraKt) {
  const era = [], kohde = eraKt || 100; let nyt = null;
  rivit.filter((r) => r.luokka === 'EI_KUTSUTTU').forEach((r) => { if (!nyt || nyt.kt >= kohde) { nyt = { era: era.length + 1, kt: 0, skriptit: [] }; era.push(nyt); } nyt.kt = +(nyt.kt + r.koodattu_kt).toFixed(1); nyt.skriptit.push(r.skripti); });
  return era;
}


/** Erätarkistus: lista skriptejä (esim. laiskaksi siirretty erä). Ei riviä = ei ladattu avauksessa (OK); rivi luokassa EI_KUTSUTTU = ladattu mutta ei käytetty (ei laiska vielä); KAYTOSSA/VAHAN = ✗ (ei saa siirtää / ei saa latautua). */
function eratarkistus(rivit, era) {
  return (era || []).map((n) => { const r = rivit.find((x) => x.skripti === n); return { skripti: n, tila: !r ? 'EI_LADATTU' : r.luokka, ok: !r || r.luokka === 'EI_KUTSUTTU' ? (!r ? true : null) : false }; });
}

function raporttiTeksti(rivit, era, meta) {
  const sum = (l) => rivit.filter((r) => r.luokka === l).reduce((a, r) => a + r.koodattu_kt, 0), n = (l) => rivit.filter((r) => r.luokka === l).length;
  const ul = ['KATTAVUUS · ' + meta.isanta + ' · ' + meta.sivu + ' · ' + meta.profiili + ' · seura ' + meta.seura + ' · ' + rivit.length + ' omaa skriptiä',
    '  EI_KUTSUTTU ' + n('EI_KUTSUTTU') + ' kpl / ' + sum('EI_KUTSUTTU').toFixed(0) + ' kt gz · VAHAN ' + n('VAHAN') + ' kpl / ' + sum('VAHAN').toFixed(0) + ' kt · KAYTOSSA ' + n('KAYTOSSA') + ' kpl / ' + sum('KAYTOSSA').toFixed(0) + ' kt', '',
    '  luokka        gz kt  käytetty%  ylätaso%  funkt(kutsutt/yht)  skripti  [ylätason nimet]'];
  rivit.forEach((r) => ul.push('  ' + r.luokka.padEnd(12) + String(r.koodattu_kt).padStart(7) + String(r.kaytetty_pct).padStart(10) + String(r.ylataso_pct).padStart(9) + '  ' + (r.kutsuttuja + '/' + r.funktioita).padEnd(18) + r.skripti + '  [' + r.nimet.join(', ') + ']'));
  ul.push('', '  ERÄEHDOTUS (EI_KUTSUTTU, iso ensin; jokainen erä = oma PR + A/B):'); era.forEach((e) => ul.push('    erä ' + e.era + ' · ' + e.kt + ' kt · ' + e.skriptit.length + ' skriptiä: ' + e.skriptit.join(', ')));
  return ul.join('\n');
}

function lueArgv(argv) {
  const o = { url: undefined, tunnukset: '.briefit/staging_tunnukset.txt', seura: 1, profiili: 'puhelin', sivu: 'master', rooli: undefined, era: [], lisaodotus: 3000, eraKt: 100, ulos: undefined, tuntematon: [] };
  (argv || []).forEach((a) => { const kv = /^--([a-z-]+)=(.*)$/.exec(a); if (!kv) { o.tuntematon.push(a); return; }
    if (kv[1] === 'url') o.url = kv[2].replace(/\/$/, ''); else if (kv[1] === 'tunnukset') o.tunnukset = kv[2]; else if (kv[1] === 'seura') o.seura = +kv[2]; else if (kv[1] === 'profiili') o.profiili = kv[2]; else if (kv[1] === 'sivu') o.sivu = kv[2]; else if (kv[1] === 'rooli') o.rooli = kv[2]; else if (kv[1] === 'era') o.era = kv[2].split(',').map((x) => x.trim()).filter(Boolean);
    else if (kv[1] === 'lisaodotus') o.lisaodotus = +kv[2]; else if (kv[1] === 'era-kt') o.eraKt = +kv[2]; else if (kv[1] === 'ulos') o.ulos = kv[2]; else o.tuntematon.push(a); });
  return o;
}

async function main(argv, deps) {
  const d = deps || {}, kirjaa = d.kirjaa || ((r) => console.log(r)), virhe = d.virhe || ((r) => console.error(r)), env = d.env || process.env, o = lueArgv(argv);
  const S = require('./mittaa_sivut.js'), { instrumentointi } = require('./mittaus_instrumentointi.js');
  if (o.tuntematon.length) { virhe('Tuntemattomat argumentit: ' + o.tuntematon.join(' ')); return 2; }
  if (!(d.urlSallittu || M.kanavaUrlSallittu)(o.url)) { virhe('URL ei ole stagingin Hosting (https://talentmaster-staging[--kanava].web.app) — ajo keskeytetty (tuotantoa ei mitata).'); return 2; }
  if (!S.PROFIILIT[o.profiili] || !S.SIVUT[o.sivu] || !(o.rooli || S.SIVUT[o.sivu].rooli)) { virhe('Tuntematon profiili/sivu tai sivu ei vaadi kirjautumista.'); return 2; }
  if (!env.STAGING_APPCHECK_DEBUG_TOKEN) { virhe('STAGING_APPCHECK_DEBUG_TOKEN puuttuu ympäristöstä (ei repoon, ei tulosteeseen).'); return 2; }
  let tunnusTeksti, tunnukset; try { tunnusTeksti = fs.readFileSync(o.tunnukset, 'utf8'); tunnukset = M.lueTunnukset(tunnusTeksti); } catch (e) { virhe('Tunnustiedostoa ei voitu lukea (' + o.tunnukset + ').'); return 2; }
  const t = M.haeTunnus(tunnukset, (o.rooli || S.SIVUT[o.sivu].rooli), o.seura); if (!t) { virhe('Tunnusta ei löydy (rooli ' + (o.rooli || S.SIVUT[o.sivu].rooli) + ', seura ' + o.seura + ').'); return 2; }
  const chromePolku = env.TM_CHROME_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
  const { chromium } = d.playwright || require('playwright-core'), selain = await chromium.launch({ executablePath: chromePolku, args: ['--no-sandbox', '--hide-scrollbars'] }), token = env.STAGING_APPCHECK_DEBUG_TOKEN;
  try {
    kirjaa('  kirjaudutaan: rooli ' + (o.rooli || S.SIVUT[o.sivu].rooli));
    const tila = await S.kirjaudu(selain, o.url, t, token, tunnukset, S.SIVUT[o.sivu].tiedosto, null), prof = S.PROFIILIT[o.profiili];
    const ctx = await selain.newContext(Object.assign({}, prof.konteksti, { storageState: tila })); await ctx.addInitScript(instrumentointi, { token });
    const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page); await S.kuristus(cdp, prof);
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    const av = await S.mittaaAvaus(page, cdp, o.url + '/' + S.SIVUT[o.sivu].tiedosto, { odotettuTiedosto: S.SIVUT[o.sivu].tiedosto, odotaKirjautunut: true });
    if (av.virhe) { virhe('  ✗ avaus epäonnistui: ' + av.virhe + ' — kattavuutta ei raportoida.'); await ctx.close(); return 1; }
    await page.waitForTimeout(o.lisaodotus);   // idle-hetken kutsut (esim. ensipiirron jälkeen ajastetut)
    const cov = await page.coverage.stopJSCoverage(); await ctx.close();
    const rivit = analysoi(cov, av.resurssit), era = eraehdotus(rivit, o.eraKt), eratarkistukset = eratarkistus(rivit, o.era), meta = { isanta: new URL(o.url).host, sivu: o.sivu, profiili: o.profiili, seura: o.seura, rooli: (o.rooli || S.SIVUT[o.sivu].rooli), aika: new Date().toISOString(), fcp_ms: av.fcp_ms, tti_ms: av.tti_ms, kirjautunut: av.kirjautunut, lisaodotus_ms: o.lisaodotus };
    const ulos = o.ulos || path.join('mittaus_tulokset', 'kattavuus_' + meta.aika.replace(/[:.]/g, '-').slice(0, 19)); fs.mkdirSync(ulos, { recursive: true });
    fs.writeFileSync(path.join(ulos, 'kattavuus.json'), JSON.stringify({ meta, rivit, era, eratarkistukset }, null, 2) + '\n'); const teksti = raporttiTeksti(rivit, era, meta) + (eratarkistukset.length ? '\n\n  ERÄTARKISTUS (' + meta.rooli + ' · ' + meta.sivu + '):\n' + eratarkistukset.map((x) => '    ' + (x.ok === false ? '✗' : '✓') + ' ' + x.skripti + ' · ' + x.tila).join('\n') : ''); fs.writeFileSync(path.join(ulos, 'kattavuus.txt'), teksti + '\n');
    kirjaa(teksti + '\n\nTallennettu: ' + ulos); return 0;
  } catch (e) { virhe('Virhe: ' + M.piilota(String(e && e.message || e).split('\n')[0], tunnukset)); return 1; } finally { await selain.close(); }
}
if (require.main === module) main(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => { console.error('Virhe: ' + String(e && e.message || e).split('\n')[0]); process.exit(2); });
module.exports = { eratarkistus, analysoiSkripti, ylatasonNimet, analysoi, eraehdotus, raporttiTeksti, lueArgv, main };
