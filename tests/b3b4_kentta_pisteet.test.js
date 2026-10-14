/* B3/B4: Kentän ydinasiapisteet (a → e) alueen sisälle/reunalle, ei päällekkäin eikä viivojen päälle; arvioimaton himmeä ilman tilatekstiä; napautus = sama funktio kuin osarivin napautus; aria-label "a · teksti · tila". Reitti, tavoitteet kentältä ja vyöhykeehdotukset: joulukuu (D98 + D107). */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
const require = createRequire(import.meta.url);
const S = require('../lib/tm_kentta_spec.js'), K = require('../lib/tm_kentta.js'), A = require('../lib/tm_kt_alue.js');
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'b3b4-kentta-pisteet');
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
describe('_pisteSijainnit: sisälle/reunalle, ei päällekkäin, ei viivoille, a → e', () => {
  const ALUEET = ['8v8', '11v11'].flatMap((m) => A.tmKtAlueet(m)).map((z) => ({ x: z.x, y: z.y, w: z.w, h: z.h })).concat([{ x: 28, y: 44, w: 44, h: 32 }, { x: 30, y: 48, w: 40, h: 30 }]);
  it('jokaiselle aluejaon alueelle ja n = 3…7: väli ≥ PISTE_VALI (ei päällekkäin), etäisyys viivoista ≥ 2,8 (ei viivojen päällä), piste alueen sisällä tai reunalla (± 8 yks. vain laajennuksessa), deterministinen', () => {
    for (const a of ALUEET) for (const n of [3, 4, 5, 6, 7]) {
      const v = S._pisteSijainnit(n, a), nimi = JSON.stringify(a) + ' n=' + n; expect(v, nimi).toHaveLength(n); expect(S._pisteSijainnit(n, a), nimi).toEqual(v);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) expect(dist(v[i], v[j]), nimi + ' päällekkäin ' + i + '/' + j).toBeGreaterThanOrEqual(S.PISTE_VALI - 0.01);
      v.forEach((p, i) => { expect(S._viivaEtaisyys(p[0], p[1]), nimi + ' viivalla ' + i).toBeGreaterThanOrEqual(2.7); expect(p[0], nimi).toBeGreaterThanOrEqual(a.x - 8.1); expect(p[0], nimi).toBeLessThanOrEqual(a.x + a.w + 8.1); expect(p[1], nimi).toBeGreaterThanOrEqual(a.y - 8.1); expect(p[1], nimi).toBeLessThanOrEqual(a.y + a.h + 8.1); });
    }
  });
  it('tavallisessa tapauksessa (keskusta, 5 pistettä) kaikki pisteet ovat alueen SISÄLLÄ tai reunalla, nimilaatan (alareunan) yläpuolella; järjestys a → e: rivit ylhäältä alas, rivin sisällä vasemmalta oikealle', () => {
    const a = { x: 25, y: 35, w: 50, h: 61 }, v = S._pisteSijainnit(5, a);
    v.forEach((p) => { expect(p[0]).toBeGreaterThanOrEqual(a.x); expect(p[0]).toBeLessThanOrEqual(a.x + a.w); expect(p[1]).toBeGreaterThanOrEqual(a.y); expect(p[1]).toBeLessThanOrEqual(a.y + a.h - 0.45 * 0 - 15 + 0.01 + 15 * 0); expect(p[1]).toBeLessThanOrEqual(a.y + a.h - Math.min(15, a.h * 0.45) + 0.01); });
    for (let i = 1; i < v.length; i++) { const e = v[i - 1], p = v[i]; expect(Math.abs(p[1] - e[1]) > 5 ? p[1] > e[1] : p[0] >= e[0], 'järjestys ' + i).toBe(true); }
    expect(S._pisteSijainnit(0, a)).toEqual([]);
  });
});
describe('tmKentta osaPisteet: napautettava piste, ei tilatekstiä', () => {
  const spec = { koko: 'puoli', ase: { alue: { x: 25, y: 35, w: 50, h: 40 }, nimi: 'X', tila: 'ok' }, osat: [{ k: 'a', x: 30, y: 45, tila: 'itsenaisesti', koodi: 'k1', teksti: 'Käännä pää: selitys' }, { k: 'b', x: 50, y: 45, tila: 'nyt', koodi: 'k2', teksti: 'Valitse' }, { k: 'c', x: 60, y: 55, koodi: 'k3', teksti: 'Ota pallo', arvioitu: false }], reitti: null, viikot: null, historia: [], lempipaikka: null, vaihtoehdot: null };
  const opts = { wrap: true, osaPisteet: true, osaFn: '_ktHavaintoLisaa', pid: 'p2', osaNimi: (t) => String(t).split(':')[0], osaTila: (x) => ({ itsenaisesti: 'osaa jo', nyt: 'tällä viikolla' }[x] || '') };
  it('button.kt-piste + kirjain; onclick = osaFn(pid, koodi) (sama kuin osarivi); aria-label "a · nimi · tila"; arvioimaton: .kt-piste-ei, aria ilman tilaa; ei tilatekstiä pisteessä', () => {
    const h = K.tmKentta(spec, opts);
    expect(h).toContain('<button type="button" class="kt-piste kt-piste-ok" data-kt-piste="k1"'); expect(h).toContain('aria-label="a · Käännä pää · osaa jo"'); expect(h).toContain('aria-label="b · Valitse · tällä viikolla"'); expect(h).toContain('aria-label="c · Ota pallo"');
    expect(h).toContain("onclick=\"_ktHavaintoLisaa(&quot;p2&quot;,&quot;k1&quot;)\""); expect(h).toMatch(/class="kt-piste kt-piste-nyt"/); expect(h).toMatch(/class="kt-piste kt-piste-ei"[^>]*>c</);
    expect(h).not.toMatch(/class="kt-osa[ "]/); expect(h.replace(/aria-label="[^"]*"/g, '')).not.toMatch(/osaa jo|tällä viikolla|itsenäisesti/);   // ei tilatekstiä piirretyssä sisällössä
  });
  it('ilman osaPisteet vanha tagipiirto ennallaan; ilman osaFn/pid → ei-napautettava span role=img', () => {
    expect(K.tmKentta(spec, { wrap: true })).toMatch(/class="kt-osa/); expect(K.tmKentta(spec, { wrap: true })).not.toContain('kt-piste');
    const h = K.tmKentta(spec, { wrap: true, osaPisteet: true }); expect(h).toContain('<span class="kt-piste'); expect(h).not.toContain('<button');
  });
  it('nimen sanaväli: .kt-ase b saa word-spacing (kapea Archivo nielaisi "1. kosketus" välilyönnin)', () => { expect(K.tmKenttaCss()).toMatch(/\.kt-ase b\{[^}]*word-spacing:\.2em/); });
});
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('Kentän pisteet uudella sivulla', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };
  const YV = { kuvaus: '1. kosketus', alue: { x: 25, y: 35, w: 50, h: 61 }, alue_avain: 'keskusta', asetti_uid: 'u1', asetettu_pvm: '2026-10-01' };
  const pel = () => PELAAJAT.map((x) => x.id === 'p2' ? Object.assign({}, x, { ydinvahvuus: YV, jaksofokus: Object.assign({}, x.jaksofokus, { osa_arviot: { y_h1: { a: 3, b: 2, c: 1 } } }) }) : x);
  it('pisteet a–e Kentällä: aria-label "a · Käännä pää pallon ollessa matkalla · osaa jo"; arvioimaton himmeä ja ilman tilatekstiä; ei päällekkäin (DOM-laatikot); sanaväli', async () => {
    await avaa(); try {
      for (const [w, h] of [[1280, 900], [390, 844]]) {
        const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', leveys: w, korkeus: h, pelaajat: pel() }); await p.waitForSelector('.kt-piste');
        expect(await p.locator('.kt-piste').count()).toBe(5); expect(await p.locator('.kt-piste').evaluateAll((e) => e.map((x) => x.textContent))).toEqual(['a', 'b', 'c', 'd', 'e']);
        expect(await p.locator('[data-kt-piste="a"]').getAttribute('aria-label')).toBe('a · Käännä pää pallon ollessa matkalla · osaa jo'); expect(await p.locator('[data-kt-piste="b"]').getAttribute('aria-label')).toMatch(/^b · Valitse: hyökkää palloa vastaan.* · tällä viikolla$/); expect(await p.locator('[data-kt-piste="c"]').getAttribute('aria-label')).toMatch(/ · myöhemmin$/);
        expect(await p.locator('[data-kt-piste="d"]').getAttribute('aria-label')).toBe('d · Suuntaa ensimmäinen kosketus seuraavaan toimintoon tai pois vastustajalta');   // arvioimaton: ei tilaa
        expect(await p.locator('.kt-piste.kt-piste-ei').count()).toBe(2); expect(await p.locator('[data-kt-piste="d"]').evaluate((e) => getComputedStyle(e).opacity)).toBe('0.5'); expect(await p.locator('[data-kt-piste="a"]').evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
        expect(await p.locator('.kt-t-kentta .kt-layer').evaluate((e) => e.innerText.replace(/\s/g, ''))).toBe('1.kosketusydinvahvuusabcde');   // pisteissä vain kirjain; ei tilatekstiä ("osaa jo" yms.)
        const bb = await p.locator('.kt-piste').evaluateAll((e) => e.map((x) => { const r = x.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }));
        for (let i = 0; i < bb.length; i++) for (let j = i + 1; j < bb.length; j++) { const a = bb[i], b = bb[j]; expect(a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3], 'päällekkäin ' + i + '/' + j + ' @' + w).toBe(false); }
        expect(await p.locator('.kt-ase b').evaluate((e) => parseFloat(getComputedStyle(e).wordSpacing))).toBeGreaterThan(0);
        expect(await p.evaluate(() => { const d = document.documentElement; return d.scrollWidth - d.clientWidth; })).toBeLessThanOrEqual(0); await sk.close();
      }
    } finally { await selain.close(); }
  }, 90000);
  it('pisteen napautus avaa SAMAN havaintosheetin kuin osarivin napautus (sama funktio _ktHavaintoLisaa): sama otsikko ja sama valittu osa', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: pel() }); await p.waitForSelector('.kt-piste');
      const sheetTila = async () => ({ otsikko: await p.locator('[id^="tsOtsikko_"]').first().innerText(), id: await p.locator('[data-ts-sheet]').first().getAttribute('data-ts-sheet'), osa: await p.locator('[data-kt-havainto-sheet-osa], #ktHavLause').count() });
      await p.locator('[data-kt-piste="c"]').click(); await p.waitForSelector('[data-ts-sheet]'); const piste = await sheetTila(); await p.locator('[data-ts-sulje]').click(); await p.waitForSelector('[data-ts-sheet]', { state: 'detached' });
      await p.locator('[data-kt-osa="c"]').click(); await p.waitForSelector('[data-ts-sheet]'); const rivi = await sheetTila();
      expect(piste).toEqual(rivi); expect(piste.otsikko).toMatch(/Viikkohavainto/); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('TM_KUVAT=1 · kuvat 1280 + 390 (tumma): Kenttä pisteineen', async () => {
    if (!process.env.TM_KUVAT) return; mkdirSync(KUVAT, { recursive: true }); await avaa(); try {
      for (const [n, w, h] of [['1280', 1280, 900], ['390', 390, 844]]) {
        const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', leveys: w, korkeus: h, pelaajat: pel() }); await p.waitForSelector('.kt-piste'); await p.waitForTimeout(300);
        await p.locator('.kt-t-kentta').scrollIntoViewIfNeeded(); await p.waitForTimeout(200); await p.screenshot({ path: join(KUVAT, 'tanaan-kentta-pisteet-' + n + '.png') }); await p.locator('.kt-t-kentta').screenshot({ path: join(KUVAT, 'kentta-pisteet-' + n + '.png') }); await sk.close();
      }
    } finally { await selain.close(); }
  }, 90000);
});
