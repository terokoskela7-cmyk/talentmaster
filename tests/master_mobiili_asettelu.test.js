/* Masterin mobiiliasettelu: 390 px:ssä (ja 360) yksikään työtila ei vierity vaakaan — main ei ole ikkunaa leveämpi (K35-6a:n katselmointi: Kalenterin otsikkorivi ja viikkonavigaatio eivät rivittyneet → main 537 px).
   Staattinen vartija aina; selainosa (Playwright + Chrome) vain kun TM_CHROME_TESTS ≠ '0' (chrome-tests-job, kuten kentta_k0). */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');

describe('mobiiliasettelu · staattinen', () => {
  it('ruudukko ja main eivät kasva sisältönsä mukaan: .layout minmax(0,1fr), .main min-width:0', () => {
    expect(MASTER).toMatch(/\.layout \{ grid-template-columns: minmax\(0, 1fr\); \}/); expect((MASTER.match(/\.main \{[^}]*\}/) || [''])[0]).toMatch(/min-width: 0/);
  });
  it('Kalenterin otsikkorivin napit (.cal-actions) ja viikkonavigaatio (.cal-wknav) rivittyvät; ei inline-flex-riviä ilman wrapia', () => {
    expect((MASTER.match(/\.cal-actions \{[^}]*\}/) || [''])[0]).toMatch(/flex-wrap: wrap/); expect((MASTER.match(/\.cal-wknav  \{[^}]*\}/) || [''])[0]).toMatch(/flex-wrap: wrap/); expect(MASTER).toContain('<div class="cal-actions">'); expect(MASTER).toContain('<div class="cal-modebar" id="calModeBar">');
  });
});

const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('mobiiliasettelu · selain', () => {
  const probe = '(function(){var out=function(x){var o=document.createElement("pre");o.id="probe-out";o.textContent=x;o.style.display="none";document.body.appendChild(o)};try{_seuraId="x";_demo=false;_rooli="vp";_uid="u1";_joukkue="Demo U13";var pakota=function(){document.getElementById("sLogin").classList.add("hidden");document.getElementById("sDash").classList.remove("hidden")};pakota();setInterval(pakota,150);setTimeout(function(){out("ok")},800)}catch(e){out("VIRHE "+e.message)}})();';
  const j = MASTER.indexOf('<head>') + 6, i = MASTER.lastIndexOf('</body>'), src = join(tmpdir(), 'mob_' + Math.random().toString(36).slice(2) + '.html');
  writeFileSync(src, MASTER.slice(0, j) + '<base href="file://' + JUURI + '/">' + MASTER.slice(j, i) + '<script>' + probe + '</script>' + MASTER.slice(i));
  for (const leveys of [390, 360]) it(leveys + ' px: kaikki työtilat mahtuvat ikkunaan (main.leveys = ikkuna, scrollWidth ≤ ikkuna), Kalenteri mukana', async () => {
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });
    try {
      const p = await (await selain.newContext({ viewport: { width: leveys, height: 844 } })).newPage(); await p.goto('file://' + src, { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 30000 });
      const nakymat = await p.evaluate(() => [...document.querySelectorAll('.ws-view[data-view]')].map((e) => e.dataset.view)); expect(nakymat).toContain('cal'); expect(nakymat.length).toBeGreaterThanOrEqual(8);
      const huonot = [];
      for (const v of nakymat) { const r = await p.evaluate((v) => { setWs(v); const m = document.querySelector('.main'); return { main: Math.round(m.getBoundingClientRect().width), sw: document.documentElement.scrollWidth, w: window.innerWidth }; }, v); if (r.main > r.w || r.sw > r.w) huonot.push(v + ' ' + JSON.stringify(r)); }
      expect(huonot).toEqual([]);
    } finally { await selain.close(); }
  }, 120000);
});
