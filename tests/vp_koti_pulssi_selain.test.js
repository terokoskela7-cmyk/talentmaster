/**
 * S2 PR 1 — selaintesti (docs/CODE_BRIEF_S2_KOTI.md: "Mobiili 390 px ilman vaakavieritystä"): oikea Chrome ajaa VP_v25:n Kodin pulssi-tilassa.
 * Ajetaan vain chrome-tests-jobissa (TM_CHROME_TESTS ≠ '0' ja Chrome löytyy; tests/helpers/chrome_ajo.mjs). Playwright: viewport suoraan 390 / 1280 px,
 * CDN-skriptit (Firebase, Sentry, fontit) tyngällä, mittaus kun pulssi (.kk) on piirretty — ei kiinteää odotusta.
 * Aiempi `--dump-dom` + iframe + setTimeout 3500/7000 ms ajettiin myös unit-testsissä (ei TM_CHROME_TESTS-ehtoa) ja kaatui kuormassa ilman tulosta.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { CHROME_KAYTOSSA, kaynnistaSelain, avaaSivu } from './helpers/chrome_ajo.mjs';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const J = (nimi, o) => Object.assign({ nimi, ikavaihe: 'rakentaja', tyyppi: 'kilpa', profiili: 'oto', jakso: true, n_pelaajat: 20, n_jaksolla: 20, n_katselmus: 0, n_vastanneet: 16, n_vastausperusta: 20, n_katselmus_ajallaan: 0, n_katselmus_perusta: 0,
  n_suostumus: 18, n_perhe_kuittaus_7: 0, n_harjoite_7: 14, n_harjoite_30: 16 }, o || {});
const KS = ['2026-W39', '2026-W40', '2026-W41', '2026-W42'].map((vk, i) => ({ vk, versio: 5, laskettu: { seconds: Date.now() / 1000 - 3600 }, yhteensa: { n_pelaajat: 60, n_suostumus: 40, n_harjoite_7: 30 },
  joukkueet: { a: J('P15 Demo', { jakso: false, n_jaksolla: 0, n_vastanneet: 0, n_vastausperusta: 0 }), b: J('P14 Demo', { n_vastanneet: [16, 14, 12, 10][i] }), c: J('P10 Demo', { ikavaihe: 'leikkija', n_perhe_kuittaus_7: 6, n_pelaajat: 8, n_jaksolla: 8 }),
    d: J('T12 Demo', { ikavaihe: 'leikkija', n_pelaajat: 4, n_jaksolla: 3 }) } }));

/* Sivu OS:n tmp-hakemistoon (ei repon juureen: kohdejoukkoa lukevat portit — appcheck_kytkenta ym. — skannaavat juuren *.html rinnakkaisajossa).
   <base href> osoittaa repoon, joten lib/…-polut toimivat. Probe korvaa pulssin datalähteen ja pakottaa Dashin näkyviin (kirjautumisruutu piiloon). */
const PROBE = '_vpPulssiLataa=function(){return Promise.resolve({koosteet:' + JSON.stringify(KS) + ',ensin:"2026-W20"})};_seuraId="demo-fc";window._vpLiput={"demo-fc":{kentta:true}};'
  + 'var pakota=function(){document.getElementById("sLogin").style.display="none";document.getElementById("sDash").style.display="block"};pakota();renderKotiVP();setInterval(pakota,150);';
const MITTAA = () => {
  const p = document.querySelector('.vpk-side'), m = document.querySelector('.vpk-main'), e = document.querySelector('.kk .kt-sig-h');
  return { sigh: e ? getComputedStyle(e).fontFamily + '|' + getComputedStyle(e).fontSize + '|' + getComputedStyle(document.documentElement).getPropertyValue('--fs-h2').trim() : null,
    sw: document.documentElement.scrollWidth, iw: window.innerWidth, kortit: document.querySelectorAll('.kk-jk,.kk-jr').length, pulssi: !!document.querySelector('.kk'),
    signaaleja: document.querySelectorAll('[data-signaali]').length, palstaSivulla: !!(p && m && p.getBoundingClientRect().left > m.getBoundingClientRect().left + 50) };
};

describe.skipIf(!CHROME_KAYTOSSA)('Koti (Rytmi, PR D) oikeassa selaimessa', () => {
  let selain, hak, sivu;
  beforeAll(async () => {
    hak = mkdtempSync(join(tmpdir(), 'tm-koti-')); sivu = join(hak, 'koti.html');
    const h = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8'), i = h.lastIndexOf('</body>'), j = h.indexOf('<head>') + 6;
    writeFileSync(sivu, h.slice(0, j) + '<base href="file://' + juuri + '/">' + h.slice(j, i) + '<script>' + PROBE + '</script>' + h.slice(i));
    selain = await kaynnistaSelain();
  }, 60000);
  afterAll(async () => { if (selain) await selain.close(); if (hak) rmSync(hak, { recursive: true, force: true }); }, 30000);   // macOS-Chrome sulkeutuu ~10 s
  const koti = async (leveys) => {
    const s = await avaaSivu(selain, { tiedosto: sivu }, { viewport: { width: leveys, height: 1800 }, odota: '.kk', aikaraja: 30000 });
    try { return await s.p.evaluate(MITTAA); } finally { await s.sulje(); }
  };
  it('390 px: ei vaakavieritystä, joukkuekortit/rivit näkyvät, oikea palsta pinoutuu pääsarakkeen alle', async () => {
    const t = await koti(390);
    expect(t.pulssi).toBe(true);
    expect(t.sw, 'vaakavieritys: scrollWidth ' + t.sw + ' > ' + t.iw).toBeLessThanOrEqual(t.iw);
    expect(t.signaaleja).toBe(2); expect(t.sigh, 'signaalikortin otsikko').toMatch(/Cormorant/); expect(t.palstaSivulla).toBe(false);
  }, 60000);
  it('1280 px: ei vaakavieritystä; oikea palsta pääsarakkeen vieressä', async () => {
    const t = await koti(1280);
    expect(t.sw).toBeLessThanOrEqual(t.iw); expect(t.palstaSivulla).toBe(true);
  }, 60000);
});
