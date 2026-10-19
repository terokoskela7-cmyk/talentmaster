/* B4a · Polku-välilehti oikeassa selaimessa (Playwright + Chrome; chrome-tests-job): TalentMaster_Kehitystyopoyta.html, Firebase stubattu (tests/helpers/kt_sivu.mjs) — EI ulkoverkkoa:
   harness vastaa gstatic/Sentry/fontti-pyyntöihin muistista ja keskeyttää kaiken muun (page.route); tämä testi varmistaa lisäksi ettei yhtään muuta pyyntöä yritetä.
   TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/b4a-polku/ (390 tumma, 1280 vaalea · Normaali + Ei jaksoa). Vain keksityt nimet (Demo FC). */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'b4a-polku');
const NYT = Date.parse('2026-10-19T09:00:00+03:00'), PAIVA = 86400000;
const SUODATA = (v) => v.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e));
const odota = (p) => p.waitForSelector('[data-kt-polku]', { timeout: 15000 });
const klippi = (n, aika, o) => ({ tyyppi: 'klippi', pelaajaId: 'p2', nakyvyys: 'pelaaja', klippi_id: 'kl' + n, url: 'https://veo.co/' + n, domain: 'veo.co', kysymys: 'Kysymys numero ' + n, klippityyppi: 'onnistui', fromNimi: 'Mika V.', aika, ...(o || {}) });
const PELAAJAT_P = PELAAJAT.map((p) => p.id === 'p2' ? { ...p, suostumusTila: 'annettu', jaksofokus: { ...p.jaksofokus, konsepti_avain: 'y_h1', osa_arviot: { y_h1: { a: 3 } }, osa_havainnot: { y_h1: { a: { u1: { arvo: 3, pvm: '2026-10-15', rooli: 'valmentaja' } } } }, tukiosa: { alue: 'Kehon hallinta' } } } : p.id === 'p3' ? { ...p, ydinvahvuus: { kuvaus: 'Ensimmäinen kosketus' } } : p);
const DOKIT = {
  'seurat/demo/pelaajat/p2/idp_kausi/2026': { tavoitteet: [{ status: 'aktiivinen', luotu: '2026-08-20T10:00:00.000Z', fokus: { nimi: 'Pelaaja, joka pitää pallon paineessa' }, pelaajan_tavoite: 'Haluan, että pallo pysyy mulla', mittari: { yksikko: 's' }, lahto: { arvo: 5.4, pvm: '2026-06-05' }, tavoitearvo: 5.1, aikaraami: { kausi: 'syksy 2026' } }] },
  'seurat/demo/viestit/k_vanha': klippi(0, NYT - 40 * PAIVA, { kysymys: 'Ennen jaksoa' }),   // jakson ulkopuolella (alkoi 3.10.)
  'seurat/demo/viestit/k1': klippi(1, NYT - 6 * PAIVA), 'seurat/demo/viestit/k2': klippi(2, NYT - 5 * PAIVA), 'seurat/demo/viestit/k3': klippi(3, NYT - 4 * PAIVA), 'seurat/demo/viestit/k4': klippi(4, NYT - 3 * PAIVA), 'seurat/demo/viestit/k5': klippi(5, NYT - 2 * PAIVA), 'seurat/demo/viestit/k6': klippi(6, NYT - 1 * PAIVA),
  'seurat/demo/viestit/v2': { tyyppi: 'klippi_vastaus', pelaajaId: 'p2', nakyvyys: 'pelaaja', vastaus_viestille: 'k2', teksti: 'Näin vapaan tilan', aika: NYT - 5 * PAIVA + 3600000 },
};
const avaa = (opts) => async (selain) => kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/polku', pelaajat: PELAAJAT_P, dokit: DOKIT, ...opts });
const kuva = async (p, nimi) => { if (!process.env.TM_KUVAT) return; await p.waitForTimeout(700); mkdirSync(KUVAT, { recursive: true }); await p.screenshot({ path: join(KUVAT, nimi + '.png') }); };
const tila = (p) => p.locator('[data-kt-polku]').getAttribute('data-kt-polku-tila');
const eiVaakavieritysta = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('B4a · Polku', () => {
  let selain; const kaynnistaSelain = async () => { selain = await selainKaynnista(); };
  it('NORMAALI 1280 vaalea: Kausi → Jakso nyt, osat tiloineen, klipit jakson sisällä (viisi + Näytä kaikki), ei ulkoverkkoa', async () => {
    await kaynnistaSelain(); try {
      const { sk, p, virheet } = await avaa({ leveys: 1280, teema: 'light' })(selain), ulkoiset = []; p.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url()) && !/gstatic\.com\/firebasejs|sentry-cdn|fonts\.(googleapis|gstatic)\.com/.test(r.url())) ulkoiset.push(r.url()); });
      await odota(p); await p.waitForSelector('[data-kt-klipit="ok"]', { timeout: 10000 });
      expect(await tila(p)).toBe('normaali');
      const teksti = await p.locator('[data-kt-polku]').innerText();
      expect(teksti).toContain('Pelaaja, joka pitää pallon paineessa'); expect(teksti).toContain('Lähtötaso: 5.4 s (mitattu 5.6.).'); expect(teksti).toContain('viikko 3/6'); expect(teksti).toContain('arviointi 14.11.');
      const nimi = (await p.locator('[data-kt-jakso-nimi]').innerText()).trim(); expect(teksti.split(nimi).length - 1).toBe(1);   // konseptin nimi kerran
      expect(await p.locator('[data-kt-polku] [data-kt-osa]').count()).toBeGreaterThan(2);
      expect(await p.locator('[data-kt-polku] [data-kt-osa="a"] .kt-osa-st').innerText()).toContain('osaa jo');   // sama osakomponentti ja tila kuin Tänäänissä
      expect(await p.locator('[data-kt-klippi]').count()).toBe(6); expect(await p.locator('[data-kt-klippi]:visible').count()).toBe(5);   // jakson ulkopuolinen (k_vanha) pois; viides jälkeen haitarissa
      expect(await p.locator('[data-kt-klipit-kaikki] summary').innerText()).toBe('Näytä kaikki (6)'); expect(await p.locator('[data-kt-klippi="k2"]').innerText()).toContain('Pelaaja: Näin vapaan tilan');
      expect(await p.locator('[data-kt-klippi-linkki]').first().getAttribute('href')).toMatch(/^https:\/\//);
      expect(await p.locator('[data-kt-jakso-nappi="havainto"]').isVisible()).toBe(true); expect(await eiVaakavieritysta(p)).toBe(true);
      await kuva(p, 'polku_1280_vaalea_normaali');
      expect(ulkoiset).toEqual([]); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('NORMAALI 390 tumma: yksi palsta, ei vaakavieritystä, ⋯-valikossa Lisää klippi / Muokkaa jaksoa / Sulje jakso', async () => {
    await kaynnistaSelain(); try {
      const { sk, p, virheet } = await avaa({ leveys: 390, korkeus: 844, teema: 'dark' })(selain); await odota(p); await p.waitForSelector('[data-kt-klipit="ok"]', { timeout: 10000 });
      expect(await eiVaakavieritysta(p)).toBe(true); expect(await p.locator('.kt-jr .kt-jd').first().isVisible()).toBe(true);
      await p.locator('.kt-pk-valikko summary').click(); expect(await p.locator('.kt-pk-valikko [role="menuitem"]').allInnerTexts()).toEqual(['Lisää klippi', 'Muokkaa jaksoa', 'Aseta alue', 'Sulje jakso']);   /* K1: ei aluetta → 'Aseta alue' (alueen ollessa asetettu 'Vaihda aluetta') */
      await p.locator('.kt-pk-valikko summary').click(); await kuva(p, 'polku_390_tumma_normaali'); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('EI JAKSOA (390 tumma + 1280 vaalea): yksi kortti "Aloita jakso", ei tyhjiä lohkoja; kausi näkyy edelleen', async () => {
    await kaynnistaSelain(); try {
      for (const [leveys, teema, nimi] of [[390, 'dark', 'polku_390_tumma_ei_jaksoa'], [1280, 'light', 'polku_1280_vaalea_ei_jaksoa']]) {
        const { sk, p, virheet } = await avaa({ leveys, korkeus: leveys === 390 ? 844 : 900, teema, hash: '#pelaaja/p3/polku' })(selain); await odota(p);
        expect(await tila(p)).toBe('ei_jaksoa'); expect(await p.locator('[data-kt-jakso="ei_jaksoa"] [data-kt-jakso-nappi="aloita"]').innerText()).toBe('Aloita jakso');
        expect(await p.locator('[data-kt-polku] [data-kt-osat], [data-kt-polku] [data-kt-klipit]').count()).toBe(0); expect(await eiVaakavieritysta(p)).toBe(true); await kuva(p, nimi); expect(SUODATA(virheet)).toEqual([]); await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
  it('REITTI + ‹ ›: #pelaaja/{pid}/polku aukeaa suoraan ja pelaajanvaihto säilyttää välilehden', async () => {
    await kaynnistaSelain(); try {
      const { sk, p } = await avaa({ hash: '#pelaaja/p1/polku' })(selain); await odota(p);
      await p.locator('[data-kt-seuraava]').click(); await p.waitForFunction(() => document.querySelector('.kt-nimi').textContent === 'Bertta Bergh'); await odota(p);
      expect(await p.evaluate(() => location.hash)).toBe('#pelaaja/p2/polku'); expect(await p.locator('[data-kt-valilehti="polku"]').getAttribute('aria-selected')).toBe('true'); expect(await tila(p)).toBe('normaali');
      await p.locator('[data-kt-seuraava]').click(); await p.waitForFunction(() => document.querySelector('.kt-nimi').textContent === 'Cecil Carlsson'); await odota(p); expect(await p.evaluate(() => location.hash)).toBe('#pelaaja/p3/polku'); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('LAISKA HAKU: kausi ja klipit haetaan vasta kun Polku avataan (ei Tänäänissä); Polkuun vaihto hakee kerran', async () => {
    await kaynnistaSelain(); try {
      const { sk, p } = await avaa({ hash: '#pelaaja/p2/tanaan' })(selain); await p.waitForSelector('.kt-nimi', { timeout: 15000 }); await p.waitForTimeout(500);
      const haettu = () => p.evaluate(() => window.__pyynnot.filter((x) => /idp_kausi|\/viestit$/.test(x)));
      expect(await haettu()).toEqual([]);
      await p.locator('[data-kt-valilehti="polku"]').click(); await p.waitForSelector('[data-kt-klipit="ok"]', { timeout: 10000 });
      const h = await haettu(); expect(h.filter((x) => /viestit$/.test(x)).length).toBe(1); expect(h.some((x) => /idp_kausi\/2026$/.test(x))).toBe(true);
      await p.locator('[data-kt-valilehti="tanaan"]').click(); await p.locator('[data-kt-valilehti="polku"]').click(); await p.waitForTimeout(300); expect((await haettu()).filter((x) => /viestit$/.test(x)).length).toBe(1);   // välimuisti
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('VIRHE näkyy lohkossa (ei hiljaista tyhjää): kausilukuvirhe ja klippilukuvirhe + Yritä uudelleen', async () => {
    await kaynnistaSelain(); try {
      const { sk, p, virheet } = await avaa({ vika: ['idp_kausi', 'demo/viestit'] })(selain); await odota(p); await p.waitForSelector('[data-kt-klipit="virhe"]', { timeout: 10000 });
      expect(await p.locator('[data-kt-kausi="virhe"] [role="alert"]').innerText()).toContain('Kauden tavoitetta ei voitu ladata.'); expect(await p.locator('[data-kt-klipit="virhe"] [role="alert"]').innerText()).toContain('Klippejä ei voitu ladata.');
      expect(await p.locator('[data-kt-jakso-nappi="havainto"]').isVisible()).toBe(true);   // muu Polku toimii vaikka haku epäonnistui
      await p.evaluate(() => { window.__vika = []; }); await p.locator('[data-kt-kausi="virhe"] [data-kt-polku-uudelleen]').click(); await p.waitForSelector('[data-kt-klipit="ok"]', { timeout: 10000 });
      expect(await p.locator('[data-kt-kausi="ok"]').count()).toBe(1); expect(SUODATA(virheet).filter((e) => !/stub-vika|polku\]/.test(e))).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('ROOLIT: VP näkee saman ja kirjoittaa; ei kausitavoitetta → "Aseta kauden tavoite" (lukijan toimintojen piilotus: lib-testi)', async () => {
    await kaynnistaSelain(); try {
      const { sk, p } = await avaa({ rooli: 'vp' })(selain); await odota(p); await p.waitForSelector('[data-kt-klipit="ok"]', { timeout: 10000 }); expect(await p.locator('[data-kt-jakso-nappi="havainto"]').isVisible()).toBe(true); await sk.close();
      const e = await avaa({ dokit: { ...DOKIT, 'seurat/demo/pelaajat/p2/idp_kausi/2026': { tavoitteet: [] } } })(selain); await odota(e.p); await e.p.waitForSelector('[data-kt-kausi="ei"]', { timeout: 10000 });
      expect(await e.p.locator('[data-kt-kausitavoite]').innerText()).toBe('Aseta kauden tavoite'); await e.sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('SV: Polku renderöityy ruotsin kieliasetuksella ilman raakoja avaimia (erä 64 viety)', async () => {
    await kaynnistaSelain(); try {
      const { sk, p, virheet } = await avaa({ dokit: { ...DOKIT, 'seurat/demo': { nimi: 'Demo FC', kieli: 'sv' } } })(selain); await odota(p); await p.waitForSelector('[data-kt-klipit="ok"]', { timeout: 10000 });
      expect(await p.locator('[data-kt-polku]').innerText()).not.toMatch(/\bktp_|\bkt_[a-z]/); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
