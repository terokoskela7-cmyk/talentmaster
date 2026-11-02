/* K2 · Valmennusapurin kaavio OIKEASSA selaimessa (Playwright + järjestelmän Chrome). TalentMaster_Valmennusapuri.html file://-osoitteesta,
   Firebase-SDK korvataan stubilla (page.route), callable vastaa muistista — ei verkkoa. Ei Firestorea: apurisivu ei kirjoita mitään, tallennus on Masterissa.
   Tarkistaa: kaavio piirtyy jaetulla renderöijällä vastauksen alle (mobiili 390), pienalue omana alue-kuvana (K2b), painike vain oikeudella, sv-teksti, siirto Masteriin. */
import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { CHROME, JUURI, selainKaynnista } from './helpers/kt_sivu.mjs';
const SIVU = 'file://' + join(JUURI, 'TalentMaster_Valmennusapuri.html');
const SPEC = { avain: 'y_h5', suunta: 'ylos', pelimuoto: '2v2+1', nakyma: 'alue', vyohyke: { x: 39, y: 43, w: 22, h: 14 },
  pelaajat: [{ id: 'A', joukkue: 'oma', rooli: 'syöttäjä', x: 45, y: 54, pallo: true }, { id: 'B', joukkue: 'oma', rooli: 'vastaanottaja', x: 55, y: 46 },
    { id: 'J', joukkue: 'oma', rooli: 'tuki', x: 50, y: 56 }, { id: 'V1', joukkue: 'vastustaja', rooli: 'paine', x: 47, y: 51 }, { id: 'V2', joukkue: 'vastustaja', rooli: 'paine', x: 53, y: 49 }],
  liikkeet: [{ id: 'm1', tyyppi: 'syotto', from: { ref: 'A' }, to: { ref: 'B' } }], selitteet: [{ id: 's1', x: 50, y: 59, t: { fi: 'Jokeri' } }] };

const STUB = (cfg) => '(function(){var C=' + JSON.stringify(cfg) + ';window.__avattu=[];window.open=function(u){window.__avattu.push(u);return null};'
  + 'var user={uid:"u1",email:"v@example.test",getIdToken:async function(){return"t"},getIdTokenResult:async function(){return{claims:C.claims}}};'
  + 'var A={currentUser:user,onAuthStateChanged:function(cb){setTimeout(function(){cb(user)},20);return function(){}},signOut:async function(){}};'
  + 'var cf=async function(d){if(d.toiminto==="tila")return{data:{oikeus:true,paivaKiintio:null,kaytetty:0,roolit:["valmennusapuri"],sa:!!C.sa}};'
  + 'if(d.toiminto==="kysy")return{data:{vastaus:"Konseptipeli 2v2+1.",lokiId:"l1",rooli:"valmennusapuri",katkesi:false,kaavio:C.kaavio||undefined}};return{data:{ok:true}}};'
  + 'var F={initializeApp:function(){return{}},auth:function(){return A},app:function(){return{functions:function(){return{httpsCallable:function(){return cf}}}}},appCheck:function(){return{activate:function(){}}}};'
  + 'F.auth.GoogleAuthProvider=function(){};F.appCheck.ReCaptchaEnterpriseProvider=function(){};window.firebase=F;})();';

async function avaa(selain, cfg, o) {
  o = o || {};
  const sk = await selain.newContext({ viewport: { width: o.leveys || 390, height: 844 } }), p = await sk.newPage(), virheet = [];
  p.on('pageerror', (e) => virheet.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') virheet.push('console: ' + m.text()); });
  await p.route('**/*', (r) => {
    const u = r.request().url();
    if (/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: STUB(cfg) });
    if (/gstatic\.com\/firebasejs\//.test(u)) return r.fulfill({ contentType: 'application/javascript', body: '' });
    if (/fonts\.(googleapis|gstatic)\.com/.test(u)) return r.fulfill({ contentType: 'text/css', body: '' });
    if (/version\.json/.test(u)) return r.fulfill({ contentType: 'application/json', body: '{}' });
    if (u.startsWith('file://') || u.startsWith('data:')) return r.continue();
    return r.abort();
  });
  if (o.kieli) await p.addInitScript((k) => { try { localStorage.setItem('tm_va_kieli', k); } catch (e) { /* ei */ } }, o.kieli);
  await p.goto(SIVU + (o.haku || ''), { waitUntil: 'load' });
  await p.waitForSelector('#vaApuri.aktiivinen', { timeout: 15000 });
  await p.fill('#vaKysymys', 'U12, 2v2+1: miten harjoitellaan?');
  await p.click('#vaLaheta');
  await p.waitForSelector('.va-viesti.apuri .va-kupla:not(.va-miettii)', { timeout: 15000 });
  return { sk, p, virheet };
}
const SUODATA = (v) => v.filter((e) => !/Failed to load resource|net::ERR|version\.json/i.test(e));

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K2 · apurin kaavio selaimessa', () => {
  it('valmentaja (fi, 390): kaavio piirtyy vastauksen alle, pienalue alue-kuvana, painike siirtää Masteriin', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p, virheet } = await avaa(selain, { claims: { rooli: 'valmentaja', seuraId: 'demo' }, kaavio: SPEC });
      const svg = p.locator('.va-viesti.apuri .va-kaavio svg');
      expect(await svg.count()).toBe(1);
      expect(await p.locator('.va-viesti.apuri .va-kaavio svg circle').count()).toBeGreaterThan(5);
      expect(await svg.getAttribute('viewBox')).not.toBe('0 0 300 450');
      // K2b: alue-kuva (drawAlue), ei zoomattua täyskenttää; värit sivun --al-tokeneista
      expect(await svg.getAttribute('class')).toBe('pitch alue');
      expect(await svg.getAttribute('viewBox')).toMatch(/^0 0 300 \d/);
      const kuva = await svg.evaluate((s) => ({ tekstit: [...s.querySelectorAll('text')].map((t) => t.textContent),
        oma: getComputedStyle(s.querySelector('g > circle[r="9.5"]')).fill }));
      expect(kuva.tekstit).toContain('Hyökkäys');
      expect(kuva.tekstit.some((t) => / m · hyökkäyssuunta ↑$/.test(t))).toBe(true);
      expect(kuva.oma).toBe('rgb(22, 119, 93)');   // --al-oma vaalea #16775D (apurisivu data-theme="light")
      expect(await svg.getAttribute('aria-label')).toBe('Konseptipelin kaavio');
      const leveys = await p.locator('.va-kaavio').evaluate((e) => e.getBoundingClientRect().width);
      expect(leveys).toBeLessThanOrEqual(390);
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      const nappi = p.locator('.va-kaavio-nappi');
      expect(await nappi.innerText()).toBe('Avaa taktiikkataulussa');
      await nappi.click();
      const siirto = await p.evaluate(() => ({ avattu: window.__avattu, s: JSON.parse(localStorage.getItem('tm_apuri_kaavio')) }));
      expect(siirto.avattu).toEqual(['TalentMaster_Master_v16.html?apuriKaavio=1']);
      expect(siirto.s.seuraId).toBe('demo'); expect(siirto.s.spec.avain).toBe('y_h5');
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('sv: painikkeen teksti "Öppna i taktiktavlan"', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p } = await avaa(selain, { claims: { rooli: 'vp', seuraId: 'demo' }, kaavio: SPEC }, { kieli: 'sv' });
      expect(await p.locator('.va-kaavio-nappi').innerText()).toBe('Öppna i taktiktavlan'); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('ei oikeutta luoda kaaviota (seurasihteeri) tai ei seuraa → kaavio näkyy, painiketta ei', async () => {
    const selain = await selainKaynnista(); try {
      for (const claims of [{ rooli: 'seurasihteeri', seuraId: 'demo' }, { rooli: 'valmentaja' }]) {
        const { sk, p } = await avaa(selain, { claims, kaavio: SPEC });
        expect(await p.locator('.va-kaavio svg').count()).toBe(1);
        expect(await p.locator('.va-kaavio-nappi').count()).toBe(0); await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
  it('SA: painike vain ?seura=-parametrilla; siirto valittuun seuraan', async () => {
    const selain = await selainKaynnista(); try {
      const a = await avaa(selain, { claims: {}, sa: true, kaavio: SPEC });
      expect(await a.p.locator('.va-kaavio-nappi').count()).toBe(0); await a.sk.close();
      const b = await avaa(selain, { claims: {}, sa: true, kaavio: SPEC }, { haku: '?seura=kpv' });
      await b.p.locator('.va-kaavio-nappi').click();
      expect(await b.p.evaluate(() => JSON.parse(localStorage.getItem('tm_apuri_kaavio')).seuraId)).toBe('kpv'); await b.sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('vastauksessa ei kaaviota → ei kuvaa eikä painiketta', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p } = await avaa(selain, { claims: { rooli: 'valmentaja', seuraId: 'demo' } });
      expect(await p.locator('.va-kaavio').count()).toBe(0); expect(await p.locator('.va-kaavio-nappi').count()).toBe(0); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
