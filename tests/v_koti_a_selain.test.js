/* V-KOTI A · selain (Playwright + Chrome; chrome-tests-job): Masterin Koti v2 oikeassa kuoressa — kortit, napit, ei vaakasiirtymää 390 + 1280, light + dark. TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/v-koti-a/. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const KUTSU = 'var d=function(o,h,m){var t=new Date(Date.now()+o*864e5);t.setHours(h,m||0,0,0);return t},pv=function(t){return tmPaivaIso(t)},mk=function(id,o,h,e){var a=d(o,h),b=new Date(a.getTime()+90*6e4);return Object.assign({id:id,nimi:"Treeni",tyyppi:"harjoitus",pvm:pv(a),alkaa:("0"+h).slice(-2)+":00",paattyy:("0"+(h+1)).slice(-2)+":30",_alkaaMs:a.getTime(),_paattyyMs:b.getTime(),joukkue:"Demo U13",joukkueet:["demo_u13"],paikka:"Kenttä 2"},e||{})};'
  + '_kalenteriTapahtumat=[mk("e1",0,7),mk("e2",1,17),mk("e3",3,17),mk("e4",4,11,{tyyppi:"ottelu",nimi:"Ottelu"})];_kirjaukset=[];_vpViestit=[{_firestoreId:"m1",fromNimi:"VP",teksti:"Muistakaa palaverit",luettu:false,t:Date.now()}];window._kotiSaatHaettu="e2";window._kotiSaat={e2:{tulossa:9,estynyt:[{nimi:"Beni Berg",syy:"koe"}]}};setWs("koti");renderKoti();';
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('V-KOTI A · selain', () => {
  it('Koti v2: Seuraava + Tehtävät + Tämä viikko + Pelaajanostot + Syke + Viestit; napit toimivat; ei vaakasiirtymää — 390/1280 × dark/light', async () => {
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
    try {
      for (const teema of ['dark', 'light']) for (const koko of [{ width: 390, height: 900 }, { width: 1280, height: 1000 }]) {
        const sk = await selain.newContext({ viewport: koko }), p = await sk.newPage();
        await p.goto('file://' + sivu(MASTER, JUURI, { teema, rooli: 'valmentaja', kutsu: KUTSU })); await p.waitForSelector('#kotiView .vk', { timeout: 15000 });
        const t = await p.locator('#kotiView').innerText();
        ['SEURAAVA', 'TEHTÄVÄT', 'TÄMÄ VIIKKO', 'SYKE', 'Muistakaa palaverit'].forEach((s) => expect(t.toUpperCase()).toContain(s.toUpperCase()));
        expect(t).toMatch(/\d+ pelaajaa · 9 vahvistanut · 1 estynyt/); expect(t).toContain('Beni B. (koe)'); expect(await p.locator('#kotiView .vk-pv').count()).toBe(7); expect(await p.locator('#kotiView .vk-pv.t').count()).toBe(1);
        expect(await p.locator('#kotiView .vk-teht').count()).toBeLessThanOrEqual(3); expect(await p.locator('#kotiView .vk-nosto').count()).toBeLessThanOrEqual(4);
        expect(await p.evaluate(() => document.querySelector('#kotiView .coach-self-card, #kotiView .koti-strippi-alas'))).toBeNull();   // vanha profiilikortti/D1 ka -rivi ei Kodissa
        expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        if (process.env.TM_KUVAT === '1') { const dir = join(JUURI, 'docs/ui-kuvat/v-koti-a'); mkdirSync(dir, { recursive: true }); await p.screenshot({ path: join(dir, `koti_${koko.width}_${teema}.png`), fullPage: true }); }
        await sk.close();
      }
    } finally { await selain.close(); }
  }, 180000);
});
