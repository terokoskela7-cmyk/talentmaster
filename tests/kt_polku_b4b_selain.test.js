/* B4b · Polku-välilehti oikeassa selaimessa (Playwright + Chrome): Tämä viikko (luku) · Pelaajan ääni · Historia. Firebase stubattu (tests/helpers/kt_sivu.mjs) — EI ulkoverkkoa (page.route estää kaiken muun).
   TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/b4b-polku/ (390 tumma, 1280 vaalea · Normaali + Ei pelaajan ääntä). Vain keksityt nimet (Demo FC). */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'b4b-polku');
const NYT = Date.parse('2026-10-19T09:00:00+03:00'), PAIVA = 86400000;
const SUODATA = (v) => v.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e));
const odota = (p) => p.waitForSelector('[data-kt-polku]', { timeout: 15000 });
const klippi = (n, aika, o) => ({ tyyppi: 'klippi', pelaajaId: 'p2', nakyvyys: 'pelaaja', klippi_id: 'kl' + n, url: 'https://veo.co/' + n, domain: 'veo.co', kysymys: 'Kysymys numero ' + n, klippityyppi: 'onnistui', fromNimi: 'Mika V.', aika, ...(o || {}) });
const HIST = [
  { konsepti_avain: 'y_h1', konsepti_nimi: 'Syöttö liikkeestä', alkoi: '2026-08-17', paattyi: '2026-09-27', lause: 'Hyvä jakso, kuljetus näkyy pelissä.', lause_lahde: 'valmentaja', sulkutapa: 'suljettu', suljettu: '2026-09-27T10:00:00.000Z',
    havainnot_vk: { y_h1: { a: { '2026-W37': { u1: { arvo: 3, pvm: '2026-09-10', rooli: 'valmentaja' } } }, b: { '2026-W37': { u1: { arvo: 3, pvm: '2026-09-10', rooli: 'valmentaja' } } }, c: { '2026-W37': { u1: { arvo: 1, pvm: '2026-09-10', rooli: 'valmentaja' } } } } } },
  { konsepti_avain: 'y_p1', konsepti_nimi: 'Peli kapeassa tilassa', alkoi: '2026-04-20', paattyi: '2026-06-01', lause: '', tulos: 'vaihda', sulkutapa: 'suljettu', suljettu: '2026-06-01T10:00:00.000Z' },
];
const PELAAJAT_P = PELAAJAT.map((p) => p.id === 'p2' ? { ...p, suostumusTila: 'annettu', jaksofokus_historia: HIST, jaksofokus: { ...p.jaksofokus, konsepti_avain: 'y_h1', osa_arviot: { y_h1: { a: 3 } }, osa_havainnot: { y_h1: { a: { u1: { arvo: 3, pvm: '2026-10-15', rooli: 'valmentaja' } } } }, tukiosa: { alue: 'Kehon hallinta' } } } : p);
const TAVOITE = { status: 'aktiivinen', luotu: '2026-08-20T10:00:00.000Z', fokus: { nimi: 'Pelaaja, joka pitää pallon paineessa' }, pelaajan_tavoite: 'Haluan, että pallo pysyy mulla', mittari: { yksikko: 's' }, lahto: { arvo: 5.4, pvm: '2026-06-05' }, tavoitearvo: 5.1 };
const KAL = (id, tyyppi, iso, o) => ({ ['seurat/demo/kalenteri/' + id]: { tyyppi, nimi: tyyppi === 'ottelu' ? 'vs. GBK' : 'Joukkueharjoitus', alkaa: Date.parse(iso), joukkue: 'demo_u13', ...(o || {}) } });
const DOKIT = {
  'seurat/demo/pelaajat/p2/idp_kausi/2026': { tavoitteet: [TAVOITE] },
  'seurat/demo/viestit/k_hist': klippi(0, Date.parse('2026-09-05T12:00:00+03:00'), { kysymys: 'Historian klippi' }),   // suljetun jakson aikana
  'seurat/demo/viestit/k1': klippi(1, NYT - 5 * PAIVA), 'seurat/demo/viestit/v1': { tyyppi: 'klippi_vastaus', pelaajaId: 'p2', nakyvyys: 'pelaaja', vastaus_viestille: 'k1', teksti: 'Katsoin ennen kuin sain pallon', aika: NYT - 5 * PAIVA + 3600000 },
  'seurat/demo/pelaajat/p2/viikkokatsaukset/2026-10-11': { vk: 1, jakso_alkoi: '2026-10-03', vastaukset: [], lause: 'Treenasin kaksi kertaa kotona seinää vasten.' },
  ...KAL('e1', 'harjoitus', '2026-10-20T17:00:00+03:00'), ...KAL('e2', 'harjoitus', '2026-10-22T17:00:00+03:00'), ...KAL('e3', 'ottelu', '2026-10-24T11:00:00+03:00'),
  ...KAL('e4', 'harjoitus', '2026-10-21T17:00:00+03:00', { joukkue: 'demo_u15' }),   // toisen joukkueen harjoitus: ei pelaajan viikossa
};
const avaa = (opts) => async (selain) => kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/polku', pelaajat: PELAAJAT_P, dokit: DOKIT, ...opts });
const kuva = async (p, nimi) => { if (!process.env.TM_KUVAT) return; await p.waitForTimeout(700); mkdirSync(KUVAT, { recursive: true }); await p.screenshot({ path: join(KUVAT, nimi + '.png'), fullPage: true }); };
const eiVaakavieritysta = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const valmis = async (p) => { await odota(p); await p.waitForSelector('[data-kt-klipit="ok"]', { timeout: 10000 }); await p.waitForSelector('[data-kt-viikko="ok"]', { timeout: 10000 }); };
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('B4b · Polku: Tämä viikko · Pelaajan ääni · Historia', () => {
  let selain; const kaynnistaSelain = async () => { selain = await selainKaynnista(); };
  it('NORMAALI 1280 vaalea: viikko (3 tapahtumaa, ei toisen joukkueen), ääni (3 uusinta lähteineen), historia (trendi, lause, klipit), ei ulkoverkkoa', async () => {
    await kaynnistaSelain(); try {
      const { sk, p, virheet } = await avaa({ leveys: 1280, teema: 'light' })(selain), ulkoiset = []; p.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url()) && !/gstatic\.com\/firebasejs|sentry-cdn|fonts\.(googleapis|gstatic)\.com/.test(r.url())) ulkoiset.push(r.url()); });
      await valmis(p);
      expect(await p.locator('[data-kt-vk-paiva]').count()).toBe(7); expect(await p.locator('[data-kt-vk-tapahtuma="harjoitus"]').count()).toBe(2); expect(await p.locator('[data-kt-vk-tapahtuma="ottelu"]').count()).toBe(1);
      expect(await p.locator('[data-kt-vk-katsaus]').innerText()).toContain('Viikkokatsaus'); expect(await p.locator('[data-kt-viikko]').first().innerText()).not.toMatch(/Täytä viikko|kuorma/i);
      const aanet = await p.locator('[data-kt-aani-lahde]').evaluateAll((l) => l.map((x) => x.getAttribute('data-kt-aani-lahde'))); expect(aanet).toEqual(['klippi', 'vk', 'kausi']);   // uusin ensin: 14.10., 11.10., 20.8.
      const ääni = await p.locator('[data-kt-aani]').innerText(); expect(ääni).toContain('Katsoin ennen kuin sain pallon'); expect(ääni).toContain('Klippivastaus'); expect(ääni).toContain('Viikkokatsaus'); expect(ääni).toContain('Kauden tavoite omin sanoin'); expect(await p.locator('[data-kt-aani] textarea, [data-kt-aani] input').count()).toBe(0);
      expect(await p.locator('[data-kt-historia-n]').getAttribute('data-kt-historia-n')).toBe('2');
      const hist = await p.locator('[data-kt-historia]').innerText(); expect(hist).toContain('17.8.–27.9.'); expect(hist).toMatch(/↗ 2\/\d osaa itsenäisesti/); expect(hist).toContain('”Hyvä jakso, kuljetus näkyy pelissä.” – valmentajan lause'); expect(hist).toContain('vaihdettu');
      expect(await p.locator('[data-kt-h-klipit] summary').innerText()).toBe('Klipit (1) · ”Historian klippi”');   /* K1b: viimeisimmän klipin kysymys Klipit-rivin perässä */ await p.locator('[data-kt-h-klipit] summary').click(); expect(await p.locator('[data-kt-h-klipit] [data-kt-klippi="k_hist"]').isVisible()).toBe(true);
      expect(await p.locator('[data-kt-polku]').innerText()).not.toContain('Seuraava askel'); expect(await eiVaakavieritysta(p)).toBe(true);
      await kuva(p, 'polku_1280_vaalea_normaali'); expect(ulkoiset).toEqual([]); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('NORMAALI 390 tumma: yksi palsta, viikko listana (tyhjät päivät piilossa), ei vaakavieritystä', async () => {
    await kaynnistaSelain(); try {
      const { sk, p, virheet } = await avaa({ leveys: 390, korkeus: 844, teema: 'dark' })(selain); await valmis(p);
      expect(await eiVaakavieritysta(p)).toBe(true); expect(await p.locator('.kt-vk-p:visible').count()).toBeLessThan(7); expect(await p.locator('[data-kt-vk-paiva="2026-10-20"]').isVisible()).toBe(true); expect(await p.locator('[data-kt-vk-paiva="2026-10-23"]').isVisible()).toBe(false);
      await kuva(p, 'polku_390_tumma_normaali'); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('EI PELAAJAN ÄÄNTÄ (0 lähdettä): lohkoa ei piirretä lainkaan; ei jaksoa → viikko + historia silti', async () => {
    await kaynnistaSelain(); try {
      const dokit = { ...DOKIT }; for (const k of ['seurat/demo/pelaajat/p2/idp_kausi/2026', 'seurat/demo/viestit/v1', 'seurat/demo/pelaajat/p2/viikkokatsaukset/2026-10-11']) delete dokit[k];
      const { sk, p, virheet } = await avaa({ leveys: 390, korkeus: 844, teema: 'dark', dokit })(selain); await valmis(p);
      expect(await p.locator('[data-kt-aani]').count()).toBe(0); expect(await p.locator('[data-kt-polku]').innerText()).not.toContain('Pelaajan ääni'); await kuva(p, 'polku_390_tumma_ei_aania');
      const e = await avaa({ hash: '#pelaaja/p3/polku' })(selain); await odota(e.p); await e.p.waitForSelector('[data-kt-viikko="ok"]', { timeout: 10000 });
      expect(await e.p.locator('[data-kt-vk-katsaus]').count()).toBe(0); expect(await e.p.locator('[data-kt-historia="tyhja"]').count()).toBe(1); expect(await e.p.locator('[data-kt-aani]').count()).toBe(0);
      expect(SUODATA(virheet)).toEqual([]); await e.sk.close(); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('EI JAKSOA (390 tumma + 1280 vaalea): viikko + historia näkyvät, ei viikkokatsausta eikä ääntä; kuvat', async () => {
    await kaynnistaSelain(); try {
      for (const [leveys, teema, nimi] of [[390, 'dark', 'polku_390_tumma_ei_jaksoa'], [1280, 'light', 'polku_1280_vaalea_ei_jaksoa']]) {
        const { sk, p, virheet } = await avaa({ leveys, korkeus: leveys === 390 ? 844 : 900, teema, hash: '#pelaaja/p3/polku' })(selain); await odota(p); await p.waitForSelector('[data-kt-viikko="ok"]', { timeout: 10000 });
        expect(await p.locator('[data-kt-polku]').getAttribute('data-kt-polku-tila')).toBe('ei_jaksoa'); expect(await p.locator('[data-kt-historia="tyhja"]').count()).toBe(1); expect(await p.locator('[data-kt-vk-katsaus], [data-kt-aani]').count()).toBe(0);
        expect(await eiVaakavieritysta(p)).toBe(true); await kuva(p, nimi); expect(SUODATA(virheet)).toEqual([]); await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
  it('LAISKA HAKU: kalenteri haetaan vasta Polku-välilehdellä; virhe näkyy lohkossa ja Yritä uudelleen toimii', async () => {
    await kaynnistaSelain(); try {
      const { sk, p } = await avaa({ hash: '#pelaaja/p2/tanaan' })(selain); await p.waitForSelector('.kt-nimi', { timeout: 15000 }); await p.waitForTimeout(500);
      const kal = () => p.evaluate(() => window.__pyynnot.filter((x) => /\/kalenteri$/.test(x))).then((l) => l.length); const ennen = await kal();
      await p.locator('[data-kt-valilehti="polku"]').click(); await p.waitForSelector('[data-kt-viikko="ok"]', { timeout: 10000 }); expect(await kal()).toBeGreaterThan(ennen);
      await sk.close();
      const v = await avaa({ vika: ['demo/kalenteri'] })(selain); await odota(v.p); await v.p.waitForSelector('[data-kt-viikko="virhe"]', { timeout: 10000 });
      expect(await v.p.locator('[data-kt-viikko="virhe"] [role="alert"]').innerText()).toContain('Viikon tapahtumia ei voitu ladata.'); expect(await v.p.locator('[data-kt-historia]').count()).toBe(1);   // muu Polku toimii
      await v.p.evaluate(() => { window.__vika = []; }); await v.p.locator('[data-kt-viikko="virhe"] [data-kt-polku-uudelleen]').click(); await v.p.waitForSelector('[data-kt-viikko="ok"]', { timeout: 10000 }); await v.sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('ROOLI VP + SV: sama näkymä; ruotsin kieliasetuksella ei raakoja avaimia', async () => {
    await kaynnistaSelain(); try {
      const a = await avaa({ rooli: 'vp' })(selain); await valmis(a.p); expect(await a.p.locator('[data-kt-historia]').count()).toBe(1); await a.sk.close();
      const { sk, p, virheet } = await avaa({ dokit: { ...DOKIT, 'seurat/demo': { nimi: 'Demo FC', kieli: 'sv' } } })(selain); await valmis(p);
      expect(await p.locator('[data-kt-polku]').innerText()).not.toMatch(/\bktp_|\bkt_[a-z]/); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
