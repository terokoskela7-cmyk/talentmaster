/* K35-2b · Masterin tapahtumamodaalit mahtuvat ruutuun (kiinteä yläosa · vierittyvä runko · kiinteä alaosa; D185 pikavalinnat).
   Staattinen vartija ajetaan aina; selainosa (Playwright + Chrome) vain kun TM_CHROME_TESTS ≠ '0' ja Chrome löytyy (CI: oma chrome-tests-job, kuten kentta_k0). */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const TY = require('../lib/tm_kalenteri_tyypit.js');
const fnLohko = (nimi) => { const a = MASTER.indexOf('function ' + nimi + '('); const b = MASTER.indexOf('\nfunction ', a + 10); return MASTER.slice(a, b); };
const UUSI = fnLohko('_avaaUusiTapahtuma'), MUOKKAA = fnLohko('_calMuokkaaTapahtuma');

describe('K35-2b · rakenne (staattinen)', () => {
  it('CSS: .cal-modal max-height calc(100dvh - 32px), overflow hidden, flex column; runko vierittyy (overscroll contain); yläosa ja alaosa kiinteät; mobiili ≤ 480 px + safe-area', () => {
    const css = (n) => (MASTER.match(new RegExp('\\.' + n + ' \\{[^}]*\\}')) || [''])[0];
    expect(css('cal-modal')).toMatch(/max-height: calc\(100dvh - 32px\)/); expect(css('cal-modal')).toMatch(/overflow: hidden/); expect(css('cal-modal')).toMatch(/flex-direction: column/);
    expect(css('cal-modal-runko')).toMatch(/overflow-y: auto/); expect(css('cal-modal-runko')).toMatch(/overscroll-behavior: contain/); expect(css('cal-modal-runko')).toMatch(/min-height: 0/);
    expect(css('cal-modal-yla')).toMatch(/flex: none/); expect(css('cal-modal-ala')).toMatch(/flex: none/);
    const mq = MASTER.slice(MASTER.indexOf('@media (max-width: 480px) {\n  .cal-modal-tausta')); expect(mq.slice(0, 600)).toContain('env(safe-area-inset-bottom)'); expect(mq.slice(0, 600)).toMatch(/\.cal-modal \{ width: 100%; \}/);
  });
  it('molemmissa modaaleissa on tausta + .cal-modal + yla/runko/ala -luokat; ei vanhaa inline-laatikkoa; Esc ja taustan klikkaus sulkevat', () => {
    [UUSI, MUOKKAA].forEach((k) => { expect(k).toContain("'cal-modal-tausta'"); expect(k).toContain("'cal-modal'"); expect(k).toContain("'cal-modal-runko'"); expect(k).toContain('cal-modal-ala'); expect(k).toContain('_calModalEsc(modal)'); expect(k).toMatch(/e\.target === modal\) modal\.remove\(\)/); expect(k).not.toContain('width:420px;max-width:100%'); expect(k).not.toContain('inset:0;background:rgba(0,0,0,.7)'); });
    expect(UUSI).toContain("'cal-modal-yla'"); expect(MUOKKAA).toContain("'cal-modal-yla'"); expect(MASTER).toMatch(/function _calModalEsc\(modal\)[\s\S]{0,400}e\.key === 'Escape'/);
  });
  it('Tallenna on alaosassa (ei rungossa): luonti ala.appendChild(tallBtn); muokkaus btnRivi = .cal-modal-ala', () => { expect(UUSI).toContain('ala.appendChild(tallBtn)'); expect(UUSI).not.toContain('box.appendChild(tallBtn)'); expect(MUOKKAA).toContain("btnRivi.className = 'cal-modal-ala'"); expect(MUOKKAA).not.toContain('box.appendChild(btnRivi)'); });
  it('tyyppivalinta: 5 pikavalintaa (rekisteri) + "Muut tyypit" -painike, loput piilossa kunnes avataan; teksti avaimena', () => {
    expect(TY.tmKalPikavalinnat().length).toBe(5); expect(UUSI).toContain('tmKalPikavalinnat()'); expect(UUSI).toContain("masterT('Muut tyypit')"); expect(UUSI).toContain("btn.style.display = 'none'"); expect(UUSI).toContain("classList.add('cal-tyyppi-muu')");
    const sv = JSON.parse(readFileSync(join(JUURI, 'docs/i18n/sv_kaannoserae_23.json'), 'utf8')).osiot.master_kartta.rivit['Muut tyypit']; expect(sv.sv).toBe('');   // sv tyhjä (Gemini)
  });
});

const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const KAYTOSSA = process.env.TM_CHROME_TESTS !== '0' && !!CHROME;

describe.skipIf(!KAYTOSSA)('K35-2b · selain: Tallenna näkyvissä (Playwright + Chrome)', () => {
  const kello = 'var __N=' + Date.UTC(2026, 9, 14, 9, 0) + ',__D=Date;Date=class extends __D{constructor(...a){super(...(a.length?a:[__N]))}static now(){return __N}};';
  const probe = (kutsu) => kello + '(function(){var out=function(x){var o=document.createElement("pre");o.id="probe-out";o.textContent=x;o.style.display="none";document.body.appendChild(o)};try{'
    + 'document.documentElement.setAttribute("data-theme","dark");_seuraId="x";_demo=false;_rooli="vp";_uid="u1";_superAdmin=true;_joukkue="Demo U13";_testitapahtumat=[];_kalenteriTapahtumat=[];'
    + 'var pakota=function(){document.getElementById("sLogin").classList.add("hidden");document.getElementById("sDash").classList.remove("hidden")};pakota();setInterval(pakota,150);setWs("cal");'
    + 'setTimeout(function(){try{_saaMerkitaLasnaolo=function(){return true};' + kutsu + '}catch(e){out("VIRHE "+e.message);return}out("ok")},800)}catch(e){out("VIRHE "+e.message)}})();';
  const sivu = (kutsu) => { const html = MASTER, j = html.indexOf('<head>') + 6, i = html.lastIndexOf('</body>'); const p = join(tmpdir(), 'k35_2b_' + Math.random().toString(36).slice(2) + '.html'); writeFileSync(p, html.slice(0, j) + '<base href="file://' + JUURI + '/">' + html.slice(j, i) + '<script>' + probe(kutsu) + '</script>' + html.slice(i)); return p; };
  const KUTSUT = { uusi: '_avaaUusiTapahtuma("2026-10-14","17:00")', muokkaus: '_calMuokkaaTapahtuma({id:"e1",tyyppi:"harjoitus",nimi:"Harjoitus",pvm:"2026-10-14",alkaa:"17:00",paattyy:"18:30",paikka:"Kenttä 2",lahde:"manuaalinen",luoja_uid:"u1"})' };
  const KOOT = [{ leveys: 390, korkeus: 700 }, { leveys: 1280, korkeus: 720 }];
  const sisalla = (b, v) => !!b && b.x >= 0 && b.y >= 0 && b.x + b.width <= v.leveys + 0.5 && b.y + b.height <= v.korkeus + 0.5;

  for (const [nimi, kutsu] of Object.entries(KUTSUT)) for (const koko of KOOT) {
    it(nimi + ' ' + koko.leveys + '×' + koko.korkeus + ': otsikko, sulje ja Tallenna näkyvissä avattaessa ja Viikoittain-toiston jälkeen; runko vierittyy', async () => {
      const { chromium } = require('playwright-core');
      const selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
      try {
        const sk = await selain.newContext({ viewport: { width: koko.leveys, height: koko.korkeus } }), p = await sk.newPage();
        await p.goto('file://' + sivu(kutsu), { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 30000 });
        expect(await p.evaluate(() => document.getElementById('probe-out').textContent)).toBe('ok');
        const modaali = nimi === 'uusi' ? '#uusiTapahtumaModal' : '#calEditModal', tall = modaali + ' .cal-modal-ala button:last-child', sulje = modaali + ' .cal-modal-yla button';
        const tarkista = async (vaihe) => {
          const ikkuna = await p.locator(modaali + ' .cal-modal').boundingBox(), t = await p.locator(tall).boundingBox(), s = await p.locator(sulje).boundingBox(), y = await p.locator(modaali + ' .cal-modal-yla').boundingBox();
          expect(sisalla(ikkuna, koko), vaihe + ': modaali ruudun sisällä ' + JSON.stringify(ikkuna)).toBe(true); expect(sisalla(t, koko), vaihe + ': Tallenna ' + JSON.stringify(t)).toBe(true); expect(sisalla(s, koko), vaihe + ': sulje ' + JSON.stringify(s)).toBe(true); expect(sisalla(y, koko), vaihe + ': otsikko').toBe(true);
        };
        await tarkista('avattaessa');
        if (nimi === 'uusi') { await p.locator('#tapahtumatyyppiMuut').click(); await p.locator(modaali + ' >> text=Viikoittain').first().click(); await tarkista('Viikoittain + Muut tyypit'); }
        const vieri = await p.evaluate((m) => { const r = document.querySelector(m + ' .cal-modal-runko'); return { sh: r.scrollHeight, ch: r.clientHeight, oy: getComputedStyle(r).overflowY }; }, modaali); expect(vieri.oy).toBe('auto');
        if (koko.leveys === 390 && nimi === 'uusi') expect(vieri.sh).toBeGreaterThan(vieri.ch);   // mobiilissa runko on pidempi kuin ikkuna → vierittyy, Tallenna silti paikallaan
        await p.keyboard.press('Escape'); expect(await p.locator(modaali).count()).toBe(0);   // Esc sulkee
        await sk.close();
      } finally { await selain.close(); }
    }, 90000);
  }
  it('luonti: pikavalintoja 5 näkyvissä + "Muut tyypit"; painike paljastaa loput 6 (johto, ei tauko)', async () => {
    const { chromium } = require('playwright-core');
    const selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
    try {
      const sk = await selain.newContext({ viewport: { width: 1280, height: 720 } }), p = await sk.newPage(); await p.goto('file://' + sivu(KUTSUT.uusi), { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 30000 });
      const nakyvia = () => p.evaluate(() => [...document.querySelectorAll('#uusiTapahtumaModal [id^=tapahtumatyyppi_]')].filter((b) => b.id !== 'tapahtumatyyppiMuut' && getComputedStyle(b).display !== 'none').length);
      expect(await nakyvia()).toBe(5); expect(await p.locator('#tapahtumatyyppiMuut').count()).toBe(1); await p.locator('#tapahtumatyyppiMuut').click(); expect(await nakyvia()).toBe(11); expect(await p.locator('#tapahtumatyyppiMuut').count()).toBe(0); expect(await p.locator('#tapahtumatyyppi_seuran_tauko').count()).toBe(0);
      await sk.close();
    } finally { await selain.close(); }
  }, 90000);
});
