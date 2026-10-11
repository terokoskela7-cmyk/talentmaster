/* K35-6d · selain (Playwright + Chrome; chrome-tests-job): Uusi tapahtuma → Joukkueen vapaa / Erikoisohjelma (koko päivä, loppupäivä, laji) ja joukkueen valmennuspalaveri (Kenelle). Masterin oikea sivu, mock-Firestore. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K35-6d · selain: joukkueen omat', () => {
  const avaa = async (selain, rooli) => { const sk = await selain.newContext({ viewport: { width: 1280, height: 1000 } }), p = await sk.newPage(); await p.goto('file://' + sivu(MASTER, JUURI, { rooli: rooli || 'vp', kutsu: '_avaaUusiTapahtuma("2026-10-22","17:00")' })); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 30000 }); expect(await p.evaluate(() => document.getElementById('probe-out').textContent)).toBe('ok'); await p.waitForSelector('#uusiTapahtumaModal'); return { sk, p }; };
  const valitse = async (p, avain) => { if (await p.locator('#tapahtumatyyppiMuut').count()) await p.locator('#tapahtumatyyppiMuut').click(); await p.locator('#tapahtumatyyppi_' + avain).click(); };
  const nakyy = (p, sel) => p.locator(sel).first().isVisible();
  const kirj = (p) => p.evaluate(() => window.__kirj.map((o) => ({ path: o.r.path, d: Object.assign({}, o.d, { alkaa: o.d.alkaa && o.d.alkaa.toDate ? o.d.alkaa.toDate().toISOString() : o.d.alkaa, paattyy: o.d.paattyy && o.d.paattyy.toDate ? o.d.paattyy.toDate().toISOString() : o.d.paattyy }) })));
  const kaynnista = async () => { const { chromium } = require('playwright-core'); return chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }); };

  it('Joukkueen vapaa (to–su): Muut tyypit -osiossa; kellonajat ja toistuvuus piilossa, Loppupäivä näkyy; tallentuu koko päivän, joukkue-id, ei lajia; Kenelle lukittu omaan joukkueeseen', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await avaa(selain); expect(await p.locator('#tapahtumatyyppi_joukkueen_vapaa').isVisible()).toBe(false);   // Muut tyypit ei vielä avattu
      await valitse(p, 'joukkueen_vapaa'); expect(await nakyy(p, '#tapahtumaLoppu')).toBe(true); expect(await nakyy(p, '#tapahtumaAlkaa')).toBe(false); expect(await p.locator('#tapahtumaLaji').isVisible()).toBe(false);
      expect(await p.locator('#uusiTapahtumaModal [data-kn-tapa] option').allTextContents()).toEqual(['Demo U13']);   // Kenelle: vain oma joukkue
      await p.locator('#tapahtumaLoppu').fill('2026-10-25'); await p.locator('#uusiTapahtumaModal .cal-modal-ala button').click(); await p.waitForFunction(() => window.__kirj.length === 1);
      const [k] = await kirj(p); expect(k.path).toBe('seurat/demo/kalenteri'); expect(k.d).toMatchObject({ tyyppi: 'joukkueen_vapaa', koko_paiva: true, joukkue: 'demo_u13', joukkue_nimi: 'Demo U13', joukkueet: ['demo_u13'], kohde: { tyyppi: 'joukkue' }, toistuvuus: null }); expect('laji' in k.d).toBe(false);
      expect(new Date(k.d.alkaa).getTime()).toBe(new Date('2026-10-22T00:00:00').getTime()); expect(new Date(k.d.paattyy).getTime()).toBe(new Date('2026-10-25T23:59:00').getTime()); await sk.close();
    } finally { await selain.close(); }
  }, 90000);
  it('Erikoisohjelma: Laji-valinta (5 lajia); tallentuu lajilla; loppu ennen alkua → ei tallenna', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await avaa(selain, 'valmentaja'); await valitse(p, 'erikoisohjelma'); expect(await p.locator('#tapahtumaLaji').isVisible()).toBe(true); expect(await p.locator('#tapahtumaLaji option').allTextContents()).toEqual(['Leiri', 'Turnaus', 'Kotiviikko', 'Kevennys', 'Muu']);
      await p.locator('#tapahtumaLoppu').fill('2026-10-20'); await p.locator('#uusiTapahtumaModal .cal-modal-ala button').click(); await p.waitForTimeout(400); expect((await kirj(p)).length).toBe(0);   // loppu < alku
      await p.locator('#tapahtumaLaji').selectOption('turnaus'); await p.locator('#tapahtumaLoppu').fill('2026-10-23'); await p.locator('#uusiTapahtumaModal .cal-modal-ala button').click(); await p.waitForFunction(() => window.__kirj.length === 1);
      const [k] = await kirj(p); expect(k.d).toMatchObject({ tyyppi: 'erikoisohjelma', laji: 'turnaus', nimi: 'Turnaus', koko_paiva: true, joukkue: 'demo_u13' }); await sk.close();
    } finally { await selain.close(); }
  }, 90000);
  it('tavallinen tyyppi (harjoitus): kellonajat näkyvät, Loppupäivä ja Laji piilossa; vaihto takaisin palauttaa kentät', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await avaa(selain); expect(await nakyy(p, '#tapahtumaAlkaa')).toBe(true); expect(await p.locator('#tapahtumaLoppu').isVisible()).toBe(false); await valitse(p, 'joukkueen_vapaa'); expect(await nakyy(p, '#tapahtumaAlkaa')).toBe(false);
      await p.locator('#tapahtumatyyppi_harjoitus').click(); expect(await nakyy(p, '#tapahtumaAlkaa')).toBe(true); expect(await p.locator('#tapahtumaLoppu').isVisible()).toBe(false); await sk.close();
    } finally { await selain.close(); }
  }, 90000);
  it('Joukkueen valmennuspalaveri: Kenelle-valinnassa "Joukkueen valmennus (Demo U13)" palaverille, ei harjoitukselle; tallennus kohde henkilokunta + joukkue, nakyvyys henkilokunta', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await avaa(selain); expect(await p.locator('#uusiTapahtumaModal [data-kn-tapa] option[value="joukkue_hk"]').count()).toBe(0);   // harjoitus: ei
      await p.locator('#tapahtumatyyppi_valmentajapalaveri').click(); expect(await p.locator('#uusiTapahtumaModal [data-kn-tapa] option[value="joukkue_hk"]').textContent()).toBe('Joukkueen valmennus (Demo U13)');
      await p.locator('#uusiTapahtumaModal [data-kn-tapa]').selectOption('joukkue_hk'); await p.locator('#uusiTapahtumaModal .cal-modal-ala button').click(); await p.waitForFunction(() => window.__kirj.length === 1);
      const [k] = await kirj(p); expect(k.d).toMatchObject({ tyyppi: 'valmentajapalaveri', nakyvyys: 'henkilokunta', joukkue: 'demo_u13', kohde: { tyyppi: 'henkilokunta', joukkue: 'demo_u13' }, pelaajat_id: [] }); await sk.close();
    } finally { await selain.close(); }
  }, 90000);
});
