/* K1b kohta 4 (Teron päätös 20.10.): "Tämän viikon fokus" = jaksofokus.viikon_osa { koodi, pvm }. (a) lib/tm_viikon_osa.js (voimassa vain samassa ISO-viikossa; muuten laskentasääntö), (b) kaikki kuluttajat YKSI funktio (tmKtViikonOsa, kenttäspec, pelaajan kortti),
   (c) selain: valmentaja + VP valitsee ydinasiasta (Tänään + Polku), kirjoitus = yksi update, merkki heti, pelaajan Viikko-kortti näyttää saman. Vain keksityt nimet (Demo FC). */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { kaynnista, selainKaynnista, CHROME, PELAAJAT } from './helpers/kt_sivu.mjs';
const require = createRequire(import.meta.url);
const VO = require('../lib/tm_viikon_osa.js'), K = require('../lib/tm_kehitystyopoyta.js'), TK = require('../lib/tm_tanaan_kentta.js'), S = require('../lib/tm_kentta_spec.js');
const OSAT = [{ k: 'a', koodi: 'a', tila: 'itsenaisesti' }, { k: 'b', koodi: 'b', tila: 'ohjatusti' }, { k: 'c', koodi: 'c', tila: 'ei_viela' }, { k: 'd', koodi: 'd', tila: null }];
const NYT = '2026-10-19';   // ma, ISO-viikko 2026-W43

describe('tmViikonOsaKoodi / tmViikonOsa', () => {
  it('valinta voimassa vain samassa ISO-viikossa (ma–su); edellinen/seuraava viikko → null; vuodenvaihde ISO:n mukaan', () => {
    const jf = (pvm) => ({ viikon_osa: { koodi: 'd', pvm } });
    for (const t of ['2026-10-19', '2026-10-21', '2026-10-25']) expect(VO.tmViikonOsaKoodi(jf('2026-10-19'), t), t).toBe('d');   // su 25.10. vielä sama viikko
    expect(VO.tmViikonOsaKoodi(jf('2026-10-19'), '2026-10-26')).toBeNull(); expect(VO.tmViikonOsaKoodi(jf('2026-10-18'), '2026-10-19')).toBeNull();
    expect(VO.tmViikonOsaKoodi(jf('2026-12-31'), '2027-01-03')).toBe('d');   // to 31.12.2026 ja su 3.1.2027 = 2026-W53
    expect(VO.tmViikonOsaKoodi(jf('2026-12-31'), '2027-01-04')).toBeNull();
  });
  it('kelvoton tai puuttuva data → null (ei heitä): ei jf, ei kenttää, väärä tyyppi, väärä koodi, väärä pvm', () => {
    for (const jf of [null, undefined, {}, { viikon_osa: null }, { viikon_osa: 'd' }, { viikon_osa: { koodi: 5, pvm: NYT } }, { viikon_osa: { koodi: '<x>', pvm: NYT } }, { viikon_osa: { koodi: 'd', pvm: 'eilen' } }, { viikon_osa: { koodi: 'd' } }]) expect(VO.tmViikonOsaKoodi(jf, NYT)).toBeNull();
    expect(VO.tmViikonOsaKoodi({ viikon_osa: { koodi: 'd', pvm: NYT } }, 'tänään')).toBeNull();
  });
  it('valittu voittaa; muuten ensimmäinen ei-itsenäisesti; valittu jota ei ole jaksossa → laskentasääntö; kaikki itsenäisiä + ei valintaa → null; valittu itsenäisesti-tilainen silti valitaan', () => {
    expect(VO.tmViikonOsa(OSAT, null).k).toBe('b'); expect(VO.tmViikonOsa(OSAT, 'd').k).toBe('d'); expect(VO.tmViikonOsa(OSAT, 'a').k).toBe('a'); expect(VO.tmViikonOsa(OSAT, 'z').k).toBe('b');
    expect(VO.tmViikonOsa([{ k: 'a', koodi: 'a', tila: 'itsenaisesti' }], null)).toBeNull(); expect(VO.tmViikonOsa([], 'a')).toBeNull(); expect(VO.tmViikonOsa(null, null)).toBeNull();
  });
  it('tmKtViikonOsa (valmentaja/VP/Polku) = SAMA funktio: ilman toista argumenttia ennallaan, valinnalla sama tulos kuin tmViikonOsa', () => {
    expect(K.tmKtViikonOsa(OSAT).k).toBe('b'); expect(K.tmKtViikonOsa(OSAT, 'd')).toBe(OSAT[3]); expect(K.tmKtValittuOsa({ viikon_osa: { koodi: 'c', pvm: NYT } }, NYT)).toBe('c'); expect(K.tmKtValittuOsa({}, NYT)).toBeNull();
  });
  it('tmViikonOsaKirjoitus: tarkka dot-polku jaksofokus.viikon_osa = {koodi, pvm}; kelvoton → null', () => {
    expect(VO.tmViikonOsaKirjoitus('d', NYT)).toEqual({ 'jaksofokus.viikon_osa': { koodi: 'd', pvm: NYT } });
    for (const [k, p] of [['', NYT], [null, NYT], ['a b', NYT], ['d', 'x'], ['d', undefined]]) expect(VO.tmViikonOsaKirjoitus(k, p)).toBeNull();
  });
});

describe('pelaajan Viikko-kortti ja kenttäspec lukevat saman säännön', () => {
  const jf = (lisa) => Object.assign({ konsepti_avain: 'y_h1', alkoi: new Date(2026, 9, 5).toISOString(), kesto_vk: 6, osat: ['Käännä pää', 'Valitse suunta', 'Ota haltuun', 'Suuntaa kosketus'], osa_arviot: {} }, lisa || {});
  const raaka = (j) => TK.tmTanaanOsat(j, { max: 26 });
  it('tmViikonOsaPelaajalle: laskentasääntö ilman valintaa (ensimmäinen = a); valinta d tällä viikolla → d; viime viikon valinta → a', () => {
    expect(VO.tmViikonOsaPelaajalle(jf(), raaka(jf()), NYT)).toBe('a');
    const v = jf({ viikon_osa: { koodi: 'x', pvm: NYT } }); expect(VO.tmViikonOsaPelaajalle(v, raaka(v), NYT)).toBe('a');   // ydinasioilla ei koodeja (explisiittinen osat[]) → valinta ei osu → laskentasääntö
  });
  it('osat koodeilla (konsepti-kaanon): valinta näkyy pelaajan kortilla "Tämän viikon fokus" -merkkinä oikealla rivillä (K1c); ei merkkiä kun viikonOsa puuttuu', () => {
    const kaanon = () => ({ kpi: [{ koodi: 'a', teksti: 'Käännä pää' }, { koodi: 'b', teksti: 'Valitse suunta' }, { koodi: 'c', teksti: 'Ota haltuun' }, { koodi: 'd', teksti: 'Suuntaa kosketus' }] });
    const j = { konsepti_avain: 'y_h1', osa_arviot: { y_h1: { a: 3 } }, viikon_osa: { koodi: 'd', pvm: NYT } }, r = TK.tmTanaanOsat(j, { kaanon, max: 26 });
    expect(VO.tmViikonOsaPelaajalle(j, r, NYT)).toBe('d'); expect(VO.tmViikonOsaPelaajalle(Object.assign({}, j, { viikon_osa: { koodi: 'd', pvm: '2026-10-12' } }), r, NYT)).toBe('b');   // vanha valinta → laskentasääntö (a itsenäisesti → b)
    const html = (viikonOsa) => TK.tmTanaanKenttaHTML({ tila: 'jakso', nimi: 'Haltuunotto', viikko: { n: 3, k: 6 }, kesto_vk: 6, vahvuus: 'X', osat: TK.tmTanaanOsat(j, { kaanon }), viikonOsa }, { esc: (s) => String(s), t: (k) => k });
    const h = html('c'); expect(h.match(/data-k1-viikon-osa/g)).toHaveLength(1); expect(h).toMatch(/Ota haltuun<\/span><span[^>]*data-k1-viikon-osa[^>]*>Tämän viikon fokus<\/span>/); expect(html(null)).not.toContain('data-k1-viikon-osa'); expect(html(undefined)).not.toContain('data-k1-viikon-osa');
  });
  it('tmKenttaSpec ilmanOsia: ei vaikuta; osat mukana → "nyt"-tila valitulla osalla', () => {
    const p = { id: 'p2', syntymaVuosi: 2013, ydinvahvuus: { kuvaus: 'X', alue: { x: 25, y: 35, w: 50, h: 61 } }, jaksofokus: jf() }, ctx = { rooli: 'henkilokunta', tanaan: NYT };
    expect(S.tmKenttaSpec(p, ctx).osat.filter((o) => o.tila === 'nyt').map((o) => o.k)).toEqual(['a']);
  });
});

describe('kytkennät: kaikki sivut jotka käyttävät sääntöä lataavat libin', () => {
  it('Pelaaja_v7 laskee x.viikonOsa saman libin kautta ja lataa sen tm_viikko.js:n jälkeen; Kehitystyöpöytä, Master ja VP lataavat libin ennen tm_kehitystyopoyta.js:ää', async () => {
    const { readFileSync } = await import('fs'), lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    const pel = lue('TalentMaster_Pelaaja_v7.html'); expect(pel).toContain('window.TM_VIIKON_OSA.tmViikonOsaPelaajalle(jf, K.tmTanaanOsat(jf, {'); expect(pel.indexOf('lib/tm_viikon_osa.js')).toBeGreaterThan(-1); expect(pel.indexOf('lib/tm_viikon_osa.js')).toBeGreaterThan(pel.indexOf('lib/tm_viikko.js'));   // tm_viikko.js ENSIN (viikko_yksi_kaava-vartija); libit hakevat toisensa kutsuhetkellä
    for (const f of ['TalentMaster_Kehitystyopoyta.html', 'TalentMaster_Master_v16.html', 'TalentMaster_VP_v25.html']) { const s = lue(f); expect(s.indexOf('lib/tm_viikon_osa.js'), f).toBeGreaterThan(-1); expect(s.indexOf('lib/tm_viikon_osa.js'), f).toBeLessThan(s.indexOf('lib/tm_kehitystyopoyta.js')); }
  });
});

const CHROME_PAALLA = !!(process.env.TM_CHROME_TESTS !== '0' && CHROME);
describe.skipIf(!CHROME_PAALLA)('Tämän viikon fokus: Kehitystyöpöytä-sivu (valmentaja + VP)', () => {
  const YV = { kuvaus: '1. kosketus', alue: { x: 25, y: 35, w: 50, h: 61 }, alue_avain: 'keskusta', asetti_uid: 'u1', asetettu_pvm: '2026-10-01' };
  const pel = (lisa) => PELAAJAT.map((x) => x.id === 'p2' ? Object.assign({}, x, { ydinvahvuus: YV, suostumusTila: 'annettu', jaksofokus: Object.assign({}, x.jaksofokus, { osa_arviot: { y_h1: { a: 3, b: 2, c: 1 } } }, lisa || {}) }) : x);
  const rivi = (p, k) => p.locator('#ktSivu_tanaan [data-kt-osa="' + k + '"]');
  it('Tänään: oletus b = "tällä viikolla"; napautus d → sheet → "Tämän viikon fokus" → YKSI update jaksofokus.viikon_osa {koodi:d, pvm:2026-10-19}, toast, d merkitään heti ja b ei; Polussa sama; sheetissa uudelleen avattuna nappi on valittu ja pois käytöstä; valinta jonka pvm on viime viikolta ei vaikuta', async () => {
    const selain = await selainKaynnista(); try {
      for (const rooli of ['valmentaja', 'vp']) {
        const { sk, p, virheet } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/tanaan', pelaajat: pel() }); await p.waitForSelector('#ktSivu_tanaan [data-kt-osa]'); const nm = rooli;
        expect(await rivi(p, 'b').getAttribute('class'), nm).toMatch(/\bon\b/); expect(await rivi(p, 'd').getAttribute('class'), nm).not.toMatch(/\bon\b/);
        await rivi(p, 'd').click(); await p.waitForSelector('[data-kt-viikon-fokus]'); expect(await p.locator('[data-kt-viikon-fokus]').innerText(), nm).toBe('Tämän viikon fokus'); expect(await p.locator('[data-kt-viikon-fokus]').isDisabled(), nm).toBe(false);
        await p.locator('[data-kt-viikon-fokus]').click(); await p.waitForFunction(() => window.__kirj.length === 1, null, { timeout: 8000 });
        const k = await p.evaluate(() => window.__kirj); expect(k[0].path, nm).toBe('seurat/demo/pelaajat/p2'); expect(k[0].update, nm).toEqual({ 'jaksofokus.viikon_osa': { koodi: 'd', pvm: '2026-10-19' } });
        expect(await p.locator('#toast-wrap').innerText(), nm).toMatch(/Tämän viikon fokus asetettu ✓/); await p.waitForSelector('[data-kt-viikon-fokus]', { state: 'detached', timeout: 5000 });
        expect(await rivi(p, 'd').getAttribute('class'), nm).toMatch(/\bon\b/); expect(await rivi(p, 'd').innerText(), nm).toMatch(/Tämän viikon fokus/); expect(await rivi(p, 'b').getAttribute('class'), nm).not.toMatch(/\bon\b/);   // K1c: badge pienen tilatekstin tilalla
        await rivi(p, 'd').click(); await p.waitForSelector('[data-kt-viikon-fokus]'); expect(await p.locator('[data-kt-viikon-fokus]').isDisabled(), nm).toBe(true); expect(await p.locator('[data-kt-viikon-fokus]').innerText(), nm).toMatch(/^✓ Tämän viikon fokus/); await p.keyboard.press('Escape');
        await p.locator('[data-kt-valilehti="polku"]').click(); await p.waitForSelector('#ktSivu_polku [data-kt-osa="d"]'); expect(await p.locator('#ktSivu_polku [data-kt-osa="d"]').getAttribute('class'), nm + ' Polku').toMatch(/\bon\b/);
        expect(virheet.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e)), nm).toEqual([]); await sk.close();
      }
      const v = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: pel({ viikon_osa: { koodi: 'd', pvm: '2026-10-12' } }) }); await v.p.waitForSelector('#ktSivu_tanaan [data-kt-osa]');
      expect(await rivi(v.p, 'b').getAttribute('class')).toMatch(/\bon\b/); expect(await rivi(v.p, 'd').getAttribute('class')).not.toMatch(/\bon\b/);   // viime viikon valinta ei voimassa
      await v.sk.close();
      const w = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: pel({ viikon_osa: { koodi: 'e', pvm: '2026-10-19' } }) }); await w.p.waitForSelector('#ktSivu_tanaan [data-kt-osa]');
      expect(await rivi(w.p, 'e').getAttribute('class')).toMatch(/\bon\b/); await w.sk.close();   // tämän viikon valinta voimassa lataushetkelläkin
    } finally { await selain.close(); }
  }, 240000);
});
