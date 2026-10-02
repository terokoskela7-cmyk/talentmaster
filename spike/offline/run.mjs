// Erä 0 -spike: ajaa harness.html:n headless Chromella Firebase-emulaattoreita vasten (Auth 9099, Firestore 8080).
// Käyttö:  firebase emulators:exec --only firestore,auth --project demo-tm-spike "node spike/offline/run.mjs [skenaario...]"
import http from 'http'; import fs from 'fs'; import path from 'path'; import os from 'os'; import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 3001, CDPPORT = 9333, PROJ = 'demo-tm-spike';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FS = `http://127.0.0.1:8080`, AU = `http://127.0.0.1:9099`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = {}; const arg = process.argv.slice(2);

// ── staattinen palvelin ──
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));

// ── CDP ──
class Chrome {
  async start() {
    this.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-spike-'));
    this.proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDPPORT}`, `--user-data-dir=${this.dir}`, '--no-first-run', '--disable-gpu', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
    for (let i = 0; i < 60; i++) { try { const j = await (await fetch(`http://127.0.0.1:${CDPPORT}/json/version`)).json(); this.wsUrl = j.webSocketDebuggerUrl; break; } catch { await sleep(250); } }
    if (!this.wsUrl) throw new Error('Chrome ei käynnistynyt');
    this.ws = new WebSocket(this.wsUrl); await new Promise((r) => (this.ws.onopen = r));
    this.id = 0; this.cb = new Map(); this.ev = [];
    this.ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && this.cb.has(d.id)) { const { res, rej } = this.cb.get(d.id); this.cb.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); } else if (d.method) this.ev.push(d); };
  }
  send(method, params = {}, sessionId) { const id = ++this.id; return new Promise((res, rej) => { this.cb.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params, sessionId })); }); }
  async tab(url) {
    const { targetId } = await this.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
    const t = new Tab(this, sessionId, targetId); await t.init(); if (url) await t.goto(url); return t;
  }
  async stop() { try { this.ws.close(); } catch {} this.proc.kill('SIGTERM'); await sleep(300); fs.rmSync(this.dir, { recursive: true, force: true }); }
}
class Tab {
  constructor(c, s, t) { this.c = c; this.s = s; this.targetId = t; this.console = []; }
  send(m, p) { return this.c.send(m, p, this.s); }
  async init() { await this.send('Page.enable'); await this.send('Runtime.enable'); await this.send('Log.enable'); await this.send('Network.enable'); }
  async goto(url) { await this.send('Page.navigate', { url }); await sleep(300); await this.waitReady(); }
  async waitReady() { for (let i = 0; i < 80; i++) { try { const r = await this.eval('window.__ready ? "y" : "n"'); if (r === 'y') { await this.eval('window.__ready'); return; } } catch {} await sleep(150); } throw new Error('harness ei valmis'); }
  async eval(expr) { const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; }
  logs() { return this.c.ev.filter((e) => e.sessionId === this.s && (e.method === 'Log.entryAdded' || e.method === 'Runtime.consoleAPICalled')).map((e) => e.method === 'Log.entryAdded' ? `[${e.params.entry.level}] ${e.params.entry.text}`.slice(0, 200) : `[console.${e.params.type}] ${(e.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ')}`.slice(0, 200)); }
  offline(on) { return this.send('Network.emulateNetworkConditions', { offline: on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }
  block(on) { return this.send('Network.setBlockedURLs', { urls: on ? ['*127.0.0.1:8080*', '*127.0.0.1:9099*'] : [] }); }   // "palvelu ei tavoitettavissa" mutta sivu latautuu
  close() { return this.c.send('Target.closeTarget', { targetId: this.targetId }); }
}
const H = (q = '') => `http://127.0.0.1:${PORT}/spike/offline/harness.html${q}`;

// ── emulaattoriapurit ──
async function clearFs() { await fetch(`${FS}/emulator/v1/projects/${PROJ}/databases/(default)/documents`, { method: 'DELETE' }); }
async function clearAuth() { await fetch(`${AU}/emulator/v1/projects/${PROJ}/accounts`, { method: 'DELETE' }); }
async function mkUser(email, claims) {
  const r = await (await fetch(`${AU}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=x`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'salasana1', returnSecureToken: true }) })).json();
  await fetch(`${AU}/identitytoolkit.googleapis.com/v1/projects/${PROJ}/accounts:update`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer owner' }, body: JSON.stringify({ localId: r.localId, customAttributes: JSON.stringify(claims) }) });
  return r.localId;
}
async function setClaims(uid, claims) { await fetch(`${AU}/identitytoolkit.googleapis.com/v1/projects/${PROJ}/accounts:update`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer owner' }, body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify(claims) }) }); }
const val = (v) => typeof v === 'number' ? { integerValue: String(v) } : typeof v === 'boolean' ? { booleanValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(val) } } : v && typeof v === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, val(x)])) } } : { stringValue: String(v) };
async function seed(docs) {   // docs = [[polku, objekti]]; batch-commit Bearer owner (ohittaa Rulesit)
  for (let i = 0; i < docs.length; i += 400) {
    const writes = docs.slice(i, i + 400).map(([p, o]) => ({ update: { name: `projects/${PROJ}/databases/(default)/documents/${p}`, fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, val(v)])) } }));
    const r = await fetch(`${FS}/v1/projects/${PROJ}/databases/(default)/documents:commit`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer owner' }, body: JSON.stringify({ writes }) });
    if (!r.ok) throw new Error('seed: ' + (await r.text()).slice(0, 200));
  }
}
async function serverDoc(p) { const r = await fetch(`${FS}/v1/projects/${PROJ}/databases/(default)/documents/${p}`, { headers: { authorization: 'Bearer owner' } }); return r.status === 200; }
const COACH = { seuraId: 'kpv', rooli: 'valmentaja' };
async function loginCoach(tab, email = 'valmentaja@tm-testi.fi') { return tab.eval(`T.signIn(${JSON.stringify(email)},"salasana1")`); }
async function fresh() { await clearFs(); await clearAuth(); return mkUser('valmentaja@tm-testi.fi', COACH); }
const W = (tab, id, p, d, o) => tab.eval(`T.write(${JSON.stringify(id)},${JSON.stringify(p)},${JSON.stringify(d)},${JSON.stringify(o || {})})`);
const D = (tab, id, p) => tab.eval(`T.del(${JSON.stringify(id)},${JSON.stringify(p)})`);
const WS = (tab, id) => tab.eval(`T.writeState(${JSON.stringify(id)})`);
async function until(tab, ids, ms = 15000) { const t0 = Date.now(); for (;;) { const st = await Promise.all(ids.map((i) => WS(tab, i))); if (st.every((s) => s && s.state !== 'pending') || Date.now() - t0 > ms) return st; await sleep(200); } }

const SCEN = {
  // ── 1) enablePersistence + Auth LOCAL ──
  async s1(chrome) {
    const out = {};
    await fresh();
    // 1a persist-first
    let t = await chrome.tab(H('?order=persist-first&sync=1'));
    out['1a_init'] = await t.eval('T.info().init');
    out['1a_uid'] = await loginCoach(t);
    await W(t, 'a', 'seurat/kpv/harjoitusarvioinnit/a', { x: 1 }); out['1a_write'] = (await until(t, ['a']))[0];
    out['1a_storage'] = await t.eval('T.storage()');
    await t.goto(H('?order=persist-first&sync=1'));
    out['1a_reload'] = await t.eval('T.info().init');   // auth-sessio säilyy reloadin yli?
    out['1a_session_uid_after_reload'] = out['1a_reload'].uid;
    out['1a_cache_get_after_reload'] = await t.eval('T.get("seurat/kpv/harjoitusarvioinnit/a","cache")');
    // 1c kaksi välilehteä (sync)
    const t2 = await chrome.tab(H('?order=persist-first&sync=1'));
    out['1c_tab2_init'] = await t2.eval('T.info().init');
    await t.offline(true); await t2.offline(true);
    await W(t, 'm', 'seurat/kpv/harjoitusarvioinnit/multi', { kirjoittaja: 'tab1' });
    await t2.eval('T.watch("seurat/kpv/harjoitusarvioinnit/multi","tab2")'); await sleep(1500);
    out['1c_tab2_nakee_tab1_odottavan'] = await t2.eval('window.__log.filter(function(e){return e.k=="snap:tab2"}).slice(-2)');
    await t.offline(false); await t2.offline(false); await until(t, ['m']);
    out['1c_after_online'] = (await WS(t, 'm'));
    await t2.close();
    // 1b myöhäinen enablePersistence (ensin Firestore-kutsu) — "IndexedDB-konflikti"-epäily
    await t.close(); await chrome.stop(); await chrome.start();
    t = await chrome.tab(H('?order=late&sync=1'));
    out['1b_late'] = await t.eval('T.info().init');
    // 1b2: ilman synchronizeTabs, kaksi välilehteä
    const a = await chrome.tab(H('?order=persist-first&sync=0'));
    const b = await chrome.tab(H('?order=persist-first&sync=0'));
    out['1b2_nosync_tab1'] = await a.eval('T.info().init'); out['1b2_nosync_tab2'] = await b.eval('T.info().init');
    // 1d: uloskirjautumisen tyhjennys (terminate + clearPersistence)
    await a.close(); await b.close();
    t = await chrome.tab(H('?order=persist-first&sync=1')); await loginCoach(t);
    await t.offline(true); await W(t, 'q', 'seurat/kpv/harjoitusarvioinnit/jonossa', { x: 1 });
    out['1d_pending_ennen'] = await t.eval('T.pending(1500)');
    out['1d_clear_with_pending'] = await t.eval('T.clear()');
    out['1d_storage_after'] = await t.eval('T.storage()');
    out.logs = t.logs().slice(-6); return out;
  },
  // ── 3) hylätyn kirjoituksen näkyvyys ──
  // "Hylätty kirjoitus" = delete suojattuun dokumenttiin (luku sallittu, poisto vain SA) → paikallinen näkymä FLIPPAA takaisin hylkäyksessä.
  async s3(chrome) {
    const out = {}; await fresh();
    await seed([['seurat/kpv', { nimi: 'KPV' }], ['seurat/kpv/harjoitusarvioinnit/suojattu1', { malli: 'palloliitto' }], ['seurat/kpv/harjoitusarvioinnit/suojattu2', { malli: 'palloliitto' }]]);
    let t = await chrome.tab(H('?order=persist-first&sync=1')); await loginCoach(t);
    const ev = async (names) => t.eval('window.__log.filter(function(e){return /^snap/.test(e.k)}).map(function(e){return e.k+":"+(e.v.exists!==undefined?(e.v.exists?"on":"EI")+(e.v.pending?"+odottaa":"")+(e.v.cache?"+cache":""):e.v)})');
    await t.eval('T.watch("seurat/kpv/harjoitusarvioinnit/suojattu1","s1")'); await t.eval('T.watch("seurat/kpv/harjoitusarvioinnit/ok1","ok1")'); await sleep(800);
    // 3a online: hylkäys heti
    await D(t, 'del_online', 'seurat/kpv/harjoitusarvioinnit/suojattu1'); out['3a_online_delete_denied'] = (await until(t, ['del_online']))[0];
    // 3b offline: sallittu set + kielletty delete, sivu pysyy auki
    await t.offline(true); await sleep(300);
    await W(t, 'ok1', 'seurat/kpv/harjoitusarvioinnit/ok1', { malli: 'palloliitto' }); await D(t, 'del1', 'seurat/kpv/harjoitusarvioinnit/suojattu1'); await sleep(500);
    out['3b_offline_state'] = await Promise.all([WS(t, 'ok1'), WS(t, 'del1')]);
    out['3b_pending_offline'] = await t.eval('T.pending(1500)');
    await t.offline(false); out['3b_after_online_promiset'] = await until(t, ['ok1', 'del1'], 20000);
    out['3b_pending_after'] = await t.eval('T.pending(3000)');
    out['3b_server_ok1'] = await serverDoc('seurat/kpv/harjoitusarvioinnit/ok1'); out['3b_server_suojattu1_olemassa'] = await serverDoc('seurat/kpv/harjoitusarvioinnit/suojattu1');
    out['3b_listener_tapahtumat_suojattu1'] = (await ev()).filter((x) => x.startsWith('snap:s1'));
    // 3c offline-jono + SIVUN UUDELLEENLATAUS (palvelu estetty) → vanhat promiset menetetty
    await t.block(true);
    await W(t, 'ok2', 'seurat/kpv/harjoitusarvioinnit/ok2', { malli: 'valmennustaidot' }); await D(t, 'del2', 'seurat/kpv/harjoitusarvioinnit/suojattu2'); await sleep(500);
    await t.goto(H('?order=persist-first&sync=1'));
    await t.eval('T.watch("seurat/kpv/harjoitusarvioinnit/suojattu2","s2")'); await t.eval('T.watch("seurat/kpv/harjoitusarvioinnit/ok2","ok2")'); await sleep(1200);
    out['3c_reloadin_jalkeen_palvelu_estetty'] = (await ev()).filter((x) => /^snap:(s2|ok2)/.test(x));
    out['3c_pending_estetty'] = await t.eval('T.pending(1200)');
    await t.block(false); await sleep(3000);
    out['3c_pending_eston_jalkeen'] = await t.eval('T.pending(5000)');
    out['3c_listener_tapahtumat'] = (await ev()).filter((x) => /^snap:(s2|ok2)/.test(x));
    out['3c_server_ok2'] = await serverDoc('seurat/kpv/harjoitusarvioinnit/ok2'); out['3c_server_suojattu2_olemassa'] = await serverDoc('seurat/kpv/harjoitusarvioinnit/suojattu2');
    const kaikkiLokit = t.logs(); out['3c_konsoli_kaikki'] = kaikkiLokit.filter((l) => !/ERR_INTERNET|transport errored|ERR_BLOCKED/.test(l)).slice(-8);
    out['3c_konsoli_maara_yht'] = kaikkiLokit.length;
    // 3d claims muuttuu offline-aikana: päivittääkö SDK tokenin synkassa?
    const uid = await t.eval('T.who()');
    out['3d_token_ennen'] = (await t.eval('T.token(false)')).claims.rooli;
    await t.block(true); await setClaims(uid, { seuraId: 'kpv', rooli: 'pelaaja' });
    await W(t, 'claims1', 'seurat/kpv/harjoitusarvioinnit/claims1', { x: 1 }); await sleep(400); await t.block(false);
    out['3d_kirjoitus_vanhalla_tokenilla_synkassa'] = (await until(t, ['claims1'], 15000))[0];
    out['3d_palvelimella_claims1'] = await serverDoc('seurat/kpv/harjoitusarvioinnit/claims1');
    out['3d_token_synkan_jalkeen_ilman_pakotusta'] = (await t.eval('T.token(false)')).claims.rooli;
    await t.eval('T.token(true)');
    await W(t, 'claims2', 'seurat/kpv/harjoitusarvioinnit/claims2', { x: 1 }); out['3d_kirjoitus_pakotetun_refreshin_jalkeen'] = (await until(t, ['claims2'], 15000))[0];
    await t.offline(true); out['3d_pakotettu_refresh_offline'] = await t.eval('T.token(true)'); out['3d_valimuistitoken_offline'] = { ok: (await t.eval('T.token(false)')).ok };
    return out;
  },
  // ── 4) cache-koko ja offline get -viive ──
  async s4(chrome) {
    const out = {}; await fresh();
    const docs = [['seurat/kpv', { nimi: 'KPV' }]];
    for (let i = 0; i < 600; i++) { const o = { etunimi: 'Pelaaja' + i, sukunimi: 'Testi', syntymaVuosi: 2008 + (i % 8), joukkue: 'U' + (10 + (i % 8)), joukkueet: ['j' + (i % 8)], sukupuoli: 'M', tunniste: String(10000000 + i) }; for (let k = 0; k < 28; k++) o['kentta' + k] = 'arvo-' + k + '-' + 'x'.repeat(40); o.jaksofokus = { avain: 'a', nimi: 'b', alkoi: '2026-09-01', kesto_vk: 4 }; docs.push([`seurat/kpv/pelaajat/p${i}`, o]); }
    for (let i = 0; i < 1200; i++) docs.push([`seurat/kpv/pelaajat/p${i % 600}/havainnot/h${i}`, { teksti: 'havainto ' + i + ' ' + 'y'.repeat(120), pvm: '2026-09-' + String(1 + (i % 28)).padStart(2, '0'), tyyppi: 'ADAR' }]);
    for (let i = 0; i < 300; i++) docs.push([`seurat/kpv/kalenteri/k${i}`, { nimi: 'Harjoitus ' + i, tyyppi: 'harjoitus', joukkue: 'U12', pvm: '2026-09-' + String(1 + (i % 28)).padStart(2, '0') }]);
    await seed(docs);
    out.seed = { pelaajat: 600, havainnot: 1200, kalenteri: 300 };
    let t = await chrome.tab(H('?order=persist-first&sync=1')); await loginCoach(t);
    out['4a_online_get_pelaajat'] = await t.eval('T.getColl("seurat/kpv/pelaajat")');
    out['4a_online_get_kalenteri'] = await t.eval('T.getColl("seurat/kpv/kalenteri")');
    out['4a_storage_after_read'] = await t.eval('T.storage()');
    // offline kesken istunnon
    await t.offline(true); await sleep(1500);
    out['4b_offline_get_default'] = await t.eval('T.getColl("seurat/kpv/pelaajat")');
    out['4b_offline_get_cache'] = await t.eval('T.getColl("seurat/kpv/pelaajat","cache")');
    out['4b_offline_get_kalenteri_cache'] = await t.eval('T.getColl("seurat/kpv/kalenteri","cache")');
    out['4b_offline_doc_default'] = await t.eval('T.get("seurat/kpv/pelaajat/p1")');
    out['4b_offline_firstSnapshot'] = await t.eval('T.firstSnap("seurat/kpv/pelaajat",15000)');
    // välittömästi offline-tilaan siirryttäessä (ennen kuin SDK on huomannut)
    await t.offline(false); await sleep(800); await t.offline(true);
    out['4c_get_heti_offline_default'] = await t.eval('T.getColl("seurat/kpv/kalenteri")');
    // uusi lataus palvelu estettynä: persistenssi + get
    await t.offline(false); await t.block(true);
    await t.goto(H('?order=persist-first&sync=1'));
    out['4d_reload_blocked_uid'] = await t.eval('T.who()');
    out['4d_get_default_blocked'] = await t.eval('T.getColl("seurat/kpv/pelaajat")');
    out['4d_get_cache_blocked'] = await t.eval('T.getColl("seurat/kpv/pelaajat","cache")');
    // vertailu: ei persistenssiä (muistivälimuisti) offline
    await t.block(false); await t.goto(H('?order=none')); await loginCoach(t);
    await t.eval('T.getColl("seurat/kpv/kalenteri")'); await t.offline(true); await sleep(1000);
    out['4e_nopersist_offline_get_default'] = await t.eval('T.getColl("seurat/kpv/kalenteri")');
    out['4e_nopersist_offline_get_cache_uudelleenlatauksen_jalkeen'] = null;
    await t.offline(false); await t.block(true); await t.goto(H('?order=none')); out['4e_nopersist_reload_get_default'] = await t.eval('T.getColl("seurat/kpv/kalenteri",null,5)');
    return out;
  },
  // ── 4f) "huono yhteys": yhteys ei katkea vaan JUMITTAA (latenssi) — kenttäverkon pahin tapaus ──
  async s4f(chrome) {
    const out = {}; await fresh();
    const docs = [['seurat/kpv', { nimi: 'KPV' }]]; for (let i = 0; i < 300; i++) docs.push([`seurat/kpv/kalenteri/k${i}`, { nimi: 'Harjoitus ' + i, tyyppi: 'harjoitus', pvm: '2026-09-10' }]); await seed(docs);
    let t = await chrome.tab(H('?order=persist-first&sync=1')); await loginCoach(t);
    out['4f_online'] = await t.eval('T.getColl("seurat/kpv/kalenteri")');
    const hang = (on) => t.send('Network.emulateNetworkConditions', { offline: false, latency: on ? 60000 : 0, downloadThroughput: on ? 50 : -1, uploadThroughput: on ? 50 : -1 });
    // uusi lataus, jonka jälkeen verkko jumittaa heti (SDK ei ehdi tietää olevansa offline)
    await t.goto(H('?order=persist-first&sync=1')); await hang(true);
    out['4f_jumittava_get_default'] = await t.eval('T.getColl("seurat/kpv/kalenteri")');
    out['4f_jumittava_get_cache'] = await t.eval('T.getColl("seurat/kpv/kalenteri","cache")');
    await t.eval('T.write("hw","seurat/kpv/harjoitusarvioinnit/hw",{x:1})'); await sleep(1500);
    out['4f_jumittava_kirjoitus_1_5s_jalkeen'] = await WS(t, 'hw'); out['4f_jumittava_pending'] = await t.eval('T.pending(1500)');
    await hang(false); out['4f_kirjoitus_kun_yhteys_palaa'] = (await until(t, ['hw'], 40000))[0];
    return out;
  },
  // ── 2) verkkoportti (disableNetwork/enableNetwork) — App Check -hylkäys EI testattavissa emulaattorilla ──
  async s2(chrome) {
    const out = {}; await fresh();
    await seed([['seurat/kpv', { nimi: 'KPV' }]]);
    let t = await chrome.tab(H('?order=persist-first&sync=1')); await loginCoach(t);
    // portti: sovellus kutsuu disableNetwork() kun offline; yhteys palaa mutta portti pysyy kiinni
    out['2a_netOff_ms'] = await t.eval('T.netOff()');
    await W(t, 'g1', 'seurat/kpv/harjoitusarvioinnit/g1', { x: 1 }); await sleep(1200);
    out['2a_state_gate_closed'] = await WS(t, 'g1'); out['2a_server_before_open'] = await serverDoc('seurat/kpv/harjoitusarvioinnit/g1');
    out['2a_pending'] = await t.eval('T.pending(1200)');
    const t0 = Date.now(); out['2a_netOn_ms'] = await t.eval('T.netOn()');
    const st = await until(t, ['g1'], 10000); out['2a_after_open'] = st[0]; out['2a_flush_ms'] = Date.now() - t0; out['2a_server_after_open'] = await serverDoc('seurat/kpv/harjoitusarvioinnit/g1');
    // portti + reload: (i) portti suljetaan vasta reloadin JÄLKEEN → vuotaako jono jo ennen? (ii) portti suljetaan heti alustuksessa (?gate=1)
    await t.eval('T.netOff()'); await W(t, 'g2', 'seurat/kpv/harjoitusarvioinnit/g2', { x: 2 });
    await t.goto(H('?order=persist-first&sync=1'));
    await t.eval('T.netOff()'); await sleep(1500);
    out['2b_portti_vasta_reloadin_jalkeen_g2_palvelimella'] = await serverDoc('seurat/kpv/harjoitusarvioinnit/g2');
    await t.eval('T.netOn()'); await sleep(1500);
    await t.eval('T.netOff()'); await W(t, 'g3', 'seurat/kpv/harjoitusarvioinnit/g3', { x: 3 });
    await t.goto(H('?order=persist-first&sync=1&gate=1'));
    out['2c_gate_init'] = await t.eval('T.info().init'); await sleep(2000);
    out['2c_g3_palvelimella_portti_kiinni'] = await serverDoc('seurat/kpv/harjoitusarvioinnit/g3');
    out['2c_pending_portti_kiinni'] = await t.eval('T.pending(1200)');
    await t.eval('T.netOn()'); await sleep(2000);
    out['2c_g3_palvelimella_portin_avauksen_jalkeen'] = await serverDoc('seurat/kpv/harjoitusarvioinnit/g3');
    out['2c_pending_avauksen_jalkeen'] = await t.eval('T.pending(3000)');
    return out;
  },
};

const ids = arg.length ? arg : ['s1', 's2', 's3', 's4', 's4f'];
const chrome = new Chrome(); await chrome.start();
for (const id of ids) {
  process.stderr.write(`▶ ${id}\n`);
  try { OUT[id] = await SCEN[id](chrome); } catch (e) { OUT[id] = { VIRHE: String(e.stack || e).slice(0, 600) }; }
  try { await chrome.stop(); await chrome.start(); } catch {}
}
await chrome.stop(); srv.close();
const info = { chrome: await (async () => '')(), node: process.version, sdk: 'firebase compat 10.7.1', ajettu: new Date().toISOString() };
fs.writeFileSync(path.join(ROOT, 'spike', 'offline', 'results.json'), JSON.stringify({ info, OUT }, null, 2));
console.log(JSON.stringify(OUT, null, 2)); process.exit(0);
