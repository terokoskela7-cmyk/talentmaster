/* 0b-jatko · Polku → Historia oikeassa selaimessa (Playwright + Chrome): Topiaksen tapaus — jakso suljettu 19.10. kytkin pois: sisäinen lause + "sisäinen"-merkki ja aikaväli päättyy sulkemispäivään.
   Firebase stubattu (tests/helpers/kt_sivu.mjs). TM_KUVAT=1 → docs/ui-kuvat/historia-sisainen/. Vain keksityt nimet. */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
const HIST = [{ konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: '2026-10-06', paattyi: '2026-11-17', suljettu: '2026-10-19T12:00:00.000Z', sulkutapa: 'suljettu' },
  { konsepti_avain: 'y_p1', konsepti_nimi: 'Peli kapeassa tilassa', alkoi: '2026-08-17', paattyi: '2026-09-27', suljettu: '2026-09-27T12:00:00.000Z', lause: 'Hyvä jakso, kuljetus näkyy.', lause_lahde: 'valmentaja', sulkutapa: 'suljettu' }];
const PEL = PELAAJAT.map((p) => p.id === 'p2' ? { ...p, suostumusTila: 'annettu', jaksofokus: null, jaksofokus_historia: HIST } : p);
const DOKIT = { 'seurat/demo/pelaajat/p2/reviewit/2026-10-19': { kevyt: { nakyi: 'ohjatusti', treeni: 'usein', mukana: 'hyvin' }, lause_sisainen: { teksti: 'Käänsi pään ennen kosketusta.', lahde: 'valmentaja', uid: 'u1', tallennettu: '2026-10-19T12:00:00.000Z' } } };
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('Polku · Historia · sisäinen lause (selain)', () => {
  for (const rooli of ['valmentaja', 'vp']) it(rooli + ': sisäinen lause + merkki, aikaväli 6.10.–19.10.; pelaajalle näkyvä lause ilman merkkiä (1280 tumma)', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/polku', pelaajat: PEL, dokit: DOKIT, leveys: 1280, korkeus: 1100 });
      await p.waitForSelector('[data-kt-historia="ok"]', { timeout: 15000 }); await p.waitForSelector('[data-kt-h-sisainen]', { timeout: 8000 });
      const rivit = await p.locator('[data-kt-h]').allInnerTexts(); const eka = rivit[0], toka = rivit[1];
      expect(eka).toContain('6.10.–19.10.'); expect(eka).not.toContain('17.11.'); expect(eka).toContain('Käänsi pään ennen kosketusta.'); expect(eka.toLowerCase()).toContain('sisäinen');
      expect(toka).toContain('Hyvä jakso, kuljetus näkyy.'); expect(toka.toLowerCase()).not.toContain('sisäinen');
      if (process.env.TM_KUVAT && rooli === 'valmentaja') { mkdirSync(join(JUURI, 'docs', 'ui-kuvat', 'historia-sisainen'), { recursive: true }); await p.locator('[data-kt-historia]').scrollIntoViewIfNeeded(); await p.screenshot({ path: join(JUURI, 'docs', 'ui-kuvat', 'historia-sisainen', 'historia_1280_tumma.png'), fullPage: true }); }
      await sk.close();
    } finally { await selain.close(); }
  }, 60000);
});
