/* Pelaaja_v7 DEPLOY-MUOTO · SELAIN (chrome-tests + chrome-laiska-deploy): pääskripti + P6 irrotettu tiedostoihin, kaikki skriptit defer (scripts/versiotiiviste.js LOHKOT_ULOS + LYKKAYS, PM 27.11.2026).
   Sama sivu ajetaan (a) repon inline-muodossa ja (b) deploy-muodossa oikealla Firebase-compat-SDK:lla (verkko estetty): ei uusia sivuvirheitä, samat globaalit, sama kirjautumisnäkymä (PIN), sama ruudun teksti
   fi- ja sv-kielellä ja kutsulinkillä (?seura=&p=). Odotustila: ennen pääskriptiä setLoc/go ovat tynkiä + html.tm-main-odottaa; pääskripti vapauttaa sen heti 'use strict' -rivin jälkeen.
   Juurisyy-oppi (#1328): deferin suoritusjärjestysviat näkyvät vain deploy-muodossa → tämä testi ajaa sen, ei vain repon inline-muotoa. Pelaajalla ei ole laiskoja portteja (ei tm_laiska_kirjastot.js). */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { deployPelaaja } from './helpers/deploy_muoto.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), REPO = readFileSync(join(JUURI, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const SDK = { 'firebase-app-compat.js': 1, 'firebase-app-check-compat.js': 1, 'firebase-auth-compat.js': 1, 'firebase-firestore-compat.js': 1, 'firebase-functions-compat.js': 1 };

/* Parsinta-aikainen probe heti Sentry-asetuksen / odotustilan jälkeen (ENNEN yhtään deferattua skriptiä) + DCL-probe (kaikki deferatut ajettu). */
const PROBE = '<script>window.__tmEnnen={luokka:document.documentElement.classList.contains("tm-main-odottaa"),setLoc:typeof setLoc,go:typeof go,tynka:/^function\\s*\\(\\)\\s*\\{\\s*\\}$/.test(String(window.setLoc||"")),lang:typeof TM_LANG};'
  + 'document.addEventListener("DOMContentLoaded",function(){setTimeout(function(){var b=document.getElementById("phBody");window.__tmJalkeen={luokka:document.documentElement.classList.contains("tm-main-odottaa"),setLoc:typeof setLoc,go:typeof go,'
  + 'tynka:/^function\\s*\\(\\)\\s*\\{\\s*\\}$/.test(String(window.setLoc||"")),p6:typeof _suljeHavainnot,kirjaus:typeof _tallennaKirjaus,lang:typeof TM_LANG,sv:!!(window.TM_LANG&&TM_LANG.sv),'
  + 'teksti:b?b.innerText.replace(/\\s+/g," ").trim():null,sc:typeof _sc==="string"?_sc:null,url:typeof _URL==="object"?JSON.stringify(_URL):null};},400)});</script>';

function sivuTiedosto(html, T, nimi) {
  const j = html.indexOf('<head>') + 6, i = html.indexOf('</script>', html.indexOf('window.TM_SENTRY={app:')) + 9;   // probe heti TM_SENTRY-asetuksen (ja deployssa odotustilan) jälkeen
  const kohta = html.indexOf('<script src="https://browser.sentry-cdn.com');
  const ulos = html.slice(0, j) + '<base href="file://' + JUURI + '/">' + html.slice(j, kohta) + PROBE + html.slice(kohta);
  const p = join(T, nimi); writeFileSync(p, ulos); return p;
}
async function aja(selain, tiedosto, { kieli, haku } = {}) {
  const sk = await selain.newContext({ viewport: { width: 390, height: 800 } }), p = await sk.newPage(), virheet = [];
  if (kieli) await sk.addInitScript((k) => { try { localStorage.setItem('tm_kieli', k); } catch (e) {} }, kieli);
  p.on('pageerror', (e) => virheet.push(String(e && e.message)));
  await p.route(/^https?:\/\//, (r) => {
    const u = r.request().url(), m = /gstatic\.com\/firebasejs\/[^/]+\/([^/?]+)/.exec(u);
    if (m && SDK[m[1]]) return r.fulfill({ contentType: 'application/javascript', body: readFileSync(join(JUURI, 'node_modules/firebase', m[1])) });
    if (/\.css(\?|$)|fonts\.googleapis\.com/.test(u)) return r.fulfill({ contentType: 'text/css', body: '' });
    if (/\.js(\?|$)/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: '' });
    return r.abort();
  });
  await p.goto('file://' + tiedosto + (haku || ''), { waitUntil: 'load', timeout: 30000 });
  await p.waitForFunction(() => window.__tmJalkeen, null, { timeout: 20000 });
  const ennen = await p.evaluate(() => window.__tmEnnen), jalkeen = await p.evaluate(() => window.__tmJalkeen);
  await sk.close(); return { virheet, ennen, jalkeen };
}

describe('Pelaaja deploy-muoto (staattinen)', () => {
  const d = deployPelaaja(JUURI), VT = require('../scripts/versiotiiviste.js'), r = VT.laske(JUURI), ulos = r.tiedostot['TalentMaster_Pelaaja_v7.html'];
  it('ei muunnosvirheitä; HTML kutistuu (< 100 kt, repossa ~490 kt); pääskripti + P6 omissa tiedostoissaan, ?v sisällöstä; repoon ei jää irrotettuja tiedostoja', () => {
    expect(r.virheet.filter((v) => v.indexOf('Pelaaja') >= 0)).toEqual([]);
    expect(ulos.length).toBeLessThan(100000); expect(REPO.length).toBeGreaterThan(400000);
    for (const n of ['tm_pelaaja_main.js', 'tm_pelaaja_p6.js']) { expect(r.raportti.sivut['TalentMaster_Pelaaja_v7.html'][n]).toMatch(/^[0-9a-f]{8}$/); expect(ulos).toContain('<script src="' + n + '?v=' + r.raportti.sivut['TalentMaster_Pelaaja_v7.html'][n] + '" defer></script>'); }
    expect(r.tiedostot['tm_pelaaja_main.js'].length).toBeGreaterThan(400000); expect(existsSync(join(JUURI, 'tm_pelaaja_main.js'))).toBe(false); expect(VT.tarkistaRepo(JUURI)).toEqual([]);
    expect(d.html).toContain('file://' + d.dir + '/tm_pelaaja_main.js');
  });
  it('JÄRJESTYS: jokainen ajettava <script src> on defer; SDK:t app → app-check → auth; Sentry-asetus ennen tm_sentry.js:ää; tm_appcheck.js ennen pääskriptiä; pääskripti → P6; kaikki kirjastot ennen pääskriptiä', () => {
    const tagit = [...ulos.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]), src = (t) => { const m = /\bsrc="([^"]+)"/.exec(t); return m ? m[1].replace(/\?.*/, '') : null; };
    expect(tagit.filter((t) => src(t) && !/\btype=/.test(t) && !/\bdefer\b/.test(t))).toEqual([]); expect(tagit.filter((t) => /\basync\b/.test(t))).toEqual([]);
    const j = tagit.filter(src).map(src), i = (n) => j.findIndex((s) => s.endsWith(n)), main = i('tm_pelaaja_main.js');
    expect(i('firebase-app-compat.js')).toBeLessThan(i('firebase-app-check-compat.js')); expect(i('firebase-app-check-compat.js')).toBeLessThan(i('firebase-auth-compat.js'));
    expect(i('lib/tm_appcheck.js')).toBeLessThan(main); expect(i('tm_sentry.js')).toBeLessThan(i('firebase-app-compat.js')); expect(i('tm_pelaaja_p6.js')).toBe(main + 1);
    expect(j.filter((s, k) => k > main && !/tm_pelaaja_p6\.js$/.test(s))).toEqual([]);   // pääskripti + P6 ovat viimeiset (kuten inline-muodossa)
    expect(ulos.indexOf('window.TM_SENTRY={app:')).toBeLessThan(ulos.indexOf('<script src="tm_sentry.js'));
  });
  it('inline-skriptejä jää vain pienet: versiotarkistus, TM_SENTRY, odotustila+tynkä, sv/en-paketin latausvalinta, SW-rekisteröinti — ei lib-riippuvuuksia latausaikana (paitsi paketti, joka on järjestysriippumaton)', () => {
    const inl = [...ulos.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]); expect(inl).toHaveLength(5); expect(Math.max(...inl.map((x) => x.length))).toBeLessThan(1500);
    for (const x of inl) expect(x).not.toMatch(/\b(tmAppCheckAktivoi|firebase\.(auth|firestore|app)|TM_LANG\.|tmT\()/);
  });
  it('odotustila: tynkä + luokka + pointer-events; pääskripti vapauttaa luokan heti \'use strict\' -rivin jälkeen (tasan kerran); setLoc/go määritellään pääskriptissä', () => {
    expect(ulos).toContain("classList.add('tm-main-odottaa');window.setLoc=window.go=function(){};"); expect(ulos).toContain('html.tm-main-odottaa body [onclick]{pointer-events:none}');
    const m = r.tiedostot['tm_pelaaja_main.js']; expect(m.startsWith("'use strict';\ndocument.documentElement.classList.remove('tm-main-odottaa');")).toBe(true); expect(m.split("classList.remove('tm-main-odottaa')")).toHaveLength(2);
    for (const n of ['setLoc', 'go']) expect(new RegExp('function ' + n + '\\(').test(m), n).toBe(true);
  });
  it('Hosting-CSP sallii omat skriptit (script-src \'self\') ja julkaisu ei ohita uusia juuritiedostoja', () => {
    const fb = JSON.parse(readFileSync(join(JUURI, 'firebase.json'), 'utf8')), h = Array.isArray(fb.hosting) ? fb.hosting[0] : fb.hosting;
    const csp = h.headers.flatMap((x) => x.headers).find((x) => x.key === 'Content-Security-Policy').value, ss = /script-src ([^;]+)/.exec(csp)[1];
    expect(ss).toContain("'self'"); expect(ss).toContain("'unsafe-inline'");
    expect(h.ignore.some((g) => /^(\*\*\/)?tm_pelaaja/.test(g) || g === '*.js' || g === '**/*.js')).toBe(false);
  });
  it('idempotentti: jo muunnettu sivu ei muutu eikä anna virhettä', () => {
    const VTm = require('../scripts/versiotiiviste.js'), x = VTm.irrotaLohkot(ulos, VTm.LOHKOT_ULOS['TalentMaster_Pelaaja_v7.html']); expect(x.virhe).toBeNull(); expect(x.html).toBe(ulos); expect(x.lohkot).toEqual([]);
    const y = VTm.lykkaaSivu(ulos, VTm.LYKKAYS['TalentMaster_Pelaaja_v7.html']); expect(y.virhe).toBeNull(); expect(y.html).toBe(ulos);
  });
  it('puuttuva / väärä lohko → virhe (deploy kaatuu, ei hiljaista ohitusta)', () => {
    const maar = VT.LOHKOT_ULOS['TalentMaster_Pelaaja_v7.html'];
    expect(VT.irrotaLohkot(REPO.replace('// P6 — VALMENTAJAN HAVAINTO', '// P6 — MUU'), maar).virhe).toMatch(/tm_pelaaja_p6\.js.*löytyi 0/);
    expect(VT.irrotaLohkot('<script>\'use strict\';var x=1;</script><script>\'use strict\';var y=2;</script>', [{ nimi: 'a.js', alkaa: "'use strict';", min: 1 }]).virhe).toMatch(/löytyi 2/);
    expect(VT.irrotaLohkot('<script>\'use strict\';var x=1;</script>', [{ nimi: 'a.js', alkaa: "'use strict';", min: 1000 }]).virhe).toMatch(/väärä lohko/);
    expect(VT.lykkaaSivu(REPO.replace("window.TM_SENTRY={app:'pelaaja'};", 'x'), VT.LYKKAYS['TalentMaster_Pelaaja_v7.html']).virhe).toMatch(/ankkurilohkoa/);
  });
  it('SW: sw_pelaaja.js cachettaa irrotetut tiedostot (offline-avaus) — allowlist osuu molempiin ?v-URL:eihin; SW-cachenimi muuttuu kun pääskripti muuttuu (shell sisältää ?v)', () => {
    const sw = readFileSync(join(JUURI, 'sw_pelaaja.js'), 'utf8'), re = /\/tm_pelaaja_(main|p6)\.js/; expect(sw).toContain('tm_pelaaja_(main|p6)');
    const f = new Function(sw.slice(sw.indexOf('function onAllowlist'), sw.indexOf("self.addEventListener('fetch'")) + '; return onAllowlist;')();
    for (const n of ['tm_pelaaja_main.js', 'tm_pelaaja_p6.js']) expect(f('https://x.github.io/talentmaster/' + n + '?v=abcd1234'), n).toBe(true); expect(re.test('/lib/tm_pelaaja_x.js')).toBe(false);
    expect(r.raportti.sw['sw_pelaaja.js']).toMatch(/^tm-pelaaja-[0-9a-f]{8}$/);
  });
});

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('Pelaaja deploy-muoto vs. inline (selain)', () => {
  const kaynnista = () => require('playwright-core').chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
  const vertaa = async (opts) => {
    const selain = await kaynnista(), T = mkdtempSync(join(tmpdir(), 'pel_vrt_'));
    try {
      const d = deployPelaaja(JUURI), a = await aja(selain, sivuTiedosto(REPO, T, 'inline.html'), opts), b = await aja(selain, sivuTiedosto(d.html, T, 'deploy.html'), opts);
      return { a, b };
    } finally { await selain.close(); rmSync(T, { recursive: true, force: true }); }
  };
  it('fi: samat sivuvirheet kuin inline; tynkä + luokka ENNEN pääskriptiä, oikeat funktiot + luokka pois SEN JÄLKEEN; P6 ja kirjaus määritelty; sama kirjautumisnäkymä', async () => {
    const { a, b } = await vertaa({});
    expect(b.virheet).toEqual(a.virheet);
    expect(a.ennen).toMatchObject({ luokka: false, setLoc: 'undefined', go: 'undefined' });
    expect(b.ennen).toMatchObject({ luokka: true, setLoc: 'function', go: 'function', tynka: true });
    for (const x of [a, b]) expect(x.jalkeen).toMatchObject({ luokka: false, setLoc: 'function', go: 'function', tynka: false, p6: 'function', kirjaus: 'function', lang: 'object' });
    expect(b.jalkeen.teksti.length).toBeGreaterThan(10); expect(b.jalkeen.teksti).toBe(a.jalkeen.teksti); expect(b.jalkeen.sc).toBe(a.jalkeen.sc);
  }, 120000);
  it('sv: tallennettu sv-kieli → kielipaketti ladataan (document.write, järjestysriippumaton) → sama ruudun teksti kuin inline, TM_LANG.sv olemassa', async () => {
    const { a, b } = await vertaa({ kieli: 'sv' });
    expect(b.virheet).toEqual(a.virheet); expect(a.jalkeen.sv).toBe(true); expect(b.jalkeen.sv).toBe(true); expect(b.jalkeen.teksti).toBe(a.jalkeen.teksti);
  }, 120000);
  it('kutsulinkki (?seura=&p=): _URL ja ruudun teksti samat kuin inline', async () => {
    const { a, b } = await vertaa({ haku: '?seura=kpv&p=testi1' });
    expect(b.virheet).toEqual(a.virheet); expect(JSON.parse(b.jalkeen.url)).toMatchObject({ seuraId: 'kpv', pelaajaId: 'testi1' }); expect(b.jalkeen.url).toBe(a.jalkeen.url); expect(b.jalkeen.teksti).toBe(a.jalkeen.teksti);
  }, 120000);
});
