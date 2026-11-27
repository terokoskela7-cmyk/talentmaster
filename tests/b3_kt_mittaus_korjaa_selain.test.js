/* B3 · Profiili → Kaikki mittaukset → Korjaa (selain, Playwright + Chrome; chrome-tests-job): Kehitystyopoyta.html OIKEANA sivuna, Firebase stubattu (tests/helpers/kt_sivu.mjs). Keksityt nimet (Demo FC).
   Todistaa: Korjaa-linkki vain riveillä, jotka osuvat tasan yhteen testitulokseen (sama testi + päivä); linkki ei avaa rivin historiaa; SAMA dialogi kuin VP:ssä (lib/tm_mittaus_korjaa.js) sheetin päällä
   molemmissa teemoissa (sivun tokenit, ei läpinäkyviä kenttiä); Esc sulkee vain dialogin; Tallenna = E2.3-kirjoitus (testitulokset/{id} update testit.<avain> + korjattu.<avain>) + E2.2-rebuild pelaajadokkiin;
   komposiitti (kuljetus-laukaus) osina; peruutus ei kirjoita; ilman kirjoitusoikeutta ei linkkiä eikä testitulosten lukua. */
import { describe, it, expect } from 'vitest';
import { kaynnista, selainKaynnista, CHROME, PELAAJAT, kirjoitukset } from './helpers/kt_sivu.mjs';
const SUODATA = (v) => v.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e));
const PERUS = { syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'Demo U13', joukkueet: ['demo_u13'], pelipaikka: 'KK' };
const P = Object.assign({ id: 'b3_korjaa', etunimi: 'Kori', sukunimi: 'Korjaus' }, PERUS, {
  hh_pvm: '2026-10-04', hh_viimeisin: { lin30m: 3.08, cmj: 34 }, hh_historia: [{ pvm: '2026-04-12', lin30m: 3.17, cmj: 33 }, { pvm: '2026-10-04', lin30m: 3.08, cmj: 34 }],
  tki_pvm: '2026-10-04', tki_viimeisin: 40, tk_lajit_viimeisin: { kuljetus_laukaus_s: 13.5, pujottelu_s: 23.9, ponnauttelu_s: 31.8, syotto_s: 44.1 } });
const VIERAS = Object.assign({}, P, { id: 'b3_vieras', etunimi: 'Vieras', joukkue: 'Demo U15', joukkueet: ['demo_u15'] });
const TT = (pid) => 'seurat/demo/pelaajat/' + pid + '/testitulokset/';
const dokit = (pid) => ({
  [TT(pid) + '2026-10-04_hh']: { testauspvm: '2026-10-04', protokolla: 'hh', testit: { lin30m: 3.08, hyppy_cj: 34 } },
  [TT(pid) + '2026-04-12_hh']: { testauspvm: '2026-04-12', protokolla: 'hh', testit: { lin30m: 3.17, hyppy_cj: 33 } },
  [TT(pid) + '2026-10-04_tk']: { testauspvm: '2026-10-04', protokolla: 'tk', testit: { pujottelu: 23.9, ponnauttelu: 31.8, syotto: 44.1, kuljetus_laukaus: { raaka: 18.5, rangaistukset: [5], ennenaikaiset: 0, netto: 13.5 } } } });
const avaa = (selain, pid, o) => kaynnista(selain, Object.assign({ rooli: 'valmentaja', hash: '#pelaaja/' + pid + '/profiili', pelaajat: PELAAJAT.concat([P, VIERAS]), dokit: Object.assign(dokit(P.id), dokit(VIERAS.id)) }, o || {}));
const avaaSheet = async (p) => { await p.waitForSelector('[data-kn-kaikki-avaa]', { timeout: 15000 }); await p.locator('[data-kn-kaikki-avaa]').click(); await p.waitForSelector('.mk-tausta', { timeout: 8000 }); };
const dialogi = (p) => p.locator('body > div:has([data-act="ok"])');   // jaettu dialogi: body-tason peittokerros
/* Dialogi on sheetin päällä (päällimmäinen elementti dialogin keskellä kuuluu dialogiin) eikä kentät ole läpinäkyviä (VP-tokenit kartoitettu sivun tokeneihin). */
const tarkistaDialogi = (p) => p.evaluate(() => {
  const ov = [...document.querySelectorAll('div')].find((d) => d.style.zIndex === '9200'), paneeli = ov.firstElementChild, r = paneeli.getBoundingClientRect();
  const paalla = ov.contains(document.elementFromPoint(r.left + r.width / 2, r.top + 20)), cs = (el) => getComputedStyle(el);
  const kentat = [...ov.querySelectorAll('input')].map((i) => cs(i).backgroundColor);
  return { paalla, paneeliBg: cs(paneeli).backgroundColor, kentat, otsikkoFontti: cs(paneeli.firstElementChild).fontFamily, juuriBg2: getComputedStyle(document.documentElement).getPropertyValue('--bg2').trim() };
});
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('B3 · Kehitystyöpöydän Profiili: Korjaa mittaus = VP:n E2.3-korjaus', () => {
  it('tumma · skalaari (30 m): linkki oikeilla riveillä, dialogi sheetin päällä, Esc sulkee vain dialogin, Tallenna kirjoittaa lähdedokin + rebuildin ja sheet päivittyy', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p, virheet } = await avaa(selain, P.id, { teema: 'dark' }); await avaaSheet(p);
      await p.waitForSelector('[data-mk-korjaa="lin30m"]', { timeout: 8000 });
      const linkit = await p.locator('[data-mk-korjaa]').evaluateAll((l) => l.map((e) => e.closest('[data-mk-osio]').getAttribute('data-mk-osio') + '/' + e.getAttribute('data-mk-korjaa')));
      expect(linkit.sort()).toEqual(['fyysinen/cmj', 'fyysinen/lin30m', 'tekninen/kuljetus_laukaus', 'tekninen/ponnauttelu', 'tekninen/pujottelu', 'tekninen/syotto']);
      expect(await p.locator('[data-mk-korjaa="lin30m"]').innerText()).toBe('Korjaa');
      expect(await p.evaluate(() => window.__pyynnot.filter((x) => /testitulokset$/.test(x)))).toEqual(['seurat/demo/pelaajat/b3_korjaa/testitulokset']);
      await p.locator('[data-mk-korjaa="lin30m"]').click(); await dialogi(p).waitFor();
      expect(await p.locator('#mkH-fyysinen-lin30m').isVisible()).toBe(false);   // linkki ei avaa rivin historiaa
      const d = await tarkistaDialogi(p); expect(d.paalla).toBe(true); expect(d.kentat.every((c) => c !== 'rgba(0, 0, 0, 0)')).toBe(true); expect(d.otsikkoFontti).toContain('Cormorant');
      const t = await dialogi(p).innerText(); expect(t).toContain('Korjaa mittaus'); expect(t).toContain('Lineaarinopeus 30m'); expect(t).toContain('4.10.2026');
      expect(await dialogi(p).locator('[data-act=arvo]').inputValue()).toBe('3.08');
      await p.keyboard.press('Escape'); await dialogi(p).waitFor({ state: 'detached' }); expect(await p.locator('.mk-tausta').count()).toBe(1);   // Esc kuului dialogille, sheet auki
      expect(await kirjoitukset(p)).toEqual([]);
      await p.locator('[data-mk-korjaa="lin30m"]').click(); await dialogi(p).waitFor();
      await dialogi(p).locator('[data-act=arvo]').fill('3.01'); await dialogi(p).locator('[data-act=ok]').click(); await dialogi(p).waitFor({ state: 'detached' });
      await p.waitForFunction(() => (window.__kirj || []).length >= 2);
      const k = await kirjoitukset(p);
      expect(k[0].path).toBe(TT(P.id) + '2026-10-04_hh'); expect(Object.keys(k[0].update).sort()).toEqual(['korjattu.lin30m', 'testit.lin30m']);
      expect(k[0].update['testit.lin30m']).toBe(3.01); expect(k[0].update['korjattu.lin30m'].kuka).toBe('u1'); expect(typeof k[0].update['korjattu.lin30m'].milloin).toBe('string');
      expect(k[1].path).toBe('seurat/demo/pelaajat/' + P.id); expect(k[1].set.hh_viimeisin.lin30m).toBe(3.01); expect(k[1].set.hh_pvm).toBe('2026-10-04');
      expect(k.filter((x) => x.add)).toEqual([]);   // ei uutta dokkia (INV1)
      await p.waitForFunction(() => /3,01/.test((document.querySelector('[data-mk-osio="fyysinen"] [data-mk-testi="lin30m"]') || {}).innerText || ''));
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('vaalea · komposiitti (kuljetus-laukaus): osat kenttinä, netto lasketaan; Peruuta ei kirjoita; Tallenna säilyttää muut kentät', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p, virheet } = await avaa(selain, P.id, { teema: 'light' }); await avaaSheet(p);
      await p.waitForSelector('[data-mk-korjaa="kuljetus_laukaus"]', { timeout: 8000 });
      await p.locator('[data-mk-korjaa="kuljetus_laukaus"]').click(); await dialogi(p).waitFor();
      const d = await tarkistaDialogi(p); expect(d.paalla).toBe(true); expect(d.kentat).toHaveLength(3); expect(d.kentat.every((c) => c !== 'rgba(0, 0, 0, 0)')).toBe(true);
      expect(d.paneeliBg).toBe('rgb(250, 249, 244)');   // vaalean teeman --bg2 (#FAF9F4)
      expect(await dialogi(p).locator('[data-act=raaka]').inputValue()).toBe('18.5'); expect(await dialogi(p).locator('[data-act=rang]').inputValue()).toBe('5');
      expect(await dialogi(p).locator('[data-act=netto]').innerText()).toBe('13.5');
      await dialogi(p).locator('[data-act=peru]').click(); await dialogi(p).waitFor({ state: 'detached' }); expect(await kirjoitukset(p)).toEqual([]);
      await p.locator('[data-mk-korjaa="kuljetus_laukaus"]').click(); await dialogi(p).waitFor();
      await dialogi(p).locator('[data-act=raaka]').fill('17'); await dialogi(p).locator('[data-act=rang]').fill('5, 2'); expect(await dialogi(p).locator('[data-act=netto]').innerText()).toBe('10');
      await dialogi(p).locator('[data-act=ok]').click(); await p.waitForFunction(() => (window.__kirj || []).length >= 2);
      const k = await kirjoitukset(p);
      expect(k[0].path).toBe(TT(P.id) + '2026-10-04_tk'); expect(k[0].update['testit.kuljetus_laukaus']).toEqual({ raaka: 17, rangaistukset: [5, 2], ennenaikaiset: 0, netto: 13.5 });
      expect(k[1].path).toBe('seurat/demo/pelaajat/' + P.id); expect(k[1].set.tki_pvm).toBe('2026-10-04');
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('ilman kirjoitusoikeutta (toisen joukkueen pelaaja valmentajalla): ei linkkiä, testituloksia ei lueta; VP näkee linkin', async () => {
    const selain = await selainKaynnista(); try {
      let { sk, p, virheet } = await avaa(selain, VIERAS.id, { rooli: 'valmentaja' });
      if (await p.locator('[data-kn-kaikki-avaa]').count()) {   // valmentaja ei välttämättä näe toisen joukkueen pelaajaa lainkaan → sama lopputulos: ei korjausta
        await avaaSheet(p); await p.waitForTimeout(400); expect(await p.locator('[data-mk-korjaa]').count()).toBe(0);
      }
      expect(await p.evaluate(() => window.__pyynnot.filter((x) => /testitulokset$/.test(x)))).toEqual([]); expect(await kirjoitukset(p)).toEqual([]);
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
      ({ sk, p, virheet } = await avaa(selain, VIERAS.id, { rooli: 'vp' })); await avaaSheet(p);
      await p.waitForSelector('[data-mk-korjaa="lin30m"]', { timeout: 8000 });
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
