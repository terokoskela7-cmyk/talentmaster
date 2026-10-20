/* K1 · selain (Playwright + Chrome; chrome-tests-job): klipin lähetys sheetinä uudella sivulla, Työkalut-deeplinkit, alueen aukot, kuorma-deeplinkki ja "klikkaa jokainen nappi" -läpikäynti.
   Firebase stubattu (tests/helpers/kt_sivu.mjs), ei ulkoverkkoa. TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/k1/ (390 tumma + 1280 vaalea). Vain keksityt nimet (Demo FC). */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'k1');
const SUODATA = (v) => v.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e));
const odota = (p) => p.waitForSelector('.kt-nimi', { timeout: 15000 });
const kuva = async (p, nimi) => { if (!process.env.TM_KUVAT) return; await p.waitForTimeout(600); mkdirSync(KUVAT, { recursive: true }); await p.screenshot({ path: join(KUVAT, nimi + '.png') }); };
const P = (id, o) => PELAAJAT.map((p) => p.id === id ? { ...p, suostumusTila: 'annettu', ...o } : p);
const ALUE = { x: 25, y: 0, w: 50, h: 35 };
/* Master-sivu korvataan tyhjällä, jotta hyppy näkyy URL:ssa eikä lataa oikeaa Masteria (rekisteröitynä myöhemmin → ajetaan ensin) */
const masterKorvaus = (p) => p.route(/TalentMaster_Master_v16\.html/, (r) => r.fulfill({ contentType: 'text/html', body: '<html><body>master-tynkä</body></html>' }));
const masterissa = (p) => /TalentMaster_Master_v16\.html/.test(p.url());
const KLIPPI_ID = '[data-mv-url]';

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K1 · klippi, työkalut, alue, kuorma', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };

  it('Polku → ⋯ → Lisää klippi: sheet paikallaan (ei Masteriin); virheellinen linkki → toast eikä kirjoitusta; onnistunut lähetys = YKSI batch (fromNimi, nakyvyys, ei lukuja), klippi näkyy heti Polun listassa ilman latausta', async () => {
    await avaa(); try {
      const { sk, p, virheet } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/polku', pelaajat: P('p2') }); await masterKorvaus(p);
      await p.waitForSelector('[data-kt-polku]', { timeout: 15000 }); await p.waitForSelector('[data-kt-klipit="tyhja"]', { timeout: 10000 });
      await p.evaluate(() => { window.__eiLatausta = 'x'; });
      await p.locator('.kt-pk-valikko > summary').click(); await p.locator('[data-kt-lisaa-klippi]').click();
      await p.waitForSelector(KLIPPI_ID);
      expect(await p.locator('[role="dialog"]').count()).toBe(1); expect(await p.locator('#ktKlippi, [data-mv-runko]').count()).toBeGreaterThan(0);
      expect(masterissa(p)).toBe(false);
      expect(await p.locator('[data-mv-kohde]').count()).toBe(1);   // vain tämä pelaaja: ei Valitut/Joukkue-valintoja
      expect(await p.locator('[data-mv-kohde="yksi"]').innerText()).toBe('Bertta Bergh');
      await kuva(p, 'klippi_sheet_1280_tumma');
      await p.locator('[data-mv-laheta]').click(); await p.waitForTimeout(300);   // tyhjä linkki
      expect(await p.evaluate(() => (window.__batch || []).length)).toBe(0); expect(await p.locator('#toast-wrap').innerText()).toMatch(/Liitä klipin linkki/);
      await p.locator(KLIPPI_ID).fill('http://ei-https.example/x'); await p.locator('[data-mv-laheta]').click(); await p.waitForTimeout(300);
      expect(await p.locator('#toast-wrap').innerText()).toMatch(/https/); expect(await p.evaluate(() => (window.__batch || []).length)).toBe(0);
      await p.locator(KLIPPI_ID).fill('https://app.veo.co/matches/x/?t=95'); expect(await p.locator('[data-mv-tunnistus]').innerText()).toMatch(/veo\.co/);
      await p.locator('[data-mv-tyyppi="prosessi"]').click(); await p.locator('[data-mv-pohja="1"]').click();
      expect(await p.locator(KLIPPI_ID).inputValue()).toBe('https://app.veo.co/matches/x/?t=95');   // tyypin vaihto ei hävitä linkkiä
      await p.locator('[data-mv-saate]').fill('Katso 1:35'); await p.locator('[data-mv-laheta]').click();
      await p.waitForFunction(() => (window.__batch || []).length === 1, null, { timeout: 8000 });
      const ops = await p.evaluate(() => window.__batch[0]); expect(ops).toHaveLength(1); expect(ops[0].path).toMatch(/^seurat\/demo\/viestit\//);
      const d = ops[0].set; expect(d).toMatchObject({ tyyppi: 'klippi', pelaajaId: 'p2', domain: 'app.veo.co', klippityyppi: 'prosessi', kohta_s: 95, saate: 'Katso 1:35', fromRole: 'valmentaja', fromNimi: 'Testi Valmentaja', lahde: 'linkki', tila: 'lahetetty', luettu: false });
      expect(d.nakyvyys).toBe('pelaaja'); expect(d.kysymys).toBeTruthy(); expect(d.kysymys_avain).toMatch(/^mv_pohja_prosessi_/); expect(d.aika).toBe('TS');
      expect(/@/.test(JSON.stringify(d.fromNimi))).toBe(false);   // #1096: ei sähköpostia
      await p.waitForSelector(KLIPPI_ID, { state: 'detached', timeout: 5000 });   // sheet sulkeutui
      expect(await p.locator('#toast-wrap').innerText()).toMatch(/Klippi lähetetty ✓/);
      expect(await p.locator('[data-kt-klipit="ok"]').count()).toBe(1); expect(await p.locator('[data-kt-klippi]').count()).toBe(1);   // näkyy heti, ei uutta latausta
      expect(await p.evaluate(() => window.__eiLatausta)).toBe('x'); expect(masterissa(p)).toBe(false);
      expect(await p.locator('[data-kt-klippi]').first().innerText()).toMatch(/Testi Valmentaja · 19\.10\. · lähetetty/);   // tekijä (fromNimi) + päivä + tila
      await kuva(p, 'klippi_polussa_1280_tumma');
      expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 90000);

  it('AJASTUS klo 21–7: klo 22:30 lähetetty klippi tallentuu heti mutta näkyy pelaajalle vasta klo 7; toast ja Polun rivi kertovat ajan; klo 12 ei ajastusta', async () => {
    await avaa(); try {
      for (const [h, ajastettu] of [[22, true], [12, false]]) {
        const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/polku', pelaajat: P('p2') });
        await p.waitForSelector('[data-kt-klipit="tyhja"]', { timeout: 10000 });
        await p.evaluate((hh) => { const K = Date, t = new K(2026, 9, 19, hh, 30).getTime(); window.Date = class extends K { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } }; }, h);   // paikallinen kellonaika → sama TZ:ssa kuin lib
        await p.locator('.kt-pk-valikko > summary').click(); await p.locator('[data-kt-lisaa-klippi]').click(); await p.waitForSelector(KLIPPI_ID);
        await p.locator(KLIPPI_ID).fill('https://youtu.be/abc'); await p.locator('[data-mv-pohja="0"]').click(); await p.locator('[data-mv-laheta]').click();
        await p.waitForFunction(() => (window.__batch || []).length === 1, null, { timeout: 8000 });
        const toast = await p.locator('#toast-wrap').innerText(), rivi = await p.locator('[data-kt-klippi]').first().innerText();
        if (ajastettu) { expect(toast).toMatch(/Näkyy pelaajalle \d+\.\d+\. klo 7\.00/); expect(rivi).toMatch(/Ajastettu · näkyy pelaajalle \d+\.\d+\. klo 7\.00/); await kuva(p, 'klippi_ajastettu_390_tumma'); }
        else { expect(toast).not.toMatch(/Näkyy pelaajalle/); expect(rivi).not.toMatch(/Ajastettu/); }
        await sk.close();
      }
    } finally { await selain.close(); }
  }, 90000);

  it('VEO-linkki viikkohavainto-sheetistä avaa klippisheetin (ei Masteriin); ei oikeutta toisen joukkueen pelaajaan → ei sheetiä', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: P('p2') }); await masterKorvaus(p); await odota(p);
      await p.evaluate(() => window._ktHavaintoLisaa('p2')); await p.waitForSelector('[data-kt-havainto-veo]');
      await p.locator('[data-kt-havainto-veo]').click(); await p.waitForSelector(KLIPPI_ID, { timeout: 5000 });
      expect(masterissa(p)).toBe(false); expect(await p.locator('[role="dialog"]').count()).toBe(1);   // yksi sheet kerrallaan (D100)
      expect(await p.evaluate(() => window._ktKlippiAvaa('p9'))).toBe(false);   // Dani Dahl on toisessa joukkueessa
      await sk.close();
    } finally { await selain.close(); }
  }, 60000);

  it('TYÖKALUT: Taktiikka · Itsearvio · Kehittyminen · Asetukset avaavat Masterin työkalun suoraan (?toiminto=…) valikosta klikaten, eivät laskeudu pelkkään Kotiin; + Havainto ennallaan', async () => {
    await avaa(); try {
      const odotettu = [['avaaKaaviopankki()', 'taktiikka'], ['avaaHarjoitusarviointi()', 'itsearvio'], ['avaaValmentajaKehitys()', 'kehittyminen'], ['avaaCoachProfiili()', 'asetukset'], ["openDrill('adar')", 'havainto']];
      for (const [onclick, toiminto] of odotettu) {
        const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: P('p2') }); await masterKorvaus(p); await odota(p);
        if (toiminto !== 'havainto' && toiminto !== 'asetukset') await p.locator('#nvSide [onclick="TM_VALMENTAJA_NAV.tmNavTyokalut()"]').click();   // Työkalut ▸ auki
        await p.locator('[onclick="' + onclick + '"]:visible').first().click(); await p.waitForURL(/TalentMaster_Master_v16\.html/, { timeout: 5000 });
        expect(p.url(), onclick).toMatch(new RegExp('\\?ws=koti&toiminto=' + toiminto + '$')); await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);

  it('ALUEEN AUKOT: (1) jaksoton + ei aluetta → linkki Tänäänissä; (2) jakso käynnissä + ei aluetta → linkki Tänäänissä (jaksokortti, kerran); (3) alue asetettu → ei linkkiä, Kenttä ⋯ = "Vaihda aluetta"; Polun ⋯: "Aseta alue" vs "Vaihda aluetta"; 5v5 → ei linkkiä', async () => {
    await avaa(); try {
      const tilat = [
        ['jaksoton', 'p1', {}, 1, 'Aseta alue'], ['jakso_ei_aluetta', 'p2', {}, 1, 'Aseta alue'],
        ['alue', 'p2', { ydinvahvuus: { alue: ALUE, kuvaus: 'Pelin avaaminen', alue_avain: 'karki' } }, 0, 'Vaihda aluetta'],
      ];
      for (const [nimi, pid, o, ctaN, valikko] of tilat) {
        const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/' + pid + '/tanaan', pelaajat: P(pid, o) }); await odota(p);
        expect(await p.locator('[data-kt-aseta-alue]').count(), nimi + ' Tänään: linkkejä').toBe(ctaN === 0 ? 0 : 1);
        if (nimi === 'alue') { await p.locator('.kts-kentta-valikko > summary').click(); expect(await p.locator('.kts-kentta-valikko [data-kt-vaihda-alue]').innerText()).toBe('Vaihda aluetta'); }
        else { await p.locator('[data-kt-aseta-alue]').click(); await p.waitForSelector('[data-ka-alue], .ka-kentta, [id^="tsOtsikko_"]', { timeout: 5000 }); expect(await p.locator('[id^="tsOtsikko_"]').first().innerText()).toMatch(/Ydinvahvuuden alue/); }
        await p.evaluate((id) => { location.hash = '#pelaaja/' + id + '/polku'; }, pid); await p.waitForSelector('[data-kt-polku]', { timeout: 10000 });
        if (nimi !== 'jaksoton') {
          await p.keyboard.press('Escape'); await p.locator('.kt-pk-valikko > summary').click();
          expect(await p.locator('.kt-pk-valikko [data-kt-aseta-alue]').innerText(), nimi + ' Polku ⋯').toBe(valikko);
        }
        await sk.close();
      }
      // 5v5: alue ei mahdollinen → ei linkkiä missään
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p1/tanaan', pelaajat: P('p1'), dokit: { 'seurat/demo/joukkueet/demo_u13': { nimi: 'Demo U13', ika: 'U13', pelimuodot: ['5v5'] } } }); await odota(p);
      expect(await p.locator('[data-kt-aseta-alue]').count()).toBe(0); await sk.close();
    } finally { await selain.close(); }
  }, 120000);

  it('KUORMA: Tänään-signaalin kuorma-painike (ja _ktToimi kuorma) vie Masterin Kuorma-näkymään (?ws=kuorma), ei Polku-välilehdelle', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: P('p2') }); await masterKorvaus(p); await odota(p);
      await p.evaluate(() => window._ktToimi('p2', 'kuorma')); await p.waitForURL(/TalentMaster_Master_v16\.html/, { timeout: 5000 });
      expect(p.url()).toMatch(/\?ws=kuorma$/); await sk.close();
    } finally { await selain.close(); }
  }, 60000);

  for (const rooli of ['valmentaja', 'vp']) it('KLIKKAA JOKAINEN NAPPI: Tänään ja Polku roolilla ' + rooli + ' viidessä tilassa — mikään painike ei vie Masteriin paitsi K3b (kausitavoite), K4 (syvenna) ja kuorma; K3a:n anna_valita ja hylkaa avaavat sheetin; jäljelle jäävät hypyt listataan', async () => {
    await avaa(); const hypyt = new Set(), klikattu = new Set();
    const alkuPv = (pv) => new Date(Date.parse('2026-10-19T09:00:00+03:00') - pv * 86400000).toISOString(), JF = (pv, o) => ({ konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: alkuPv(pv), kesto_vk: 6, lahde: 'valmentaja', domeeni: 'teknis_taktinen', ...(o || {}) });
    try {
      const tilat = [
        ['jaksoton', 'p1', {}], ['jakso+ydinvahvuus', 'p2', { ydinvahvuus: { kuvaus: 'Haltuunotto' } }], ['jakso+alue', 'p2', { ydinvahvuus: { alue: ALUE, kuvaus: 'Pelin avaaminen', alue_avain: 'karki' } }],
        ['paattynyt', 'p2', { jaksofokus: JF(60), ydinvahvuus: { kuvaus: 'Haltuunotto' } }],
        ['valinta_tehty', 'p2', { jaksofokus: { tila: 'valittavana', vaihtoehdot: [{ konsepti_avain: 'y_h1', nimi: 'Haltuunotto', perustelu: 'Hyvä alku.', vahvistettu: true }, { konsepti_avain: 'y_h2', nimi: 'Kääntyminen', perustelu: 'Toinen reitti.', vahvistettu: true }] }, ydinvahvuus: { kuvaus: 'Haltuunotto' }, ydinvahvuus_valinta: { vaihtoehto: 'y_h1', valittu_pvm: '2026-10-18' } }],
      ];
      /* painikkeet = sisältöalueen napit ja linkit paitsi kuori-/välilehtinavigaatio (välilehdet, ‹ ›, ×, Pelaajan silmin) ja ulkoiset https-linkit; kuvaaja = onclick | href | teksti */
      const KERAA = '(function () { var a = document.getElementById("ktJuuri"); return Array.from(a.querySelectorAll("button, a[href]")).filter(function (e) { return !e.matches("[data-kt-valilehti],[data-kt-edellinen],[data-kt-seuraava],[data-kt-sulje],[data-kt-silmin],[disabled],[aria-disabled=true]") && (e.offsetParent !== null || e.closest("details")) && !/^https?:/.test(e.getAttribute("href") || ""); }); })()';   // vain näkyvät (piilotetun välilehden napit eivät ole painettavia); ⋯-valikon kohteet avataan ensin
      const KUVAAJA = '(function (e) { return (e.getAttribute("onclick") || "") + "|" + (e.getAttribute("href") || "") + "|" + e.textContent.trim().slice(0, 40); })';
      for (const [nimi, pid, o] of tilat) for (const vl of ['tanaan', 'polku']) {
        const alku = async () => { const x = await kaynnista(selain, { rooli, hash: '#pelaaja/' + pid + '/' + vl, pelaajat: P(pid, o) }); await masterKorvaus(x.p); await odota(x.p); await x.p.waitForTimeout(500); return x; };
        let { sk, p } = await alku();
        const kuvaajat = [...new Set(await p.evaluate(KERAA + '.map(' + KUVAAJA + ')'))];
        for (const d of kuvaajat) {
          const klik = await p.evaluate('(function () { var k = ' + KUVAAJA + '; var e = ' + KERAA + '.filter(function (x) { return k(x) === ' + JSON.stringify(d) + '; })[0]; if (!e) return false; for (var n = e.closest("details"); n; n = n.parentElement && n.parentElement.closest("details")) n.open = true; e.click(); return true; })()');
          if (!klik) continue;   // painike katosi edellisen klikkauksen jälkeen (tila vaihtui)
          klikattu.add(nimi + '/' + vl + ': ' + d);
          await p.waitForTimeout(220);
          if (masterissa(p)) {
            const avain = (/_ktToimi\([^,]*,\s*&?q?u?o?t?;?["']?([a-z_]+)/.exec(d) || [])[1] || d.split('|')[2];
            hypyt.add(avain + ' → ' + p.url().replace(/^.*TalentMaster_Master_v16\.html/, ''));
            await sk.close(); ({ sk, p } = await alku());   // takaisin sivulle
          } else { await p.keyboard.press('Escape'); await p.waitForTimeout(60); if (!/TalentMaster_Kehitystyopoyta\.html/.test(p.url())) { await sk.close(); ({ sk, p } = await alku()); } }
        }
        await sk.close();
      }
      const lista = [...hypyt].sort(); console.log('K1/K3a [' + rooli + '] · klikattuja painikkeita ' + klikattu.size + '; jäljelle jäävät hypyt Masteriin:\n  ' + (lista.join('\n  ') || '(ei yhtään)'));
      expect(klikattu.size).toBeGreaterThan(25);
      expect(lista.filter((x) => !/^(kausitavoite|syvenna|kuorma) /.test(x))).toEqual([]);   // K3a: anna_valita + hylkaa eivät enää vie Masteriin
    } finally { await selain.close(); }
  }, 900000);
});
