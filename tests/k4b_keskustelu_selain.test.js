/* K4b · selain (Playwright + Chrome; chrome-tests-job): Kehityskeskustelu uudella sivulla sheetinä, valmentaja- JA VP-roolilla.
   Firebase stubattu (tests/helpers/kt_sivu.mjs), ei ulkoverkkoa, UTC-turvallinen (kello jäädytetty stubissa). TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/k4b/ (1280 vaalea + 390 tumma). Vain keksityt nimet (Demo FC). */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT, SISAINEN } from './helpers/kt_sivu.mjs';
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'k4b');
const SUODATA = (v) => v.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e));
const odota = (p) => p.waitForSelector('[data-kt-polku]', { timeout: 15000 });
const kuva = async (p, nimi) => { if (!process.env.TM_KUVAT) return; await p.waitForTimeout(600); mkdirSync(KUVAT, { recursive: true }); await p.screenshot({ path: join(KUVAT, nimi + '.png') }); };
const masterKorvaus = (p) => p.route(/TalentMaster_Master_v16\.html/, (r) => r.fulfill({ contentType: 'text/html', body: '<html><body>master-tynkä</body></html>' }));
const masterissa = (p) => /TalentMaster_Master_v16\.html/.test(p.url());
const KAUSI = 'seurat/demo/pelaajat/p2/idp_kausi/2026';
const VOIMASSA = { status: 'aktiivinen', luotu: '2026-08-20T10:00:00.000Z', fokus: { alue: 'acceleration', dim: 'D1', nimi: 'Kiihdytys', lahde: 'mitattu' }, pelaajan_tavoite: 'Haluan päästä nopeammin liikkeelle', mittari: { testId: 'sprint10', yksikko: 's', suunta: 'pienempi' }, lahto: { arvo: 2.1, pvm: '2026-06-05' }, tavoitearvo: 1.9, aikaraami: { kausi: '2026' } };
const EHDOTUS = { ...VOIMASSA, status: 'ehdotettu' };
const D3 = { d3_viimeisin: { pvm: '2026-10-01', lahteet: ['pelaaja', 'valmentaja', 'vp'], pisteet: { inner_drive: { pelaaja: 5, valmentaja: 3, vp: 3 }, coachability: { pelaaja: 4, valmentaja: 4, vp: 4 }, resilience: { pelaaja: 3, valmentaja: 3 }, focus: { pelaaja: 2, valmentaja: 4 }, emotional_control: { pelaaja: 4, valmentaja: 4 } } } };
const HIST = [{ konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: '2026-08-01', paattyi: '2026-09-12', suljettu: '2026-09-12T10:00:00.000Z', sulkutapa: 'suljettu', tulos: 'parani', domeeni: 'teknis_taktinen' }, { konsepti_avain: 'fy_a', konsepti_nimi: 'Kiihdytys', alkoi: '2026-06-01', paattyi: '2026-07-10', domeeni: 'fyysinen', tulos: 'ennallaan' }];
const P = (id, o) => PELAAJAT.map((p) => p.id === id ? { ...p, suostumusTila: 'annettu', ...o } : p);
const BATCH = (p) => p.evaluate(() => window.__batch || []);
const avaaPolulta = async (p) => { await odota(p); await p.locator('[data-kt-kirjaa-keskustelu]').click(); await p.waitForSelector('[data-ts-sheet^="keskustelu_"]', { timeout: 5000 }); };

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K4b · Kehityskeskustelu sheetinä', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };
  describe.each([['valmentaja'], ['vp']])('%s', (rooli) => {
    it('KIRJAUS: Polun otsikkonappi avaa sheetin paikallaan (ei Masteriin); sisältö: tavoite+jaksot, D3-erot, neljä aluetta; Tallenna = yksi batch (reviewit sisäinen + rytmi), Historiaan rivi rooleineen', async () => {
      await avaa(); try {
        const { sk, p, virheet } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/polku', pelaajat: P('p2', { ...D3, jaksofokus_historia: HIST }), dokit: { [KAUSI]: { tavoitteet: [VOIMASSA] } }, leveys: 1280, korkeus: 1500, teema: 'light' }); await masterKorvaus(p);
        await avaaPolulta(p); await p.waitForSelector('[data-kes-lomake]', { timeout: 5000 });
        expect(masterissa(p)).toBe(false); expect(await p.locator('[role="dialog"]').count()).toBe(1);
        const t = await p.locator('[data-ts-sheet^="keskustelu_"]').innerText();
        expect(t).toContain('Kauden tavoite: Kiihdytys'); expect(t).toContain('Jakso nyt: 1. kosketus · vk 3/6'); expect(t.toLowerCase()).toContain('edelliset jaksot'); expect(t).toContain('1. kosketus · 12.9. · parani'); expect(t).toContain('Kiihdytys · 10.7. · ennallaan'); expect(t).toContain('Sisäinen kirjaus');
        expect(await p.locator('[data-kes-ero]').count()).toBe(2);   // sisäinen motivaatio (5/3/3) ja keskittyminen (2/4)
        expect(await p.locator('[data-kes-alue]').count()).toBe(4); expect(await p.locator('[data-kes-alue="teknis_taktinen"]').getAttribute('data-kes-alue-tila')).toBe('cur'); expect(await p.locator('[data-kes-alue="fyysinen"]').getAttribute('data-kes-alue-tila')).toBe('fresh'); expect(await p.locator('[data-kes-alue="sosiaalinen"]').getAttribute('data-kes-alue-tila')).toBe('none');
        expect(t).not.toMatch(/katselmu|review|syvennä|IDP|MDT|Nelikulma/i); expect(await p.locator('[data-nk-kytkin]').count()).toBe(0);   // vain sisäinen: ei "Näytä myös pelaajalle" -kytkintä
        await kuva(p, 'sheet_1280_vaalea');
        expect(await p.locator('[data-kes-tallenna]').getAttribute('aria-disabled')).toBe('true');   // teksti puuttuu
        await p.locator('[data-kes-tallenna]').click({ force: true }); expect(await p.locator('#toast-wrap').innerText()).toContain('Kirjoita sovitut asiat');   // aria-disabled-nappi on silti painettavissa → selkeä ohje expect((await BATCH(p)).length).toBe(0);
        await p.locator('#kesSovitut').fill('Sovittiin ylimääräinen ensiaskelharjoitus tiistaisin. Seuraavaksi puhutaan vanhempien kanssa.'); await p.locator('[data-kes-kausi-valinta="pidetaan"]').click();
        await p.locator('[data-kes-tallenna]').click(); await p.waitForSelector('[data-ts-sheet^="keskustelu_"]', { state: 'detached', timeout: 5000 });
        const b = await BATCH(p); expect(b).toHaveLength(1); expect(b[0]).toHaveLength(3);   // sisainen/tiedot dual-write samassa batchissa (#1144–#1147)
        expect(await p.evaluate(() => (window.__kirj || []).length)).toBe(0);
        const rev = b[0].find((o) => /\/reviewit\/2026-10-19$/.test(o.path)), pel = b[0].find((o) => o.path === 'seurat/demo/pelaajat/p2'), st = b[0].find((o) => SISAINEN.test(o.path));
        expect(st.path).toBe('seurat/demo/pelaajat/p2/sisainen/tiedot'); expect(Object.keys(st.set).sort()).toEqual(['paivitetty', 'review_viimeisin_pvm', 'review_viimeisin_tyyppi', 'seuraId']); expect([...st.opts.mergeFields].sort()).toEqual(['paivitetty', 'review_viimeisin_pvm', 'review_viimeisin_tyyppi', 'seuraId']);
        expect(st.set).toMatchObject({ review_viimeisin_pvm: '2026-10-19', review_viimeisin_tyyppi: 'kehityskeskustelu' }); expect(JSON.stringify(pel.set)).not.toContain('Sovittiin');   // sovitut vain reviewit-dokkiin
        expect(rev.opts).toEqual({ merge: true });
        expect(Object.keys(rev.set).sort()).toEqual(['kk_kausitavoite', 'kk_tallennettu', 'kk_tekija_rooli', 'kk_tekija_uid', 'pvm', 'sovitut_sisainen', 'tyyppi']);   // eri kentät kuin jakson yhteenvedolla (lause_sisainen/kevyt) → merge ei ylikirjoita
        expect(rev.set).toMatchObject({ tyyppi: 'kehityskeskustelu', kk_tekija_uid: 'u1', kk_tekija_rooli: rooli, kk_kausitavoite: 'pidetaan', sovitut_sisainen: { teksti: 'Sovittiin ylimääräinen ensiaskelharjoitus tiistaisin. Seuraavaksi puhutaan vanhempien kanssa.', lahde: rooli === 'vp' ? 'vp' : 'valmentaja', uid: 'u1' } });
        expect(pel.set).toEqual({ review_viimeisin_pvm: '2026-10-19', review_viimeisin_tyyppi: 'kehityskeskustelu' }); expect(pel.opts).toEqual({ merge: true });
        expect(await p.locator('#toast-wrap').innerText()).toMatch(/Kehityskeskustelu kirjattu ✓/);
        expect(await p.locator('[data-kt-h-keskustelu]').count()).toBe(1);   // Historia heti, ei latausta
        const rivi = await p.locator('[data-kt-h-keskustelu]').innerText(); expect(rivi).toContain('Kehityskeskustelu 19.10.'); expect(rivi).toContain('Sovittiin ylimääräinen'); expect(rivi).toContain(rooli === 'vp' ? '” – VP' : '” – valmentaja'); expect(rivi.toLowerCase()).toContain('sisäinen');
        expect(masterissa(p)).toBe(false); expect(SUODATA(virheet)).toEqual([]); await p.locator('[data-kt-h-keskustelu]').scrollIntoViewIfNeeded(); await kuva(p, 'historia_1280_vaalea'); await sk.close();
      } finally { await selain.close(); }
    }, 90000);

    it('TAVOITE: ei tavoitetta → toimintaohje + "Aseta kauden tavoite" (avaa kausitavoite-sheetin, keskustelu ei tallennu); ehdotus → "odottaa hyväksyntää" + nappi tavoitteeseen', async () => {
      await avaa(); try {
        const a = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/polku', pelaajat: P('p2') }); await masterKorvaus(a.p); await avaaPolulta(a.p);
        await a.p.waitForSelector('[data-kes-ohje="ei"]', { timeout: 5000 }); expect(await a.p.locator('[data-kes-ohje="ei"]').innerText()).toBe('Kehityskeskustelun voi kirjata, kun pelaajalle on asetettu kauden tavoite.');
        expect(await a.p.locator('[data-kes-sovitut]').count()).toBe(0); expect(await a.p.locator('[data-kes-tallenna]').count()).toBe(0);
        await kuva(a.p, 'ei_tavoitetta_390_tumma');
        await a.p.locator('[data-kes-aseta]').click(); await a.p.waitForSelector('[data-kv-sheet]', { timeout: 5000 }); expect(await a.p.locator('[data-ts-sheet^="keskustelu_"]').count()).toBe(0); expect(masterissa(a.p)).toBe(false); expect((await BATCH(a.p)).length).toBe(0);
        await a.sk.close();
        const b = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/polku', pelaajat: P('p2'), dokit: { [KAUSI]: { tavoitteet: [EHDOTUS] } } }); await masterKorvaus(b.p); await avaaPolulta(b.p);
        await b.p.waitForSelector('[data-kes-ohje="ehdotus"]', { timeout: 5000 }); expect(await b.p.locator('[data-kes-ohje="ehdotus"]').innerText()).toContain('Kauden tavoite odottaa hyväksyntää'); expect(await b.p.locator('[data-kes-sovitut]').count()).toBe(0);
        await b.p.locator('[data-kes-aseta]').click(); await b.p.waitForSelector('[data-kv-sheet]', { timeout: 5000 }); await b.sk.close();
      } finally { await selain.close(); }
    }, 90000);

    it('LUONNOS: sulkeminen säilyttää tekstin (sheet) ja sivun uudelleenlataus palauttaa sen selaimen tallennuksesta; tallennus tyhjentää; Master-hyppyä ei tule', async () => {
      await avaa(); try {
        const { sk, p } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/polku', pelaajat: P('p2'), dokit: { [KAUSI]: { tavoitteet: [VOIMASSA] } }, leveys: 390, korkeus: 1500, teema: 'dark' }); await masterKorvaus(p);
        await avaaPolulta(p); await p.waitForSelector('[data-kes-sovitut]'); await p.locator('#kesSovitut').fill('Keskeneräinen teksti'); await p.locator('[data-kes-kausi-valinta="muutetaan"]').click();
        await kuva(p, 'sheet_390_tumma');
        expect(await p.locator('[data-ts-luonnos]').count()).toBe(1); await p.locator('[data-ts-sulje]').click(); await p.waitForSelector('[data-ts-sheet^="keskustelu_"]', { state: 'detached' });
        await p.locator('[data-kt-kirjaa-keskustelu]').click(); await p.waitForSelector('#kesSovitut'); expect(await p.locator('#kesSovitut').inputValue()).toBe('Keskeneräinen teksti');
        expect(await p.locator('[data-kes-kausi-valinta="muutetaan"]').getAttribute('aria-pressed')).toBe('true');
        const tallessa = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.indexOf('tm_kes_luonnos:') === 0).map((k) => JSON.parse(localStorage.getItem(k))));
        expect(tallessa).toHaveLength(1); expect(tallessa[0]).toMatchObject({ sovitut: 'Keskeneräinen teksti', kausi: 'muutetaan' });
        await p.reload({ waitUntil: 'load' }); await odota(p); await p.locator('[data-kt-kirjaa-keskustelu]').click(); await p.waitForSelector('#kesSovitut'); expect(await p.locator('#kesSovitut').inputValue()).toBe('Keskeneräinen teksti');   // uudelleenlataus: selaimen tallennus
        expect(await p.locator('[data-ts-luonnos]').count()).toBe(1);   // palautettu luonnos on luonnos (sulkeminen ei hävitä)
        await p.locator('[data-kes-tallenna]').click(); await p.waitForSelector('[data-ts-sheet^="keskustelu_"]', { state: 'detached' });
        expect(await p.evaluate(() => Object.keys(localStorage).filter((k) => k.indexOf('tm_kes_luonnos:') === 0).length)).toBe(0);   // tyhjennetty tallennuksen jälkeen
        const b = await BATCH(p); expect(b).toHaveLength(1); expect(b[0].find((o) => /reviewit/.test(o.path)).set.kk_kausitavoite).toBe('muutetaan');
        await p.waitForSelector('[data-kv-sheet]', { timeout: 5000 });   // "Tavoitetta muutetaan" → tallennuksen jälkeen kausitavoite-sheet
        expect(masterissa(p)).toBe(false); await sk.close();
      } finally { await selain.close(); }
    }, 90000);

    it('SISÄÄNTULOT: Jakson yhteenveto -ikkunan "Kehityskeskustelu" avaa oikean keskustelun (ei sulkulomaketta); Tänään-rytmikortin nappi näkyy ilman jaksoa ja avaa saman sheetin', async () => {
      await avaa(); try {
        const a = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/tanaan', pelaajat: P('p2'), dokit: { [KAUSI]: { tavoitteet: [VOIMASSA] } } }); await masterKorvaus(a.p); await a.p.waitForSelector('.kt-valikko', { timeout: 15000 });
        await a.p.locator('.kt-valikko > summary').first().click(); await a.p.locator('[data-kt-valikko="sulje"]').click(); await a.p.waitForSelector('[data-ts-sheet^="arviointi_"]', { timeout: 5000 });
        expect(await a.p.locator('[data-kvk-syvenna]').innerText()).toBe('Kehityskeskustelu'); await a.p.locator('[data-kvk-syvenna]').click();
        await a.p.waitForSelector('[data-ts-sheet^="keskustelu_"]', { timeout: 5000 }); expect(await a.p.locator('[data-ts-sheet^="arviointi_"]').count()).toBe(0); await a.p.waitForSelector('[data-kes-lomake]'); expect(masterissa(a.p)).toBe(false); await a.sk.close();
        if (rooli !== 'vp') return;   // Tänään-rytmikortti näkyy johdolle (tmSavyAmmatti: valmentaja ilman painetta) — valmentajalla sisääntulo on Polun otsikkonappi ja Jakson yhteenveto
        const b = await kaynnista(selain, { rooli, hash: '#pelaaja/p1/tanaan', pelaajat: P('p1', { review_viimeisin_pvm: '2026-08-20', review_viimeisin_tyyppi: 'jakso' }), dokit: { 'seurat/demo/pelaajat/p1/idp_kausi/2026': { tavoitteet: [VOIMASSA] }, 'seurat/demo/joukkueet/demo_u13': { nimi: 'Demo U13', ika: 'U13', valmentajaprofiili: 'ammatti' } } });   // myöhässä 18 pv; ei jaksoa → kortin nappi silti await masterKorvaus(b.p);
        const nappi = b.p.locator('button', { hasText: 'Kirjaa kehityskeskustelu' }); await nappi.first().waitFor({ timeout: 15000 }); await nappi.first().click();
        await b.p.waitForSelector('[data-ts-sheet^="keskustelu_"]', { timeout: 5000 }); expect(masterissa(b.p)).toBe(false); await kuva(b.p, 'tanaan_kortti_1280_tumma'); await b.sk.close();
      } finally { await selain.close(); }
    }, 90000);
  });
});
