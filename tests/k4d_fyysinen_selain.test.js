/* K4d · Fyysinen-kortin profiilitulkinta selaimessa (Playwright + Chrome): Kehitystyopoyta.html oikeana sivuna, Firebase stubattu. Keksityt nimet (Demo FC).
   Todistaa: tulkintavirke + ⓘ näkyvät Fyysinen-kortissa, kortti ≤ 2 lauseosaa, ei vaakavieritystä 390 px, ei ulkoverkkoa. TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/k4d/ (1280 vaalea + 390 tumma, kolme fixturea). */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
import { K4D_PELAAJAT, VOIMA, JUOKSU, SUUNNANMUUTOS } from './helpers/k4d_fixturet.mjs';
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'k4d');
const SUODATA = (v) => v.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e));
const PEL = PELAAJAT.concat(K4D_PELAAJAT);
const DOKIT = { 'seurat/demo/testitapahtumat/t1': { tila: 'suljettu', luotu: 1 } };
const avaa = (selain, pid, o) => kaynnista(selain, Object.assign({ rooli: 'valmentaja', hash: '#pelaaja/' + pid + '/profiili', pelaajat: PEL, dokit: DOKIT }, o || {}));
const odota = async (p) => { await p.waitForSelector('[data-kn-naytto]', { timeout: 15000 }); await p.waitForSelector('[data-tc-kortti="fyysinen"]', { timeout: 15000 }); };
const avaaKortti = async (p) => { const d = p.locator('details.tc-k[data-tc-kortti="fyysinen"]'); if (!(await d.evaluate((e) => e.open))) await d.locator('> summary').click(); };   // 390 px: haitari suljettuna
const TEKSTIT = { [VOIMA.id]: 'voimantuotto rajoittaa nopeutta', [JUOKSU.id]: 'juoksu ei vielä hyödynnä sitä', [SUUNNANMUUTOS.id]: 'suunnanmuutos jää jälkeen' };
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K4d · Fyysinen-kortin profiilitulkinta', () => {
  it('1280 + 390: tulkinta näkyy kolmella fixturella, ⓘ avautuu, ei vaakavieritystä, ei konsolivirheitä', async () => {
    const selain = await selainKaynnista(); try {
      for (const [pid, leveys] of [[VOIMA.id, 1280], [JUOKSU.id, 390], [SUUNNANMUUTOS.id, 390]]) {
        const { sk, p, virheet } = await avaa(selain, pid, { leveys, teema: leveys === 390 ? 'dark' : 'light' }); await odota(p); await avaaKortti(p);
        const kortti = p.locator('[data-tc-kortti="fyysinen"]'); const lause = await kortti.locator('.tc-lause').innerText();
        expect(lause).toContain(TEKSTIT[pid]); expect(lause).not.toMatch(/Vahvin/); expect(lause.replace('ⓘ', '').trim().split(/(?<=\.)\s+/).length).toBeLessThanOrEqual(2);
        const sel = kortti.locator('.tc-i-t'); expect(await sel.isHidden()).toBe(true); await kortti.locator('[data-tc-selite]').click(); expect(await sel.innerText()).toContain('Perustuu hyppytason ja sprinttitason eroon samanikäisiin verrattuna.');
        expect(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
        expect(SUODATA(virheet)).toEqual([]); await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
  it('KUVAT 1280 vaalea + 390 tumma (TM_KUVAT=1)', async () => {
    if (!process.env.TM_KUVAT) return; mkdirSync(KUVAT, { recursive: true });
    const selain = await selainKaynnista(); try {
      for (const [pid, nimi] of [[VOIMA.id, 'voima'], [JUOKSU.id, 'juoksu'], [SUUNNANMUUTOS.id, 'suunnanmuutos']]) for (const [leveys, teema] of [[1280, 'light'], [390, 'dark']]) {
        const { sk, p } = await avaa(selain, pid, { leveys, teema, korkeus: 900 }); await odota(p); await p.waitForTimeout(800); await avaaKortti(p);
        await p.addStyleTag({ content: '#nvSide,[class*="nv-"],[id^="nv"]{display:none!important}.kt-ot{position:static!important}' });
        await p.locator('[data-tc-kortti="fyysinen"] [data-tc-selite]').click();
        await p.locator('[data-tc-kortti="fyysinen"]').screenshot({ path: join(KUVAT, 'fyysinen-' + nimi + '-' + leveys + '-' + (teema === 'light' ? 'vaalea' : 'tumma') + '.png') });
        await sk.close();
      }
    } finally { await selain.close(); }
  }, 180000);
});
