/* K2 · Masterin vastaanotto OIKEASSA selaimessa (Playwright + Chrome, mock-Firestore tests/helpers/kalenteri_sivu.mjs).
   Ajetaan Masterin OMA kytkentärivi (TM_KAAVIO_APURI.masterAvaa …) sellaisenaan, vain haku pakotetaan ?apuriKaavio=1:ksi.
   Todistaa: apurin siirto avaa SAMAN editorin (#_kvEditori) ja Tallenna kirjoittaa _kaavioTallenna-create-haaralla
   seurat/demo/kaaviot-kokoelmaan luonnoksena (versio 0, yksityinen) — ei uutta kirjoituspolkua. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const KYTKENTA = MASTER.split('\n').find((l) => l.includes('TM_KAAVIO_APURI.masterAvaa('));
const SPEC = { avain: 'y_h5', suunta: 'ylos', pelimuoto: '2v2+1', nakyma: 'alue', vyohyke: { x: 39, y: 43, w: 22, h: 14 },
  pelaajat: [{ id: 'A', joukkue: 'oma', rooli: 'tuki', x: 45, y: 54 }, { id: 'J', joukkue: 'oma', rooli: 'tuki', x: 50, y: 56 }, { id: 'V1', joukkue: 'vastustaja', rooli: 'paine', x: 47, y: 51 }],
  liikkeet: [], selitteet: [{ id: 's1', x: 50, y: 59, t: { fi: 'Jokeri' } }] };
const kutsu = (seuraId) => 'localStorage.setItem("tm_apuri_kaavio",JSON.stringify({v:1,spec:' + JSON.stringify(SPEC) + ',seuraId:"' + seuraId + '",aika:Date.now()}));'
  + KYTKENTA.trim().replace('haku: location.search', 'haku: "?apuriKaavio=1"');

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K2 · Master: apurin kaavio taktiikkatauluun', () => {
  const kaynnista = async () => { const { chromium } = require('playwright-core'); return chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }); };
  const avaa = async (selain, opts) => {
    const sk = await selain.newContext({ viewport: { width: 1280, height: 900 } }), p = await sk.newPage(), virheet = [];
    p.on('pageerror', (e) => virheet.push(e.message));
    await p.goto('file://' + sivu(MASTER, JUURI, opts));
    await p.waitForSelector('#probe-out', { state: 'attached', timeout: 30000 });
    expect(await p.evaluate(() => document.getElementById('probe-out').textContent)).toBe('ok');
    return { sk, p, virheet };
  };
  it('kytkentärivi löytyy ja lib on ladattu', () => { expect(KYTKENTA).toMatch(/haku: location\.search/); });
  it('VP omassa seurassa: editori aukeaa → Tallenna = luonnos seurat/demo/kaaviot (versio 0, yksityinen, sama spec); siirto kulutettu', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p, virheet } = await avaa(selain, { rooli: 'vp', kutsu: kutsu('demo') });
      expect(await p.evaluate(() => typeof window.TM_KAAVIO_APURI.masterAvaa)).toBe('function');
      await p.waitForSelector('#_kvEditori', { timeout: 15000 });
      expect(await p.evaluate(() => localStorage.getItem('tm_apuri_kaavio'))).toBe(null);
      await p.locator('#_kvEditori button[onclick="_kaavioTallenna()"]').click();
      await p.waitForFunction(() => window.__kirj.some((o) => /kaaviot$/.test(o.r.path)), null, { timeout: 15000 });
      const k = await p.evaluate(() => window.__kirj.find((o) => /kaaviot$/.test(o.r.path)));
      expect(k.r.path).toBe('seurat/demo/kaaviot');
      expect(k.d.review).toMatchObject({ status: 'luonnos', versio: 0, yksityinen: true, nakyvyys: 'joukkue', luonut: 'u1' });
      expect(k.d.spec).toMatchObject({ avain: 'y_h5', pelimuoto: '2v2+1' });
      expect(k.d.spec.pelaajat).toHaveLength(3);
      expect(virheet.filter((e) => !/^Uncaught \(in promise\) cancelled$/.test(e))).toEqual([]);   // App Check -kohina harnessissa (näkyy myös ilman apuria)
      await sk.close();
    } finally { await selain.close(); }
  }, 90000);
  it('toisen seuran siirto → ei editoria, ei kirjoitusta', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await avaa(selain, { rooli: 'valmentaja', kutsu: kutsu('muu_seura') });
      await p.waitForTimeout(1500);
      expect(await p.locator('#_kvEditori').count()).toBe(0);
      expect(await p.evaluate(() => window.__kirj.filter((o) => /kaaviot$/.test(o.r.path)).length)).toBe(0);
      await sk.close();
    } finally { await selain.close(); }
  }, 90000);
});
