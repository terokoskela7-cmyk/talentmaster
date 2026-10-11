#!/usr/bin/env node
/* K35-6b · siirto-kuvat: vedon aikana (pudotuskohde) ja siirtovahvistus; mobiilissa kortin "Siirrä…" + vahvistus × tumma/vaalea × 390/1280 → docs/ui-kuvat/<haara>/. Oikea Master-sivu, mock-Firestore, FC Demon kaltainen fixture. Käyttö: node scripts/ui_kuvat_siirto.mjs [--haara nimi] */
import { chromium } from 'playwright-core';
import fs from 'fs'; import path from 'path'; import { execSync } from 'child_process'; import { fileURLToPath } from 'url';
import { sivu } from '../tests/helpers/kalenteri_sivu.mjs';
const JUURI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const haara = (arg('haara') || execSync('git rev-parse --abbrev-ref HEAD', { cwd: JUURI, encoding: 'utf8' }).trim()).replace(/[^\w.-]+/g, '-'), UT = path.join(JUURI, 'docs', 'ui-kuvat', haara); fs.mkdirSync(UT, { recursive: true });
const POLKU = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome', process.env.PW_CHROMIUM].filter(Boolean).find((x) => fs.existsSync(x)), html = fs.readFileSync(path.join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const ms = (pvm, h) => Date.parse(pvm + 'T' + h + ':00+03:00');
const harj = (id, pvm, o) => Object.assign({ id, tyyppi: 'harjoitus', nimi: '', pvm, alkaa: '17:30', paattyy: '19:00', _alkaaMs: ms(pvm, '17:30'), _paattyyMs: ms(pvm, '19:00'), joukkue: 'Demo U13', joukkue_nimi: 'Demo U13', paikka: 'Kenttä 2', tila: 'suunniteltu', poistettu: false, lahde: 'manuaalinen', luoja_uid: 'u1' }, o || {});
const TAP = [harj('h1', '2026-10-20'), harj('h2', '2026-10-21'), harj('h3', '2026-10-22', { paikka: 'Halli' })];
const b = await chromium.launch({ executablePath: POLKU, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }), rivit = [];
for (const [leveys, korkeus] of [[390, 1300], [1280, 900]]) for (const teema of ['dark', 'light']) {
  const p = await (await b.newContext({ viewport: { width: leveys, height: korkeus } })).newPage();
  await p.goto('file://' + sivu(html, JUURI, { teema, tapahtumat: TAP })); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 }); await p.waitForSelector('.kv-paiva'); await p.waitForTimeout(400);
  let n = `viikko_siirrettavat_${leveys}_${teema}`; await p.screenshot({ path: path.join(UT, n + '.png') }); rivit.push(n);
  if (leveys > 640) await p.locator('.kv-paiva').nth(2).locator('.kv-kortti').dragTo(p.locator('.kv-paiva').nth(4)); else await p.locator('.kv-siirra').nth(1).click();
  await p.waitForSelector('#calSiirtoModal'); if (leveys <= 640) await p.locator('#siirtoPvm').fill('2026-10-23'); await p.waitForTimeout(300);
  n = `siirtovahvistus_${leveys}_${teema}`; await p.screenshot({ path: path.join(UT, n + '.png') }); rivit.push(n);
}
await b.close(); console.log(rivit.length + ' kuvaa → ' + UT);
