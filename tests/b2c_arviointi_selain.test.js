/* B2c · selain (Playwright + Chrome): Jakson arviointi (Sulje jakso) sheetinä uudella sivulla (D100, D248). Firebase stubattu (tests/helpers/kt_sivu.mjs). TM_KUVAT=1 → docs/ui-kuvat/b2c-arviointi/ (1280 + 390, tumma). */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
const require = createRequire(import.meta.url), SN = require('../lib/tm_sanasto.js');
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'b2c-arviointi');
const odota = (p) => p.waitForSelector('.kt-nimi', { timeout: 15000 });
const VK = { y_h1: { a: { '2026-W42': { v1: { arvo: 1, pvm: '2026-10-14', rooli: 'valmentaja' } }, '2026-W43': { v1: { arvo: 3, pvm: '2026-10-19', rooli: 'valmentaja' } } } } };
const pelaajat = () => PELAAJAT.map((x) => x.id === 'p2' ? Object.assign({}, x, { jaksofokus: Object.assign({}, x.jaksofokus, { osa_havainnot_vk: VK }) }) : x);
const avaaSheet = async (p) => { if (!(await p.locator('.kt-valikko[open]').count())) await p.locator('.kt-valikko > summary').click(); await p.locator('[data-kt-valikko="sulje"]').click(); await p.waitForSelector('[data-kvk-kysymys]'); };
const vastaa = async (p, q, v) => p.locator('[data-kvk-kysymys="' + q + '"] [data-kvk-arvo="' + v + '"]').click();
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('B2c · Jakson arviointi sheetinä', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };
  it('⋯ → Tee jakson yhteenveto avaa PITKÄN sheetin (ei vanhaa modaalia): 3 kysymystä + lause; ilman vastauksia ei kirjoitusta (virhetoast, sheet auki); D248-sanat, ei kiellettyjä sanoja; Kehityskeskustelu-nappi (K4b)', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: pelaajat() }); await odota(p); await avaaSheet(p);
      expect(await p.locator('[data-ts-tausta].ts-pitka').count()).toBe(1); expect(await p.locator('[role="dialog"]').count()).toBe(1); expect(await p.locator('#_kvkModal').count()).toBe(0);
      expect(await p.locator('[data-kvk-kysymys]').count()).toBe(3); expect(await p.locator('[data-kvk-syvenna]').count()).toBe(1);   /* K4b: "Kehityskeskustelu"-nappi avaa oikean keskustelun (ei sulkulomaketta) */ expect(await p.locator('[data-kvk-k3], [data-k3], [data-k3-osio]').count()).toBe(0);   /* K3a: osio näkyy vain kun valmentaja valitsee "Anna pelaajan valita" (tests/k3a_selain.test.js) */
      expect(await p.locator('[id^="tsOtsikko_"]').first().innerText()).toMatch(/^Tee jakson yhteenveto · 1\. kosketus/);
      expect(await p.locator('[data-kvk-kysymys="nakyi"] [data-kvk-arvo]').allInnerTexts()).toEqual(['Ei vielä', 'Ohjatusti', 'Itsenäisesti']);   // sama sanasto kuin havaintonapeilla
      expect(SN.tmSanastoKielletyt(await p.evaluate(() => document.body.innerText))).toEqual([]);
      await p.locator('[data-kvk-tallenna]').click({ force: true }); await p.waitForTimeout(400);
      expect(await p.evaluate(() => (window.__batch || []).length)).toBe(0); expect(await p.locator('[data-kvk-kysymys]').count()).toBe(3); expect(await p.locator('#toast-wrap').innerText()).toMatch(/Vastaa kaikkiin kolmeen/);
      await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('luonnos: valinta + lause säilyvät kun sheet suljetaan (ei kirjoitusta) ja avataan uudelleen', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'vp', hash: '#pelaaja/p2/tanaan', pelaajat: pelaajat() }); await odota(p); await avaaSheet(p);
      await vastaa(p, 'nakyi', 'ohjatusti'); await p.locator('#kvkLause').fill('Hyvä alku.'); await p.locator('[data-ts-sulje]').click(); await p.waitForTimeout(300);
      expect(await p.locator('[data-kvk-kysymys]').count()).toBe(0); expect(await p.evaluate(() => (window.__batch || []).length)).toBe(0);
      await avaaSheet(p); expect(await p.locator('[data-kvk-kysymys="nakyi"] [data-kvk-arvo="ohjatusti"]').getAttribute('aria-pressed').catch(() => null)).not.toBe('false');
      expect(await p.locator('#kvkLause').inputValue()).toBe('Hyvä alku.'); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('tallennus = YKSI batch: pelaajadokki (jakso suljetaan, historiariville havainnot_vk + lause) + reviewit/{pvm}.kevyt; sheet kiinni, toast, Tänään päivittyy (ei jaksoa)', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: pelaajat() }); await odota(p); await avaaSheet(p);
      await vastaa(p, 'nakyi', 'itsenaisesti'); await vastaa(p, 'treeni', 'usein'); await vastaa(p, 'mukana', 'hyvin'); await p.locator('#kvkLause').fill('Katsoi ylös ennen vastaanottoa.');
      await p.locator('#kvkNayta').check();   // 0b: oletus pois → "Näytä myös pelaajalle" päälle (lause historiariville)
      await p.locator('[data-kvk-tallenna]').click({ force: true }); await p.waitForFunction(() => (window.__batch || []).length === 1, null, { timeout: 8000 });
      const b = await p.evaluate(() => window.__batch[0]); expect(b).toHaveLength(2);
      const upd = b.find((o) => o.update), set = b.find((o) => o.set);
      expect(upd.path).toBe('seurat/demo/pelaajat/p2'); expect(Object.keys(upd.update).sort()).toEqual(['jaksofokus', 'jaksofokus_historia', 'review_viimeisin_pvm', 'review_viimeisin_tyyppi']);
      const rivi = upd.update.jaksofokus_historia.__arrayUnion[0]; expect(rivi).toMatchObject({ konsepti_avain: 'y_h1', sulkutapa: 'suljettu', lause: 'Katsoi ylös ennen vastaanottoa.' }); expect(rivi.havainnot_vk).toEqual(VK);
      expect(set.path).toMatch(/^seurat\/demo\/pelaajat\/p2\/reviewit\/\d{4}-\d{2}-\d{2}$/); expect(set.set.kevyt).toEqual({ nakyi: 'itsenaisesti', treeni: 'usein', mukana: 'hyvin' });
      await p.waitForSelector('[data-kvk-kysymys]', { state: 'detached', timeout: 5000 }); expect(await p.locator('#toast-wrap').innerText()).toMatch(/Jakso suljettu/);
      expect(await p.locator('.kt-ot [data-kt-rivitila]').getAttribute('data-kt-rivitila')).not.toBe('kaynnissa');   // jakso ei enää käynnissä
      await sk.close();
    } finally { await selain.close(); }
  }, 60000);

  it('0b: "Näytä myös pelaajalle" POIS (oletus) → lause EI historiariville vaan reviewit/{pvm}.lause_sisainen (sama batch)', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: pelaajat() }); await odota(p); await avaaSheet(p);
      expect(await p.locator('#kvkNayta').isChecked()).toBe(false);
      await vastaa(p, 'nakyi', 'itsenaisesti'); await vastaa(p, 'treeni', 'usein'); await vastaa(p, 'mukana', 'hyvin'); await p.locator('#kvkLause').fill('Katsoi ylös ennen vastaanottoa.');
      await p.locator('[data-kvk-tallenna]').click({ force: true }); await p.waitForFunction(() => (window.__batch || []).length === 1, null, { timeout: 8000 });
      const b = await p.evaluate(() => window.__batch[0]); const upd = b.find((o) => o.update), set = b.find((o) => o.set);
      const rivi = upd.update.jaksofokus_historia.__arrayUnion[0]; expect('lause' in rivi).toBe(false); expect(JSON.stringify(upd.update)).not.toContain('Katsoi ylös');
      expect(set.set.lause_sisainen).toMatchObject({ teksti: 'Katsoi ylös ennen vastaanottoa.', lahde: 'valmentaja' });
      await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('390 px: sheet ei aiheuta vaakavieritystä', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', leveys: 390, korkeus: 844, pelaajat: pelaajat() }); await odota(p); await avaaSheet(p);
      expect(await p.evaluate(() => { const d = document.documentElement, pa = document.querySelector('.ts-paneeli'); return [d.scrollWidth - d.clientWidth, pa.scrollWidth - pa.clientWidth]; })).toEqual([0, 0]); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('TM_KUVAT=1 · kuvat 1280 + 390 (tumma): sheet auki, vastattu ja Tänään tallennuksen jälkeen', async () => {
    if (!process.env.TM_KUVAT) return; mkdirSync(KUVAT, { recursive: true }); await avaa(); try {
      for (const [n, w, h] of [['1280', 1280, 900], ['390', 390, 844]]) {
        const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', leveys: w, korkeus: h, pelaajat: pelaajat() }); await odota(p); await avaaSheet(p); await p.waitForTimeout(300);
        await p.screenshot({ path: join(KUVAT, 'arviointi-sheet-' + n + '.png') });
        await vastaa(p, 'nakyi', 'itsenaisesti'); await vastaa(p, 'treeni', 'usein'); await vastaa(p, 'mukana', 'hyvin'); await p.locator('#kvkLause').fill('Katsoi ylös ennen vastaanottoa.'); await p.waitForTimeout(200);
        await p.screenshot({ path: join(KUVAT, 'arviointi-vastattu-' + n + '.png') });
        await p.locator('[data-kvk-tallenna]').click({ force: true }); await p.waitForSelector('[data-kvk-kysymys]', { state: 'detached' }); await p.waitForTimeout(400);
        await p.screenshot({ path: join(KUVAT, 'jakso-suljettu-' + n + '.png') }); await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
});
