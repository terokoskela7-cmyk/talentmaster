/* K2 · Näyttö vaihe a (selain, Playwright + Chrome; chrome-tests-job): Kehitystyopoyta.html OIKEANA sivuna, Firebase stubattu (tests/helpers/kt_sivu.mjs). Keksityt nimet (Demo FC).
   Todistaa: kaikki vanhat mittauslohkot renderöityvät uudella sivulla samalla libillä kuin Masterissa; "Näytä kaikki mittaukset" auki + tyhjä korttipaikka; PHV kerran; laiska lataus; virhe näkyy; Silmin → ei Näyttöä; 390 + 1280.
   TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/k2-naytto/ (390 tumma + 1280 vaalea). */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'k2-naytto');
const SUODATA = (v) => v.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e));
const RIKAS = { id: 'p5', etunimi: 'Rikas', sukunimi: 'Data', syntymaVuosi: 2012, joukkue: 'Demo U13', joukkueet: ['demo_u13'], pelipaikka: 'KK', sukupuoli: 'M', hh_taso: 4, hh_taso_edellinen: 3, hh_pvm: '2026-09-20', tki_viimeisin: 58, tki_edellinen: 51, tki_merkki: 'hopea', tki_pvm: '2026-09-21',
  tki_vahvuus: 'syotto', tki_kehityskohde: 'pujottelu', flei_viimeisin: 71, biologinenIka_viimeisin: { phv_tila_koodi: 'PH', maturity_offset: -0.4, phv_ika: 13.8, pvm: '2026-10-04', kasvutahti_cm_v: 6.1 }, phv_tila: 'PH', talenttiTaso: 'laajennettu',
  tekninen_varhaiskehitys: { merkki: 'kulta', ika: 10 }, streak: 5, adar_viimeisin: { a: 2.4, d: 2.1, ac: 1.6, r: 2.8, yht: 2.2 }, adar_havaintoja: 4, havainto_porras: 2,
  adar_arvioijat: [{ nimi: 'Veera V', rooli: 'valmentaja', uid: 'u1', pisteet: { a: 2, d: 2, ac: 1, r: 3 }, aika: Date.parse('2026-10-05') }, { nimi: 'Ville P', rooli: 'vp', pisteet: { a: 3, d: 2, ac: 2, r: 3 } }], adar_arvioijia: 2, adar_yhtenevyys_taso: 'korkea',
  hh_historia: [{ pvm: '2025-09-20', hh_taso: 2 }, { pvm: '2026-09-20', hh_taso: 4 }], tki_historia: [{ pvm: '2025-09-20', tki: 44 }, { pvm: '2026-09-21', tki: 58 }],
  d3_taso: 3.4, d3_viimeisin: { pisteet: { inner_drive: { avg: 4, valmentaja: 4, pelaaja: 4 }, focus: { avg: 2.5, valmentaja: 3 } } } };
const DOKIT = { 'seurat/demo/testitapahtumat/t1': { tila: 'suljettu', luotu: 1 }, 'seurat/demo/testitapahtumat/t2': { tila: 'auki', luotu: 2 } };
const PEL = PELAAJAT.concat([RIKAS]);
const odota = (p) => p.waitForSelector('[data-kn-naytto]', { timeout: 15000 });
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K2 · Näyttö uudella sivulla', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };
  it('1280: kaikki vanhan Näytön lohkot, avattava auki, tyhjä korttipaikka, PHV kerran; Master-hypyt vain nimetyistä napeista', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p5/naytto', pelaajat: PEL, dokit: DOKIT, teema: 'light' }); await odota(p);
      await p.waitForSelector('[data-kn-kaikki]', { timeout: 15000 });
      const h = await p.locator('[data-kn-naytto]').innerHTML();
      expect(await p.locator('[data-kn-kaikki]').getAttribute('open')).not.toBeNull();   // oletuksena auki kunnes todistekortit tulevat (K4)
      expect(await p.locator('[data-kn-kortit]').count()).toBe(1); expect((await p.locator('[data-kn-kortit]').innerHTML()).trim()).toBe('');   // tyhjä paikka K4:lle
      for (const o of ['Perustiedot', 'Kasvu ja kypsyys', 'Mittaukset', 'Pelihavainnot', 'Psyykkinen (D3)', 'Harjoittelu', 'Mitä pelaajan tulee osata']) expect(h, o).toContain(o);
      expect(h).toContain('Kehon valmius'); expect(h).toContain('Peliäly'); expect(h).toContain('Ristiinarvio'); expect(h).toContain('Kehityskaari'); expect(h).toContain('2 testikertaa'.replace('2', '1'));   // 1 suljettu testitapahtuma
      expect(h).toContain('maturity offset -0,4'); expect(h).toContain('mitattu 4.10.2026');
      expect(h).toContain('data-kt-mittaa');   // Suunnittele mittaus (S-hyppy Masteriin)
      expect(h).not.toContain('Resepti'); expect(h).not.toContain('data-resepti');   // Polun asioita (vainNaytto)
      expect((h.match(/PHV PH/g) || []).length).toBe(1);   // PHV-chip vain kerran
      await p.waitForSelector('#_mMitaCard details', { timeout: 8000 });
      expect(await p.locator('#_mKertymaCard').count()).toBe(1);
      expect(await p.locator('.kt-nimi').innerText()).toBe('Rikas Data');
      const luvut = await p.evaluate(() => [...document.querySelectorAll('[data-kn-naytto] *')].filter((e) => !e.children.length && /\d/.test(e.textContent) && e.offsetParent !== null).length);
      console.log('K2 luvut oletusnäkymässä (lehtielementit joissa numero, rikas fixture):', luvut); expect(luvut).toBeGreaterThan(10);   // K4:n tavoite ≤ 30 mitataan tästä
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it.each(['vp', 'super_admin'])('ROOLI %s: Näyttö renderöityy samoin (VP:n ja SA:n datapolku: seura-laajuus, ei joukkuerajausta); lataus ja Harjoittelu/Mitä osata toimivat', async (rooli) => {
    await avaa(); try {
      const { sk, p, virheet } = await kaynnista(selain, { rooli, hash: '#pelaaja/p5/naytto', pelaajat: PEL, dokit: DOKIT }); await odota(p); await p.waitForSelector('[data-kn-kaikki]', { timeout: 15000 });
      const h = await p.locator('[data-kn-naytto]').innerHTML();
      for (const o of ['Perustiedot', 'Kasvu ja kypsyys', 'Mittaukset', 'Pelihavainnot', 'Psyykkinen (D3)', 'Harjoittelu', 'Mitä pelaajan tulee osata']) expect(h, o).toContain(o);
      expect(h).toContain('1 testikertaa'); expect(h).not.toContain('data-resepti'); expect((h.match(/PHV PH/g) || []).length).toBe(1);
      await p.waitForSelector('#_mMitaCard details', { timeout: 8000 });
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('KUVAT 390 tumma + 1280 vaalea (TM_KUVAT=1)', async () => {
    if (!process.env.TM_KUVAT) return; mkdirSync(KUVAT, { recursive: true });
    await avaa(); try {
      for (const [leveys, teema, nimi] of [[390, 'dark', '390-tumma'], [1280, 'light', '1280-vaalea']]) {
        const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p5/naytto', pelaajat: PEL, dokit: DOKIT, teema, leveys, korkeus: 900 }); await odota(p); await p.waitForSelector('#_mMitaCard details', { timeout: 8000 });
        await p.waitForTimeout(800);   // navigaatiolaatikon siirtymäanimaatio loppuun ennen kuvaa
        expect(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);   // ei vaakavieritystä
        await p.screenshot({ path: join(KUVAT, 'naytto-' + nimi + '-ylhaalta.png') });
        await p.addStyleTag({ content: '#nvSide,.nv-bottom,.nv-bar,#nvBar{display:none!important}' });   // kiinteä kuori pois pitkästä kuvasta (fullPage toistaa sen väärään kohtaan)
        await p.locator('[data-kn-naytto]').screenshot({ path: join(KUVAT, 'naytto-' + nimi + '.png') }); await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
  it('LAISKA LATAUS: testitapahtumia ei haeta ennen Näyttöä; virhe näkyy lohkossa + Yritä uudelleen toimii', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p5/tanaan', pelaajat: PEL, dokit: DOKIT, vika: ['testitapahtumat'] }); await p.waitForSelector('.kt-nimi', { timeout: 15000 });
      expect(await p.evaluate(() => window.__pyynnot.filter((x) => /testitapahtumat/.test(x)).length)).toBe(0);   // Tänään: ei Näytön dataa
      await p.locator('[data-kt-valilehti="naytto"]').click(); await p.waitForSelector('[data-kn-tila="virhe"]', { timeout: 10000 });
      expect(await p.locator('[data-kn-tila="virhe"]').innerText()).toContain('Mittauksia ei saatu haettua');
      await p.evaluate(() => { window.__vika = []; }); await p.locator('[data-kn-yrita]').click(); await p.waitForSelector('[data-kn-kaikki]', { timeout: 10000 });
      expect(SUODATA(virheet).filter((e) => !/testitapahtumat|stub-vika/.test(e))).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('PELAAJAN SILMIN: Näyttö-välilehti pois käytöstä (A8); Näytön napit vievät Masteriin samaan pelaajaan', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p5/naytto', pelaajat: PEL, dokit: DOKIT }); await odota(p); await p.waitForSelector('[data-kn-kaikki]', { timeout: 15000 });
      const mj = await p.evaluate(() => ['_avaaPelaajaraportti', '_msFyysSuunnitteleMittaus', '_avaaD3Arvio', '_ehdotaTalentti', '_avaaDetail', '_ktVanhaNakyma'].every((n) => typeof window[n] === 'function'));
      expect(mj).toBe(true);   // jokaisella lohkon napilla on käsittelijä (ei kuollutta onclickiä)
      await p.locator('[data-kt-silmin]').click();
      await p.waitForFunction(() => location.hash.indexOf('/naytto') < 0, null, { timeout: 8000 });   // Silmin → välilehti vaihtuu Tänäänin
      expect(await p.locator('[data-kn-naytto]').count()).toBe(0); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
