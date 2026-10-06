/**
 * K0 — lib/tm_kentta.js (Kenttä-komponentti), D10-tokenit, D11-fontti. Brief: docs/CODE_BRIEF_KENTTA_K0.md §4 (testit 1–8) + K0:n "ei näkyviä muutoksia" -vartijat.
 * Mockup: docs/design/idp-v2/09_pelaaja_kentta.html (osio 0 + data-pitch-variantit). Kokeet ajavat kirjastoa; fixture-nimet keksittyjä/KPV-testipelaaja.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'fs';
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { mkdtempSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const K = require('../lib/tm_kentta.js');
const LIB = lue('lib/tm_kentta.js');
const ASE = { alue: { x: 4, y: 38, w: 40, h: 44 }, nimi: 'Tempokuljetus' };
const lkm = (str, luokka) => (str.match(new RegExp('class="' + luokka.replace(/-/g, '\\-') + '"', 'g')) || []).length;
const kok = (r) => r.svg + r.html;

describe('1 · brändiportti', () => {
  it('lib ei sisällä hex-värejä eikä rgb()/hsl()-värejä (värit vain CSS-luokissa tokenien kautta)', () => {
    expect(LIB).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(LIB).not.toMatch(/\brgba?\s*\(|\bhsla?\s*\(/);
  });
  it('tmKenttaCss käyttää VAIN D10/T1-tokeneita (chalk, chalk2, teal, teal-dim, amber, amber-dim, blue, ink, bg), ei kovakoodattua väriä', () => {
    const css = K.tmKenttaCss();
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(/);
    const kaytetyt = [...new Set([...css.matchAll(/var\(--([a-z0-9-]+)\)/g)].map((m) => m[1]))].sort();
    expect(kaytetyt).toEqual(['amber', 'amber-dim', 'bg', 'blue', 'chalk', 'chalk2', 'ink', 'teal', 'teal-dim']);
    ['kt-line', 'kt-line2', 'kt-ase', 'kt-ase-puuttuu', 'kt-reitti', 'kt-reitti-b', 'kt-vk', 'kt-vk-tehty', 'kt-vk-nyt', 'kt-osa', 'kt-osa-nyt', 'kt-historia', 'kt-pallo'].forEach((c) => expect(css, c).toContain('.' + c));
  });
});

describe('2 · kerrokset', () => {
  it('ilman asetta: ei .kt-ase, mutta .kt-ase-puuttuu (oletusalue katkoviivalla, teksti t:n läpi)', () => {
    const r = K.tmKentta({ koko: 'puoli', ase: null });
    expect(lkm(r.html, 'kt-ase')).toBe(0); expect(lkm(r.html, 'kt-ase-puuttuu')).toBe(1);
    expect(r.data.alue).toMatchObject({ x: 30, y: 48, w: 40, h: 30, puuttuu: true });
    expect(r.html).toContain('ase puuttuu');
  });
  it('ase tila:"puuttuu" tai virheellinen alue → puuttuu-tila; ase alueella → .kt-ase', () => {
    expect(lkm(K.tmKentta({ ase: Object.assign({ tila: 'puuttuu' }, ASE) }).html, 'kt-ase-puuttuu')).toBe(1);
    expect(lkm(K.tmKentta({ ase: { alue: { x: 'a' }, nimi: 'x' } }).html, 'kt-ase-puuttuu')).toBe(1);
    const r = K.tmKentta({ ase: ASE }); expect(lkm(r.html, 'kt-ase')).toBe(1); expect(lkm(r.html, 'kt-ase-puuttuu')).toBe(0);
  });
  it('ilman reittiä: ei .kt-reitti eikä viikkomerkkejä (vaikka viikot annettu)', () => {
    const r = K.tmKentta({ ase: ASE, viikot: { n: 6, tehty: 2 } });
    expect(r.svg).not.toContain('kt-reitti'); expect(r.svg).not.toMatch(/kt-vk/); expect(r.data.reitti).toBeNull(); expect(r.data.viikot).toBeNull();
  });
  it('historia → .kt-historia per merkintä; lempipaikka → .kt-pallo; vaihtoehdot → kaksi reittiä (B sininen)', () => {
    expect((K.tmKentta({ historia: [{ loppu: 'maali' }, { loppu: 'kaveri' }] }).svg.match(/class="kt-historia"/g) || []).length).toBe(2);
    expect(K.tmKentta({ lempipaikka: { x: 30, y: 58 } }).svg).toContain('kt-pallo');
    const v = K.tmKentta({ ase: ASE, vaihtoehdot: [{ k: 'A', loppu: 'maali' }, { k: 'B', loppu: 'kaveri' }] });
    expect((v.svg.match(/class="kt-reitti/g) || []).length).toBe(2); expect(v.svg).toContain('kt-reitti-b'); expect(v.html).toContain('A · maali'); expect(v.html).toContain('B · kaveri');
  });
  it('osat: tagi per osa, "nyt" saa .kt-osa-nyt; tila sanana (ei lukuja)', () => {
    const r = K.tmKentta({ ase: ASE, osat: [{ k: 'a', nimi: 'laukaus', x: 42, y: 58, tila: 'ohjatusti' }, { k: 'b', nimi: 'jalka', x: 52, y: 40, tila: 'nyt' }, { k: 'c', nimi: 'katse', x: 56, y: 20, tila: 'ei_viela' }] });
    expect(r.html).toContain('a · laukaus · ohjatusti'); expect(r.html).toContain('kt-osa kt-osa-nyt'); expect(r.html).toContain('c · katse · ei vielä');
  });
});

describe('3 · viikkomerkit', () => {
  it('{n:6, tehty:1} → 1 tehty, 1 nyt, 4 tyhjää', () => {
    const r = K.tmKentta({ ase: ASE, reitti: { loppu: 'maali' }, viikot: { n: 6, tehty: 1 } });
    expect([lkm(r.svg, 'kt-vk-tehty'), lkm(r.svg, 'kt-vk-nyt'), lkm(r.svg, 'kt-vk')]).toEqual([1, 1, 4]);
    expect(r.data.viikot.map((v) => v.tila)).toEqual(['tehty', 'nyt', 'tyhja', 'tyhja', 'tyhja', 'tyhja']);
  });
  it('{n:6, tehty:6, valmis:true} → 6 tehty, 0 nyt; valmis ohittaa tehty-luvun', () => {
    const r = K.tmKentta({ ase: ASE, reitti: { loppu: 'maali' }, viikot: { n: 6, tehty: 6, valmis: true } });
    expect([lkm(r.svg, 'kt-vk-tehty'), lkm(r.svg, 'kt-vk-nyt'), lkm(r.svg, 'kt-vk')]).toEqual([6, 0, 0]);
    expect(lkm(K.tmKentta({ ase: ASE, reitti: { loppu: 'maali' }, viikot: { n: 6, tehty: 0, valmis: true } }).svg, 'kt-vk-tehty')).toBe(6);
  });
  it('alku (tehty 0) → 0 tehty, 1 nyt, 5 tyhjää; tehty > n rajataan; n ≤ 0 → ei merkkejä; merkit reitillä tasavälein (viimeinen = reitin loppu)', () => {
    const a = K.tmKentta({ ase: ASE, reitti: { loppu: 'maali' }, viikot: { n: 6, tehty: 0 } }); expect([lkm(a.svg, 'kt-vk-tehty'), lkm(a.svg, 'kt-vk-nyt'), lkm(a.svg, 'kt-vk')]).toEqual([0, 1, 5]);
    expect(lkm(K.tmKentta({ ase: ASE, reitti: { loppu: 'maali' }, viikot: { n: 3, tehty: 99 } }).svg, 'kt-vk-tehty')).toBe(3);
    expect(K.tmKentta({ ase: ASE, reitti: { loppu: 'maali' }, viikot: { n: 0, tehty: 0 } }).data.viikot).toBeNull();
    const v = a.data.viikot; expect([v[5].x, v[5].y]).toEqual([48, 8]);
  });
});

describe('4 · reitti päättyy', () => {
  it("loppu 'maali' → viimeinen piste (48,8); 'kaveri' → (74,24); 'kausitavoite' → (50,30); tuntematon → maali", () => {
    const loppu = (l) => K.tmKentta({ ase: ASE, reitti: { loppu: l } }).data.reitti;
    expect(loppu('maali').at(-1)).toEqual([48, 8]); expect(loppu('kaveri').at(-1)).toEqual([74, 24]); expect(loppu('kausitavoite').at(-1)).toEqual([50, 30]); expect(loppu('x').at(-1)).toEqual([48, 8]);
  });
  it('alku = aseen alueen keskipiste (24,60 mockupin aseelle); viisi pistettä (alku + 3 välipistettä + loppu); ilman asetta oletusalueen keskipiste', () => {
    const r = K.tmKentta({ ase: ASE, reitti: { loppu: 'maali' } }).data.reitti; expect(r.length).toBe(5); expect(r[0]).toEqual([24, 60]);
    expect(K.tmKentta({ ase: null, reitti: { loppu: 'maali' } }).data.reitti[0]).toEqual([50, 63]);
  });
  it('deterministinen ja ei vapaata piirtoa: sama spec → sama tuloste', () => {
    const s = { ase: ASE, reitti: { loppu: 'kaveri' }, viikot: { n: 6, tehty: 2 } }; expect(kok(K.tmKentta(s))).toBe(kok(K.tmKentta(JSON.parse(JSON.stringify(s)))));
  });
});

describe('5 · koko', () => {
  it("'puoli' → viewBox 0 0 100 84 (oletus); 'koko' → 0 0 100 140; koordinaatit eivät muutu", () => {
    expect(K.tmKentta({ koko: 'puoli' }).svg).toContain('viewBox="0 0 100 84"'); expect(K.tmKentta({}).svg).toContain('viewBox="0 0 100 84"'); expect(K.tmKentta({ koko: 'koko' }).svg).toContain('viewBox="0 0 100 140"');
    const a = K.tmKentta({ koko: 'puoli', ase: ASE, reitti: { loppu: 'maali' } }).data.reitti, b = K.tmKentta({ koko: 'koko', ase: ASE, reitti: { loppu: 'maali' } }).data.reitti; expect(a).toEqual(b);
  });
});

describe('6 · i18n', () => {
  it('opts.t kutsutaan jokaiselle näkyvälle käyttöliittymätekstille (avain → käännös); ilman t:tä avain sellaisenaan', () => {
    const kutsut = [];
    const t = (k) => { kutsut.push(k); return '«' + k + '»'; };
    const r = K.tmKentta({ ase: { alue: ASE.alue, nimi: 'Tempokuljetus' }, osat: [{ k: 'a', x: 1, y: 1, tila: 'ohjatusti' }, { k: 'b', x: 2, y: 2, tila: 'nyt' }, { k: 'c', x: 3, y: 3, tila: 'ei_viela' }, { k: 'd', x: 4, y: 4, tila: 'itsenaisesti' }], lempipaikka: { x: 30, y: 58 }, vaihtoehdot: [{ k: 'A', loppu: 'maali' }, { k: 'B', loppu: 'kaveri' }] }, { t });
    ['sinun aseesi', 'ohjatusti', 'nyt', 'ei vielä', 'itsenäisesti', 'tässä tykkään pelata', 'maali', 'kaveri', 'Kenttä'].forEach((k) => { expect(kutsut, k).toContain(k); expect(kok(r), k).toContain('«' + k + '»'); });
    expect(kok(K.tmKentta({ ase: null }, { t }))).toContain('«ase puuttuu»');
    expect(K.tmKentta({ ase: ASE }).html).toContain('sinun aseesi');   // ilman t:tä avain sellaisenaan
  });
  it('datakentät (ase.nimi, osan nimi) EIVÄT kulje t:n läpi (käyttäjän/valmentajan teksti) ja HTML-escapataan; ariaLabel-ohitus', () => {
    const t = (k) => '«' + k + '»';
    const r = K.tmKentta({ ase: { alue: ASE.alue, nimi: '<img src=x onerror=1>&"' } }, { t, ariaLabel: 'oma' });
    // myös KÄÄNNÖKSET escapataan (käännöstaulukko voi sisältää < & "), kaikissa t-kutsupaikoissa
    const hyokkays = (k) => '<u>' + k + '</u>&';
    const r2 = K.tmKentta({ ase: { alue: ASE.alue, nimi: 'x' }, osat: [{ k: 'a', x: 1, y: 1, tila: 'nyt' }], lempipaikka: { x: 30, y: 58 }, vaihtoehdot: [{ k: 'A', loppu: 'maali' }, { k: 'B', loppu: 'kaveri' }, { k: 'C', loppu: 'kausitavoite' }] }, { t: hyokkays });
    expect(r2.html).not.toMatch(/<u>/); expect(r2.svg).not.toMatch(/<u>/); expect(K.tmKentta({ ase: null }, { t: hyokkays }).html).not.toMatch(/<u>/);
    expect(r.html).not.toContain('<img'); expect(r.html).toContain('&lt;img'); expect(r.html).toContain('&amp;&quot;'); expect(r.html).not.toContain('«<'); expect(r.svg).toContain('aria-label="oma"');
  });
});

describe('7 · §7.22', () => {
  it('tuloste ei sisällä /5, OVR, elite, sharp, heikko, heikkous, rajoite, kriittinen (kaikki kerrokset päällä, molemmat koot)', () => {
    const spec = { ase: ASE, reitti: { loppu: 'maali' }, viikot: { n: 6, tehty: 2 }, historia: [{ loppu: 'kaveri' }], lempipaikka: { x: 30, y: 58 }, vaihtoehdot: [{ k: 'A', loppu: 'maali' }, { k: 'B', loppu: 'kaveri' }],
      osat: ['itsenaisesti', 'ohjatusti', 'ei_viela', 'nyt'].map((t, i) => ({ k: 'abcd'[i], x: 10 * i, y: 10 * i, tila: t })) };
    ['puoli', 'koko'].forEach((koko) => { const s = kok(K.tmKentta(Object.assign({ koko }, spec))) + K.tmKenttaCss() + K.tmKentta(Object.assign({ koko }, spec), { wrap: true }); expect(s).not.toMatch(/\/5|OVR|elite|sharp|heikko|heikkous|rajoite|kriittinen/i); });
    expect(LIB).not.toMatch(/heikkous|rajoite|kriittinen|OVR|\/5/i);
  });
  it('viikkomerkit ovat kestoa: ei numeroita tekstinä (ei "2/6", ei prosentteja)', () => {
    const r = K.tmKentta({ ase: ASE, reitti: { loppu: 'maali' }, viikot: { n: 6, tehty: 2 } }); expect(r.html.replace(/<[^>]+>/g, '')).not.toMatch(/\d/);
  });
});

describe('8 · demosivu renderöi kaikki 09:n data-pitch-variantit ilman JS-virheitä', () => {
  const MOCKUP = lue('docs/design/idp-v2/09_pelaaja_kentta.html');
  const DEMO_REL = 'docs/design/idp-v2/mockups/kentta_demo.html';
  const DEMO = lue(DEMO_REL);
  const mockupVariantit = [...new Set([...MOCKUP.matchAll(/data-pitch="([a-z0-9]+)"/g)].map((m) => m[1]))].sort();
  it('demosivu sisältää KAIKKI mockupin variantit (staattinen) ja käyttää kirjastoa, ei mockupin omaa JS:ää', () => {
    expect(mockupVariantit.length).toBe(15);
    mockupVariantit.forEach((v) => expect(DEMO, v).toContain("['" + v + "',"));
    expect(DEMO).toContain('tmKentta('); expect(DEMO).not.toMatch(/function lerpPath|createElementNS/);
    expect(DEMO).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);   // fontit omalta palvelimelta
  });
  const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => existsSync(p));
  /* Oikea Chrome-selain on EI-deterministinen: CI-ajossa se ylitti vitestin 30 s aikarajan toistuvasti (#824, mainin ajot), vaikka paikallisesti ~2 s. Siksi:
     (1) testi on ERILLÄÄN vaadittavasta unit-tests-portista — `npm test` (unit-tests) ajaa sen vain kun TM_CHROME_TESTS ≠ '0'; CI:n unit-tests asettaa TM_CHROME_TESTS=0 ja
         oma `chrome-tests`-job (EI vaadittava tarkistus) ajaa sen TM_CHROME_TESTS=1:llä. Flaky-testi vaadittavassa portissa opettaa ohittamaan punaisen.
     (2) vahvistettu ajo: asynkroninen spawn (synkroninen exec esti event loopin → vitestin aikaraja ei toiminut luotettavasti; Chrome myös jää roikkumaan exitissä → odotetaan </html> ja SIGKILL), oma tmp-profiili, --no-sandbox/--disable-dev-shm-usage (CI-kontti),
         ulkoverkko estetty (--host-resolver-rules → ei verkkoviiveitä; demosivu ei tarvitse ulkoisia resursseja), oma Chrome-aikaraja 45 s alle testin 60 s. */
  const CHROME_KAYTOSSA = process.env.TM_CHROME_TESTS !== '0';
  ((CHROME && CHROME_KAYTOSSA) ? it : it.skip)('headless-Chrome: 15 varianttia renderöityy, 0 virhettä (window.onerror + try/catch)', async () => {
    const profiili = mkdtempSync(join(tmpdir(), 'tm-chrome-'));
    /* Chrome tulostaa DOM:in ja jää usein roikkumaan sulkeutumisessa (tuore profiili / CI: >30 s ennen exitiä). Siksi EI odoteta prosessin loppua: kerätään stdout kunnes </html> näkyy, sitten SIGKILL. */
    const out = await new Promise((resolve, reject) => {
      const lapsi = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--disable-extensions', '--user-data-dir=' + profiili,
        '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE localhost', '--virtual-time-budget=3000', '--dump-dom', pathToFileURL(join(juuri, DEMO_REL)).href], { stdio: ['ignore', 'pipe', 'ignore'] });
      let data = '', valmis = false;
      const lopeta = (fn) => { if (valmis) return; valmis = true; clearTimeout(ajastin); try { lapsi.kill('SIGKILL'); } catch (e) { /* jo päättynyt */ } fn(); };
      const ajastin = setTimeout(() => lopeta(() => reject(new Error('Chrome ei tuottanut DOM:ia 45 s:ssa (' + data.length + ' merkkiä)'))), 45000);
      lapsi.stdout.setEncoding('utf8'); lapsi.stdout.on('data', (d) => { data += d; if (/<\/html>\s*$/i.test(data)) lopeta(() => resolve(data)); });
      lapsi.on('error', (e) => lopeta(() => reject(e)));
      lapsi.on('close', () => lopeta(() => (data ? resolve(data) : reject(new Error('Chrome päättyi ilman tulostetta')))));
    });
    const body = /<body[^>]*>/.exec(out)[0];
    expect(body).toContain('data-kt-errors="0"'); expect(body).toContain('data-kt-rendered="15"'); expect(body).toContain('data-kt-variants="15"');
    expect((out.match(/data-pitch="/g) || []).length).toBe(15); expect((out.match(/<svg class="kt-svg"/g) || []).length).toBe(15);
  }, 60000);
});

describe('K0 ei muuta näkymiä (D10/D11 vartijat)', () => {
  const PE = lue('TalentMaster_Pelaaja_v7.html'), VH = lue('TalentMaster_Vanhempi_v2.html');
  it('D10: --chalk/--chalk2/--amber-dim molempien appien :root-lohkossa (tumma) ja vaalean teeman lohkossa; lib ladataan', () => {
    [PE, VH].forEach((h) => {
      expect(h).toMatch(/--chalk:rgba\(242,239,230,\.55\); --chalk2:rgba\(242,239,230,\.28\)/);
      expect(h).toMatch(/:root\[data-theme="light"\] \{ --chalk:rgba\(28,28,26,\.45\); --chalk2:rgba\(28,28,26,\.2\); --amber-dim:rgba\(224,160,64,\.2\); \}/);
      expect(h).toContain('<script src="lib/tm_kentta.js?v=1"></script>');
    });
    expect(PE).toMatch(/--amber-dim: rgba\(224,160,64,\.16\)/); expect(VH).toMatch(/--amber-dim:rgba\(224,160,64,\.16\)/);
  });
  it('EI NÄKYVÄÄ MUUTOSTA: yksikään elementti ei vielä käytä uusia tokeneita eikä Archivoa (--chalk, --chalk2, --amber-dim, --font-k, Archivo) ja kirjastoa ei kutsuta', () => {
    [PE, VH].forEach((h) => {
      expect((h.match(/var\(--(chalk2?|amber-dim|font-k)\b/g) || []).length).toBe(0);
      expect(h.replace(/@font-face[^}]*}/, '')).not.toMatch(/font-family:\s*'?Archivo/);
      expect(h).not.toMatch(/tmKentta\(|TM_KENTTA\./);
    });
    // vanha --amber-dim-token (Pelaaja) oli käyttämätön → arvon vaihto ei muuta mitään
    expect((PE.match(/var\(--amber-dim/g) || []).length).toBe(0);
  });
  it('Kenttä-sisäiset tokenit (--amber, --blue, --teal-dim, --ink) vain .kt-elementissä, EI :rootissa → vanhojen elementtien värit eivät muutu', () => {
    const rootTokenit = (h) => {   // kaikki customit joiden määrittely on :root-säännössä (ei .kt:ssä, ei .tm-kaavio:ssa)
      const out = new Set();
      for (const m of h.matchAll(/(?:^|\n)\s*:root(?:\[data-theme="[a-z]+"\])?\s*\{([^}]*)\}/g)) for (const t of m[1].matchAll(/(--[a-z0-9-]+)\s*:/g)) out.add(t[1]);
      return out;
    };
    [PE, VH].forEach((h) => {
      const r = rootTokenit(h);
      ['--blue', '--teal-dim', '--amber'].forEach((t) => expect(r.has(t), t + ' ei saa olla :rootissa').toBe(false));
      expect(r.has('--chalk') && r.has('--chalk2') && r.has('--amber-dim') && r.has('--font-k')).toBe(true);   // D10/D11 :root
      const kt = /\.kt \{ --amber:#E0A040; --blue:#7FA6DE; --teal-dim:rgba\(40,176,144,\.16\); --ink:var\(--text\); \}/.exec(h);
      expect(kt, '.kt-skoopatut tokenit puuttuvat').toBeTruthy();
      expect(h).toMatch(/:root\[data-theme="light"\] \.kt \{ --amber:#9A6512; --blue:#3D6AA8; --teal-dim:rgba\(26,122,94,\.12\); \}/);
    });
    // vanha käyttö pysyy ennallaan: .synttari-bonus-label käyttää yhä (määrittelemätöntä) var(--amber):ia eikä --amber ole :rootissa → väri periytyy kuten ennen
    expect(PE).toMatch(/\.synttari-bonus-label\{[^}]*color:var\(--amber\)/);
    // vanhat :root-arvot koskemattomia (lukittu lista; ainoa muutos oli käyttämätön --amber-dim)
    expect(PE).toMatch(/--teal:\s*#1A7A5E;\s*--teal-d:\s*#28B090;/); expect(VH).toMatch(/--teal:#1A7A5E; --teal-d:#28B090;/);
    expect(PE).toMatch(/--bg:#111110; --bg2:#161614; --bg3:#1C1C1A;/); expect(PE).toMatch(/--text:#F2EFE6; --ink2:#A8A79F; --ink3:#8BA0BC;/);
  });
  it('§5 kirjaa: Kenttä-komponentin sisäiset tokenit, eivät globaaleja; 00-kartassa rivi vaalealle teemalle (Vanhempi ensin)', () => {
    expect(lue('CLAUDE.md')).toContain('Kenttä-komponentin sisäiset tokenit, eivät globaaleja');
    expect(lue('docs/design/idp-v2/00_projektikartta.html')).toContain('Vaalea teema Pelaaja/Vanhempi (mockup 09), Vanhempi ensin');
  });
  it('D11: @font-face omalta palvelimelta (yksi muuttuva tiedosto), ei Google Fontsia Archivolle; fonttitiedosto olemassa, woff2, sisältää ä ö å (unicode-range kattaa U+00E4/E5/F6)', () => {
    [PE, VH].forEach((h) => {
      const m = /@font-face \{ font-family:'Archivo Variable';[\s\S]*?\}/.exec(h)[0];
      expect(m).toContain('assets/fonts/archivo-latin-wdth-normal.woff2'); expect(m).toContain('font-weight:100 900'); expect(m).toContain('font-stretch:62% 125%');
      expect((h.match(/@font-face \{ font-family:'Archivo Variable'/g) || []).length).toBe(1);
      expect(h).not.toMatch(/fonts\.googleapis\.com[^"']*Archivo/i);
      expect(m).toContain('U+0000-00FF');   // Latin-1: ä (E4) ö (F6) å (E5)
    });
    const p = join(juuri, 'assets/fonts/archivo-latin-wdth-normal.woff2');
    expect(existsSync(p)).toBe(true); expect(readFileSync(p).subarray(0, 4).toString('latin1')).toBe('wOF2'); expect(statSync(p).size).toBeGreaterThan(30000); expect(statSync(p).size).toBeLessThan(200000);
    expect(existsSync(join(juuri, 'assets/fonts/archivo-OFL-LICENSE.txt'))).toBe(true);
  });
  it('SW: lib + fontti allowlistissa molemmissa apeissa, cachet nostettu (pelaaja v74, vanhempi v50)', () => {
    const sp = lue('sw_pelaaja.js'), sv = lue('sw_vanhempi.js');
    [sp, sv].forEach((s) => { expect(s).toContain("'/lib/tm_kentta.js'"); expect(s).toContain("'/assets/fonts/archivo-latin-wdth-normal.woff2'"); });
    expect(sp).toMatch(/const CACHE = 'tm-pelaaja-v(7[4-9]|[89]\d)'/); expect(sv).toMatch(/const CACHE = 'tm-vanhempi-v50'/);   // pelaaja vähintään v74 (K0); B 3/3 nosti v75
  });
  it('kirjasto ei lataa mitään verkosta eikä Firebasea; ei Google Fonts', () => {
    const koodi = LIB.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');   // ilman kommentteja
    expect(koodi).not.toMatch(/firebase|fetch\(|XMLHttpRequest|googleapis|gstatic|https?:\/\//i);
  });
});

describe('Chrome-testi ei ole vaadittavassa unit-tests-portissa (CI-vakaus)', () => {
  const WF = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '.github/workflows/test.yml'), 'utf8');
  it('unit-tests-job asettaa TM_CHROME_TESTS=0 (selaintesti ohitetaan) ja oma chrome-tests-job ajaa sen arvolla 1; testi ei käytä synkronista exec-kutsua (esti event loopin) eikä odota Chromen exitiä', () => {
    const unit = WF.slice(WF.indexOf('  unit-tests:'), WF.indexOf('  functions-tests:')), chrome = WF.slice(WF.indexOf('  chrome-tests:'), WF.indexOf('  # #60'));
    expect(unit).toMatch(/- run: npm test\s+env:\s+TM_CHROME_TESTS: '0'/); expect(chrome).toMatch(/TM_CHROME_TESTS: '1'/); expect(chrome).toContain('npx vitest run tests/kentta_k0.test.js'); expect(chrome).toContain('timeout-minutes');
    const t = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'kentta_k0.test.js'), 'utf8'); expect(t).not.toContain('exec' + 'FileSync'); expect(t).toContain("lapsi.kill('SIG" + "KILL')"); expect(t).toContain("process.env.TM_CHROME_TESTS !== '0'");
  });
});
