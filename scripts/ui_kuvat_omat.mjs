#!/usr/bin/env node
/* K35-6d · joukkueen omat -kuvat: (1) viikko, jossa joukkueen vapaa to–su + Täytä viikko -esikatselu; (2) kevennysviikko Täytä viikolla (pe kevennys) × tumma/vaalea × 390/1280 → docs/ui-kuvat/<haara>/.
   Oikea Master-sivu, mock-Firestore, FC Demon kaltainen fixture (tests/helpers/kalenteri_sivu.mjs). Käyttö: node scripts/ui_kuvat_omat.mjs [--haara nimi] */
import { chromium } from 'playwright-core';
import fs from 'fs'; import path from 'path'; import { execSync } from 'child_process'; import { fileURLToPath } from 'url';
import { sivu, FIXTURE } from '../tests/helpers/kalenteri_sivu.mjs';
const JUURI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const haara = (arg('haara') || execSync('git rev-parse --abbrev-ref HEAD', { cwd: JUURI, encoding: 'utf8' }).trim()).replace(/[^\w.-]+/g, '-'), UT = path.join(JUURI, 'docs', 'ui-kuvat', haara); fs.mkdirSync(UT, { recursive: true });
const POLKU = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome', process.env.PW_CHROMIUM].filter(Boolean).find((x) => fs.existsSync(x)), html = fs.readFileSync(path.join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const ms = (pvm, h) => Date.parse(pvm + 'T' + h + ':00+03:00');
const koko = (id, tyyppi, a, b, o) => Object.assign({ id, tyyppi, nimi: '', koko_paiva: true, pvm: a, alkaa: '00:00', paattyy: '23:59', _alkaaMs: ms(a, '00:00'), _paattyyMs: ms(b, '23:59'), joukkue: 'Demo U13', joukkue_nimi: 'Demo U13', poistettu: false }, o || {});
const TAULUKKO = { vapaa: [...FIXTURE.historia, FIXTURE.ottelu, koko('v1', 'joukkueen_vapaa', '2026-10-22', '2026-10-25', { nimi: 'Joukkueen vapaa' })], kevennys: [...FIXTURE.historia, FIXTURE.ottelu, koko('k1', 'erikoisohjelma', '2026-10-19', '2026-10-25', { laji: 'kevennys', nimi: 'Kevennys' })] };
const b = await chromium.launch({ executablePath: POLKU, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }), rivit = [];
for (const [leveys, korkeus] of [[390, 1500], [1280, 900]]) for (const teema of ['dark', 'light']) for (const [nimi, tap] of Object.entries(TAULUKKO)) {
  const n = `viikko_${nimi}_${leveys}_${teema}`, p = await (await b.newContext({ viewport: { width: leveys, height: korkeus } })).newPage();
  await p.goto('file://' + sivu(html, JUURI, { teema, tapahtumat: tap })); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 }); await p.waitForSelector('#calTaytaKortti .kv-btn', { timeout: 10000 });
  await p.locator('#calTaytaKortti .kv-btn').click(); await p.waitForTimeout(300); await p.screenshot({ path: path.join(UT, n + '.png') }); rivit.push(n);
}
await b.close(); console.log(rivit.length + ' kuvaa → ' + UT);
