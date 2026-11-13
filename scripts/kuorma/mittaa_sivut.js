#!/usr/bin/env node
'use strict';
/* mittaa_sivut.js — projekti 06 PR 3: sivujen latausmittaus Playwrightilla stagingin Hosting-kanavalla `kuorma` (VAIHE0 3.1, P11). Tero ajaa; VAIN staging (URL-vartija).
 *   STAGING_APPCHECK_DEBUG_TOKEN=<token> ! node scripts/kuorma/mittaa_sivut.js --url=https://talentmaster-staging--kuorma-<tunniste>.web.app --tunnukset=.briefit/staging_tunnukset.txt
 * Valinnat: --seura=1 (kohdeseura, oletus 1 = suurin 500 pelaajaa) · --toistot=5 · --profiilit=tyopoyta,puhelin · --sivut=seura,vp,master,kehitys,testaus,pelaaja · --ulos=mittaus_tulokset/sivut.json · --erittely (Firestore-lukujen erittely polku ← kutsuja + sovelluksen [lista]-konsoliviestit; talletetaan 1. kylmän avauksen tulokseen ja tulostetaan) · --kuiva (tulostaa suunnitelman, ei avaa selainta).
 * Profiilit: tyopoyta = 1366×768, ei kuristusta (kaapeli) · puhelin = 390×844 mobiili + Slow 4G (CDP: 1,6 Mbit/s alas, 750 kbit/s ylös, 150 ms viive) + CPU 4×.
 * Per avaus (KYLMÄ = uusi konteksti ilman välimuistia; LÄMMIN = heti perään toinen avaus samassa kontekstissa): FCP, aika interaktiiviseksi (mittaus_lib.laskeInteraktiivinen: ei pitkiä tehtäviä eikä avoimia Firestore-lukuja 2 s ikkunassa),
 *   Firestore-lukujen määrä kokoelmittain (mittaus_instrumentointi.js), siirretyt tavut (CDP Network). Toisto 5× → mediaani + p95. Kirjautuminen @kuorma.test-tunnuksella (selain-SDK:n signInWithEmailAndPassword; salasana ei tulosteeseen/JSONiin).
 * Token: vain ympäristömuuttujasta; ei tulosteeseen, ei JSONiin. Cloud Monitoring read_count (laskutuksen totuus) liitetään jälkikäteen: mittaa_monitoring.js. */
const fs = require('fs'), path = require('path');
const M = require('./mittaus_lib.js');
const { instrumentointi } = require('./mittaus_instrumentointi.js');

const SIVUT = Object.freeze({
  seura: { tiedosto: 'TalentMaster_Seura.html', rooli: 'vp' },
  vp: { tiedosto: 'TalentMaster_VP_v25.html', rooli: 'vp' },
  master: { tiedosto: 'TalentMaster_Master_v16.html', rooli: 'talenttivalmentaja' },
  kehitys: { tiedosto: 'TalentMaster_Kehitystyopoyta.html', rooli: 'valmentaja1', pelaajaHaku: true },   // ilman #pelaaja/<id>-hashia sivu ohjaa Masterin Pelaajat-listalle (_ktListalle) → mitattaisiin väärää sivua
  testaus: { tiedosto: 'TalentMaster_Testaus_v9.html', rooli: 'talenttivalmentaja' },
  pelaaja: { tiedosto: 'TalentMaster_Pelaaja_v7.html', rooli: 'pelaaja' },   // PalloID + PIN → pelaajaKirjaudu → custom token (generoi_aineisto.js --pin-pelaaja luo tunnuksen); puuttuva tunnus → mitataan kirjautumattomana + varoitus
});
const PROFIILIT = Object.freeze({
  tyopoyta: { nimi: 'tyopoyta', konteksti: { viewport: { width: 1366, height: 768 } }, verkko: null, cpu: 1 },
  puhelin: { nimi: 'puhelin', konteksti: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
    verkko: { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 }, cpu: 4 },
});
const IKKUNA_MS = 2000, TIMEOUT_MS = 90000, SEURAAN_KIRJAUTUMINEN = 'TalentMaster_Seura.html';

function lueArgv(argv) {
  const o = { url: undefined, tunnukset: '.briefit/staging_tunnukset.txt', seura: 1, toistot: 5, profiilit: Object.keys(PROFIILIT), sivut: Object.keys(SIVUT), ulos: 'mittaus_tulokset/sivut.json', kuiva: false, erittely: false, tuntematon: [] };
  (argv || []).forEach((a) => {
    if (a === '--kuiva') o.kuiva = true; else if (a === '--erittely') o.erittely = true; else if (a.indexOf('--url=') === 0) o.url = a.slice(6).replace(/\/$/, ''); else if (a.indexOf('--tunnukset=') === 0) o.tunnukset = a.slice(12);
    else if (a.indexOf('--seura=') === 0) o.seura = +a.slice(8); else if (a.indexOf('--toistot=') === 0) o.toistot = +a.slice(10); else if (a.indexOf('--profiilit=') === 0) o.profiilit = a.slice(12).split(',');
    else if (a.indexOf('--sivut=') === 0) o.sivut = a.slice(8).split(','); else if (a.indexOf('--ulos=') === 0) o.ulos = a.slice(7); else o.tuntematon.push(a);
  });
  return o;
}
function tarkista(o, env, urlSallittu) {
  if (o.tuntematon.length) return 'Tuntematon valinta (' + o.tuntematon.length + ' kpl).';
  if (!(urlSallittu || M.kanavaUrlSallittu)(o.url)) return 'URL ei ole stagingin Hosting (https://talentmaster-staging[--kanava].web.app) — ajo keskeytetty (tuotantoa ei mitata).';
  if (!(o.seura >= 1 && o.seura <= 99) || !(o.toistot >= 1 && o.toistot <= 50)) return 'Virheellinen --seura tai --toistot.';
  if (o.profiilit.some((p) => !PROFIILIT[p]) || o.sivut.some((s) => !SIVUT[s])) return 'Tuntematon profiili tai sivu.';
  if (!o.kuiva && !(env && env.STAGING_APPCHECK_DEBUG_TOKEN)) return 'STAGING_APPCHECK_DEBUG_TOKEN puuttuu ympäristöstä (GitHub Secret → export; ei repoon, ei tulosteeseen).';
  return null;
}

/** Resurssikohtainen erittely (P1): url ilman kyselyosaa (ei tunnisteita), tyyppi, koodattu (verkko) ja purettu tavumäärä, pakkaus. data:-URL:t ohitetaan. */
function resurssiLista(pyynnot) {
  const out = [];
  pyynnot.forEach((p) => { if (!p.url || p.url.indexOf('data:') === 0) return; out.push({ url: String(p.url).split('?')[0].split('#')[0], tyyppi: p.tyyppi, koodattu: p.valmis ? p.loppu : p.tavut, purettu: p.purettu, pakkaus: p.pakkaus || null }); });
  return out;
}
/** Tallennettava tiivistelmä yhdestä avauksesta: ryhmät tyypeittäin + 60 suurinta resurssia. */
function resurssiYhteenveto(lista) {
  const ryhmat = {}; (lista || []).forEach((r) => { const g = ryhmat[r.tyyppi] = ryhmat[r.tyyppi] || { n: 0, koodattu: 0, purettu: 0 }; g.n++; g.koodattu += r.koodattu; g.purettu += r.purettu; });
  return { ryhmat, top: (lista || []).slice().sort((a, b) => b.koodattu - a.koodattu).slice(0, 60) };
}

/** Vartija (kaikille sivuille): lopullisen URL:n polun pitää päättyä mitattavaan tiedostoon. Uudelleenohjaus toiseen sivuun = virhe (ei hiljaista mittausta väärästä sivusta). → null | virheteksti. */
function tarkistaLopullinenUrl(odotettuTiedosto, lopullinen) {
  let u; try { u = new URL(lopullinen); } catch (e) { return 'uudelleenohjaus: lopullinen URL ei jäsenny (' + String(lopullinen).slice(0, 120) + ')'; }
  const tiedosto = decodeURIComponent(u.pathname.split('/').pop() || '');
  return tiedosto === odotettuTiedosto ? null : 'uudelleenohjaus: mitattavaksi tarkoitettu ' + odotettuTiedosto + ', mutta lopullinen sivu on ' + (tiedosto || u.pathname) + ' (' + naytaUrl(lopullinen) + ')';
}
/** Tulostettava URL: ilman kyselyosaa (ei tunnisteita/tokeneita), hash mukana (#pelaaja/<id>/… on mittauksen kohde). */
function naytaUrl(url) { try { const u = new URL(url); return u.origin + u.pathname + (u.hash || ''); } catch (e) { return String(url).split('?')[0]; } }
/** Kehitystyöpöydän kohde: kirjautuneen valmentajan ensimmäisen joukkueen ensimmäinen pelaaja (lista_joukkue-koosteesta, varalla pelaajat-kysely; ei kovakoodattua id:tä). Ajetaan kirjautuneessa sivussa (selain-SDK). → { seuraId, pelaajaId } | { virhe }. */
async function haePelaajaKohde(page) {
  return page.evaluate(async () => {
    try {
      const au = firebase.auth(), u = au.currentUser, tok = await u.getIdTokenResult(true), sid = tok.claims && tok.claims.seuraId; if (!sid) return { virhe: 'seuraId puuttuu claimeista' };
      const db = firebase.firestore(), seura = db.collection('seurat').doc(sid), k = await seura.collection('kayttajat').doc(u.uid).get(), d = k.exists ? k.data() : {}, jid = (d.joukkueet || [])[0];
      if (!jid) return { virhe: 'valmentajalla ei joukkuetta (kayttajat.joukkueet tyhjä)' };
      const ls = await seura.collection('lista_joukkue').doc(jid).get(); let pid = ls.exists && ls.data() && Array.isArray(ls.data().rivit) && ls.data().rivit[0] ? ls.data().rivit[0].id : null;
      if (!pid) { const q = await seura.collection('pelaajat').where('joukkueet', 'array-contains', jid).limit(1).get(); pid = q.docs[0] ? q.docs[0].id : null; }
      return pid ? { seuraId: sid, pelaajaId: pid } : { virhe: 'joukkueelta ' + jid + ' ei löydy pelaajaa' };
    } catch (e) { return { virhe: 'haku epäonnistui (' + (e && e.code || e && e.message) + ')' }; }
  });
}

/** Yksi avaus (kylmä tai lämmin) sivulle `page`. → { fcp_ms, tti_ms, luvut, dokTavut, dokEiMitattu, yht, tavut, kirjautunut, kiinnitetty, virhe } */
async function mittaaAvaus(page, cdp, url, opt) {
  const ikkuna = (opt && opt.ikkuna) || IKKUNA_MS, aikaraja = (opt && opt.aikaraja) || TIMEOUT_MS, pyynnot = new Map();
  let wsTavut = 0; const konsoli = [], konsoliKuuntelija = (m) => { try { const t = m.text(); if (/^\[(lista|kt|sisainen)[^\]]*\]/i.test(t) && konsoli.length < 40) konsoli.push(t.slice(0, 200)); } catch (e) {} }; if (opt && opt.erittely) page.on('console', konsoliKuuntelija);
  const kuuntelijat = [['Network.requestWillBeSent', (e) => pyynnot.set(e.requestId, { valmis: false, tavut: 0, loppu: 0, purettu: 0, url: e.request && e.request.url, tyyppi: e.type || 'Other' })], ['Network.responseReceived', (e) => { const p = pyynnot.get(e.requestId); if (p) { const h = (e.response && e.response.headers) || {}, k = Object.keys(h).find((x) => x.toLowerCase() === 'content-encoding'); p.pakkaus = k ? String(h[k]) : null; if (e.type) p.tyyppi = e.type; } }], ['Network.dataReceived', (e) => { const p = pyynnot.get(e.requestId); if (p) { p.tavut += e.encodedDataLength || 0; p.purettu += e.dataLength || 0; } }],
    ['Network.loadingFinished', (e) => { const p = pyynnot.get(e.requestId); if (p) { p.valmis = true; p.loppu = e.encodedDataLength || 0; } }], ['Network.webSocketFrameReceived', (e) => { wsTavut += (e.response && e.response.payloadData ? e.response.payloadData.length : 0); }]];
  kuuntelijat.forEach(([n, f]) => cdp.on(n, f));
  let virhe = null;
  try { await page.goto(url, { waitUntil: 'commit', timeout: aikaraja }); } catch (e) { virhe = 'navigointi: ' + String(e && e.message).split('\n')[0]; }
  const alku = Date.now(); let tila = null;
  while (!virhe && Date.now() - alku < aikaraja) {
    await page.waitForTimeout(300);
    try { tila = await page.evaluate(() => { const m = window.__tmM; if (!m) return null; return { fcp: m.fcp, varit: m.varit.slice(), avoimet: m.avoimet, nyt: performance.now() }; }); } catch (e) { tila = null; continue; }   // navigointi kesken
    if (tila && tila.fcp != null && tila.avoimet === 0 && M.laskeInteraktiivinen({ fcp: tila.fcp, varit: tila.varit, ikkuna, havaintoLoppu: tila.nyt }) != null) break;
  }
  let lopullinen = null;
  try { lopullinen = await page.evaluate(() => { const m = window.__tmM; if (!m) return null; let k = null; try { k = !!(window._auth ? window._auth.currentUser : (window.firebase && firebase.auth && firebase.auth().currentUser)); } catch (e) {}   /* window._auth = Pelaaja_v7:n nimetty app 'tm-pelaaja' (ei oletusappia) */ return { fcp: m.fcp, varit: m.varit.slice(), luvut: m.luvut, erittely: m.erittely, dokTavut: m.dokTavut, dokEiMitattu: m.dokEiMitattu, yht: m.yht, kiinnitetty: m.kiinnitetty, virheet: m.virheet, kirjautunut: k, nyt: performance.now() }; }); } catch (e) { virhe = virhe || 'luku: ' + String(e && e.message).split('\n')[0]; }
  const lopullinenUrl = naytaUrl(page.url()), urlVirhe = opt && opt.odotettuTiedosto ? tarkistaLopullinenUrl(opt.odotettuTiedosto, page.url()) : null; if (urlVirhe && !virhe) virhe = urlVirhe;
  kuuntelijat.forEach(([n, f]) => cdp.off && cdp.off(n, f)); if (opt && opt.erittely) page.off('console', konsoliKuuntelija);
  let tavut = wsTavut; pyynnot.forEach((p) => { tavut += p.valmis ? p.loppu : p.tavut; });
  if (!lopullinen) return { virhe: virhe || 'instrumentointi puuttuu', lopullinen_url: lopullinenUrl, tavut, resurssit: resurssiLista(pyynnot) };
  const tti = M.laskeInteraktiivinen({ fcp: lopullinen.fcp, varit: lopullinen.varit, ikkuna, havaintoLoppu: lopullinen.nyt });
  return { lopullinen_url: lopullinenUrl, resurssit: resurssiLista(pyynnot), fcp_ms: lopullinen.fcp != null ? Math.round(lopullinen.fcp) : null, tti_ms: tti != null ? Math.round(tti) : null, luvut: lopullinen.luvut, erittely: (opt && opt.erittely) ? lopullinen.erittely : undefined, konsoli: (opt && opt.erittely) ? konsoli : undefined, dokTavut: lopullinen.dokTavut, dokEiMitattu: lopullinen.dokEiMitattu, yht: lopullinen.yht, tavut, kirjautunut: lopullinen.kirjautunut, kiinnitetty: lopullinen.kiinnitetty, virheet: lopullinen.virheet.length, virhe };
}

/** --erittely: lukemat polku ← kutsuja -järjestyksessä (suurin ensin) + osuus kokonaisluvusta + sovelluksen [lista]-konsoliviestit (esim. "[lista] vanha polku: <syy>"). */
function erittelyTeksti(sivu, profiili, avaus) {
  const e = avaus.erittely || {}, yht = avaus.yht || 0, rivit = Object.keys(e).map((k) => ({ k, n: e[k].n, kutsuja: e[k].kutsuja })).sort((a, b) => b.n - a.n);
  const ul = ['  ERITTELY ' + sivu + ' · ' + profiili + ' · 1. kylmä · ' + yht + ' lukua'];
  rivit.slice(0, 25).forEach((r) => ul.push('    ' + String(r.n).padStart(5) + ' ' + (yht ? (100 * r.n / yht).toFixed(1).padStart(5) + ' %' : '') + '  ' + r.k + (r.kutsuja > 1 ? '  (' + r.kutsuja + ' kutsua)' : '')));
  if (rivit.length > 25) ul.push('    … +' + (rivit.length - 25) + ' riviä (koko lista JSONissa)');
  (avaus.konsoli || []).forEach((t) => ul.push('    konsoli: ' + t));
  return ul.join('\n');
}

async function kuristus(cdp, profiili) {
  await cdp.send('Network.enable');
  if (profiili.verkko) await cdp.send('Network.emulateNetworkConditions', profiili.verkko);
  if (profiili.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: profiili.cpu });
}

/** Kirjautuminen: avaa Seura-sivu, kirjaudu SDK:lla (default app), palauta storageState MUISTISSA (sisältää tunnisteet — ei levylle). */
async function kirjaudu(selain, base, tunnus, token, M2, sivu, kohde) {   // kohde (valinnainen objekti): täytetään { seuraId, pelaajaId } kirjautuneessa sivussa ennen sulkemista
  const ctx = await selain.newContext({ viewport: { width: 1366, height: 768 } }); await ctx.addInitScript(instrumentointi, { token });
  const page = await ctx.newPage();
  try {
    await page.goto(base + '/' + (tunnus.palloId ? sivu : SEURAAN_KIRJAUTUMINEN), { waitUntil: 'load', timeout: TIMEOUT_MS });
    await page.waitForFunction(() => window.firebase && firebase.auth && firebase.apps && firebase.apps.length > 0, null, { timeout: 30000 });
    if (tunnus.palloId) await page.waitForFunction(() => window._fbApp && window._auth, null, { timeout: 30000 });
    /* Pelaaja (tunnus.palloId): sama polku kuin Pelaaja_v7 _kirjaudu() — pelaajaKirjaudu({ liittoTunnus, pin }) europe-west1 (App Check: debug-token) → signInWithCustomToken. Henkilökunta: sähköposti + salasana. */
    const r = await page.evaluate(async (t) => {
      try {
        if (t.palloId) { const app = window._fbApp || firebase.app(), au = window._auth || firebase.auth(); const v = await app.functions('europe-west1').httpsCallable('pelaajaKirjaudu')({ liittoTunnus: t.palloId, pin: t.salasana }); await au.signInWithCustomToken(v.data.token); }
        else await firebase.auth().signInWithEmailAndPassword(t.email, t.salasana);
        return { ok: true };
      } catch (e) { return { ok: false, koodi: e && e.code }; }
    }, tunnus);
    if (!r.ok) throw new Error('kirjautuminen epäonnistui (' + (r.koodi || 'tuntematon') + ')');
    await page.waitForFunction(() => (window._auth || firebase.auth()).currentUser, null, { timeout: 15000 }); await page.waitForTimeout(1500);   // anna IndexedDB-persistenssin kirjoittaa
    if (kohde) { const k = await haePelaajaKohde(page); if (k.virhe) throw new Error('mittauskohteen haku: ' + k.virhe); Object.assign(kohde, k); }
    return await ctx.storageState({ indexedDB: true });
  } catch (e) { throw new Error(M.piilota(e && e.message, M2)); } finally { await ctx.close(); }
}

function yhteenveto(avaukset) {
  const ok = avaukset.filter((a) => !a.virhe);
  return { n: avaukset.length, virheita: avaukset.length - ok.length, tti_s: stats(ok.map((a) => a.tti_ms), 1000), fcp_s: stats(ok.map((a) => a.fcp_ms), 1000), lukuja: stats(ok.map((a) => a.yht), 1), mb: stats(ok.map((a) => a.tavut), 1e6) };
}
function stats(arvot, jakaja) { const s = M.tilasto(arvot.filter((x) => typeof x === 'number')); const k = (x) => (x == null ? null : Math.round(x / jakaja * 1000) / 1000); return { n: s.n, mediaani: k(s.mediaani), p95: k(s.p95), min: k(s.min), max: k(s.max) }; }

// Osa-ajo (--sivut=pelaaja) EI saa korvata aiempia sivuja: yhdistetään (sivu, profiili) -parein, uusi mittaus korvaa saman parin. Eri isäntä/seura/toistot → ei yhdistetä (vertailukelvoton), aiempi tiedosto ylikirjoitetaan.
function lueAiempi(polku) { try { const j = JSON.parse(fs.readFileSync(polku, 'utf8')); return j && j.meta && Array.isArray(j.mittaukset) ? j : null; } catch (e) { return null; } }
function yhdistaTulokset(aiempi, uusi, kirjaa) {
  if (!aiempi) return uusi;
  const sama = aiempi.meta.isanta === uusi.meta.isanta && aiempi.meta.seura === uusi.meta.seura && aiempi.meta.toistot === uusi.meta.toistot;
  if (!sama) { if (kirjaa) kirjaa('  ⚠ Aiempi tulostiedosto on eri isännältä/seuralta/toistoilta → ei yhdistetä, ylikirjoitetaan.'); return uusi; }
  const avain = (m) => m.sivu + '|' + m.profiili, uudet = new Set(uusi.mittaukset.map(avain));
  const mittaukset = aiempi.mittaukset.filter((m) => !uudet.has(avain(m))).concat(uusi.mittaukset);
  const meta = Object.assign({}, uusi.meta, { aika: aiempi.meta.aika < uusi.meta.aika ? aiempi.meta.aika : uusi.meta.aika, kesto_s: (aiempi.meta.kesto_s || 0) + uusi.meta.kesto_s, yhdistetty: true });   // ikkuna kattaa kaikki ajot (Monitoring read_count)
  if (kirjaa) kirjaa('  Yhdistetty aiempaan tulostiedostoon: ' + mittaukset.length + ' sivu×profiili-riviä (uusia ' + uusi.mittaukset.length + '). Aja mittaa_monitoring.js uudelleen koko ikkunalle.');
  return { meta, mittaukset };   // monitoring-lohko jätetään pois: vanha summa ei kata uutta ajoa
}
async function main(argv, deps) {
  const d = deps || {}, kirjaa = d.kirjaa || ((r) => console.log(r)), virhe = d.virhe || ((r) => console.error(r)), env = d.env || process.env, o = lueArgv(argv), v = tarkista(o, env, d.urlSallittu);   // d.urlSallittu = vain testien injektio (CLI ei aseta)
  if (v) { virhe(v); return 2; }
  const suunnitelma = o.sivut.length * o.profiilit.length * o.toistot * 2;
  kirjaa('SIVUMITTAUS ' + (o.kuiva ? '(KUIVA-AJO, ei avaa selainta)' : '') + ' · ' + o.url + ' · seura s' + String(o.seura).padStart(2, '0') + ' · sivut ' + o.sivut.join(',') + ' · profiilit ' + o.profiilit.join(',') + ' · ' + o.toistot + ' toistoa → ' + suunnitelma + ' avausta (kylmä+lämmin)');
  if (o.kuiva) { o.sivut.forEach((s) => kirjaa('  ' + s + ' → ' + SIVUT[s].tiedosto + ' · rooli ' + (SIVUT[s].rooli || 'ei kirjautumista'))); return 0; }
  let tunnukset, tunnusTeksti; try { tunnusTeksti = fs.readFileSync(o.tunnukset, 'utf8'); tunnukset = M.lueTunnukset(tunnusTeksti); } catch (e) { virhe('Tunnustiedostoa ei voitu lukea (' + o.tunnukset + ').'); return 2; }
  const chromePolku = env.TM_CHROME_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p));
  const { chromium } = d.playwright || require('playwright-core'), selain = await chromium.launch({ executablePath: chromePolku, args: ['--no-sandbox', '--hide-scrollbars'] });
  const token = env.STAGING_APPCHECK_DEBUG_TOKEN, alkuAika = new Date().toISOString(), t0 = Date.now(), tulos = { meta: { aika: alkuAika, isanta: new URL(o.url).host, seura: o.seura, toistot: o.toistot, ikkuna_ms: IKKUNA_MS, kuristus: { puhelin: PROFIILIT.puhelin.verkko, cpu: PROFIILIT.puhelin.cpu } }, mittaukset: [] };
  const tilat = {}, kohteet = {};
  try {
    for (const sivuAvain of o.sivut) {
      const s = SIVUT[sivuAvain]; let tila;
      if (s.rooli) {
        if (!(s.rooli in tilat)) {
          let t = M.haeTunnus(tunnukset, s.rooli, o.seura);
          if (t && s.rooli === 'pelaaja') { const pid = M.haePalloId(tunnusTeksti, o.seura); t = pid ? Object.assign({ palloId: pid }, t) : null; }
          if (!t && s.rooli === 'pelaaja') { virhe('  ⚠ Pelaajan PalloID + PIN -tunnusta ei löydy (seura ' + o.seura + ') — pelaaja-sivu mitataan KIRJAUTUMATTOMANA (vain kirjautumisnäkymä). Luo tunnus: generoi_aineisto.js --pin-pelaaja (tai --vain-pinit).'); tilat[s.rooli] = null; }
          else if (!t) { virhe('Tunnusta ei löydy (rooli ' + s.rooli + ', seura ' + o.seura + ').'); await selain.close(); return 2; }
          else { kirjaa('  kirjaudutaan: rooli ' + s.rooli); try { const kohde = s.pelaajaHaku ? {} : null; tilat[s.rooli] = await kirjaudu(selain, o.url, t, token, tunnukset, s.tiedosto, kohde); if (kohde) kohteet[s.rooli] = kohde; } catch (e) { virhe('  ' + e.message); await selain.close(); return 1; } }
        }
        tila = tilat[s.rooli] || undefined;
      }
      for (const pAvain of o.profiilit) {
        const prof = PROFIILIT[pAvain], kylmat = [], lampimat = []; let resKylma = null;
        for (let i = 1; i <= o.toistot; i++) {
          const ctx = await selain.newContext(Object.assign({}, prof.konteksti, tila ? { storageState: tila } : {})); await ctx.addInitScript(instrumentointi, { token, erittely: o.erittely });
          const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page); await kuristus(cdp, prof);
          const kh = s.pelaajaHaku ? kohteet[s.rooli] : null; if (s.pelaajaHaku && !(kh && kh.pelaajaId)) { virhe('  mittauskohdetta (pelaaja) ei saatu — ' + sivuAvain + ' ei mitata ilman sitä.'); await ctx.close(); await selain.close(); return 1; }
          const url = o.url + '/' + s.tiedosto + (kh ? '#pelaaja/' + encodeURIComponent(kh.pelaajaId) + '/tanaan' : ''), kylma = await mittaaAvaus(page, cdp, url, { erittely: o.erittely, odotettuTiedosto: s.tiedosto });
          if (kylma.virhe && /^uudelleenohjaus/.test(kylma.virhe)) { virhe('  ✗ ' + sivuAvain + ' · ' + pAvain + ': ' + kylma.virhe + ' — mittaus keskeytetty (väärää sivua ei mitata).'); await ctx.close(); await selain.close(); return 1; }
          const lampimasti = await mittaaAvaus(page, cdp, url, { odotettuTiedosto: s.tiedosto });
          if (lampimasti.virhe && /^uudelleenohjaus/.test(lampimasti.virhe)) { virhe('  ✗ ' + sivuAvain + ' · ' + pAvain + ' (lämmin): ' + lampimasti.virhe + ' — mittaus keskeytetty.'); await ctx.close(); await selain.close(); return 1; }
          if (i === 1) resKylma = resurssiYhteenveto(kylma.resurssit); delete kylma.resurssit; delete lampimasti.resurssit;   // JSON pysyy pienenä: erittely vain 1. kylmästä
          kylmat.push(kylma); lampimat.push(lampimasti);
          kirjaa('  ' + sivuAvain + ' · ' + pAvain + ' · ' + i + '/' + o.toistot + ' · ' + (kylma.lopullinen_url || '?') + ' · kylmä: interaktiivinen ' + (kylma.tti_ms != null ? (kylma.tti_ms / 1000).toFixed(1) + ' s' : (kylma.virhe || 'ei rauhoittunut')) + ', ' + (kylma.yht != null ? kylma.yht : '?') + ' lukua, ' + ((kylma.tavut || 0) / 1e6).toFixed(2) + ' MB · lämmin: ' + (lampimasti.tti_ms != null ? (lampimasti.tti_ms / 1000).toFixed(1) + ' s' : '?') + (kylma.kirjautunut === false && tila ? ' · ⚠ EI KIRJAUTUNUT' : ''));
          if (i === 1 && o.erittely) kirjaa(erittelyTeksti(sivuAvain, pAvain, kylma));
          if (i === 1 && kylma.kiinnitetty === false) { virhe('  ⚠ Firestore-instrumentointi ei kiinnittynyt (compat-SDK:n nimiavaruutta ei löytynyt) — lukuja ei lasketa; käytä Monitoring read_countia.'); }
          await ctx.close();
        }
        tulos.mittaukset.push({ sivu: sivuAvain, profiili: pAvain, rooli: tila ? s.rooli : null, kylma: kylmat, lampimat, resurssit_kylma: resKylma, yhteenveto: { kylma: yhteenveto(kylmat), lampimat: yhteenveto(lampimat) } });
      }
    }
  } finally { await selain.close(); }
  tulos.meta.loppu = new Date().toISOString(); tulos.meta.kesto_s = Math.round((Date.now() - t0) / 1000);
  const yhdistetty = yhdistaTulokset(lueAiempi(o.ulos), tulos, kirjaa);
  fs.mkdirSync(path.dirname(o.ulos), { recursive: true }); fs.writeFileSync(o.ulos, JSON.stringify(yhdistetty, null, 2) + '\n');
  kirjaa('Valmis ' + tulos.meta.kesto_s + ' s · ' + o.ulos + ' · seuraava: mittaa_monitoring.js --tulos=' + o.ulos + ' (read_count, viive muutama min) → mittaus_raportti.js');
  return 0;
}
if (require.main === module) main(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => { console.error('Virhe: ' + String(e && e.message || e).split('\n')[0]); process.exit(2); });
module.exports = { tarkistaLopullinenUrl, naytaUrl, haePelaajaKohde, main, erittelyTeksti, yhdistaTulokset, resurssiLista, resurssiYhteenveto, lueArgv, tarkista, mittaaAvaus, SIVUT, PROFIILIT, IKKUNA_MS };
