/* K4a · Profiili-välilehti (selain, Playwright + Chrome; chrome-tests-job): Kehitystyopoyta.html OIKEANA sivuna, Firebase stubattu (tests/helpers/kt_sivu.mjs). Keksityt nimet (Demo FC).
   Fixturet: tests/helpers/k4a_fixturet.mjs (Topias-tyyppinen TK-testeineen · SJK-tyyppinen seuran testistö · vähän dataa · vanha data).
   Todistaa: välilehti Profiili (ei Näyttöä), yhteenveto + tasonauha + todistekortit, fokuskortti jakson mukaan, "Näytä kaikki mittaukset" suljettuna, luvut ≤ 30, linkitykset toimivat (ei Master-hyppyä paitsi nimetyt),
   haitari 390 px, tyhjät tilat, molemmat teemat, fi + sv, valmentaja + VP, silmin → pois, vanha /naytto ohjautuu. TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/k4a-profiili/ (390 tumma + 1280 vaalea). */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
import { K4A_PELAAJAT, TOPIAS, SJK, VAHAN, VANHA } from './helpers/k4a_fixturet.mjs';
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'k4a-profiili');
const SUODATA = (v) => v.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e));
const PEL = PELAAJAT.concat(K4A_PELAAJAT);
const DOKIT = { 'seurat/demo/testitapahtumat/t1': { tila: 'suljettu', luotu: 1 } };
const odota = async (p) => { await p.waitForSelector('[data-kn-naytto]', { timeout: 15000 }); await p.waitForSelector('[data-tc-kortti]', { timeout: 15000 }); };
const avaaProfiili = (selain, pid, o) => kaynnista(selain, Object.assign({ rooli: 'valmentaja', hash: '#pelaaja/' + pid + '/profiili', pelaajat: PEL, dokit: DOKIT }, o || {}));
const vaakaOk = (p) => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const nakyvat = (p, sel) => p.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.offsetParent !== null).length, sel);
const luvut = (p) => p.evaluate(() => {   // näkyvät luvut oletusnäkymässä (Näytä kaikki suljettuna): lehtielementit joissa numero, ei päivämääriä eikä otsikkorivin meta (PHV / joukkue / n/m)
  const juuri = document.querySelector('[data-kn-kortit]'); let n = 0;
  juuri.querySelectorAll('*').forEach((e) => { if (e.children.length || e.offsetParent === null) return; const t = e.textContent.trim(); if (!/\d/.test(t.replace(/\d{1,2}\.\d{1,2}\.(\d{4})?/g, ''))) return; /* päivämäärät eivät ole mittalukuja */ if (e.closest('.tc-raportti-rivi')) return; if (e.closest('[data-tc-kortti="d3"]')) return; /* K4e: Psyykkinen (D3) -taulukko (5 × PEL/VAL/VP, briiffi) on oma kortti eikä kuulu ≤ 30 mittaluvun rajaan — PM päättää rajan (raportissa) */ n++; });
  return n;
});
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K4a · Profiili uudella sivulla', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };
  it('1280 vaalea · Topias: välilehti Profiili (ei Näyttöä), yhteenveto, tasonauha, fokuskortti ylimpänä, Näytä kaikki suljettuna, luvut ≤ 30, ei vaakavieritystä', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await avaaProfiili(selain, TOPIAS.id, { teema: 'light' }); await odota(p);
      const tabit = await p.locator('[data-kt-valilehti]').evaluateAll((l) => l.map((e) => e.textContent.trim())); expect(tabit).toEqual(['Tänään', 'Polku', 'Profiili']);
      expect(await p.locator('[data-kt-valilehti="profiili"]').getAttribute('aria-selected')).toBe('true'); expect(await p.locator('[data-kt-valilehti="naytto"]').count()).toBe(0);
      const yht = await p.locator('.tc-s-yht').innerText(); expect(yht).toContain('Kuljetus ja laukaus'); expect(yht).toContain('Syöttö'); expect(yht).toContain('Kasvumittaus'); expect(yht).toMatch(/Testattu 4\.10\. · 2 vk(?! sitten)/);
      expect(await p.locator('.tc-nauha').count()).toBe(5); expect(await p.locator('[data-tc-nauha="kasvu"] .tc-bar i.tyhja').count()).toBe(1); expect(await p.locator('[data-tc-nauha="kasvu"]').innerText()).toContain('ei mitattu');
      expect(await p.locator('.tc-nauha-sek').innerText()).toContain('4,5 / 5');
      const kortit = await p.locator('[data-tc-kortti]').evaluateAll((l) => l.map((e) => e.getAttribute('data-tc-kortti'))); expect(kortit).toEqual(['tekninen', 'fyysinen', 'd3', 'peli', 'keho', 'kasvu']);
      expect(await p.locator('[data-tc-fokus]').getAttribute('data-tc-kortti')).toBe('tekninen'); expect(await p.locator('[data-tc-fokus] .tc-badge.f').innerText()).toBe('Jakson fokus · Harhauttaminen');
      expect(await p.locator('[data-tc-fokus] .tc-rivi').count()).toBe(4);   // fokuskortti: 4 riviä (mockup); muut ≤ 3
      for (const a of ['fyysinen', 'peli', 'keho']) expect(await p.locator('[data-tc-kortti="' + a + '"] .tc-rivi').count()).toBeLessThanOrEqual(a === 'peli' ? 4 : 3);   // K4a2: Peli näyttää kaikki ikätason ADAR-ulottuvuudet (13-v: 3) + psyykkinen arvio
      expect(await p.locator('.mk-tausta').count()).toBe(0);   // K4c: "Näytä kaikki mittaukset" avaa sheetin (suljettuna oletuksena); vanhaa raakalistaa ei ole
      expect(await p.locator('[data-kn-kaikki-avaa]').innerText()).toContain('Näytä kaikki mittaukset'); expect(await p.locator('[data-kn-kaikki]').count()).toBe(0);
      expect(await p.locator('[data-tc-raportti]').count()).toBe(1);
      const n = await luvut(p); console.log('K4a luvut oletusnäkymässä (Topias, 1280):', n); expect(n).toBeLessThanOrEqual(30); expect(n).toBeGreaterThan(8);
      expect(await vaakaOk(p)).toBe(true); expect(await p.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
      expect(await p.locator('.tc-k').first().evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');   // todellinen tokenisto, ei läpinäkyvä
      expect(await p.locator('.tc-lause').first().evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(/Cormorant/);
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it.each(['vp', 'super_admin'])('ROOLI %s: sama Profiili (seura-laajuus)', async (rooli) => {
    await avaa(); try {
      const { sk, p, virheet } = await avaaProfiili(selain, TOPIAS.id, { rooli }); await odota(p);
      expect(await p.locator('.tc-nauha').count()).toBe(5); expect(await p.locator('[data-tc-kortti]').count()).toBe(6); expect(await p.locator('.tc-s-yht').innerText()).toContain('Kuljetus ja laukaus');
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('LINKITYKSET: Näytä testihistoria avaa K2-lohkot · Kehityskohde (jakso käynnissä) → Polku · Ota puheeksi → Tänään · Pelaajaraportti/Mittaus = olemassa olevat kohteet', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await avaaProfiili(selain, TOPIAS.id); await odota(p);
      await p.locator('[data-tc-kortti="fyysinen"] [data-tc-toiminto="testihistoria"]').click(); await p.waitForSelector('.mk-tausta', { timeout: 8000 });   // K4c: sheet, Fyysinen-osio + kortin käyrän testi (30 m) auki
      expect(await p.locator('#mkH-fyysinen-lin30m').isVisible()).toBe(true); await p.locator('[data-mk-sulje]').click(); expect(await p.locator('.mk-tausta').count()).toBe(0);
      await p.locator('[data-tc-fokus] [data-tc-toiminto="polku"]').click(); await p.waitForFunction(() => /\/polku$/.test(location.hash)); expect(await p.locator('[data-kt-valilehti="polku"]').getAttribute('aria-selected')).toBe('true');
      await p.locator('[data-kt-valilehti="profiili"]').click(); await odota(p);
      await p.locator('[data-tc-kortti="peli"] [data-tc-toiminto="puheeksi"]').click(); await p.waitForFunction(() => /\/tanaan$/.test(location.hash));
      expect(await p.evaluate(() => typeof window._avaaPelaajaraportti === 'function' && typeof window._ktTcToimi === 'function')).toBe(true);
      await p.locator('[data-kt-valilehti="profiili"]').click(); await odota(p);
      await p.evaluate(() => { window.__avattu = []; window.open = (u) => { window.__avattu.push(u); return null; }; }); await p.locator('[data-tc-toiminto="mittaus"]').first().click();
      expect(await p.evaluate(() => window.__avattu)).toEqual(['TalentMaster_Testaus_v9.html?seura=demo&joukkue=Demo%20U13']);   // = Masterin _msFyysSuunnitteleMittaus (Testaus lukee seura + joukkue)
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('Ei jaksoa: "Syöttö seuraavan jakson aiheeksi" avaa Aloita jakso -sheetin, aihe Syöttäminen esivalittuna; sheetin sulkeminen ei tallenna mitään', async () => {
    await avaa(); try {
      const ILMAN = Object.assign({}, TOPIAS, { id: 'k4a_ei_jaksoa', jaksofokus: null });
      const { sk, p, virheet } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/k4a_ei_jaksoa/profiili', pelaajat: PELAAJAT.concat([ILMAN]), dokit: DOKIT }); await odota(p);
      expect(await p.locator('[data-tc-fokus]').count()).toBe(0);
      const nappi = p.locator('[data-tc-kortti="tekninen"] [data-tc-toiminto="jakso_aiheeksi"]'); expect(await nappi.innerText()).toBe('Syöttö seuraavan jakson aiheeksi');
      await nappi.click(); await p.waitForSelector('#_ajTaito', { timeout: 10000 });
      expect(await p.locator('#_ajTaito').inputValue()).toBe('y_h2');
      expect(await p.evaluate(() => (window.__kirj || []).length)).toBe(0);   // ei kirjoituksia
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('390 tumma · haitari: fokuskortti auki, muut yhden rivin tiivistelminä (napautus avaa); tasonauha ilman kattavuussaraketta; Pelaajaraportti tasonauhan alla', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await avaaProfiili(selain, TOPIAS.id, { leveys: 390, teema: 'dark' }); await odota(p);
      expect(await p.locator('[data-tc-fokus] .tc-rivi').count()).toBe(4); expect(await p.locator('[data-tc-fokus]').isVisible()).toBe(true);
      const auki = await p.locator('details.tc-k').evaluateAll((l) => l.map((e) => e.hasAttribute('open'))); expect(auki.length).toBe(5); expect(auki.every((x) => x === false)).toBe(true);
      expect(await nakyvat(p, 'details.tc-k > summary')).toBe(5); expect(await p.locator('details.tc-k > summary').first().innerText()).toMatch(/fyysinen/i);
      expect(await p.locator('.tc-kattavuus').first().isVisible()).toBe(false); expect(await p.locator('.tc-lyhyt').first().isVisible()).toBe(true);
      const y = async (s) => (await p.locator(s).boundingBox()).y; expect(await y('.tc-raportti-rivi')).toBeGreaterThan(await y('.tc-nauha-sek')); expect(await y('.tc-raportti-rivi')).toBeLessThan(await y('.tc-s-kortit'));
      await p.locator('details.tc-k[data-tc-kortti="peli"] > summary').click(); expect(await p.locator('details.tc-k[data-tc-kortti="peli"]').getAttribute('open')).not.toBeNull();
      expect(await p.locator('details.tc-k[data-tc-kortti="peli"] .tc-rivi').first().isVisible()).toBe(true);
      expect(await vaakaOk(p)).toBe(true); expect((await p.locator('.tc-act').first().boundingBox()).height).toBeGreaterThanOrEqual(44);   // kosketuskohde ≥ 44 px
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('1280: kaikki kortit auki (ei tiivistelmiä), yhteenveto 3 solua rinnakkain, kortit 2×2', async () => {
    await avaa(); try {
      const { sk, p } = await avaaProfiili(selain, TOPIAS.id, { leveys: 1280 }); await odota(p);
      expect(await nakyvat(p, 'details.tc-k > summary')).toBe(0); expect((await p.locator('details.tc-k').evaluateAll((l) => l.every((e) => e.hasAttribute('open'))))).toBe(true);
      const xs = await p.locator('.tc-yht-solu').evaluateAll((l) => l.map((e) => Math.round(e.getBoundingClientRect().x))); expect(new Set(xs).size).toBe(3);
      const k = await p.locator('.tc-ruudukko > details').evaluateAll((l) => l.map((e) => Math.round(e.getBoundingClientRect().x))); expect(new Set(k).size).toBe(2);
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('TYHJÄT TILAT 390: vähän dataa → yksi Mittauskierros puuttuu -kortti + Peli "Vähän dataa"; SJK-testistö → tekniikkanäyte, "ei normia", koonti kasvu + kehon valmius', async () => {
    await avaa(); try {
      let { sk, p, virheet } = await avaaProfiili(selain, VAHAN.id, { leveys: 390 }); await odota(p);
      expect(await p.locator('[data-tc-kortti="koonti"]').count()).toBe(1); const t = await p.locator('[data-tc-kortti="koonti"]').innerText(); expect(t).toMatch(/mittauskierros puuttuu/i); expect(t).toContain('Yksi mittauskierros täyttää neljä korttia kerralla.'); expect(t).toContain('~3 min');
      expect(await p.locator('.tc-s-yht').innerText()).toContain('Pelaajasta ei ole vielä mittauksia. Yksi pelihavainto on kirjattu.');
      expect(await p.locator('[data-tc-kortti="peli"]').innerText()).toContain('Vähän dataa'); expect(await p.locator('.tc-btn').count()).toBe(1);   // D147: yksi täytetty nappi
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
      ({ sk, p, virheet } = await avaaProfiili(selain, SJK.id, { leveys: 390 })); await odota(p);
      await p.locator('details[data-tc-kortti="tekninen"] > summary').click(); expect(await p.locator('[data-tc-kortti="tekninen"]').innerText()).toMatch(/tekniikkanäyte/i); expect(await p.locator('[data-tc-kortti="tekninen"]').innerText()).toContain('ei normia');
      const koonti = await p.locator('[data-tc-kortti="koonti"]').innerText(); expect(koonti).toContain('Kasvu ja kypsyys'); expect(koonti).toContain('Kehon valmius'); expect(koonti).not.toContain('Fyysinen'); expect(await p.locator('.tc-btn').count()).toBe(1);
      expect(await vaakaOk(p)).toBe(true); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('VANHA DATA (> 6 kk): ainoa toiminto "Päivitä mittaus" korteilla; amber-teksti', async () => {
    await avaa(); try {
      const { sk, p } = await avaaProfiili(selain, VANHA.id); await odota(p);
      for (const a of ['fyysinen', 'tekninen', 'keho']) { const k = p.locator('[data-tc-kortti="' + a + '"]'); expect(await k.locator('.tc-act').count(), a).toBe(1); expect(await k.locator('.tc-act').innerText(), a).toBe('Päivitä mittaus'); expect(await k.innerText(), a).toContain('mittaus yli 6 kk vanha'); }
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('FI + SV: sv-tilassa sivu renderöityy ruotsiksi ilman raakoja avaimia (erä 79 viety)', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await avaaProfiili(selain, TOPIAS.id, { dokit: Object.assign({}, DOKIT, { 'seurat/demo': { nimi: 'Demo FC', kieli: 'sv' } }) }); await odota(p);
      const t = await p.locator('[data-kn-naytto]').innerText(); expect(t).not.toMatch(/\btc_[a-z_0-9]+\b/); expect(t).not.toMatch(/\bkt_profiili\b/); expect(t.length).toBeGreaterThan(300);   // erä 79 viety: sv-tilassa sivu puhuu ruotsia (esim. Yhteenveto → Sammanfattning, Profiili → Profil)
      expect(t).toMatch(/sammanfattning/i); expect(await p.locator('[data-kt-valilehti="profiili"]').innerText()).toBe('Profil');
      expect(await p.locator('[data-kt-valilehti="profiili"]').count()).toBe(1);
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('PELAAJAN SILMIN: Profiili pois käytöstä (A8), 0 lukua; vanha #pelaaja/{pid}/naytto ohjautuu Profiiliin', async () => {
    await avaa(); try {
      const { sk, p } = await avaaProfiili(selain, TOPIAS.id); await odota(p);
      await p.locator('[data-kt-silmin]').click(); await p.waitForSelector('#ktNakyma.kt-silmin', { timeout: 8000 });
      expect(await p.locator('[data-kt-valilehti="profiili"]').isDisabled()).toBe(true); expect(await p.locator('[data-tc-kortti]').count()).toBe(0); expect(await p.locator('[data-kt-valilehti="tanaan"]').getAttribute('aria-selected')).toBe('true');
      await p.evaluate(() => { location.hash = '#pelaaja/k4a_topias/naytto'; }); await p.waitForTimeout(400); expect(await p.locator('[data-tc-kortti]').count()).toBe(0);   // silmin-tilassa edelleen pois
      await sk.close();
      const k2 = await avaaProfiili(selain, TOPIAS.id, { hash: '#pelaaja/k4a_topias/naytto' }); await odota(k2.p);
      expect(await k2.p.evaluate(() => location.hash)).toBe('#pelaaja/k4a_topias/profiili'); expect(await k2.p.locator('[data-kt-valilehti="profiili"]').getAttribute('aria-selected')).toBe('true'); await k2.sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('korttirenderin virhe näkyy viestinä (ei tyhjää); Profiili ei lataa testitapahtumia', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await avaaProfiili(selain, TOPIAS.id, { dokit: DOKIT }); await odota(p);
      expect(await p.locator('[data-tc-virhe]').count()).toBe(0);
      expect(await p.evaluate(() => window.__pyynnot.filter((x) => /testitapahtumat/.test(x)).length)).toBe(0);   // K4c: Profiili ei hae testitapahtumia (vanha raakalista ei ole täällä)
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('KUVAT 390 tumma + 1280 vaalea (TM_KUVAT=1)', async () => {
    if (!process.env.TM_KUVAT) return; mkdirSync(KUVAT, { recursive: true });
    await avaa(); try {
      for (const [pid, nimi, leveys, teema] of [[TOPIAS.id, 'topias-1280-vaalea', 1280, 'light'], [TOPIAS.id, 'topias-390-tumma', 390, 'dark'], [VAHAN.id, 'vahan-dataa-390-tumma', 390, 'dark'], [SJK.id, 'sjk-390-tumma', 390, 'dark']]) {
        const { sk, p } = await avaaProfiili(selain, pid, { leveys, teema, korkeus: 900 }); await odota(p); await p.waitForTimeout(800);
        await p.addStyleTag({ content: '#nvSide,[class*="nv-"],[id^="nv"]{display:none!important}.kt-ot{position:static!important}' });
        await p.locator('[data-kn-naytto]').screenshot({ path: join(KUVAT, 'profiili-' + nimi + '.png') });
        if (pid === TOPIAS.id && leveys === 390) { await p.locator('details.tc-k[data-tc-kortti="peli"] > summary').click(); await p.locator('[data-kn-naytto]').screenshot({ path: join(KUVAT, 'profiili-' + nimi + '-fokus-auki-peli-auki.png') }); }
        await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
});
