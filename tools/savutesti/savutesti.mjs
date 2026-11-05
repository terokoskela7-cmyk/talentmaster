#!/usr/bin/env node
/* QG-3 · tuotannon savutesti (vaihe 0 hyväksytty 5.11.2026; kaista: Tero). Ajetaan .github/workflows/savutesti.yml:stä Hosting-deployn jälkeen tai käsin.
   MITÄ: Hosting-kanava `savutesti` (sama julkaisu kuin live, tuotantobackend: Firestore, Functions, Rules, liput) × synteettinen seura qg_savu
   (scripts/savutesti_seura_luo.js) × kielet fi + sv. Näkymät: P7 Idag + Jag (pelaaja qp1) · VP Koti · Kehitystyöpöytä Tänään/Polku/Profiili/Pelaajaraportti (VP-tunnus).
   KIRJAUTUMINEN: VP = sovelluksen oma lomake (#lEmail/#lPass → kirjaudu()); Kehitystyöpöytä käyttää samaa istuntoa (sama origin, sama selainkonteksti).
     P7 = oma PalloID-kenttä (#pinTunnus) + _kirjaudu(pin) → pelaajaKirjaudu → custom token (sama reitti kuin oikeilla pelaajilla). Pelaaja omassa kontekstissaan.
   KIRJOITUSESTO (vaihe 0 S3): kerros 1 = Rules-eristys (tunnukset vain qg_savu) · kerros 2 = (a) sivun Firestore-vartija hylkää set/update/delete/add/batch/transaktion
     ennen verkkoa ja kirjaa polun, (b) verkkoesto (luokittelePyynto) katkaisee Write-kanavan, REST-commitin, Storage-uploadit ja callablet sallittulistan ulkopuolelta ·
     kerros 3 = jokainen tuntematon kirjoitusyritys kaataa näkymän. ⚠ vain VP:n kaksi nimettyä avauskirjoitusta (savutesti_sallitut.json: oma viimeisinKirjautuminen +
     automaattinen toimenpide-ehdotus, polku + kentät + arvot täsmälleen); ne estetään silti. Siirto palvelimelle: docs/BACKLOG_SAVUTESTI.md.
   SALAISUUDET: vain env (GitHub Secrets). Ei koskaan lokiin: PIN välitetään sivulle funktion argumenttina, CI:ssä lisäksi ::add-mask::.
   Ajo:  TM_SAVU_URL=https://talentmaster-pilot--savutesti-xxxx.web.app TM_SAVU_EMAIL=… TM_SAVU_SALASANA=… TM_SAVU_PELAAJA_TUNNISTE=… TM_SAVU_PELAAJA_PIN=… TM_SAVU_APPCHECK_DEBUG=…
           node tools/savutesti/savutesti.mjs [--tulos=savutesti-tulos/tulos.json] [--issue=savutesti-tulos/issue.md] [--kielet=fi,sv]
         Secretit tai URL puuttuvat → "ohitettu: …" yhteenvetoon, exit 0. Selain: TM_CHROME_PATH (CI: runnerin google-chrome). */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { REITITA_RE, secretitPuuttuvat, kanavaUrl, luokittelePyynto, luokitteleKirjoitus, vartijaLahde, svLoydot, konsoliVirheet, yhteenvetoMarkdown, issueRunko, onnistui, SECRETIT, SEURA, ESTO_VIESTI } from './savutesti_lib.mjs';

const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SALLITUT = JSON.parse(readFileSync(join(JUURI, 'tools/savutesti/savutesti_sallitut.json'), 'utf8'));
const SV_SALLITUT = JSON.parse(readFileSync(join(JUURI, 'tools/i18n/sv_lapiajo_sallitut.json'), 'utf8'));
const SV_BASELINE = JSON.parse(readFileSync(join(JUURI, 'tools/i18n/sv_lapiajo_baseline.json'), 'utf8'));
const CALLABLET = SALLITUT.callablet.map((c) => c.nimi);
const PELAAJA = 'qp1', ODOTUS = 45000, ASETU = 2500;
const argArvo = (n) => { const a = process.argv.find((x) => x.startsWith(n + '=')); return a ? a.slice(n.length + 1) : null; };

/* Sivun Firestore-kirjoitusvartija (kerros 2a): savutesti_lib.mjs vartijaLahde (kirjaa op, polku, kentät, arvot, uid). */
const VARTIJA = vartijaLahde(ESTO_VIESTI);

/* Selaimessa: näkyvät tekstit (sv-tarkistus) — sama rajaus kuin QG-1:n keruussa (teksti + placeholder/title/aria-label/alt). */
function keraaTekstit() {
  const nak = (el) => { try { return el.checkVisibility ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : !!el.getClientRects().length; } catch (e) { return false; } };
  const ulos = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const t = n.nodeValue.replace(/\s+/g, ' ').trim(); const el = n.parentElement; if (t && el && !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName) && nak(el)) ulos.push(t); }
  for (const el of document.querySelectorAll('body *')) { if (!nak(el)) continue; for (const a of ['placeholder', 'title', 'aria-label', 'alt']) { const v = el.getAttribute(a); if (v && v.trim()) ulos.push(v.trim()); } }
  return ulos;
}
function tarkistaLohkot(valitsimet) {
  const puuttuu = valitsimet.filter((s) => { const el = document.querySelector(s); return !el || !(el.checkVisibility ? el.checkVisibility() : el.getClientRects().length) || !(el.innerText || '').trim(); });
  return { ok: !puuttuu.length, puuttuu };
}

function uusiKeraaja() { return { viestit: [], verkko: [], estetytUrlit: [] }; }

export async function konteksti(selain, kieli, env, tila) {
  const ctx = await selain.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });   // SW ei ole testin kohde; SW:n pyynnöt ohittaisivat verkkoeston
  await ctx.addInitScript(({ k, d }) => { try { localStorage.setItem('tm_kieli', k); localStorage.setItem('tm_appcheck_debug', d); } catch (e) { /* ei LS */ } }, { k: kieli, d: env.TM_SAVU_APPCHECK_DEBUG });
  await ctx.addInitScript(VARTIJA);
  await ctx.route(REITITA_RE, (r) => {
    const req = r.request(), p = luokittelePyynto({ url: req.url(), method: req.method() }, CALLABLET);
    if (p.paatos === 'sallittu') return r.continue();
    if (p.paatos === 'vaimennettu') return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    const k = tila.nyky; if (k) { k.verkko.push(p.syy); k.estetytUrlit.push(req.url()); }
    if (/^callable /.test(p.syy)) return r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: { status: 'PERMISSION_DENIED', message: ESTO_VIESTI } }) });
    return r.abort('blockedbyclient');
  });
  return ctx;
}
export async function sivu(ctx, tila) {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { if (tila.nyky) tila.nyky.viestit.push({ tyyppi: 'pageerror', teksti: String(e && e.message || e) }); });
  p.on('console', (m) => { if (m.type() === 'error' && tila.nyky) tila.nyky.viestit.push({ tyyppi: 'console', teksti: m.text(), url: (m.location() || {}).url || '' }); });
  return p;
}

function lisaaKirjoitukset(n, kirj, kerays) {
  for (const x of kirj) { const r = luokitteleKirjoitus(x, n.sivu, SALLITUT.tunnetut_kirjoitukset); (r.tunnettu ? n.kirjoitukset.tunnetut : n.kirjoitukset.tuntemattomat).push(r.tunnettu ? x.op + ' ' + x.polku : r.syy); }
  n.kirjoitukset.verkko.push(...kerays.verkko.splice(0));
}
/* Yksi näkymä: odota valmis-ehto → asetu → lohkot, tekstit, kirjoitukset, virheet. */
export async function mittaa(p, def, kieli, tila, kerays) {
  const n = { nimi: def.nimi, kieli, sivu: def.sivu };
  try {
    await p.waitForFunction(def.valmis, null, { timeout: ODOTUS });
    await p.waitForTimeout(ASETU);
    n.lohkot = await p.evaluate(tarkistaLohkot, def.lohkot);
    if (kieli === 'sv') n.sv = svLoydot(await p.evaluate(keraaTekstit), { sallitut: SV_SALLITUT, baseline: SV_BASELINE });
    const sk = await p.evaluate(() => ({ v: window.__savuVartija === true, k: (window.__savuKirj || []).splice(0) }));
    n.vartija = sk.v; n.kirjoitukset = { tuntemattomat: [], tunnetut: [], verkko: [] };
    lisaaKirjoitukset(n, sk.k, kerays);
  } catch (e) {
    n.kaatui = 'näkymä ei valmistunut ' + ODOTUS / 1000 + ' s:ssa (' + String(e.message || e).split('\n')[0].slice(0, 120) + ')';
    if (tila.kuvat) { try { mkdirSync(tila.kuvat, { recursive: true }); await p.screenshot({ path: join(tila.kuvat, (def.nimi + '_' + kieli).replace(/[^a-z0-9_]+/gi, '_') + '.png') }); } catch (e2) { /* ei kuvaa */ } }
  }
  n.virheet = konsoliVirheet(kerays.viestit.splice(0), SALLITUT.konsoli, kerays.estetytUrlit);
  return n;
}

const KTP_NIMI = { tanaan: 'Tänään', polku: 'Polku', profiili: 'Profiili' };
const KTP = (v) => ({ nimi: 'Kehitystyöpöytä ' + KTP_NIMI[v], sivu: 'TalentMaster_Kehitystyopoyta.html', valmis: `(() => { const e = document.querySelector('#ktSivu_${v}'); return !!e && (e.innerText || '').trim().length > 40; })()`, lohkot: ['#ktSivu_' + v] });
export const NAKYMAT = {
  vpKoti: { nimi: 'VP Koti', sivu: 'TalentMaster_VP_v25.html', valmis: "(() => { const e = document.querySelector('#vpKotiView'); return !!e && (e.innerText || '').trim().length > 40; })()", lohkot: ['#vpKotiView'] },   // Kodin sisältö riippuu lipuista (kentta) → vain kuori + teksti
  ktTanaan: KTP('tanaan'), ktPolku: KTP('polku'), ktProfiili: KTP('profiili'),
  ktRaportti: { nimi: 'Kehitystyöpöytä Pelaajaraportti', sivu: 'TalentMaster_Kehitystyopoyta.html', valmis: "(() => { const e = document.querySelector('#prKuori'); return !!e && (e.innerText || '').trim().length > 40; })()", lohkot: ['#prKuori'] },
  p7Idag: { nimi: 'P7 Idag', sivu: 'TalentMaster_Pelaaja_v7.html', valmis: "(() => typeof _tab !== 'undefined' && _tab === 'tanaan' && !document.getElementById('pinTunnus') && (document.getElementById('phBody') || {}).innerText && document.getElementById('phBody').innerText.trim().length > 100)()", lohkot: ['#phBody', '#phBody .tabs'] },
  p7Jag: { nimi: 'P7 Jag', sivu: 'TalentMaster_Pelaaja_v7.html', valmis: "(() => typeof _tab !== 'undefined' && _tab === 'mina' && !document.getElementById('pinTunnus') && (document.getElementById('phBody') || {}).innerText && document.getElementById('phBody').innerText.trim().length > 100)()", lohkot: ['#phBody', '#phBody .tabs'] },
};
const kaatunut = (def, kieli, syy) => ({ nimi: def.nimi, kieli, sivu: def.sivu, kaatui: syy, virheet: [] });

async function henkilokunta(selain, url, kieli, env, tila, ulos) {
  const kerays = uusiKeraaja(); tila.nyky = kerays;
  const ctx = await konteksti(selain, kieli, env, tila);
  try {
    const p = await sivu(ctx, tila);
    let kirjautui = true;
    try {
      await p.goto(url + '/TalentMaster_VP_v25.html', { waitUntil: 'load', timeout: ODOTUS });
      await p.waitForSelector('#lEmail', { state: 'attached', timeout: ODOTUS });
      await p.evaluate(({ e, s }) => { document.getElementById('lEmail').value = e; document.getElementById('lPass').value = s; kirjaudu(); }, { e: env.TM_SAVU_EMAIL, s: env.TM_SAVU_SALASANA });
    } catch (e) { kirjautui = false; }
    if (!kirjautui) { for (const k of ['vpKoti', 'ktTanaan', 'ktPolku', 'ktProfiili', 'ktRaportti']) ulos.push(kaatunut(NAKYMAT[k], kieli, 'VP-kirjautumislomake ei avautunut')); return; }
    const koti = await mittaa(p, NAKYMAT.vpKoti, kieli, tila, kerays);
    if (koti.kaatui) { const v = await p.evaluate(() => ((document.getElementById('lErr') || {}).textContent || '').trim()).catch(() => ''); if (v) koti.kaatui += ' · kirjautuminen: ' + v.slice(0, 120); }
    /* Tarkistus 4: liput/julkiset luettu (kehitystyopoyta_v2) ja VP ohjaa pelaajan työpöydän Kehitystyöpöydälle (B7: window._ktAvaa → TM_KT_SIVU.tmKtSivuLinkki). */
    let ohjasi = false;
    if (!koti.kaatui) {
      const l = await p.waitForFunction((s) => window._ktSivuLippu !== undefined && ({ sivu: window._ktSivuLippu, julkiset: !!(window._vpLiput && window._vpLiput[s] && window._vpLiput[s].kehitystyopoyta_v2 === true) }), SEURA, { timeout: 20000 }).then((h) => h.jsonValue()).catch(() => null);
      if (!l) koti.lippu = { ok: false, syy: 'lippua ei luettu (window._ktSivuLippu)' };
      else if (!l.julkiset || l.sivu !== true) koti.lippu = { ok: false, syy: 'kehitystyopoyta_v2 ei päällä (liput/julkiset ' + l.julkiset + ', _ktSivuLippu ' + l.sivu + ') — Admin → Liput' };
      else {
        const loput = await p.evaluate(() => (window.__savuKirj || []).splice(0)).catch(() => []);   // VP:n myöhäiset kirjoitukset ennen sivun vaihtoa
        if (koti.kirjoitukset) lisaaKirjoitukset(koti, loput, kerays);
        await p.evaluate((pid) => window._ktAvaa(pid, 'tanaan'), PELAAJA).catch(() => {});
        ohjasi = await p.waitForURL(/TalentMaster_Kehitystyopoyta\.html#pelaaja\/qp1\/tanaan$/, { timeout: 20000 }).then(() => true, () => false);
        koti.lippu = ohjasi ? { ok: true, syy: '' } : { ok: false, syy: 'VP ei ohjannut Kehitystyöpöydälle (_ktAvaa)' };
      }
    } else koti.lippu = { ok: false, syy: 'VP Koti ei avautunut' };
    ulos.push(koti);
    if (!ohjasi) await p.goto(url + '/TalentMaster_Kehitystyopoyta.html#pelaaja/' + PELAAJA + '/tanaan', { waitUntil: 'load', timeout: ODOTUS }).catch(() => {});
    ulos.push(await mittaa(p, NAKYMAT.ktTanaan, kieli, tila, kerays));
    for (const [k, polku] of [['ktPolku', '#pelaaja/' + PELAAJA + '/polku'], ['ktProfiili', '#pelaaja/' + PELAAJA + '/profiili'], ['ktRaportti', '?avaa=raportti#pelaaja/' + PELAAJA + '/profiili']]) {
      const q = await sivu(ctx, tila);
      try { await q.goto(url + '/TalentMaster_Kehitystyopoyta.html' + polku, { waitUntil: 'load', timeout: ODOTUS }); ulos.push(await mittaa(q, NAKYMAT[k], kieli, tila, kerays)); }
      catch (e) { ulos.push(kaatunut(NAKYMAT[k], kieli, 'sivu ei latautunut')); }
      finally { await q.close(); }
    }
  } finally { await ctx.close(); tila.nyky = null; }
}

async function pelaaja(selain, url, kieli, env, tila, ulos) {
  const kerays = uusiKeraaja(); tila.nyky = kerays;
  const ctx = await konteksti(selain, kieli, env, tila);
  try {
    const p = await sivu(ctx, tila);
    try {
      await p.goto(url + '/TalentMaster_Pelaaja_v7.html', { waitUntil: 'load', timeout: ODOTUS });
      await p.waitForSelector('#pinTunnus', { state: 'attached', timeout: ODOTUS });
      await p.fill('#pinTunnus', env.TM_SAVU_PELAAJA_TUNNISTE);
      await p.evaluate((pin) => { _kirjaudu(pin); }, env.TM_SAVU_PELAAJA_PIN);   // PIN argumenttina: ei sivun lähteeseen eikä lokiin
      await p.waitForFunction((pid) => typeof _pelaaja !== 'undefined' && _pelaaja && _pelaaja.id === pid, PELAAJA, { timeout: ODOTUS });
    } catch (e) {
      const v = await p.evaluate(() => ((document.getElementById('pinVirhe') || {}).textContent || '').trim()).catch(() => '');
      for (const k of ['p7Idag', 'p7Jag']) ulos.push(kaatunut(NAKYMAT[k], kieli, 'pelaajan kirjautuminen epäonnistui' + (v ? ': ' + v.slice(0, 120) : '')));
      return;
    }
    await p.evaluate(() => { if (typeof _suljeTervetulo === 'function') _suljeTervetulo(); tab('tanaan'); }).catch(() => {});
    ulos.push(await mittaa(p, NAKYMAT.p7Idag, kieli, tila, kerays));
    await p.evaluate(() => { tab('mina'); document.querySelectorAll('.mgrp').forEach((g) => g.classList.add('open')); }).catch(() => {});
    ulos.push(await mittaa(p, NAKYMAT.p7Jag, kieli, tila, kerays));
  } finally { await ctx.close(); tila.nyky = null; }
}

export async function aja(env, opts) {
  const o = opts || {}, alku = Date.now();
  const puuttuu = secretitPuuttuvat(env);
  if (puuttuu.length) return { ohitettu: 'secretit puuttuvat (' + puuttuu.join(', ') + ')' };
  const k = kanavaUrl(env.TM_SAVU_URL);
  if (!k.ok) return { ohitettu: k.syy };
  const { chromium } = await import('playwright-core');
  const selain = await chromium.launch({ headless: true, executablePath: env.TM_CHROME_PATH || undefined });
  const nakymat = [], tila = { nyky: null, kuvat: o.kuvat || null };
  try {
    for (const kieli of o.kielet || ['fi', 'sv']) {
      await henkilokunta(selain, k.url, kieli, env, tila, nakymat);
      await pelaaja(selain, k.url, kieli, env, tila, nakymat);
    }
  } finally { await selain.close(); }
  return { url: k.url, kesto_s: Math.round((Date.now() - alku) / 1000), nakymat };
}

async function main() {
  const env = process.env;
  if (env.GITHUB_ACTIONS === 'true') for (const s of SECRETIT) { const v = String(env[s] || '').trim(); if (v) process.stdout.write('::add-mask::' + v + '\n'); }
  const tulosPolku = argArvo('--tulos'), issuePolku = argArvo('--issue'), kielet = (argArvo('--kielet') || 'fi,sv').split(',').filter(Boolean);
  const tulos = await aja(env, { kielet, kuvat: tulosPolku ? join(dirname(tulosPolku), 'kuvat') : null });
  const md = yhteenvetoMarkdown(tulos);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, md);
  process.stdout.write(md);
  if (tulosPolku) { mkdirSync(dirname(tulosPolku), { recursive: true }); writeFileSync(tulosPolku, JSON.stringify(tulos, null, 1) + '\n'); }
  if (tulos.ohitettu) return 0;
  const ok = onnistui(tulos);
  if (!ok && issuePolku) { mkdirSync(dirname(issuePolku), { recursive: true }); writeFileSync(issuePolku, issueRunko(tulos, env.GITHUB_SERVER_URL && env.GITHUB_RUN_ID ? env.GITHUB_SERVER_URL + '/' + env.GITHUB_REPOSITORY + '/actions/runs/' + env.GITHUB_RUN_ID : '')); }
  return ok ? 0 : 1;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().then((c) => process.exit(c), (e) => { console.error('savutesti kaatui: ' + (e && e.message)); process.exit(1); });
