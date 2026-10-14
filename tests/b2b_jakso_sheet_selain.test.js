/* B2b · selain (Playwright + Chrome): Aloita / Vahvista / Muokkaa jakso SHEETINÄ uudella sivulla, D248-sanasto, toastin a11y.
   Firebase stubattu (tests/helpers/kt_sivu.mjs). TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/b2b-jakso-sheet/ (1280 + 390, tumma). Vain keksityt nimet (Demo FC). */
import { describe, it, expect } from 'vitest';
import { mkdirSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { kaynnista, selainKaynnista, CHROME, JUURI } from './helpers/kt_sivu.mjs';
const require = createRequire(import.meta.url);
const SN = require('../lib/tm_sanasto.js');
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'b2b-jakso-sheet');
const odota = (p) => p.waitForSelector('.kt-nimi', { timeout: 15000 });
const aloita = (p) => p.getByRole('button', { name: 'Aloita jakso' }).first();
const teksti = (p) => p.evaluate(() => document.body.innerText);
const KIELLETYT = (t) => SN.tmSanastoKielletyt(t);

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('B2b · jakso sheetinä', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };
  it('Aloita jakso avautuu PITKÄNÄ sheetinä (ei vanhaa modaalia); validointivirhe → toast, sheet auki, ei kirjoitusta; onnistunut tallennus = YKSI update, sheet kiinni, Tänään näyttää D248-nimen', async () => {
    await avaa(); try {
      const { p, virheet } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p1/tanaan' }); await odota(p);
      await aloita(p).click(); await p.waitForSelector('#_ajTaito');
      expect(await p.locator('[role="dialog"]').count()).toBe(1);   // yksi dialogi = sheet (D100: yksi sheet kerrallaan)
      expect(await p.locator('[data-ts-tausta].ts-pitka').count()).toBe(1); expect(await p.locator('#_mAloitaJaksoModal').count()).toBe(0);   // pitkä sheet, ei vanhaa modaalia
      const nimet = await p.locator('#_ajTaito option').allInnerTexts();
      expect(nimet).toContain('Katse ja havainnointi'); expect(nimet).toContain('1. kosketus'); expect(nimet).toContain('Syöttäminen'); expect(nimet).toContain('Alueen puolustaminen');   // D248 Y-H0…Y-P4
      expect(await p.locator('[data-aj-tallenna]').innerText()).toMatch(/Aloita jakso/);
      expect(KIELLETYT(await teksti(p))).toEqual([]);   // konsepti/cue/katselmus/signaali/sitoumus ei näy
      await p.locator('#_ajYv').fill('');   // pakollinen kenttä tyhjä
      await p.locator('[data-aj-tallenna]').click(); await p.waitForTimeout(500);
      expect(await p.evaluate(() => window.__kirj)).toEqual([]); expect(await p.locator('#_ajTaito').count()).toBe(1);
      expect(await p.locator('#toast-wrap').innerText()).toMatch(/Jaksoa ei voi aloittaa/);
      await p.locator('#_ajYv').fill('Hyvä 1. kosketus'); await p.locator('#_ajTaito').selectOption('y_h1');
      await p.locator('[data-aj-tallenna]').click(); await p.waitForFunction(() => window.__kirj.length === 1, null, { timeout: 8000 });
      const k = await p.evaluate(() => window.__kirj); expect(k).toHaveLength(1); expect(k[0].path).toBe('seurat/demo/pelaajat/p1');
      expect(Object.keys(k[0].update).sort()).toEqual(['jaksofokus', 'ydinvahvuus']);
      expect(k[0].update.jaksofokus).toMatchObject({ konsepti_avain: 'y_h1', lahde: 'valmentaja', kesto_vk: 6 }); expect(k[0].update.ydinvahvuus.kuvaus).toBe('Hyvä 1. kosketus');
      await p.waitForSelector('#_ajTaito', { state: 'detached', timeout: 5000 });   // sheet sulkeutui
      expect(await p.locator('#toast-wrap').innerText()).toMatch(/Jakso aloitettu/);
      expect(await p.locator('.kt-sig, .kt-tanaan, #ktJuuri').first().innerText()).toMatch(/1\. kosketus/);   // D248-nimi myös Tänään-välilehdellä
      expect(virheet.filter((v) => !/integrity/.test(v))).toEqual([]);
    } finally { await selain.close(); }
  }, 90000);
  it('D100: sheetin sulkeminen säilyttää luonnoksen (ei kirjoitusta); avaus uudelleen palauttaa kirjoitetun; Hylkää/Tallenna tyhjentää', async () => {
    await avaa(); try {
      const { p } = await kaynnista(selain, { rooli: 'vp', hash: '#pelaaja/p1/tanaan' }); await odota(p);
      await aloita(p).click(); await p.waitForSelector('#_ajYv'); await p.locator('#_ajYv').fill('Keskeneräinen ajatus');
      await p.getByRole('button', { name: /Sulje/ }).first().click(); await p.waitForTimeout(400);
      expect(await p.locator('#_ajYv').count()).toBe(0); expect(await p.evaluate(() => window.__kirj)).toEqual([]);
      await aloita(p).click(); await p.waitForSelector('#_ajYv'); expect(await p.locator('#_ajYv').inputValue()).toBe('Keskeneräinen ajatus');
    } finally { await selain.close(); }
  }, 60000);
  it('Muokkaa / Vahvista: pelaajalla jolla on jakso, sheet esitäytetty ja otsikko oikea; vain kirjoitusoikeudellinen saa sheetin', async () => {
    await avaa(); try {
      const { p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan' }); await odota(p);
      await p.locator('.kt-valikko > summary').click(); await p.locator('[data-kt-valikko="muokkaa"]').click();   // ⋯-valikko → Muokkaa jaksoa
      await p.waitForSelector('#_ajTaito'); expect(await p.locator('#_ajTaito').inputValue()).toBe('y_h1');
      expect(await p.locator('[id^="tsOtsikko_"]').first().innerText()).toMatch(/Muokkaa jaksoa · Bertta Bergh/);
      expect(await p.locator('[data-aj-tallenna]').innerText()).toMatch(/Tallenna jakso/);
      expect(KIELLETYT(await teksti(p))).toEqual([]);
    } finally { await selain.close(); }
  }, 60000);
  it('D248 · uuden sivun fi-tekstit eivät sisällä sanoja konsepti / cue / katselmus / signaali / sitoumus (Tänään, Polku, Mittaukset, sheet) ja uudet sanat ovat käytössä', async () => {
    await avaa(); try {
      for (const hash of ['#pelaaja/p2/tanaan', '#pelaaja/p2/polku', '#pelaaja/p2/naytto', '#pelaaja/p1/tanaan']) {
        const { p } = await kaynnista(selain, { rooli: 'valmentaja', hash }); await odota(p); await p.waitForTimeout(300);
        const t = await teksti(p); expect(KIELLETYT(t), hash).toEqual([]);
        expect(t, hash).toMatch(/Ydinasiat|Mitä harjoitellaan|Jakson arviointi|Pelaajan lupaus|Mittaukset/);
      }
    } finally { await selain.close(); }
  }, 120000);
  it('Toast: aria-live="polite"; ajastin (5 s) pysähtyy kun hiiri on toastin päällä ja kun Kumoa-nappi on fokusoitu; jatkuu poistuttaessa', async () => {
    await avaa(); try {
      let { p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan' }); await odota(p);
      expect(await p.locator('#toast-wrap').getAttribute('aria-live')).toBe('polite');
      await p.locator('.kt-sig [data-kt-havainto-arvo="2"]').click(); await p.waitForSelector('.toast-item [data-kt-kumoa]');
      await p.locator('.toast-item').hover(); await p.waitForTimeout(5800);
      expect(await p.locator('.toast-item').count()).toBe(1);   // hiiri päällä → ei sulkeudu
      await p.mouse.move(5, 5); await p.waitForTimeout(3000); expect(await p.locator('.toast-item').count()).toBe(1);   // täysi 5 s alkaa alusta
      await p.waitForSelector('.toast-item', { state: 'detached', timeout: 4000 });
      // fokus Kumoa-napissa (uusi lataus: signaali poistui ensimmäisen havainnon jälkeen)
      const { p: q } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan' }); await odota(q);
      await q.locator('.kt-sig [data-kt-havainto-arvo="3"]').click(); await q.waitForSelector('.toast-item [data-kt-kumoa]'); await q.locator('[data-kt-kumoa]').focus(); await q.waitForTimeout(5800);
      p = q;
      expect(await p.locator('.toast-item').count()).toBe(1);   // fokus Kumoassa → ei sulkeudu
      await p.evaluate(() => document.activeElement.blur()); await p.waitForSelector('.toast-item', { state: 'detached', timeout: 7000 });
    } finally { await selain.close(); }
  }, 90000);
  it('TM_KUVAT=1 · kuvat 1280 + 390 (tumma): Aloita jakso -sheet', async () => {
    if (!process.env.TM_KUVAT) return;
    mkdirSync(KUVAT, { recursive: true }); await avaa(); try {
      for (const [nimi, leveys, korkeus] of [['1280', 1280, 900], ['390', 390, 844]]) {
        const { p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p1/tanaan', leveys, korkeus, teema: 'dark' }); await odota(p);
        await p.screenshot({ path: join(KUVAT, 'tanaan-' + nimi + '.png') });
        await aloita(p).click(); await p.waitForSelector('#_ajTaito'); await p.waitForTimeout(400);
        await p.screenshot({ path: join(KUVAT, 'aloita-jakso-sheet-' + nimi + '.png') });
        await p.locator('#_ajTaito').selectOption('y_h1'); await p.locator('#_ajYv').fill('Hyvä 1. kosketus'); await p.locator('[data-aj-tallenna]').click(); await p.waitForSelector('#_ajTaito', { state: 'detached' }); await p.waitForTimeout(400);
        await p.screenshot({ path: join(KUVAT, 'jakso-aloitettu-' + nimi + '.png') });
      }
      const { p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', leveys: 1280, korkeus: 900, teema: 'dark' }); await odota(p);
      await p.locator('.kt-sig [data-kt-havainto-arvo="2"]').click(); await p.waitForSelector('.toast-item'); await p.screenshot({ path: join(KUVAT, 'toast-kumoa-1280.png') });
      expect(readdirSync(KUVAT).length).toBeGreaterThan(5);
    } finally { await selain.close(); }
  }, 120000);
});

describe('B2b · pelaajalle ei näytetä viikkohavainnon lausetta (ennen B3/B4-pelaajanäkymää)', () => {
  it('osa_havainnot-kenttään viitataan vain henkilökunnan koodissa; pelaajan/vanhemman appit, niiden libit ja Cloud Functions eivät lue sitä', () => {
    const luku = (f) => readFileSync(join(JUURI, f), 'utf8');
    const kaikki = [...readdirSync(JUURI).filter((f) => /\.html$/.test(f)), ...readdirSync(join(JUURI, 'lib')).filter((f) => /\.js$/.test(f)).map((f) => 'lib/' + f)];
    const viittaa = kaikki.filter((f) => /osa_havainnot/.test(luku(f))).sort();
    expect(viittaa).toEqual(['lib/tm_jaksokooste.js', 'lib/tm_kehityssilmukka.js', 'lib/tm_kehitystyopoyta.js', 'lib/tm_kt_havainto.js', 'lib/tm_seuraava_askel.js']);   // B2c: + viikkohistoria (osa_havainnot_vk) jaksohistoriassa   // uusi viittaaja pakottaa katsomaan, ettei lause päädy pelaajalle
    const pelaajaLibit = ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html'].map((f) => luku(f)).join('\n');
    for (const f of viittaa) expect(pelaajaLibit.indexOf(f.replace('lib/', 'lib/') + '?'), f + ' ladataan pelaajan/vanhemman appissa').toBe(-1);
    const fn = readdirSync(join(JUURI, 'functions')).filter((f) => /\.js$/.test(f)).map((f) => luku('functions/' + f)).join('\n'); expect(fn).not.toMatch(/osa_havainnot/);
  });
});
