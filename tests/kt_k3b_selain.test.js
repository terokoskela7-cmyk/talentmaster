/* K3b · selain (Playwright + Chrome; chrome-tests-job): kausitavoite uudella sivulla sheetinä (Polku → Kausi → Aseta / Muokkaa kauden tavoitetta), valmentaja- JA VP-roolilla.
   Firebase stubattu (tests/helpers/kt_sivu.mjs), ei ulkoverkkoa, UTC-turvallinen (kello jäädytetty stubissa). TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/k3b/ (390 tumma + 1280 vaalea). Vain keksityt nimet (Demo FC). */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { kaynnista, selainKaynnista, kirjoitukset, SISAINEN, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'k3b');
const SUODATA = (v) => v.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e));
const odota = (p) => p.waitForSelector('[data-kt-polku]', { timeout: 15000 });
const kuva = async (p, nimi) => { if (!process.env.TM_KUVAT) return; await p.waitForTimeout(600); mkdirSync(KUVAT, { recursive: true }); await p.screenshot({ path: join(KUVAT, nimi + '.png') }); };
const P = (id, o) => PELAAJAT.map((p) => p.id === id ? { ...p, suostumusTila: 'annettu', ...o } : p);
const masterKorvaus = (p) => p.route(/TalentMaster_Master_v16\.html/, (r) => r.fulfill({ contentType: 'text/html', body: '<html><body>master-tynkä</body></html>' }));
const masterissa = (p) => /TalentMaster_Master_v16\.html/.test(p.url());
const KAUSI = 'seurat/demo/pelaajat/p2/idp_kausi/2026', IDP_PELAAJA = 'seurat/demo/pelaajat/p2/idp_pelaaja/2026', SIS = 'seurat/demo/pelaajat/p2/sisainen/tiedot';
const MITATTU = { status: 'aktiivinen', luotu: '2026-08-20T10:00:00.000Z', fokus: { alue: 'acceleration', dim: 'D1', nimi: 'Kiihdytys', lahde: 'mitattu' }, pelaajan_tavoite: 'Haluan päästä nopeammin liikkeelle', mittari: { testId: 'sprint10', yksikko: 's', suunta: 'pienempi' }, lahto: { arvo: 2.1, pvm: '2026-06-05' }, tavoitearvo: 1.9, kuvaus: 'Ensiaskel pelissä', aikaraami: { kausi: 'syksy 2026', kesto_vk: 6 }, arviot: [] };
const HAVAITTU = { status: 'aktiivinen', luotu: '2026-08-20T10:00:00.000Z', fokus: { alue: 'balance', dim: 'D1', nimi: 'Tasapaino', lahde: 'havaittu' }, pelaajan_tavoite: '', mittari: { testId: 'balance', yksikko: 'taso', suunta: 'suurempi' }, lahto: { arvo: 2, pvm: null }, tavoitearvo: 3, aikaraami: { kausi: 'syksy 2026', kesto_vk: 6 }, arviot: [] };
const KIRJ = (p) => p.evaluate(() => window.__kirj);

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K3b · kausitavoite sheetinä', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };
  describe.each([['valmentaja'], ['vp']])('%s', (rooli) => {
    it('ASETUS: Polku → Aseta kauden tavoite avaa sheetin paikallaan (ei Masteriin); fokus valitaan, omin sanoin kirjoitetaan, Aktivoi = idp_kausi + pikakentät; Kausi-rivi päivittyy heti ilman latausta', async () => {
      await avaa(); try {
        const { sk, p, virheet } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/polku', pelaajat: P('p2'), leveys: 390, teema: 'dark' }); await masterKorvaus(p); await odota(p);
        await p.waitForSelector('[data-kt-kausi="ei"]', { timeout: 10000 }); await p.evaluate(() => { window.__eiLatausta = 'x'; });
        expect(await p.locator('[data-kt-kausitavoite]').innerText()).toBe('Aseta kauden tavoite');
        await p.locator('[data-kt-kausitavoite]').click(); await p.waitForSelector('[data-kv-tila="valmis"]', { timeout: 5000 });
        expect(masterissa(p)).toBe(false); expect(await p.locator('[role="dialog"]').count()).toBe(1);
        expect(await p.locator('[data-kv-ei-tavoitetta]').count()).toBe(1); expect(await p.locator('[data-kv-tallenna]').count()).toBe(0);   // ei fokusta → ei tallennusta
        await kuva(p, 'asetus_tyhja_390_tumma');
        await p.locator('.jsp-kt-fokrow select').nth(1).selectOption('balance');   // Tasapaino (havaittu 1–5: ei mitattu lähtötasoa)
        await p.waitForSelector('[data-kv-fokus]'); expect(await p.locator('[data-kv-fokus]').innerText()).toContain('Tasapaino');
        const teksti = await p.locator('[data-kv-sheet]').innerText();
        expect(await p.locator('#_mktTavArvo').count()).toBe(0);   // D104: havaintomittarilla ei lukukenttää, oletus taso+1 ei lukuna
        expect(await p.locator('[data-kv-lahto]').innerText()).toBe(''); expect(teksti).not.toMatch(/Lähtötaso: \d|Tavoite: \d|Tavoitearvo/);
        expect(await p.locator('[data-kv-mittari]').innerText()).toContain('ei lukuarvoa');
        await p.locator('#_mktTavAani').fill('Haluan pysyä pystyssä kamppailussa'); await p.locator('#_mktTavKuvaus').fill('Kamppailu keskikentällä');
        await kuva(p, 'asetus_fokus_390_tumma');
        await p.locator('[data-kv-tallenna]').click(); await p.waitForSelector('[data-kv-sheet]', { state: 'detached', timeout: 5000 });
        // pikakentät + sisainen/tiedot samassa batchissa; idp_pelaaja = pelaajalle näkyvä kopio (#1144–#1147)
        const kirj = await kirjoitukset(p); expect(kirj.map((k) => k.path).sort()).toEqual([KAUSI, IDP_PELAAJA, 'seurat/demo/pelaajat/p2', SIS].sort());   // ei ylimääräisiä kirjoituksia
        const kausi = kirj.filter((k) => k.path === KAUSI)[0], ip = kirj.filter((k) => k.path === IDP_PELAAJA)[0];
        expect(kausi.set.tavoitteet).toHaveLength(1); expect(kausi.set.tavoitteet[0]).toMatchObject({ status: 'aktiivinen', omistaja: 'yhdessa', pelaajan_tavoite: 'Haluan pysyä pystyssä kamppailussa', kuvaus: 'Kamppailu keskikentällä', fokus: { alue: 'balance' }, mittari: { yksikko: 'taso' } });
        expect(ip.set.tavoitteet).toHaveLength(1); expect(ip.set.tavoitteet[0]).toMatchObject({ status: 'aktiivinen', pelaajan_tavoite: 'Haluan pysyä pystyssä kamppailussa', kuvaus: 'Kamppailu keskikentällä', fokus: { nimi: 'Tasapaino' } });
        expect(ip.set.tavoitteet[0].perustelu).toEqual({ pelilause: 'Näkyy pelissä: tasapaino kontaktissa.' }); expect(ip.set.tavoitteet[0].mittari).toBeUndefined();   // ei kypsyysvaroitusta eikä mittaria pelaajan kopioon
        const b = await p.evaluate(() => window.__batch); expect(b).toHaveLength(1);   // yksi commit
        const pk = b[0].filter((k) => k.path === 'seurat/demo/pelaajat/p2')[0], sis = b[0].filter((k) => SISAINEN.test(k.path));
        expect(pk.set).toMatchObject({ idp_tila: 'aktiivinen', idp_fokus: { alue: 'balance' } }); expect(pk.opts).toEqual({ merge: true });
        expect(sis).toHaveLength(1); expect(sis[0].path).toBe(SIS); expect(Object.keys(sis[0].set).sort()).toEqual(['idp_edistyma', 'idp_lahde', 'idp_viim_review', 'paivitetty', 'seuraId']);
        expect(sis[0].opts).toEqual({ mergeFields: ['seuraId', 'paivitetty', 'idp_edistyma', 'idp_lahde', 'idp_viim_review'] });
        expect(await p.locator('#toast-wrap').innerText()).toMatch(/Kauden tavoite aktivoitu ✓/);
        expect(await p.locator('[data-kt-kausi="ok"]').count()).toBe(1); expect(await p.locator('[data-kt-kausi="ok"]').innerText()).toContain('Tasapaino');   // heti, ei latausta
        expect(await p.locator('[data-kt-kausi="ok"]').innerText()).toContain('Pelaajan omin sanoin: ”Haluan pysyä pystyssä kamppailussa”');
        expect(await p.locator('[data-kt-kausi="ok"]').innerText()).not.toMatch(/Lähtötaso: \d|Tavoite: \d/);
        expect(await p.evaluate(() => window.__eiLatausta)).toBe('x'); expect(masterissa(p)).toBe(false);
        expect(await p.locator('[data-kt-kausitavoite]').innerText()).toBe('Muokkaa kauden tavoitetta');
        await kuva(p, 'asetus_valmis_390_tumma'); expect(SUODATA(virheet)).toEqual([]); await sk.close();
      } finally { await selain.close(); }
    }, 90000);

    it('MUOKKAUS (mitattu): sheet näyttää mitatun lähtötason ja tavoitearvon; arvon ja omin sanoin -tekstin muutos korvaa saman tavoitteen (ei toista alkiota, arviot säilyvät); Kausi-rivi päivittyy', async () => {
      await avaa(); try {
        const { sk, p, virheet } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/polku', pelaajat: P('p2'), dokit: { [KAUSI]: { tavoitteet: [{ ...MITATTU, arviot: [{ pvm: '2026-09-20', arvo: 2.0 }] }] } }, leveys: 1280, teema: 'light' }); await masterKorvaus(p); await odota(p);
        await p.waitForSelector('[data-kt-kausi="ok"]', { timeout: 10000 }); expect(await p.locator('[data-kt-kausitavoite]').innerText()).toBe('Muokkaa kauden tavoitetta');
        await p.locator('[data-kt-kausitavoite]').click(); await p.waitForSelector('[data-kv-tila="valmis"]', { timeout: 5000 });
        expect(await p.locator('[data-kv-fokus]').innerText()).toContain('Kiihdytys'); expect(await p.locator('[data-kv-lahto]').innerText()).toBe('Lähtötaso: 2.1 s (mitattu 5.6.).'); expect(await p.locator('[data-kv-mittari]').innerText()).toBe('Mittari: s');
        expect(await p.locator('#_mktTavArvo').inputValue()).toBe('1.9'); expect(await p.locator('#_mktTavAani').inputValue()).toBe('Haluan päästä nopeammin liikkeelle');
        await kuva(p, 'muokkaus_mitattu_1280_vaalea');
        await p.locator('#_mktTavArvo').fill('1.8'); await p.locator('#_mktTavAani').fill('Haluan olla nopein ensiaskeleessa');
        await p.locator('[data-kv-tallenna]').click(); await p.waitForSelector('[data-kv-sheet]', { state: 'detached', timeout: 5000 });
        const kausi = (await KIRJ(p)).filter((k) => k.path === KAUSI)[0].set.tavoitteet; expect(kausi).toHaveLength(1);
        expect(kausi[0]).toMatchObject({ luotu: MITATTU.luotu, status: 'aktiivinen', tavoitearvo: 1.8, pelaajan_tavoite: 'Haluan olla nopein ensiaskeleessa' }); expect(kausi[0].arviot).toHaveLength(1);
        expect(await p.locator('#toast-wrap').innerText()).toMatch(/Kauden tavoite tallennettu ✓/);
        const rivi = await p.locator('[data-kt-kausi="ok"]').innerText(); expect(rivi).toContain('Haluan olla nopein ensiaskeleessa'); expect(rivi).toContain('Tavoite: 1.8 s.');
        expect(SUODATA(virheet)).toEqual([]); await sk.close();
      } finally { await selain.close(); }
    }, 90000);

    it('MITTAAMATON LÄHTÖ (D104): havaintomittarin tavoitteessa (lähtö taso 2, oletus taso+1 = 3) sheet ei näytä yhtään lukua lähtötasosta eikä tavoitteesta; ei lukukenttää; tallennus säilyttää tallennetun tavoitearvon koskemattomana', async () => {
      await avaa(); try {
        const { sk, p } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/polku', pelaajat: P('p2'), dokit: { [KAUSI]: { tavoitteet: [HAVAITTU] } } }); await odota(p);
        await p.waitForSelector('[data-kt-kausi="ok"]', { timeout: 10000 }); await p.locator('[data-kt-kausitavoite]').click(); await p.waitForSelector('[data-kv-tila="valmis"]');
        const t = await p.locator('[data-kv-sheet]').innerText(); expect(t).toContain('Tasapaino'); expect(await p.locator('[data-kv-lahto]').innerText()).toBe(''); expect(t).not.toMatch(/\b[23]\/5|taso [23]|Lähtötaso|Tavoite:|Tavoitearvo/i);
        expect(await p.locator('#_mktTavArvo').count()).toBe(0); await p.locator('[data-kv-tallenna]').click(); await p.waitForSelector('[data-kv-sheet]', { state: 'detached' });
        expect((await KIRJ(p)).filter((k) => k.path === KAUSI)[0].set.tavoitteet[0]).toMatchObject({ tavoitearvo: 3, lahto: { arvo: 2 } }); await sk.close();
      } finally { await selain.close(); }
    }, 90000);

    it('MITTAAMATON mitattava fokus (Kiihdytys ilman testiä): "Lähtötasoa ei ole vielä mitattu." eikä lukua; EHDOTUS toimii (kierto) ja sama sheet säilyttää kirjoitetun tekstin fokuksen vaihdossa', async () => {
      await avaa(); try {
        const { sk, p } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/polku', pelaajat: P('p2', { arviointi_havaittu: { balance: 1, vision: 2 } }) }); await odota(p);
        await p.waitForSelector('[data-kt-kausi="ei"]'); await p.locator('[data-kt-kausitavoite]').click(); await p.waitForSelector('[data-kv-tila="valmis"]');
        await p.locator('[data-kv-ehdota]').click(); await p.waitForSelector('[data-kv-fokus]'); const eka = await p.locator('[data-kv-fokus]').innerText(); expect(eka).toMatch(/Tasapaino|Näkemys/);
        expect(await p.locator('[data-kv-tila="ehdotettu"]').innerText()).toContain('Ehdotettu'); expect(await p.locator('[data-kv-tallenna]').innerText()).toBe('Aktivoi tavoite');
        await p.locator('#_mktTavAani').fill('Oma lause'); await p.locator('[data-kv-ehdota]').click(); await p.waitForSelector('[data-kv-fokus]');
        expect(await p.locator('#_mktTavAani').inputValue()).toBe('Oma lause');   // teksti säilyy kun ehdotus vaihtuu
        await p.locator('.jsp-kt-fokrow select').nth(0).selectOption({ index: 0 }); await p.locator('.jsp-kt-fokrow select').nth(1).selectOption('acceleration'); await p.waitForSelector('[data-kv-fokus]:has-text("Kiihdytys")');
        expect(await p.locator('[data-kv-lahto]').innerText()).toBe('Lähtötasoa ei ole vielä mitattu.'); expect(await p.locator('[data-kv-sheet]').innerText()).not.toMatch(/Lähtötaso: \d/);
        expect(await p.locator('#_mktTavAani').inputValue()).toBe('Oma lause'); await sk.close();
      } finally { await selain.close(); }
    }, 90000);

    it('VAPAA FOKUS: nimi vaaditaan (toast), sitten vapaa tavoite ilman mittaria ja lukua', async () => {
      await avaa(); try {
        const { sk, p } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/polku', pelaajat: P('p2') }); await odota(p);
        await p.waitForSelector('[data-kt-kausi="ei"]'); await p.locator('[data-kt-kausitavoite]').click(); await p.waitForSelector('[data-kv-tila="valmis"]');
        await p.locator('.jsp-kt-fokrow button').click(); expect(await p.locator('#toast-wrap').innerText()).toMatch(/Kirjoita fokuksen nimi/); expect(await p.locator('[data-kv-fokus]').count()).toBe(0);
        await p.locator('#_mktVapaaFokus').fill('Rohkea ensikosketus'); await p.locator('.jsp-kt-fokrow button').click(); await p.waitForSelector('[data-kv-fokus]');
        expect(await p.locator('[data-kv-mittari]').innerText()).toContain('vapaa fokus'); expect(await p.locator('#_mktTavArvo').count()).toBe(0);
        await p.locator('[data-kv-tallenna]').click(); await p.waitForSelector('[data-kv-sheet]', { state: 'detached' });
        expect((await KIRJ(p)).filter((k) => k.path === KAUSI)[0].set.tavoitteet[0]).toMatchObject({ fokus: { nimi: 'Rohkea ensikosketus', vapaa: true }, mittari: { yksikko: 'vapaa' }, tavoitearvo: null }); await sk.close();
      } finally { await selain.close(); }
    }, 90000);
  });

  it('OIKEUS JA VIRHEET: toisen joukkueen pelaajalle (valmentaja) sheet ei aukea; latausvirhe näkyy sheetissä eikä kirjoita; tallennusvirhe näyttää ohjeen ja sheet jää auki; verkoton → ei kirjoitusta', async () => {
    await avaa(); try {
      const e = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/polku', pelaajat: P('p2') }); await odota(e.p);
      expect(await e.p.evaluate(() => window._ktToimi('p9', 'kausitavoite'))).toBe(false); expect(await e.p.locator('[role="dialog"]').count()).toBe(0); await e.sk.close();
      const v = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/polku', pelaajat: P('p2'), vika: ['idp_kausi'] }); await odota(v.p); await v.p.waitForSelector('[data-kt-kausi="virhe"]', { timeout: 10000 });
      await v.p.evaluate(() => window._ktToimi('p2', 'kausitavoite')); await v.p.waitForSelector('[data-kv-tila="virhe"]', { timeout: 5000 });
      expect(await v.p.locator('[data-kv-tila="virhe"]').innerText()).toContain('Tavoitetta ei saatu ladattua'); expect(await KIRJ(v.p)).toEqual([]); await v.sk.close();
      const t = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/polku', pelaajat: P('p2') }); await odota(t.p); await t.p.waitForSelector('[data-kt-kausi="ei"]');
      await t.p.locator('[data-kt-kausitavoite]').click(); await t.p.waitForSelector('[data-kv-tila="valmis"]'); await t.p.locator('.jsp-kt-fokrow select').nth(1).selectOption('balance'); await t.p.waitForSelector('[data-kv-tallenna]');
      await t.p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { value: false, configurable: true }); }); await t.p.locator('[data-kv-tallenna]').click();
      expect(await t.p.locator('#toast-wrap').innerText()).toMatch(/verkkoyhteys puuttuu/); expect(await KIRJ(t.p)).toEqual([]); expect(await t.p.locator('[data-kv-sheet]').count()).toBe(1);
      await t.p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { value: true, configurable: true }); window.__vika = ['idp_kausi']; });
      await t.p.locator('[data-kv-tallenna]').click(); await t.p.waitForFunction(() => /epäonnistui/.test(document.getElementById('toast-wrap').innerText), null, { timeout: 5000 });
      expect(await t.p.locator('[data-kv-sheet]').count()).toBe(1); expect(await t.p.locator('[data-kv-tallenna]').isVisible()).toBe(true); await t.sk.close();   // sheet jää auki, luonnos ei katoa
    } finally { await selain.close(); }
  }, 120000);

  it('VUODENVAIHDE (A3): voimassa oleva tavoite edellisen vuoden dokissa → uusi tavoite kuluvaan dokkiin ja vanha merkitään vaihdetuksi omassa dokissaan', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/polku', pelaajat: P('p2'), dokit: { 'seurat/demo/pelaajat/p2/idp_kausi/2025': { tavoitteet: [{ ...HAVAITTU, luotu: '2025-09-01T10:00:00.000Z' }] } } }); await odota(p);
      await p.waitForSelector('[data-kt-kausi="ok"]'); await p.locator('[data-kt-kausitavoite]').click(); await p.waitForSelector('[data-kv-tila="valmis"]');
      await p.locator('.jsp-kt-fokrow select').nth(1).selectOption('acceleration'); await p.waitForSelector('[data-kv-fokus]:has-text("Kiihdytys")'); await p.locator('[data-kv-tallenna]').click(); await p.waitForSelector('[data-kv-sheet]', { state: 'detached' });
      const kirj = await KIRJ(p), uusi = kirj.filter((k) => k.path === KAUSI)[0], vanha = kirj.filter((k) => k.path === 'seurat/demo/pelaajat/p2/idp_kausi/2025')[0];
      expect(uusi.set.tavoitteet).toHaveLength(1); expect(uusi.set.tavoitteet[0]).toMatchObject({ status: 'aktiivinen', fokus: { alue: 'acceleration' } }); expect(vanha.set.tavoitteet[0]).toMatchObject({ status: 'vaihdettu', fokus: { alue: 'balance' } }); await sk.close();
    } finally { await selain.close(); }
  }, 90000);

  it('Kausi-nappi avaa sheetin (ei Masteriin) ja Esc sulkee sen; (koko "klikkaa jokainen nappi" -läpikäynti valmentajana ja VP:nä: kt_k1_selain.test.js)', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/polku', pelaajat: P('p2') }); await masterKorvaus(p); await odota(p); await p.waitForSelector('[data-kt-kausi="ei"]');
      await p.locator('[data-kt-kausitavoite]').click(); await p.waitForSelector('[data-kv-sheet]'); expect(masterissa(p)).toBe(false);
      await p.keyboard.press('Escape'); await p.waitForSelector('[data-kv-sheet]', { state: 'detached', timeout: 3000 }).catch(() => {}); expect(masterissa(p)).toBe(false); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
});
