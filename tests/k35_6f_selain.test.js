/* K35-6f · selain (Playwright + Chrome; chrome-tests-job): Masterin Harjoittelu-lohko + Pulssi-rivi oikeassa kuoressa (lue-koosteesta-polku, db-luku stubattu), Pelaajan/Vanhemman kortti kuortensa omilla tokeneilla 390 + 1280, light/dark. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const H = require('../lib/tm_harjoituskertyma.js');
const NYT = Date.parse('2026-10-19T09:00:00+03:00'), ms = (d, h) => Date.parse(d + 'T' + h + ':00+03:00');
const ev = (id, d, o) => Object.assign({ id, tyyppi: 'harjoitus', pvm: d, _alkaaMs: ms(d, '17:30'), _paattyyMs: ms(d, '19:00'), joukkue: 'Demo U13', joukkueet: ['demo_u13'], poistettu: false }, o || {});
const KERTYMA = (() => { const t = [], la = {}; for (let i = 0; i < 8; i++) { const d = '2026-10-' + String(1 + i * 2).padStart(2, '0'); t.push(ev('t' + i, d)); la['t' + i] = { tila: i === 5 ? 'poissa' : 'paikalla', syy: 'sairas' }; } t.push(ev('am', '2026-10-14', { alalaji: 'aamutreeni' })); la.am = { tila: 'paikalla' };
  return H.tmKertyma({ tapahtumat: t, lasnaolot: la, kirjaukset: [{ pvm: '2026-10-13', tyyppi: 'T', tehty: true, kesto_min: 20 }, { pvm: '2026-10-15', tyyppi: 'S', tehty: true }], nyt: NYT }); })();

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K35-6f · harjoituskertymä selain', () => {
  const kaynnista = async () => { const { chromium } = require('playwright-core'); return chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }); };
  it('Master: Harjoittelu-lohko (luetaan koosteesta, ei lasketa) + Pulssin "Ohjattu läsnäolo · 4 viikkoa"; nimilista vain valmentajalle; ei vaakasiirtymää 390 px', async () => {
    const selain = await kaynnista();
    try {
      for (const koko of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
        const sk = await selain.newContext({ viewport: koko }), p = await sk.newPage(), k = JSON.stringify(KERTYMA);
        await p.goto('file://' + sivu(MASTER, JUURI, { rooli: 'valmentaja', kutsu: 'window.__kerty=' + k + ';window.TM_HARJOITUSKERTYMA.tmKertymaLueKooste=function(){return Promise.resolve(window.__kerty)};window.TM_HARJOITUSKERTYMA.tmKertymaLueJoukkue=function(){return Promise.resolve({pelaajia:3,ohjattuPros:62,alle70:[0]})};var c=document.createElement("div");c.id="_mKertymaCard";document.body.appendChild(c);_mKertymaTayta({id:"p1"});_mKertymaPulssi();' }));
        await p.waitForSelector('#probe-out', { state: 'attached' }); await p.waitForFunction(() => document.querySelector('#_mKertymaCard .hk') && document.querySelector('#pulseKertyma .hk-rivi'));
        const t = await p.locator('#_mKertymaCard').innerText(); expect(t).toMatch(/Joukkueharjoitukset\s*\d+\/\d+/); expect(t).toMatch(/Aamutreenit\s*1\/1/); expect(t).toMatch(/Omatoimiset\s*2/); expect(t).toMatch(/Poissa ilmoitettu: 1 sairas/);
        expect(await p.locator('#_mKertymaCard .hk-pv').count()).toBe(12);
        const pu = await p.locator('#pulseKertyma').innerText(); expect(pu).toContain('Ohjattu läsnäolo'); expect(pu).toContain('62 %'); expect(pu).toContain('Seurataan');
        expect(await p.evaluate(() => typeof _mKertymaTayta + typeof _mKertymaPulssi)).toBe('functionfunction');
        expect(await p.evaluate(() => getComputedStyle(document.querySelector('#_mKertymaCard .hk-o')).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
        expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
  const KUORI = { 'Pelaaja_v7': 'TalentMaster_Pelaaja_v7.html', 'Vanhempi_v2': 'TalentMaster_Vanhempi_v2.html' };
  for (const [nimi, tiedosto] of Object.entries(KUORI)) {
    it(nimi + ': kevyt kortti kuoren omilla tokeneilla — 390 + 1280, light + dark, ei ylivuotoa; teksti "Tällä kaudella' + (nimi === 'Vanhempi_v2' ? ' lapsella' : '') + '"', async () => {
      const html = readFileSync(join(JUURI, tiedosto), 'utf8'), tokens = (html.match(/:root\s*\{[^}]*\}/) || [''])[0], light = (html.match(/:root\[data-theme="light"\]\s*\{[^}]*\}/) || [''])[0];
      const N = require('../lib/tm_harjoituskertyma_nakyma.js'), kortti = N.tmKertymaKevytHTML(KERTYMA, { vanhempi: nimi === 'Vanhempi_v2' });
      const sivuHtml = '<!doctype html><meta charset=utf-8><style>' + tokens + light + 'body{margin:0;padding:16px;background:var(--bg,var(--carbon,#111));color:var(--text,#eee);font-family:sans-serif}' + N.tmKertymaCSS() + '</style><body>' + kortti;
      const tmp = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '.tmp_k35_6f_' + nimi + '.html'); mkdirSync(dirname(tmp), { recursive: true }); writeFileSync(tmp, sivuHtml);
      const selain = await kaynnista();
      try {
        for (const teema of ['dark', 'light']) for (const koko of [{ width: 390, height: 600 }, { width: 1280, height: 600 }]) {
          const sk = await selain.newContext({ viewport: koko }), p = await sk.newPage(); await p.goto('file://' + tmp); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), teema);
          expect(await p.locator('.hk-yla').innerText()).toMatch(nimi === 'Vanhempi_v2' ? /^Tällä kaudella lapsella: / : /^Tällä kaudella: /);
          expect(await p.locator('.hk-pv').count()).toBe(8); expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
          expect(await p.evaluate(() => getComputedStyle(document.querySelector('.hk-o')).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
          await sk.close();
        }
      } finally { await selain.close(); }
    }, 90000);
  }
});
