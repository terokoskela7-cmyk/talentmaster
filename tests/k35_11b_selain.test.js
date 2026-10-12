/* K35-11b · selain (Playwright + Chrome): kuukausinäkymä Masterissa + "Lisää kalenteriini" piiloon SA:lta ja selkeä virhesyy. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu, NYT, FIXTURE } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const ms = (d, h) => Date.parse(d + 'T' + h + ':00+03:00');
const ev = (id, d, o) => Object.assign({ id, tyyppi: 'harjoitus', nimi: 'Treeni', pvm: d, alkaa: '17:30', paattyy: '19:00', _alkaaMs: ms(d, '17:30'), _paattyyMs: ms(d, '19:00'), joukkue: 'Demo U13', joukkue_nimi: 'Demo U13', paikka: '', tila: 'suunniteltu', poistettu: false, lahde: 'manuaalinen' }, o || {});
const TAP = [ev('a', '2026-10-20'), ev('b', '2026-10-22'), ev('c', '2026-10-22', { nimi: 'Video', alkaa: '19:00', paattyy: '20:00', _alkaaMs: ms('2026-10-22', '19:00'), _paattyyMs: ms('2026-10-22', '20:00') }), ev('o', '2026-10-24', { tyyppi: 'ottelu', nimi: 'Ottelu' }), ev('v', '2026-11-03')];
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K35-11b · selain', () => {
  it('Kuukausi-painike → kuukausiruudukko (ei "tulossa"-toastia): tapahtumat päivillään, otsikko "lokakuu 2026", ‹ › vaihtaa kuukautta, päivän klikkaus → viikko; Kausi on yhä "tulossa"', async () => {
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
    try {
      for (const koko of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
        const sk = await selain.newContext({ viewport: koko }), p = await sk.newPage(); await p.goto('file://' + sivu(MASTER, JUURI, { tapahtumat: TAP, pohjat: false })); await p.waitForSelector('#probe-out', { state: 'attached' });
        await p.evaluate(() => setCalMode('month')); await p.waitForSelector('#calMonth .km');
        expect(await p.locator('.cal-mode.on').allInnerTexts()).toEqual(['KUUKAUSI']); expect(await p.locator('#calMonth').isVisible()).toBe(true); expect(await p.locator('#calWeek').isVisible()).toBe(false); expect(await p.locator('#calTaytaKortti').isVisible()).toBe(false); expect((await p.locator('#calWkLabel').innerText()).toLowerCase()).toBe('lokakuu 2026');
        expect(await p.locator('#calMonth .km-pv').count()).toBe(35); expect(await p.locator('#calMonth [data-pvm="2026-10-22"] .km-ev').count()).toBe(2); expect(await p.locator('#calMonth [data-pvm="2026-10-24"] .km-ev').innerText()).toContain('Ottelu'); expect(await p.locator('#calMonth .km-pv.t').getAttribute('data-pvm')).toBe('2026-10-19');
        expect(await p.locator('.toast, #toast').filter({ hasText: 'tulossa' }).count()).toBe(0);
        expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        if (process.env.TM_KUVAT === '1') { mkdirSync(join(JUURI, 'docs/ui-kuvat/k35-11b'), { recursive: true }); await p.screenshot({ path: join(JUURI, `docs/ui-kuvat/k35-11b/kuukausi_${koko.width}_dark.png`) }); }
        await p.evaluate(() => calNav(1)); expect((await p.locator('#calWkLabel').innerText()).toLowerCase()).toBe('marraskuu 2026'); expect(await p.locator('#calMonth [data-pvm="2026-11-03"] .km-ev').count()).toBe(1); await p.evaluate(() => calNav(-1));
        await p.locator('#calMonth [data-pvm="2026-10-22"]').click({ position: { x: 4, y: 4 } }); expect(await p.evaluate(() => _calMode)).toBe('week'); expect(await p.locator('#calWeek').isVisible()).toBe(true); expect(await p.locator('#calMonth').isVisible()).toBe(false); expect(await p.evaluate(() => _calWkOffset)).toBe(0);   // 22.10. on viikolla 19.–25.10. (nyt = 19.10.)
        await p.evaluate(() => setCalMode('month')); await p.locator('#calMonth .km-ev').first().click(); await p.waitForTimeout(300); await sk.close();
      }
    } finally { await selain.close(); }
  }, 180000);
  it('Lisää kalenteriini: näkyy oman seuran käyttäjälle, PIILOSSA Super Adminilta ja toisen seuran käyttäjältä; virhe näyttää syyn koodista', async () => {
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
    try {
      const sk = await selain.newContext({ viewport: { width: 1280, height: 900 } }), p = await sk.newPage(); await p.goto('file://' + sivu(MASTER, JUURI, { tapahtumat: TAP, pohjat: false })); await p.waitForSelector('#probe-out', { state: 'attached' });
      await p.evaluate(() => { window._tmClaimSeuraId = 'demo'; _superAdmin = false; renderCal(); }); expect(await p.locator('#calTilausBtn').isVisible()).toBe(true);
      await p.evaluate(() => { _superAdmin = true; renderCal(); }); expect(await p.locator('#calTilausBtn').isVisible()).toBe(false);
      await p.evaluate(() => { _superAdmin = false; window._tmClaimSeuraId = 'sjk'; renderCal(); }); expect(await p.locator('#calTilausBtn').isVisible()).toBe(false);
      await p.evaluate(() => { _superAdmin = true; _calTilausAvaa(); }); await p.waitForSelector('.tl-ikkuna'); expect(await p.locator('.tl-ikkuna').innerText()).toContain('Super Admin ei voi tilata seuran kalenteria'); expect(await p.locator('.tl-ikkuna [data-tl="luo"]').count()).toBe(0);
      await p.evaluate(() => document.querySelector('.tl-tausta').remove());
      await p.evaluate(() => { _superAdmin = false; window._tmClaimSeuraId = 'demo'; window.__virhe = true; const U = window.TM_KALENTERI_TILAUS_UI; U.tmTilausAsenna({ t: masterT, kutsu: (n) => (n === 'haeKalenteriTilausTila' ? Promise.resolve({ data: { aktiivinen: false } }) : Promise.reject({ code: 'functions/permission-denied' })), args: () => ({ seuraId: 'demo' }) }).avaa(); });
      await p.waitForSelector('.tl-ikkuna [data-tl="luo"]'); await p.locator('.tl-ikkuna [data-tl="luo"]').click(); await p.waitForFunction(() => /ei ole oikeutta/.test(document.querySelector('.tl-ikkuna').innerText)); expect(await p.locator('.tl-ikkuna').innerText()).toContain('ei Super Admin');
      await sk.close();
    } finally { await selain.close(); }
  }, 180000);
});
