#!/usr/bin/env node
/* K35-6e · läsnäolo-kuvat: (1) viikko, jossa yksi merkitty (✓ 12/16) ja yksi merkitsemätön päättynyt harjoitus ("Merkitse läsnäolot"); (2) läsnäolonäkymä esivalittuna ("✓ 4/4 paikalla") × tumma/vaalea × 390/1280 → docs/ui-kuvat/<haara>/.
   Oikea Master-sivu, mock-Firestore, FC Demon kaltainen fixture (tests/helpers/kalenteri_sivu.mjs). Käyttö: node scripts/ui_kuvat_lasnaolo.mjs [--haara nimi] */
import { chromium } from 'playwright-core';
import fs from 'fs'; import path from 'path'; import { execSync } from 'child_process'; import { fileURLToPath } from 'url';
import { sivu, FIXTURE } from '../tests/helpers/kalenteri_sivu.mjs';
const JUURI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const haara = (arg('haara') || execSync('git rev-parse --abbrev-ref HEAD', { cwd: JUURI, encoding: 'utf8' }).trim()).replace(/[^\w.-]+/g, '-'), UT = path.join(JUURI, 'docs', 'ui-kuvat', haara); fs.mkdirSync(UT, { recursive: true });
const POLKU = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome', process.env.PW_CHROMIUM].filter(Boolean).find((x) => fs.existsSync(x)), html = fs.readFileSync(path.join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const ms = (pvm, h) => Date.parse(pvm + 'T' + h + ':00+03:00');
const harj = (id, pvm, o) => Object.assign({ id, tyyppi: 'harjoitus', nimi: '', pvm, alkaa: '17:30', paattyy: '19:00', _alkaaMs: ms(pvm, '17:30'), _paattyyMs: ms(pvm, '19:00'), joukkue: 'Demo U13', joukkue_nimi: 'Demo U13', paikka: 'Kenttä 2', tila: 'suunniteltu', poistettu: false, lahde: 'manuaalinen' }, o || {});
const TAP = [harj('h1', '2026-10-13', { lasnaolo_kooste: { paikalla: 12, myohassa: 2, poissa: 2, merkitsematta: 0 } }), harj('h2', '2026-10-15', { paikka: 'Halli' })];
const KOK = { 'seurat/demo/pelaajat': FIXTURE.pelaajat.map((p) => ({ id: p.id, data: { etunimi: p.etunimi, sukunimi: p.sukunimi, joukkue: 'Demo U13' } })) };
const b = await chromium.launch({ executablePath: POLKU, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }), rivit = [];
for (const [leveys, korkeus] of [[390, 1400], [1280, 900]]) for (const teema of ['dark', 'light']) {
  const p = await (await b.newContext({ viewport: { width: leveys, height: korkeus } })).newPage();
  await p.goto('file://' + sivu(html, JUURI, { teema, viikko: -1, tapahtumat: TAP, kokoelmat: KOK })); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 }); await p.waitForTimeout(500);
  let n = `viikko_lasnaolo_${leveys}_${teema}`; await p.screenshot({ path: path.join(UT, n + '.png') }); rivit.push(n);
  await p.locator('.kv-kortti[onclick*="h2"]').click(); await p.waitForFunction(() => (document.querySelector('.la-sum') || {}).textContent); await p.waitForTimeout(300);
  n = `lasnaolonakyma_esivalittu_${leveys}_${teema}`; await p.screenshot({ path: path.join(UT, n + '.png') }); rivit.push(n);
}
await b.close(); console.log(rivit.length + ' kuvaa → ' + UT);
