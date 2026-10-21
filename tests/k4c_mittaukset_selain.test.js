/* K4c · Kaikki mittaukset -sheet (selain, Playwright + Chrome; chrome-tests-job): Kehitystyopoyta.html OIKEANA sivuna, Firebase stubattu (tests/helpers/kt_sivu.mjs). Keksityt nimet (Demo FC).
   Fixturet: tests/helpers/k4c_fixturet.mjs (Topias-tyyppinen kaksi 30 m -mittausta · pitkä historia · SJK d1/d2 · Sibbo käsirata + 30 m · tyhjä pelaaja).
   Todistaa: koko ruudun sheet Profiilista, kiinteä otsikkorivi, suodatin, ankkurit (+ mobiilin sirut), rivin historia (käyrä ylöspäin ajoissa, "Pienempi aika on parempi", "Kehitysnopeutta ei arvioida"),
   "Näytä testihistoria" -syvälinkki, selaimen paluu/eteen/Esc, ristiinarvion lukko, tyhjät tilat, ei emojeita/⭐/"D1"/"D2"/"PHV"/"ketju" näkyvässä tekstissä, ei kirjoituksia. TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/k4c/. */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
import { K4C_PELAAJAT, TOPIAS, SJK, SIBBO, TYHJA, TOPIAS_PITKA } from './helpers/k4c_fixturet.mjs';
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'k4c');
const SUODATA = (v) => v.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e));
const LUKOLLINEN = Object.assign({}, TOPIAS_PITKA, { id: 'k4c_lukko', etunimi: 'Lukko', adar_arvioijat: TOPIAS_PITKA.adar_arvioijat.filter((a) => a.uid !== 'u1') });   // testikäyttäjä (u1) ei ole arvioinut → muiden pisteet lukossa
const PEL = PELAAJAT.concat(K4C_PELAAJAT, [LUKOLLINEN]);
const DOKIT = { 'seurat/demo/testitapahtumat/t1': { tila: 'suljettu', luotu: 1 } };
const avaaProfiili = (selain, pid, o) => kaynnista(selain, Object.assign({ rooli: 'valmentaja', hash: '#pelaaja/' + pid + '/profiili', pelaajat: PEL, dokit: DOKIT }, o || {}));
const odota = (p) => p.waitForSelector('[data-tc-kortti]', { timeout: 15000 });
const avaaSheet = async (p) => { await p.locator('[data-kn-kaikki-avaa]').click(); await p.waitForSelector('.mk-tausta', { timeout: 8000 }); };
const teksti = (p) => p.locator('.mk-tausta').innerText();
const KIELLETYT = (t) => { expect(t.replace(/[↗↘ⓘ]/g, '')).not.toMatch(/\p{Extended_Pictographic}/u); expect(t).not.toContain('⭐'); expect(t).not.toMatch(/\bD[123]\b/); expect(t).not.toMatch(/PHV|ketju|§|katselmus|IDP/i); expect(t).not.toMatch(/\b(mk|tc|kn)_[a-z_0-9]+\b/); };
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K4c · Kaikki mittaukset uudella sivulla', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };
  it('1280 vaalea · pitkä historia: nappi avaa koko ruudun sheetin; kiinteä otsikkorivi (nimi · joukkue · ikä, suodatin, viisi ankkuria), viisi osiota, taulukon sarakkeet; ei kirjoituksia', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await avaaProfiili(selain, TOPIAS_PITKA.id, { teema: 'light' }); await odota(p);
      expect(await p.locator('[data-kn-kaikki-avaa]').innerText()).toContain('Näytä kaikki mittaukset'); expect(await p.locator('.mk-tausta').count()).toBe(0);
      await avaaSheet(p);
      const vp = p.viewportSize(), laatikko = await p.locator('.mk-tausta').boundingBox(); expect(Math.round(laatikko.width)).toBe(vp.width); expect(Math.round(laatikko.height)).toBe(vp.height);   // koko ruutu
      expect(await p.locator('.mk-nimi').innerText()).toBe('Topi Pitkä'); expect(await p.locator('.mk-yla .mk-meta').first().innerText()).toBe('Demo U13 · 13 v'); expect(await p.locator('[data-mk-sulje]').innerText()).toBe('‹ Profiili');
      expect(await p.locator('[data-mk-ankkuri]').evaluateAll((l) => l.map((e) => e.textContent.trim()))).toEqual(['Kasvu ja kypsyys', 'Fyysinen', 'Tekninen', 'Peli', 'Kehon valmius']);
      expect(await p.locator('[data-mk-suod]').evaluateAll((l) => l.map((e) => e.textContent.trim()))).toEqual(['Kaikki', 'Tämä kausi']); expect(await p.locator('[data-mk-osio]').evaluateAll((l) => l.map((e) => e.getAttribute('data-mk-osio')))).toEqual(['kasvu', 'fyysinen', 'tekninen', 'peli', 'keho']);
      const otsikot = await p.locator('[data-mk-osio="fyysinen"] .mk-t > thead th').evaluateAll((l) => l.map((e) => e.textContent.trim())); expect(otsikot).toEqual(['Testi', 'Viimeisin', 'Taso', 'Edellinen', 'Muutos', 'Päivä', 'Mittauksia']);
      const rivi = p.locator('[data-mk-osio="fyysinen"] [data-mk-testi="lin30m"]'); expect(await rivi.innerText()).toContain('3,08 s'); expect(await rivi.innerText()).toContain('5 / 5'); expect(await rivi.innerText()).toContain('3,17 s'); expect(await rivi.innerText()).toContain('3 mittausta');
      expect(await p.locator('.mk-tausta').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
      await p.locator('.mk-tausta').evaluate((e) => { e.scrollTop = 900; }); expect(Math.round((await p.locator('.mk-yla').boundingBox()).y)).toBe(0);   // otsikkorivi kiinteä
      expect(await p.evaluate(() => (window.__kirj || []).length)).toBe(0); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('Topias (kaksi 30 m -mittausta): rivin napautus avaa historian — käyrä ylöspäin (ajoissa asteikko käännetty), "Pienempi aika on parempi", "Kehitysnopeutta ei arvioida", kaikki mittauskerrat', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await avaaProfiili(selain, TOPIAS.id); await odota(p); await avaaSheet(p);
      const h = p.locator('#mkH-fyysinen-lin30m'); expect(await h.isVisible()).toBe(false);
      await p.locator('[data-mk-osio="fyysinen"] [data-mk-testi="lin30m"]').click(); expect(await h.isVisible()).toBe(true); expect(await p.locator('[data-mk-testi="lin30m"] .mk-avaa').getAttribute('aria-expanded')).toBe('true');
      expect(await h.locator('[data-mk-kayra]').getAttribute('data-mk-suunta')).toBe('ylos');   // 3,17 → 3,08 s: pienempi aika on parempi → käyrä nousee
      const y = await h.locator('svg circle').evaluateAll((l) => l.map((c) => +c.getAttribute('cy'))); expect(y).toHaveLength(2); expect(y[1]).toBeLessThan(y[0]);
      const t = await h.innerText(); expect(t).toContain('Pienempi aika on parempi'); expect(t).toContain('Kehitysnopeutta ei arvioida: mittausten väli alle 2 kk'); expect(t).toContain('3,17 s → 3,08 s · 2 mittausta'); expect(t).not.toContain('/ kausi');
      expect(await h.locator('.mk-ht tbody tr').count()).toBe(2); expect(await h.locator('.mk-ht tbody tr').first().innerText()).toContain('4.10.2026'); expect(await h.locator('.mk-ht tbody tr').first().innerText()).toContain('H-H-testit');
      await p.locator('[data-mk-testi="lin30m"]').click(); expect(await h.isVisible()).toBe(false);   // toinen napautus sulkee
      await p.locator('[data-mk-osio="tekninen"] [data-mk-testi="syotto"]').click(); expect(await p.locator('#mkH-tekninen-syotto').count()).toBe(0);   // yksi mittaus: ei laajennusta
      expect(await p.locator('[data-mk-osio="tekninen"] [data-mk-testi="syotto"]').innerText()).toContain('1 mittaus');
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('pitkä historia: kehitysvauhti "/ kausi"; Tämä kausi -suodatin piilottaa viime kauden mittauksen ja palaa Kaikkiin; avoin rivi säilyy suodattimen vaihdossa', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await avaaProfiili(selain, TOPIAS_PITKA.id); await odota(p); await avaaSheet(p);
      await p.locator('[data-mk-testi="lin30m"]').click(); expect(await p.locator('#mkH-fyysinen-lin30m [data-mk-vauhti]').innerText()).toMatch(/ \/ kausi$/); expect(await p.locator('#mkH-fyysinen-lin30m .mk-ht tbody tr').count()).toBe(3);
      await p.locator('[data-mk-suod="kausi"]').click(); expect(await p.locator('[data-mk-suod="kausi"]').getAttribute('aria-pressed')).toBe('true');
      expect(await p.locator('#mkH-fyysinen-lin30m').isVisible()).toBe(true); expect(await p.locator('#mkH-fyysinen-lin30m .mk-ht tbody tr').count()).toBe(2); expect(await p.locator('[data-mk-testi="lin30m"]').innerText()).toContain('2 mittausta');
      expect(await teksti(p)).not.toContain('10.9.2025');
      await p.locator('[data-mk-suod="kaikki"]').click(); expect(await p.locator('#mkH-fyysinen-lin30m .mk-ht tbody tr').count()).toBe(3);
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('ANKKURI ja SYVÄLINKKI: ankkurisiru vierittää osioon (otsikkorivin alle); kortin "Näytä testihistoria" avaa sheetin, Fyysinen-osion ja 30 m -rivin; Sulje palauttaa Profiiliin', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await avaaProfiili(selain, TOPIAS_PITKA.id); await odota(p); await avaaSheet(p);
      await p.locator('[data-mk-ankkuri="peli"]').click(); await p.waitForTimeout(300);
      const yla = (await p.locator('.mk-yla').boundingBox()).height, ylaPeli = (await p.locator('[data-mk-osio="peli"]').boundingBox()).y; expect(ylaPeli).toBeGreaterThanOrEqual(0); expect(ylaPeli).toBeLessThan(yla + 60);
      await p.locator('[data-mk-sulje]').click(); expect(await p.locator('.mk-tausta').count()).toBe(0);
      await p.locator('[data-tc-kortti="fyysinen"] [data-tc-toiminto="testihistoria"]').click(); await p.waitForSelector('.mk-tausta');
      expect(await p.locator('#mkH-fyysinen-lin30m').isVisible()).toBe(true); expect(await p.locator('#mkH-fyysinen-cmj').isVisible()).toBe(false);
      const y = (await p.locator('[data-mk-osio="fyysinen"]').boundingBox()).y; expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(260);
      await p.keyboard.press('Escape'); await p.waitForSelector('.mk-tausta', { state: 'detached' });
      expect(await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-tc-toiminto'))).toBe('testihistoria');   // fokus palaa avaajaan
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('SELAIMEN PALUU: paluu sulkee sheetin (osoite ennallaan), eteen avaa uudelleen, Esc ja ‹ Profiili sulkevat; sheetin sisäinen toiminta ei lisää historiamerkintöjä', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await avaaProfiili(selain, TOPIAS_PITKA.id); await odota(p); const hash = await p.evaluate(() => location.hash);
      await avaaSheet(p); expect(await p.evaluate(() => location.hash)).toBe(hash);
      await p.locator('[data-mk-ankkuri="tekninen"]').click(); await p.locator('[data-mk-suod="kausi"]').click(); await p.locator('[data-mk-testi="lin30m"]').click();
      await p.goBack(); await p.waitForSelector('.mk-tausta', { state: 'detached' }); expect(await p.evaluate(() => location.hash)).toBe(hash); expect(await p.locator('[data-kt-valilehti="profiili"]').getAttribute('aria-selected')).toBe('true');   // yksi paluu riittää
      await p.goForward(); await p.waitForSelector('.mk-tausta'); await p.keyboard.press('Escape'); await p.waitForSelector('.mk-tausta', { state: 'detached' });
      await avaaSheet(p); await p.locator('[data-mk-sulje]').click(); await p.waitForSelector('.mk-tausta', { state: 'detached' }); expect(await p.evaluate(() => location.hash)).toBe(hash);
      expect(await p.locator('[data-tc-kortti]').count()).toBeGreaterThan(0); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('390 tumma: ankkurit vaakavieritteisinä siruina, ei sivun vaakavieritystä, otsikkorivi kiinteä, sirun napautus vierittää osioon, historia aukeaa; kosketuskohteet ≥ 44 px', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await avaaProfiili(selain, TOPIAS_PITKA.id, { leveys: 390, teema: 'dark' }); await odota(p); await avaaSheet(p);
      const sirut = await p.locator('.mk-sirut').evaluate((e) => ({ yli: e.scrollWidth > e.clientWidth, ox: getComputedStyle(e).overflowX, nowrap: getComputedStyle(e).whiteSpace })); expect(sirut).toEqual({ yli: true, ox: 'auto', nowrap: 'nowrap' });
      expect(await p.locator('.mk-tausta').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true); expect(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      for (const s of ['.mk-siru', '.mk-seg-b', '.mk-sulje']) expect((await p.locator(s).first().boundingBox()).height).toBeGreaterThanOrEqual(44);
      await p.locator('[data-mk-ankkuri="keho"]').click(); await p.waitForTimeout(300); expect((await p.locator('[data-mk-osio="keho"]').boundingBox()).y).toBeLessThan(p.viewportSize().height - 150);   // viimeinen osio ei voi vieriä otsikkorivin alle, mutta on näkyvissä expect(Math.round((await p.locator('.mk-yla').boundingBox()).y)).toBe(0);
      expect(await p.locator('[data-mk-osio="fyysinen"] .mk-c-ed').first().isVisible()).toBe(false);   // kapea: Edellinen ja Mittauksia siirtyvät riville / historiaan
      await p.locator('[data-mk-ankkuri="fyysinen"]').click(); await p.locator('[data-mk-osio="fyysinen"] [data-mk-testi="lin30m"]').click(); expect(await p.locator('#mkH-fyysinen-lin30m').isVisible()).toBe(true); expect(await p.locator('#mkH-fyysinen-lin30m [data-mk-kayra]').isVisible()).toBe(true);
      expect(await p.locator('.mk-tausta').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('PELI: ikätason ulottuvuudet, keskiarvo, lukittu Reagointi, arvioijasarakkeet (u1 on arvioinut); Psyykkinen arvio vain valmentaja + VP; rivi kehityskeskustelusta; Kehon valmius selkokielellä', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await avaaProfiili(selain, TOPIAS_PITKA.id); await odota(p); await avaaSheet(p);
      const peli = p.locator('[data-mk-osio="peli"]'); expect(await peli.locator('[data-mk-dim]').evaluateAll((l) => l.map((e) => e.getAttribute('data-mk-dim')))).toEqual(['a', 'd', 'ac', 'yht']); expect(await peli.locator('[data-mk-lukittu="r"]').innerText()).toContain('ei arvioida tällä portaalla');
      expect(await peli.locator('thead th.mk-arv').evaluateAll((l) => l.map((e) => e.textContent.trim()))).toEqual(['Testi Valmentaja', 'Veera Virta', 'Ville Peltola']); expect(await peli.innerText()).toContain('7 havaintoa · 3 arvioijaa');
      expect(await peli.locator('[data-mk-psyykkinen] tbody tr').count()).toBe(5); expect(await peli.locator('[data-mk-psyykkinen] thead').innerText()).not.toMatch(/pelaaja/i); expect(await peli.locator('[data-mk-oma]').innerText()).toBe('Pelaajan oma arvio ja valmentajien erot näkyvät kehityskeskustelussa');
      const keho = p.locator('[data-mk-osio="keho"]'); expect(await keho.locator('[data-mk-tuki]').innerText()).toBe('Eniten tukea: vartalon kierto · näkyy potkussa ja suunnanmuutoksissa'); expect(await keho.locator('[data-mk-testi="keho"]').innerText()).toContain('62 %');
      expect(await p.locator('[data-mk-osio="kasvu"] [data-mk-testi]').count()).toBe(3); KIELLETYT(await teksti(p));
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('RISTIINARVION LUKKO: kun käyttäjä ei ole arvioinut tässä kuussa, muiden pisteet ja nimet eivät ole DOMissa; lukkoteksti näkyy; VP-roolilla sama lukko, super_admin ohittaa', async () => {
    await avaa(); try {
      let { sk, p, virheet } = await avaaProfiili(selain, LUKOLLINEN.id); await odota(p); await avaaSheet(p);
      const html = await p.locator('.mk-tausta').innerHTML(); expect(html).not.toContain('Veera Virta'); expect(html).not.toContain('Ville Peltola'); expect(await p.locator('[data-mk-lukko]').innerText()).toContain('Arvioi ensin'); expect(await p.locator('thead th.mk-arv').count()).toBe(0);
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
      ({ sk, p } = await avaaProfiili(selain, LUKOLLINEN.id, { rooli: 'vp' })); await odota(p); await avaaSheet(p); expect(await p.locator('[data-mk-lukko]').count()).toBe(1); await sk.close();
      ({ sk, p } = await avaaProfiili(selain, LUKOLLINEN.id, { rooli: 'super_admin' })); await odota(p); await avaaSheet(p); expect(await p.locator('thead th.mk-arv').count()).toBe(2); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('SEURAKOHTAISET TESTISTÖT: SJK (10 m, 30 m, CMJ; juoksurata + pallorata ilman normia) ja Sibbo (käsirata + 30 m, vauhti); 1 mittaus -rivit ilman laajennusta', async () => {
    await avaa(); try {
      let { sk, p, virheet } = await avaaProfiili(selain, SJK.id); await odota(p); await avaaSheet(p);
      expect(await p.locator('[data-mk-osio="fyysinen"] [data-mk-testi]').evaluateAll((l) => l.map((e) => e.getAttribute('data-mk-testi')))).toEqual(['lin30m', 'cmj', 'lin10m']);
      expect(await p.locator('[data-mk-osio="tekninen"] [data-mk-testi]').evaluateAll((l) => l.map((e) => e.getAttribute('data-mk-testi')))).toEqual(['sm_juoksu', 'sm_pallo', 'sm_ero']); const ero = await p.locator('[data-mk-testi="sm_ero"]').innerText(); expect(ero).toContain('2,3 s'); expect(ero).toContain('ei normia');
      expect(await p.locator('.mk-avaa').count()).toBe(0); expect(await p.locator('[data-mk-osio="peli"] [data-mk-tyhja]').count()).toBe(1); expect(await p.locator('[data-mk-osio="keho"] [data-mk-tyhja]').count()).toBe(1); KIELLETYT(await teksti(p)); expect(SUODATA(virheet)).toEqual([]); await sk.close();
      ({ sk, p, virheet } = await avaaProfiili(selain, SIBBO.id, { leveys: 390 })); await odota(p); await avaaSheet(p);
      expect(await p.locator('[data-mk-osio="fyysinen"] [data-mk-testi]').evaluateAll((l) => l.map((e) => e.getAttribute('data-mk-testi')).sort())).toEqual(['kasirata', 'lin30m']);
      await p.locator('[data-mk-testi="kasirata"]').click(); expect(await p.locator('#mkH-fyysinen-kasirata').innerText()).toMatch(/\/ kausi/); KIELLETYT(await teksti(p)); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('TYHJÄ PELAAJA: vain tyhjät tilat (ei taulukoita); Kasvu = katkoviivakortti "Ei kasvumittauksia" + Suunnittele kasvumittaus (avaa Testauksen kuten kortit)', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await avaaProfiili(selain, TYHJA.id, { leveys: 390, teema: 'dark' }); await odota(p); await avaaSheet(p);
      expect(await p.locator('[data-mk-tyhja]').count()).toBe(5); expect(await p.locator('.mk-t').count()).toBe(0); const kasvu = p.locator('[data-mk-osio="kasvu"] [data-mk-tyhja]'); expect(await kasvu.innerText()).toContain('Ei kasvumittauksia'); expect(await kasvu.evaluate((e) => getComputedStyle(e).borderStyle)).toBe('dashed');
      await p.evaluate(() => { window.__avattu = []; window.open = (u) => { window.__avattu.push(u); return null; }; }); await kasvu.locator('button').click();
      expect(await p.evaluate(() => window.__avattu)).toEqual(['TalentMaster_Testaus_v9.html?seura=demo&joukkue=Demo%20U13']); KIELLETYT(await teksti(p)); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('SV + ROOLIT: sv-tilassa sheet renderöityy ilman raakoja avaimia; VP ja super_admin näkevät saman', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await avaaProfiili(selain, TOPIAS_PITKA.id, { dokit: Object.assign({}, DOKIT, { 'seurat/demo': { nimi: 'Demo FC', kieli: 'sv' } }) }); await odota(p); await avaaSheet(p);
      const t = await teksti(p); expect(t).not.toMatch(/\b(mk|tc|kn)_[a-z_0-9]+\b/); expect(t.length).toBeGreaterThan(300); expect(await p.locator('[data-mk-osio]').count()).toBe(5); expect(SUODATA(virheet)).toEqual([]); await sk.close();
      for (const rooli of ['vp', 'super_admin']) { const k = await avaaProfiili(selain, TOPIAS_PITKA.id, { rooli }); await odota(k.p); await avaaSheet(k.p); expect(await k.p.locator('[data-mk-osio]').count()).toBe(5); await k.sk.close(); }
    } finally { await selain.close(); }
  }, 120000);
  it('SILMIN: Profiilia (ja sheetiä) ei ole pelaajan silmin -tilassa', async () => {
    await avaa(); try {
      const { sk, p } = await avaaProfiili(selain, TOPIAS_PITKA.id); await odota(p); await p.locator('[data-kt-silmin]').click(); await p.waitForSelector('#ktNakyma.kt-silmin', { timeout: 8000 });
      expect(await p.locator('[data-kn-kaikki-avaa]').count()).toBe(0); expect(await p.locator('.mk-tausta').count()).toBe(0); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('KUVAT 1280 vaalea (30 m auki) + 390 tumma (rivi auki) (TM_KUVAT=1)', async () => {
    if (!process.env.TM_KUVAT) return; mkdirSync(KUVAT, { recursive: true });
    await avaa(); try {
      for (const [pid, nimi, leveys, teema, rivi] of [[TOPIAS_PITKA.id, 'pitka-1280-vaalea-30m-auki', 1280, 'light', 'lin30m'], [TOPIAS_PITKA.id, 'pitka-390-tumma-rivi-auki', 390, 'dark', 'lin30m'], [TOPIAS.id, 'topias-1280-vaalea-30m-auki', 1280, 'light', 'lin30m'], [TOPIAS.id, 'topias-390-tumma-rivi-auki', 390, 'dark', 'lin30m'], [SJK.id, 'sjk-390-tumma', 390, 'dark', null], [SIBBO.id, 'sibbo-1280-vaalea', 1280, 'light', 'kasirata'], [TYHJA.id, 'tyhja-390-tumma', 390, 'dark', null]]) {
        const { sk, p } = await avaaProfiili(selain, pid, { leveys, teema, korkeus: leveys === 390 ? 1500 : 1300 }); await odota(p); await avaaSheet(p);
        if (rivi) await p.locator('[data-mk-testi="' + rivi + '"]').click(); await p.waitForTimeout(500);
        await p.screenshot({ path: join(KUVAT, 'mittaukset-' + nimi + '.png') }); await sk.close();
      }
    } finally { await selain.close(); }
  }, 240000);
});
