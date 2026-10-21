/* K1e · Profiili 390 px (selain, Playwright + Chrome): yhteenvedon rivi "Testattu 4.10. · 2 vk" mahtuu yhdelle riville eikä katkea oikeasta reunasta. TM_KUVAT=1 → docs/ui-kuvat/k1e/ (Demo FC -data, Topias-fixture). */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
import { K4A_PELAAJAT, TOPIAS } from './helpers/k4a_fixturet.mjs';
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'k1e');
const PEL = PELAAJAT.concat(K4A_PELAAJAT), DOKIT = { 'seurat/demo/testitapahtumat/t1': { tila: 'suljettu', luotu: 1 } };
const avaa = (selain, o) => kaynnista(selain, Object.assign({ rooli: 'valmentaja', hash: '#pelaaja/' + TOPIAS.id + '/profiili', pelaajat: PEL, dokit: DOKIT }, o || {}));
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K1e · Profiili 390: "Testattu"-rivi', () => {
  for (const leveys of [390, 360]) it(leveys + ' px: rivi "Testattu 4.10. · 2 vk" on yhdellä rivillä ja kokonaan näkyvissä (ei vaakavieritystä)', async () => {
    const selain = await selainKaynnista(); try {
      const { p } = await avaa(selain, { leveys, teema: 'dark' }); await p.waitForSelector('[data-tc-kortti]', { timeout: 15000 });
      const r = await p.evaluate(() => { const m = document.querySelector('.tc-s-yht .tc-mono'), b = m.getBoundingClientRect(), lh = parseFloat(getComputedStyle(m).lineHeight) || 18; return { txt: m.textContent.trim(), right: b.right, vw: document.documentElement.clientWidth, rivit: Math.round(b.height / lh), sw: document.documentElement.scrollWidth }; });
      expect(r.txt).toBe('Testattu 4.10. · 2 vk'); expect(r.rivit).toBe(1); expect(r.right).toBeLessThanOrEqual(r.vw - 8); expect(r.sw).toBeLessThanOrEqual(r.vw);
    } finally { await selain.close(); }
  }, 60000);
  it('KUVA 390 tumma (TM_KUVAT=1): yhteenvedon otsikkorivi', async () => {
    if (!process.env.TM_KUVAT) return; mkdirSync(KUVAT, { recursive: true });
    const selain = await selainKaynnista(); try {
      const { p } = await avaa(selain, { leveys: 390, teema: 'dark', korkeus: 900 }); await p.waitForSelector('[data-tc-kortti]', { timeout: 15000 }); await p.waitForTimeout(800);
      await p.addStyleTag({ content: '#nvSide,[class*="nv-"],[id^="nv"]{display:none!important}.kt-ot{position:static!important}' });
      await p.locator('[data-kn-naytto]').screenshot({ path: join(KUVAT, 'profiili-390-tumma-testattu.png') });
      await p.locator('.tc-s-yht').screenshot({ path: join(KUVAT, 'profiili-390-tumma-yhteenveto.png') });
    } finally { await selain.close(); }
  }, 90000);
});
