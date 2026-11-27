/* L2 Erä 2 · Master selain: modaali-/lomakemoduulit (tm_pikakirjaus, tm_harjoitusarviointi, tm_idp_lomake) EIVÄT lataudu avauksessa (Koti); oma ryhmä 'modaalit' ladataan vasta ensikäytöllä
   (_masterPikakirjaus · avaaHarjoitusarviointi · _cpdTodistePDF · IDP-kortti Polku/pelaajamodaali). Jätetty eager: tm_joukkuejakso/tm_aloita_jakso (renderKotiV2 kutsuu suoraan), tm_kevyt_katselmus
   (KT-signaali), tm_mediaviesti (Inbox-listener/KT) — ks. docs/KYLMA_AVAUS_DIAGNOOSI.md §18. Oikea Master file://-osoitteesta. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const ERA = ['tm_harjoitusarviointi.js', 'tm_idp_lomake.js', 'tm_pikakirjaus.js'], EAGER = ['tm_joukkuejakso.js', 'tm_aloita_jakso.js', 'tm_kevyt_katselmus.js', 'tm_mediaviesti.js'];
const kaynnista = () => require('playwright-core').chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
async function avaa(selain) {
  const sk = await selain.newContext({ viewport: { width: 390, height: 800 } }), p = await sk.newPage(), haetut = [], virheet = [];
  p.on('request', (r) => { const m = /\/lib\/([A-Za-z0-9_-]+\.js)/.exec(r.url()); if (m && ERA.indexOf(m[1]) >= 0) haetut.push(m[1]); });
  p.on('pageerror', (e) => virheet.push(e.message));
  await p.goto('file://' + sivu(MASTER, JUURI, { kutsu: '' })); await p.waitForSelector('#probe-out', { state: 'attached' });
  return { sk, p, haetut, virheet };
}
describe('L2 Erä 2 · staattiset', () => {
  it('3 skriptiä text/plain + data-tm-laiska + ryhmä "modaalit"; Koti-kuluttajat (joukkuejakso, aloita_jakso, kevyt_katselmus, mediaviesti) pysyvät eager', () => {
    ERA.forEach((n) => { expect(MASTER, n).toMatch(new RegExp('<script type="text/plain" data-tm-laiska data-tm-ryhma="modaalit" src="lib/' + n.replace('.', '\\.') + '"></script>')); });
    EAGER.forEach((n) => expect(MASTER, n).toMatch(new RegExp('<script src="lib/' + n.replace('.', '\\.') + '"></script>')));
  });
  it('jokainen käyttöpolku varmistaa ryhmän ennen kutsua (ei hiljaista varapolkua)', () => {
    expect(MASTER).toMatch(/async function _masterPikakirjaus\(\) \{\s*\n\s*if \(!window\.TM_PIKAKIRJAUS && window\.tmLaiska && !\(await window\.tmLaiska\.varmista\('modaalit'\)\)\) return;/);
    expect(MASTER).toMatch(/window\.tmLaiska && !\(await window\.tmLaiska\.varmista\('modaalit'\) && await window\.tmLaiska\.varmista\(\)\)\) return;/);   // yksi await-ketju: modaalit → normit
    expect(MASTER).toMatch(/if \(!window\.TM_HARJOITUS && window\.tmLaiska\) await window\.tmLaiska\.varmista\('modaalit'\);/);
    expect((MASTER.match(/window\.tmLaiska\.varmista\('modaalit'\)\.then\(function \(ok\) \{ if \(ok && window\._mIdpPelaaja === p\)/g) || []).length).toBe(2);   // KT Polku + pelaajamodaali
  });
});
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('L2 Erä 2 · selain', () => {
  it('avaus ei lataa erää; TM_PIKAKIRJAUS/TM_HARJOITUS/TM_IDP_LOMAKE puuttuvat; ei pageerroreita', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p, haetut, virheet } = await avaa(selain); await p.waitForTimeout(800);
      expect(haetut, 'avaus ei saa hakea erän skriptejä').toEqual([]);
      expect(await p.evaluate(() => [typeof TM_PIKAKIRJAUS, typeof TM_HARJOITUS, typeof TM_IDP_LOMAKE])).toEqual(['undefined', 'undefined', 'undefined']);
      expect(await p.evaluate(() => [typeof TM_JOUKKUEJAKSO, typeof TM_ALOITA_JAKSO, typeof TM_KEVYT_KATSELMUS, typeof TM_MEDIAVIESTI])).toEqual(['object', 'object', 'object', 'object']);
      expect(virheet.filter((e) => e !== 'Uncaught (in promise) cancelled')).toEqual([]);
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('_masterPikakirjaus() ensikäytöllä lataa ryhmän HTML-järjestyksessä; oletusryhmä (harjoitelogiikka ym.) EI lataudu', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p, haetut } = await avaa(selain); await p.waitForTimeout(600);
      await p.evaluate(() => { try { _masterPikakirjaus(); } catch (e) { /* ilman seuraa/Firestorea avaus pysähtyy toastiin — lataus ratkaisee */ } });
      await p.waitForFunction(() => window.tmLaiska.valmis('modaalit'), null, { timeout: 15000 });
      expect(haetut).toEqual(ERA.slice().sort((a, b) => MASTER.indexOf('lib/' + a) - MASTER.indexOf('lib/' + b)));
      expect(await p.evaluate(() => [typeof TM_PIKAKIRJAUS, typeof TM_HARJOITUS, typeof TM_IDP_LOMAKE])).toEqual(['object', 'object', 'object']);
      expect(await p.evaluate(() => window.tmLaiska.valmis())).toBe(false);
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('setWs(cal) (oletusryhmän portti + uudelleenpiirto) lataa modaalit-ryhmän VAIN jos IDP-kortti (_mIdpCard) on piirretty — portti itse ei vedä ryhmää mukaan', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p, haetut } = await avaa(selain); await p.waitForTimeout(600);
      expect(await p.evaluate(() => !!document.getElementById('_mIdpCard'))).toBe(false);   // Koti: ei korttia
      await p.evaluate(() => setWs('cal')); await p.waitForFunction(() => window.tmLaiska.valmis(), null, { timeout: 15000 }); await p.waitForTimeout(1500);
      const kortti = await p.evaluate(() => !!document.getElementById('_mIdpCard'));
      expect(await p.evaluate(() => window.tmLaiska.valmis('modaalit'))).toBe(kortti);
      expect(haetut.length).toBe(kortti ? ERA.length : 0);
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
