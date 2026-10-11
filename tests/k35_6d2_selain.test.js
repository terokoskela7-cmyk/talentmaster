/* K35-6d (aamutreenit) · selain (Playwright + Chrome; chrome-tests-job): Aamutreeni-pikavalinta → esiasetus, poimitut pelaajat, viikoittaiset sarjat; kortti; läsnäolon roster = poimitut. */
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
const PELAAJAT = FIXTURE.pelaajat.map((p) => ({ id: p.id, data: { etunimi: p.etunimi, sukunimi: p.sukunimi, joukkue: 'Demo U13' } }));

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K35-6d · aamutreeni selain', () => {
  const kaynnista = async () => { const { chromium } = require('playwright-core'); return chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }); };
  const avaa = async (selain, opts, koko) => { const sk = await selain.newContext({ viewport: koko || { width: 1280, height: 1100 } }), p = await sk.newPage(); await p.goto('file://' + sivu(MASTER, JUURI, opts)); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 30000 }); expect(await p.evaluate(() => document.getElementById('probe-out').textContent)).toBe('ok'); return { sk, p }; };
  const tallenna = (p) => p.locator('#uusiTapahtumaModal .cal-modal-ala button').click();
  const kirj = (p) => p.evaluate(() => window.__kirj.map((o) => Object.assign({}, o.d, { alkaa: o.d.alkaa && o.d.alkaa.toDate ? o.d.alkaa.toDate().getHours() + ':' + String(o.d.alkaa.toDate().getMinutes()).padStart(2, '0') + ' ' + o.d.alkaa.toDate().getDate() + '.' + (o.d.alkaa.toDate().getMonth() + 1) : null, paattyy: o.d.paattyy && o.d.paattyy.toDate ? o.d.paattyy.toDate().getHours() + ':' + String(o.d.paattyy.toDate().getMinutes()).padStart(2, '0') : null })));

  it('pikavalinta: harjoitus 07:00–08:30, Viikoittain esivalittuna, Kenelle vain poimitut pelaajat (joukkue-valinta piilossa), viikonpäivävalinta; sulkeutuu valittaessa muu tyyppi', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await avaa(selain, { rooli: 'valmentaja', kutsu: '_avaaUusiTapahtuma("2026-10-22","17:00")' }); await p.waitForSelector('#uusiTapahtumaModal');
      expect(await p.locator('#tapahtumatyyppiAamu').innerText()).toBe('Aamutreeni'); expect(await p.locator('#tapahtumaAlkaa').inputValue()).toBe('17:00'); await p.locator('#tapahtumatyyppiAamu').click();
      expect(await p.locator('#mentValmentajaWrap').isVisible()).toBe(false); expect(await p.locator('#calLogWrap').isVisible()).toBe(false);   // mentorointi- ja ottelulogistiikka-lohkot pysyvät piilossa harjoituksella
      expect(await p.locator('#tapahtumaAlkaa').inputValue()).toBe('07:00'); expect(await p.locator('#tapahtumaPaattyy').inputValue()).toBe('08:30'); expect(await p.locator('[data-cad="viikoittain"]').evaluate((b) => b.style.background.includes('teal'))).toBe(true);
      expect(await p.locator('#uusiTapahtumaModal [data-kn-tapa]').isVisible()).toBe(false); expect(await p.locator('#uusiTapahtumaModal [data-kn-tapa]').inputValue()).toBe('pelaajat'); expect(await p.locator('#uusiTapahtumaModal [data-kn-pelaajat]').isVisible()).toBe(true); expect(await p.locator('#uusiTapahtumaModal [data-kn-pelaajat] option').count()).toBe(4);
      expect(await p.locator('[data-aamu-pv]').count()).toBe(7); expect(await p.locator('[data-aamu-pv]:checked').evaluateAll((l) => l.map((x) => x.getAttribute('data-aamu-pv')))).toEqual(['4']);   // oletus = valitun päivän viikonpäivä (to)
      await p.locator('#tapahtumatyyppi_ottelu').click(); expect(await p.locator('[data-aamu-pv]').first().isVisible()).toBe(false); expect(await p.locator('#uusiTapahtumaModal [data-kn-tapa]').isVisible()).toBe(true); await sk.close();
    } finally { await selain.close(); }
  }, 90000);
  it('tallennus: ilman pelaajia ei tallennu (virheilmoitus); 2 poimittua + ma/ke/pe → kolme viikoittaista sarjaa (oma sarja-id/viikonpäivä), alalaji aamutreeni, kohde pelaajat, ei joukkuetta', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await avaa(selain, { kutsu: '_avaaUusiTapahtuma("2026-10-22","17:00")' }); await p.waitForSelector('#uusiTapahtumaModal'); await p.locator('#tapahtumatyyppiAamu').click();
      for (const n of ['4']) await p.locator('[data-aamu-pv="' + n + '"]').uncheck(); for (const n of ['1', '3', '5']) await p.locator('[data-aamu-pv="' + n + '"]').check(); await p.locator('#uusiTapahtumaModal [data-kn-pelaajat]').evaluate((e) => { e.scrollIntoView(); });
      await p.locator('#uusiTapahtumaModal input[type=date]').last().fill('2026-11-06'); await tallenna(p); await p.waitForTimeout(500); expect(await p.evaluate(() => window.__kirj.length)).toBe(0);   // ei pelaajia → ei tallenna
      await p.locator('#uusiTapahtumaModal [data-kn-pelaajat]').selectOption(['p1', 'p3']); await tallenna(p); await p.waitForFunction(() => window.__kirj.length === 7);
      const k = await kirj(p); k.forEach((d) => expect(d).toMatchObject({ tyyppi: 'harjoitus', alalaji: 'aamutreeni', nimi: 'Aamutreeni', pelaajat_id: ['p1', 'p3'], kohde: { tyyppi: 'pelaajat' }, joukkue: null, joukkueet: [], toistuvuus: expect.objectContaining({ tyyppi: 'viikoittain' }), paattyy: '8:30' }));
      expect(new Set(k.map((d) => d.toistuvuus_sarja_id)).size).toBe(3); expect(k.map((d) => d.alkaa.split(' ')[0])).toEqual(Array(7).fill('7:00')); expect(k.map((d) => d.alkaa.split(' ')[1]).sort()).toEqual(['2.11', '23.10', '26.10', '28.10', '30.10', '4.11', '6.11'].sort()); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('viikkonäkymän kortti "Aamutreeni · 2 pel." + merkki Aamu; läsnäolon roster = poimitut (2 riviä, ei koko joukkuetta), oletuksena kaikki paikalla ("✓ 2/2 paikalla"), tallennus vain kuittauksella', async () => {
    const selain = await kaynnista();
    try {
      const ev = { id: 'am1', tyyppi: 'harjoitus', alalaji: 'aamutreeni', nimi: 'Aamutreeni', kohde: { tyyppi: 'pelaajat' }, pelaajat_id: ['p1', 'p3'], pvm: '2026-10-14', alkaa: '07:00', paattyy: '08:30', _alkaaMs: ms('2026-10-14', '07:00'), _paattyyMs: ms('2026-10-14', '08:30'), joukkue: '', joukkue_nimi: '', joukkueet: [], tila: 'suunniteltu', poistettu: false, lahde: 'manuaalinen', luoja_uid: 'u1' };
      const { sk, p } = await avaa(selain, { tapahtumat: [ev], viikko: -1, kokoelmat: { 'seurat/demo/pelaajat': PELAAJAT } }); await p.waitForSelector('.kv-kortti');
      const kortti = p.locator('.kv-kortti[onclick*="am1"]'); expect(await kortti.innerText()).toContain('Aamutreeni · 2 pel.'); expect(await kortti.innerText()).toContain('Aamu'); expect(await kortti.innerText()).toContain('Merkitse läsnäolot');
      await kortti.click(); await p.waitForFunction(() => (document.querySelector('.la-sum') || {}).textContent); expect(await p.locator('.la-btn[data-tila="paikalla"]').count()).toBe(2); expect(await p.locator('.la-sum').innerText()).toBe('✓ 2/2 paikalla'); expect(await p.evaluate(() => window.__kirj.length)).toBe(0);
      await p.getByText('Tallenna läsnäolo').click(); await p.waitForFunction(() => window.__kirj.length === 3); expect(await p.evaluate(() => window.__kirj.map((o) => o.r.path).filter((x) => /lasnaolijat/.test(x)).sort())).toEqual(['seurat/demo/kalenteri/am1/lasnaolijat/p1', 'seurat/demo/kalenteri/am1/lasnaolijat/p3']); await sk.close();
    } finally { await selain.close(); }
  }, 90000);
});
