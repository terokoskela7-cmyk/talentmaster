/* Pikakortti yhdelle näytölle (16.10.2026): asettelu mahtuu 390 × 660 -ikkunaan ilman vieritystä + palauteruutu + Tallenna → seuraava pelaaja.
   Selaintesti (Playwright + Chrome) vain kun TM_CHROME_TESTS ≠ '0' ja Chrome löytyy (kuten master_mobiili_asettelu). Firestore korvataan muistitynkällä sivun omassa kontekstissa;
   data, tallennus ja luonnos ajetaan sivun oikeilla funktioilla. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIVU = readFileSync(join(JUURI, 'TalentMaster_ADAR_Pikakortti.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));

describe('yksi näyttö · staattinen', () => {
  it('runko on näytön korkuinen sarake; ylätason otsikko, tikkaat, kortit ja yhteenveto poistettu; napit ≥ 44 px', () => {
    expect(SIVU).toMatch(/\.app\{[^}]*height:100dvh/);
    expect(SIVU).not.toMatch(/\.ladder\{|\.rung\b|\.dim-q\{|\.dim-k\{/);
    expect(SIVU).toMatch(/\.sc\{width:44px;height:44px;/);
    expect(SIVU).toMatch(/\.pt-rivi::after\{[^}]*height:44px/);   // Pelitilanne-rivin tap-alue 44 px
    expect(SIVU).toMatch(/\.save\{[^}]*min-height:48px/);
    expect((SIVU.match(/@media\s*\(max-width:\s*768px\)/g) || []).length).toBeLessThanOrEqual(1);
  });
  it('tallennus avaa seuraavan pelaajan eikä Tallennettu-näkymää (paitsi viimeinen)', () => {
    const f = SIVU.slice(SIVU.indexOf('async function _phTallenna('), SIVU.indexOf('window._phTallenna = _phTallenna'));
    expect(f).toContain('_phAvaaPelaaja(seuraava, true)'); expect(f).toContain('_phIlmoita(');
    expect(f.indexOf("S.naytto = 'ok'")).toBeGreaterThan(f.indexOf('if (seuraava)'));
  });
});

const SIVUT = [];
function sivuTiedosto() {
  if (SIVUT[0]) return SIVUT[0];
  const j = SIVU.indexOf('<head>') + 6, f = join(tmpdir(), 'yn_' + Math.random().toString(36).slice(2) + '.html');
  writeFileSync(f, SIVU.slice(0, j) + '<base href="file://' + JUURI + '/">' + SIVU.slice(j)); SIVUT.push(f); return f;
}

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('yksi näyttö · selain', () => {
  const { chromium } = require('playwright-core');
  const avaa = async (selain, opts) => {
    opts = opts || {};
    const ctx = await selain.newContext({ viewport: { width: opts.w || 390, height: opts.h || 660 }, colorScheme: opts.teema || 'light' });
    await ctx.addInitScript(([k, t]) => { try { localStorage.setItem('tm_kieli', k); } catch (e) { /* ei */ } document.addEventListener('DOMContentLoaded', () => document.documentElement.setAttribute('data-theme', t)); }, [opts.kieli || 'fi', opts.teema || 'light']);
    const p = await ctx.newPage(); await p.goto('file://' + sivuTiedosto(), { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(500);
    await p.evaluate(() => {
      const loki = window.__loki = [];
      const doc = (path) => ({ path, id: path.split('/').pop(), collection: (n) => col(path + '/' + n), get: async () => ({ exists: false, data: () => ({}), docs: [] }),
        set: async (d, o) => { loki.push({ op: 'set', path, d }); }, update: async (d) => { loki.push({ op: 'update', path, d }); },
        onSnapshot: (o, cb) => { setTimeout(() => cb({ metadata: { hasPendingWrites: !!window.__pending } }), 0); return () => {}; } });
      let n = 0; const col = (path) => ({ doc: (id) => doc(path + '/' + (id || 'a' + (++n))), get: async () => ({ docs: [] }) });
      window._PH_DB = { collection: (c) => col(c), batch: () => { const ops = []; return { set: (ref, d) => ops.push({ path: ref.path, d }), commit: () => { if (window.__hylkaa) return Promise.reject({ code: 'permission-denied' }); ops.forEach((o) => loki.push({ op: 'batch', path: o.path, d: o.d })); return Promise.resolve(); } }; } };
      window._PH_AUTH = { currentUser: { uid: 'u1', getIdToken: async () => 't', displayName: 'Valmentaja' } };
      window.firebase = { firestore: { FieldValue: { serverTimestamp: () => ({ __ts: 1 }), delete: () => ({ __del: 1 }) } } };
      window._tmSeuraId = 'kpv'; window._tmRooli = 'vp';
      const v = new Date().getFullYear() - 13;
      window._pelaajaMap = { a: { nimi: 'Aatu Aalto', syntymaVuosi: v }, b: { nimi: 'Bertta Bergman', syntymaVuosi: v }, c: { nimi: 'Cecilia Cederberg', syntymaVuosi: v } };
      _phTila.tehdyt = {}; _phTila.viimeisin = null; localStorage.clear();
    });
    return { ctx, p };
  };
  const selain = async (f) => { const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }); try { return await f(b); } finally { await b.close(); } };

  it('390 × 660: porras 1, 3 ja 4 kaikki pisteytettynä → sivu ei vieritä, lomake ei vieritä, napit ≥ 44 px; vaalea + tumma, fi + sv', async () => {
    await selain(async (b) => {
      const huonot = [];
      for (const kieli of ['fi', 'sv']) for (const teema of ['light', 'dark']) {
        const { ctx, p } = await avaa(b, { kieli, teema });
        for (const porras of [1, 3, 4]) {
          const r = await p.evaluate((porras) => {
            const S = window._phTila; _phAvaaPelaaja('a'); S.porras = porras; const dims = _phDimit(porras); dims.forEach((k, i) => (S.pisteet[k] = 1 + (i % 3))); S.fb = dims[dims.length - 1]; _phRender();
            const body = document.querySelector('.ph-body'), e = document.scrollingElement, sc = [...document.querySelectorAll('.sc')].map((x) => x.getBoundingClientRect());
            return { doc: e.scrollHeight - innerHeight, body: body.scrollHeight - body.clientHeight, rivit: dims.length, nappeja: sc.length, minLev: Math.min(...sc.map((x) => x.width)), minKork: Math.min(...sc.map((x) => x.height)) };
          }, porras);
          if (r.doc > 0 || r.body > 1 || r.nappeja !== r.rivit * 3 || r.minLev < 44 || r.minKork < 44) huonot.push([kieli, teema, porras, JSON.stringify(r)].join(' '));
        }
        await ctx.close();
      }
      expect(huonot).toEqual([]);
    });
  }, 120000);

  it('palauteruutu: pisteen painallus näyttää oikean ulottuvuuden ja tason, "Mitä näit?" heti, nimen napautus kysymyksen, vinkki avautuu', async () => {
    await selain(async (b) => {
      const { p } = await avaa(b); await p.evaluate(() => { _phAvaaPelaaja('a'); _phTila.porras = 3; _phRender(); });
      expect(await p.textContent('#ph-fb'), 'ennen painallusta himmeä kysymys').toContain('Havainnointi: Katsooko ylös');
      await p.click('[data-sc="D"][data-v="2"]');
      const t = await p.textContent('#ph-fb'); expect(t).toContain('Päätös · 2 Kehittyvä'); expect(t).toContain('Mitä näit?');
      expect(await p.locator('#ph-fb [data-chip="D"]').count(), 'valinnat näkyvät ilman avausta').toBe(4);
      await p.click('#ph-fb [data-chip="D"] >> nth=0'); expect(await p.evaluate(() => _phTila.havaitut.D.length)).toBe(1);
      await p.click('[data-dn="A"]'); expect(await p.textContent('#ph-fb')).toContain('Katsooko ylös ennen kuin saa pallon');
      await p.click('[data-sc="A"][data-v="3"]'); await p.click('[data-dn="A"]');
      const t2 = await p.textContent('#ph-fb'); expect(t2).toContain('Havainnointi · 3 Hallitsee'); expect(t2).toContain('Katsooko ylös');
      expect(await p.locator('.fb-tip').count()).toBe(0); await p.click('[data-vinkki="A"]'); expect(await p.locator('.fb-tip').count()).toBe(1);
    });
  }, 60000);

  it('viesti linkin takana: avaus näyttää kentän, teksti säilyy suljettuna ("Viesti ✓"), tallennus ei muutu', async () => {
    await selain(async (b) => {
      const { p } = await avaa(b); await p.evaluate(() => _phAvaaPelaaja('a'));
      expect(await p.locator('#ph-teksti').count()).toBe(0); await p.click('#ph-viesti'); await p.fill('#ph-teksti', 'Hyvä skannaus');
      await p.click('#ph-viesti'); expect(await p.locator('#ph-teksti').count()).toBe(0); expect(await p.textContent('#ph-viesti')).toContain('Viesti ✓');
      expect(await p.evaluate(() => _phTila.teksti)).toBe('Hyvä skannaus');
    });
  }, 60000);

  it('TALLENNA → seuraava pelaaja auki + ilmoitus (porras, näkyvyys) + nimirivin korostus; Kumoa ilmoituksesta palauttaa kumotun pelaajan arvot ja kirjoittaa tila:peruttu', async () => {
    await selain(async (b) => {
      const { p } = await avaa(b); await p.evaluate(() => { _phAvaaPelaaja('a'); _phTila.porras = 2; _phTila.pisteet = { A: 3, D: 1 }; _phTila.teksti = 'viesti'; _phTila.nakyvyys = false; _phTila.havaitut = { A: ['Katsoo ylös'] }; _phRender(); });
      await p.click('#ph-save'); await p.waitForTimeout(150);
      expect(await p.evaluate(() => _phTila.pelaajaId), 'seuraava pelaaja ei auennut').not.toBe('a'); expect(await p.evaluate(() => _phTila.naytto)).toBe('havainto');
      expect(await p.locator('.ph-pl.flash').count(), 'nimirivin korostus').toBe(1);
      const ilm = await p.textContent('#ph-ilm'); expect(ilm).toContain('Aatu Aalto tallennettu'); expect(ilm).toContain('vain valmentajille'); expect(ilm).toContain('Kumoa');
      const box = await p.locator('#ph-ilm-i').boundingBox(), foot = await p.locator('#ph-foot').boundingBox(); expect(box.y + box.height, 'ilmoitus alapalkin yläpuolella').toBeLessThanOrEqual(foot.y + 1);
      const hav = await p.evaluate(() => window.__loki.filter((x) => x.op === 'batch' && /havainnot/.test(x.path)).map((x) => x.d)); expect(hav.length).toBe(1); expect(hav[0].pisteet).toEqual({ A: 3, D: 1 });
      await p.click('#ph-ilm-kumoa'); await p.waitForTimeout(200);
      const S = await p.evaluate(() => ({ pid: _phTila.pelaajaId, pisteet: _phTila.pisteet, teksti: _phTila.teksti, havaitut: _phTila.havaitut, peruttu: _phTila.peruttu }));
      expect(S).toEqual({ pid: 'a', pisteet: { A: 3, D: 1 }, teksti: 'viesti', havaitut: { A: ['Katsoo ylös'] }, peruttu: true });
      expect(await p.evaluate(() => window.__loki.some((x) => x.op === 'update' && x.d.tila === 'peruttu'))).toBe(true);
      expect(await p.locator('#ph-ilm:not([hidden])').count()).toBe(0);
    });
  }, 60000);

  it('ilmoitus: porrasosa vain kun porras nousi; sulkeutuu napautuksella', async () => {
    await selain(async (b) => {
      const { p } = await avaa(b); await p.evaluate(() => { _phAvaaPelaaja('a'); _phTila.porras = 2; _phTila.porrasNostettu = true; _phTila.pisteet = { A: 2 }; _phTila.nakyvyys = true; _phRender(); });   // 0b: oletus pois → kytkin päälle erikseen
      await p.click('#ph-save'); await p.waitForTimeout(150); expect(await p.textContent('#ph-ilm')).toContain('Aatu Aalto tallennettu · porras 2 · pelaaja näkee');
      await p.click('#ph-ilm-i span'); expect(await p.locator('#ph-ilm:not([hidden])').count()).toBe(0);
      await p.evaluate(() => { _phTila.pisteet = { A: 1 }; _phRender(); }); await p.click('#ph-save'); await p.waitForTimeout(150); expect(await p.textContent('#ph-ilm')).not.toContain('porras');
    });
  }, 60000);
  it('Kumoa kesken toisen pelaajan pisteytyksen EI ylikirjoita sitä: keskeneräinen lomake talletetaan luonnokseksi (palkki + Avaa)', async () => {
    await selain(async (b) => {
      const { p } = await avaa(b); await p.evaluate(() => { _phAvaaPelaaja('a'); _phTila.pisteet = { A: 2 }; _phRender(); });
      await p.click('#ph-save'); await p.waitForTimeout(150);
      await p.click('[data-sc="A"][data-v="1"]');   // seuraavan pelaajan pisteytys alkaa
      const seur = await p.evaluate(() => _phTila.pelaajaId); await p.click('#ph-ilm-kumoa'); await p.waitForTimeout(200);
      expect(await p.evaluate(() => _phTila.pelaajaId)).toBe('a');
      expect(await p.locator('.vika').textContent(), 'keskeneräinen havainto ei hukkunut').toContain('Tallentamaton havainto');
      await p.click('.vika button >> nth=0'); expect(await p.evaluate(() => [_phTila.pelaajaId, _phTila.pisteet])).toEqual([seur, { A: 1 }]);
    });
  }, 60000);

  it('viimeinen pelaaja → Tallennettu-yhteenveto ("Kaikki havainnoitu tänään") ja Kumoa listasta; Kumoa-linkki pelaajalistan rivillä 10 min', async () => {
    await selain(async (b) => {
      const { p } = await avaa(b); await p.evaluate(() => { _phTila.tehdyt = { b: true, c: true }; _phAvaaPelaaja('a'); _phTila.pisteet = { A: 2 }; _phRender(); });
      await p.click('#ph-save'); await p.waitForTimeout(150);
      expect(await p.evaluate(() => _phTila.naytto)).toBe('ok'); expect(await p.textContent('.foot')).toContain('Kaikki havainnoitu tänään'); expect(await p.locator('#ph-undo').count()).toBe(1);
      await p.evaluate(() => { _phTila.naytto = 'valitse'; _phRender(); });
      expect(await p.locator('[data-kumoa="a"]').count(), 'Kumoa viimeksi tallennetun rivillä').toBe(1); expect(await p.locator('[data-kumoa]').count()).toBe(1);
      await p.evaluate(() => { _phTila.viimeisin.ms -= 11 * 60 * 1000; _phRender(); }); expect(await p.locator('[data-kumoa]').count(), '10 min jälkeen pois').toBe(0);
    });
  }, 60000);

  it('offline: ilmoituksen teksti "tallessa laitteella · lähtee, kun yhteys palaa"', async () => {
    await selain(async (b) => {
      const { ctx, p } = await avaa(b); await p.evaluate(() => { window.__pending = true; _phAvaaPelaaja('a'); _phTila.pisteet = { A: 2 }; _phRender(); });
      await ctx.setOffline(true); await p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true }); });
      await p.click('#ph-save'); await p.waitForTimeout(150);
      expect(await p.textContent('#ph-ilm')).toContain('Aatu Aalto tallessa laitteella · lähtee, kun yhteys palaa');
    });
  }, 60000);

  it('EPÄONNISTUNUT TALLENNUS seuraavan pelaajan lomakkeella: pysyvä palkki, lomaketta ei vaihdeta, Avaa palauttaa pisteet, toisen lomake säilyy', async () => {
    await selain(async (b) => {
      const { p } = await avaa(b); await p.evaluate(() => { window.__hylkaa = true; _phAvaaPelaaja('a'); _phTila.pisteet = { A: 3 }; _phTila.teksti = 'tärkeä'; _phRender(); });
      await p.click('#ph-save'); await p.waitForTimeout(100);
      const seur = await p.evaluate(() => _phTila.pelaajaId); expect(seur).not.toBe('a');
      await p.click('[data-sc="A"][data-v="2"]'); await p.waitForTimeout(300);   // seuraavan pelaajan aloitettu lomake
      expect(await p.evaluate(() => _phTila.pelaajaId), 'lomaketta vaihdettiin kesken pisteytyksen').toBe(seur);
      const palkki = await p.textContent('.vika[role="alert"]'); expect(palkki).toContain('Aatu Aalto: havaintoa ei tallennettu'); expect(palkki).toContain('Avaa');
      expect(await p.evaluate(() => _phTila.pisteet), 'seuraavan pelaajan valinta ylikirjoitettiin').toEqual({ A: 2 });
      await p.click('.vika button >> nth=0'); await p.waitForTimeout(100);
      expect(await p.evaluate(() => [_phTila.pelaajaId, _phTila.pisteet, _phTila.teksti])).toEqual(['a', { A: 3 }, 'tärkeä']);
      await p.evaluate(() => { window.__hylkaa = false; }); await p.click('#ph-save'); await p.waitForTimeout(200);
      expect(await p.locator('.vika[role="alert"]').count(), 'palkki poistuu kun luonnos on tallennettu').toBe(0);
    });
  }, 60000);

  it('Pelitilanne-rivi: kiinni oletuksena, tap-alue ≥ 44 px (::after), kiinni lisää enintään yhden rivin', async () => {
    await selain(async (b) => {
      const { p } = await avaa(b); await p.evaluate(() => { _phAvaaPelaaja('a'); _phTila.porras = 4; _phRender(); });
      expect(await p.locator('[data-pt]').count()).toBe(0);
      const k = await p.evaluate(() => { const e = document.getElementById('ph-pt-kansi'), cs = getComputedStyle(e, '::after'); return { h: e.getBoundingClientRect().height, osa: parseFloat(cs.height) }; });
      expect(k.h).toBeLessThanOrEqual(40); expect(k.osa, '::after-laajennus').toBeGreaterThanOrEqual(44);
      await p.click('#ph-pt-kansi'); expect(await p.locator('[data-pt]').count()).toBeGreaterThan(0);
    });
  }, 60000);
});
