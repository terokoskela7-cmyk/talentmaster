/* B7 · selain (Playwright + Chrome; chrome-tests-job): TalentMaster_Kehitystyopoyta.html oikeana sivuna, Firebase stubattu (tests/helpers/kt_sivu.mjs).
   TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/b7-kehitystyopoyta/ (1280 + 390 × tumma/vaalea). Vain keksityt nimet (Demo FC), ei oikeaa dataa. */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
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
      expect(await p.locator('#nvSide .nv-plus').isVisible()).toBe(true);   // + Havainto (D244)
      expect(await p.locator('[data-kt-valilehti]').allInnerTexts()).toEqual(['Tänään', 'Polku', 'Mittaukset']);
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
  it('B2 · VIIKKOHAVAINTO YHDELLÄ NAPAUTUKSELLA (VP ja valmentaja): napit suoraan signaalikortissa; yksi napautus kirjoittaa osa_havainnot oman uid:n alle; "Tallennettu · Kumoa"; välilehti ei vaihdu', async () => {
    await avaa(); try {
      for (const rooli of ['valmentaja', 'vp']) {
        const { sk, p } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/tanaan' }); await odota(p);
        expect(await p.locator('.kt-sig [data-kt-havainto-inline] [data-kt-havainto-arvo]').allInnerTexts()).toEqual(['Ei vielä', 'Ohjatusti', 'Itsenäisesti']);   // ei "Merkitse havainto" -väliaskelta
        await p.locator('.kt-sig [data-kt-havainto-arvo="2"]').click(); await p.waitForFunction(() => window.__kirj.length > 0, null, { timeout: 8000 });
        const k = await p.evaluate(() => window.__kirj); expect(k).toHaveLength(1); expect(k[0].path).toBe('seurat/demo/pelaajat/p2');
        const P = 'jaksofokus.osa_havainnot.y_h1.a.u1.', u = k[0].update; expect(u[P + 'arvo']).toBe(2); expect(u[P + 'rooli']).toBe(rooli); expect(u[P + 'pvm']).toBe('2026-10-19'); expect(Object.keys(u).some((x) => /\.lause$/.test(x))).toBe(false);   // B2b: vain arvo, pvm, rooli
        expect(await hash(p)).toBe('#pelaaja/p2/tanaan'); expect(await p.locator('[data-kt-valilehti][aria-selected="true"]').innerText()).toBe('Tänään');
        expect(await p.locator('#toast-wrap .toast-item').innerText()).toMatch(/^Tallennettu\s*·\s*Kumoa$/); expect(await p.locator('[data-kt-kumoa]').count()).toBe(1);
        await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
  it('B2 · KUMOA (5 s): palauttaa oman rivin (ei ollut → poistetaan) ja voimassa olevan arvon; toast katoaa 5 s jälkeen; kumottu-ilmoitus', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { hash: '#pelaaja/p2/tanaan' }); await odota(p);
      await p.locator('.kt-sig [data-kt-havainto-arvo="3"]').click(); await p.waitForSelector('[data-kt-kumoa]');
      await p.locator('[data-kt-kumoa]').click(); await p.waitForFunction(() => window.__kirj.length === 2, null, { timeout: 8000 });
      const u = await p.evaluate(() => window.__kirj[1].update); expect(u['jaksofokus.osa_havainnot.y_h1.a.u1']).toBe('DEL'); expect(u['jaksofokus.osa_arviot.y_h1']).toBe('DEL');   // ei aiempaa → kentät poistetaan
      await p.waitForFunction(() => /Kumottu/.test(document.querySelector('#toast-wrap').innerText), null, { timeout: 5000 });
      expect(await p.locator('.kt-sig [data-kt-havainto-arvo="3"].q').count()).toBe(1);   // paikallinen tila palasi: valinta ei enää korostettu
      await sk.close();
      const r2 = await kaynnista(selain, { hash: '#pelaaja/p2/tanaan' }); await odota(r2.p); await r2.p.locator('.kt-sig [data-kt-havainto-arvo="1"]').click(); await r2.p.waitForSelector('[data-kt-kumoa]');
      await r2.p.waitForFunction(() => !document.querySelector('[data-kt-kumoa]'), null, { timeout: 7000 });   // 5 s → toast pois, Kumoa ei enää tarjolla
      expect(await r2.p.evaluate(() => window.__kirj.length)).toBe(1); await r2.sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('B2 · KUMOA palauttaa EDELLISEN arvon: valmentajan aiempi rivi säilyy kun VP kirjoittaa ja kumoaa (VP ei korvaa valmentajaa)', async () => {
    await avaa(); try {
      const pel = JSON.parse(JSON.stringify(PELAAJAT)); pel[1].jaksofokus.osa_havainnot = { y_h1: { a: { valm9: { arvo: 2, pvm: '2026-09-25', rooli: 'valmentaja' } } } }; pel[1].jaksofokus.osa_arviot = { y_h1: { a: 2 } };
      const { sk, p } = await kaynnista(selain, { rooli: 'vp', hash: '#pelaaja/p2/tanaan', pelaajat: pel }); await odota(p);
      await p.locator('.kt-sig [data-kt-havainto-arvo="3"]').click(); await p.waitForSelector('[data-kt-kumoa]');
      const k1 = await p.evaluate(() => window.__kirj[0].update); expect(k1['jaksofokus.osa_arviot.y_h1']).toBeUndefined();   // VP ei kirjoita voimassa olevaa arvoa valmentajan päälle
      await p.locator('[data-kt-kumoa]').click(); await p.waitForFunction(() => window.__kirj.length === 2, null, { timeout: 8000 });
      const k2 = await p.evaluate(() => window.__kirj[1].update); expect(k2['jaksofokus.osa_havainnot.y_h1.a.u1']).toBe('DEL'); expect(Object.keys(k2).filter((k) => !/osa_havainnot_vk/.test(k))).toEqual(['jaksofokus.osa_havainnot.y_h1.a.u1']); expect(Object.keys(k2).filter((k) => /osa_havainnot_vk/.test(k))).toEqual(['jaksofokus.osa_havainnot_vk.y_h1.a.2026-W43.u1']);   // B2c: viikkohistoria palautuu (ei aiempaa → poisto) await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('B2 · "+ Lause tai klippi" → lyhyt alasheet: valinta + lause tallentuu samaan omaan riviin; KIELLETYT-sana ja yli 140 merkkiä estetään; valinta pakollinen', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { hash: '#pelaaja/p2/tanaan' }); await odota(p);
      await p.locator('[data-kt-havainto-lisaa]').click(); await p.waitForSelector('[data-ts-sheet]');
      expect(await p.locator('.ts-lyhyt').count()).toBe(1); await p.locator('[data-kt-havainto-sheet-tallenna]').click(); expect(await p.locator('[data-kt-havainto-virhe]').innerText()).toBe('Valitse ensin, näkyikö osa.');
      await p.locator('input[name="ktHavArvo"][value="2"]').check(); await p.locator('#ktHavLause').fill('Tämä on heikkous'); await p.locator('[data-kt-havainto-sheet-tallenna]').click(); expect(await p.locator('[data-kt-havainto-virhe]').innerText()).toMatch(/heikkou/);
      await p.locator('#ktHavLause').fill('Katsoi hyvin ylös ennen vastaanottoa'); await p.locator('[data-kt-havainto-sheet-tallenna]').click();
      await p.waitForFunction(() => window.__kirj.length === 1, null, { timeout: 8000 }); expect(await p.locator('[data-ts-sheet]').count()).toBe(0);
      { const u = await p.evaluate(() => window.__kirj[0].update); expect(u['jaksofokus.osa_havainnot.y_h1.a.u1.arvo']).toBe(2); expect(u['jaksofokus.osa_havainnot.y_h1.a.u1.lause']).toBe('Katsoi hyvin ylös ennen vastaanottoa'); } await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('B2 · D100: sulkeminen (‹ Sulje, Esc, tausta) SÄILYTTÄÄ luonnoksen; "Luonnos säilytetty" avaajan vieressä; Hylkää luonnos / Tallenna tyhjentää; yksi sheet kerrallaan', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { hash: '#pelaaja/p2/tanaan' }); await odota(p);
      const avaaSheet = async () => { await p.locator('[data-kt-havainto-lisaa]').click(); await p.waitForSelector('[data-ts-sheet]'); };
      await avaaSheet(); await p.locator('#ktHavLause').fill('Luonnoksen teksti'); await p.locator('input[name="ktHavArvo"][value="3"]').check();
      for (const tapa of ['sulje', 'esc', 'tausta']) {
        if (tapa === 'sulje') await p.locator('[data-ts-sulje]').click(); else if (tapa === 'esc') await p.keyboard.press('Escape'); else await p.locator('[data-ts-tausta]').click({ position: { x: 5, y: 5 } });
        await p.waitForFunction(() => !document.querySelector('[data-ts-sheet]')); expect(await p.locator('.ts-luonnos-merkki').innerText(), tapa).toBe('Luonnos säilytetty');
        await avaaSheet(); expect(await p.locator('#ktHavLause').inputValue(), tapa).toBe('Luonnoksen teksti'); expect(await p.locator('input[name="ktHavArvo"][value="3"]').isChecked(), tapa).toBe(true); expect(await p.locator('[data-ts-luonnos]').innerText()).toBe('Luonnos säilytetty');
      }
      expect(await p.evaluate(() => window.__kirj.length)).toBe(0);   // mitään ei kirjoitettu sulkemalla
      await p.locator('[data-ts-hylkaa]').click(); await p.waitForFunction(() => !document.querySelector('[data-ts-sheet]')); expect(await p.locator('.ts-luonnos-merkki').count()).toBe(0);
      await avaaSheet(); expect(await p.locator('#ktHavLause').inputValue()).toBe(''); expect(await p.locator('[data-ts-luonnos]').count()).toBe(0);
      await p.keyboard.press('Escape'); await p.waitForFunction(() => !document.querySelector('[data-ts-sheet]')); expect(await p.locator('.ts-luonnos-merkki').count()).toBe(0);   // koskematon sheet ei jätä luonnosta
      await sk.close();
    } finally { await selain.close(); }
  }, 90000);
  it('B2 · sheet-asettelu: 390 px lyhyt = alasheet pohjassa (kahva, ≤ 70 % korkeus), 1280 = keskitetty dialogi ≤ 540 px; kosketuskohteet ≥ 44 px; fokus palaa avaajalle', async () => {
    await avaa(); try {
      let r = await kaynnista(selain, { leveys: 390, korkeus: 844, hash: '#pelaaja/p2/tanaan' }); await odota(r.p);
      await r.p.locator('[data-kt-havainto-lisaa]').click(); await r.p.waitForSelector('[data-ts-sheet]');
      const m = await r.p.evaluate(() => { const b = document.querySelector('[data-ts-sheet]').getBoundingClientRect(); return { alas: Math.round(b.bottom), korkeus: Math.round(b.height), leveys: Math.round(b.width), kahva: getComputedStyle(document.querySelector('.ts-kahva')).display, pienet: Array.from(document.querySelectorAll('[data-ts-sheet] button, [data-ts-sheet] label.kt-btn')).filter((e) => e.getBoundingClientRect().height < 43).map((e) => e.textContent.trim()) }; });
      expect(m.alas).toBe(844); expect(m.korkeus).toBeLessThanOrEqual(Math.round(844 * 0.7) + 1); expect(m.leveys).toBe(390); expect(m.kahva).not.toBe('none'); expect(m.pienet).toEqual([]);
      await r.p.keyboard.press('Escape'); await r.p.waitForFunction(() => !document.querySelector('[data-ts-sheet]')); expect(await r.p.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-kt-havainto-lisaa'))).toBe(true); await r.sk.close();
      r = await kaynnista(selain, { leveys: 1280, korkeus: 900, hash: '#pelaaja/p2/tanaan' }); await odota(r.p); await r.p.locator('[data-kt-havainto-lisaa]').click(); await r.p.waitForSelector('[data-ts-sheet]');
      const d = await r.p.evaluate(() => { const b = document.querySelector('[data-ts-sheet]').getBoundingClientRect(); return { leveys: Math.round(b.width), keskella: Math.abs((b.left + b.width / 2) - window.innerWidth / 2) < 2, pystyKeskella: Math.abs((b.top + b.height / 2) - window.innerHeight / 2) < window.innerHeight * 0.3 }; });
      expect(d.leveys).toBeLessThanOrEqual(540); expect(d.keskella).toBe(true); expect(d.pystyKeskella).toBe(true); await r.sk.close();
    } finally { await selain.close(); }
  }, 90000);
  it('PELAAJA EI KIRJOITA: pelaajan rooli ei pääse sivulle (ei työpöytää, ei kirjoitusta)', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'pelaaja', hash: '#pelaaja/p2/tanaan' }); await p.waitForSelector('.kts-viesti', { timeout: 15000 });
      expect(await p.locator('.kt-nimi, [data-kt-ensisijainen]').count()).toBe(0); expect(await p.evaluate(() => window.__kirj.length)).toBe(0); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('VÄLILEHDET: Polku renderöityy tälle sivulle (B4a), Näyttö renderöityy tälle sivulle (K2); hash päivittyy', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { hash: '#pelaaja/p2/tanaan' }); await odota(p);
      await p.locator('[data-kt-valilehti="polku"]').click(); expect(await hash(p)).toBe('#pelaaja/p2/polku'); await p.waitForSelector('[data-kt-sivu="polku"] [data-kt-polku]', { timeout: 10000 }); expect(await p.locator('[data-kt-sivu="polku"] [data-kt-vanha], [data-kt-sivu="polku"] .kts-polku').count()).toBe(0);   // ei enää siirtymä-tynkää
      await p.locator('[data-kt-valilehti="naytto"]').click(); expect(await hash(p)).toBe('#pelaaja/p2/naytto'); await p.waitForSelector('[data-kt-sivu="naytto"] [data-kn-naytto]', { timeout: 10000 }); expect(await p.locator('[data-kt-sivu="naytto"] .kts-polku').count()).toBe(0);   // K2: Näyttö renderöityy tälle sivulle (ei enää siirtymä-tynkää); sisältö: tests/k2_naytto_selain.test.js
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
  it.skipIf(process.env.TM_KUVAT !== '1')('KUVAT (B2): 1280 + 390 tumma — Tänään inline-napit, lyhyt alasheet, luonnos säilytetty', async () => {
    const UT = join(JUURI, 'docs', 'ui-kuvat', 'b2-sheet-havainto'); mkdirSync(UT, { recursive: true }); await avaa(); try {
      for (const [leveys, korkeus] of [[1280, 900], [390, 844]]) {
        const { sk, p } = await kaynnista(selain, { leveys, korkeus, teema: 'dark', hash: '#pelaaja/p2/tanaan' }); await odota(p); await p.waitForTimeout(300);
        await p.screenshot({ path: join(UT, 'b2_tanaan_inline_' + leveys + '_dark.png') });
        await p.locator('[data-kt-havainto-lisaa]').click(); await p.waitForSelector('[data-ts-sheet]'); await p.locator('input[name="ktHavArvo"][value="2"]').check(); await p.locator('#ktHavLause').fill('Katsoi hyvin ylös ennen vastaanottoa'); await p.waitForTimeout(200);
        await p.screenshot({ path: join(UT, 'b2_sheet_lyhyt_' + leveys + '_dark.png') });
        await p.keyboard.press('Escape'); await p.waitForTimeout(200); await p.screenshot({ path: join(UT, 'b2_luonnos_sailytetty_' + leveys + '_dark.png') });
        await p.locator('.kt-sig [data-kt-havainto-arvo="3"]').click(); await p.waitForSelector('[data-kt-kumoa]'); await p.screenshot({ path: join(UT, 'b2_tallennettu_kumoa_' + leveys + '_dark.png') });
        await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
});
