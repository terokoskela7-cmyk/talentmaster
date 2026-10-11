/* K35-6a · selain (Playwright + Chrome, kuten kentta_k0: ei unit-tests-portissa, vaan chrome-tests-jobissa): tyhjä viikko → Täytä viikko → 4 ehdotusta → Vahvista → 4 tapahtumaa.
   Masterin OIKEA sivu, Firestore mockattu muistissa (tests/helpers/kalenteri_sivu.mjs); FC Demon kaltainen fixture. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu, FIXTURE } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const KAYTOSSA = process.env.TM_CHROME_TESTS !== '0' && !!CHROME;

describe.skipIf(!KAYTOSSA)('K35-6a · selain: Täytä viikko', () => {
  const avaa = async (selain, koko, opts) => { const sk = await selain.newContext({ viewport: koko }), p = await sk.newPage(); await p.goto('file://' + sivu(MASTER, JUURI, opts), { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 30000 }); expect(await p.evaluate(() => document.getElementById('probe-out').textContent)).toBe('ok'); if (!opts.ilmanKorttia) await p.waitForSelector('#calTaytaKortti .kv-btn', { timeout: 10000 }); else await p.waitForSelector('.kv-paiva'); return { sk, p }; };
  const TAP = [...FIXTURE.historia, FIXTURE.ottelu];
  for (const koko of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    it(koko.width + ' px: tyhjä viikko → Täytä viikko → 4 ehdotusta → Vahvista → 4 tapahtumaa; kirjoitukset vain seurat/demo', async () => {
      const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
      try {
        const { sk, p } = await avaa(selain, koko, { tapahtumat: TAP });
        expect(await p.locator('#calTaytaKortti .kv-btn').count()).toBe(1); expect(await p.locator('#calTaytaKortti').innerText()).toContain('Täytä viikko'); expect(await p.locator('.kv-paiva').count()).toBe(7); expect(await p.locator('.kv-ehdotus').count()).toBe(0);
        await p.locator('#calTaytaKortti .kv-btn').click(); expect(await p.locator('.kv-ehdotus').count()).toBe(4); expect(await p.locator('#calTaytaKortti').innerText()).toContain('Vahvista 4 harjoitusta'); expect(await p.evaluate(() => window.__kirj.length)).toBe(0);
        const asettelu = await p.evaluate(() => { const a = document.querySelectorAll('.kv-paiva'), r0 = a[0].getBoundingClientRect(), r1 = a[1].getBoundingClientRect(), w = document.getElementById('calWeek').getBoundingClientRect(); return { samaRivi: Math.abs(r0.top - r1.top) < 2, leveys: r0.width, viikko: w.width, korttiYli: [...document.querySelectorAll('.kv-kortti')].filter((k) => k.getBoundingClientRect().right > w.right + 1).length }; });   // (Masterin yleinen mobiiliasettelu on erillinen: main on leveämpi kuin ikkuna jo ennen tätä muutosta)
        if (koko.width <= 640) { expect(asettelu.samaRivi).toBe(false); expect(asettelu.leveys).toBeGreaterThan(asettelu.viikko * 0.95); } else expect(asettelu.samaRivi).toBe(true); expect(asettelu.korttiYli).toBe(0);   // päivät riveinä mobiilissa, 7 saraketta desktopilla; kortit pysyvät sarakkeessaan
        await p.locator('#calTaytaKortti .kv-btn').click(); await p.waitForFunction(() => document.querySelectorAll('.kv-ehdotus').length === 0 && window.__kirj.length === 4, null, { timeout: 5000 });
        const kirj = await p.evaluate(() => window.__kirj.map((o) => ({ md: o.d.md, uid: o.d.luoja_uid, j: o.d.joukkue, pohja: o.d.pohja_avain, kohde: o.d.kohde.tyyppi }))); expect(kirj.map((k) => k.md)).toEqual([-5, -4, -2, -1]); kirj.forEach((k) => expect(k).toMatchObject({ uid: 'u1', j: 'Demo U13', pohja: 'spl_8v8_lapsuus', kohde: 'joukkue' }));
        expect(await p.evaluate(() => window.__paivitykset.length)).toBe(0); expect(await p.locator('#calTaytaKortti .kv-btn').count()).toBe(0);   // viikolla on nyt harjoituksia → signaalikortti poissa
        expect(await p.locator('.kv-kortti:not(.kv-ehdotus)').count()).toBeGreaterThanOrEqual(5);   // 4 uutta + ottelu
        await sk.close();
      } finally { await selain.close(); }
    }, 90000);
  }
  it('esikatselukortin muokkaus (aika, paikka) ja Peru; syysloma-viikko 12.–18.10. näkyy päiväsarakkeissa Koko pvm -korttina', async () => {
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
    try {
      const { sk, p } = await avaa(selain, { width: 1280, height: 900 }, { tapahtumat: TAP });
      await p.locator('#calTaytaKortti .kv-btn').click(); await p.locator('.kv-ehdotus').first().click(); await p.waitForSelector('#calEhdModal .cal-modal-ala');
      await p.locator('#calEhdModal input[type=text]').fill('Demohalli'); await p.locator('#calEhdModal .cal-modal-ala button:last-child').click(); expect(await p.locator('.kv-ehdotus').first().innerText()).toContain('Demohalli');
      await p.locator('.kv-ehdotus').first().click(); await p.locator('#calEhdModal .cal-modal-ala button:first-child').click(); expect(await p.locator('.kv-ehdotus').count()).toBe(3); expect(await p.locator('#calTaytaKortti').innerText()).toContain('Vahvista 3 harjoitusta');
      await p.locator('#calTaytaKortti .kv-linkki', { hasText: 'Peru' }).click(); expect(await p.locator('.kv-ehdotus').count()).toBe(0); expect(await p.locator('#calTaytaKortti .kv-btn').innerText()).toBe('Täytä viikko'); await sk.close();
      const { sk: sk2, p: p2 } = await avaa(selain, { width: 1280, height: 900 }, { tapahtumat: [...TAP, FIXTURE.tauko], viikko: -1, ilmanKorttia: true }); expect(await p2.locator('.kv-koko .kv-kortti').count()).toBe(7); expect(await p2.locator('.kv-koko').first().innerText()).toContain('Syysloma'); await sk2.close();
    } finally { await selain.close(); }
  }, 90000);
});
