/* Pikakortti: koko näyttö, teema ja visuaaliset korjaukset (17.10.2026, CODE_BRIEF_PIKAKORTTI_VISUAALI).
   Staattiset tarkistukset aina; selaintesti (Playwright + Chrome) kuten adar_pikakortti_yksi_naytto_selain. Data, tallennus ja kulku eivät muutu. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIVU = readFileSync(join(JUURI, 'TalentMaster_ADAR_Pikakortti.html'), 'utf8');
const MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));

describe('pikakortti visuaali · staattinen', () => {
  it('pistenapit: DM Sans, lining-nums + tabular-nums, paino 500, 20 px (ei Cormorantia numeroissa)', () => {
    const m = SIVU.match(/\.sc\{[^}]*\}/)[0];
    expect(m).toContain('font-family:var(--font-sans)'); expect(m).toContain('lining-nums tabular-nums'); expect(m).toContain('font-weight:500'); expect(m).toContain('font-size:20px');
    expect(m).not.toContain('font-serif');
  });
  it('teema: upotettuna isännältä + MutationObserver; itsenäisenä tm_teema → tm-theme → prefers-color-scheme → vaalea; kytkin tallentaa molempiin avaimiin', () => {
    expect(SIVU).toContain("parent.document.documentElement.getAttribute('data-theme')".replace('parent.', 'window.parent.'));
    expect(SIVU).toContain("new MutationObserver"); expect(SIVU).toContain("attributeFilter: ['data-theme']");
    expect(SIVU).toMatch(/_teemaLue\('tm_teema'\) \|\| _teemaLue\('tm-theme'\) \|\| \(tumma \? 'dark' : 'light'\)/);
    expect(SIVU).toMatch(/setItem\('tm_teema', uusi\); localStorage\.setItem\('tm-theme', uusi\)/);
  });
  it('täyttö --acc-fill (valitut pistenapit, Tallenna), --acc vain tekstinä (#1084)', () => {
    expect(SIVU).toMatch(/\.sc\[aria-pressed="true"\]\{background:var\(--acc-fill\)/); expect(SIVU).toMatch(/\.save\{[^}]*background:var\(--acc-fill\)/);
    expect(SIVU).toMatch(/:root\[data-theme="dark"\]\{[^}]*--acc-fill:#1A7A5E/);
  });
  it('Master: iframen tausta teemasta, puhelimella koko näyttö (padding 0, 100dvh, ei reunusta), otsikko 44 px ilman pelaajan nimeä, Android-takaisin sulkee', () => {
    const f = MASTER.slice(MASTER.indexOf('function _avaaPikakorttiUpotettu('), MASTER.indexOf('// I1 §5 — kertamigraatio'));
    expect(f).toContain('window.innerWidth <= 600'); expect(f).toContain("height:100vh;height:100dvh"); expect(f).toContain('border-radius:0'); expect(f).toContain("'0' : '12px'");
    expect(f).toContain('width:520px'); expect(f).toContain('height:88vh');
    expect(f).toContain('height:44px'); expect(f).toContain('env(safe-area-inset-top)'); expect(f).not.toContain('_pkPelaajaNimi');
    expect(f).toContain('background:var(--bg)'); expect(f).not.toContain('#111110');
    expect(f).toContain("history.pushState"); expect(f).toContain("'popstate'");
  });
  it('alapalkki: turva-alue alareunassa', () => { expect(SIVU).toMatch(/\.foot\{[^}]*max\(10px,env\(safe-area-inset-bottom\)\)/); });
  it('vierityspalkki piilossa (.ph-body)', () => { expect(SIVU).toContain('.ph-body{scrollbar-width:none;'); expect(SIVU).toContain('.ph-body::-webkit-scrollbar{display:none}'); });
});

const SIVUT = [];
function sivuTiedosto() {
  if (SIVUT[0]) return SIVUT[0];
  const j = SIVU.indexOf('<head>') + 6, f = join(tmpdir(), 'pv_' + Math.random().toString(36).slice(2) + '.html');
  writeFileSync(f, SIVU.slice(0, j) + '<base href="file://' + JUURI + '/">' + SIVU.slice(j)); SIVUT.push(f); return f;
}
const NIMET = { a: 'Aatu Aalto', b: 'Bertta Bergman', c: 'Cecilia Cederberg', d: 'Ahmed Elsaid Nassef', e: "Topias O'Koskela" };

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('pikakortti visuaali · selain', () => {
  const { chromium } = require('playwright-core');
  const selain = async (f) => { const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files'] }); try { return await f(b); } finally { await b.close(); } };
  const stubit = () => {
    const loki = window.__loki = [];
    const doc = (path) => ({ path, id: path.split('/').pop(), collection: (n) => col(path + '/' + n), get: async () => ({ exists: false, data: () => ({}), docs: [] }), set: async (d) => { loki.push({ path, d }); }, update: async (d) => { loki.push({ path, d }); }, onSnapshot: (o, cb) => { setTimeout(() => cb({ metadata: { hasPendingWrites: false } }), 0); return () => {}; } });
    let n = 0; const col = (path) => ({ doc: (id) => doc(path + '/' + (id || 'a' + (++n))), get: async () => ({ docs: [] }) });
    window._PH_DB = { collection: (c) => col(c), batch: () => ({ set() {}, commit: () => Promise.resolve() }) };
    window._PH_AUTH = { currentUser: { uid: 'u1', getIdToken: async () => 't', displayName: 'Valmentaja' } };
    window.firebase = { firestore: { FieldValue: { serverTimestamp: () => ({ __ts: 1 }), delete: () => ({ __del: 1 }) } } };
    window._tmSeuraId = 'kpv'; window._tmRooli = 'vp';
  };
  const avaa = async (b, opts) => {
    opts = opts || {};
    const ctx = await b.newContext({ viewport: { width: opts.w || 390, height: opts.h || 656 }, colorScheme: opts.systeemi || 'light' });
    await ctx.addInitScript((avaimet) => { try { Object.keys(avaimet).forEach((k) => localStorage.setItem(k, avaimet[k])); } catch (e) { /* ei */ } }, opts.ls || {});
    const p = await ctx.newPage(); await p.goto('file://' + sivuTiedosto() + (opts.haku || ''), { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(400);
    await p.evaluate(stubit);
    await p.evaluate((nimet) => {
      const v = new Date().getFullYear() - 13; window._pelaajaMap = {}; Object.keys(nimet).forEach((k) => (window._pelaajaMap[k] = { nimi: nimet[k], syntymaVuosi: v }));
      _phTila.tehdyt = {}; _phTila.viimeisin = null; localStorage.removeItem('tm_pk_luonnos'); _luonnosKirjoitaKaikki({});
    }, NIMET);
    return { ctx, p };
  };
  const luonnokset = (p, pidit, laheteys) => p.evaluate(([pidit, laheteys]) => {
    const m = _luonnosLueKaikki(); pidit.forEach((pid, i) => (m[pid] = { aika: Date.now() - i, laheteys: laheteys || 'luonnos', virhe: laheteys === 'epaonnistui' ? 'verkko' : '', tila: { pelaajaId: pid, porras: 1, pisteet: { A: 2 }, konteksti: 'harjoitus', havaitut: {}, teksti: '', nakyvyys: false } }));
    _luonnosKirjoitaKaikki(m); _phRender();
  }, [pidit, laheteys]);

  it('luonnoksia 0 / 1 / 3 → bannereita 0 / 1 / 1; ≤ 44 px; Näytä avaa listan (3 riviä) pelaajarivin alle ja lista sulkeutuu Avaa-painalluksella; epäonnistunut oma rivinsä', async () => {
    await selain(async (b) => {
      const { p } = await avaa(b); await p.evaluate(() => _phAvaaPelaaja('a'));
      expect(await p.locator('.vika').count()).toBe(0);
      await luonnokset(p, ['b']); expect(await p.locator('.vika').count()).toBe(1);
      expect(await p.textContent('.vika')).toContain('Tallentamaton havainto: Bertta Bergman');
      await luonnokset(p, ['b', 'c', 'd']);
      expect(await p.locator('.vika').count()).toBe(1); expect(await p.textContent('.vika')).toContain('3 tallentamatonta havaintoa');
      expect((await p.locator('.vika').boundingBox()).height).toBeLessThanOrEqual(44);
      await p.click('#ph-luonnokset-nayta');
      expect(await p.locator('#ph-luonnoslista .vika').count(), 'lista auki').toBe(3);
      const lista = await p.locator('#ph-luonnoslista').boundingBox(), pl = await p.locator('.ph-pl').boundingBox();
      expect(lista.y, 'lista pelaajarivin alla').toBeGreaterThanOrEqual(pl.y + pl.height - 1);
      await p.click('#ph-luonnoslista .vika button >> nth=0'); await p.waitForTimeout(100);
      expect(await p.locator('#ph-luonnoslista').count(), 'lista sulkeutuu kun luonnos avataan').toBe(0);
      // epäonnistunut tallennus pysyy omana rivinään vaikka luonnoksia on kolme
      await p.evaluate(() => { _phAvaaPelaaja('a'); });
      await luonnokset(p, ['b', 'c', 'd']); await luonnokset(p, ['e'], 'epaonnistui');
      expect(await p.locator('.vika[role="alert"]').count()).toBe(1); expect(await p.locator('.vika').count()).toBe(2);
    });
  }, 60000);

  it('390 × 656 (700 − Masterin 44 px): porras 1–4, luonnoksia 0 ja 2 → .ph-body ei vieritä, sivu ei vieritä; vaalea + tumma', async () => {
    await selain(async (b) => {
      const huonot = [];
      for (const teema of ['light', 'dark']) {
        const { ctx, p } = await avaa(b, { ls: { tm_teema: teema } });
        for (const lkm of [0, 2]) for (const porras of [1, 2, 3, 4]) {
          await p.evaluate(() => { _luonnosKirjoitaKaikki({}); _phAvaaPelaaja('a'); });
          if (lkm) await luonnokset(p, ['b', 'c']);
          const r = await p.evaluate((porras) => {
            const S = window._phTila; S.porras = porras; const dims = _phDimit(porras); dims.forEach((k, i) => (S.pisteet[k] = 1 + (i % 3))); S.fb = dims[dims.length - 1]; _phRender();
            const body = document.querySelector('.ph-body'), e = document.scrollingElement;
            return { doc: e.scrollHeight - innerHeight, body: body.scrollHeight - body.clientHeight };
          }, porras);
          if (r.doc > 0 || r.body > 1) huonot.push([teema, 'luonnoksia ' + lkm, 'porras ' + porras, JSON.stringify(r)].join(' '));
        }
        await ctx.close();
      }
      expect(huonot).toEqual([]);
    });
  }, 120000);

  it('pelaajarivi 50 px kahdella rivillä; pitkät nimet eivät katkea 390 px:llä; Pelitilanne 36 px ilman laatikkoa, valinnat oikealla acc-värillä; numerot DM Sans', async () => {
    await selain(async (b) => {
      const { p } = await avaa(b);
      for (const pid of ['d', 'e']) {
        await p.evaluate((pid) => _phAvaaPelaaja(pid), pid);
        const r = await p.evaluate(() => { const n = document.querySelector('.ph-pl .ph-name'), pl = document.querySelector('.ph-pl'); return { katkeaa: n.scrollWidth > n.clientWidth, h: pl.getBoundingClientRect().height, nimi: n.getBoundingClientRect().top < document.querySelector('.ph-pl .ph-meta').getBoundingClientRect().top }; });
        expect(r.katkeaa, pid + ' nimi katkeaa').toBe(false); expect(r.h).toBe(50); expect(r.nimi, 'nimi metan yläpuolella').toBe(true);
      }
      await p.evaluate(() => { _phAvaaPelaaja('a'); Object.assign(_phTila.pelitilanne, { vaihe: ['puolustus'], otos: '3_5' }); _phRender(); });
      const pt = await p.evaluate(() => { const r = document.querySelector('.pt-rivi'), c = getComputedStyle(r), mi = document.querySelector('.missa').getBoundingClientRect(), rb = r.getBoundingClientRect(), o = document.querySelector('.pt-r'); return { h: rb.height, reunus: c.borderTopWidth + c.borderLeftWidth, tausta: c.backgroundColor, vali: Math.round(rb.top - mi.bottom), oikea: o && o.textContent, oikeaVari: o && getComputedStyle(o).color, acc: getComputedStyle(document.documentElement).getPropertyValue('--acc').trim(), after: getComputedStyle(r, '::after').height }; });
      expect(pt.h).toBe(36); expect(pt.reunus).toBe('0px0px'); expect(pt.tausta).toBe('rgba(0, 0, 0, 0)'); expect(pt.vali).toBe(4); expect(pt.oikea).toBe('3–5 · Puolustus'); expect(pt.after).toBe('44px');
      const sc = await p.evaluate(() => { const c = getComputedStyle(document.querySelector('.sc')); return { f: c.fontFamily, n: c.fontVariantNumeric, w: c.fontWeight, s: c.fontSize }; });
      expect(sc.f).toContain('DM Sans'); expect(sc.n).toContain('lining-nums'); expect(sc.n).toContain('tabular-nums'); expect(sc.w).toBe('500'); expect(sc.s).toBe('20px');
    });
  }, 60000);

  it('luonnosrivin kontrasti ≥ 4,5:1 (teksti + linkit) vaalealla ja tummalla', async () => {
    await selain(async (b) => {
      for (const teema of ['light', 'dark']) {
        const { ctx, p } = await avaa(b, { ls: { tm_teema: teema } }); await p.evaluate(() => _phAvaaPelaaja('a')); await luonnokset(p, ['b']);
        const suhteet = await p.evaluate(() => {
          const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number), lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
          const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
          const taustat = []; for (let e = document.querySelector('.vika'); e; e = e.parentElement) taustat.push(rgb(getComputedStyle(e).backgroundColor));
          let pohja = [255, 255, 255]; taustat.reverse().forEach((c) => { const a = c.length > 3 ? c[3] : 1; if (a > 0) pohja = [0, 1, 2].map((i) => c[i] * a + pohja[i] * (1 - a)); });
          return ['.vika b', '.vika button'].map((q) => { const t = rgb(getComputedStyle(document.querySelector(q)).color), l1 = L(t), l2 = L(pohja); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); });
        });
        suhteet.forEach((s) => expect(s, teema).toBeGreaterThanOrEqual(4.5)); await ctx.close();
      }
    });
  }, 60000);

  it('teema: itsenäisenä tm-theme=dark ilman tm_teema → tumma; tm_teema voittaa; ei avaimia + vaalea järjestelmä → vaalea; kytkin kirjoittaa molemmat avaimet', async () => {
    await selain(async (b) => {
      const lue = (p) => p.evaluate(() => document.documentElement.getAttribute('data-theme'));
      let { ctx, p } = await avaa(b, { ls: { 'tm-theme': 'dark' } }); expect(await lue(p)).toBe('dark'); await ctx.close();
      ({ ctx, p } = await avaa(b, { ls: { 'tm-theme': 'dark', tm_teema: 'light' } })); expect(await lue(p)).toBe('light'); await ctx.close();
      ({ ctx, p } = await avaa(b, {})); expect(await lue(p)).toBe('light'); await ctx.close();
      ({ ctx, p } = await avaa(b, { systeemi: 'dark' })); expect(await lue(p)).toBe('dark');
      await p.evaluate(() => _vaihdaTeema()); expect(await p.evaluate(() => [localStorage.getItem('tm_teema'), localStorage.getItem('tm-theme')])).toEqual(['light', 'light']); await ctx.close();
    });
  }, 60000);

  it('upotettuna teema seuraa isäntää (alku + vaihto lennossa); oma kytkin piilossa', async () => {
    await selain(async (b) => {
      const ctx = await b.newContext({ viewport: { width: 390, height: 700 } }); const p = await ctx.newPage();
      const host = join(tmpdir(), 'pv_host_' + Math.random().toString(36).slice(2) + '.html');
      writeFileSync(host, '<!doctype html><html data-theme="dark"><body style="margin:0"><iframe id="f" src="file://' + sivuTiedosto() + '?embedded=1" style="width:390px;height:656px;border:0"></iframe></body></html>');
      await p.goto('file://' + host); await p.waitForTimeout(800);
      const f = p.frameLocator('#f'); const frame = p.frames().find((x) => x !== p.mainFrame());
      const lue = () => frame.evaluate(() => document.documentElement.getAttribute('data-theme'));
      expect(await lue(), 'alku: isäntä tumma').toBe('dark');
      expect(await frame.evaluate(() => getComputedStyle(document.getElementById('tm-topbar')).display), 'oma kytkin piilossa').toBe('none');
      await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light')); await p.waitForTimeout(200);
      expect(await lue(), 'vaihto lennossa').toBe('light');
      await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark')); await p.waitForTimeout(200);
      expect(await lue()).toBe('dark'); void f;
    });
  }, 60000);

  it('Master-modaali: 390 px → laatikko 390 × koko korkeus, ei taustaa; 1280 px → 520 px; otsikko 44 px; Android-takaisin sulkee', async () => {
    const lahde = MASTER.slice(MASTER.indexOf('function _pkHistPura('), MASTER.indexOf('// I1 §5 — kertamigraatio'));
    await selain(async (b) => {
      for (const [w, h, odotaLev, odotaKork] of [[390, 844, 390, 844], [1280, 800, 520, Math.round(800 * 0.88)]]) {
        const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
        await p.setContent('<html data-theme="dark"><body style="margin:0;background:#111"></body></html>');
        await p.evaluate((src) => {
          window._seuraId = 'kpv'; window.masterT = (x) => x; window._mEsc = (x) => x; window._pikakorttiRefresh = () => {}; window._pkPelaajaNimi = () => 'Nimi';
          (0, eval)(src + '\nwindow._avaa = _avaaPikakorttiUpotettu;'); window._avaa('p1');
        }, lahde);
        const r = await p.evaluate(() => { const m = document.getElementById('_pkModal'), bx = m.firstElementChild, hd = bx.firstElementChild; return { lev: Math.round(bx.getBoundingClientRect().width), kork: Math.round(bx.getBoundingClientRect().height), pad: getComputedStyle(m).padding, hdr: Math.round(hd.getBoundingClientRect().height), teksti: hd.textContent, hist: history.length }; });
        expect(r.lev).toBe(odotaLev); expect(Math.abs(r.kork - odotaKork)).toBeLessThanOrEqual(1); expect(r.hdr).toBe(44); expect(r.teksti).not.toContain('Nimi'); expect(r.pad).toBe(w <= 600 ? '0px' : '12px');
        if (w <= 600) { await p.goBack(); await p.waitForTimeout(200); expect(await p.evaluate(() => !!document.getElementById('_pkModal')), 'takaisin sulkee').toBe(false); }
        await ctx.close();
      }
    });
  }, 60000);
});
