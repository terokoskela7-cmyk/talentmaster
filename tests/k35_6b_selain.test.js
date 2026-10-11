/* K35-6b · selain (Playwright + Chrome; chrome-tests-job): kortin vetäminen toiselle päivälle (työpöytä) ja "Siirrä…" (mobiili) → vahvistus → kirjoitus. Masterin oikea sivu, mock-Firestore. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const ms = (pvm, h) => Date.parse(pvm + 'T' + h + ':00+03:00');
const harj = (id, pvm, o) => Object.assign({ id, tyyppi: 'harjoitus', nimi: '', pvm, alkaa: '17:30', paattyy: '19:00', _alkaaMs: ms(pvm, '17:30'), _paattyyMs: ms(pvm, '19:00'), joukkue: 'Demo U13', joukkue_nimi: 'Demo U13', paikka: '', tila: 'suunniteltu', poistettu: false, lahde: 'manuaalinen', luoja_uid: 'u1' }, o || {});

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K35-6b · selain: siirto', () => {
  const kaynnista = async () => { const { chromium } = require('playwright-core'); return chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }); };
  const avaa = async (selain, opts, koko) => { const sk = await selain.newContext({ viewport: koko || { width: 1280, height: 900 } }), p = await sk.newPage(); await p.goto('file://' + sivu(MASTER, JUURI, opts)); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 30000 }); expect(await p.evaluate(() => document.getElementById('probe-out').textContent)).toBe('ok'); await p.waitForSelector('.kv-paiva'); return { sk, p }; };
  const paiva = (p, n) => p.locator('.kv-paiva').nth(n);   // 0 = ma 19.10.
  const kirj = (p) => p.evaluate(() => window.__kirj.filter((o) => o.d && o.d.alkaa).map((o) => ({ path: o.r.path, alkaa: o.d.alkaa.toDate ? new Date(o.d.alkaa.toDate().getTime() - o.d.alkaa.toDate().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : null, paattyy: o.d.paattyy && o.d.paattyy.toDate ? new Date(o.d.paattyy.toDate().getTime() - o.d.paattyy.toDate().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : null, d: o.d })));

  it('työpöytä: vedä ke-kortti torstaille → vahvistus (päivä 22.10., alkuperäinen aika 17:30, päättyy 19:00) → Siirrä → kirjoitus 22.10. 17:30–19:00; klikkaus ei avaa tapahtumaa', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await avaa(selain, { tapahtumat: [harj('h1', '2026-10-21')] });
      const kortti = paiva(p, 2).locator('.kv-kortti'); expect(await kortti.getAttribute('draggable')).toBe('true');
      await kortti.dragTo(paiva(p, 3)); await p.waitForSelector('#calSiirtoModal'); expect(await p.locator('#siirtoPvm').inputValue()).toBe('2026-10-22'); expect(await p.locator('#siirtoAlkaa').inputValue()).toBe('17:30'); expect(await p.locator('#siirtoPaattyy').innerText()).toBe('19:00'); expect(await p.evaluate(() => window.__kirj.length)).toBe(0);   // pudotus ei vielä kirjoita
      expect(await p.locator('#calDetailModal').count()).toBe(0);
      await p.locator('#siirtoTallenna').click(); await p.waitForFunction(() => window.__kirj.length === 1); const [k] = await kirj(p); expect(k.path).toBe('seurat/demo/kalenteri/h1'); expect([k.alkaa, k.paattyy]).toEqual(['2026-10-22T17:30', '2026-10-22T19:00']); expect(k.d.muokkaaja_uid === undefined || typeof k.d.muokkaaja_uid === 'string' || k.d.muokkaaja_uid === null).toBe(true); await sk.close();
    } finally { await selain.close(); }
  }, 90000);
  it('vahvistuksessa aikaa voi muuttaa (päättyy siirtyy, kesto säilyy); Peruuta ei kirjoita; sama päivä ja aika ei kirjoita', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await avaa(selain, { tapahtumat: [harj('h1', '2026-10-21')] });
      await paiva(p, 2).locator('.kv-kortti').dragTo(paiva(p, 4)); await p.waitForSelector('#calSiirtoModal'); await p.locator('#siirtoAlkaa').fill('18:00'); await p.locator('#siirtoAlkaa').dispatchEvent('change'); expect(await p.locator('#siirtoPaattyy').innerText()).toBe('19:30');
      await p.locator('#siirtoPeru').click(); expect(await p.locator('#calSiirtoModal').count()).toBe(0); expect(await p.evaluate(() => window.__kirj.length)).toBe(0);
      await paiva(p, 2).locator('.kv-kortti').dragTo(paiva(p, 2)); await p.waitForSelector('#calSiirtoModal'); await p.locator('#siirtoTallenna').click(); await p.waitForTimeout(300); expect(await p.evaluate(() => window.__kirj.length)).toBe(0); expect(await p.locator('#calSiirtoModal').count()).toBe(0);
      await paiva(p, 2).locator('.kv-kortti').dragTo(paiva(p, 4)); await p.waitForSelector('#calSiirtoModal'); await p.locator('#siirtoAlkaa').fill('18:00'); await p.locator('#siirtoAlkaa').dispatchEvent('change'); await p.locator('#siirtoTallenna').click(); await p.waitForFunction(() => window.__kirj.length === 1); const [k] = await kirj(p); expect([k.alkaa, k.paattyy]).toEqual(['2026-10-23T18:00', '2026-10-23T19:30']); await sk.close();
    } finally { await selain.close(); }
  }, 90000);
  it('ei vedettävissä: tuotu (MyClub) tapahtuma, toisen luoma valmentajalla, koko päivän tapahtuma; ei Siirrä…-painiketta', async () => {
    const selain = await kaynnista();
    try {
      const tap = [harj('tuotu', '2026-10-20', { lahde: 'myclub', lahde_id: 'x1', myclub_event_id: 'x1' }), harj('muu', '2026-10-21', { luoja_uid: 'joku_muu' }), { id: 'v', tyyppi: 'joukkueen_vapaa', koko_paiva: true, pvm: '2026-10-22', alkaa: '00:00', paattyy: '23:59', _alkaaMs: ms('2026-10-22', '00:00'), _paattyyMs: ms('2026-10-23', '23:59'), joukkue: 'Demo U13', joukkue_nimi: 'Demo U13', poistettu: false }];
      const { sk, p } = await avaa(selain, { tapahtumat: tap, rooli: 'valmentaja' });
      expect(await paiva(p, 1).locator('.kv-kortti').getAttribute('draggable')).toBeNull(); expect(await paiva(p, 2).locator('.kv-kortti').getAttribute('draggable')).toBeNull(); expect(await p.locator('.kv-koko .kv-kortti[draggable]').count()).toBe(0); expect(await p.locator('.kv-siirra').count()).toBe(0);
      await sk.close();
      const { sk: sk2, p: p2 } = await avaa(selain, { tapahtumat: tap, rooli: 'vp' }); expect(await paiva(p2, 1).locator('.kv-kortti').getAttribute('draggable')).toBeNull(); expect(await paiva(p2, 2).locator('.kv-kortti').getAttribute('draggable')).toBe('true');   // VP (johto) siirtää toisen luoman; tuotu silti lukittu
      await sk2.close();
    } finally { await selain.close(); }
  }, 90000);
  it('sarjatapahtuma: pudotus + Siirrä → laajuuskysely (Vain tämä / Tämä ja seuraavat / Koko sarja); "Vain tämä" kirjoittaa sarja_poikkeus', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await avaa(selain, { tapahtumat: [harj('s1', '2026-10-21', { toistuvuus_sarja_id: 'sarja1', toistuvuus: { tyyppi: 'viikoittain' } })] });
      await paiva(p, 2).locator('.kv-kortti').dragTo(paiva(p, 3)); await p.waitForSelector('#calSiirtoModal'); await p.locator('#siirtoTallenna').click(); await p.waitForSelector('#calSkooppiModal'); expect(await p.locator('#calSkooppiModal button').allTextContents()).toEqual(expect.arrayContaining(['Vain tämä', 'Tämä ja seuraavat', 'Koko sarja']));
      expect(await p.evaluate(() => window.__kirj.length)).toBe(0); await p.locator('#calSkooppiModal').getByText('Vain tämä').click(); await p.waitForFunction(() => window.__kirj.length === 1); const [k] = await kirj(p); expect(k.d.sarja_poikkeus).toBe(true); expect(k.alkaa).toBe('2026-10-22T17:30'); await sk.close();
    } finally { await selain.close(); }
  }, 90000);
  it('mobiili 390 px: kortin "Siirrä…" avaa vahvistuksen; päivä vaihdetaan kentästä; Siirrä → kirjoitus; painike piilossa työpöydällä', async () => {
    const selain = await kaynnista();
    try {
      const { sk: skD, p: pD } = await avaa(selain, { tapahtumat: [harj('h1', '2026-10-21')] }); expect(await pD.locator('.kv-siirra').first().isVisible()).toBe(false); await skD.close();
      const { sk, p } = await avaa(selain, { tapahtumat: [harj('h1', '2026-10-21')] }, { width: 390, height: 844 });
      expect(await p.locator('.kv-siirra').first().isVisible()).toBe(true); await p.locator('.kv-siirra').first().click(); await p.waitForSelector('#calSiirtoModal'); expect(await p.locator('#calDetailModal').count()).toBe(0); expect(await p.locator('#siirtoPvm').inputValue()).toBe('2026-10-21');
      const ruutu = await p.locator('#calSiirtoModal .cal-modal').boundingBox(); expect(ruutu.y).toBeGreaterThanOrEqual(0); expect(ruutu.y + ruutu.height).toBeLessThanOrEqual(844 + 1);
      await p.locator('#siirtoPvm').fill('2026-10-24'); await p.locator('#siirtoTallenna').click(); await p.waitForFunction(() => window.__kirj.length === 1); const [k] = await kirj(p); expect([k.alkaa, k.paattyy]).toEqual(['2026-10-24T17:30', '2026-10-24T19:00']); await sk.close();
    } finally { await selain.close(); }
  }, 90000);
});
