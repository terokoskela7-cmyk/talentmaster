/* B7 · selain (Playwright + Chrome; chrome-tests-job): TalentMaster_Kehitystyopoyta.html oikeana sivuna, Firebase stubattu (tests/helpers/kt_sivu.mjs).
   TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/b7-kehitystyopoyta/ (1280 + 390 × tumma/vaalea). Vain keksityt nimet (Demo FC), ei oikeaa dataa. */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { kaynnista, selainKaynnista, CHROME, JUURI } from './helpers/kt_sivu.mjs';
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'b7-kehitystyopoyta');
const SUODATA = (v) => v.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e));
const odota = (p) => p.waitForSelector('.kt-nimi', { timeout: 15000 });
const hash = (p) => p.evaluate(() => location.hash);
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('B7 · Kehitystyöpöytä-sivu', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };
  it('LIPPU PÄÄLLÄ 1280: V-KOTI-kuori (Pelaajat aktiivinen), murupolku, otsikkorivi, ‹ › kulkee joukkueen sisällä, Tänään renderöityy', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan' }); await odota(p);
      expect(await p.locator('.kt-nimi').innerText()).toBe('Bertta Bergh');
      expect(await p.locator('#nvSide .nv-item').allInnerTexts()).toEqual(['Koti', 'Viestit', 'Kalenteri', 'Joukkue', 'Pelaajat', 'Asetukset']);
      expect(await p.locator('#nvSide .nv-item.active').innerText()).toBe('Pelaajat');
      expect(await p.locator('#ktsOtsikko').innerText()).toBe('Pelaajat › Bertta Bergh');
      expect(await p.locator('#nvPlus .nv-plus').isVisible()).toBe(true);   // + Havainto (D244)
      expect(await p.locator('[data-kt-valilehti]').allInnerTexts()).toEqual(['Tänään', 'Polku', 'Näyttö']);
      expect(await p.locator('.kt-ot .kt-meta').first().innerText()).toBe('2/3');   // vain Demo U13: p1, p2, p3 (p9 on toisessa joukkueessa)
      expect(await p.locator('[data-kt-edellinen]').getAttribute('aria-label')).toBe('Edellinen pelaaja: Aatu Aalto');
      expect(await p.locator('[data-kt-seuraava]').getAttribute('aria-label')).toBe('Seuraava pelaaja: Cecil Carlsson');
      await p.locator('[data-kt-seuraava]').click(); await p.waitForFunction(() => document.querySelector('.kt-nimi').textContent === 'Cecil Carlsson');
      expect(await hash(p)).toBe('#pelaaja/p3/tanaan'); expect(await p.locator('[data-kt-seuraava]').isDisabled()).toBe(true);   // joukkueen viimeinen
      await p.locator('[data-kt-edellinen]').click(); await p.locator('[data-kt-edellinen]').click(); await p.waitForFunction(() => document.querySelector('.kt-nimi').textContent === 'Aatu Aalto');
      expect(await p.locator('[data-kt-edellinen]').isDisabled()).toBe(true);
      await p.goBack().catch(() => {}); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('LIPPU POIS: ei kuorta eikä työpöytää; ohje + linkki Masteriin samaan pelaajaan', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await kaynnista(selain, { rooli: 'valmentaja', lippu: false, hash: '#pelaaja/p2/polku' }); await p.waitForSelector('.kts-viesti', { timeout: 15000 });
      expect(await p.locator('.kt-nimi, #nvSide, .nv-plus').count()).toBe(0);
      expect(await p.locator('.kts-viesti a').getAttribute('href')).toBe('TalentMaster_Master_v16.html#pelaaja/p2/polku');
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('V-KOTI PÄÄLLÄ (valmentaja_v2) mutta kehitystyopoyta_v2 POIS → vanha näkymä: ei työpöytää, ei kuorta; ohje + linkki Masteriin', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await kaynnista(selain, { rooli: 'valmentaja', vkoti: true, lippu: false, hash: '#pelaaja/p2/tanaan' }); await p.waitForSelector('.kts-viesti', { timeout: 15000 });
      expect(await p.locator('.kt-nimi, #nvSide, .nv-plus').count()).toBe(0); expect(await p.locator('.kts-viesti a').getAttribute('href')).toBe('TalentMaster_Master_v16.html#pelaaja/p2/tanaan'); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('kehitystyopoyta_v2 PÄÄLLÄ ilman valmentaja_v2:ta: työpöytä aukeaa (oma lippu riittää), V-KOTI-kuorta ei asenneta', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', vkoti: false, lippu: true, hash: '#pelaaja/p2/tanaan' }); await odota(p);
      expect(await p.locator('.kt-nimi').innerText()).toBe('Bertta Bergh'); expect(await p.locator('#nvSide').count()).toBe(0); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('EI KIRJAUTUNUT: ohje kirjautua (ei dataa, ei kuorta)', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { kirjautunut: false }); await p.waitForSelector('.kts-viesti', { timeout: 15000 });
      expect(await p.locator('.kt-nimi, #nvSide').count()).toBe(0); expect(await p.locator('.kts-viesti a').getAttribute('href')).toBe('TalentMaster_Master_v16.html'); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('ROOLIT: valmentaja ei näe toisen joukkueen pelaajaa (p9 → ei löytynyt); VP näkee koko seuran (p9 aukeaa, ‹ › saman joukkueen sisällä)', async () => {
    await avaa(); try {
      let r = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p9/tanaan' }); await r.p.waitForSelector('[data-kt-tila="ei_loydy"]', { timeout: 15000 }); expect(await r.p.locator('.kt-nimi').innerText()).toBe('Pelaajaa ei löytynyt'); await r.sk.close();
      r = await kaynnista(selain, { rooli: 'vp', hash: '#pelaaja/p9/tanaan' }); await odota(r.p); expect(await r.p.locator('.kt-nimi').innerText()).toBe('Dani Dahl'); expect(await r.p.locator('.kt-ot .kt-meta').first().innerText()).toBe('1/1');
      expect(await r.p.locator('[data-kt-edellinen]').isDisabled()).toBe(true); await r.sk.close();
      r = await kaynnista(selain, { rooli: 'super_admin', hash: '#pelaaja/p1/tanaan' }); await odota(r.p); expect(await r.p.locator('.kt-nimi').innerText()).toBe('Aatu Aalto'); await r.sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('VIIKKOHAVAINTO (VP ja valmentaja): "Merkitse havainto" → Ohjatusti kirjoittaa osa_havainnot oman uid:n alle; ei vaihda välilehteä', async () => {
    await avaa(); try {
      for (const rooli of ['valmentaja', 'vp']) {
        const { sk, p } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/tanaan' }); await odota(p);
        await p.locator('[data-kt-ensisijainen="havainto"]').click(); await p.waitForSelector('[data-kt-havainto-paneeli]');
        await p.locator('[data-kt-havainto-arvo="2"]').click(); await p.waitForFunction(() => window.__kirj.length > 0, null, { timeout: 8000 });
        const k = await p.evaluate(() => window.__kirj); expect(k).toHaveLength(1); expect(k[0].path).toBe('seurat/demo/pelaajat/p2');
        const avaimet = Object.keys(k[0].update); expect(avaimet.some((a) => /^jaksofokus\.osa_havainnot\.y_h1\.a\.u1$/.test(a)), rooli).toBe(true);
        expect(k[0].update['jaksofokus.osa_havainnot.y_h1.a.u1'].rooli).toBe(rooli); expect(k[0].update['jaksofokus.osa_havainnot.y_h1.a.u1'].arvo).toBe(2);
        expect(await hash(p)).toBe('#pelaaja/p2/tanaan'); expect(await p.locator('[data-kt-valilehti][aria-selected="true"]').innerText()).toBe('Tänään'); await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
  it('PELAAJA EI KIRJOITA: pelaajan rooli ei pääse sivulle (ei työpöytää, ei kirjoitusta)', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'pelaaja', hash: '#pelaaja/p2/tanaan' }); await p.waitForSelector('.kts-viesti', { timeout: 15000 });
      expect(await p.locator('.kt-nimi, [data-kt-ensisijainen]').count()).toBe(0); expect(await p.evaluate(() => window.__kirj.length)).toBe(0); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('VÄLILEHDET: Polku ja Näyttö ohjaavat vanhaan näkymään (siirtyvät B4/B6:ssa); hash päivittyy, Tänään säilyy', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { hash: '#pelaaja/p2/tanaan' }); await odota(p);
      await p.locator('[data-kt-valilehti="polku"]').click(); expect(await hash(p)).toBe('#pelaaja/p2/polku'); expect(await p.locator('[data-kt-sivu="polku"] a').getAttribute('href')).toBe('TalentMaster_Master_v16.html#pelaaja/p2/polku');
      await p.locator('[data-kt-valilehti="naytto"]').click(); expect(await hash(p)).toBe('#pelaaja/p2/naytto'); expect(await p.locator('[data-kt-sivu="naytto"] a').getAttribute('href')).toBe('TalentMaster_Master_v16.html#pelaaja/p2/naytto');
      await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('PELAAJAN SILMIN: Tänään-sivulla 0 lukua kt-hk:n ulkopuolella (kysymyskortit, signaali)', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { hash: '#pelaaja/p2/tanaan' }); await odota(p);
      expect(await p.locator('#ktNakyma [data-kt-sivu="tanaan"] .kt-hk').count()).toBeGreaterThan(0);   // luvut on merkitty (ei tyhjä testi)
      await p.locator('[data-kt-silmin]').click(); expect(await p.locator('#ktNakyma .kt-hk >> visible=true').count()).toBe(0);
      const nakyvat = await p.evaluate(() => Array.from(document.querySelectorAll('#ktNakyma [data-kt-sivu="tanaan"] .kt-q3 *, #ktNakyma [data-kt-sivu="tanaan"] .kt-sig *')).filter((e) => !e.children.length && /\d/.test(e.textContent) && !e.closest('.kt-hk') && getComputedStyle(e).display !== 'none').map((e) => e.textContent.trim()));
      expect(nakyvat).toEqual([]);
      await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('MOBIILI 390: alapalkki + Viestit-kuvake, ei vaakavieritystä, otsikko + signaalin nappi ilman vieritystä', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await kaynnista(selain, { leveys: 390, korkeus: 844, hash: '#pelaaja/p2/tanaan' }); await odota(p);
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(await p.locator('#nvMob .nv-mitem').allInnerTexts()).toEqual(['Koti', 'Kalenteri', 'Pelaajat', 'Valikko']); expect(await p.locator('#nvMob .nv-mplus').isVisible()).toBe(true); expect(await p.locator('.nv-mviesti').isVisible()).toBe(true);
      const nappi = await p.locator('.kt-sig .kt-btn, [data-kt-ensisijainen]').first().boundingBox(); expect(nappi.y + nappi.height).toBeLessThanOrEqual(844);
      const pienet = await p.evaluate(() => Array.from(document.querySelectorAll('#nvMob button, .kt-nappi, .kt-btn')).filter((b) => b.offsetParent && (b.getBoundingClientRect().height < 36)).map((b) => b.textContent.trim()));
      expect(pienet).toEqual([]);   // kosketuskohteet
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it.skipIf(process.env.TM_KUVAT !== '1')('KUVAT: 1280 + 390 × tumma + vaalea (Tänään)', async () => {
    mkdirSync(KUVAT, { recursive: true }); await avaa(); try {
      for (const [leveys, korkeus] of [[1280, 900], [390, 844]]) for (const teema of ['dark', 'light']) {
        const { sk, p } = await kaynnista(selain, { leveys, korkeus, teema, hash: '#pelaaja/p2/tanaan' }); await odota(p); await p.waitForTimeout(400);
        await p.screenshot({ path: join(KUVAT, 'b7_tanaan_' + leveys + '_' + teema + '.png') }); await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
});
