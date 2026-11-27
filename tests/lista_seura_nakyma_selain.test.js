/* Seuran lista_seura -näkymä OIKEASSA Chromessa, DEPLOY-MUODOSSA (PR 2/3, 27.11.2026; #1328-opetus: repon lähdemuoto ei paljasta deploy-muodon vikoja).
   Sivu = scripts/versiotiiviste.js laske() -tulos (skriptit ?v=hash, kuten staging/tuotanto), palveltuna http:llä; Firebase-SDK = node_modules/firebase (compat); Firestore = muistissa oleva mock (ei verkkoa).
   Todistaa oikealla sivukoodilla (renderPelaajat):
   · lippu päällä → synteettinen 500 pelaajan seura = 3 lukua (sivut + _meta), 0 pelaajadokumenttia, 0 collectionGroup-lukua (ei koko seuran sisainen/terveys, Q3)
   · lippu pois / kooste rikki → vanha polku (pelaajat luetaan), EDELLEEN 0 collectionGroup
   · roolit: SA (seurapoimija: seurat s1/s2 omilla koosteillaan), VP, UTJ, seurasihteeri — lista ilman käytettävyyssaraketta, ilman PIN-/sähköpostiarvoja
   · "Päivitetty hh:mm" + "Päivitä nyt" + "Arkistoidut" vain koosteesta luettaessa; Arkistoidut = 3 rajattua yksikenttäkyselyä (limit 100), ei koko seuraa */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'fs';
import { createServer } from 'http';
import { join, extname } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const JUURI = process.cwd();
const L = require('../lib/tm_lista_yhteenveto.js');
const TILAT = ['annettu', 'peruttu', 'pilotti', 'odottaa', undefined];
const JOUKKUEET = Array.from({ length: 12 }, (_, i) => ({ id: 'j' + i, nimi: 'J' + i }));
const synt = (n, pre) => Array.from({ length: n }, (_, i) => ({ id: pre + String(i).padStart(5, '0'), data: { etunimi: 'Etu' + i, sukunimi: pre.toUpperCase() + 'Suku' + (i % 97), syntymaVuosi: 2008 + (i % 9), joukkueet: ['j' + (i % 12)], joukkue: 'J' + (i % 12),
  suostumusTila: TILAT[i % TILAT.length], palloID: String(100000 + i), pin: '123456', huoltajaEmail: 'huoltaja' + i + '@example.org', kaytettavyys: 'loukkaantunut', talenttiOhjelma: i % 25 === 0 } }));
const koosteDokt = (pel) => L.tmListaSeuraDokumentit(pel, JOUKKUEET, 7).map((d) => d.id === '_meta' ? { id: d.id, data: Object.assign({}, d.data, { laskettu: { seconds: Math.floor(Date.now() / 1000) - 120 } }) } : d);
const MIME = { '.js': 'text/javascript', '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

/* Mock-Firestore sivulle: lukumäärälaskurit + puhdas rakenne (kokoelmat / dokumentit) */
const MOCK = `(function () {
  var L = window.__luvut = { lista_seura: 0, pelaajat: 0, cg: 0, rajat: [], kyselyt: [] };
  function snapOf(arr) { return { size: arr.length, empty: !arr.length, docs: arr.map(function (d) { return { id: d.id, data: function () { return JSON.parse(JSON.stringify(d.data)); }, ref: {} }; }), forEach: function (f) { this.docs.forEach(f); } }; }
  function col(sid, n) {
    var D = window.__D;
    if (n === 'liput') return { doc: function () { return { get: async function () { var v = D.liput[sid]; return { exists: !!v, data: function () { return v; } }; } }; } };
    if (n === 'lista_seura') return { get: async function () { var a = (D.lista_seura[sid] || []); L.lista_seura += a.length; return snapOf(a); }, doc: function (id) { return { get: async function () { var d = (D.lista_seura[sid] || []).find(function (x) { return x.id === id; }); L.lista_seura += d ? 1 : 0; return { exists: !!d, data: function () { return d && d.data; } }; } }; } };
    if (n === 'pelaajat') return {
      get: async function () { var a = D.pelaajat[sid] || []; L.pelaajat += a.length; return snapOf(a); },
      where: function (f, op, v) { var lim = null, q = { limit: function (k) { lim = k; L.rajat.push(k); return q; }, get: async function () { L.kyselyt.push(f); var a = (D.pelaajat[sid] || []).filter(function (d) { return d.data[f] === v; }); if (lim) a = a.slice(0, lim); return snapOf(a); } }; return q; },
      doc: function (id) { return { get: async function () { var d = (D.pelaajat[sid] || []).find(function (x) { return x.id === id; }); return { exists: !!d, id: id, data: function () { return d && d.data; } }; }, collection: function () { return { doc: function () { return { get: async function () { return { exists: false }; } }; } }; } }; } };
    return { get: async function () { return snapOf([]); } };
  }
  db.collection = function () { return { get: async function () { return snapOf([]); }, doc: function (sid) { return { get: async function () { return { exists: true, data: function () { return {}; } }; }, collection: function (n) { return col(sid, n); } }; } }; };
  db.collectionGroup = function () { L.cg++; throw new Error('collectionGroup ei sallittu listalla'); };
})();`;

async function palvelin() {
  const VT = require('../scripts/versiotiiviste.js'), r = VT.laske(JUURI), sivu = r.tiedostot['TalentMaster_Seura.html'];
  const SDK = (n) => readFileSync(join(JUURI, 'node_modules/firebase', n), 'utf8');
  const srv = createServer((rq, rs) => {
    const p = decodeURIComponent(rq.url.split('?')[0]);
    if (p === '/TalentMaster_Seura.html') { rs.setHeader('content-type', MIME['.html']); return rs.end(sivu); }
    if (r.tiedostot[p.slice(1)] && /\.js$/.test(p)) { rs.setHeader('content-type', MIME['.js']); return rs.end(r.tiedostot[p.slice(1)]); }
    const f = join(JUURI, p); if (p.indexOf('..') < 0 && existsSync(f) && statSync(f).isFile()) { rs.setHeader('content-type', MIME[extname(f)] || 'application/octet-stream'); return rs.end(readFileSync(f)); }
    rs.statusCode = 404; rs.end('');
  });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  return { srv, portti: srv.address().port, SDK, sivu };
}

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('Seura lista_seura — oikea Chrome, deploy-muoto', () => {
  it('lippu päällä: 500 pelaajaa 3 luvulla, ei collectionGroup; roolit, SA-seurapoimija, varapolku, Arkistoidut', async () => {
    const { srv, portti, SDK, sivu } = await palvelin();
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
    try {
      // deploy-muoto: lipun, yhteenvedon ja lukijan skriptit mukana ?v-tiivisteellä
      for (const s of ['tm_liput', 'tm_lista_yhteenveto', 'tm_lista_lataus']) expect(sivu, s).toMatch(new RegExp('<script src="lib/' + s + '\\.js\\?v=[0-9a-f]{8}">'));
      const ctx = await selain.newContext(), page = await ctx.newPage(), virheet = [];
      page.on('pageerror', (e) => virheet.push(String(e && e.message)));
      await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());   // ensin yleinen esto, sen jälkeen tarkempi (Playwright: viimeksi rekisteröity reitti ensin)
      await page.route(/gstatic\.com\/firebasejs\/[^/]+\/(firebase-[a-z-]+-compat\.js)/, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: SDK(r.request().url().split('/').pop()) }));
      await page.goto('http://127.0.0.1:' + portti + '/TalentMaster_Seura.html');
      await page.waitForFunction(() => typeof renderPelaajat === 'function' && !!window.TM_LISTA_LATAUS && !!window.TM_LIPUT && typeof tila === 'object', null, { timeout: 30000 });

      const aja = (rooli, sid) => page.evaluate(async ([rooli, sid]) => {
        window.__luvut.lista_seura = 0; window.__luvut.pelaajat = 0; window.__luvut.cg = 0; window.__luvut.rajat = []; window.__luvut.kyselyt = [];
        tila.seuraId = sid; tila.rooli = rooli; tila.joukkueet = (window.__J || []); tila.aktiivNakyma = 'pelaajat';
        await renderPelaajat(document.getElementById('nakymaAlue'));
        const a = document.getElementById('nakymaAlue');
        return { rivit: a.querySelectorAll('table tbody tr').length, otsikot: Array.from(a.querySelectorAll('table thead th')).map((x) => x.textContent.trim()), tilarivi: (document.getElementById('listaTilaRivi') || {}).textContent || '', html: a.innerHTML, luvut: JSON.parse(JSON.stringify(window.__luvut)), lahde: window._seuraListaTila.lahde };
      }, [rooli, sid]);
      const D = (d) => page.evaluate((d) => { window.__D = d; }, d);
      await page.evaluate((j) => { window.__J = j; }, JOUKKUEET);
      await D({ liput: { s1: { lista_seura: true }, s2: { lista_seura: true } }, lista_seura: { s1: koosteDokt(synt(500, 'a')), s2: koosteDokt(synt(50, 'b')) }, pelaajat: {} });
      await page.evaluate(MOCK);

      // 1) lippu päällä, kaikki neljä roolia
      for (const rooli of ['superadmin', 'vp', 'urheilutoimenjohtaja', 'seurasihteeri']) {
        const t = await aja(rooli, 's1');
        expect(t.lahde, rooli).toBe('lista'); expect(t.rivit, rooli).toBe(500);
        expect(t.luvut, rooli).toMatchObject({ lista_seura: 3, pelaajat: 0, cg: 0 });   // 2 sivua + _meta
        expect(t.otsikot.join('|'), rooli).not.toMatch(/Käytettävyys/); expect(t.html, rooli).not.toMatch(/123456|@example\.org|loukkaantunut|kaytNappi/);
        expect(t.tilarivi, rooli).toMatch(/päivitetty/); expect(t.tilarivi, rooli).toContain('Päivitä nyt'); expect(t.tilarivi, rooli).toContain('Arkistoidut');
        expect(t.html, rooli).toContain('onclick="paivitaSeuranLista()"');
      }
      // 2) SA:n seurapoimija: toinen seura → oma kooste (50), lipun välimuisti seuroittain
      const s2 = await aja('superadmin', 's2'); expect(s2.rivit).toBe(50); expect(s2.luvut).toMatchObject({ lista_seura: 2, pelaajat: 0, cg: 0 });
      const takaisin = await aja('superadmin', 's1'); expect(takaisin.rivit).toBe(500);

      // 3) lippu pois → vanha polku, edelleen 0 collectionGroup
      const vanhat = synt(30, 'c'); await D({ liput: {}, lista_seura: { s3: koosteDokt(synt(5, 'x')) }, pelaajat: { s3: vanhat } });
      const pois = await aja('vp', 's3'); expect(pois.lahde).toBe('vanha'); expect(pois.rivit).toBe(30); expect(pois.luvut).toMatchObject({ lista_seura: 0, pelaajat: 30, cg: 0 }); expect(pois.tilarivi).not.toMatch(/Päivitä nyt/);
      // 4) lippu päällä mutta kooste rikki (puuttuva sivu) → vanha polku
      const rikki = koosteDokt(synt(500, 'd')).filter((d) => d.id !== 's0002');
      await D({ liput: { s4: { lista_seura: true } }, lista_seura: { s4: rikki }, pelaajat: { s4: synt(500, 'd') } });
      const r4 = await aja('vp', 's4'); expect(r4.lahde).toBe('vanha'); expect(r4.rivit).toBe(500); expect(r4.luvut.cg).toBe(0);

      // 5) Arkistoidut: kolme rajattua yksikenttäkyselyä, ei koko seuraa
      const arkisto = [{ id: 'x1', data: { etunimi: 'Poistettu', sukunimi: 'Pekka', poistettu: true } }, { id: 'x2', data: { etunimi: 'Arkisto', sukunimi: 'Anna', arkistoitu: true } }, { id: 'x3', data: { etunimi: 'Ei', sukunimi: 'Aktiivinen', aktiivinen: false } }, { id: 'x4', data: { etunimi: 'Kaksi', sukunimi: 'Syytä', arkistoitu: true, aktiivinen: false } }].concat(synt(400, 'e'));
      await D({ liput: {}, lista_seura: {}, pelaajat: { s5: arkisto } });
      const ark = await page.evaluate(async () => { window.__luvut.pelaajat = 0; window.__luvut.rajat = []; window.__luvut.kyselyt = []; tila.seuraId = 's5'; tila.rooli = 'vp'; const r = await _haeArkistoidut(); return { n: r.rivit.length, nimet: r.rivit.map((x) => x.id).sort(), x4: r.rivit.find((x) => x.id === 'x4').syyt.sort(), luvut: JSON.parse(JSON.stringify(window.__luvut)) }; });
      expect(ark.nimet).toEqual(['x1', 'x2', 'x3', 'x4']); expect(ark.x4).toEqual(['aktiivinen', 'arkistoitu']);
      expect(ark.luvut.kyselyt.sort()).toEqual(['aktiivinen', 'arkistoitu', 'poistettu']); expect(ark.luvut.rajat).toEqual([100, 100, 100]); expect(ark.luvut.pelaajat).toBe(0);   // 0 = koko kokoelmaa ei luettu (vain where+limit)
      expect(virheet.filter((v) => !/recaptcha|appcheck|sentry|ERR_|Failed to fetch/i.test(v))).toEqual([]);
      await ctx.close();
    } finally { await selain.close(); srv.close(); }
  }, 120000);
});
