/* Projekti 06 PR 3 · selain (Playwright + Chrome; chrome-tests-job): Firestore-instrumentointi + mittaaAvaus oikeassa Chromessa paikallista palvelinta vasten (EI stagingia, EI verkkoa).
   Vale-"compat-SDK" rekisteröi nimiavaruuden samalla tavalla kuin firebase-*-compat.js (window.firebase = {...}; firebase.firestore = {Query, DocumentReference}) → todistaa koukun (asetin window.firebase → firebase.firestore), laskennan kokoelmittain, välimuistisnapshotin ohituksen, TTI:n ja tavumäärän. */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { createServer } from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const S = require('../scripts/kuorma/mittaa_sivut.js');
const { instrumentointi } = require('../scripts/kuorma/mittaus_instrumentointi.js');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const FAKE_SDK = `
window.firebase = { apps: [], app: function () {} };
(function () {
  function Query(path) { this.path = path; }
  Query.prototype.get = function () { return Promise.resolve({ size: this.path === 'tyhja' ? 0 : 3, docs: [1, 2, 3].map(function () { return { data: function () { return { a: 'xx' }; } }; }) }); };
  Query.prototype.onSnapshot = function (a, b) { var f = typeof a === 'function' ? a : a.next; setTimeout(function () { f({ metadata: { fromCache: false }, docChanges: function () { return [1, 2]; }, size: 2 }); }, 40); setTimeout(function () { f({ metadata: { fromCache: true }, docChanges: function () { return [1, 1, 1, 1]; }, size: 4 }); }, 80); return function () {}; };
  function DocumentReference(path) { this.path = path; this.parent = { id: path.split('/').slice(-2, -1)[0] }; }
  DocumentReference.prototype.get = function () { return Promise.resolve({ exists: true }); };
  DocumentReference.prototype.onSnapshot = function (cb) { setTimeout(function () { cb({ metadata: { fromCache: false } }); }, 30); return function () {}; };
  firebase.firestore = { Query: Query, DocumentReference: DocumentReference, CollectionReference: Query };
})();`;
const SIVU = `<!doctype html><meta charset="utf-8"><title>vale</title><h1>Vale-sivu</h1><script src="/sdk.js"></script><script>
 var fs = firebase.firestore;
 new fs.Query('seurat/s1/pelaajat').get();
 new fs.Query('tyhja').get();
 new fs.DocumentReference('seurat/s1').get();
 new fs.Query('seurat/s1/havainnot').onSnapshot({ next: function () {} });
 new fs.DocumentReference('seurat/s1/pelaajat/p1').onSnapshot(function () {});
 var t = Date.now(); while (Date.now() - t < 120) {}   /* pitkä tehtävä → kiireinen jakso */
</script>`;
const AUTH_SDK = `
(function () { var u = function () { try { var x = localStorage.getItem('fakeUser'); return x ? { email: x } : null; } catch (e) { return null; } };
  firebase.apps.push({}); firebase.auth = function () { return { get currentUser() { return u(); }, signInWithEmailAndPassword: function (e, p) { if (p !== 'Oikea-Salasana-1') return Promise.reject({ code: 'auth/wrong-password' }); localStorage.setItem('fakeUser', e); return Promise.resolve(); } }; }; })();`;
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('mittaus · selain (instrumentointi)', () => {
  it('lukujen laskenta kokoelmittain (get, tyhjä kysely = 1, doc.get, onSnapshot ilman välimuistia), kiinnitetty=true, TTI + tavut mitataan, token ei vuoda sivun muuhun dataan', async () => {
    const palvelin = createServer((rq, rs) => { if (rq.url === '/sdk.js') { rs.setHeader('content-type', 'text/javascript'); rs.end(FAKE_SDK); } else { rs.setHeader('content-type', 'text/html'); rs.end(SIVU); } });
    await new Promise((r) => palvelin.listen(0, '127.0.0.1', r)); const portti = palvelin.address().port;
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
    try {
      const ctx = await selain.newContext(), page = await ctx.newPage(); await ctx.addInitScript(instrumentointi, { token: 'TESTI-TOKEN' }); const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable');
      const r = await S.mittaaAvaus(page, cdp, 'http://127.0.0.1:' + portti + '/', { ikkuna: 600, aikaraja: 20000 });
      expect(r.virhe).toBeNull(); expect(r.kiinnitetty).toBe(true);
      expect(r.luvut).toEqual({ pelaajat: 3 + 1 /* get 3 + doc-onSnapshot 1 */, tyhja: 1 /* tyhjä kysely = väh. 1 */, seurat: 1 /* doc.get */, havainnot: 2 /* ensimmäinen palvelinsnapshot; välimuistisnapshot (4) ohitetaan */ });
      expect(r.dokTavut.pelaajat).toBe(30 /* 3 × {"a":"xx"} = 3 × 10 merkkiä */); expect(r.dokEiMitattu).toBeGreaterThanOrEqual(0); expect(r.yht).toBe(8); expect(r.fcp_ms).toBeGreaterThan(0); expect(r.tti_ms).toBeGreaterThanOrEqual(r.fcp_ms); expect(r.tavut).toBeGreaterThan(100); expect(Array.isArray(r.resurssit) && r.resurssit.length > 0 && r.resurssit.every((x) => x.url.indexOf('?') < 0 && typeof x.koodattu === 'number')).toBe(true);
      expect(await page.evaluate(() => self.FIREBASE_APPCHECK_DEBUG_TOKEN)).toBe('TESTI-TOKEN'); expect(JSON.stringify(r)).not.toContain('TESTI-TOKEN');
      await ctx.close();
    } finally { await selain.close(); palvelin.close(); }
  }, 60000);
  it('--erittely: lukemat polku (id → *) ← kutsujafunktio, [lista]-konsoliviesti kerätään; ilman erittely-valintaa kenttiä ei kerry', async () => {
    const SIVU_E = `<!doctype html><meta charset="utf-8"><title>e</title><h1>e</h1><script src="/sdk.js"></script><script>
 var fs = firebase.firestore;
 function _lataaPelaajat() { return new fs.Query('seurat/s1/pelaajat').get(); }
 function _mListaYritaLadata() { new fs.Query('seurat/s1/lista_joukkue').get(); console.warn('[lista] vanha polku: versio:abc'); }
 function _lataaKirjaukset() { new fs.DocumentReference('seurat/s1/pelaajat/p1/kooste/kertyma_2026').get(); new fs.DocumentReference('seurat/s1/pelaajat/p2/kooste/kertyma_2026').get(); }
 _mListaYritaLadata(); _lataaPelaajat(); _lataaKirjaukset();
</script>`;
    const palvelin = createServer((rq, rs) => { if (rq.url === '/sdk.js') { rs.setHeader('content-type', 'text/javascript'); rs.end(FAKE_SDK); } else { rs.setHeader('content-type', 'text/html'); rs.end(SIVU_E); } });
    await new Promise((r) => palvelin.listen(0, '127.0.0.1', r)); const portti = palvelin.address().port;
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
    try {
      for (const erittely of [true, false]) {
        const ctx = await selain.newContext(), page = await ctx.newPage(); await ctx.addInitScript(instrumentointi, { erittely }); const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable');
        const r = await S.mittaaAvaus(page, cdp, 'http://127.0.0.1:' + portti + '/vale.html', { ikkuna: 500, aikaraja: 15000, erittely });
        if (erittely) {
          const k = Object.keys(r.erittely);
          expect(k.some((x) => /^seurat\/\*\/pelaajat ← _lataaPelaajat vale\.html:\d+$/.test(x) && r.erittely[x].n === 3)).toBe(true);
          expect(k.some((x) => /^seurat\/\*\/lista_joukkue ← _mListaYritaLadata vale\.html:\d+$/.test(x))).toBe(true);
          const kooste = k.find((x) => x.indexOf('seurat/*/pelaajat/*/kooste/') === 0 || /^seurat\/\*\/pelaajat\/\*\/kooste/.test(x)); expect(kooste).toBeTruthy(); expect(r.erittely[kooste].n).toBe(2); expect(r.erittely[kooste].kutsuja).toBe(2);
          expect(r.konsoli).toEqual(['[lista] vanha polku: versio:abc']);
          const txt = S.erittelyTeksti('master', 'tyopoyta', r); expect(txt).toMatch(/ERITTELY master/); expect(txt).toMatch(/konsoli: \[lista\] vanha polku/);
        } else { expect(r.erittely).toBeUndefined(); expect(r.konsoli).toBeUndefined(); }
        await ctx.close();
      }
    } finally { await selain.close(); palvelin.close(); }
  }, 60000);
  it('ilman firebase-nimiavaruutta kiinnitetty=false (skripti varoittaa eikä väitä nollaa luvuiksi)', async () => {
    const palvelin = createServer((rq, rs) => { rs.setHeader('content-type', 'text/html'); rs.end('<!doctype html><title>x</title><h1>Ei SDK:ta</h1>'); });
    await new Promise((r) => palvelin.listen(0, '127.0.0.1', r)); const portti = palvelin.address().port;
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
    try { const ctx = await selain.newContext(), page = await ctx.newPage(); await ctx.addInitScript(instrumentointi, {}); const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable');
      const r = await S.mittaaAvaus(page, cdp, 'http://127.0.0.1:' + portti + '/', { ikkuna: 500, aikaraja: 15000 }); expect(r.kiinnitetty).toBe(false); expect(r.yht).toBe(0); await ctx.close();
    } finally { await selain.close(); palvelin.close(); }
  }, 60000);
  it('main() päästä päähän (vale-staging paikallisesti): kirjautuu roolilla, mittaa sivut × profiilit × toistot, kirjoittaa JSONin; salasana/token eivät vuoda tulosteeseen eikä JSONiin; pelaaja kirjautumatta', async () => {
    const fsm = require('fs'), os = require('os'), pathm = require('path'), hakemisto = fsm.mkdtempSync(pathm.join(os.tmpdir(), 'mittaus-e2e-'));
    const palvelin = createServer((rq, rs) => { if (rq.url === '/sdk.js') { rs.setHeader('content-type', 'text/javascript'); rs.end(FAKE_SDK + AUTH_SDK); } else { rs.setHeader('content-type', 'text/html'); rs.end(SIVU); } });
    await new Promise((r) => palvelin.listen(0, '127.0.0.1', r)); const portti = palvelin.address().port, tunn = pathm.join(hakemisto, 't.txt'), ulosJson = pathm.join(hakemisto, 's.json');
    fsm.writeFileSync(tunn, '# x\nvp.s01@kuorma.test\tOikea-Salasana-1\tvp\n');
    const ulos = []; const koodi = await S.main(['--url=http://127.0.0.1:' + portti, '--tunnukset=' + tunn, '--sivut=seura,pelaaja', '--toistot=1', '--ulos=' + ulosJson], { urlSallittu: () => true, kirjaa: (r) => ulos.push(r), virhe: (r) => ulos.push('VIRHE ' + r), env: { STAGING_APPCHECK_DEBUG_TOKEN: 'E2E-TOKEN', TM_CHROME_PATH: CHROME } });
    const teksti = ulos.join('\n'), j = JSON.parse(fsm.readFileSync(ulosJson, 'utf8'));
    expect(koodi, teksti).toBe(0); expect(j.mittaukset.map((m) => m.sivu + '/' + m.profiili)).toEqual(['seura/tyopoyta', 'seura/puhelin', 'pelaaja/tyopoyta', 'pelaaja/puhelin']);
    const seuraT = j.mittaukset[0], puhelin = j.mittaukset[1];
    expect(seuraT.kylma[0].kirjautunut).toBe(true); expect(seuraT.kylma[0].yht).toBe(8); expect(seuraT.kylma[0].kiinnitetty).toBe(true); expect(seuraT.yhteenveto.kylma.lukuja.mediaani).toBe(8); expect(seuraT.yhteenveto.kylma.tti_s.mediaani).toBeGreaterThan(0);
    expect(j.mittaukset[2].kylma[0].kirjautunut).toBe(false); expect(j.mittaukset[2].rooli).toBeNull();
    expect(puhelin.yhteenveto.kylma.tti_s.mediaani).toBeGreaterThanOrEqual(seuraT.yhteenveto.kylma.tti_s.mediaani * 0.5);   // kuristettu profiili ajettu (CDP-kuristus ei kaada ajoa)
    const kaikki = teksti + fsm.readFileSync(ulosJson, 'utf8'); expect(kaikki).not.toContain('Oikea-Salasana-1'); expect(kaikki).not.toContain('E2E-TOKEN'); expect(teksti).toMatch(/kirjaudutaan: rooli vp/);
    const vaara = pathm.join(hakemisto, 'v.txt'); fsm.writeFileSync(vaara, 'vp.s01@kuorma.test\tVaara-Salasana-2\n'); const u2 = []; const k2 = await S.main(['--url=http://127.0.0.1:' + portti, '--tunnukset=' + vaara, '--sivut=seura', '--toistot=1', '--ulos=' + ulosJson], { urlSallittu: () => true, kirjaa: (r) => u2.push(r), virhe: (r) => u2.push('VIRHE ' + r), env: { STAGING_APPCHECK_DEBUG_TOKEN: 'E2E-TOKEN', TM_CHROME_PATH: CHROME } });
    expect(k2).toBe(1); expect(u2.join('\n')).toMatch(/kirjautuminen epäonnistui/); expect(u2.join('\n')).not.toContain('Vaara-Salasana-2');
    palvelin.close();
  }, 180000);
  it('pelaaja-sivu: PalloID + PIN → pelaajaKirjaudu (europe-west1) → signInWithCustomToken nimettyyn appiin (window._fbApp/_auth, ei oletusappia) → kirjautunut=true, rooli pelaaja; PIN/token eivät vuoda; puuttuva tunnus → kirjautumaton + varoitus', async () => {
    const fsm = require('fs'), os = require('os'), pathm = require('path'), hakemisto = fsm.mkdtempSync(pathm.join(os.tmpdir(), 'mittaus-pelaaja-'));
    const PELAAJA_SIVU = `<!doctype html><meta charset="utf-8"><title>vale-pelaaja</title><h1>Pelaaja</h1><script src="/sdk.js"></script><script>
      var tila = function () { try { return localStorage.getItem('pelaajaUid'); } catch (e) { return null; } };
      window._fbApp = { functions: function (alue) { window.__alue = alue; return { httpsCallable: function (nimi) { return function (syote) { window.__kutsu = { nimi: nimi, alue: alue, tunnus: syote.liittoTunnus }; return syote.liittoTunnus === 'SYNT0100003' && syote.pin === '654321' ? Promise.resolve({ data: { token: 'VALE-CUSTOM-TOKEN' } }) : Promise.reject({ code: 'functions/unauthenticated' }); }; } }; } };
      window._auth = { get currentUser() { return tila() ? { uid: tila() } : null; }, signInWithCustomToken: function (t) { if (t !== 'VALE-CUSTOM-TOKEN') return Promise.reject({ code: 'auth/invalid-custom-token' }); localStorage.setItem('pelaajaUid', 'pel_x'); return Promise.resolve(); } };
    </script>`;
    const palvelin = createServer((rq, rs) => { if (rq.url === '/sdk.js') { rs.setHeader('content-type', 'text/javascript'); rs.end(FAKE_SDK + 'firebase.apps.push({}); firebase.auth = function () { throw new Error("ei oletusappia"); };'); } else { rs.setHeader('content-type', 'text/html'); rs.end(rq.url.indexOf('Pelaaja_v7') > -1 ? PELAAJA_SIVU : SIVU); } });
    await new Promise((r) => palvelin.listen(0, '127.0.0.1', r)); const portti = palvelin.address().port, tunn = pathm.join(hakemisto, 't.txt'), ulosJson = pathm.join(hakemisto, 's.json');
    fsm.writeFileSync(tunn, '# x\npelaaja.s01@kuorma.test\t654321\tpelaaja\tkuorma_seura_01\tSYNT0100003\n');
    const asetus = (ulos) => ({ urlSallittu: () => true, kirjaa: (r) => ulos.push(r), virhe: (r) => ulos.push('VIRHE ' + r), env: { STAGING_APPCHECK_DEBUG_TOKEN: 'E2E-TOKEN', TM_CHROME_PATH: CHROME } });
    const ulos = []; const koodi = await S.main(['--url=http://127.0.0.1:' + portti, '--tunnukset=' + tunn, '--sivut=pelaaja', '--profiilit=tyopoyta', '--toistot=1', '--ulos=' + ulosJson], asetus(ulos));
    const teksti = ulos.join('\n'), j = JSON.parse(fsm.readFileSync(ulosJson, 'utf8'));
    expect(koodi, teksti).toBe(0); expect(j.mittaukset[0].rooli).toBe('pelaaja'); expect(j.mittaukset[0].kylma[0].kirjautunut).toBe(true); expect(j.mittaukset[0].lampimat[0].kirjautunut).toBe(true);
    expect(teksti).toMatch(/kirjaudutaan: rooli pelaaja/); expect(teksti).not.toMatch(/EI KIRJAUTUNUT/);
    const kaikki = teksti + fsm.readFileSync(ulosJson, 'utf8'); ['654321', 'VALE-CUSTOM-TOKEN', 'E2E-TOKEN'].forEach((x) => expect(kaikki).not.toContain(x));
    const vaaraPin = pathm.join(hakemisto, 'v.txt'); fsm.writeFileSync(vaaraPin, 'pelaaja.s01@kuorma.test\t111111\tpelaaja\tkuorma_seura_01\tSYNT0100003\n'); const u2 = [];
    expect(await S.main(['--url=http://127.0.0.1:' + portti, '--tunnukset=' + vaaraPin, '--sivut=pelaaja', '--toistot=1', '--ulos=' + ulosJson], asetus(u2))).toBe(1); expect(u2.join('\n')).toMatch(/kirjautuminen epäonnistui \(functions\/unauthenticated\)/); expect(u2.join('\n')).not.toContain('111111');
    const ilman = pathm.join(hakemisto, 'i.txt'); fsm.writeFileSync(ilman, 'vp.s01@kuorma.test\tx\n'); const u3 = [];
    expect(await S.main(['--url=http://127.0.0.1:' + portti, '--tunnukset=' + ilman, '--sivut=pelaaja', '--profiilit=tyopoyta', '--toistot=1', '--ulos=' + ulosJson], asetus(u3))).toBe(0);
    expect(u3.join('\n')).toMatch(/KIRJAUTUMATTOMANA/); const j3 = JSON.parse(fsm.readFileSync(ulosJson, 'utf8')); expect(j3.mittaukset[0].rooli).toBeNull(); expect(j3.mittaukset[0].kylma[0].kirjautunut).toBe(false);
    palvelin.close();
  }, 180000);
});
