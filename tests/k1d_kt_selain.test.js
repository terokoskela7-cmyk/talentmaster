/**
 * K1d · selain (Playwright + Chrome): Topias-tapaus ja yhteenvetorytmi uudella sivulla (Tänään + Polku). Firebase stubattu (tests/helpers/kt_sivu.mjs); kello 19.10.2026 klo 09 Helsinki.
 *  · jakso 19.10.–30.11. ja edellinen jakson yhteenveto 19.10. → EI rytmi-ilmoitusta (Polussa "ajan tasalla")
 *  · jakso päättyy eräpäivän jälkeen → ilmoitus, molemmat päivät, "Tee jakson yhteenveto"; "Miksi näen tämän?" avautuu; ⓘ avautuu
 *  · 390 + 1280, tumma + vaalea, fi + sv (ei raakoja avaimia), ei vaakavieritystä. TM_KUVAT=1 → docs/ui-kuvat/k1d/.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'k1d');
const odota = (p) => p.waitForSelector('.kt-nimi', { timeout: 15000 });
/* Päivämäärät PAIKALLISENA keskiyönä (ei +03:00): muuten UTC:ssä alkuhetki siirtyy edelliselle päivälle ja jaksopäivät heittävät yhdellä */
const pv = (v, k, p, h = 0) => new Date(v, k - 1, p, h).toISOString();
const ALKU = pv(2026, 10, 19);
const jf = () => ({ konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: ALKU, kesto_vk: 6, lahde: 'valmentaja', domeeni: 'teknis_taktinen' });
const topias = () => PELAAJAT.map((x) => x.id === 'p2' ? Object.assign({}, x, { jaksofokus: jf(), idp_sitoumus_pvm: '2026-10-19', jaksofokus_historia: [{ konsepti_avain: 'y_h2', konsepti_nimi: 'Syöttäminen', alkoi: pv(2026, 9, 7), paattyi: pv(2026, 10, 19, 8), suljettu: pv(2026, 10, 19, 8), sulkutapa: 'suljettu' }] }) : x);   // Topias-tapaus: edellinen jakso suljettu 19.10. (ennen K1d:tä ei nollannut rytmiä)
const myohainen = () => PELAAJAT.map((x) => x.id === 'p2' ? Object.assign({}, x, { jaksofokus: Object.assign(jf(), { alkoi: pv(2026, 10, 5) }), review_viimeisin_pvm: '2026-09-10', review_viimeisin_tyyppi: 'kehityskeskustelu' }) : x);   // eräpäivä 22.10., jakso päättyy 16.11.
const dokit = (kieli) => (kieli === 'sv' ? { 'seurat/demo': { nimi: 'Demo FC', kieli: 'sv' } } : {});
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K1d · yhteenvetorytmi uudella sivulla', () => {
  it('Topias-tapaus (jakso 19.10.–30.11., edellinen jakson yhteenveto 19.10.): EI rytmi-ilmoitusta Tänäänissä; Polun yläreunassa "ajan tasalla · … viimeistään 30.11."', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p, virheet } = await kaynnista(selain, { rooli: 'vp', hash: '#pelaaja/p2/tanaan', pelaajat: topias() }); await odota(p);
      expect(await p.locator('[data-kt-signaali="rytmi"], [data-kt-signaali="rytmi_myohassa"]').count()).toBe(0);
      expect(await p.evaluate(() => document.body.innerText)).not.toMatch(/erääntymässä|viimeistään \d+\.\d+\.|myöhässä \d+ pv/);
      await p.locator('[data-kt-valilehti="polku"], a[href$="/polku"], [data-valilehti="polku"]').first().click().catch(async () => { await p.evaluate(() => { location.hash = '#pelaaja/p2/polku'; }); }); await p.waitForSelector('[data-kt-polku]', { timeout: 10000 });
      const rivi = p.locator('[data-kt-rytmi]'); expect(await rivi.getAttribute('data-kt-rytmi')).toBe('ajantasalla'); expect((await rivi.innerText()).replace(/\s+/g, ' ')).toContain('Ajan tasalla · seuraava yhteenveto tai kehityskeskustelu viimeistään 30.11.');
      expect(await p.locator('[data-kt-h-yhteenveto]').count()).toBeGreaterThanOrEqual(1); expect(virheet.filter((v) => !/favicon|sentry/i.test(v))).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('jakso päättyy eräpäivän jälkeen: ilmoitus otsikko + selitys + jaksorivi (molemmat päivät), "Tee jakson yhteenveto"; ⓘ ja "Miksi näen tämän?" avautuvat; napin sheet avautuu', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'vp', hash: '#pelaaja/p2/tanaan', pelaajat: myohainen() }); await odota(p);
      const kortti = p.locator('[data-kt-signaali="rytmi"]'); expect(await kortti.count()).toBe(1); const t = (await kortti.innerText()).replace(/\s+/g, ' ');
      expect(t).toContain('Jakson yhteenveto tai kehityskeskustelu viimeistään 22.10.'); expect(t).toContain('Edellisestä yhteenvedosta tai keskustelusta 39 pv. 13-vuotiaalle 42 päivän välein.'); expect(t).toContain('Jakso päättyy 16.11. Tee jakson yhteenveto tai pidä kehityskeskustelu ennen 16.11.');
      expect(await kortti.locator('[data-kt-signaali-nappi]').allInnerTexts()).toEqual(['Tee jakson yhteenveto', 'Kirjaa kehityskeskustelu']);   // K4b: Kehityskeskustelu on uudella sivulla (toissijainen nappi)
      const miksi = kortti.locator('[data-kt-miksi]'); expect(await miksi.locator('summary').innerText()).toBe('Miksi näen tämän?'); expect(await miksi.locator('.kt-sig-miksi-t').isVisible()).toBe(false); await miksi.locator('summary').click(); expect(await miksi.locator('.kt-sig-miksi-t').isVisible()).toBe(true);
      expect((await miksi.locator('.kt-sig-miksi-t').innerText()).replace(/\s+/g, ' ')).toBe('Edellisestä jakson yhteenvedosta tai kehityskeskustelusta on 39 pv, ja 13-vuotiaalle on sovittu 42 päivän väli. Eräpäivä on 22.10.');
      const ii = kortti.locator('[data-si="jakson_yhteenveto"] [data-si-nappi]'); await ii.click(); expect(await kortti.locator('[data-si="jakson_yhteenveto"] [data-si-teksti]').isVisible()).toBe(true); await p.keyboard.press('Escape');
      await kortti.locator('[data-kt-signaali-nappi="sulje"]').click(); await p.waitForSelector('[data-kvk-kysymys]'); expect(await p.locator('[id^="tsOtsikko_"]').first().innerText()).toMatch(/^Tee jakson yhteenveto · /);   // sheet: kk_otsikko
      await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('Polku: "Kehityssuunnitelma" -yläotsikko + ⓘ; ⓘ → "Lue lisää" → "Miten kehitys etenee" (kaavio) sivulla paikallaan; Esc sulkee', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'vp', hash: '#pelaaja/p2/polku', pelaajat: myohainen() }); await odota(p); await p.waitForSelector('[data-kt-polku]'); const url = p.url();
      expect((await p.locator('[data-kt-polku-ots]').innerText()).toLowerCase()).toBe('kehityssuunnitelma'); expect((await p.locator('[data-kt-rytmi]').innerText()).replace(/\s+/g, ' ')).toContain('Seuraava yhteenveto tai kehityskeskustelu viimeistään 22.10.');
      await p.locator('.kt-pk-ots [data-si-nappi]').click(); expect((await p.locator('.kt-pk-ots [data-si-teksti]').innerText()).trim()).toBe('Pelaajan kauden tavoite ja sen alla etenevät 6 viikon jaksot.'); await p.locator('.kt-pk-ots [data-si-lue-lisaa]').click();
      expect(await p.locator('#tmKeModal svg').count()).toBe(1); expect(p.url()).toBe(url); await p.keyboard.press('Escape'); expect(await p.locator('#tmKeModal').count()).toBe(0);
      await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it.each([['1280', 1280, 900, 'dark', 'fi'], ['390', 390, 844, 'dark', 'fi'], ['390-vaalea', 390, 844, 'light', 'fi'], ['390-sv', 390, 844, 'dark', 'sv']])('%s · ei vaakavieritystä, ei raakoja avaimia; ⓘ-selite mahtuu ruutuun; sv-tilassa varateksti fi:ksi (erä 80 odottaa)', async (_n, w, h, teema, kieli) => {
    const selain = await selainKaynnista(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'vp', hash: '#pelaaja/p2/tanaan', leveys: w, korkeus: h, teema, dokit: dokit(kieli), pelaajat: myohainen() }); await odota(p); await p.waitForSelector('[data-kt-signaali="rytmi"]');
      expect(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      const teksti = await p.evaluate(() => document.body.innerText); expect(teksti).not.toMatch(/\b(?:ts|ktp|si|ke|ip|k1)_[a-z_]+\b/);
      await p.locator('[data-kt-signaali="rytmi"] [data-si="jakson_yhteenveto"] [data-si-nappi]').click(); const r = await p.locator('[data-kt-signaali="rytmi"] [data-si="jakson_yhteenveto"] .si-p').boundingBox(); expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x + r.width).toBeLessThanOrEqual(w);
      if (process.env.TM_KUVAT) { mkdirSync(KUVAT, { recursive: true }); await p.keyboard.press('Escape'); await p.screenshot({ path: join(KUVAT, 'tanaan-rytmi-' + _n + '.png') }); }
      await sk.close();
    } finally { await selain.close(); }
  }, 60000);
});
