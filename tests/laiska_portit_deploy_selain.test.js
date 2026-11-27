/* Laiskojen kirjastojen PORTIT (data-portit) · SELAIN, molemmissa muodoissa: repon inline-muoto ja DEPLOY-muoto (versiotiiviste: pääskripti tm_master_main.js + defer, kuten staging/tuotanto).
   Juurisyy 26.11.2026: deploy-muodossa loaderi ajettiin ennen deferattua pääskriptiä → asenna() ei löytänyt funktioita → yksikään funktioportti (setWs, avaaValmentajaKehitys, avaaHarjoitusarviointi …) ei asentunut,
   ja normit latautuivat vain sattumalta (esim. Kausi-käynnin kautta). Tässä: kylmä avaus → jokainen data-portit-funktio on portin kääre → kutsu lataa laiskan ryhmän (Koti ei lataa). */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const kaynnista = () => require('playwright-core').chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
const PORTIT = (/data-portit="([^"]+)"/.exec(MASTER) || [])[1].split(',').filter((x) => x.charAt(0) !== '+').map((x) => x.replace(/[!=@].*/, ''));
const KUTSU = { setWs: "setWs('dev')", openDrill: "openDrill('adar')", _mAvaaPelaajaVanha: "_mAvaaPelaajaVanha('p1')", calEventClick: "calEventClick('x')", _avaaD3Arvio: "_avaaD3Arvio('p1')", avaaHarjoitusarviointi: 'avaaHarjoitusarviointi()', avaaValmentajaKehitys: 'avaaValmentajaKehitys()', avaaCoachProfiili: 'avaaCoachProfiili()' };

async function kylma(selain, deploy) {
  const f = sivu(MASTER, JUURI, { kutsu: '', deploy }); require('fs').writeFileSync(f, readFileSync(f, 'utf8').replace('setWs("cal");renderCal();', ''));   // ei boot-latausta
  const sk = await selain.newContext({ viewport: { width: 1000, height: 900 } }), p = await sk.newPage();
  await p.goto('file://' + f); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 30000 }); await p.waitForTimeout(500);
  return { sk, p };
}
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME)).each([['inline', false], ['deploy', true]])('Laiskat portit · kylmä avaus (selain, %s-muoto)', (_m, DEPLOY) => {
  it('data-portit: jokainen funktioportti on asentunut portin käärittynä (ei jäänyt alkuperäiseksi pääskriptin määrittelyn takia) eikä loaderi varoita', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await kylma(selain, DEPLOY); const varoitukset = []; p.on('console', (m) => { if (/\[laiska\] portti/.test(m.text())) varoitukset.push(m.text()); });
      const tila = await p.evaluate((nimet) => ({ valmis: tmLaiska.valmis(), kaarittu: nimet.map((n) => [n, typeof window[n] === 'function' && window[n].__tmLaiska === true]) }), PORTIT);
      expect(tila.valmis, 'kylmä avaus: ei ladattu').toBe(false);
      expect(tila.kaarittu.filter((x) => !x[1]).map((x) => x[0]), 'portin kääre puuttuu (loaderi asennettu liian aikaisin tai määrittely ohitti kääreen)').toEqual([]);
      await p.waitForTimeout(500); expect(varoitukset).toEqual([]);
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it.each(PORTIT)('kylmä avaus → %s-kutsu lataa laiskan ryhmän (Koti ei lataa)', async (nimi) => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await kylma(selain, DEPLOY); await p.evaluate(() => { Object.defineProperty(_auth, 'currentUser', { value: { uid: 'u1', getIdToken: async () => 't' }, configurable: true }); });
      await p.evaluate(() => { window.__virheet = []; window.addEventListener('unhandledrejection', (e) => window.__virheet.push(String(e.reason))); });
      if (nimi === 'setWs') { await p.evaluate(() => setWs('koti')); await p.waitForTimeout(300); expect(await p.evaluate(() => tmLaiska.valmis()), 'Koti ei saa ladata').toBe(false); }
      const palautti = await p.evaluate((k) => { try { return String(eval(k)); } catch (e) { return 'VIRHE ' + e.message; } }, KUTSU[nimi]);
      if (nimi === '_mAvaaPelaajaVanha') expect(palautti).toBe('true');   // portti palauttaa true ("käsitelty") odotuksen ajan
      await p.waitForFunction(() => tmLaiska.valmis(), null, { timeout: 15000 });
      expect(await p.evaluate(() => [typeof omaKehitysKooste, typeof cpdKooste, typeof laskeValmentajaHarjoitusKooste, typeof eerikkilaTaso])).toEqual(['function', 'function', 'function', 'function']);
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
