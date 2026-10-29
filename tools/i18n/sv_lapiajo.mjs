#!/usr/bin/env node
/* sv-läpiajo (docs/CODE_BRIEF_I18N_SV_LAPIAJO.md; Kaista: Tero) — ajonaikainen mittaus: mitä suomea käyttäjä näkee, kun kieli on sv.
   Avaa jokaisen sovelluksen sv-tilassa (localStorage.tm_kieli='sv') SOVELLUSTEN OMALLA DEMO-DATALLA (demoMode / loginDemo / demoKirjaudu) — EI tuotantoa, EI oikeita pelaajia, ei Firestorea.
   Kerää näkyvät tekstisolmut + placeholder / title / aria-label / alt / option / button-value; tunnistaa suomen (sv_lapiajo_fi.mjs) ja luokittelee:
     varmuus: 'kartta' (teksti on tunnettu fi-merkkijono jossain kartassa → reitittämätön tai kääntämättä) | 'heuristiikka'
     luokka:  'ui' (löytyy literaalina lähdekoodista) | 'data?' (ei löydy → todennäköisesti data / dynaaminen, D16)
   QG-1: sovellukset fx_* ajetaan OIKEILLA sivuilla synteettisellä fixture-seuralla (tools/i18n/sv_fixtuuri.mjs; Firebase-tynkä muistissa, ei verkkoa)
     → tilat, joita demo-data ei näytä (jakso osineen, ydinvahvuus, sitoumus, kehityskaari, kertymä, kalenteritilaus, VP Koti -kooste, Kehitystyöpöytä + raportti).
   Suomen tunnistus: heuristiikka (sv_lapiajo_fi.mjs) TAI teksti / sen osa on tunnettu fi-merkkijono kartoista (myös muuttujalliset: "Tällä kaudella: 3 omatoimista").
   Ajo:  node tools/i18n/sv_lapiajo.mjs                       → docs/i18n/sv_lapiajo_tulos.json + yhteenveto stdoutiin
         node tools/i18n/sv_lapiajo.mjs --tarkista            → vertaa baselineen (tools/i18n/sv_lapiajo_baseline.json); uudet fi-tekstit → raportti
         node tools/i18n/sv_lapiajo.mjs --tarkista --kaada    → exit 1, jos baselinen ulkopuolella on ui-luokan suomea (data? raportoidaan, ei kaada) — CI
         node tools/i18n/sv_lapiajo.mjs --paivita-baseline    → kirjoittaa baselinen nykytuloksesta (vain koko ajosta; baseline saa vain pienentyä, lisäys = [baseline] PR:ssä)
         --osa=demo|fixtuuri (CI ajaa osat rinnakkain, ≤ 5 min) · --sovellus=<nimi> (toistettava) · --askel=<nimi> (toistettava) · --juuri=<hakemisto> (sivut + lähde toisesta puusta; hyväksyntätestit)
   Selain: env TM_CHROME_PATH (suoritettava) tai Playwrightin oma Chromium (`npx playwright-core install chromium`). */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { onkoSuomea, tekstinOsat } from './sv_lapiajo_fi.mjs';
import { valmisteleFx, fxKonfiguraatio } from './sv_fixtuuri.mjs';

const TYOKALU = join(dirname(fileURLToPath(import.meta.url)), '..', '..');   // baseline, sallitut: aina tämän työkalun repo
const arg = (n) => process.argv.includes(n);
const argArvo = (n) => { const a = process.argv.find((x) => x.startsWith(n + '=')); return a ? a.slice(n.length + 1) : null; };
const JUURI = argArvo('--juuri') || TYOKALU;   // sivut + lähdekoodi (hyväksyntätesti: muokattu kopio)
const KIELI = argArvo('--kieli') || 'sv';   // fi = regressiovertailu (reititys ei saa muuttaa suomenkielistä renderöintiä)
const DUMP = argArvo('--dump');           // kirjoita KAIKKI näkyvät tekstit näkymittäin (ei vain suomea) → fi-mode before/after -diff
const ulosArg = process.argv.find((a) => a.startsWith('--ulos='));
const ULOS = ulosArg ? ulosArg.slice(7) : join(TYOKALU, 'docs/i18n/sv_lapiajo_tulos.json'), BASELINE = join(TYOKALU, 'tools/i18n/sv_lapiajo_baseline.json');
const SALLITUT = JSON.parse(readFileSync(join(TYOKALU, 'tools/i18n/sv_lapiajo_sallitut.json'), 'utf8'));
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const avain = (s) => norm(s).toLowerCase();

/* ── Näkymät: sovellus · sisäänkäynti (demo) · askeleet. Jokainen askel ajetaan TUOREESSA sivussa (puhdas tila, modaalit eivät kasaudu). ── */
const NAV = (fn, arvot) => arvot.map((a) => ({ nimi: a, js: `${fn}('${a}')` }));
export const SOVELLUKSET = {
  pelaaja: { tiedosto: 'TalentMaster_Pelaaja_v7.html', kysely: '?demo=1', entry: "demoKirjaudu('aleksi')", sisaan: "typeof _suljeTervetulo === 'function' && _suljeTervetulo()", askeleet: [{ nimi: 'tanaan', js: "tab('tanaan')" }, { nimi: 'mina', js: "tab('mina')", avaa: '.mgrp' }, { nimi: 'meista', js: "tab('meista')" }, ...NAV('go', ['pin', 'train', 'card', 'haptic', 'offline', 'parent', 'vapaa', 'haaste', 'valinta'])] },
  vanhempi: { tiedosto: 'TalentMaster_Vanhempi_v2.html', kysely: '?demo=1', entry: '0', askeleet: [{ nimi: 'kirjautuminen', js: '0' }, ...['u12', 'u15', 'u19'].flatMap((a) => ['koti', 'viikko', 'kirjaa', 'valmentaja', 'kortti', 'asetukset'].map((n) => ({ nimi: `${a}/${n}`, js: `setAge('${a}'); go('${n}')` })))] },
  master: { tiedosto: 'TalentMaster_Master_v16.html', kysely: '?demo=1', entry: 'loginDemo()', lokalisoi: "typeof masterLokalisoi === 'function' && masterLokalisoi()", askeleet: [...NAV('setWs', ['koti', 'dev', 'havainnot', 'inbox', 'today', 'pulse', 'season', 'cal', 'testit', 'kuorma']), ...['avaaKaaviopankki()', 'avaaHarjoitusarviointi()', 'avaaValmentajaKehitys()', "openDrill('adar')"].map((j) => ({ nimi: j, js: j }))] },
  vp: { tiedosto: 'TalentMaster_VP_v25.html', kysely: '?demo=1', entry: 'demoMode()', lokalisoi: "typeof vpLokalisoi === 'function' && vpLokalisoi()", askeleet: [...NAV('setWs', ['koti', 'tilanne', 'valmentajat', 'pelaajat', 'testit', 'kalenteri', 'ryhmat', 'raportointi', 'reviewit', 'jaksofokus', 'asetukset']), ...['vpAvaaHarjoitusarviointi()', 'avaaAdarKenttatyokalu()', 'avaaBioBanding()', 'avaaKaaviopankki()', "_vpOhjKirjastoModal('','')"].map((j) => ({ nimi: j, js: j }))] },
  seura: { tiedosto: 'TalentMaster_Seura.html', kysely: '?demo=1', entry: '0', askeleet: [{ nimi: 'kirjautuminen', js: '0' }] },
  adar: { tiedosto: 'TalentMaster_ADAR_Pikakortti.html', kysely: '', entry: '0', askeleet: [{ nimi: 'pikakortti', js: '0' }] },
  pelihavainto: { tiedosto: 'TalentMaster_Pelihavainto_Kentta.html', kysely: '', entry: '0', askeleet: [{ nimi: 'kentta', js: '0' }] },
  /* QG-1 · fixture-seura (sv_fixtuuri.mjs): oikea kirjautumispolku fixture-claimeilla, seuran kieli sv, liput kentta/valmentaja_v2/kehitystyopoyta_v2 päällä */
  fx_pelaaja: { tiedosto: 'TalentMaster_Pelaaja_v7.html', kysely: '', fx: ['pelaaja', 'qp1'], entry: '0', sisaan: "typeof _suljeTervetulo === 'function' && _suljeTervetulo()",
    askeleet: [{ nimi: 'idag', js: "tab('tanaan')" }, { nimi: 'jag', js: "tab('mina')", avaa: '.mgrp' }, { nimi: 'om_oss', js: "tab('meista')" }, { nimi: 'kalendertilaus', js: "tab('meista'); _p7TilausAvaa()" },
      { nimi: 'utan_atagande/idag', fx: ['pelaaja', 'qp2'], js: "tab('tanaan')" }, { nimi: 'utan_atagande/jag', fx: ['pelaaja', 'qp2'], js: "tab('mina')", avaa: '.mgrp' }, { nimi: 'tom/idag', fx: ['pelaaja', 'qp3'], js: "tab('tanaan')" }] },
  fx_vanhempi: { tiedosto: 'TalentMaster_Vanhempi_v2.html', kysely: '', fx: ['huoltaja'], entry: '0', sisaan: "document.getElementById('vanhTervetuloOv') && document.getElementById('vanhTervetuloOv').remove()",
    askeleet: [...['koti', 'viikko', 'valmentaja', 'kortti', 'asetukset'].map((n) => ({ nimi: n, js: `go('${n}')` })), { nimi: 'kalendertilaus', js: "go('koti'); _vanhTilausAvaa()" }] },
  fx_master: { tiedosto: 'TalentMaster_Master_v16.html', kysely: '', fx: ['valmentaja'], entry: '0', askeleet: NAV('setWs', ['koti', 'dev', 'inbox', 'pulse', 'season', 'cal']) },
  fx_vp: { tiedosto: 'TalentMaster_VP_v25.html', kysely: '', fx: ['vp'], entry: '0', askeleet: NAV('setWs', ['koti', 'tilanne', 'pelaajat', 'kalenteri', 'jaksofokus']) },
  fx_kehitystyopoyta: { tiedosto: 'TalentMaster_Kehitystyopoyta.html', kysely: '', fx: ['valmentaja'], entry: '0',
    askeleet: [...['tanaan', 'polku', 'profiili'].map((n) => ({ nimi: n, kysely: '#pelaaja/qp1/' + n, js: '0' })), { nimi: 'pelaajaraportti', kysely: '?avaa=raportti#pelaaja/qp1/profiili', js: '0' }, { nimi: 'utan_atagande/polku', kysely: '#pelaaja/qp2/polku', js: '0' }] },
};
export const FX_SOVELLUKSET = Object.keys(SOVELLUKSET).filter((k) => k.startsWith('fx_'));
// --fixtuuri=<polku>: skannaa yksittäinen HTML-sivu (testeille); ei demo-sisäänkäyntiä
if (process.argv.some((a) => a.startsWith('--fixtuuri='))) { const f = process.argv.find((a) => a.startsWith('--fixtuuri=')).slice(11); for (const k of Object.keys(SOVELLUKSET)) delete SOVELLUKSET[k]; SOVELLUKSET.fixtuuri = { tiedosto: f, kysely: '', entry: '0', askeleet: [{ nimi: 'sivu', js: '0' }] }; }
const VAARALLISET = /(logout|kirjauduUlos|delete|poista|tallenna|laheta|lahetä|save|submit|send|reset|kirjaudu)/i;
const ALAN_NAVIT = /^(?:\w*[Tt]ab\w*|show\w*|vaihda\w*|nayta\w*|näytä\w*|toggle\w*|avaa\w*|open\w*|set[A-Z]\w*)\(/;
// Päänavigaatio ja kielen-/teemanvaihto ajetaan omina askeleinaan — ei alinavigaatioksi (muuten jokainen näkymä sisältäisi kaikkien näkymien unionin)
const PAANAVI = /^(?:setWs|go|setAge|setLoc|masterVaihdaKieli|vpVaihdaKieli|_vanhVaihdaKieli|toggleTheme|_notif\w*|openCmd|closeDrill)\(/;

/* ── Selaimessa ajettava keruu ── */
function keruu() {
  const DEV_CHROME = '#sBar, .scene-bar, .locale-bar, #devChrome, #tmDemoPanel, [data-dev-chrome]';   // demo-tilan kehittäjätyökalut (scene-bar, kielivalitsin, demo-paneeli) — eivät käyttäjälle
  const ulos = [];
  const nakyva = (el) => { try { return el.checkVisibility ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); } catch (e) { return false; } };
  const polku = (el) => { const o = []; for (let e = el, i = 0; e && e.nodeType === 1 && i < 5; e = e.parentElement, i++) o.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '')); return o.reverse().join(' > '); };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (!t) continue;
    const el = n.parentElement; if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName) || !nakyva(el) || el.closest(DEV_CHROME)) continue;
    ulos.push({ t, tyyppi: 'teksti', polku: polku(el) });
  }
  for (const el of document.querySelectorAll('body *')) {
    if (!nakyva(el) || el.closest(DEV_CHROME)) continue;
    for (const [attr, tyyppi] of [['placeholder', 'placeholder'], ['title', 'title'], ['aria-label', 'aria'], ['alt', 'alt']]) { const v = el.getAttribute && el.getAttribute(attr); if (v && v.trim()) ulos.push({ t: v.replace(/\s+/g, ' ').trim(), tyyppi, polku: polku(el) }); }
    if (el.tagName === 'INPUT' && /^(button|submit)$/.test(el.type) && el.value) ulos.push({ t: el.value, tyyppi: 'value', polku: polku(el) });
  }
  return ulos;
}

/* ── Fi-korpus ja lähdeindeksi ── */
/* fi-korpus: avain(fi-teksti) → onko sv-rivi. Lisäksi OSAT: tunnetut fi-merkkijonot (≥ 5 kirjainta, sv ≠ fi), joilla tunnistetaan suomi tekstin osana
   ("Tällä kaudella: 3 omatoimista", "Du utvecklar det här: Haltuunotto.") — heuristiikka ei tunnista näitä (viikon 44 aukot). */
const OSAT = new Set(), SV_TEKSTIT = [];
function lisaaOsa(t, sv) { if (typeof sv === 'string' && sv) SV_TEKSTIT.push(sv); const k = avain(t); if ((k.match(/[a-zåäö]/g) || []).length < 5 || k.length > 60 || /[{}<>]/.test(k)) return; if (typeof sv === 'string' && avain(sv) === k) return; if (sallittu(t)) return; OSAT.add(k); }
// Osa, joka esiintyy jonkin sv-käännöksen osana tai sanana (esim. "Streak", "Bio-banding"), ei ole suomen tunniste
function karsiSvOsat() { const sv = new Set(); for (const t of SV_TEKSTIT) { sv.add(avain(t)); for (const o of tekstinOsat(t)) sv.add(avain(o)); for (const w of avain(t).split(/[^a-zåäö-]+/)) if (w) sv.add(w); } for (const k of [...OSAT]) if (sv.has(k)) OSAT.delete(k); }
function lataaKorpus() {
  const fi = new Map(); const lisaa = (t, sv) => { const k = avain(t); fi.set(k, (fi.get(k) || false) || !!sv); lisaaOsa(t, sv); }; const req = createRequire(import.meta.url);
  const sb = { console: { log() {}, warn() {}, error() {} }, module: { exports: {} } }; sb.window = sb; vm.createContext(sb);
  try {
    for (const f of ['lib/tm_lang.js', 'lib/tm_i18n_common.js', 'lib/tm_vp_i18n.js', 'lib/tm_master_i18n.js']) vm.runInContext(readFileSync(join(JUURI, f), 'utf8'), sb);
    const kaveleFi = (o, svO) => { for (const [k, v] of Object.entries(o || {})) { if (typeof v === 'string') lisaa(v, svO && typeof svO[k] === 'string' && svO[k] !== ''); else if (v && typeof v === 'object') kaveleFi(v, svO && svO[k]); } };
    const kaveleFi2 = (o, svO) => { for (const [k, v] of Object.entries(o || {})) { if (typeof v === 'string') lisaaOsa(v, svO && svO[k]); else if (v && typeof v === 'object') kaveleFi2(v, svO && svO[k]); } };
    kaveleFi(vm.runInContext('TM_LANG.fi', sb), vm.runInContext('TM_LANG.sv', sb)); kaveleFi2(vm.runInContext('TM_LANG.fi', sb), vm.runInContext('TM_LANG.sv', sb));
    for (const k of ['TM_I18N_COMMON', 'TM_VP_I18N', 'TM_MASTER_I18N']) { const m = vm.runInContext(`(typeof ${k} !== 'undefined' ? ${k}.sv : {})`, sb); for (const [a, v] of Object.entries(m || {})) { lisaa(a, typeof v === 'string' && v !== ''); lisaaOsa(a, v); } }
  } catch (e) { console.warn('korpus: ' + e.message); }
  let libSv = {}; try { libSv = req(join(JUURI, 'lib/tm_lib_i18n.js')).TM_LIB_I18N.sv || {}; } catch (e) { /* ei vielä */ }
  for (const f of readdirSync(join(JUURI, 'lib')).filter((x) => x.endsWith('.js'))) { try { const m = req(join(JUURI, 'lib', f)); if (m && m.FI) for (const [k, v] of Object.entries(m.FI)) { lisaa(v, typeof libSv[k] === 'string'); lisaaOsa(v, libSv[k]); } } catch (e) { /* ei FI */ } }
  for (const [k, v] of Object.entries(libSv)) if (/[\sÄÖäö]|^[A-ZÄÖ]/.test(k) && !/^[a-z0-9]+_[a-z0-9_]+$/i.test(k)) { lisaa(k, typeof v === 'string' && v !== ''); lisaaOsa(k, v); }   // lib-kartan fi-tekstiavaimet ("Tällä kaudella")
  try { const KP = req(join(JUURI, 'lib/tm_kehityspolku.js')); for (const v of Object.values(KP.YOUTH_NIMI || {})) if (typeof v === 'string') lisaaOsa(v, null); } catch (e) { /* ei kehityspolkua */ }   // tallennetut konseptinimet (jaksofokus.konsepti_nimi)
  for (const v of Object.values(libSv)) if (typeof v === 'string') SV_TEKSTIT.push(v);
  karsiSvOsat();
  return fi;
}
function lahdeindeksi() {
  const tied = [...readdirSync(JUURI).filter((f) => /^TalentMaster_.*\.html$/.test(f) || f === 'harjoitelogiikka_v4.js'), ...readdirSync(join(JUURI, 'lib')).filter((f) => f.endsWith('.js')).map((f) => 'lib/' + f)];
  return tied.map((f) => { const s = readFileSync(join(JUURI, f), 'utf8'); return { f, s, rivit: null }; });
}
const osaOnFi = (t) => tekstinOsat(t).filter((o) => OSAT.has(avain(o)));
function etsiLahde(idx0, teksti, ensin) {
  const idx = [...idx0].sort((a, b) => (b.f === ensin) - (a.f === ensin) || (b.f.startsWith('lib/') - a.f.startsWith('lib/')) || (a.f.startsWith('TalentMaster_') - b.f.startsWith('TalentMaster_')));
  const kokeile = [teksti.slice(0, 48), teksti.slice(0, 48).replace(/'/g, "\\'"), teksti.slice(0, 48).replace(/&/g, '&amp;')];
  const osumat = [];
  for (const k of kokeile) { if (k.length < 4) continue; for (const x of idx) { const i = x.s.indexOf(k); if (i >= 0) { osumat.push(x.f + ':' + (x.s.slice(0, i).split('\n').length)); if (osumat.length >= 3) return osumat; } } if (osumat.length) return osumat; }
  // QG-1: muuttujallinen teksti — jokin osa (≥ 6 merkkiä) löytyy lähteestä merkkijonon reunalla ('Tällä kaudella: ' + n, `… ${n} omatoimista`, '{n} omatoimista')
  for (const o of tekstinOsat(teksti)) {
    if (o.length < 6 || o === teksti || !(OSAT.has(avain(o)) || onkoSuomea(o).fi)) continue;   // vain suomenkielinen osa (ei "Inställt:"-etuliitettä)
    const reunat = ["'", '"', '`', '>', '}'].flatMap((q) => [q + o, q + o.replace(/'/g, "\\'")]).concat(["'", '"', '`', '<', '{', ' +', '$'].map((q) => o + q)).concat([o + " '", o + ':'].map((x) => "'" + x));
    for (const x of idx) { for (const r of reunat) { const i = x.s.indexOf(r); if (i >= 0) { osumat.push(x.f + ':' + (x.s.slice(0, i).split('\n').length) + ' (osa: ' + o + ')'); break; } } if (osumat.length >= 2) return osumat; }
  }
  return osumat;
}
const sallittu = (t) => { const a = avain(t); return SALLITUT.tekstit.includes(a) || SALLITUT.alkavat.some((p) => a.startsWith(p.toLowerCase())) || !/[a-zåäö]{3}/i.test(t); };


async function suoritaAskel(selain, cfg, as, nimi, virheet) {
  const ctx = await selain.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
  const fx = as.fx || cfg.fx; if (fx) await valmisteleFx(p, fxKonfiguraatio(fx[0], fx[1]));   // QG-1: fixture-seura muistissa, ulkoverkko estetty
  await p.addInitScript((k) => { try { localStorage.setItem('tm_kieli', k); } catch (e) { /* ei LS */ } }, KIELI);
  p.on('pageerror', () => { /* demo-datan ulkoiset kutsut; ei raportoida */ });
  // Deterministinen mittaus: kiinteä kello + siemennetty Math.random (päivän harjoitevalinta, synttäribonus yms. ovat satunnais-/päiväriippuvaisia) → fi before/after -diff vertailukelpoinen
  await p.addInitScript(() => { let a = 0x2f6e2b1; Math.random = function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  try { await p.clock.setFixedTime(new Date('2026-10-14T10:00:00+03:00')); } catch (e) { /* vanha playwright */ }
  try {
    await p.goto(pathToFileURL(join(JUURI, cfg.tiedosto)).href + (as.kysely != null ? as.kysely : cfg.kysely), { waitUntil: 'load', timeout: 45000 });
    await p.waitForTimeout(fx ? 2500 : 1200);   // fixture-ajossa sovellus kirjautuu ja lataa oman polkunsa (liput, jakso, callablet)
    if (cfg.entry !== '0') { await p.evaluate(cfg.entry).catch((e) => virheet.push(nimi + ' entry: ' + e.message.slice(0, 80))); await p.waitForTimeout(1500); }
    if (cfg.sisaan) await p.evaluate(cfg.sisaan).catch(() => { /* ei */ });   // sulje tervetulo-ikkuna (ensikäynti → deterministinen mittaus)
    if (cfg.lokalisoi) await p.evaluate(cfg.lokalisoi).catch(() => { /* ei funktiota */ });   // demo-sisäänkäynti ei aja kirjautumispolun lokalisointia → ajetaan kuten oikea sovellus
    if (as.js !== '0') { await p.evaluate(as.js).catch((e) => virheet.push(nimi + ' askel: ' + e.message.slice(0, 80))); await p.waitForTimeout(900); }
    if (cfg.lokalisoi) await p.evaluate(cfg.lokalisoi).catch(() => { /* ei funktiota */ });
    // avattavat ryhmät: <details> auki + näkymän sisäiset välilehti-/avaustoiminnot (ei kirjoittavia)
    await p.evaluate((sel) => { document.querySelectorAll('details').forEach((d) => { d.open = true; }); if (sel) document.querySelectorAll(sel).forEach((g) => g.classList.add('open')); }, as.avaa || null);
    const sisaiset = await p.evaluate(({ vaar, nav, paa }) => { const v = new RegExp(vaar, 'i'), n = new RegExp(nav), pn = new RegExp(paa); return [...new Set([...document.querySelectorAll('[onclick]')].filter((e) => e.checkVisibility && e.checkVisibility() && (e.innerText || '').trim().length <= 32).map((e) => e.getAttribute('onclick')).filter((o) => o && n.test(o) && !v.test(o) && !pn.test(o)))].slice(0, 14); }, { vaar: VAARALLISET.source, nav: ALAN_NAVIT.source, paa: PAANAVI.source });
    const kaikki = await p.evaluate(keruu);
    for (const js of sisaiset) { try { await p.evaluate(js); await p.waitForTimeout(250); const lisaa = await p.evaluate(keruu); kaikki.push(...lisaa); } catch (e) { /* ohita */ } }
    return kaikki;
  } finally { await ctx.close(); }
}

async function main() {
  const exe = process.env.TM_CHROME_PATH || undefined;
  const selain = await chromium.launch({ headless: true, executablePath: exe });
  const fiKorpus = lataaKorpus(), idx = lahdeindeksi();
  const osa = argArvo('--osa');
  const valitut = process.argv.filter((a) => a.startsWith('--sovellus=')).map((a) => a.slice(11)).concat(osa ? Object.keys(SOVELLUKSET).filter((k) => (osa === 'fixtuuri') === k.startsWith('fx_')) : []);
  const askelRaja = process.argv.filter((a) => a.startsWith('--askel=')).map((a) => a.slice(8));
  // Askeleet ovat toisistaan riippumattomia (jokainen tuoreessa kontekstissa) → ajetaan RINNAKKAIN (SV_RINNAKKAIN, oletus 6; CI-runnerissa 2 ydintä).
  // Tulokset kootaan alkuperäiseen järjestykseen (taulukkoindeksi) → tuloste ja JSON identtiset sarja-ajon kanssa. Syy: sarja-ajo ylitti CI:n 10 min (≥2 toistoa × ~3,6 s × ~64 askelta).
  const tyot = []; for (const [sov, cfg] of Object.entries(SOVELLUKSET)) { if (valitut.length && !valitut.includes(sov)) continue; for (const as of cfg.askeleet) { if (askelRaja.length && !askelRaja.includes(as.nimi)) continue; tyot.push({ sov, cfg, as, nimi: sov + '/' + as.nimi }); } }
  const virheLista = tyot.map(() => []), tulokset = new Array(tyot.length); let seuraava = 0, valmiita = 0; const alku = Date.now();
  const rinnakkain = Math.max(1, Math.min(tyot.length, parseInt(process.env.SV_RINNAKKAIN || '6', 10) || 4));
  async function tyontekija() {
    while (seuraava < tyot.length) {
      const i = seuraava++; const { cfg, as, nimi } = tyot[i]; const virheet = virheLista[i]; const t0 = Date.now();
      try {
        // demo-sivu voi joskus renderöityä vajaaksi (async-init-kisa) → toista kunnes kaksi peräkkäistä yritystä antaa saman määrän (max 6), ota laajin → deterministinen mittaus
        let kaikki = [], edellinen = -1;
        for (let yritys = 0; yritys < 6; yritys++) {
          let k; try { k = await suoritaAskel(selain, cfg, as, nimi, virheet); } catch (e) { if (yritys === 5) throw e; edellinen = -1; continue; }   // kuormassa yksittäinen goto-aikakatkaisu → uusi yritys, ei koko askeleen menetystä
          if (k.length > kaikki.length) kaikki = k;
          if (k.length === edellinen && k.length >= 15) break;
          edellinen = k.length;
        }
        const nahty = new Set(); const rivit = [];
        for (const k of kaikki) {
          const t = norm(k.t); const id = k.tyyppi + '|' + t; if (nahty.has(id)) continue; nahty.add(id);
          if (sallittu(t)) continue;
          const tunn = onkoSuomea(t); const kartassa = fiKorpus.has(avain(t)); const svRivi = kartassa ? fiKorpus.get(avain(t)) : null;
          const osat = kartassa || tunn.fi ? [] : osaOnFi(t);   // QG-1: tunnettu fi-merkkijono tekstin osana (heuristiikka ei tunnista)
          if (!tunn.fi && !kartassa && !osat.length) continue;
          const lahde = etsiLahde(idx, t, cfg.tiedosto);
          rivit.push({ teksti: t, tyyppi: k.tyyppi, polku: k.polku, varmuus: kartassa ? 'kartta' : osat.length ? 'kartta-osa' : 'heuristiikka', svRivi, luokka: lahde.length ? 'ui' : 'data?', lahde, ...(osat.length ? { osat } : {}) });
        }
        tulokset[i] = { tekstejaYht: nahty.size, fi: rivit };
        if (DUMP) tulokset[i].kaikki = [...new Set(kaikki.map((k) => k.tyyppi + '|' + norm(k.t)))].sort();
      } catch (e) { virheet.push(nimi + ': ' + e.message.slice(0, 100)); tulokset[i] = { tekstejaYht: 0, fi: [], virhe: e.message.slice(0, 100) }; }
      process.stderr.write(`[${++valmiita}/${tyot.length}] ${nimi} ${((Date.now() - t0) / 1000).toFixed(1)}s (yht ${((Date.now() - alku) / 1000).toFixed(0)}s)\n`);   // stderr → CI-lokissa näkyy eteneminen (stdout on tee:ssä)
    }
  }
  await Promise.all(Array.from({ length: rinnakkain }, tyontekija));
  const nakymat = {}; tyot.forEach((t, i) => { nakymat[t.nimi] = tulokset[i]; }); const virheet = virheLista.flat();
  await selain.close();
  return { nakymat, virheet };
}

const KOKO_AJO = !process.argv.some((a) => /^--(sovellus|askel|fixtuuri|osa)=/.test(a));
if (argArvo('--osa') && !['demo', 'fixtuuri'].includes(argArvo('--osa'))) { console.error('--osa=demo|fixtuuri'); process.exit(2); }
if (arg('--paivita-baseline') && !KOKO_AJO) { console.error('--paivita-baseline vain koko ajosta (ei --sovellus/--askel)'); process.exit(2); }
const { nakymat, virheet } = await main();
const yhteenveto = {}; let kaikkiFi = 0, ui = 0; const uniikit = new Map();
for (const [n, v] of Object.entries(nakymat)) { const u = v.fi.filter((r) => r.luokka === 'ui').length; yhteenveto[n] = { tekstejaYht: v.tekstejaYht, fi: v.fi.length, ui: u, data: v.fi.length - u, kartassa: v.fi.filter((r) => r.varmuus === 'kartta').length }; kaikkiFi += v.fi.length; ui += u; for (const r of v.fi) { const sov = n.split('/')[0]; if (!uniikit.has(sov + '|' + avain(r.teksti))) uniikit.set(sov + '|' + avain(r.teksti), r); } }
const perSovellus = {}; for (const [k, r] of uniikit) { const sov = k.split('|')[0]; const o = (perSovellus[sov] = perSovellus[sov] || { uniikkeja: 0, ui: 0, data: 0, kartassa: 0, reititysPuuttuu: 0, svPuuttuu: 0 }); o.uniikkeja++; if (r.luokka === 'ui') o.ui++; else o.data++; if (r.varmuus === 'kartta') { o.kartassa++; if (r.svRivi) o.reititysPuuttuu = (o.reititysPuuttuu || 0) + 1; else o.svPuuttuu = (o.svPuuttuu || 0) + 1; } }
if (DUMP) { writeFileSync(DUMP, JSON.stringify(Object.fromEntries(Object.entries(nakymat).map(([n, v]) => [n, v.kaikki || []])), null, 1) + '\n'); console.log('dump → ' + DUMP); process.exit(0); }
const tulos = { luotu: new Date().toISOString().slice(0, 10), kieli: 'sv', huom: 'Mittaus sovellusten omalla demo-datalla; heuristiikka on alaraja (puuttuva osuma ≠ ei suomea). luokka data? = ei löydy lähdekoodista literaalina.', uniikkejaYht: uniikit.size, perSovellus, yhteensaEsiintymia: kaikkiFi, yhteenveto, virheet, nakymat };
if (!arg('--tarkista') || arg('--kirjoita') || ulosArg) writeFileSync(ULOS, JSON.stringify(tulos, null, 1) + '\n');
console.log(`sv-läpiajo: ${Object.keys(nakymat).length} näkymää · uniikkeja suomenkielisiä tekstejä ${uniikit.size} (esiintymiä ${kaikkiFi}) · virheitä ${virheet.length}`);
for (const [sv, o] of Object.entries(perSovellus)) console.log(`  [${sv}] uniikkeja ${o.uniikkeja} · ui ${o.ui} · data? ${o.data} · tunnettu fi-merkkijono ${o.kartassa} (sv-rivi on jo → vain reititys ${o.reititysPuuttuu}; sv-rivi puuttuu ${o.svPuuttuu}) · heuristiikka ${o.uniikkeja - o.kartassa}`);
for (const [n, s] of Object.entries(yhteenveto)) console.log(`  ${n.padEnd(34)} tekstejä ${String(s.tekstejaYht).padStart(4)} · fi ${String(s.fi).padStart(3)} (ui ${s.ui}, data? ${s.data}, kartassa ${s.kartassa})`);
if (arg('--paivita-baseline')) { writeFileSync(BASELINE, JSON.stringify({ luotu: tulos.luotu, tekstit: [...new Set(Object.values(nakymat).flatMap((v) => v.fi.map((r) => avain(r.teksti))))].sort() }, null, 1) + '\n'); console.log('baseline päivitetty'); }
if (arg('--tarkista')) {
  const base = existsSync(BASELINE) ? new Set(JSON.parse(readFileSync(BASELINE, 'utf8')).tekstit) : new Set();
  const uudet = Object.entries(nakymat).flatMap(([n, v]) => v.fi.map((r) => ({ n, ...r }))).filter((r) => !base.has(avain(r.teksti)));
  const uudetUi = uudet.filter((r) => r.luokka === 'ui'), uudetData = uudet.filter((r) => r.luokka !== 'ui');
  console.log(`UUSIA suomenkielisiä tekstejä baselinen ulkopuolella: ${uudet.length} (ui ${uudetUi.length} — kaataa --kaada:lla · data? ${uudetData.length} — vain raportti)`);
  uudetUi.slice(0, 60).forEach((r) => console.log(`  ✗ ui    [${r.n}] ${r.teksti.slice(0, 140)}  (${r.lahde[0] || '?'})`));
  uudetData.slice(0, 40).forEach((r) => console.log(`  · data? [${r.n}] ${r.teksti.slice(0, 90)}`));
  if (KOKO_AJO && !virheet.length) { const nahdyt = new Set(Object.values(nakymat).flatMap((v) => v.fi.map((r) => avain(r.teksti)))); const vanhat = [...base].filter((t) => !nahdyt.has(t)); if (vanhat.length) console.log(`Baselinessa ${vanhat.length} tekstiä, joita ei enää näy → poistettavissa (--paivita-baseline; baseline saa vain pienentyä).`); }
  if (uudetUi.length && arg('--kaada')) { console.log('KAATUU: uutta käyttöliittymän suomea sv-tilassa. Korjaa reititys/käännös (sv Geminin kautta) — baselineen lisäys vain [baseline]-merkinnällä PR-kuvauksessa.'); process.exit(1); }
}
