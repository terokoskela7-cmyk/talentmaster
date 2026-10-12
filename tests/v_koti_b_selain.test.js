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
const KUTSU = (ryhmia, oikeaDrill) => 'window._mRyLista=' + (ryhmia ? '[{id:"g1",nimi:"MV-ryhmä",pelaajat_id:["p1","p2"],aktiivinen:true}]' : '[]') + ';window.__od=[];' + (oikeaDrill ? '_initKeyboard();' : 'openDrill=function(t){window.__od.push(t)};')
  + 'TM_VALMENTAJA_NAV.tmNavAsenna({db:_db,seuraId:"demo",t:masterT,ws:function(){return _ws},ryhmia:function(){return _mRyHaeLista().then(function(l){return l.length>0})}}).then(function(on){window.__navOn=on;if(on)setWs(TM_VALMENTAJA_NAV.tmNavReitti(_ws).ws)});'
  + 'TM_VALMENTAJA_NAV.tmNavBadge&&0;window.__badge=function(n){TM_VALMENTAJA_NAV.tmNavBadge(n)};';
const NAKYMAT = ['koti', 'inbox', 'cal', 'pulse', 'season', 'dev', 'ryhmat', 'testit', 'kuorma'];
const kaynnista = async (selain, opts, koko) => {
  const sk = await selain.newContext({ viewport: koko }), p = await sk.newPage(); const virheet = []; p.on('pageerror', (e) => virheet.push(e.message));
  await p.goto('file://' + sivu(MASTER, JUURI, Object.assign({ rooli: 'valmentaja', kutsu: (opts.valitsin || '') + KUTSU(opts.ryhmia, opts.oikeaDrill), dokit: opts.lippu ? LIPPU : {} }, opts))); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 15000 });
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
      expect(await p.locator('.wsbar').isVisible()).toBe(false); expect(await p.locator('.sb-nav').isVisible()).toBe(false);   // ei valitsimia → koko vanha nav piilossa
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
  it('LIVE #1 valitsin: seura-/joukkuevalitsin näkyy laidan ylälaidassa (desktop) ja vetolaatikon ylälaidassa (mobiili); joukkueen vaihto päivittää Koti/Kalenteri/Joukkue', async () => {
    const valitsin = 'window.__r={koti:0,cal:0,pulse:0};var _rk=renderKoti,_rc=renderCal,_rp=renderPulse;renderKoti=function(){window.__r.koti++;return _rk.apply(this,arguments)};renderCal=function(){window.__r.cal++;return _rc.apply(this,arguments)};renderPulse=function(){window.__r.pulse++;return _rp.apply(this,arguments)};'
      + '_lataaPelaajat=async function(){};_lataaTestitapahtumat=async function(){};_lataaKalenteriTapahtumat=async function(){};document.getElementById("sbSeura").textContent="FC Demo";_rakennaSAJoukkueValitsin("demo",{});';
    const kokoelmat = { 'seurat/demo/pelaajat': [{ id: 'p1', data: { joukkue: 'Demo U13' } }, { id: 'p5', data: { joukkue: 'Demo U14' } }] };
    await avaa(); try {
      for (const koko of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
        const { sk, p } = await kaynnista(selain, { lippu: true, ryhmia: false, valitsin, kokoelmat }, koko); await p.waitForSelector('#sa-joukkue-valitsin', { state: 'attached' });
        const mobiili = koko.width < 800; if (mobiili) { await p.locator('#nvMob .nv-mitem').last().click(); await p.waitForTimeout(350); }
        const sel = p.locator('#sa-joukkue-valitsin'); expect(await sel.isVisible(), 'valitsin näkyy ' + koko.width).toBe(true);
        const y = (await sel.boundingBox()).y, joukkue = await p.locator('#nvSide [data-nv="joukkue"]').boundingBox(); expect(y).toBeLessThan(joukkue.y);   // laidan ylälaidassa, valikon yläpuolella
        expect(await p.locator('.sb-seura').isVisible()).toBe(false);   // valitsin nimen tilalle
        if (process.env.TM_KUVAT === '1') { mkdirSync(join(JUURI, 'docs/ui-kuvat/v-koti-b'), { recursive: true }); await p.screenshot({ path: join(JUURI, `docs/ui-kuvat/v-koti-b/valitsin_${koko.width}_dark.png`) }); }
        await p.evaluate(() => { window.__r = { koti: 0, cal: 0, pulse: 0 }; }); await sel.selectOption('DEMO U14'); await p.waitForFunction(() => window.__r.koti > 0 && window.__r.cal > 0 && window.__r.pulse > 0, null, { timeout: 8000 });
        expect(await p.evaluate(() => _joukkue)).toBe('DEMO U14'); await sk.close();
      }
    } finally { await selain.close(); }
  }, 180000);
  it('LIVE #2 mobiili: ei hampurilaista, ei Komennot ⌘K < 800 px (desktopilla Komennot säilyy); #4 profiilikortti pois joka näkymästä', async () => {
    await avaa(); try {
      for (const koko of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
        const { sk, p } = await kaynnista(selain, { lippu: true, ryhmia: true }, koko); const mob = koko.width < 800;
        expect(await p.locator('.nav-burger').isVisible()).toBe(false); expect(await p.locator('.cmd-btn').isVisible()).toBe(!mob);
        await p.evaluate(() => { window._valmentajaData = { etunimi: 'Rasmus', sukunimi: 'B', rooli: 'vp' }; });
        for (const ws of NAKYMAT) { await p.evaluate((w) => { setWs(w); renderCoachSelfCard(); }, ws); expect(await p.locator('#coachSelfCard').isVisible(), ws + ' ' + koko.width).toBe(false); }
        await sk.close();
      }
      const { sk, p } = await kaynnista(selain, { lippu: false, ryhmia: false }, { width: 390, height: 844 }); expect(await p.locator('.nav-burger').isVisible()).toBe(true); await sk.close();   // lippu pois → vanha ennallaan
    } finally { await selain.close(); }
  }, 180000);
  it('LIVE #3 Esc sulkee havaintomodaalin (valinta ja upotettu pikakortti) ja fokus palaa + Havainto -painikkeeseen (desktop + mobiili)', async () => {
    await avaa(); try {
      for (const koko of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
        const { sk, p } = await kaynnista(selain, { lippu: true, ryhmia: false, oikeaDrill: true }, koko), plus = koko.width < 800 ? '#nvMob .nv-mplus' : '#nvPlus .nv-plus';
        await p.locator(plus).click(); await p.waitForSelector('#_tmPhValinta'); await p.keyboard.press('Escape'); expect(await p.locator('#_tmPhValinta').count()).toBe(0);
        expect(await p.evaluate((s) => document.activeElement === document.querySelector(s), plus)).toBe(true);
        await p.evaluate(() => _avaaPikakorttiUpotettu('')); await p.waitForSelector('#_pkModal'); expect(await p.evaluate(() => typeof window._pkSulje)).toBe('function'); await p.locator(plus).focus().catch(() => {});
        await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.keyboard.press('Escape'); await p.waitForFunction(() => !document.getElementById('_pkModal')); expect(await p.evaluate((s) => document.activeElement === document.querySelector(s), plus)).toBe(true);
        await p.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))); expect(await p.locator('#_pkModal, #_tmPhValinta').count()).toBe(0);   // ei modaalia: Esc ei riko mitään
        await sk.close();
      }
    } finally { await selain.close(); }
  }, 180000);
  it('LIVE #1029: SA valitsee U15 (value = doc-id, teksti = nimi) → Kodissa 4 pelaajaa, ei "lisää pelaajat"; vaihto U14 → 2 pelaajaa', async () => {
    const docs = 'var __jd=[{id:"demo_u15",nimi:"FC Demo U15"},{id:"demo_u14",nimi:"FC Demo U14"}];_mJoukkueDocs=__jd;_mLataaJoukkueDocs=async function(){return __jd};_mJoukkueDocsSeura=_seuraId;'
      + 'var __pel=[1,2,3,4].map(function(n){return{id:"a"+n,etunimi:"U15-"+n,sukunimi:"Pelaaja",joukkue:"FC Demo U15",joukkueet:["demo_u15"]}}).concat([1,2].map(function(n){return{id:"b"+n,etunimi:"U14-"+n,sukunimi:"Pelaaja",joukkue:"FC Demo U14",joukkueet:["demo_u14"]}}));_pelaajatData=__pel.slice();_kalenteriTapahtumat=[];'
      + '_lataaPelaajat=async function(){_pelaajatData=__pel.slice()};_lataaTestitapahtumat=async function(){};_lataaKalenteriTapahtumat=async function(){};document.getElementById("sbSeura").textContent="FC Demo";_rakennaSAJoukkueValitsin("demo",{oletusKaikki:true});';
    const kokoelmat = { 'seurat/demo/joukkueet': [{ id: 'demo_u15', data: { nimi: 'FC Demo U15' } }, { id: 'demo_u14', data: { nimi: 'FC Demo U14' } }] };
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { lippu: true, ryhmia: false, valitsin: docs, kokoelmat }, { width: 1280, height: 900 }); await p.waitForSelector('#sa-joukkue-valitsin', { state: 'attached' });
      expect(await p.evaluate(() => Array.from(document.querySelectorAll('#sa-joukkue-valitsin option')).map((o) => o.value + '|' + o.textContent))).toEqual(['|— Kaikki joukkueet —', 'demo_u14|FC Demo U14', 'demo_u15|FC Demo U15']);
      await p.locator('#sa-joukkue-valitsin').selectOption('demo_u15'); await p.waitForFunction(() => /0\/4(?!\d)/.test(document.getElementById('kotiView').innerText), null, { timeout: 8000 });
      const t = await p.locator('#kotiView').innerText(); expect(t).toMatch(/0\/4(?!\d)/); expect(t).not.toMatch(/lisää pelaajat/i); expect(await p.evaluate(() => _joukkue)).toBe('FC Demo U15');
      await p.locator('#sa-joukkue-valitsin').selectOption('demo_u14'); await p.waitForFunction(() => /0\/2(?!\d)/.test(document.getElementById('kotiView').innerText), null, { timeout: 8000 });
      await sk.close();
    } finally { await selain.close(); }
  }, 180000);
});
