/* K35-10 · Master selain (Playwright + Chrome; chrome-tests-job): oikea rajattu lataus — oletusikkuna, viikon selaus ikkunan ulkopuolelle hakee VAIN puuttuvan välin, 2 kk sitten alkanut tauko näkyy. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu, NYT } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const pv = (o, h) => { const d = new Date(NYT + o * 864e5); d.setHours(h, 0, 0, 0); return d.getTime(); };
const ev = (id, o, h, x) => Object.assign({ id, nimi: id, tyyppi: 'harjoitus', alkaaMs: pv(o, h), paattyyMs: pv(o, h) + 90 * 6e4, poistettu: false, joukkue: 'Demo U13', joukkueet: ['demo_u13'] }, x || {});
const DOKIT = [ev('lahella', 2, 17), ev('kaukana', 300, 17), ev('vanha', -200, 17), ev('poistettu', 3, 17, { poistettu: true }), ev('Tauko 2kk', -60, 0, { tyyppi: 'seuran_tauko', koko_paiva: true, paattyyMs: pv(20, 23), joukkue: '', joukkueet: [] })];
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K35-10 · rajattu kalenterilataus (selain)', () => {
  it('oletuksena vain −8…+26 vk (kaukana/vanha ei ladata); poistettu pois; 2 kk sitten alkanut tauko mukana (2. kysely); viikon selaus +300 pv hakee vain puuttuvan välin', async () => {
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
    try {
      const sk = await selain.newContext({ viewport: { width: 1280, height: 900 } }), p = await sk.newPage();
      await p.goto('file://' + sivu(MASTER, JUURI, { kalDokit: DOKIT, kutsu: '_lataaKalenteriTapahtumat();' })); await p.waitForSelector('#probe-out', { state: 'attached' });
      await p.waitForFunction(() => window.__kyselyt.length >= 2 && !_kalLataa);
      const id = () => p.evaluate(() => _kalenteriTapahtumat.map((t) => t.id).sort());
      expect(await id()).toEqual(['Tauko 2kk', 'lahella']);   // kaukana (+300 pv) ja vanha (−200 pv) eivät latautuneet, poistettu suodatettu muistissa
      expect(await p.evaluate(() => window.__kyselyt)).toEqual(['alkaa>=,alkaa<=', 'koko_paiva==,paattyy>=']);
      await p.evaluate(() => { window.__kyselyt.length = 0; _calWkOffset = 43; renderCal(); });   // ~+301 pv
      await p.waitForFunction(() => _kalenteriTapahtumat.some((t) => t.id === 'kaukana'));
      expect(await id()).toEqual(['Tauko 2kk', 'kaukana', 'lahella']);
      expect(await p.evaluate(() => window.__kyselyt)).toEqual(['alkaa>=,alkaa<=', 'koko_paiva==,paattyy>=']);   // yksi puuttuva väli (ei koko historiaa uudelleen)
      await p.evaluate(() => { window.__kyselyt.length = 0; _calWkOffset = 42; renderCal(); }); await p.waitForTimeout(400);
      expect(await p.evaluate(() => window.__kyselyt.length)).toBe(0);   // jo ladatulla viikolla ei kyselyitä
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
