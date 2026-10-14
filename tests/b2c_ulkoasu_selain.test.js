/* B2c · selain (Playwright + Chrome): kehitystyöpöytäsivun ulkoasu mockupin 22 v2 mukaan (D147, D244, D112, D152).
   Leveydet 1024 / 1280 / 390; tilat "ei jaksoa", "jakso käynnissä" ja "jakso + Kenttä". Firebase stubattu (tests/helpers/kt_sivu.mjs). */
import { describe, it, expect } from 'vitest';
import { kaynnista, selainKaynnista, CHROME, PELAAJAT } from './helpers/kt_sivu.mjs';
const odota = (p) => p.waitForSelector('.kt-nimi', { timeout: 15000 });
const LEVEYDET = [[1024, 900], [1280, 900], [390, 844]];
const ALUE = { x: 30, y: 48, w: 40, h: 30 };
const pelaajatKentalla = () => PELAAJAT.map((x) => x.id === 'p2' ? Object.assign({}, x, { ydinvahvuus: { kuvaus: 'Hyvä 1. kosketus', alue: ALUE, havaittu_pvm: '2026-10-01', rooli: 'valmentaja' } }) : x);
const TILAT = [['ei jaksoa', 'p1', null], ['jakso käynnissä', 'p2', null], ['jakso + Kenttä', 'p2', pelaajatKentalla]];
const rgb = (p, sel, prop) => p.evaluate(([s, pr]) => getComputedStyle(document.querySelector(s))[pr], [sel, prop]);
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('B2c · ulkoasu', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };
  it('EI VAAKAVIERITYSTÄ: 1024, 1280 ja 390 px × kolme tilaa (dokumentti, #ktJuuri ja sisältöruudukko mahtuvat näkymään)', async () => {
    await avaa(); try {
      for (const [w, h] of LEVEYDET) for (const [nimi, pid, pel] of TILAT) {
        const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/' + pid + '/tanaan', leveys: w, korkeus: h, pelaajat: pel ? pel() : undefined }); await odota(p); await p.waitForTimeout(300);
        const m = await p.evaluate(() => { const d = document.documentElement, g = document.querySelector('.kt-tanaan'), r = g.getBoundingClientRect(); return { dok: d.scrollWidth - d.clientWidth, juuri: document.getElementById('ktJuuri').scrollWidth - document.getElementById('ktJuuri').clientWidth, oikea: r.right - d.clientWidth }; });
        expect(m.dok, nimi + ' ' + w + ' dokumentti').toBeLessThanOrEqual(0); expect(m.juuri, nimi + ' ' + w + ' #ktJuuri').toBeLessThanOrEqual(0); expect(m.oikea, nimi + ' ' + w + ' ruudukko').toBeLessThanOrEqual(0);
        await sk.close();
      }
    } finally { await selain.close(); }
  }, 180000);
  it('Otsikkorivi: "Aloita jakso" ja "Merkitse havainto" pois (D147: toiminto vain kortissa); jäljellä ⋯, Pelaajan silmin ja ×; korttinappi toimii', async () => {
    await avaa(); try {
      for (const [pid, kortti] of [['p1', 'aloita'], ['p2', null]]) {
        const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/' + pid + '/tanaan' }); await odota(p);
        expect(await p.locator('.kt-ot [data-kt-ensisijainen]').count()).toBe(0);
        expect(await p.locator('.kt-ot-rivi button:visible, .kt-ot-rivi summary:visible').evaluateAll((e) => e.map((x) => x.textContent.trim()).filter((t) => !/^[‹›]$/.test(t)))).toEqual(['⋯', 'Pelaajan silmin', '×']);
        if (kortti) { expect(await p.locator('.kt-sig [data-kt-signaali-nappi="aloita"]').count()).toBe(1); await p.locator('.kt-sig [data-kt-signaali-nappi="aloita"]').click(); await p.waitForSelector('#_ajTaito'); }
        await sk.close();
      }
    } finally { await selain.close(); }
  }, 60000);
  it('"+ Havainto" on vasemmassa laidassa täytettynä nappina (#1A7A5E + valkoinen teksti), ei otsikkorivin päällä; Työkalut oletuksena kiinni', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan' }); await odota(p);
      expect(await p.locator('#nvSide .nv-plus').count()).toBe(1); expect(await p.locator('.h-top .nv-plus, #nvPlus').count()).toBe(0);
      const b = await p.locator('#nvSide .nv-plus').boundingBox(), sb = await p.locator('#sidebar').boundingBox(); expect(b.x).toBeGreaterThanOrEqual(sb.x); expect(b.x + b.width).toBeLessThanOrEqual(sb.x + sb.width);
      expect(await rgb(p, '#nvSide .nv-plus', 'backgroundColor')).toBe('rgb(26, 122, 94)'); expect(await rgb(p, '#nvSide .nv-plus', 'color')).toBe('rgb(255, 255, 255)');
      expect(await p.locator('#nvSide .nv-tyokalut').count()).toBe(0);   // Työkalut kiinni
      expect(await p.locator('[data-nv-tyokalut]').getAttribute('class')).not.toMatch(/auki/);
      // täytetty nappi kaikkialla sama: signaalikortin nappi ja Aloita jakso
      await sk.close();
      const k = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p1/tanaan' }); await odota(k.p);
      expect(await rgb(k.p, '.kt-sig .kt-btn', 'backgroundColor')).toBe('rgb(26, 122, 94)'); expect(await rgb(k.p, '.kt-sig .kt-btn', 'color')).toBe('rgb(255, 255, 255)');
      await k.sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('Ruudukko: ilman Kenttää EI tyhjää vasenta palstaa (yksi sarake, Ydinasiat koko leveydelle); Kentän kanssa mockupin kaksi saraketta; sisältö alkaa samasta reunasta kuin otsikkorivi', async () => {
    await avaa(); try {
      for (const [w] of [[1024], [1280]]) {
        const a = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', leveys: w }); await odota(a.p);
        const m = await a.p.evaluate(() => { const g = document.querySelector('.kt-tanaan'), o = document.querySelector('.kt-ot-rivi').getBoundingClientRect(), gr = g.getBoundingClientRect(), osat = document.querySelector('.kt-osat').getBoundingClientRect(), sig = document.querySelector('.kt-sig').getBoundingClientRect(); return { luokka: g.className, vasen: gr.left - o.left, osatLev: osat.width / gr.width, sigLev: sig.width / gr.width, tyhja: document.querySelector('.kt-t-oikea').getBoundingClientRect().left - gr.left }; });
        expect(m.luokka).toMatch(/kt-ei-kenttaa/); expect(Math.abs(m.vasen)).toBeLessThanOrEqual(1); expect(m.osatLev).toBeGreaterThan(0.97); expect(m.sigLev).toBeGreaterThan(0.97); expect(m.tyhja).toBeLessThanOrEqual(1);   // oikea sarake alkaa ruudukon vasemmasta reunasta
        await a.sk.close();
        const b = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', leveys: w, pelaajat: pelaajatKentalla() }); await odota(b.p);
        const n = await b.p.evaluate(() => { const g = document.querySelector('.kt-tanaan'), k = document.querySelector('.kt-t-kentta').getBoundingClientRect(), o = document.querySelector('.kt-t-oikea').getBoundingClientRect(); return { luokka: g.className, kentta: k.width, oikea: o.width, vasen: k.left - document.querySelector('.kt-ot-rivi').getBoundingClientRect().left }; });
        expect(n.luokka).not.toMatch(/kt-ei-kenttaa/); expect(n.kentta).toBeGreaterThan(200); expect(n.oikea).toBeGreaterThan(n.kentta); expect(Math.abs(n.vasen)).toBeLessThanOrEqual(1);
        await b.sk.close();
      }
    } finally { await selain.close(); }
  }, 90000);
  it('Tekstit ja värit: "Ydinasiat tulevat, kun jakso alkaa." · "Ensimmäinen jakso: aloita tästä" (ei "Ei tietoa — aloita jakso"); yläotsikot ink3 (ei turkoosi); "Ei jaksoa" -siru amber-reunalla; korttien reunat yhtenäiset, Seuraava askel neutraali ja yhtenäinen (ei katkoviivaa)', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p1/tanaan' }); await odota(p);
      const t = await p.evaluate(() => document.body.innerText); expect(t).toContain('Ydinasiat tulevat, kun jakso alkaa.'); expect(t).toContain('Ensimmäinen jakso: aloita tästä'); expect(t).not.toContain('Ei tietoa — aloita jakso'); expect(t).not.toContain('Osat tulevat jakson mukana');
      const v = await p.evaluate(() => {
        const probe = document.createElement('i'); probe.style.color = 'var(--ink3)'; document.body.appendChild(probe); const ink3 = getComputedStyle(probe).color, amber = (probe.style.color = 'var(--amber)', getComputedStyle(probe).color); probe.remove();
        const cs = (s) => getComputedStyle(document.querySelector(s));
        return { ink3, amber, eb: cs('.kt-eb').color, siru: cs('[data-kt-rivitila="ei_jaksoa"]').borderTopColor, sigBr: cs('.kt-sig').borderTopColor, sigStyle: cs('.kt-sig').borderTopStyle, jkBr: cs('.kt-jk').borderTopColor, sigW: cs('.kt-sig').borderTopWidth, jkW: cs('.kt-jk').borderTopWidth, sigR: cs('.kt-sig').borderTopLeftRadius, jkR: cs('.kt-jk').borderTopLeftRadius };
      });
      expect(v.eb).toBe(v.ink3); expect(v.siru).toBe(v.amber); expect(v.sigStyle).toBe('solid'); expect(v.sigBr).toBe(v.jkBr); expect(v.sigW).toBe(v.jkW); expect(v.sigR).toBe(v.jkR);
      await sk.close();
      const q = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan' }); await odota(q.p);
      const w = await q.p.evaluate(() => { const cs = (s) => getComputedStyle(document.querySelector(s)); return [cs('.kt-sig').borderTopColor, cs('.kt-q').borderTopColor, cs('.kt-osa-r:not(.on)').borderTopColor, cs('.kt-jk').borderTopColor, cs('.kt-q').borderTopLeftRadius, cs('.kt-osa-r').borderTopLeftRadius, cs('.kt-jk').borderTopLeftRadius, cs('.kt-sig').borderTopWidth, cs('.kt-q').borderTopWidth, cs('.kt-osa-r').borderTopWidth]; });
      expect(new Set(w.slice(0, 4)).size).toBe(1); expect(new Set(w.slice(4, 7)).size).toBe(1); expect(new Set(w.slice(7)).size).toBe(1);
      await q.sk.close();
    } finally { await selain.close(); }
  }, 60000);
});
