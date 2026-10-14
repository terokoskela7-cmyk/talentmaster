/* PR B · selain (Playwright + Chrome): ydinvahvuuden alue klikkaamalla sheetinä (D172–D174, D100). Firebase stubattu (tests/helpers/kt_sivu.mjs). TM_KUVAT=1 → docs/ui-kuvat/b-ydinvahvuuden-alue/ (1280 + 390 tumma). */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'b-ydinvahvuuden-alue');
const odota = (p) => p.waitForSelector('.kt-nimi', { timeout: 15000 });
const LINKKI = '[data-kt-aseta-alue]';
const muoto = (m) => ({ dokit: { 'seurat/demo/joukkueet/demo_u13': { nimi: 'Demo U13', ika: 'U13', pelimuodot: [m] } } });
const pel = (lisa) => PELAAJAT.map((x) => x.id === 'p2' ? Object.assign({}, x, lisa) : x);
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('PR B · ydinvahvuuden alue klikkaamalla', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };
  it('linkki "Aseta ydinvahvuus kentälle" avaa PITKÄN sheetin (ei Polkuun); pelimuoto puuttuu → kysytään kerran; 8v8: 6 aluetta; valinta korostuu; Tallenna vaatii valinnan', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan' }); await odota(p);
      expect(await p.locator(LINKKI).innerText()).toBe('Aseta ydinvahvuus kentälle'); await p.locator(LINKKI).click(); await p.waitForSelector('[data-ka-sheet]');
      expect(await p.locator('[data-ts-tausta].ts-pitka').count()).toBe(1); expect(await p.locator('[id^="tsOtsikko_"]').first().innerText()).toBe('Ydinvahvuuden alue'); expect(await p.evaluate(() => location.hash)).toBe('#pelaaja/p2/tanaan');   // ei vaihda välilehteä
      expect(await p.locator('[data-ka-muoto]').allInnerTexts()).toEqual(['5v5', '8v8', '11v11']); expect(await p.locator('[data-ka-alue]').count()).toBe(0);   // pelimuoto kysytään ensin
      await p.locator('[data-ka-muoto="8v8"]').click(); expect(await p.locator('[data-ka-alue]').count()).toBe(6);
      expect(await p.locator('[data-ka-ehdotus]').count()).toBe(0);   // nykydatalla mitään ei esivalita
      expect(await p.locator('[data-ka-alue][aria-pressed="true"]').count()).toBe(0); await p.locator('[data-ka-tallenna]').click({ force: true }); await p.waitForTimeout(300); expect(await p.evaluate(() => (window.__batch || []).length)).toBe(0);
      await p.locator('[data-ka-alue="keskusta"]').click(); expect(await p.locator('[data-ka-alue][aria-pressed="true"]').getAttribute('data-ka-alue')).toBe('keskusta'); expect(await p.locator('[data-ka-valittu]').innerText()).toMatch(/Keskusta/);
      await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('TALLENNUS: ydinvahvuus.alue {x,y,w,h} + alue_avain + asetti_uid + asetettu_pvm YHDELLÄ updatella pelaajadokkiin; pelimuoto → joukkueet.pelimuodot samassa batchissa; sen jälkeen Tänään = kaksipalstainen + Kenttä, linkki poissa, ⋯ → Vaihda aluetta', async () => {
    await avaa(); try {
      for (const rooli of ['valmentaja', 'vp']) {
        const { sk, p } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/tanaan' }); await odota(p);
        await p.locator(LINKKI).click(); await p.locator('[data-ka-muoto="8v8"]').click(); await p.locator('[data-ka-alue="keskusta"]').click(); await p.locator('[data-ka-tallenna]').click();
        await p.waitForFunction(() => (window.__batch || []).length === 1, null, { timeout: 8000 }); const b = await p.evaluate(() => window.__batch[0]); expect(b).toHaveLength(2);
        const pel1 = b.find((o) => /pelaajat\/p2$/.test(o.path)), jk = b.find((o) => /joukkueet\/demo_u13$/.test(o.path));
        expect(pel1.update).toEqual({ 'ydinvahvuus.alue': { x: 25, y: 35, w: 50, h: 61 }, 'ydinvahvuus.asetti_uid': 'u1', 'ydinvahvuus.asetettu_pvm': '2026-10-19', 'ydinvahvuus.alue_avain': 'keskusta' }); expect(jk.update).toEqual({ pelimuodot: ['8v8'] });
        await p.waitForSelector('[data-ka-sheet]', { state: 'detached', timeout: 5000 }); expect(await p.locator('#toast-wrap').innerText()).toMatch(/Alue tallennettu/);
        expect(await p.locator('.kt-t-kentta .kt svg').count()).toBe(1); expect(await p.locator('.kt-tanaan.kt-ei-kenttaa').count()).toBe(0); expect(await p.locator(LINKKI).count()).toBe(0);   // Kenttä näkyy heti, linkki katoaa
        expect(await p.locator('.kt-t-kentta').evaluate((e) => e.getBoundingClientRect().width)).toBeGreaterThan(200);
        await p.locator('.kts-kentta-valikko > summary').click(); await p.locator('[data-kt-vaihda-alue]').click(); await p.waitForSelector('[data-ka-sheet]');
        expect(await p.locator('[data-ka-muoto]').count()).toBe(0); expect(await p.locator('[data-ka-alue]').count()).toBe(6); expect(await p.locator('[data-ka-alue][aria-pressed="true"]').getAttribute('data-ka-alue')).toBe('keskusta');   // nykyinen alue esivalittuna; pelimuoto tiedossa → ei kysytä
        await p.locator('[data-ka-alue="karki"]').click(); await p.locator('[data-ka-tallenna]').click(); await p.waitForFunction(() => (window.__batch || []).length === 2, null, { timeout: 8000 });
        const b2 = await p.evaluate(() => window.__batch[1]); expect(b2).toHaveLength(1); expect(b2[0].update['ydinvahvuus.alue']).toEqual({ x: 25, y: 0, w: 50, h: 35 }); expect(b2[0].update['ydinvahvuus.alue_avain']).toBe('karki');   // pelimuoto jo tallennettu → ei joukkuekirjoitusta
        await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
  it('5v5: ei aluevalintaa — linkkiä ei näytetä lainkaan, jaksokortti riittää; ei Kentän ⋯-valikkoa', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, Object.assign({ rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan' }, muoto('5v5'))); await odota(p);
      expect(await p.locator(LINKKI).count()).toBe(0); expect(await p.locator('[data-kt-jaksokortti]').count()).toBe(1); expect(await p.evaluate(() => window.__kirj.length)).toBe(0); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('pelimuoto tiedossa (11v11) → ei kysytä, 8 aluetta; kaksi pelimuotoa → vaihtokytkin ensimmäinen oletuksena', async () => {
    await avaa(); try {
      const a = await kaynnista(selain, Object.assign({ rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan' }, muoto('11v11'))); await odota(a.p); await a.p.locator(LINKKI).click(); await a.p.waitForSelector('[data-ka-sheet]');
      expect(await a.p.locator('[data-ka-muoto]').count()).toBe(0); expect(await a.p.locator('[data-ka-alue]').count()).toBe(8); await a.sk.close();
      const b = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', dokit: { 'seurat/demo/joukkueet/demo_u13': { nimi: 'Demo U13', ika: 'U13', pelimuodot: ['11v11', '8v8'] } } }); await odota(b.p); await b.p.locator(LINKKI).click(); await b.p.waitForSelector('[data-ka-sheet]');
      expect(await b.p.locator('[data-ka-muoto]').allInnerTexts()).toEqual(['11v11', '8v8']); expect(await b.p.locator('[data-ka-alue]').count()).toBe(8); await b.p.locator('[data-ka-muoto="8v8"]').click(); expect(await b.p.locator('[data-ka-alue]').count()).toBe(6); await b.sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('luonnos: valittu alue säilyy kun sheet suljetaan (ei kirjoitusta) ja avataan uudelleen', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, Object.assign({ rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan' }, muoto('8v8'))); await odota(p);
      await p.locator(LINKKI).click(); await p.locator('[data-ka-alue="oikea_laita"]').click(); await p.locator('[data-ts-sulje]').click(); await p.waitForTimeout(300);
      expect(await p.locator('[data-ka-sheet]').count()).toBe(0); expect(await p.evaluate(() => (window.__batch || []).length)).toBe(0);
      await p.locator(LINKKI).click(); await p.waitForSelector('[data-ka-sheet]'); expect(await p.locator('[data-ka-alue][aria-pressed="true"]').getAttribute('data-ka-alue')).toBe('oikea_laita'); expect(await p.locator('[data-ts-luonnos]').count()).toBe(1); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('EHDOTUS: pelipaikan oletusalue (syötetty data) esivalittuna + merkintä "ehdotus"; kun käyttäjä valitsee muun, merkintä poistuu; ilman dataa ei esivalintaa', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, Object.assign({ rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: pel({ tt_positio_aktiivinen: 'KH' }) }, muoto('8v8'))); await odota(p);
      await p.evaluate(() => { window.TM_TT_PELIPAIKAT.KH.oletusalue = { '8v8': 'karki' }; });
      await p.locator(LINKKI).click(); await p.waitForSelector('[data-ka-sheet]'); expect(await p.locator('[data-ka-alue][aria-pressed="true"]').getAttribute('data-ka-alue')).toBe('karki'); expect(await p.locator('[data-ka-ehdotus]').count()).toBe(1);
      await p.locator('[data-ka-alue="keskusta"]').click(); expect(await p.locator('[data-ka-ehdotus]').count()).toBe(0); expect(await p.locator('[data-ka-alue][aria-pressed="true"]').getAttribute('data-ka-alue')).toBe('keskusta'); await sk.close();
      const e = await kaynnista(selain, Object.assign({ rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: pel({ tt_positio_aktiivinen: 'KH' }) }, muoto('8v8'))); await odota(e.p);
      await e.p.locator(LINKKI).click(); await e.p.waitForSelector('[data-ka-sheet]'); expect(await e.p.locator('[data-ka-alue][aria-pressed="true"]').count()).toBe(0); expect(await e.p.locator('[data-ka-ehdotus]').count()).toBe(0); await e.sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('EI VAAKAVIERITYSTÄ leveyksillä 390 ja 1024: sheet auki (pelimuoto kysytään / aluevalinta) ja tallennuksen jälkeen (Kenttä)', async () => {
    await avaa(); try {
      for (const [w, h] of [[390, 844], [1024, 900]]) {
        const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', leveys: w, korkeus: h });
        await odota(p); const yli = () => p.evaluate(() => { const d = document.documentElement, pa = document.querySelector('.ts-paneeli'); return [d.scrollWidth - d.clientWidth, pa ? pa.scrollWidth - pa.clientWidth : 0]; });
        await p.locator(LINKKI).click(); await p.waitForSelector('[data-ka-sheet]'); expect(await yli(), 'kysely ' + w).toEqual([0, 0]);
        await p.locator('[data-ka-muoto="11v11"]').click(); expect(await yli(), 'alueet ' + w).toEqual([0, 0]); await p.locator('[data-ka-alue="vasen_puolustaja"]').click(); await p.locator('[data-ka-tallenna]').click(); await p.waitForSelector('[data-ka-sheet]', { state: 'detached' }); await p.waitForTimeout(300);
        const m = await p.evaluate(() => { const d = document.documentElement, g = document.querySelector('.kt-tanaan').getBoundingClientRect(); return [d.scrollWidth - d.clientWidth, g.right - d.clientWidth]; }); expect(m[0], 'tallennuksen jälkeen ' + w).toBeLessThanOrEqual(0); expect(m[1]).toBeLessThanOrEqual(0); await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
  it('TM_KUVAT=1 · kuvat 1280 + 390 (tumma): sheet auki, valittu vyöhyke ja Tänään tallennuksen jälkeen', async () => {
    if (!process.env.TM_KUVAT) return; mkdirSync(KUVAT, { recursive: true }); await avaa(); try {
      for (const [n, w, h] of [['1280', 1280, 900], ['390', 390, 844]]) {
        const { sk, p } = await kaynnista(selain, Object.assign({ rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', leveys: w, korkeus: h }, muoto('11v11'))); await odota(p);
        await p.screenshot({ path: join(KUVAT, 'tanaan-ennen-' + n + '.png') });
        await p.locator(LINKKI).click(); await p.waitForSelector('[data-ka-sheet]'); await p.waitForTimeout(300); await p.screenshot({ path: join(KUVAT, 'sheet-auki-' + n + '.png') });
        await p.locator('[data-ka-alue="keskusta"]').click(); await p.waitForTimeout(200); await p.screenshot({ path: join(KUVAT, 'sheet-valittu-' + n + '.png') });
        await p.locator('[data-ka-tallenna]').click(); await p.waitForSelector('[data-ka-sheet]', { state: 'detached' }); await p.waitForTimeout(500); await p.screenshot({ path: join(KUVAT, 'tanaan-tallennuksen-jalkeen-' + n + '.png') }); await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
});
