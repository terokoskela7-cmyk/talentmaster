/**
 * K1d · ⓘ-selitteet ja "Miten kehitys etenee" (lib/tm_sanasto_info.js) — selain (Playwright + Chrome), ei ulkoverkkoa.
 * ⓘ avautuu ja sulkeutuu (uusi napautus, Esc, napautus ulkopuolelle, toisen avaus), sisältö fi + sv (testikäännös), näppäimistöllä käytettävä, kosketusalue ≥ 44 px, 390 px: selite mahtuu ruutuun.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { selainKaynnista, CHROME, JUURI } from './helpers/kt_sivu.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url), SI = require('../lib/tm_sanasto_info.js');
const LIB = join(JUURI, 'lib', 'tm_sanasto_info.js');
const CSS = ':root{--teal:#28B090;--ink:#F2EFE6;--ink2:#C9C7BE;--ink3:#8C8B86;--bg:#111110;--card:#161614;--border:#2a2a28;--font-sans:DM Sans,sans-serif;--fs-body:14px;--fs-meta:12.5px;--fs-h2:26px}body{background:var(--bg);color:var(--ink);font-family:var(--font-sans);margin:0;padding:16px 16px 40px}';
const sivu = async (selain, leveys, t) => {
  const sk = await selain.newContext({ viewport: { width: leveys, height: 800 } }), p = await sk.newPage(), virheet = [];
  p.on('pageerror', (e) => virheet.push(e.message));
  await p.setContent('<!doctype html><html><head><meta charset="utf-8"><style>' + CSS + '</style></head><body><div id="r"></div></body></html>');
  await p.addScriptTag({ path: LIB });
  await p.evaluate((tt) => {
    const opts = tt ? { t: (k) => 'SV:' + k } : {};
    document.getElementById('r').innerHTML = ['kehityssuunnitelma', 'jakson_yhteenveto', 'kehityskeskustelu', 'pelaajaraportti', 'tilannekuva'].map((a) => '<p style="text-align:right"><span>' + a + '</span>' + TM_SANASTO_INFO.tmSanastoInfoHTML(a, opts) + '</p>').join('');
  }, !!t);
  return { sk, p, virheet };
};
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K1d · ⓘ-selitteet (selain)', () => {
  it('jokaiselle viidelle termille: napin aria-label, ≥ 44 px kosketusalue, aria-expanded, avautuu paikallaan (ei sivun vaihtoa) ja sulkeutuu (uusi napautus)', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p, virheet } = await sivu(selain, 1280, false), url = p.url();
      const nimet = { kehityssuunnitelma: 'Kehityssuunnitelma', jakson_yhteenveto: 'Jakson yhteenveto', kehityskeskustelu: 'Kehityskeskustelu', pelaajaraportti: 'Pelaajaraportti', tilannekuva: 'Seuran tilannekuva' };
      for (const a of Object.keys(nimet)) {
        const nappi = p.locator('[data-si="' + a + '"] [data-si-nappi]'), laatikko = await nappi.boundingBox();
        expect(laatikko.width, a).toBeGreaterThanOrEqual(44); expect(laatikko.height, a).toBeGreaterThanOrEqual(44);
        expect(await nappi.getAttribute('aria-label'), a).toBe('Mikä on ' + nimet[a] + '?'); expect(await nappi.getAttribute('aria-expanded')).toBe('false');
        await nappi.click(); expect(await nappi.getAttribute('aria-expanded')).toBe('true'); const teksti = p.locator('[data-si="' + a + '"] [data-si-teksti]');
        expect(await teksti.isVisible()).toBe(true); expect((await teksti.innerText()).trim()).toBe(SI.FI['si_' + a]); expect(await p.locator('[data-si="' + a + '"] [data-si-lue-lisaa]').isVisible()).toBe(true);
        await nappi.click(); expect(await nappi.getAttribute('aria-expanded')).toBe('false'); expect(await teksti.isVisible()).toBe(false);
      }
      expect(p.url()).toBe(url); expect(virheet).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('sulkeutuu Esc:llä (fokus takaisin nappiin), napautuksella ulkopuolelle ja toisen selitteen avaus sulkee edellisen; näppäimistöllä (Tab + Enter)', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p } = await sivu(selain, 1280, false), nappi = (a) => p.locator('[data-si="' + a + '"] [data-si-nappi]'), auki = () => p.locator('.si-p:not([hidden])').count();
      await nappi('jakson_yhteenveto').click(); expect(await auki()).toBe(1); await p.keyboard.press('Escape'); expect(await auki()).toBe(0); expect(await p.evaluate(() => document.activeElement.getAttribute('aria-label'))).toBe('Mikä on Jakson yhteenveto?');
      await nappi('kehityskeskustelu').click(); expect(await auki()).toBe(1); await p.mouse.click(20, 780); expect(await auki()).toBe(0);
      await nappi('kehityskeskustelu').click(); await nappi('pelaajaraportti').dispatchEvent('click'); expect(await auki()).toBe(1);   /* avoin selite peittää seuraavan napin: ohjelmallinen napautus */ expect(await nappi('kehityskeskustelu').getAttribute('aria-expanded')).toBe('false'); await p.keyboard.press('Escape');
      await nappi('kehityssuunnitelma').focus(); await p.keyboard.press('Enter'); expect(await auki()).toBe(1); await p.keyboard.press('Escape'); expect(await auki()).toBe(0);
      await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('"Lue lisää" avaa "Miten kehitys etenee" -ruudun (dialog, kaavio, rytmi 42/84 pv), sulkeutuu Esc:llä, ×:llä ja taustan napautuksella; selite sulkeutuu avatessa', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p } = await sivu(selain, 390, false), url = p.url();
      await p.locator('[data-si="kehityssuunnitelma"] [data-si-nappi]').click(); await p.locator('[data-si="kehityssuunnitelma"] [data-si-lue-lisaa]').click();
      const dlg = p.locator('#tmKeModal[role="dialog"]'); expect(await dlg.count()).toBe(1); expect(await p.locator('.si-p:not([hidden])').count()).toBe(0); expect(await dlg.getAttribute('aria-modal')).toBe('true');
      expect(await p.locator('#tmKeOts').innerText()).toBe('Miten kehitys etenee'); expect(await p.locator('#tmKeModal svg[role="img"]').count()).toBe(1);
      const t = await dlg.innerText(); for (const s of ['Kehityssuunnitelma', 'Jakso · 6 vk', 'Jakson yhteenveto', 'Seuraava jakso', 'Kehityskeskustelu', 'Pelaajaraportti', '42 päivän välein', '84 päivän välein']) expect(t, s).toContain(s);
      const laatikko = await p.locator('#tmKeModal .si-box').boundingBox(); expect(laatikko.x).toBeGreaterThanOrEqual(0); expect(laatikko.x + laatikko.width).toBeLessThanOrEqual(390);
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= 390)).toBe(true);   // ei vaakavieritystä 390 px:ssä
      await p.keyboard.press('Escape'); expect(await p.locator('#tmKeModal').count()).toBe(0);
      await p.locator('[data-si="tilannekuva"] [data-si-nappi]').click(); await p.locator('[data-si="tilannekuva"] [data-si-lue-lisaa]').click(); expect(await p.locator('#tmKeModal').count()).toBe(1); await p.locator('[data-si-sulje]').click(); expect(await p.locator('#tmKeModal').count()).toBe(0);
      await p.locator('[data-si="tilannekuva"] [data-si-nappi]').click(); await p.locator('[data-si="tilannekuva"] [data-si-lue-lisaa]').click(); await p.mouse.click(4, 4); expect(await p.locator('#tmKeModal').count()).toBe(0);
      expect(p.url()).toBe(url); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('sv: sisältö tulee adapterin t():stä (sv-testikäännös) — napit, selite, "Lue lisää" ja "Miten kehitys etenee" -ruutu; 390 px: selite mahtuu ruutuun (oikea reuna kaikilla viidellä)', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p } = await sivu(selain, 390, true);
      for (const a of ['kehityssuunnitelma', 'jakson_yhteenveto', 'kehityskeskustelu', 'pelaajaraportti', 'tilannekuva']) {
        const nappi = p.locator('[data-si="' + a + '"] [data-si-nappi]'); expect(await nappi.getAttribute('aria-label')).toBe('SV:si_aria'); await nappi.click();
        expect((await p.locator('[data-si="' + a + '"] [data-si-teksti]').innerText()).trim()).toBe('SV:si_' + a); expect((await p.locator('[data-si="' + a + '"] [data-si-lue-lisaa]').innerText()).trim()).toBe('SV:si_lue_lisaa');
        const r = await p.locator('[data-si="' + a + '"] .si-p').boundingBox(); expect(r.x, a).toBeGreaterThanOrEqual(0); expect(r.x + r.width, a).toBeLessThanOrEqual(390); await nappi.click();
      }
      await p.locator('[data-si="kehityskeskustelu"] [data-si-nappi]').click(); await p.locator('[data-si="kehityskeskustelu"] [data-si-lue-lisaa]').click(); expect(await p.locator('#tmKeOts').innerText()).toBe('SV:ke_otsikko');
      await sk.close();
    } finally { await selain.close(); }
  }, 60000);
});
describe('K1d · ⓘ-komponentti (puhdas)', () => {
  it('tmSanastoInfoHTML: tuntematon termi → tyhjä; HTML-escape; id parametrina deterministinen; jokaisella termillä määritelmä briefin sanamuodolla', () => {
    expect(SI.tmSanastoInfoHTML('tuntematon')).toBe(''); expect(SI.TERMIT).toHaveLength(5);
    expect(SI.FI.si_jakson_yhteenveto).toBe('Jakson lopussa: vastaat kolmeen kysymykseen, kirjoitat lauseen ja valitset seuraavan jakson. Kirjataan aina, ja se nollaa yhteenvetorytmin.');
    expect(SI.FI.si_kehityskeskustelu).toBe('Laajempi keskustelu pelaajan ja tarvittaessa huoltajan kanssa, yleensä VP:n kanssa.'); expect(SI.FI.si_pelaajaraportti).toBe('Dokumentti, jonka voit näyttää tai antaa pelaajalle ja perheelle.');
    expect(SI.FI.si_tilannekuva).toBe('VP:n kooste siitä, onko yhteenvedot ja keskustelut ajan tasalla joukkueittain.');
    const h = SI.tmSanastoInfoHTML('pelaajaraportti', { id: 'x1', t: (k) => (k === 'si_pelaajaraportti' ? '<b>"x"</b>' : k) }); expect(h).toContain('id="x1"'); expect(h).toContain('aria-controls="x1"'); expect(h).toContain('&lt;b&gt;&quot;x&quot;&lt;/b&gt;'); expect(h).toContain('hidden');
  });
  it('"Miten kehitys etenee" sisältää kaavion kaikki vaiheet ja rytmin; ei lukuja pelaajalle (komponentti on henkilökunnan; pelaaja-/perhe-appit eivät lataa sitä)', () => {
    const h = SI.tmKehitysEteneeHTML({}); for (const s of ['Kehityssuunnitelma', 'kauden tavoite', 'Jakso · 6 vk', 'aihe · ydinasiat · viikon fokus', 'Jakson yhteenveto', 'Seuraava jakso', 'Kehityskeskustelu', 'Pelaajaraportti']) expect(h, s).toContain(s);
    const fs = require('fs'); for (const f of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html']) expect(fs.readFileSync(join(JUURI, f), 'utf8'), f).not.toContain('tm_sanasto_info');
    for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Kehitystyopoyta.html']) expect(fs.readFileSync(join(JUURI, f), 'utf8'), f).toMatch(/lib\/tm_sanasto_info\.js\?v=\d+/);
  });
});
