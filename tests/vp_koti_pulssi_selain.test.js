/**
 * S2 PR 1 — selaintesti (docs/CODE_BRIEF_S2_KOTI.md: "Mobiili 390 px ilman vaakavieritystä"): oikea Chrome ajaa VP_v25:n Kodin pulssi-tilassa.
 * Ajetaan vain, jos Chrome löytyy (CHROME_BIN tai macOS/Linux-oletuspolut); muuten SKIP (CI ilman selainta). Tilapäiset tiedostot OS:n tmp-hakemistossa, siivotaan aina.
 * 390 px mitataan iframella (Chromen headless-ikkuna ei mene alle 500 px).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, rmSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = [process.env.CHROME_BIN, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find((p) => existsSync(p));
const J = (nimi, o) => Object.assign({ nimi, ikavaihe: 'rakentaja', tyyppi: 'kilpa', profiili: 'oto', jakso: true, n_pelaajat: 20, n_jaksolla: 20, n_katselmus: 0, n_vastanneet: 16, n_vastausperusta: 20, n_katselmus_ajallaan: 0, n_katselmus_perusta: 0,
  n_suostumus: 18, n_perhe_kuittaus_7: 0, n_harjoite_7: 14, n_harjoite_30: 16 }, o || {});
const KS = ['2026-W39', '2026-W40', '2026-W41', '2026-W42'].map((vk, i) => ({ vk, versio: 5, laskettu: { seconds: Date.now() / 1000 - 3600 }, yhteensa: { n_pelaajat: 60, n_suostumus: 40, n_harjoite_7: 30 },
  joukkueet: { a: J('P15 Demo', { jakso: false, n_jaksolla: 0, n_vastanneet: 0, n_vastausperusta: 0 }), b: J('P14 Demo', { n_vastanneet: [16, 14, 12, 10][i] }), c: J('P10 Demo', { ikavaihe: 'leikkija', n_perhe_kuittaus_7: 6, n_pelaajat: 8, n_jaksolla: 8 }),
    d: J('T12 Demo', { ikavaihe: 'leikkija', n_pelaajat: 4, n_jaksolla: 3 }) } }));

/* Tilapäiset tiedostot OS:n tmp-hakemistoon (ei repon juureen: kohdejoukkoa lukevat portit — appcheck_kytkenta ym. — skannaavat juuren *.html rinnakkaisajossa).
   <base href> osoittaa repoon, joten lib/…-polut toimivat. */
function koti(leveys) {
  const hak = mkdtempSync(join(tmpdir(), 'tm-koti-')), sivu = join(hak, 'koti.html'), kuori = join(hak, 'kuori.html');
  try {
    const probe = '(function(){var out=function(x){var o=document.createElement("pre");o.id="probe-out";o.textContent=x;o.style.display="none";document.body.appendChild(o)};try{var KS=' + JSON.stringify(KS) + ';'
      + '_vpPulssiLataa=function(){return Promise.resolve({koosteet:KS,ensin:"2026-W20"})};_seuraId="demo-fc";window._vpLiput={"demo-fc":{kentta:true}};'
      + 'var pakota=function(){document.getElementById("sLogin").style.display="none";document.getElementById("sDash").style.display="block"};pakota();renderKotiVP();setInterval(pakota,150);'
      + 'setTimeout(function(){var t=document.querySelector(".tmp");out(JSON.stringify({sw:document.documentElement.scrollWidth,iw:window.innerWidth,taulukko:!!(document.querySelector(".pt-wrap")&&document.querySelector(".pt-wrap").offsetParent),kortit:document.querySelectorAll(".cards .kt-ev").length,pulssi:!!t,signaaleja:document.querySelectorAll(".kt-sig[data-signaali]").length}))},3500)}catch(e){out("VIRHE "+e.message)}})();';
    const h = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8'), i = h.lastIndexOf('</body>'), j = h.indexOf('<head>') + 6;
    writeFileSync(sivu, h.slice(0, j) + '<base href="file://' + juuri + '/">' + h.slice(j, i) + '<script>' + probe + '</script>' + h.slice(i));
    writeFileSync(kuori, '<!doctype html><meta charset=utf-8><body style="margin:0"><iframe id=f src="file://' + sivu + '" style="width:' + leveys + 'px;height:1800px;border:0"></iframe><script>setTimeout(function(){var d=document.getElementById("f").contentDocument;var o=document.createElement("pre");o.id="w-out";o.textContent=d.getElementById("probe-out").textContent;document.body.appendChild(o)},7000)</script>');
    const r = spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files', '--window-size=1400,1900', '--virtual-time-budget=14000', '--dump-dom', 'file://' + kuori], { encoding: 'utf8', timeout: 90000 });
    const m = /<pre id="w-out">([^<]*)<\/pre>/.exec(r.stdout || '');
    return m ? JSON.parse(m[1].replace(/&quot;/g, '"')) : { virhe: (r.stderr || '').slice(0, 300) || 'ei tulosta' };
  } finally { rmSync(hak, { recursive: true, force: true }); }
}

describe.skipIf(!CHROME)('Kodin pulssi oikeassa selaimessa', () => {
  it('390 px: ei vaakavieritystä, mobiilikortit näkyvät, taulukko piilossa', () => {
    const t = koti(390);
    expect(t.virhe, JSON.stringify(t)).toBeUndefined(); expect(t.pulssi).toBe(true);
    expect(t.sw, 'vaakavieritys: scrollWidth ' + t.sw + ' > ' + t.iw).toBeLessThanOrEqual(t.iw);
    expect(t.taulukko).toBe(false); expect(t.kortit).toBeGreaterThan(0); expect(t.signaaleja).toBe(2);
  }, 120000);
  it('1280 px: taulukko näkyy, ei vaakavieritystä', () => {
    const t = koti(1280);
    expect(t.virhe, JSON.stringify(t)).toBeUndefined(); expect(t.sw).toBeLessThanOrEqual(t.iw); expect(t.taulukko).toBe(true);
  }, 120000);
});
