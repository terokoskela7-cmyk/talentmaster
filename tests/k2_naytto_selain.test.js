/* K2 · Näyttö (selain, Playwright + Chrome; chrome-tests-job): Kehitystyopoyta.html OIKEANA sivuna, Firebase stubattu (tests/helpers/kt_sivu.mjs). Keksityt nimet (Demo FC).
   K4c (erä 83): vanha K2-raakalista (lib/tm_naytto_lohkot.js) ei enää näy uudella sivulla — "Näytä kaikki mittaukset" avaa uuden sheetin (tests/k4c_mittaukset_selain.test.js); raakalista säilyy Masterissa.
   Tässä jäljellä: vanha #naytto-osoite ohjautuu Profiiliin; Profiili ei hae testitapahtumia; Näytön S-hyppykäsittelijät (Pelaajaraportti ym.) ovat olemassa; Silmin → ei Profiilia. */
import { describe, it, expect } from 'vitest';
import { kaynnista, selainKaynnista, CHROME, PELAAJAT } from './helpers/kt_sivu.mjs';
const SUODATA = (v) => v.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e));
const RIKAS = { id: 'p5', etunimi: 'Rikas', sukunimi: 'Data', syntymaVuosi: 2012, joukkue: 'Demo U13', joukkueet: ['demo_u13'], pelipaikka: 'KK', sukupuoli: 'M', hh_taso: 4, hh_taso_edellinen: 3, hh_pvm: '2026-09-20', tki_viimeisin: 58, tki_edellinen: 51, tki_merkki: 'hopea', tki_pvm: '2026-09-21',
  tki_vahvuus: 'syotto', tki_kehityskohde: 'pujottelu', flei_viimeisin: 71, biologinenIka_viimeisin: { phv_tila_koodi: 'PH', maturity_offset: -0.4, phv_ika: 13.8, pvm: '2026-10-04', kasvutahti_cm_v: 6.1 }, phv_tila: 'PH', talenttiTaso: 'laajennettu',
  tekninen_varhaiskehitys: { merkki: 'kulta', ika: 10 }, streak: 5, adar_viimeisin: { a: 2.4, d: 2.1, ac: 1.6, r: 2.8, yht: 2.2 }, adar_havaintoja: 4, havainto_porras: 2,
  adar_arvioijat: [{ nimi: 'Veera V', rooli: 'valmentaja', uid: 'u1', pisteet: { a: 2, d: 2, ac: 1, r: 3 }, aika: Date.parse('2026-10-05') }, { nimi: 'Ville P', rooli: 'vp', pisteet: { a: 3, d: 2, ac: 2, r: 3 } }], adar_arvioijia: 2, adar_yhtenevyys_taso: 'korkea',
  hh_historia: [{ pvm: '2025-09-20', hh_taso: 2 }, { pvm: '2026-09-20', hh_taso: 4 }], tki_historia: [{ pvm: '2025-09-20', tki: 44 }, { pvm: '2026-09-21', tki: 58 }],
  d3_taso: 3.4, d3_viimeisin: { pisteet: { inner_drive: { avg: 4, valmentaja: 4, pelaaja: 4 }, focus: { avg: 2.5, valmentaja: 3 } } } };
const DOKIT = { 'seurat/demo/testitapahtumat/t1': { tila: 'suljettu', luotu: 1 }, 'seurat/demo/testitapahtumat/t2': { tila: 'auki', luotu: 2 } };
const PEL = PELAAJAT.concat([RIKAS]);
const odota = (p) => p.waitForSelector('[data-tc-kortti]', { timeout: 15000 });
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K2 · Näyttö → Profiili uudella sivulla', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };
  it.each(['valmentaja', 'vp', 'super_admin'])('ROOLI %s: vanha #naytto ohjautuu Profiiliin; kortit + Näytä kaikki mittaukset -nappi; testitapahtumia ei haeta; vanhaa raakalistaa ei ole', async (rooli) => {
    await avaa(); try {
      const { sk, p, virheet } = await kaynnista(selain, { rooli, hash: '#pelaaja/p5/naytto', pelaajat: PEL, dokit: DOKIT }); await odota(p);
      expect(await p.evaluate(() => location.hash)).toBe('#pelaaja/p5/profiili');
      expect(await p.locator('[data-kn-kortit] [data-tc-kortti]').count()).toBeGreaterThan(0); expect(await p.locator('[data-kn-kaikki-avaa]').count()).toBe(1);
      expect(await p.locator('[data-kn-kaikki]').count()).toBe(0); expect(await p.locator('#_mMitaCard, #_mKertymaCard').count()).toBe(0);   // K2:n lohkot (Harjoittelu, Mitä osata) eivät kuulu uuteen sivuun
      expect(await p.evaluate(() => window.__pyynnot.filter((x) => /testitapahtumat/.test(x)).length)).toBe(0);
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('PELAAJAN SILMIN: Profiili pois käytöstä (A8); Näytön S-hyppykäsittelijät ovat olemassa', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p5/naytto', pelaajat: PEL, dokit: DOKIT }); await odota(p);
      const mj = await p.evaluate(() => ['_avaaPelaajaraportti', '_msFyysSuunnitteleMittaus', '_avaaD3Arvio', '_ehdotaTalentti', '_avaaDetail', '_ktVanhaNakyma'].every((n) => typeof window[n] === 'function'));
      expect(mj).toBe(true);   // jokaisella napilla on käsittelijä (ei kuollutta onclickiä)
      await p.locator('[data-kt-silmin]').click();
      await p.waitForFunction(() => location.hash.indexOf('/naytto') < 0 && location.hash.indexOf('/profiili') < 0, null, { timeout: 8000 });   // Silmin → välilehti vaihtuu Tänäänin
      expect(await p.locator('[data-kn-naytto]').count()).toBe(0); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
