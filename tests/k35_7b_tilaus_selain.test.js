/* K35-7b · selain (Playwright + Chrome; chrome-tests-job): "Lisää kalenteriini" -modaali — Master oikeassa kuoressa (callable stubattu firebase.app().functions), Pelaaja/Vanhempi kuortensa tokeneilla. 390 + 1280, light + dark. TM_KUVAT=1 → docs/ui-kuvat/k35-7b/. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const U = require('../lib/tm_kalenteri_tilaus_ui.js');
const STUB = (aktiivinen) => 'window.__kutsut=[];var __d=function(n){return n==="haeKalenteriTilausTila"?{aktiivinen:' + aktiivinen + ',luotu:"2026-10-05T10:00:00.000Z"}:(n==="luoKalenteriTilaus"?{url:"https://x.test/kalenteriIcal/abc.ics",webcal:"webcal://x.test/kalenteriIcal/abc.ics"}:{mitatoitu:1})};firebase.app=function(){return{functions:function(){return{httpsCallable:function(n){return function(d){window.__kutsut.push([n,d]);return Promise.resolve({data:__d(n)})}}}}}};';
const tallenna = (p, nimi) => { if (process.env.TM_KUVAT === '1') { const dir = join(JUURI, 'docs/ui-kuvat/k35-7b'); mkdirSync(dir, { recursive: true }); return p.screenshot({ path: join(dir, nimi + '.png') }); } };
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K35-7b · Lisää kalenteriini (selain)', () => {
  const kaynnista = async () => { const { chromium } = require('playwright-core'); return chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }); };
  it('Master: työkaluriviltä → Luo linkki → linkki näkyy kerran, Apple/Outlook/Google-napit, kopioi, päivitysvälit; sulje + avaa uudelleen → "Linkki luotu 5.10." ilman linkkiä; Poista linkki → perutaan', async () => {
    const selain = await kaynnista();
    try {
      for (const [teema, koko] of [['dark', { width: 1280, height: 900 }], ['light', { width: 390, height: 844 }]]) {
        const sk = await selain.newContext({ viewport: koko }), p = await sk.newPage();
        await p.goto('file://' + sivu(MASTER, JUURI, { teema, kutsu: STUB(false) })); await p.waitForSelector('#probe-out', { state: 'attached' });
        await p.locator('button[onclick="_calTilausAvaa()"]').click(); await p.waitForSelector('.tl-ikkuna [data-tl="luo"]');
        expect(await p.locator('.tl-ikkuna').innerText()).toContain('Päivittyy kalenteriisi muutaman tunnin välein');
        await p.locator('[data-tl="luo"]').click(); await p.waitForSelector('.tl-linkki');
        expect(await p.locator('.tl-linkki').inputValue()).toBe('https://x.test/kalenteriIcal/abc.ics'); expect(await p.locator('.tl-ikkuna').innerText()).toMatch(/Älä jaa sitä/);
        for (const k of ['apple', 'outlook', 'google', 'outlook_live']) expect(await p.locator('.tl-ikkuna [data-tl="' + k + '"]').count()).toBe(1);
        expect(await p.locator('.tl-ikkuna').innerText()).toContain('Google jopa vuorokausi');
        await tallenna(p, `master_uusi_${koko.width}_${teema}`);
        expect(await p.evaluate(() => { const r = document.querySelector('.tl-ikkuna').getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight + 1; })).toBe(true);
        await p.locator('[data-tl="sulje"]').click(); expect(await p.locator('.tl-tausta').count()).toBe(0);
        // aktiivinen tilaus: ei linkkiä, vain "luotu"-tieto
        await p.evaluate(STUB(true)); await p.locator('button[onclick="_calTilausAvaa()"]').click(); await p.waitForSelector('[data-tl="poista"]');
        const t = await p.locator('.tl-ikkuna').innerText(); expect(t).toContain('Linkki luotu 5.10.'); expect(await p.locator('.tl-linkki').count()).toBe(0); await tallenna(p, `master_aktiivinen_${koko.width}_${teema}`);
        await p.locator('[data-tl="poista"]').click(); await p.waitForSelector('[data-tl="luo"]:not([class*="x"])');
        expect(await p.evaluate(() => window.__kutsut.map((k) => k[0]))).toEqual(['haeKalenteriTilausTila', 'peruKalenteriTilaus']);
        expect(await p.evaluate(() => window.__kutsut[0][1])).toEqual({ seuraId: 'demo' });   // valmentajan oma syöte: ei pelaajaId:tä
        await sk.close();
      }
    } finally { await selain.close(); }
  }, 150000);
  for (const [nimi, tiedosto] of [['Pelaaja_v7', 'TalentMaster_Pelaaja_v7.html'], ['Vanhempi_v2', 'TalentMaster_Vanhempi_v2.html']]) {
    it(nimi + ': painike + modaali kuoren tokeneilla (390 + 1280, light + dark); ' + (nimi === 'Vanhempi_v2' ? 'vahvistamaton sähköposti → syy + vahvistusnappi kutsuu vahvistustoimintoa, ei haeta tilaa' : 'luonti kutsuu callablea pelaajaId:llä'), async () => {
      const html = readFileSync(join(JUURI, tiedosto), 'utf8'), tokens = (html.match(/:root\s*\{[^}]*\}/) || [''])[0], light = (html.match(/:root\[data-theme="light"\]\s*\{[^}]*\}/) || [''])[0];
      const tmp = join(JUURI, 'node_modules', '.tmp_k35_7b_' + nimi + '.html'); mkdirSync(dirname(tmp), { recursive: true });
      writeFileSync(tmp, '<!doctype html><meta charset=utf-8><style>' + tokens + light + 'body{margin:0;padding:16px;background:var(--bg,var(--carbon));color:var(--text);font-family:sans-serif}</style><body>' + U.tmTilausPainikeHTML({ t: (x) => x, onclick: 'avaa()' }) + '<script src="file://' + JUURI + '/lib/tm_kalenteri_tilaus_ui.js"></script>');
      const selain = await kaynnista();
      try {
        for (const teema of ['dark', 'light']) for (const koko of [{ width: 390, height: 800 }, { width: 1280, height: 800 }]) {
          const sk = await selain.newContext({ viewport: koko }), p = await sk.newPage(); await p.goto('file://' + tmp); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), teema);
          const vanh = nimi === 'Vanhempi_v2';
          await p.evaluate((vanh) => { window.__k = []; window.__vahv = 0; window._vahvista = () => { window.__vahv++; }; const a = window.TM_KALENTERI_TILAUS_UI.tmTilausAsenna({ kutsu: (n, d) => { window.__k.push([n, d]); return Promise.resolve({ data: n === 'luoKalenteriTilaus' ? { url: 'https://x/abc.ics', webcal: 'webcal://x/abc.ics' } : { aktiivinen: false } }); }, args: () => ({ seuraId: 'demo', pelaajaId: 'p1' }), esto: vanh ? () => ({ syy: 'sahkoposti', toiminto: '_vahvista' }) : null }); window.avaa = a.avaa; }, vanh);
          await p.locator('.tl-painike').click(); await p.waitForSelector('.tl-ikkuna');
          if (vanh) { expect(await p.locator('.tl-ikkuna').innerText()).toContain('ei ole vielä vahvistettu'); await p.locator('[data-tl="vahvista"]').click(); expect(await p.evaluate(() => [window.__vahv, window.__k.length])).toEqual([1, 0]); }
          else { await p.waitForSelector('[data-tl="luo"]'); await p.locator('[data-tl="luo"]').click(); await p.waitForSelector('.tl-linkki'); expect(await p.evaluate(() => window.__k.map((k) => k[0] + JSON.stringify(k[1])))).toEqual(['haeKalenteriTilausTila{"seuraId":"demo","pelaajaId":"p1"}', 'luoKalenteriTilaus{"seuraId":"demo","pelaajaId":"p1"}']); }
          expect(await p.evaluate(() => { const r = document.querySelector('.tl-ikkuna').getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth && document.documentElement.scrollWidth <= window.innerWidth + 1; })).toBe(true);
          expect(await p.evaluate(() => getComputedStyle(document.querySelector('.tl-ikkuna')).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)'); await tallenna(p, `${nimi}_${koko.width}_${teema}`);
          await sk.close();
        }
      } finally { await selain.close(); }
    }, 120000);
  }
});
