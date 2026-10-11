/* K35-6e · selain (Playwright + Chrome; chrome-tests-job): läsnäolokooste ja -muistutus viikkonäkymässä, läsnäolon esivalinta (ei automaattista tallennusta), modaalien tekstikentät ≥ 72 px (390 ja 1280). */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu, FIXTURE } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const ms = (pvm, h) => Date.parse(pvm + 'T' + h + ':00+03:00');
const harj = (id, pvm, o) => Object.assign({ id, tyyppi: 'harjoitus', nimi: '', pvm, alkaa: '17:30', paattyy: '19:00', _alkaaMs: ms(pvm, '17:30'), _paattyyMs: ms(pvm, '19:00'), joukkue: 'Demo U13', joukkue_nimi: 'Demo U13', paikka: '', tila: 'suunniteltu', poistettu: false, lahde: 'manuaalinen' }, o || {});
const PELAAJAT = FIXTURE.pelaajat.map((p) => ({ id: p.id, data: { etunimi: p.etunimi, sukunimi: p.sukunimi, joukkue: 'Demo U13' } }));
const KOK = (extra) => Object.assign({ 'seurat/demo/pelaajat': PELAAJAT }, extra || {});

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K35-6e · selain', () => {
  const kaynnista = async () => { const { chromium } = require('playwright-core'); return chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }); };
  const avaa = async (selain, opts, koko) => { const sk = await selain.newContext({ viewport: koko || { width: 1280, height: 1000 } }), p = await sk.newPage(); await p.goto('file://' + sivu(MASTER, JUURI, opts)); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 30000 }); expect(await p.evaluate(() => document.getElementById('probe-out').textContent)).toBe('ok'); return { sk, p }; };
  const VIIKKO = { viikko: -1 };   // 12.–18.10. (nyt = ma 19.10. 09:00)

  it('kortti: merkitty harjoitus näyttää "✓ 12/16", merkitsemätön päättynyt "Merkitse läsnäolot" (henkilökunnalle); tuleva ja peruttu ei mitään', async () => {
    const selain = await kaynnista();
    try {
      const tap = [harj('h1', '2026-10-13', { lasnaolo_kooste: { paikalla: 12, myohassa: 2, poissa: 2, merkitsematta: 0 } }), harj('h2', '2026-10-15'), harj('h3', '2026-10-16', { tila: 'peruttu' }), harj('h4', '2026-10-17', { _alkaaMs: ms('2026-10-25', '17:30'), _paattyyMs: ms('2026-10-25', '19:00') })];
      const { sk, p } = await avaa(selain, Object.assign({ tapahtumat: tap, kokoelmat: KOK() }, VIIKKO));
      const teksti = (id) => p.locator('.kv-kortti[onclick*="' + id + '"]').innerText();
      expect(await teksti('h1')).toContain('✓ 12/16'); expect(await teksti('h1')).not.toContain('Merkitse läsnäolot'); expect(await teksti('h2')).toContain('Merkitse läsnäolot'); expect(await teksti('h3')).not.toContain('Merkitse läsnäolot'); expect(await p.locator('.kv-muistutus').count()).toBe(1);
      expect(await p.locator('.kv-muistutus button, .kv-muistutus').evaluate((e) => getComputedStyle(e).color !== getComputedStyle(document.querySelector('.kv-nimi')).color)).toBe(true);   // hiljaisempi sävy kuin otsikko (ink3/ink2, ei amber)
      await sk.close();
    } finally { await selain.close(); }
  }, 90000);
  it('läsnäolonäkymä: merkitsemätön avautuu kaikki paikalla esivalittuna ("✓ 4/4 paikalla"), mitään ei tallennu ennen kuittausta; poikkeus → Tallenna → vain silloin kirjoitukset ja kooste kortissa', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await avaa(selain, Object.assign({ tapahtumat: [harj('h2', '2026-10-15')], kokoelmat: KOK() }, VIIKKO));
      await p.locator('.kv-kortti[onclick*="h2"]').click(); await p.waitForFunction(() => (document.querySelector('.la-sum') || {}).textContent);
      expect(await p.locator('.la-sum').innerText()).toBe('✓ 4/4 paikalla'); expect(await p.locator('.la-btn[data-tila="paikalla"]').evaluateAll((bs) => bs.map((b) => b.style.fontWeight))).toEqual(['600', '600', '600', '600']); expect(await p.evaluate(() => window.__kirj.length)).toBe(0);
      await p.waitForTimeout(500); expect(await p.evaluate(() => window.__kirj.length)).toBe(0);   // ei automaattista tallennusta
      await p.locator('.la-btn[data-pid="p2"][data-tila="poissa"]').click(); expect(await p.locator('.la-sum').innerText()).toBe('✓ 3/4 paikalla · 1 poissa');
      await p.getByText('Tallenna läsnäolo').click(); await p.waitForFunction(() => window.__kirj.length === 5);
      const k = await p.evaluate(() => window.__kirj.map((o) => [o.r.path, o.d.tila || null, o.d.lasnaolo_kooste || null]));
      expect(k.filter((x) => /lasnaolijat\/p\d$/.test(x[0])).map((x) => x[1])).toEqual(['paikalla', 'poissa', 'paikalla', 'paikalla']); expect(k.find((x) => x[2])[2]).toEqual({ paikalla: 3, myohassa: 0, poissa: 1, merkitsematta: 0 });
      await p.locator('#calDetailModal').getByText('Sulje', { exact: true }).click(); expect(await p.locator('.kv-kortti[onclick*="h2"]').innerText()).toContain('✓ 3/4'); await sk.close();
    } finally { await selain.close(); }
  }, 90000);
  it('jo merkittyä läsnäoloa ei muuteta: esivalintaa ei tehdä, merkityt säilyvät ja merkitsemättömät jäävät tyhjiksi', async () => {
    const selain = await kaynnista();
    try {
      const las = [{ id: 'p1', data: { tila: 'paikalla' } }, { id: 'p2', data: { tila: 'poissa', syy: 'sairas' } }];
      const { sk, p } = await avaa(selain, Object.assign({ tapahtumat: [harj('h1', '2026-10-13')], kokoelmat: KOK({ 'seurat/demo/kalenteri/h1/lasnaolijat': las }) }, VIIKKO));
      await p.locator('.kv-kortti[onclick*="h1"]').click(); await p.waitForFunction(() => (document.querySelector('.la-sum') || {}).textContent); expect(await p.locator('.la-sum').innerText()).toBe('✓ 1/4 paikalla · 1 poissa'); expect(await p.locator('.la-btn[data-pid="p3"]').evaluateAll((bs) => bs.map((b) => b.style.fontWeight))).toEqual(['400', '400', '400']);
      expect(await p.getByText('Esivalittu: kaikki paikalla').count()).toBe(0); expect(await p.evaluate(() => window.__kirj.length)).toBe(0); await sk.close();
    } finally { await selain.close(); }
  }, 90000);
  for (const koko of [{ width: 390, height: 700 }, { width: 1280, height: 720 }]) it('tekstikentät ≥ 72 px molemmissa modaaleissa (' + koko.width + ' px): viesti pelaajille / vanhemmille ja muistiinpanot', async () => {
    const selain = await kaynnista();
    try {
      let { sk, p } = await avaa(selain, { rooli: 'vp', kutsu: '_avaaUusiTapahtuma("2026-10-22","17:00")' }, koko); await p.waitForSelector('#uusiTapahtumaModal textarea'); const a = await p.locator('#uusiTapahtumaModal textarea').boundingBox(); expect(a.height).toBeGreaterThanOrEqual(72);
      expect(await p.locator('#uusiTapahtumaModal .cal-modal-runko textarea').evaluate((e) => e.getBoundingClientRect().height >= 72 && getComputedStyle(e).minHeight === '72px')).toBe(true); await sk.close();
      ({ sk, p } = await avaa(selain, { rooli: 'vp', kutsu: '_calMuokkaaTapahtuma({id:"e1",tyyppi:"harjoitus",nimi:"Harjoitus",pvm:"2026-10-14",alkaa:"17:00",paattyy:"18:30",paikka:"Kenttä 2",lahde:"manuaalinen",luoja_uid:"u1"})' }, koko)); await p.waitForSelector('#calEditModal textarea'); const b = await p.locator('#calEditModal textarea').boundingBox(); expect(b.height).toBeGreaterThanOrEqual(72); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
