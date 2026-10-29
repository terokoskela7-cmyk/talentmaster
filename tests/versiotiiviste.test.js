/* QG-2: ?v = sisällön tiiviste deployssa (scripts/versiotiiviste.js). Korvaa lib_versiot-fixturet (#1029/#1030).
   Vartioi: (1) repossa ei käsin kirjoitettuja ?v:itä eikä cachenumeroita, (2) julkaisussa JOKAINEN paikallinen lataus saa
   oikean tiivisteen, (3) Pages ja Hosting laskevat saman tiivisteen samasta sisällöstä, (4) deploy kaatuu jos skripti
   epäonnistuu, (5) sisältömuutos vaihtaa ?v:n ja SW-cachenimen. Selaimessa ajettava SW-päivitys: tests/sw_paivitys_selain.test.js. */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, readdirSync, rmSync, existsSync, statSync } from 'fs';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';

const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const VT = require('../scripts/versiotiiviste.js');
const lue = (j, f) => readFileSync(join(j, f), 'utf8');
const sha8 = (s) => createHash('sha256').update(String(s).replace(/\r\n/g, '\n')).digest('hex').slice(0, 8);

/** Julkaistava puu levylle: juuren tiedostot + lib/ + docs/*.js (+ pwa-assetit). Riittää, koska sivut lataavat vain näistä. */
function kopioiPuu(kohde) {
  mkdirSync(kohde, { recursive: true });
  for (const f of readdirSync(JUURI)) if (statSync(join(JUURI, f)).isFile()) cpSync(join(JUURI, f), join(kohde, f));
  cpSync(join(JUURI, 'lib'), join(kohde, 'lib'), { recursive: true });
  mkdirSync(join(kohde, 'docs'), { recursive: true });
  for (const f of readdirSync(join(JUURI, 'docs'))) if (/\.js$/.test(f)) cpSync(join(JUURI, 'docs', f), join(kohde, 'docs', f));
  mkdirSync(join(kohde, 'scripts'), { recursive: true }); cpSync(join(JUURI, 'scripts', 'versiotiiviste.js'), join(kohde, 'scripts', 'versiotiiviste.js'));
  return kohde;
}
const julkaistut = (j) => readdirSync(j).filter((f) => /\.html$/.test(f) || /^sw_.*\.js$/.test(f)).sort();

describe('QG-2 · repo: ei käsin ylläpidettäviä versioita', () => {
  it('juuren HTML-sivuilla ei ole ?v:tä paikallisissa latauksissa, SW-rekisteröinnissä eikä käsin nostettuja cachenimiä', () => {
    expect(VT.tarkistaRepo()).toEqual([]);
  });
  it('jokainen juuren sw_*.js on SW-taulussa ja mainitsee oman kuorensa', () => {
    const sw = readdirSync(JUURI).filter((f) => /^sw_.*\.js$/.test(f)).sort();
    expect(sw).toEqual(Object.keys(VT.SW).sort());
    for (const f of sw) { expect(lue(JUURI, f), f).toContain(VT.SW[f].kuori); expect(lue(JUURI, f), f).toContain("const CACHE = '" + VT.SW[f].nimi + "-dev';"); }
  });
  it('vartija huomaa käsin kirjoitetun ?v:n ja käsin nostetun cachenimen', () => {
    const t = mkdtempSync(join(tmpdir(), 'qg2-repo-'));
    writeFileSync(join(t, 'a.html'), '<script src="lib/x.js?v=3"></script><script>s.src = \'tm-demo.js?v=2\';navigator.serviceWorker.register(\'sw_adar.js?v=1\')</script>');
    writeFileSync(join(t, 'sw_pelaaja.js'), "const CACHE = 'tm-pelaaja-v163';\n// TalentMaster_Pelaaja_v7.html");
    const o = VT.tarkistaRepo(t).join('\n');
    expect(o).toContain('lib/x.js?v=3'); expect(o).toContain('tm-demo.js?v=2'); expect(o).toContain('sw_adar.js?v=1'); expect(o).toContain('tm-pelaaja-v163');
    rmSync(t, { recursive: true, force: true });
  });
  it('vanhat käsinvartijat ja fixturet on poistettu', () => {
    for (const f of ['scripts/lib_versiot.js', 'tests/lib_versiot.test.js', 'tests/fixtures/lib_versiot.json', 'tests/fixtures/lib_versiot_historia.json']) expect(existsSync(join(JUURI, f)), f).toBe(false);
  });
});

describe('QG-2 · julkaisu: jokainen ladattu tiedosto saa tiivisteen', () => {
  let puu, tulos;
  beforeAll(() => { puu = kopioiPuu(join(mkdtempSync(join(tmpdir(), 'qg2-')), 'puu')); tulos = VT.kirjoita(puu); });

  it('--kirjoita onnistuu ja jälkitarkistus on puhdas', () => {
    expect(tulos.ongelmat).toEqual([]); expect(tulos.ok).toBe(true);
    expect(VT.tarkistaJulkaisu(puu)).toEqual([]);
  });
  it('jokainen paikallinen skriptilataus jokaisella sivulla = ?v=<sha256 8 merkkiä sisällöstä>', () => {
    let n = 0;
    for (const sivu of readdirSync(puu).filter((f) => /\.html$/.test(f))) {
      for (const l of VT.lataukset(lue(puu, sivu))) { n++; expect(l.v, sivu + ' ' + l.polku).toBe(sha8(lue(puu, l.polku))); }
    }
    expect(n).toBeGreaterThan(500);
  });
  it('esimerkit: P7 tm_lang.js, Masterin dynaaminen tm-demo.js ja SW-cachenimet', () => {
    expect(lue(puu, 'TalentMaster_Pelaaja_v7.html')).toContain('<script src="lib/tm_lang.js?v=' + sha8(lue(puu, 'lib/tm_lang.js')) + '"');
    expect(lue(puu, 'TalentMaster_Master_v16.html')).toContain("s.src = 'tm-demo.js?v=" + sha8(lue(puu, 'tm-demo.js')) + "'");
    expect(lue(puu, 'sw_pelaaja.js')).toMatch(/^const CACHE = 'tm-pelaaja-[0-9a-f]{8}';/m);
    expect(lue(puu, 'sw_vanhempi.js')).toMatch(/^const CACHE = 'tm-vanhempi-[0-9a-f]{8}';/m);
    expect(lue(puu, 'sw_adar.js')).toMatch(/^const CACHE = 'tm-adar-[0-9a-f]{8}';/m);
    expect(lue(puu, 'TalentMaster_ADAR_Pikakortti.html')).toContain("register('sw_adar.js')");
  });
  it('idempotentti: toinen ajo ei muuta mitään', () => {
    const ennen = julkaistut(puu).map((f) => lue(puu, f));
    expect(VT.kirjoita(puu).ok).toBe(true);
    expect(julkaistut(puu).map((f) => lue(puu, f))).toEqual(ennen);
  });
  it('--tulosta näyttää odotetut tiivisteet kirjoittamatta (tuotannon vertailuun)', () => {
    const r = spawnSync(process.execPath, [join(puu, 'scripts', 'versiotiiviste.js'), '--tulosta'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j.sivut['TalentMaster_Pelaaja_v7.html']['lib/tm_lang.js']).toBe(sha8(lue(puu, 'lib/tm_lang.js')));
    expect(j.sw['sw_pelaaja.js']).toBe(/const CACHE = '([^']+)'/.exec(lue(puu, 'sw_pelaaja.js'))[1]);
  });
});

describe('QG-2 · Pages ja Hosting laskevat saman tiivisteen samasta sisällöstä', () => {
  it('Pagesin puu (archive/ + docs/ui-kuvat/ poistettu) = Hostingin puu: identtiset sivut ja SW:t', () => {
    const t = mkdtempSync(join(tmpdir(), 'qg2-pv-'));
    const hosting = kopioiPuu(join(t, 'hosting'));
    mkdirSync(join(hosting, 'archive'), { recursive: true }); writeFileSync(join(hosting, 'archive', 'vanha.html'), '<script src="x.js?v=9"></script>');
    mkdirSync(join(hosting, 'docs', 'ui-kuvat'), { recursive: true }); writeFileSync(join(hosting, 'docs', 'ui-kuvat', 'k.png'), 'x');
    const pages = join(t, 'pages'); cpSync(hosting, pages, { recursive: true });
    rmSync(join(pages, 'archive'), { recursive: true }); rmSync(join(pages, 'docs', 'ui-kuvat'), { recursive: true });   // = deploy-pages.yml "Rajaa archive/ …"
    for (const [puu, cmd] of [[hosting, 'hosting'], [pages, 'pages']]) {
      const r = spawnSync(process.execPath, ['scripts/versiotiiviste.js', '--kirjoita'], { cwd: puu, encoding: 'utf8' });
      expect(r.status, cmd + ': ' + r.stderr).toBe(0);
    }
    expect(julkaistut(pages)).toEqual(julkaistut(hosting));
    for (const f of julkaistut(hosting)) expect(lue(pages, f), f).toBe(lue(hosting, f));
    rmSync(t, { recursive: true, force: true });
  });
  it('molemmat deploy-workflowt ajavat saman komennon ennen julkaisua, ilman continue-on-erroria', () => {
    const KOMENTO = 'run: node scripts/versiotiiviste.js --kirjoita';
    const P = lue(JUURI, '.github/workflows/deploy-pages.yml'), H = lue(JUURI, '.github/workflows/deploy-hosting.yml');
    expect(P).toContain(KOMENTO); expect(H).toContain(KOMENTO);
    expect(P.indexOf(KOMENTO)).toBeLessThan(P.indexOf('actions/upload-pages-artifact'));
    expect(P.indexOf(KOMENTO)).toBeGreaterThan(P.indexOf('rm -rf archive docs/ui-kuvat'));
    expect(H.indexOf(KOMENTO)).toBeLessThan(H.indexOf('FirebaseExtended/action-hosting-deploy'));
    expect(P).not.toMatch(/continue-on-error/); expect(H).not.toMatch(/continue-on-error/);
  });
});

describe('QG-2 · deploy kaatuu, jos tiivistettä ei voi laskea', () => {
  const mini = (html) => {
    const t = mkdtempSync(join(tmpdir(), 'qg2-mini-'));
    mkdirSync(join(t, 'lib')); mkdirSync(join(t, 'scripts'));
    cpSync(join(JUURI, 'scripts', 'versiotiiviste.js'), join(t, 'scripts', 'versiotiiviste.js'));
    writeFileSync(join(t, 'lib', 'a.js'), 'var A = 1;'); writeFileSync(join(t, 'sivu.html'), html);
    return t;
  };
  it('puuttuva ladattava tiedosto → exit 1, eikä sivua kirjoiteta', () => {
    const t = mini('<script src="lib/a.js"></script><script src="lib/puuttuu.js"></script>');
    const r = spawnSync(process.execPath, ['scripts/versiotiiviste.js', '--kirjoita'], { cwd: t, encoding: 'utf8' });
    expect(r.status).toBe(1); expect(r.stderr).toContain('lib/puuttuu.js');
    expect(lue(t, 'sivu.html')).not.toContain('?v=');
    rmSync(t, { recursive: true, force: true });
  });
  it('tuntematon sw_*.js (ei SW-taulussa) → exit 1', () => {
    const t = mini('<script src="lib/a.js"></script>'); writeFileSync(join(t, 'sw_uusi.js'), "const CACHE = 'tm-uusi-dev';");
    const r = spawnSync(process.execPath, ['scripts/versiotiiviste.js', '--kirjoita'], { cwd: t, encoding: 'utf8' });
    expect(r.status).toBe(1); expect(r.stderr).toContain('sw_uusi.js');
    rmSync(t, { recursive: true, force: true });
  });
  it('olemassa oleva ?v korvataan tiivisteellä ja muut parametrit säilyvät', () => {
    const t = mini('<script src="lib/a.js?x=1&v=7"></script>');
    expect(VT.kirjoita(t).ok).toBe(true);
    expect(lue(t, 'sivu.html')).toBe('<script src="lib/a.js?x=1&v=' + sha8('var A = 1;') + '"></script>');
    rmSync(t, { recursive: true, force: true });
  });
});

describe('QG-2 · sisältömuutos → uusi ?v ja uusi SW-cachenimi (ei käsinostoa)', () => {
  it('tm_lang.js muuttuu: sen ?v vaihtuu kaikilla sivuilla, muiden libien ?v ei; P7:n, Vanhemman ja ADAR:n cachenimet vaihtuvat', () => {
    const t = mkdtempSync(join(tmpdir(), 'qg2-muutos-'));
    const a = kopioiPuu(join(t, 'a')); const b = join(t, 'b'); cpSync(a, b, { recursive: true });
    writeFileSync(join(b, 'lib', 'tm_lang.js'), lue(b, 'lib/tm_lang.js') + '\n// muutos\n');
    expect(VT.kirjoita(a).ok).toBe(true); expect(VT.kirjoita(b).ok).toBe(true);
    const ra = VT.laske(a).raportti, rb = VT.laske(b).raportti;
    let lataajia = 0;
    for (const sivu of Object.keys(ra.sivut)) {
      for (const [f, h] of Object.entries(ra.sivut[sivu])) {
        if (f === 'lib/tm_lang.js') { lataajia++; expect(rb.sivut[sivu][f], sivu).not.toBe(h); } else expect(rb.sivut[sivu][f], sivu + ' ' + f).toBe(h);
      }
    }
    expect(lataajia).toBeGreaterThan(5);
    for (const sw of ['sw_pelaaja.js', 'sw_vanhempi.js', 'sw_adar.js']) expect(rb.sw[sw], sw).not.toBe(ra.sw[sw]);
    rmSync(t, { recursive: true, force: true });
  });
  it('lib, jota vain VP lataa, ei vaihda P7:n cachenimeä', () => {
    const t = mkdtempSync(join(tmpdir(), 'qg2-vp-'));
    const a = kopioiPuu(join(t, 'a')); const r0 = VT.laske(a).raportti;
    const vainVp = Object.keys(r0.sivut['TalentMaster_VP_v25.html']).find((f) => !r0.sivut['TalentMaster_Pelaaja_v7.html'][f] && !r0.sivut['TalentMaster_Vanhempi_v2.html'][f] && !r0.sivut['TalentMaster_ADAR_Pikakortti.html'][f]);
    expect(vainVp).toBeTruthy();
    writeFileSync(join(a, vainVp), lue(a, vainVp) + '\n// muutos\n');
    const r1 = VT.laske(a).raportti;
    expect(r1.sivut['TalentMaster_VP_v25.html'][vainVp]).not.toBe(r0.sivut['TalentMaster_VP_v25.html'][vainVp]);
    for (const sw of ['sw_pelaaja.js', 'sw_vanhempi.js', 'sw_adar.js']) expect(r1.sw[sw], sw).toBe(r0.sw[sw]);
    rmSync(t, { recursive: true, force: true });
  });
});
