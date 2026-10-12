/* V-KOTI B · selain (Playwright + Chrome; chrome-tests-job): Navigaatio v2 Masterin oikeassa kuoressa lipun takana. TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/v-koti-b/ (390/1280 × light/dark). */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const LIPPU = { 'seurat/demo': { nimi: 'FC Demo', liput: { valmentaja_v2: true } } };
const KUTSU = (ryhmia) => 'window._mRyLista=' + (ryhmia ? '[{id:"g1",nimi:"MV-ryhmä",pelaajat_id:["p1","p2"],aktiivinen:true}]' : '[]') + ';window.__od=[];openDrill=function(t){window.__od.push(t)};'
  + 'TM_VALMENTAJA_NAV.tmNavAsenna({db:_db,seuraId:"demo",t:masterT,ws:function(){return _ws},ryhmia:function(){return _mRyHaeLista().then(function(l){return l.length>0})}}).then(function(on){window.__navOn=on;if(on)setWs(TM_VALMENTAJA_NAV.tmNavReitti(_ws).ws)});'
  + 'TM_VALMENTAJA_NAV.tmNavBadge&&0;window.__badge=function(n){TM_VALMENTAJA_NAV.tmNavBadge(n)};';
const NAKYMAT = ['koti', 'inbox', 'cal', 'pulse', 'season', 'dev', 'ryhmat', 'testit', 'kuorma'];
const kaynnista = async (selain, opts, koko) => {
  const sk = await selain.newContext({ viewport: koko }), p = await sk.newPage(); const virheet = []; p.on('pageerror', (e) => virheet.push(e.message));
  await p.goto('file://' + sivu(MASTER, JUURI, Object.assign({ rooli: 'valmentaja', kutsu: KUTSU(opts.ryhmia), dokit: opts.lippu ? LIPPU : {} }, opts))); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 15000 });
  await p.waitForFunction(() => window.__navOn !== undefined, null, { timeout: 15000 }); return { sk, p, virheet };
};
const aktiivinenNakyma = (p) => p.evaluate(() => ({ ws: _ws, nakyma: (document.querySelector('.ws-view.active') || {}).dataset && document.querySelector('.ws-view.active').dataset.view }));
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('V-KOTI B · selain', () => {
  let selain; const avaa = async () => { const { chromium } = require('playwright-core'); selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }); };
  it('LIPPU POIS: vanha navigaatio täysin ennallaan (wsbar, sb-nav, tabbar näkyvissä rakenteena; ei nav-v2, ei nv-elementtejä)', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { lippu: false, ryhmia: true }, { width: 1280, height: 900 });
      expect(await p.evaluate(() => window.__navOn)).toBe(false); expect(await p.evaluate(() => document.body.classList.contains('nav-v2'))).toBe(false);
      expect(await p.locator('.wsbar').isVisible()).toBe(true); expect(await p.locator('.sb-nav').isVisible()).toBe(true); expect(await p.locator('#nvSide, #nvPlus, #nvMob, #nvTabs, .nv-plus').count()).toBe(0);
      expect(await p.locator('.ws-tab').count()).toBe(7); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('LIPPU PÄÄLLÄ 1280: vasen laita, Työkalut kiinni → auki (localStorage), välilehtirivi 01–07 pois, + Havainto joka näkymässä, Joukkue-välilehdet, Ryhmät vain omille', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await kaynnista(selain, { lippu: true, ryhmia: true }, { width: 1280, height: 900 });
      expect(await p.evaluate(() => window.__navOn)).toBe(true); expect(await p.evaluate(() => document.body.classList.contains('nav-v2'))).toBe(true);
      expect(await p.locator('.wsbar').isVisible()).toBe(false); expect(await p.locator('.sb-nav').isVisible()).toBe(false);
      const rivit = async () => (await p.locator('#nvSide .nv-item, #nvSide .nv-otsikko').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim());
      const alku = await rivit(); expect(alku.slice(0, 6)).toEqual(['Koti', 'Viestit', 'Kalenteri', 'Joukkue', 'Pelaajat', 'Ryhmät']); expect(alku[6]).toMatch(/^TYÖKALUT \(6\)|^Työkalut \(6\)/i); expect(alku.length).toBe(8);   // + Asetukset; työkalut kiinni
      expect(await p.locator('#nvSide .nv-tyokalut').count()).toBe(0);
      await p.locator('[data-nv-tyokalut]').click(); expect(await p.locator('#nvSide .nv-tyokalut .nv-item').allInnerTexts()).toEqual(['Testit', 'Kuorma ja fiilis', 'Taktiikkataulu', 'Uusi havainto', 'Itsearvio', 'Valmentajana kehittyminen']);
      expect(await p.evaluate(() => localStorage.getItem('tm_valmentaja_nav_tyokalut'))).toBe('1');
      await p.reload(); await p.waitForFunction(() => window.__navOn !== undefined); // tila säilyy uudelleenlatauksessa
      expect(await p.locator('#nvSide .nv-tyokalut').count()).toBe(1); await p.locator('[data-nv-tyokalut]').click(); expect(await p.evaluate(() => localStorage.getItem('tm_valmentaja_nav_tyokalut'))).toBe('0');
      // + Havainto joka näkymässä (näkyvä, ylhäällä, avaa havainnon joukkue esivalittuna = openDrill('adar'))
      for (const ws of NAKYMAT) { await p.evaluate((w) => setWs(w), ws); const n = await aktiivinenNakyma(p); expect(n.nakyma, ws).toBe(ws); const b = p.locator('#nvPlus .nv-plus'); expect(await b.isVisible(), ws).toBe(true); expect((await b.boundingBox()).y, ws).toBeLessThan(160); }
      await p.locator('#nvPlus .nv-plus').click(); expect(await p.evaluate(() => window.__od)).toEqual(['adar']);
      // Joukkue-välilehdet vain Tilanne/Kausi-näkymissä
      await p.evaluate(() => setWs('pulse')); expect(await p.locator('#nvTabs .nv-v').allInnerTexts()).toEqual(['Tilanne', 'Kausi ja jaksot']); expect(await p.locator('#nvTabs .nv-v.on').innerText()).toBe('Tilanne');
      await p.locator('[data-nv-v="kausi"]').click(); expect((await aktiivinenNakyma(p)).nakyma).toBe('season'); expect(await p.locator('#nvTabs .nv-v.on').innerText()).toBe('Kausi ja jaksot'); expect(await p.locator('#nvSide .nv-item.active').innerText()).toContain('Joukkue');
      await p.evaluate(() => setWs('cal')); expect(await p.locator('#nvTabs .nv-v').count()).toBe(0);
      // Ryhmät-näkymä
      await p.locator('[data-nv="ryhmat"]').click(); await p.waitForFunction(() => document.querySelector('#ryhmatView .nv-ryhma-nimi')); expect(await p.locator('#ryhmatView').innerText()).toContain('MV-ryhmä');
      // Viestit-badge
      await p.evaluate(() => window.__badge(4)); expect(await p.locator('#nvSide [data-nv="viestit"] .nv-badge').innerText()).toBe('4');
      expect(virheet.filter((e) => !/Firebase|firebase|permission|cancelled/i.test(e))).toEqual([]);   // 'cancelled' = reload()in keskeyttämä kysely await sk.close();
    } finally { await selain.close(); }
  }, 240000);
  it('REITIT lipun päällä: jokainen vanha työtila-id ohjautuu (today → koti, pulse → joukkue/tilanne, season → joukkue/kausi, dev/kehitys → pelaajat, havainnot → koti + havaintomodaali)', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { lippu: true, ryhmia: false }, { width: 1280, height: 900 });
      const odotus = { today: 'koti', koti: 'koti', pulse: 'pulse', season: 'season', dev: 'dev', inbox: 'inbox', cal: 'cal', testit: 'testit', kuorma: 'kuorma', havainnot: 'koti' };
      for (const [vanha, uusi] of Object.entries(odotus)) { await p.evaluate(() => { window.__od = []; }); await p.evaluate((w) => setWs(w), vanha); const n = await aktiivinenNakyma(p); expect(n.nakyma, vanha).toBe(uusi); expect(n.ws, vanha).toBe(uusi); }
      await p.evaluate(() => { window.__od = []; setWs('havainnot'); }); await p.waitForFunction(() => window.__od.length > 0); expect(await p.evaluate(() => window.__od)).toEqual(['adar']);
      await p.evaluate(() => { localStorage.setItem('tm-ws', 'today'); }); expect(await p.evaluate(() => TM_VALMENTAJA_NAV.tmNavReitti(localStorage.getItem('tm-ws')).ws)).toBe('koti');   // tallennettu työtila-kirjanmerkki
      expect(await p.locator('#nvSide [data-nv="ryhmat"]').count()).toBe(0);   // ei omia ryhmiä → Ryhmät piilossa
      await sk.close();
    } finally { await selain.close(); }
  }, 180000);
  it('MOBIILI 390: alapalkki Koti · Kalenteri · [+] · Pelaajat · Valikko, Viestit yläkulmassa badgella, drawer = Joukkue + Ryhmät + Työkalut + Asetukset; + joka näkymässä; ei vaakasiirtymää', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { lippu: true, ryhmia: true }, { width: 390, height: 844 });
      expect(await p.locator('#mobTabbar').isVisible()).toBe(false); expect(await p.locator('#nvMob').isVisible()).toBe(true);
      expect((await p.locator('#nvMob > *').allInnerTexts()).map((x) => x.trim())).toEqual(['Koti', 'Kalenteri', '+', 'Pelaajat', 'Valikko']);
      const plus = await p.locator('#nvMob .nv-mplus').boundingBox(), mob = await p.locator('#nvMob').boundingBox(); expect(plus.width).toBeGreaterThanOrEqual(56); expect(Math.abs(plus.x + plus.width / 2 - 195)).toBeLessThan(8);   // keskellä
      await p.evaluate(() => window.__badge(3)); expect(await p.locator('#nvViesti .nv-mviesti').isVisible()).toBe(true); expect(await p.locator('#nvViesti .nv-badge').innerText()).toBe('3');
      expect(await p.locator('#nvSide').isVisible()).toBe(true);   // sivupalkki on drawer (ulkona kunnes avataan)
      expect((await p.locator('#nvSide').boundingBox()).x).toBeLessThan(0);
      await p.locator('#nvMob .nv-mitem').last().click(); await p.waitForTimeout(350); expect((await p.locator('#nvSide').boundingBox()).x).toBeGreaterThanOrEqual(-1);
      const drawer = (await p.locator('#nvSide .nv-item:visible, #nvSide .nv-otsikko:visible').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim()); expect(drawer.some((x) => /^Joukkue/.test(x))).toBe(true); expect(drawer.some((x) => /^Ryhmät/.test(x))).toBe(true); expect(drawer.some((x) => /^Työkalut/i.test(x))).toBe(true); expect(drawer.some((x) => /^Asetukset/.test(x))).toBe(true);
      expect(drawer.some((x) => /^Koti|^Kalenteri|^Pelaajat|^Viestit/.test(x))).toBe(false);   // alapalkissa/yläkulmassa
      await p.locator('#nvSide [data-nv="joukkue"]').click(); await p.waitForTimeout(350); expect((await aktiivinenNakyma(p)).nakyma).toBe('pulse'); expect((await p.locator('#nvSide').boundingBox()).x).toBeLessThan(0);   // drawer sulkeutuu
      for (const ws of NAKYMAT) { await p.evaluate((w) => setWs(w), ws); expect(await p.locator('#nvMob .nv-mplus').isVisible(), ws).toBe(true); }
      await p.locator('#nvMob .nv-mplus').click(); expect(await p.evaluate(() => window.__od)).toEqual(['adar']);
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true); await sk.close();
    } finally { await selain.close(); }
  }, 180000);
  it('KUVAT 390/1280 × dark/light: Koti, Joukkue/Tilanne ja (mobiili) Valikko; ei vaakasiirtymää', async () => {
    await avaa(); try {
      for (const teema of ['dark', 'light']) for (const koko of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
        const { sk, p } = await kaynnista(selain, { lippu: true, ryhmia: true, teema }, koko); const dir = join(JUURI, 'docs/ui-kuvat/v-koti-b'), kuva = async (n) => { if (process.env.TM_KUVAT === '1') { mkdirSync(dir, { recursive: true }); await p.screenshot({ path: join(dir, `${n}_${koko.width}_${teema}.png`), fullPage: false }); } };
        await p.evaluate(() => { window.__badge(3); setWs('koti'); }); await p.waitForTimeout(500); await kuva('koti');
        await p.evaluate(() => { document.querySelector('[data-nv-tyokalut]') && document.querySelector('[data-nv-tyokalut]').click(); setWs('pulse'); }); await p.waitForTimeout(400); await kuva('joukkue_tilanne');
        if (koko.width < 800) { await p.locator('#nvMob .nv-mitem').last().click(); await p.waitForTimeout(400); await kuva('valikko'); }
        expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true); await sk.close();
      }
    } finally { await selain.close(); }
  }, 300000);
});
