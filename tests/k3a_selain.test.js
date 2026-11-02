/* K3a · selain (Playwright + Chrome): Anna pelaajan valita + Hylkää valinta sheetinä uudella sivulla (inventaario #1, #2). Firebase stubattu (tests/helpers/kt_sivu.mjs), ei ulkoverkkoa, UTC-kelpoinen.
   Valmentaja- ja VP-rooli. TM_KUVAT=1 → docs/ui-kuvat/k3a/ (390 tumma + 1280 vaalea). */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT, SISAINEN, kirjoitukset } from './helpers/kt_sivu.mjs';
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'k3a');
const odota = (p) => p.waitForSelector('.kt-nimi', { timeout: 15000 });
const HAV = { ball_control: 2, short_passing: 3 };   // heikoin ensin: ball_control → y_h1 (jakson nykyinen, jää pois), short_passing → y_h2; täydennys tulee muista sallituista
const VALITTAVANA = { tila: 'valittavana', vaihtoehdot: [{ konsepti_avain: 'y_h2', nimi: 'Syöttö eteenpäin', perustelu: 'Syöttö auttaa joukkuetta.', vahvistettu: true }, { konsepti_avain: 'y_h3', nimi: 'Kuljetus tilaan', perustelu: 'Kuljeta tilaan.', vahvistettu: true }] };
/* p2: käynnissä oleva jakso + ydinvahvuuden kuvaus + arviointi (ehdotuksia) · p3: jakso käynnissä, ei kuvausta · p1: pelaaja on valinnut (valinta_tehty) · p4: valinta odottaa (ei valintaa) */
const pelaajat = () => PELAAJAT.map((x) => {
  if (x.id === 'p2') return Object.assign({}, x, { ydinvahvuus: { kuvaus: 'Ottaa pallon rohkeasti haltuun.' }, arviointi_havaittu: HAV });
  if (x.id === 'p3') return Object.assign({}, x, { jaksofokus: Object.assign({}, PELAAJAT[1].jaksofokus) });
  if (x.id === 'p1') return Object.assign({}, x, { ydinvahvuus: { kuvaus: 'Lukee pelin hyvin.' }, jaksofokus: VALITTAVANA, ydinvahvuus_valinta: { vaihtoehto: 'y_h2', valittu_pvm: '2026-10-18' }, arviointi_havaittu: HAV });
  return x;
}).concat([{ id: 'p4', etunimi: 'Eero', sukunimi: 'Ek', syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'Demo U13', joukkueet: ['demo_u13'], ydinvahvuus: { kuvaus: 'Rauhallinen.' }, jaksofokus: VALITTAVANA }]);
const ei = (v) => !/sentry-cdn/.test(v);   // harnessin Sentry-stubi rikkoo SRI-tarkistuksen (ei liity testattavaan)
const valikko = async (p) => { if (!(await p.locator('.kt-valikko[open]').count())) await p.locator('.kt-valikko > summary').first().click(); };
const avaaAnnaValita = async (p) => { await valikko(p); await p.locator('[data-kt-valikko="anna_valita"]').click(); await p.waitForSelector('[data-kvk-kysymys]'); };
const vastaa = async (p, q, v) => p.locator('[data-kvk-kysymys="' + q + '"] [data-kvk-arvo="' + v + '"]').click();
const taytaSulku = async (p) => { await vastaa(p, 'nakyi', 'itsenaisesti'); await vastaa(p, 'treeni', 'usein'); await vastaa(p, 'mukana', 'hyvin'); await p.locator('#kvkLause').fill('Katsoi ylös ennen vastaanottoa.'); };
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K3a · Anna pelaajan valita + Hylkää valinta sheetinä', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };
  for (const rooli of ['valmentaja', 'vp']) {
    it('[' + rooli + '] Tänään ⋯ → Anna pelaajan valita avaa saman Sulje jakso -sheetin K3-osio auki; tavallinen Sulje jakso ei näytä osiota; ei hyppyä Masteriin', async () => {
      await avaa(); try {
        const { sk, p, virheet } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/tanaan', pelaajat: pelaajat() }); await odota(p);
        await valikko(p); await p.locator('[data-kt-valikko="sulje"]').click(); await p.waitForSelector('[data-kvk-kysymys]');
        expect(await p.locator('[data-k3-osio]').count()).toBe(0); await p.locator('[data-ts-sulje]').click(); await p.waitForTimeout(300);
        await avaaAnnaValita(p);
        expect(p.url()).toContain('TalentMaster_Kehitystyopoyta.html'); expect(await p.locator('[data-ts-tausta].ts-pitka').count()).toBe(1); expect(await p.locator('[data-k3-osio]').count()).toBe(1);
        expect(await p.evaluate(() => ['_ktArvK3Paalle', '_ktArvK3Valitse', '_ktArvK3Lause', '_ktHkPerustelu', '_ktHkNayta', '_ktHkTallenna', '_ktHkSulje', '_ktHkK3Valitse', '_ktHkK3Lause'].map((n) => typeof window[n]).concat(typeof window.TM_KT_HYLKAA, typeof window.TM_REITIN_VALINTA).join())).toBe('function,function,function,function,function,function,function,function,function,object,object');   // HTML-muutoksen typeof-tarkistus
        expect(await p.locator('[data-k3-kortti]').count()).toBeGreaterThanOrEqual(1); expect(await p.locator('[data-kvk-syvenna]').count()).toBe(1);   /* K4b: Kehityskeskustelu-nappi (avaa oikean keskustelun) */
        expect(virheet.filter(ei)).toEqual([]); await sk.close();
      } finally { await selain.close(); }
    }, 60000);
    it('[' + rooli + '] tarjous lähtee uudelta sivulta: YKSI batch (sulku + tarjous + valinta pois), tila päivittyy heti (Tänään + Polku), ei latausta', async () => {
      await avaa(); try {
        const { sk, p, virheet } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/tanaan', pelaajat: pelaajat() }); await odota(p); await avaaAnnaValita(p); await taytaSulku(p);
        await p.locator('[data-k3-kortti="0"] input[type=checkbox]').check(); await p.locator('[data-k3-kortti="0"] textarea').fill('Tämä sopii sinulle.');
        await p.locator('[data-kvk-tallenna]').click({ force: true }); await p.waitForFunction(() => (window.__batch || []).length === 1, null, { timeout: 8000 });
        const b = await p.evaluate(() => window.__batch[0]), upd = b.find((o) => o.update);
        expect(upd.path).toBe('seurat/demo/pelaajat/p2'); expect(upd.update.jaksofokus.tila).toBe('valittavana'); expect(upd.update.jaksofokus.vaihtoehdot).toHaveLength(1);
        expect(upd.update.jaksofokus.vaihtoehdot[0]).toMatchObject({ vahvistettu: true, perustelu: 'Tämä sopii sinulle.' }); expect(upd.update.ydinvahvuus_valinta).toBe('DEL'); expect(upd.update.jaksofokus_historia.__arrayUnion[0]).toMatchObject({ sulkutapa: 'suljettu' });
        await p.waitForSelector('[data-kvk-kysymys]', { state: 'detached', timeout: 5000 }); expect(await p.locator('#toast-wrap').innerText()).toMatch(/valinta tarjottu pelaajalle/);
        expect(await p.locator('.kt-ot').innerText()).toMatch(/Valinta odottaa/);   // Tänään-signaali ilman latausta
        await p.locator('[role="tab"]:has-text("Polku")').first().click(); await p.waitForSelector('[data-kt-jakso]');
        expect(await p.locator('[data-kt-jakso="ei_jaksoa"]').innerText()).toMatch(/Pelaaja valitsee/);   // Polun jaksokortti
        expect(virheet.filter(ei)).toEqual([]); await sk.close();
      } finally { await selain.close(); }
    }, 60000);
  }
  it('K3-tarjous: ilman valittua vaihtoehtoa ei kirjoitusta (virhetoast, sheet auki); "Ei, aloitan jakson itse" sulkee jakson ilman tarjousta', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: pelaajat() }); await odota(p); await avaaAnnaValita(p); await taytaSulku(p);
      await p.locator('[data-kvk-tallenna]').click({ force: true }); await p.waitForTimeout(400);
      expect(await p.evaluate(() => (window.__batch || []).length)).toBe(0); expect(await p.locator('[data-kvk-kysymys]').count()).toBe(3); expect(await p.locator('#toast-wrap').innerText()).toMatch(/Valitse vähintään yksi vaihtoehto/);
      await p.locator('[data-k3-osio] button:has-text("Ei, aloitan jakson itse")').click(); await p.locator('[data-kvk-tallenna]').click({ force: true }); await p.waitForFunction(() => (window.__batch || []).length === 1, null, { timeout: 8000 });
      const upd = (await p.evaluate(() => window.__batch[0])).find((o) => o.update); expect((upd.update.jaksofokus || {}).tila).not.toBe('valittavana'); expect(upd.update.ydinvahvuus_valinta).toBeUndefined(); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('ei suljettavaa jaksoa (p1): Anna pelaajan valita -riviä ei ole valikossa lainkaan', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p3/tanaan', pelaajat: pelaajat().map((x) => x.id === 'p3' ? { id: 'p3', etunimi: 'Cecil', sukunimi: 'Carlsson', syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'Demo U13', joukkueet: ['demo_u13'], ydinvahvuus: { kuvaus: 'Rauhallinen.' } } : x) }); await odota(p);
      expect(await p.locator('[data-kt-valikko="anna_valita"]').count()).toBe(0); expect(await p.locator('.kt-valikko').count()).toBe(0); await sk.close();   // ei jaksoa → ei rivejä → ei ⋯-valikkoakaan
    } finally { await selain.close(); }
  }, 60000);
  it('ehto: ilman ydinvahvuuden kuvausta Anna pelaajan valita on harmaa rivi + lyhyt syy (Tänään ⋯ ja Polku ⋯), ei avaa mitään', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p3/tanaan', pelaajat: pelaajat() }); await odota(p); await valikko(p);
      const r = p.locator('[data-kt-valikko="anna_valita"]'); expect(await r.isDisabled()).toBe(true); expect(await r.locator('[data-kt-valikko-syy]').innerText()).toBe('Ydinvahvuuden kuvaus puuttuu');
      await p.locator('.kt-valikko > summary').first().click();
      await p.locator('[role="tab"]:has-text("Polku")').first().click(); await p.waitForSelector('[data-kt-jakso]'); await p.locator('.kt-pk-valikko > summary').click();
      const r2 = p.locator('.kt-pk-valikko [data-kt-anna-valita]'); expect(await r2.isDisabled()).toBe(true); expect(await r2.locator('[data-kt-valikko-syy]').innerText()).toBe('Ydinvahvuuden kuvaus puuttuu'); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  for (const rooli of ['valmentaja', 'vp']) {
    it('[' + rooli + '] Hylkää valinta (valinta_tehty): sheet, kytkin pois = perustelu vain sisäiseen reviewit-kenttään; hylkäys palauttaa valintatilaan yhdessä batchissa, perustelua ei kirjoiteta pelaajan luettavaan kenttään', async () => {
      await avaa(); try {
        const { sk, p, virheet } = await kaynnista(selain, { rooli, hash: '#pelaaja/p1/tanaan', pelaajat: pelaajat() }); await odota(p);
        expect(await p.locator('.kt-ot').innerText()).toMatch(/Pelaaja valitsi/);
        await valikko(p); await p.locator('[data-kt-valikko="hylkaa"]').click(); await p.waitForSelector('[data-k3-osio]');
        expect(p.url()).toContain('TalentMaster_Kehitystyopoyta.html'); expect(await p.locator('[data-ts-tausta].ts-pitka').count()).toBe(1);
        expect(await p.locator('#hkNayta').isChecked()).toBe(false); expect(await p.locator('[data-hk-perustelu]').count()).toBe(1); expect(await p.locator('[data-k3-kortti]').count()).toBeGreaterThan(0);
        expect(await p.locator('[data-k3-kortti="0"] input[type=checkbox]').isChecked()).toBe(true);   // esitäytetty nykyisillä vaihtoehdoilla
        await p.locator('[data-hk-laheta]').click(); await p.waitForTimeout(400); expect(await p.evaluate(() => (window.__batch || []).length)).toBe(0); expect(await p.locator('#toast-wrap').innerText()).toMatch(/Kirjoita perustelu/);   // perustelu pakollinen myös sisäisenä
        await p.locator('[data-hk-perustelu]').fill('Sisäinen muistiinpano.'); await p.locator('[data-hk-laheta]').click(); await p.waitForFunction(() => (window.__batch || []).length === 1, null, { timeout: 8000 });
        const b = await p.evaluate(() => window.__batch[0]), k = b.find((o) => o.path === 'seurat/demo/pelaajat/p1'), sis = b.find((o) => /\/reviewit\//.test(o.path)), st = b.find((o) => SISAINEN.test(o.path)); expect(b).toHaveLength(3); expect(await p.evaluate(() => (window.__kirj || []).length)).toBe(0);   // sisainen/tiedot dual-write samassa batchissa (#1144–#1147)
        expect(st.path).toBe('seurat/demo/pelaajat/p1/sisainen/tiedot'); expect(Object.keys(st.set).sort()).toEqual(['jaksofokus_sisainen', 'paivitetty', 'seuraId']); expect([...st.opts.mergeFields].sort()).toEqual(['jaksofokus_sisainen', 'paivitetty', 'seuraId']);
        expect(sis.opts).toEqual({ merge: true });
        expect(k.path).toBe('seurat/demo/pelaajat/p1'); expect(Object.keys(k.update).sort()).toEqual(['jaksofokus', 'ydinvahvuus_valinta']); expect(k.update.ydinvahvuus_valinta).toBe('DEL');
        expect(sis.path).toMatch(/^seurat\/demo\/pelaajat\/p1\/reviewit\/\d{4}-\d{2}-\d{2}$/); expect(Object.keys(sis.set)).toEqual(['hylkays_sisainen']); expect(sis.set.hylkays_sisainen).toMatchObject({ teksti: 'Sisäinen muistiinpano.', lahde: rooli === 'vp' ? 'vp' : 'valmentaja' }); expect(JSON.stringify(k.update)).not.toContain('Sisäinen muistiinpano');
        expect(k.update.jaksofokus.tila).toBe('valittavana'); expect(k.update.jaksofokus.hylatty.perustelu).toBeUndefined(); expect(k.update.jaksofokus.hylatty.pvm).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        await p.waitForSelector('[data-k3-osio]', { state: 'detached', timeout: 5000 }); expect(await p.locator('#toast-wrap').innerText()).toMatch(/Valinta palautettu pelaajalle/);
        expect(await p.locator('.kt-ot').innerText()).toMatch(/Valinta odottaa/); expect(await p.locator('[data-kt-valikko="hylkaa"]').count()).toBe(0);   // tila päivittyi heti: ei enää valinta_tehty
        expect(virheet.filter(ei)).toEqual([]); await sk.close();
      } finally { await selain.close(); }
    }, 60000);
  }
  it('Hylkää valinta: "Näytä myös pelaajalle" päälle → perustelu pakollinen ja kirjoitetaan hylatty.perustelu; Polun Hylkää-linkki avaa saman sheetin', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p1/polku', pelaajat: pelaajat() }); await odota(p); await p.waitForSelector('[data-kt-hylkaa]');
      await p.locator('[data-kt-hylkaa]').click(); await p.waitForSelector('[data-k3-osio]'); await p.locator('#hkNayta').check(); await p.waitForSelector('[data-hk-perustelu]');   // päällä: perustelu pelaajalle (hylatty.perustelu), ei sisäistä kopiota
      await p.locator('[data-hk-laheta]').click(); await p.waitForTimeout(400); expect(await kirjoitukset(p)).toEqual([]); expect(await p.locator('#toast-wrap').innerText()).toMatch(/Kirjoita perustelu/);
      await p.locator('[data-hk-perustelu]').fill('Mietitään vielä yhdessä.'); await p.locator('[data-hk-laheta]').click(); await p.waitForFunction(() => (window.__batch || []).length === 1, null, { timeout: 8000 });
      const b = await p.evaluate(() => window.__batch[0]); expect(b).toHaveLength(2); expect(await p.evaluate(() => (window.__kirj || []).length)).toBe(0);   // suora update → batch: sisainen/tiedot dual-write (#1144–#1147)
      const k = b.find((o) => o.path === 'seurat/demo/pelaajat/p1'), st = b.find((o) => SISAINEN.test(o.path)); expect(Object.keys(k.update).sort()).toEqual(['jaksofokus', 'ydinvahvuus_valinta']);
      expect(k.update.jaksofokus.hylatty.perustelu).toBe('Mietitään vielä yhdessä.'); expect(b.some((o) => /\/reviewit\//.test(o.path))).toBe(false);   // päällä: ei sisäistä reviewit-kopiota
      expect(st.path).toBe('seurat/demo/pelaajat/p1/sisainen/tiedot'); expect(Object.keys(st.set).sort()).toEqual(['jaksofokus_sisainen', 'paivitetty', 'seuraId']); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('luonnos: Hylkää-sheetin perustelu säilyy kun sheet suljetaan ja avataan uudelleen; ilman valintaa (p4) Hylkää-toimintoa ei ole', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'vp', hash: '#pelaaja/p1/tanaan', pelaajat: pelaajat() }); await odota(p);
      await valikko(p); await p.locator('[data-kt-valikko="hylkaa"]').click(); await p.waitForSelector('[data-k3-osio]'); await p.locator('#hkNayta').check(); await p.locator('[data-hk-perustelu]').fill('Luonnos.'); await p.locator('[data-ts-sulje]').click(); await p.waitForTimeout(300);
      await valikko(p); await p.locator('[data-kt-valikko="hylkaa"]').click(); await p.waitForSelector('[data-hk-perustelu]'); expect(await p.locator('[data-hk-perustelu]').inputValue()).toBe('Luonnos.'); expect(await p.evaluate(() => (window.__kirj || []).length)).toBe(0);
      await sk.close();
      const { p: q, sk: sk2 } = await kaynnista(selain, { rooli: 'vp', hash: '#pelaaja/p4/tanaan', pelaajat: pelaajat() }); await odota(q); expect(await q.locator('[data-kt-valikko="hylkaa"]').count()).toBe(0); await sk2.close();
    } finally { await selain.close(); }
  }, 60000);
  it.skipIf(!process.env.TM_KUVAT)('kuvat: 390 tumma + 1280 vaalea (K3-sheet, Hylkää-sheet, harmaa rivi)', async () => {
    mkdirSync(KUVAT, { recursive: true }); await avaa(); try {
      for (const [leveys, teema, nimi] of [[390, 'dark', '390-tumma'], [1280, 'light', '1280-vaalea']]) {
        const kork = leveys === 390 ? 844 : 900;
        let { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: pelaajat(), leveys, korkeus: kork, teema }); await odota(p); await avaaAnnaValita(p); await p.waitForTimeout(300);
        await p.locator('[data-k3-kortti="0"] input[type=checkbox]').check(); await p.screenshot({ path: join(KUVAT, 'anna-valita-' + nimi + '.png') }); await sk.close();
        ({ sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p1/tanaan', pelaajat: pelaajat(), leveys, korkeus: kork, teema })); await odota(p); await valikko(p); await p.locator('[data-kt-valikko="hylkaa"]').click(); await p.waitForSelector('[data-k3-osio]'); await p.waitForTimeout(300);
        await p.screenshot({ path: join(KUVAT, 'hylkaa-' + nimi + '.png') }); await sk.close();
        ({ sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p3/tanaan', pelaajat: pelaajat(), leveys, korkeus: kork, teema })); await odota(p); await valikko(p); await p.waitForTimeout(200); await p.screenshot({ path: join(KUVAT, 'valikko-harmaa-' + nimi + '.png') }); await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
});
