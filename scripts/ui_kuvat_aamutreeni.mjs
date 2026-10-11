#!/usr/bin/env node
/* K35-6d (aamutreenit) · kuvat: Uusi tapahtuma Aamutreeni-esiasetuksella (poimitut pelaajat, viikonpäivät) ja viikkonäkymän kortti "Aamutreeni · 3 pel." × tumma/vaalea × 390/1280 → docs/ui-kuvat/<haara>/. Käyttö: node scripts/ui_kuvat_aamutreeni.mjs [--haara nimi] */
import { chromium } from 'playwright-core';
import fs from 'fs'; import path from 'path'; import { execSync } from 'child_process'; import { fileURLToPath } from 'url';
import { sivu, FIXTURE } from '../tests/helpers/kalenteri_sivu.mjs';
const JUURI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const haara = (arg('haara') || execSync('git rev-parse --abbrev-ref HEAD', { cwd: JUURI, encoding: 'utf8' }).trim()).replace(/[^\w.-]+/g, '-'), UT = path.join(JUURI, 'docs', 'ui-kuvat', haara); fs.mkdirSync(UT, { recursive: true });
const POLKU = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome', process.env.PW_CHROMIUM].filter(Boolean).find((x) => fs.existsSync(x)), html = fs.readFileSync(path.join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const ms = (pvm, h) => Date.parse(pvm + 'T' + h + ':00+03:00');
const aamu = (id, pvm, o) => Object.assign({ id, tyyppi: 'harjoitus', alalaji: 'aamutreeni', nimi: 'Aamutreeni', kohde: { tyyppi: 'pelaajat' }, pelaajat_id: ['p1', 'p2', 'p3'], pvm, alkaa: '07:00', paattyy: '08:30', _alkaaMs: ms(pvm, '07:00'), _paattyyMs: ms(pvm, '08:30'), joukkue: '', joukkue_nimi: '', joukkueet: [], tila: 'suunniteltu', poistettu: false, lahde: 'manuaalinen', luoja_uid: 'u1' }, o || {});
const harj = (id, pvm) => ({ id, tyyppi: 'harjoitus', nimi: '', pvm, alkaa: '17:30', paattyy: '19:00', _alkaaMs: ms(pvm, '17:30'), _paattyyMs: ms(pvm, '19:00'), joukkue: 'Demo U13', joukkue_nimi: 'Demo U13', paikka: 'Kenttä 2', tila: 'suunniteltu', poistettu: false, lahde: 'manuaalinen', luoja_uid: 'u1' });
const TAP = [aamu('a1', '2026-10-21'), aamu('a2', '2026-10-23', { lasnaolo_kooste: { paikalla: 3, myohassa: 0, poissa: 0, merkitsematta: 0 } }), harj('h1', '2026-10-20'), harj('h2', '2026-10-22')];
const b = await chromium.launch({ executablePath: POLKU, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }), rivit = [];
for (const [leveys, korkeus] of [[390, 1400], [1280, 1000]]) for (const teema of ['dark', 'light']) {
  let p = await (await b.newContext({ viewport: { width: leveys, height: korkeus } })).newPage();
  await p.goto('file://' + sivu(html, JUURI, { teema, tapahtumat: TAP })); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 }); await p.waitForSelector('.kv-kortti'); await p.waitForTimeout(300);
  let n = `viikko_aamutreeni_${leveys}_${teema}`; await p.screenshot({ path: path.join(UT, n + '.png') }); rivit.push(n);
  p = await (await b.newContext({ viewport: { width: leveys, height: 1100 } })).newPage();
  await p.goto('file://' + sivu(html, JUURI, { teema, kutsu: '_avaaUusiTapahtuma("2026-10-21","17:00")', kokoelmat: {} })); await p.waitForSelector('#uusiTapahtumaModal'); await p.locator('#tapahtumatyyppiAamu').click();
  await p.locator('#uusiTapahtumaModal [data-kn-pelaajat]').selectOption(['p1', 'p2', 'p3']); await p.locator('[data-aamu-pv="3"]').check(); await p.locator('[data-aamu-pv="1"]').check(); await p.locator('[data-aamu-pv="5"]').check(); await p.waitForTimeout(300);
  n = `uusi_aamutreeni_${leveys}_${teema}`; await p.screenshot({ path: path.join(UT, n + '.png') }); rivit.push(n);
}
await b.close(); console.log(rivit.length + ' kuvaa → ' + UT);
